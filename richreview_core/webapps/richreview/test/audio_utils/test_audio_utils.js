/**
 * Created by dongwookyoon on 6/25/15.
 */


var draw_ctx;
var recordings = [];

window.onload = function(){
    draw_ctx = document.getElementById("playbar").getContext("2d");
    requestAnimFrame(drawPlaybar);
    $("#recording_stop_btn").prop("disabled",true);
    r2.audioRecorder.Init("../../").catch(
        function(err){
            alert(err.message);
        }
    );
};

var clickRecordingStart = function(){
    $("#recording_start_btn").prop("disabled",true);
    $("#recording_stop_btn").prop("disabled",false);
    r2.audioRecorder.BgnRecording();
};

var clickRecordingStop = function(){
    r2.audioRecorder.EndRecording().then(
        function(result){
            $("#recording_start_btn").prop("disabled",false);
            $("#recording_stop_btn").prop("disabled",true);

            recordings.push({id:recordings.length, url:result.url});

            $("#wav_file_url").text("wav file link");
            $("#wav_file_url").attr("href", result.url);

            $("#playbar").mousedown(playbarMouseDown)
        }
    );
};

var playbarMouseDown = function(event){
    if(recordings.length === 0){return;}

    var recording = recordings[recordings.length-1];
    var time = r2.audioPlayer.getDuration()*event.offsetX/$("#playbar").width();
    r2.audioPlayer.play(recording.id, recording.url, time);
};

var drawPlaybar = function(){
    requestAnimFrame(drawPlaybar);

    var w = $("#playbar").width();
    var h = $("#playbar").height();
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