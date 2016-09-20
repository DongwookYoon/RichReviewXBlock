/**
 * Created by dongwookyoon on 6/25/15.
 */

/** @namespace r2 */
(function(r2){
    "use strict";

    r2.audioPlayer = (function (){
        var pub = {};

        pub.Status = {
            UNINITIALIZE : 0,
            LOADING : 1,
            STOPPED : 2,
            PLAYING : 3
        };

        /** @enum */
        var Cmd = {
            LOAD : 0,
            PAUSE : 1,
            PLAY : 2,
            JUMP : 3
        };

        var m_audio = null;
        var cmd_q = [];
        var status = pub.Status.UNINITIALIZE;
        var last_status = null;
        var cur_cmd = null;
        var cbPlay = null;
        var cbStop = null;

        var processCmd = function(){
            if(cmd_q.length != 0){
                var cmd = cmd_q.shift();
                switch(cmd.cmd){
                    case Cmd.LOAD:
                        loadAudioFile(cmd);
                        break;
                    case Cmd.PAUSE:
                        if(cbStop){
                            cbStop(pub.getCurAudioFileId());
                        }
                        status = pub.Status.STOPPED;
                        m_audio.pause();
                        break;
                    case Cmd.PLAY:
                        if(cbPlay){
                            cbPlay(pub.getCurAudioFileId());
                        }
                        if(m_audio.readyState != 0){ // != HAVE_NOTHING
                            status = pub.Status.PLAYING;
                            m_audio.play();
                            if(cmd.param_time >= 0) // move the playhead
                                m_audio.currentTime = cmd.param_time/1000.0;
                        }
                        break;
                    case Cmd.JUMP:
                        if(cmd.param_time >= 0) // move the playhead
                            m_audio.currentTime = cmd.param_time/1000.0;
                        break;
                    default:
                        throw new Error('Unknown Audio Command: ', cmd);
                }
            }
        };

        var loadAudioFile = function(cmd){
            cur_cmd = cmd;

            m_audio = new Audio(cmd.param_url);
            m_audio.preload = "auto";
            m_audio.loop = false;
            m_audio.addEventListener('ended', function() {
                if(r2.log)
                    r2.log.Log_AudioStop('auto', pub.getCurAudioFileId(), pub.getPlaybackTime());
                if(cbStop){
                    cbStop(pub.getCurAudioFileId());
                }
                status = pub.Status.STOPPED;
            }, false);
            m_audio.addEventListener('canplaythrough', function(e) {
                if(cmd.cb_loading_end) {
                    cmd.cb_loading_end(m_audio);
                }
                processCmd();
            }, false);
            m_audio.addEventListener('loadedmetadata', function(event){
            }, false);
            m_audio.addEventListener('play', function() {
                processCmd();
            }, false);
            m_audio.addEventListener('pause', function() {
                processCmd();
            }, false);
            m_audio.addEventListener('error', function(event) {
                alert("error while loading audio file: \n" + cur_cmd.param_url);
                if(cur_cmd.cb_loading_end)
                    cur_cmd.cb_loading_end();
                cur_cmd = null;
                m_audio = null;
                //status = pub.Status.STOPPED;
                cmd_q.shift(); // remove the play at the head
                cmd_q.push(createCmd(Cmd.PAUSE));
                processCmd();
            });
            m_audio.addEventListener('progress', function(event) {
                // progress rate: m_audio.buffered.end(m_audio.buffered.length-1)/m_audio.duration
            });
            status = pub.Status.LOADING;
            if(cur_cmd.cb_loading_bgn)
                cur_cmd.cb_loading_bgn(m_audio);
            m_audio.load();
        };

        var createCmd = function(cmd, id, url, time, cb_loading_bgn, cb_loading_end){
            return {
                cmd: cmd,
                param_id : typeof id !== "undefined" ? id : null,
                param_url : typeof url !== "undefined" ? url : null,
                param_time : typeof time !== "undefined" ? time : null,
                cb_loading_bgn : typeof cb_loading_bgn !== "undefined" ? cb_loading_bgn : null,
                cb_loading_end : typeof cb_loading_end !== "undefined" ? cb_loading_end : null
            };
        };

        pub.play = function(id, url, time, cb_loading_bgn, cb_loading_end){
            if(status == pub.Status.PLAYING){
                cmd_q.push(createCmd(Cmd.PAUSE));
            }
            if(cur_cmd === null || cur_cmd.param_id !== id || cur_cmd.param_url !== url){
                cmd_q.push(createCmd(Cmd.LOAD, id, url, 0, cb_loading_bgn, cb_loading_end));
            }
            cmd_q.push(createCmd(Cmd.PLAY, id, url, time));

            processCmd();
        };
        pub.jump = function(id, url, time){
            if(cur_cmd === null || cur_cmd.param_id !== id || cur_cmd.param_url !== url){
                if(status == pub.Status.PLAYING){
                    cmd_q.push(createCmd(Cmd.PAUSE));
                }
                cmd_q.push(createCmd(Cmd.LOAD, id, url, 0));
            }
            cmd_q.push(createCmd(Cmd.JUMP, id, url, time));

            processCmd();
        };

        pub.load = function(id, url, cb_loading_bgn, cb_loading_end) {
            //cmd_q.push(createCmd(Cmd.LOAD, id, url, 0, cb_loading_bgn, cb_loading_end));
            processCmd(createCmd(Cmd.LOAD, id, url, 0, cb_loading_bgn, cb_loading_end));
            //loadAudioFile(createCmd(Cmd.LOAD, id, url, 0, cb_loading_bgn, cb_loading_end));
        };

        pub.isIdle = function(){
            return cmd_q.length == 0;
        };

        pub.isPlaying = function() {
            return status == pub.Status.PLAYING;
        };

        pub.getStatusChange = function(){
            if(last_status != status){
                last_status = status;
                return status;
            }
            else{
                return null;
            }
        };

        pub.getPlaybackTime = function(){
            if(m_audio){
                return m_audio.currentTime*1000.0;
            }
            else{
                return 0.0;
            }
        };

        pub.setPlaybackTime = function(ms) {
            if(m_audio) {
                m_audio.currentTime = ms / 1000.0;
                //if(pub.isPlaying()) m_audio.resume();
            }
        };

        pub.getDuration = function(){
            if(m_audio && m_audio.duration){
                return m_audio.duration*1000.0;
            }
            else{
                return -1.0;
            }
        };

        pub.getCurAudioFileId = function(){
            if(m_audio) {
                return cur_cmd.param_id;
            }
            else{
                return null;
            }
        };

        pub.stop = function(){
            cmd_q.push(createCmd(Cmd.PAUSE));
            processCmd();
        };

        pub.cbPlay = function(cb){
            cbPlay = cb;
        };

        pub.cbStop = function(cb){
            cbStop = cb;
        };

        return pub;
    }());


    /** Audio Recorder */
    r2.audioRecorder = (function(){
        var pub = {};

        // audio recording initial settings
        pub.RECORDER_SAMPLE_SCALE = 2.5;
        pub.RECORDER_BUFFER_LEN = 4096*2*2;
        pub.RECORDER_SAMPLE_RATE = 22050;
        pub.RECORDER_SOURCE_SAMPLE_RATE = 44100;

        var recorder = null;
        var audio_context = null;

        pub.Init = function(){
            return new Promise(function(resolve, reject){
                try {
                    // webkit shim
                    window.AudioContext = window.AudioContext || window.webkitAudioContext;
                    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.mediaDevices.getUserMedia;

                    audio_context = new AudioContext;

                } catch (e) {
                    reject(new Error("No web audio support in this browser"));
                }

                navigator.getUserMedia(
                    {audio: true},
                    function(stream){
                        r2.makeLocalJs(r2.webappUrlMaps.get('lib_ext/recorder/recorderWorker.js'))
                            .then(function(local_url){
                                var src = audio_context.createMediaStreamSource(stream);
                                window.leakMyAudioNodes = [src];
                                recorder = new Recorder(
                                    src,
                                    {
                                        worker_path: local_url,
                                        buffer_size: r2.audioRecorder.RECORDER_BUFFER_LEN,
                                        downsample_ratio: src.context.sampleRate < 44100 ? 1 : 2
                                    }
                                );
                                resolve();
                            });
                    },
                    function(err){
                        console.log(err);
                        reject(new Error("Failed to initialize the microphone"));
                    }
                );
            });
        };

        pub.BgnRecording = function(){
            recorder && recorder.record();
        };

        pub.EndRecording = function(){
            return new Promise(function(resolve, reject){
                // stop the recording
                recorder && recorder.stop(function(){
                    // and create a WAV file download link using audio data blob
                    recorder && recorder.exportWAV(function(blob, buffer) {
                        var url = (window.URL || window.webkitURL).createObjectURL(blob);
                        resolve({url: url, blob: blob, buffer: buffer});
                    });
                });
            });
        };

        pub.getDbs = function(cb){
            recorder.getDbs(cb)
        };

        /**
         * Convenience method to read out the local file to a dictionary containing sampleRate, bitsPerSample, and samples.
         * @param urlOrBlob - Pass in either a URL or a blob object.
         * @param cb - A callback method on completion.
         */
        pub.parseWAV = function(urlOrBlob, cb) {
            function readBlob(blob) {
                var myReader = new FileReader();
                myReader.addEventListener("loadend", function(e){
                    var buff = new Uint8Array(myReader.result);
                    cb(recorder.parseWav(buff));
                });
                // Start the reading process.
                myReader.readAsArrayBuffer(blob);
            }
            if (typeof urlOrBlob == 'string') {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', urlOrBlob, true);
                xhr.responseType = 'blob';
                xhr.onload = function(e) {
                    if (this.status == 200) {
                        var blob = this.response;
                        readBlob(blob);
                    }
                };
                xhr.send();
            }
            else {
                readBlob(urlOrBlob);
            }
        };

        /**
         * Convenience method to convert the data represented by buffer to an L16 file. Saves the new L16 file
         * as a blob and returns both the blob and the URL.
         * @param buffer The buffer.
         * @param cb A callback function, accepting the new URL of the blob and the blob itself
         *
         */
        pub.exportL16 = function(buffer, cb){
            if (!recorder) {
                console.log('audio_utils.js: WavToL16 error, no recorder object.');
                return
            }
            var wavInfo = recorder.parseWav(buffer);
            console.log(wavInfo);

            var newBuffer = new ArrayBuffer(wavInfo.samples.length * 2);
            var dataView = new DataView(newBuffer);
            for (var i = 0; i < newBuffer.length; i++) {
                dataView.setInt8(i, wavInfo.samples[i]);
            }
            var audioBlob = new Blob([dataView], { type: "audio/l16" });

            var url = (window.URL || window.webkitURL).createObjectURL(audioBlob);
            cb(url, audioBlob);
        };

        pub.downloadAudioFile = function (urlOrBlob, filename) {
            var url;
            if (typeof urlOrBlob == 'string') {
                url = urlOrBlob;
            }
            else {
                url = (window.URL || window.webkitURL).createObjectURL(urlOrBlob);
            }
            var link = window.document.createElement('a');
            link.href = url;
            link.download = filename || 'output.wav';
            var click = document.createEvent("Event");
            click.initEvent("click", true, true);
            link.dispatchEvent(click);
        };

        pub.getRecorder = function(){
            return recorder;
        };

        return pub;
    })();

    r2.audioSynthesizer = (function(){
        var pub = {};

        var url2sample = {};
        var bit_per_sample = 16;
        var byte_per_sample = bit_per_sample/8;
        var sample_per_sec = 22050;
        var byte_per_sec = byte_per_sample*sample_per_sec;

        pub.run = function(talkens){
            return loadAllWavToBuf(talkens).then(
                function(){
                    var samples = talkens.map(function(talken){return chopTalkenSample(talken);});
                    return encodeWAV(samples);
                }
            ).catch(
                function(err){
                    console.error(err);
                }
            )
        };

        var writeString = function(view, offset, string){
            for (var i = 0; i < string.length; i++){
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        var encodeWAV = function(uint8_samples){

            var total_len = 0;
            uint8_samples.forEach(function(uint8_sample){
                total_len += uint8_sample.length;
            });

            var buffer = new ArrayBuffer(44 + total_len);
            var view = new DataView(buffer);

            /* RIFF identifier */
            writeString(view, 0, 'RIFF');
            /* RIFF chunk length */
            view.setUint32(4, 36 + total_len, true);       ////****
            /* RIFF type */
            writeString(view, 8, 'WAVE');
            /* format chunk identifier */
            writeString(view, 12, 'fmt ');
            /* format chunk length */
            view.setUint32(16, 16, true);
            /* sample format (raw) */
            view.setUint16(20, 1, true);
            /* channel count */
            view.setUint16(22, 1, true);
            /* sample rate */
            view.setUint32(24, sample_per_sec, true);
            /* byte rate (sample rate * block align) */
            view.setUint32(28, byte_per_sec, true);               ////****
            /* block align (channel count * bytes per sample) */
            view.setUint16(32, 2, true);                            ////****
            /* bits per sample */
            view.setUint16(34, bit_per_sample, true);                           ////****
            /* data chunk identifier */
            writeString(view, 36, 'data');
            /* data chunk length */
            view.setUint32(40, total_len, true);           ////****

            /* data */
            var i = 0;
            uint8_samples.forEach(function(uint8_sample){
                uint8_sample.forEach(function(v){
                    view.setUint8(44+i, v, true);
                    ++i;
                });
            });

            var blob = new Blob([view], { type: 'audio/wav' });
            var url = (window.URL || window.webkitURL).createObjectURL(blob);
            return {url: url, blob: blob, buffer: buffer};
        };
        pub.encodeWAV = encodeWAV;

        var chopTalkenSample = function(talken){
            var url = r2App.annots[talken.annotid].GetAudioFileUrl();
            var sample = url2sample[url].samples;
            var idx_bgn = Math.min(sample.length-1, Math.round(byte_per_sec*talken.bgn));
            idx_bgn = idx_bgn + idx_bgn%2;
            var idx_end = Math.min(sample.length, Math.round(byte_per_sec*talken.end));
            idx_end = idx_end + idx_end%2;
            return sample.slice(
                idx_bgn,
                idx_end
            );
        };

        var loadAllWavToBuf = function(talkens){
            talkens.forEach(function(talken){
                var url = r2App.annots[talken.annotid].GetAudioFileUrl();
                url2sample[url] = null;
            });
            var promises = Object.keys(url2sample).map(function(audio_url){
                return wavUrlToSample(audio_url);
            });
            return Promise.all(promises).then(
                function(samples){
                    bit_per_sample = samples[0].bitsPerSample;
                    byte_per_sample = bit_per_sample/8;
                    sample_per_sec = samples[0].sampleRate;
                    byte_per_sec = byte_per_sample*sample_per_sec;

                    samples.forEach(function(sample){
                        if(bit_per_sample !== sample.bitsPerSample || sample_per_sec !== sample.sampleRate){
                            throw Error('audioSynthesizer: target wav formats are inconsistent.');
                        }
                    });

                    var keys = Object.keys(url2sample);
                    for(var i = 0; i < keys.length; ++i){
                        url2sample[keys[i]] = samples[i];
                    }
                    return null;
                }
            );
        };

        var wavUrlToSample = function(url_or_blob){
            return new Promise(function(resolve, reject){
                function blobToBuf(blob) {
                    var myReader = new FileReader();
                    myReader.addEventListener("loadend", function(e){
                        var buff = new Uint8Array(myReader.result);
                        resolve(parseWavBufToSample(buff));
                    });
                    // Start the reading process.
                    myReader.readAsArrayBuffer(blob);
                }
                if (typeof url_or_blob === 'string') {
                    var xhr = new XMLHttpRequest();
                    xhr.open('GET', url_or_blob, true);
                    xhr.responseType = 'blob';
                    xhr.onload = function(e) {
                        if (this.status == 200) {
                            blobToBuf(this.response);
                        }
                    };
                    xhr.send();
                }
                else {
                    blobToBuf(url_or_blob);
                }
            });
        };
        pub.wavUrlToSample = wavUrlToSample;

        var parseWavBufToSample = function(wav) {
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


        return pub;
    }());
}(window.r2 = window.r2 || {}));
