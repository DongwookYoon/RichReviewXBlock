(function(window){
    'use strict';

    var DEF_WORKER_PATH = 'lib_ext/recorder/recorderWorker.js';

    var Recorder = function(media_stream_source, cfg){
        var recording = false;
        var recording_residual = false;
        var recording_captured = 0;
        var recording_first_stream = false;
        var recording_t_cmd = 0;
        var recording_t_buf = 0;
        var recording_stop_resp_channel_buf = false;
        var recording_stop_resp_chunk_buf = false;
        var recording_stop_cb = null;

        var callbacks = {
            onGetChunkBuf: null
        };

        this.context = media_stream_source.context;
        this.config = cfg || {};
        this.config.sample_rate_src = this.context.sampleRate;
        this.config.sample_rate_dst = this.context.sampleRate / cfg.downsample_ratio;

        this.node = (
            this.context.createScriptProcessor || this.context.createJavaScriptNode
        ).call(
            this.context, this.config.buffer_size, 1, 1  // # of input channel and output channel
        );

        var worker = new Worker(this.config.worker_path || DEF_WORKER_PATH);
        worker.postMessage({
            command: 'init',
            config: this.config
        });

        this.node.onaudioprocess = function(event){
            if (recording){
                var channel_buffer = event.inputBuffer.getChannelData(0);

                if(recording_first_stream){
                    recording_t_buf = (new Date()).getTime();
                    recording_first_stream = false;
                    var d = r2.audioRecorder.RECORDER_SOURCE_SAMPLE_RATE*(recording_t_buf-recording_t_cmd)/1000;
                    channel_buffer = channel_buffer.slice(-d);
                }

                recording_captured += channel_buffer.length;

                worker.postMessage({
                    command: 'recordChannelBuffer',
                    channel_buffer: channel_buffer,
                    residual: recording_residual
                });
                if(callbacks.onGetChunkBuf) {
                    worker.postMessage({
                        command: 'getChunkBuf',
                        channel_buffer: channel_buffer,
                        residual: recording_residual
                    });
                }
            }
            else if(recording_residual){
                var channel_buffer = event.inputBuffer.getChannelData(0);
                recording_captured += channel_buffer.length;

                worker.postMessage({
                    command: 'recordChannelBuffer',
                    channel_buffer: channel_buffer,
                    residual: recording_residual
                });
                if(callbacks.onGetChunkBuf) {
                    worker.postMessage({
                        command: 'getChunkBuf',
                        channel_buffer: channel_buffer,
                        residual: recording_residual
                    });
                }
                recording_residual = false;
            }
        };

        worker.onmessage = function(e){
            switch(e.data.command){
                case 'exportWavResp':
                    callbacks.onExportWav(e.data.blob, e.data.buffer);
                    break;
                case 'recordChannelBufferResp':
                    if(e.data.is_residual)
                        recording_stop_resp_channel_buf = true;
                    stopAsync();
                    break;
                case 'getChunkBufResp':
                    if(e.data.is_residual){
                        recording_stop_resp_chunk_buf = true;
                    }
                    callbacks.onGetChunkBuf(e.data.chunk_buffer);
                    stopAsync();
                    break;
                case 'getDbs':
                    callbacks.onGetDbs(e.data.dbs);
                    break;
            }
        };

        media_stream_source.connect(this.node);
        this.node.connect(this.context.destination);

        // register node for capturing the audio power

        {
            var power_buf_size = this.config.buffer_size/16;
            var power = {
                sample: [],
                buffer_size: power_buf_size,
                sec_per_sample: this.context.sampleRate/power_buf_size
            };

            this.node_power = (
                this.context.createScriptProcessor || this.context.createJavaScriptNode
            ).call(
                this.context, power.buffer_size, 1, 1  // # of input channel and output channel
            );

            this.node_power.onaudioprocess = function(event){
                if (recording){
                    var channel_buffer = event.inputBuffer.getChannelData(0);
                    var arr = new Float32Array(channel_buffer);
                    arr.set(channel_buffer, 0);
                    var v = rootMeanSquare(arr, 0, arr.length);
                    power.sample.push(v);
                }
                else{
                    if(power.sample.length !== 0){
                        power.sample = [];
                    }
                }

                function rootMeanSquare(l, bgn, end){
                    var HOP = 32;
                    var i = bgn;
                    var accum = 0;
                    while(i < end){
                        accum += l[i]*l[i];
                        i+=HOP;
                    }
                    return Math.sqrt(accum/ ((end-bgn)/HOP));
                }
            };

            this.getPower = function(){
                return power.sample;
            };

            r2.audioRecorder.RECORDER_POWER_SAMPLE_PER_SEC = power_buf_size/this.context.sampleRate;
        }

        media_stream_source.connect(this.node_power);
        this.node_power.connect(this.context.destination);

        r2.audioRecorder.RECORDER_SOURCE_SAMPLE_RATE = this.config.sample_rate_src;
        r2.audioRecorder.RECORDER_SAMPLE_RATE = this.config.sample_rate_dst;

        this.exportWAV = function(cb){
            callbacks.onExportWav = cb || this.config.callback;
            if (!callbacks.onExportWav) throw new Error('Recorder callback set failed: onExportWav');
            worker.postMessage({
                command: 'exportWAV'
            });
        };

        this.getDbs = function(cb) {
            callbacks.onGetDbs = cb || this.config.callback;
            if (!callbacks.onGetDbs) throw new Error('Recorder callback set failed: onGetDbs');
            worker.postMessage({ command: 'getDbs' })
        };

        this.parseWav = function(wav) {
            function readInt(i, bytes) {
                var ret = 0,
                    shft = 0;
                while (bytes) {
                    ret += wav[i] << shft;
                    shft += 8;
                    i++;
                    bytes--;
                }
                return ret;
            }
            if (readInt(20, 2) != 1) throw 'Invalid compression code, not PCM';
            if (readInt(22, 2) != 1) throw 'Invalid number of channels, not 1';
            return {
                sampleRate: readInt(24, 4),
                bitsPerSample: readInt(34, 2),
                samples: wav.subarray(44)
            };
        };

        this.setOnGetChunkBufCallback = function(onGetChunkBufCallback){
            callbacks.onGetChunkBuf = onGetChunkBufCallback;
        };

        this.record = function(){
            recording = true;
            recording_t_cmd = (new Date()).getTime();
            recording_first_stream = true;
            recording_captured = 0;

            recording_residual = false;
            recording_stop_cb = null;
        };

        this.stop = function(cb){
            recording = false;
            recording_t_cmd = (new Date()).getTime();
            recording_residual = true;
            recording_stop_cb = cb;
            recording_stop_resp_chunk_buf = false;
            recording_stop_resp_channel_buf = false;
        };

        function stopAsync(){
            if(callbacks.onGetChunkBuf === null){
                recording_stop_resp_chunk_buf = true;
            }
            if(recording_stop_resp_chunk_buf && recording_stop_resp_channel_buf){
                if(recording_stop_cb){
                    recording_stop_cb();
                }
            }
        }

    };

    window.Recorder = Recorder;

})(window);
