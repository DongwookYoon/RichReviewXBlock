/**
 * Created by Dongwook on 1/16/2016, based on Venkat's.
 */

var bluemix_stt = (function(bluemix_stt) {
    'use strict';

    var AUTH_URL = window.location.origin+ '/bluemix_stt_auth';

    /**
     * Initialize the publish/subscribe system utils is going to use.
     */
    (function() {
        var o         = $({});
        $.subscribe   = o.on.bind(o);
        $.unsubscribe = o.off.bind(o);
        $.publish     = o.trigger.bind(o);
    })();

    /**
     * Based on alediaferia's SO response
     * http://stackoverflow.com/questions/14438187/javascript-filereader-parsing-long-file-in-chunks
     */
    bluemix_stt.onFileProgress = function(options, ondata, onerror, onend) {
        var file       = options.file;
        var fileSize   = file.size;
        var chunkSize  = options.bufferSize || 8192;
        var offset     = 44;
        var readChunk = function(evt) {
            if (offset >= fileSize) {
                console.log("Done reading file");
                onend();
                return;
            }
            if (evt.target.error == null) {
                var buffer = evt.target.result;
                offset += buffer.byteLength;
                ondata(buffer); // callback for handling read chunk
            } else {
                var errorMessage = evt.target.error;
                console.log("Read error: " + errorMessage);
                onerror(errorMessage);
                return;
            }
            fileBlock(offset, chunkSize, file, readChunk);
        };
        fileBlock(offset, chunkSize, file, readChunk);
    };

    /**
     * Requests for the Bluemix authentication token.
     * Callback should accept a dictionary `authInfo` containing the username, password, and token.
     */
    bluemix_stt.getAuthInfo = function() {
        return new Promise(function(resolve, reject) {
            var xhr = new XMLHttpRequest();
            if ("withCredentials" in xhr) { // "withCredentials" only exists on XMLHTTPRequest2 objects.
                xhr.open("GET", AUTH_URL, true);
                xhr.withCredentials = true;
                xhr.responseType = 'text';
            }
            xhr.onreadystatechange = function(){
                if(xhr.readyState == 4){
                    if(xhr.status == 200) {
                        resolve(xhr.responseText);
                    }
                    else{
                        reject(new Error('Could not connect to the speech-to-text server, status code: ' + xhr.status));
                    }
                }
            };
            xhr.onerror = reject;
            xhr.send();
        });
    };
    var getUrlData = function(path, resp_type, progress_cb){
        return new Promise(function(resolve, reject){
            var xhr = new XMLHttpRequest();
            if ("withCredentials" in xhr) { // "withCredentials" only exists on XMLHTTPRequest2 objects.
                xhr.open('GET', path, true);
                xhr.withCredentials = true;
                xhr.responseType = resp_type;
            }
            else if (typeof XDomainRequest != "undefined") { // Otherwise, XDomainRequest only exists in IE, and is IE's way of making CORS requests.
                xhr = new XDomainRequest();
                xhr.open(method, path);
            }
            else {
                reject(new Error('Error from GetUrlData: CORS is not supported by the browser.'));
            }

            if (!xhr) {
                reject(new Error('Error from GetUrlData: CORS is not supported by the browser.'));
            }
            xhr.onerror = reject;

            xhr.addEventListener('progress', function(event) {
                if(event.lengthComputable) {
                    var progress = (event.loaded / event.total) * 100;
                    if(progress_cb)
                        progress_cb(progress);
                }
            });

            xhr.onreadystatechange = function(){
                if (xhr.readyState === 4){   //if complete
                    if(xhr.status === 200){  //check if "OK" (200)
                        resolve(xhr.response);
                    } else {
                        reject(new Error("XMLHttpRequest Error, Status code:" + xhr.status));
                    }
                }
            };

            xhr.send();
        });
    };

    /**
     * Performs setup to coordinate the microphone (represented by an AudioRecorder) and the socket communicating with the backend.
     * This method also sets up the options that determine what results Bluemix will provide.
     * @param token - An authentication token to initialize the socket
     * @param model - A language model to configure Bluemix's output
     * @param mic - A microphone object which can call an `onAudio` method upon loading a chunk of audio
     * @param callback - A function to call when the socket opens.
     * @param transcriptionCallback - A function to call when the transcript is updated.
     * @param closedCallback - A function to call when the socket closes.
     * @optional insertion - Whether or not the new recording is to be inserted mid-sentence.
     */
    bluemix_stt.handleMicrophone = function (options, mic, callback, transcriptionCallback, closedCallback) {

        options.message = {
            'action': 'start',
            'content-type': 'audio/l16;rate=' + (mic ? mic.RECORDER_SOURCE_SAMPLE_RATE: 22050),
            'interim_results': true,
            'continuous': true,
            'word_confidence': true,
            'timestamps': true,
            'max_alternatives': 3
        };

        function onOpen(socket) {
            console.log('Bluemix microphone socket: opened');
        }

        function onListening(socket) {
            callback(null, socket);
            if (!mic) {
                // The user might want to upload a file through the socket instead of transmitting microphone information.
                return;
            }
            mic.getRecorder().setOnGetChunkBufCallback(
                function (blob) {
                    if (socket.readyState < 2) {
                        socket.send(blob);
                    }
                }
            );
        }

        function onMessage(msg, socket) {
            transcriptionCallback(msg);
            /*
             if (msg.results) {
             baseString = TranscriptUtils.updateTranscriptionResult(msg, baseString, false, transcriptionCallback);
             }
             */
        }

        function onError(r, socket) {
            console.log('Mic socket err: ', err);
        }

        function onClose(evt) {
            console.log('Mic socket close: ', evt);
            closedCallback();
        }

        bluemix_stt.socket.initSocket(options, onOpen, onListening, onMessage, onError, onClose);
    };

    bluemix_stt.messageParser = (function(){
        var pub = {};

        var callbacks = {};

        pub.run = function(msg){
            if(msg.results && msg.results.length){
                var is_final = msg.results[0].final;
                var best_alternative = msg.results[0].alternatives[0];
                for(var i = 0; i < best_alternative.timestamps.length; ++i){
                    if(best_alternative.timestamps[i][0]=='%HESITATION'){
                        best_alternative.timestamps[i][0] = '...';
                    }
                    if(is_final){
                        // push word-confidence
                        best_alternative.timestamps[i].push(best_alternative.word_confidence[i][1]);
                    }
                }
                if(is_final){
                    callbacks.onFinal(best_alternative.timestamps, msg.results[0].alternatives);
                }
                else{
                    callbacks.onTemp(best_alternative.timestamps);
                }
            }
        };

        pub.setCallbacks = function(onTemp, onFinal){
            callbacks.onTemp = onTemp;
            callbacks.onFinal = onFinal;
        };

        return pub;
    }());

    /**
     * Get chunked array from a file's offset
     */
    var fileBlock = function(_offset, length, _file, readChunk) {
        var r = new FileReader();
        var blob = _file.slice(_offset, length + _offset);
        r.onload = readChunk;
        r.readAsArrayBuffer(blob);
    };

    return bluemix_stt;
}(window.bluemix_stt = window.bluemix_stt || {}));