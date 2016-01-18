/**
 * Created by yoon on 1/13/16.
 */


(function(test){
    "use strict";

    bluemix_stt.getAuthInfo().then(
        function(authToken) {
            // create context
            test.context = {
                token: authToken,
                model: 'en-US_BroadbandModel', // audio sampled at >= 16 KHz
                requestLogging: 'false' // opt-in for data logging that enhances model
            };

            // set context in the localStorage
            window.onbeforeunload = function(e) {
                localStorage.clear();
            };

            return;
        }
    ).catch(
        function(err){
            alert(err);
        }
    );

    r2.audioRecorder.Init({'lib_ext/recorder/recorderWorker.js': '../../lib_ext/recorder/recorderWorker.js'}).catch(
        function(err){
            alert(err.message);
        }
    );

    r2.audioRecorder.liveRecording = true;

    test.recordBgn = function(){
        bluemix_stt.handleMicrophone(
            test.context,
            r2.audioRecorder,
            function(err, socket) { // opened
                if (err) {

                } else {

                }
            },
            function(msg){ // transcript
                console.log(JSON.stringify(msg));
            },
            function() { // closed
                console.log('Done');
            }
        );
        r2.audioRecorder.BgnRecording();
    };

    test.recordStop = function(){
        $.publish('hardsocketstop');
        r2.audioRecorder.EndRecording(function(url, blob, buffer){
            console.log(url);
        })
    };

}(window.test = window.test || {}));

