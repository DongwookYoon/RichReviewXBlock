'use strict';

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
var handleMicrophone = function (token, model, mic, callback, transcriptionCallback, closedCallback) {

    if (model.indexOf('Narrowband') > -1) {
        var err = new Error('Microphone transcription cannot accomodate narrowband models, please select another');
        callback(err, null);
        return false;
    }

    var baseString = '';

    var options = {};
    options.token = token;
    options.message = {
        'action': 'start',
        'content-type': 'audio/l16;rate=' + (mic ? mic.RECORDER_SOURCE_SAMPLE_RATE: 22050),
        'interim_results': true,
        'continuous': true,
        'word_confidence': true,
        'timestamps': true,
        'max_alternatives': 3
    };
    options.model = model;

    function onOpen(socket) {
        console.log('Mic socket: opened');
    }

    function onListening(socket) {
        callback(null, socket);
        if (!mic) {
            // The user might want to upload a file through the socket instead of transmitting microphone information.
            return;
        }
        mic.onAudio = function (blob) {
            if (socket.readyState < 2) {
                socket.send(blob)
            }
        };
    }

    function onMessage(msg, socket) {
        if (msg.results) {
            baseString = TranscriptUtils.updateTranscriptionResult(msg, baseString, false, transcriptionCallback);
        }
    }

    function onError(r, socket) {
        console.log('Mic socket err: ', err);
    }

    function onClose(evt) {
        console.log('Mic socket close: ', evt);
        closedCallback();
    }

    socket.initSocket(options, onOpen, onListening, onMessage, onError, onClose);

};
