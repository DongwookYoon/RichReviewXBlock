(function(window){
    'use strict';

    var DEF_WORKER_PATH = 'lib_ext/recorder/recorderWorker.js';

    var Recorder = function(media_stream_source, cfg){
        var recording = false;
        var cur_callback = null;

        this.context = media_stream_source.context;
        this.config = cfg || {};
        this.config.sample_rate_src = this.context.sampleRate;
        this.config.sample_rate_dst = this.context.sampleRate > 22050 ? this.context.sampleRate / 2 : this.context.sampleRate;

        this.node = (
            this.context.createScriptProcessor ||
            this.context.createJavaScriptNode
        ).call(
            this.context, this.config.buffer_size, 1, 1  // # of input channel and output channel
        );

        var worker = new Worker(this.config.worker_path || DEF_WORKER_PATH);
        worker.postMessage({
            command: 'init',
            sample_rate: this.config.sample_rate_dst
        });

        this.node.onaudioprocess = function(event){
            if (!recording) return;
            var channel_buffer = event.inputBuffer.getChannelData(0);
            worker.postMessage({
                command: 'record',
                channel_buffer: channel_buffer
            });
            if (r2.audioRecorder.liveRecording) {
                cur_callback = r2.audioRecorder.onAudio;
                if (!cur_callback) throw new Error('Callback not set');
                worker.postMessage({
                    command: 'exportChunk',
                    channel_buffer: channel_buffer
                });
            }
        };

        worker.onmessage = function(e){
            switch(e.data.command){
                case 'exportWAV':
                    cur_callback(e.data.blob, e.data.buffer);
                    break;
                case 'exportChunk':
                    cur_callback(e.data.chunk_buffer);
                    break;
                case 'getDbs':
                    cur_callback(e.data.dbs);
                    break;
            }
        };

        media_stream_source.connect(this.node);
        this.node.connect(this.context.destination);

        r2.audioRecorder.RECORDER_SOURCE_SAMPLE_RATE = this.config.sample_rate_src;
        r2.audioRecorder.RECORDER_SAMPLE_RATE = this.config.sample_rate_dst;

        this.record = function(){
            recording = true;
        };

        this.stop = function(){
            recording = false;
        };

        this.clear = function(){
            worker.postMessage({ command: 'clear' });
        };

        this.exportWAV = function(cb, type){
            cur_callback = cb || this.config.callback;
            if (!cur_callback) throw new Error('Callback not set');
            worker.postMessage({
                command: 'exportWAV'
            });
        };

        this.getDbs = function(cb) {
            cur_callback = cb || this.config.callback;
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

    };

    window.Recorder = Recorder;

})(window);
