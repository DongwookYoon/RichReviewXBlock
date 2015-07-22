/**
 * Created by dongwookyoon on 6/25/15.
 */


var draw_ctx;
var recordings = [];

function init() {

}

/**
 * Initializes the record button, and also configures the behaviors of the microphone and the transcript
 * text box.
 * @param ctx - dictionary; needs the token to authorize contact with the Bluemix server.
 */
var initRecordButton = function(ctx) {
    var recordButton = $('#recording_start_btn');
    recordButton.click((function() {
        var running = false;
        var token = ctx.token;
        return function(evt) {
            // Prevent default anchor behavior
            evt.preventDefault();
            var currentModel = localStorage.getItem('currentModel');
            if (!running) {
                if (r2.audioRecorder.liveRecording) {
                    handleMicrophone(token, currentModel, r2.audioRecorder, function(err, socket) {
                        if (err) {
                            var msg = 'Error: ' + err.message;
                            console.log(msg);
                            alert(msg);
                            running = false;
                        } else {
                            recordButton.text('Stop');
                            $('#transcript_textbox').text('');
                            console.log('starting mic');
                            r2.audioRecorder.BgnRecording();
                            running = true;
                        }
                    }, function(transcription) {
                        $('#transcript_textbox').text(transcription);
                    });
                } else {
                    recordButton.text('Stop');
                    $('#transcript_textbox').text('');
                    console.log('starting mic');
                    r2.audioRecorder.BgnRecording();
                    running = true;
                }
            } else {
                console.log('Stopping microphone, sending stop action message');
                recordButton.text('Start');
                $.publish('hardsocketstop');
                r2.audioRecorder.EndRecording(function(url, blob, buffer){
                    recordings.push({id:recordings.length, url:url});
                    var wavLink = $("#wav_file_url");
                    wavLink.text("wav file link");
                    wavLink.attr("href", url);
                    $("#playbar").mousedown(playbarMouseDown);

                    //For regular, non-streamed transcriptions:
                    if (r2.audioRecorder.liveRecording == false) {
                        r2.audioRecorder.exportL16(buffer, function (l16url, l16blob) {
                            transcriptAudio(l16url);
                        });
                    }
                });
                running = false;
            }
        }
    })());
};

/**
 * Performs required initializations for the Bluemix communication.
 */
window.onload = function(){
    r2.audioRecorder.Init("../").catch(
        function(err){
            alert(err.message);
        }
    );
    //Comment out the below statement to go back to traditional one-time transcription
    r2.audioRecorder.liveRecording = true;

    //Get the username, password, and token for the Bluemix server using getAuthInfo (gets the information from the backend)
    utils.getAuthInfo(function(authInfo) {

        if (!authInfo) {
            console.error('No authorization token available');
            console.error('Attempting to reconnect...');
        }
        var credentials = {
            version:'v1',
            url: 'https://stream.watsonplatform.net/speech-to-text/api',
            username: authInfo.username,
            password: authInfo.password
        };

        var viewContext = {
            currentModel: 'en-US_BroadbandModel',
            //models: models,
            token: authInfo.token
        };

        window.onbeforeunload = function(e) {
            localStorage.clear();
        };

        // Set default current model
        localStorage.setItem('currentModel', 'en-US_BroadbandModel');
        localStorage.setItem('sessionPermissions', 'true');

        initRecordButton(viewContext);
        console.log("Now ready");

    }, function (error) {
        alert("Cannot record audio because there was no server authentication.");
    });

    draw_ctx = document.getElementById("playbar").getContext("2d");
    requestAnimFrame(drawPlaybar);
    $("#recording_stop_btn").prop("disabled",true);
};

/**
 * This is a method for sending full WAV audio files to Bluemix to transcribe. Change the hardcoded URL in utils.js
 * to the correct server, and make sure to add Access-Control-Allow-Origin headers to the result in that server.
 * Also, the URL you provide needs to be accessible from another origin, so it cannot be a blob.
 * @param audio - a URL pointing to an audio file
 */
function transcriptAudio(audio) {
    $.ajax({
        type: 'GET',
        url: (SERVER_URL + 'speech2text/?s=' + audio),
        dataType: 'json',
        success: function(data){
            if (data.results && data.results.length > 0) {
                //if is a partial transcripts
                if (data.results.length === 1) {
                    var text = data.results[0].alternatives[0].transcript || '';
                    console.log(text);
                }
            }
            TranscriptUtils.updateTranscriptionResult(data, '', true, function (transcription, finalized, timestamps) {
                $('#transcriptView').text(transcription);
                console.log("Timestamps:", timestamps);
            });
        },
        error: function(xhr){
            alert('Error processing the request, please try again.');
        }
    });
}


/**
 * In the test project, this method is called when the Transcribe button is pressed, and takes the URL to send from the
 * URL field in the UI.
 */
var transcribeOnlineURL = function() {
    var url = $('.online-url-field').val();
    console.log("Chosen URL:", url);
    transcriptAudio(url);
};

//Playbar methods:

var playbarMouseDown = function(event){
    if(recordings.length === 0){return;}

    var recording = recordings[recordings.length-1];
    var time = r2.audioPlayer.getDuration()*event.offsetX/$("#playbar").width();
    r2.audioPlayer.play(recording.id, recording.url, time);
};

var drawPlaybar = function(){
    requestAnimFrame(drawPlaybar);

    var playbar = $("#playbar");
    var w = playbar.width();
    var h = playbar.height();
    draw_ctx.fillStyle = "gray";
    draw_ctx.fillRect(0, 0, w, h);

    var progress = w*r2.audioPlayer.getPlaybackTime()/r2.audioPlayer.getDuration();

    draw_ctx.fillStyle = "red";
    draw_ctx.fillRect(0, 0, progress, h);
};

// render timer
window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 1000/30); // 30fps
        };
})();