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
            PLAY : 2
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
            m_audio.addEventListener('canplaythrough', function() {
                if(cur_cmd.cb_loading_end)
                    cur_cmd.cb_loading_end();
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
                alert("error while loading audiofile:", cur_cmd.param_url);
                if(cur_cmd.cb_loading_end)
                    cur_cmd.cb_loading_end();
                cur_cmd = null;
                m_audio = null;
                if(cbStop){
                    cbStop(pub.getCurAudioFileId());
                }
                status = pub.Status.STOPPED;
                cmd_q.shift(); // remove the play at the head
                processCmd();
            });
            m_audio.addEventListener('progress', function(event) {
                // progress rate: m_audio.buffered.end(m_audio.buffered.length-1)/m_audio.duration
            });
            status = pub.Status.LOADING;
            if(cur_cmd.cb_loading_bgn)
                cur_cmd.cb_loading_bgn();
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
            if(cur_cmd === null || cur_cmd.param_id !== id){
                cmd_q.push(createCmd(Cmd.LOAD, id, url, 0, cb_loading_bgn, cb_loading_end));
            }
            cmd_q.push(createCmd(Cmd.PLAY, id, url, time));
            processCmd();
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
            if(status == pub.Status.PLAYING){
                cmd_q.push(createCmd(Cmd.PAUSE));
                processCmd();
            }
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
        pub.RECORDER_BUFFER_LEN = 1024;
        pub.RECORDER_SAMPLE_RATE = 22050;
        pub.RECORDER_SOURCE_SAMPLE_RATE = 44100;
        // If liveRecording is set to true, the microphone will send packets of audio continuously throughout recording.
        pub.liveRecording = false;
        pub.onAudio = function() {};

        var recorder = null;
        var audio_context = null;

        pub.Init = function(resource_urls){
            return new Promise(function(resolve, reject){
                try {
                    // webkit shim
                    window.AudioContext = window.AudioContext || window.webkitAudioContext;
                    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

                    audio_context = new AudioContext;

                } catch (e) {
                    reject(new Error("No web audio support in this browser"));
                }

                navigator.getUserMedia(
                    {audio: true},
                    function(stream){
                        var get_worker_script = new XMLHttpRequest();
                        get_worker_script.open("GET", resource_urls['lib_ext/recorder/recorderWorker.js'], true);
                        get_worker_script.onreadystatechange = function() {
                            if(get_worker_script.readyState == 4 && get_worker_script.status == 200) {
                                var blob;
                                try {
                                    blob = new Blob([get_worker_script.responseText], {type: 'application/javascript'});
                                } catch (e) { // Backwards-compatibility
                                    window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;
                                    blob = new BlobBuilder();
                                    blob.append(get_worker_script.responseText);
                                    blob = blob.getBlob();
                                }
                                var input = audio_context.createMediaStreamSource(stream);
                                recorder = new Recorder(input, {workerPath: URL.createObjectURL(blob)});
                                resolve();
                            }
                        };
                        get_worker_script.send();
                    },
                    function(err){
                        reject(new Error("Failed to initialize the microphone"));
                    }
                );
            });
        };

        pub.BgnRecording = function(){
            recorder && recorder.record();
        };

        pub.EndRecording = function(cb){
            recorder && recorder.stop();
            // create a WAV file download link using audio data blob
            recorder && recorder.exportWAV(function(blob, buffer) {
                var url = (window.URL || window.webkitURL).createObjectURL(blob);
                cb(url, blob, buffer);
                recorder.clear();
            });
        };

        pub.GetBuffer = function(cb){
            recorder.getBuffer(cb)
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

        return pub;
    })();

}(window.r2 = window.r2 || {}));