/**
 * Created by venkatesh-sivaraman on 7/7/15.
 */

'use strict';

var annotEditor = null;
var annotViewers = [];
var viewContext = null;

window.onload = function() {

    annotEditor = new VoiceAnnotationController($('.annot_producer#1')[0], true);

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

        viewContext = {
            currentModel: 'en-US_BroadbandModel',
            //models: models,
            token: authInfo.token
        };

        window.onbeforeunload = function(e) {
            localStorage.clear();
        };

        // Set default current model
        localStorage.setItem('currentModel', viewContext.currentModel);
        localStorage.setItem('sessionPermissions', 'true');

        annotEditor.initializeWithContext(viewContext);
        console.log("Now ready");
        //annotEditor.transcriptAudio(viewContext, "https://dl.dropboxusercontent.com/u/6125532/RSI/quickbrownfox3.wav");

    }, function (error) {
        alert("Cannot record audio because there was no server authentication.");
    });

    // Set up the study
    $('.instruction').css('display', 'none');
    $('#questionBank').html('This program allows you to record and edit voice comments using a text editor-like interface.' +
        ' This initial screen is a sandbox for learning how to use the site. Press &#10004; to continue to the questions.');

    var userTestStage = 0;

    var testQuestions = [
        "The video camera provides such an accurate and convincing record of contemporary life that it has become " +
        "a more important form of documentation than written records.",
        "A nation should require all its students to study the same national curriculum until they enter college " +
        "rather than allow schools in different parts of the nation to determine which academic courses to offer.",
        "Although many people think that the luxuries and conveniences of contemporary life are entirely harmless, " +
        "they in fact prevent people from developing into truly strong and independent individuals.",
        "It is okay to make mistakes as long as one learns from them, no matter what the situation. For instance, an " +
        "investor in a high-profile company would be better off making a bad investment and learning from it than " +
        "avoiding the risk.",
        "Today’s technology is so ubiquitous that it prevents people from relaxing and being social. For example, " +
        "smartphones keep people from escaping their work, even on vacation."
    ];
    annotEditor.onFinished = function (blob, transcription, wordIntervals) {
        if (userTestStage >= 0 && blob && wordIntervals) {
            r2.audioRecorder.downloadAudioFile(blob, (new Date()).toString() + '.wav');
            var viewerArea = document.getElementById('consumerAnnotation').getElementsByClassName('annotation_area')[0].cloneNode(true);
            viewerArea.id = (annotViewers.length + 2).toString();
            console.log(viewerArea);
            document.body.insertBefore(viewerArea, $('.annot_producer#1')[0]);
            console.log("Transcribed:", wordIntervals);
            var controller = new VoiceAnnotationController(viewerArea, false);
            controller.initializeWithContext(viewContext);
            controller.staticAudioBlob = blob;
            controller.staticWordIntervals = wordIntervals;
            controller.refreshConsumerView();
            annotViewers.push(controller);

            annotEditor.clear();

            /*if (userTestStage == 1) {
                alert('You finished the practice recording. Click OK to move to the 10-minute task.');
            } else if (userTestStage == 2) {
                alert('Thank you for participating in the pilot study!');
                return;
            }*/
        }
        var qIdx, question;
        $('.instruction').css('display', 'inherit');
        userTestStage++;
        qIdx = Math.floor(Math.random() * testQuestions.length);
        question = userTestStage + '. ' + testQuestions[qIdx];
        testQuestions.splice(qIdx, 1);
        $('#questionBank').text(question);
        if (userTestStage == 1) {
            $('#time_limit').text("You will have 3 minutes to complete this practice session.");
        } else if (userTestStage == 2) {
            $('#time_limit').text("You will have 10 minutes to complete this task.");
        }
    };

};

function consumerPlayButtonPressed (target) {
    var annotArea = $(target).closest('.annot_consumer');
    console.log(annotArea);
    var editor = annotViewers[annotArea[0].id - 2];
    editor.playButtonPressed(event);
}

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