/**
 * Created by venkatesh-sivaraman on 7/21/15.
 *
 * annotationarea.js is the controller module for annotation areas.
 */
'use strict';

var RADIUS = 10.0, ARROW_WIDTH = 26.0, ARROW_HEIGHT = 16.0;

var drawAnnotationCanvas_ = function (annotationArea) {
    var canvas, ctx, rightBorder, bottomBorder, topBorder, toolbar, arrowX;
    canvas = annotationArea.getElementsByClassName('annotationBorder')[0];
    if (!canvas.getAttribute("vs-arrow-x"))
        canvas.setAttribute("vs-arrow-x", (Math.random() * (canvas.width - RADIUS * 4 - 1) + RADIUS * 2 + 0.5).toString());
    ctx = canvas.getContext('2d');
    canvas.width = ctx.canvas.clientWidth;
    canvas.height = ctx.canvas.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    rightBorder = canvas.width - 5.0;
    bottomBorder = canvas.height - 5.0;
    topBorder = ARROW_HEIGHT;
    ctx.fillStyle = "#FEFEFE";
    ctx.strokeStyle = "#888888";
    ctx.shadowColor = "gray";
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.translate(0.5, 0.5);
    ctx.moveTo(RADIUS, topBorder);
    //ctx.lineTo(rightBorder - RADIUS, 0);
    //Draw arrow
    ctx.lineTo(parseFloat(canvas.getAttribute("vs-arrow-x")) - ARROW_WIDTH / 2.0, topBorder);
    ctx.lineTo(parseFloat(canvas.getAttribute("vs-arrow-x")), 0.0);
    ctx.lineTo(parseFloat(canvas.getAttribute("vs-arrow-x")) + ARROW_WIDTH / 2.0, topBorder);
    ctx.lineTo(rightBorder - RADIUS, topBorder);
    ctx.arcTo(rightBorder, topBorder, rightBorder, topBorder + RADIUS, RADIUS);
    ctx.lineTo(rightBorder, bottomBorder - RADIUS);
    ctx.arcTo(rightBorder, bottomBorder, rightBorder - RADIUS, bottomBorder, RADIUS);
    ctx.lineTo(RADIUS, bottomBorder);
    ctx.arcTo(0, bottomBorder, 0, bottomBorder - RADIUS, RADIUS);
    ctx.lineTo(0, topBorder + RADIUS);
    ctx.arcTo(0, topBorder, RADIUS, topBorder, RADIUS);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.stroke();
    ctx.restore();

    toolbar = annotationArea.getElementsByClassName('annotationToolbar')[0];
    ctx = toolbar.getContext('2d');
    ctx.clearRect(0, 0, toolbar.width, toolbar.height);
    ctx.save();
    arrowX = parseFloat(canvas.getAttribute('vs-arrow-x'));
    rightBorder = toolbar.width - 5.0;
    bottomBorder = toolbar.height - 1.0;
    topBorder = ARROW_HEIGHT;
    ctx.fillStyle = "#2196f3";
    ctx.strokeStyle = "#888888";
    ctx.translate(0.5, 0.5);
    ctx.moveTo(RADIUS, topBorder);
    //Draw arrow
    ctx.lineTo(arrowX - ARROW_WIDTH / 2.0, topBorder);
    ctx.lineTo(arrowX, 0.0);
    ctx.lineTo(arrowX + ARROW_WIDTH / 2.0, topBorder);
    ctx.lineTo(rightBorder - RADIUS, topBorder);
    ctx.arcTo(rightBorder, topBorder, rightBorder, topBorder + RADIUS, RADIUS);
    ctx.lineTo(rightBorder, bottomBorder);
    ctx.lineTo(0, bottomBorder);
    ctx.lineTo(0, topBorder + RADIUS);
    ctx.arcTo(0, topBorder, RADIUS, topBorder, RADIUS);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
};


var VoiceAnnotationController = function (annotationElement, editable) {

    var areaElement = $(annotationElement),
        audiovisual = areaElement.find('.audiovisual'),
        avHandler = new Audiovisual(audiovisual[0]),
        viewContext = null,
        currentlyRecording = false,
        transcriptFinalized = false,
        playbackTimestampIndex = -1,
        playbackJustStarted = false,
        annotEditor = this;

    this.initTextAreaEditing = function (transcriptView) {
        TranscriptTextArea.onDeletion = function (textArea, deletionRange, cb) {
            if (!AudioCoordinator.renderedWordIntervals)
                return;
            if (r2.audioPlayer.isPlaying())
                annotEditor.stopAudio();

            var deletedStamps, beginTime, endTime, currentText;
            if (deletionRange.end - deletionRange.start >= AudioCoordinator.renderedWordIntervals.length - 1) {
                deletedStamps = AudioCoordinator.timeStamps;
                AudioCoordinator.timeStamps = [];
            } else {
                console.log(deletionRange.start, deletionRange.end, AudioCoordinator.timeStamps[deletionRange.start]);
                deletedStamps = AudioCoordinator.timeStamps.slice(deletionRange.start, deletionRange.end + 1);
                AudioCoordinator.timeStamps.splice(deletionRange.start, deletionRange.end - deletionRange.start + 1);
            }

            // Save these timestamps in case the user wants to change the transcript instead of deleting the audio.
            if (deletedStamps.length > 1 || TranscriptUtils.isWordString(deletedStamps[0].word)) {
                if (TranscriptTextArea.selectionContext['ts'])
                    TranscriptTextArea.selectionContext['ts'] = deletedStamps.concat(TranscriptTextArea.selectionContext['ts']);
                else
                    TranscriptTextArea.selectionContext['ts'] = deletedStamps;
            }

            beginTime = AudioCoordinator.renderedWordIntervals[deletionRange.start].startTime;
            endTime = AudioCoordinator.renderedWordIntervals[deletionRange.end].endTime;
            currentlyTranscribedText = transcriptView.text().trim();
            TranscriptUtils.formatTranscriptionTokens(transcriptView,
                AudioCoordinator.renderWordIntervals(),
                TranscriptTextArea.showsTokenBorders);
            drawAnnotationCanvas_(areaElement[0]);
            if (cb)
                cb();

            currentText = transcriptView.text();
            AudioCoordinator.renderAudio(function (finalBlob, wordIntervals) {
                if (transcriptView.text() != currentText) {
                    return;
                }
                if (!finalBlob) {
                    avHandler.clear();
                } else {
                    r2.audioRecorder.parseWAV(finalBlob, function (wavInfo) {
                        avHandler.wordIntervals = wordIntervals;
                        var line = TranscriptTextArea.lineSelection();
                        avHandler.beginVisible = AudioCoordinator.renderedWordIntervals[line.start].startTime;
                        avHandler.endVisible = AudioCoordinator.renderedWordIntervals[line.end].endTime;
                        if (wordIntervals.length)
                            avHandler.animateDeletion(wavInfo.samples, beginTime, endTime);
                    });
                }
            });
        };

        TranscriptTextArea.onEdit = function (textArea, nodeRange, contents, overwrite) {
            if (r2.audioPlayer.isPlaying()) {
                annotEditor.stopAudio();

                // If it is a space, we should assume it was intended to stop the audio.
                if (nodeRange.start == nodeRange.end) {
                    var selOffset = TranscriptTextArea.currentWordSelectionIndex();
                    if (contents.slice(selOffset - 1, selOffset).replace(/\s/g, " ") == " ")
                        return { shouldEdit: false };
                } else if (contents.replace(/\s/g, " ") == " ")
                    return { shouldEdit: false };
            }

            var startTS = AudioCoordinator.timeStamps[nodeRange.start],
                endTS = AudioCoordinator.timeStamps[nodeRange.end];
            if (nodeRange.start == nodeRange.end) {
                var selCtx = TranscriptTextArea.selectionContext['ts'],
                    deltaSegment, nextTS,
                    completion = function (finalBlob, wordIntervals) {
                        drawAnnotationCanvas_(areaElement[0]);
                        r2.audioRecorder.parseWAV(finalBlob, function (wavInfo) {
                            avHandler.setAudioFrames(wavInfo.samples);
                            avHandler.wordIntervals = wordIntervals;
                            var line = TranscriptTextArea.lineSelection();
                            avHandler.beginVisible = wordIntervals[line.start].startTime;
                            avHandler.endVisible = wordIntervals[line.end].endTime;
                            avHandler.renderWaveform();
                            audiovisual.mousedown(waveformMouseDown);
                        });
                    };

                if (TranscriptTextArea.currentWordSelectionIndex() > 0)
                    deltaSegment = contents.slice(startTS.word.length);
                else
                    deltaSegment = contents.slice(0, 1);
                if (selCtx && deltaSegment.trim().length) {
                    // The user wants to edit the transcript, so we should restore the recording segments he/she just deleted.
                    var diffIdx, insertedTS;
                    for (diffIdx = 0; diffIdx < selCtx.length; diffIdx++) {
                        if (selCtx[diffIdx].resourceID != selCtx[0].resourceID)
                            break;
                    }
                    selCtx = selCtx.slice(0, diffIdx);
                    insertedTS = new Timestamp(selCtx[0].resourceID, contents.slice(startTS.word.length), selCtx[0].startTime, selCtx[selCtx.length - 1].endTime);
                    AudioCoordinator.timeStamps.splice(nodeRange.start + 1, 0, insertedTS);
                    for (var i = 0; i < AudioCoordinator.timeStamps.length; i++) {
                        if (AudioCoordinator.timeStamps[i].word == "%HESITATION")
                            AudioCoordinator.timeStamps[i].word = " ";
                    }
                    TranscriptUtils.formatTranscriptionTokens(TranscriptTextArea.textArea,
                        AudioCoordinator.timeStamps,
                        TranscriptTextArea.showsTokenBorders);

                    AudioCoordinator.renderAudio(function (blob, wordIntervals) {
                        if (!blob) {
                            avHandler.clear();
                        } else {
                            completion(blob, wordIntervals);
                        }
                    });

                    return { shouldEdit: true,
                        selection: { node: TranscriptTextArea.textArea[0].childNodes[nodeRange.start + 1], offset: insertedTS.word.length}};
                } else {
                    // Check if we should be inserting the text into the beginning of the subsequent token instead of the
                    // end of the current token.
                    var beginning = false;
                    if (TranscriptTextArea.currentWordSelectionIndex() > 0 &&
                        nodeRange.start < AudioCoordinator.timeStamps.length - 1 && !overwrite) {
                        nextTS = AudioCoordinator.timeStamps[nodeRange.start + 1];
                        if (TranscriptUtils.isWordString(deltaSegment)) {
                            if (TranscriptUtils.isWordString(nextTS.word) && !TranscriptUtils.isWordString(startTS.word)) {
                                beginning = true;
                                startTS = nextTS;
                                endTS = nextTS;
                                contents = deltaSegment + nextTS.word;
                            }
                        } else {
                            console.log(JSON.stringify(nextTS), JSON.stringify(startTS));
                            if (!TranscriptUtils.isWordString(nextTS.word) && TranscriptUtils.isWordString(startTS.word)) {
                                beginning = true;
                                startTS = nextTS;
                                endTS = nextTS;
                                contents = deltaSegment + nextTS.word;
                            } else if (TranscriptUtils.isWordString(startTS.word)) {
                                AudioCoordinator.timeStamps.splice(nodeRange.start + 1, 0, TranscriptUtils.spaceWordInterval(0, SPACE_CHAR_DURATION));
                                TranscriptUtils.formatTranscriptionTokens(TranscriptTextArea.textArea,
                                    AudioCoordinator.renderWordIntervals(),
                                    TranscriptTextArea.showsTokenBorders);
                                AudioCoordinator.renderAudio(completion);
                                return {
                                    shouldEdit: true,
                                    selection: {
                                        node: TranscriptTextArea.textArea[0].childNodes[nodeRange.start + 1],
                                        offset: 1
                                    }
                                }
                            }
                        }
                    }
                    startTS.word = contents;
                    if (!startTS.word.trim().length) {
                        console.log("Contents:", JSON.stringify(startTS.word));
                        AudioCoordinator.renderAudio(completion);
                    }
                    if (beginning) {
                        drawAnnotationCanvas_(areaElement[0]);
                        TranscriptUtils.updateTranscriptionTokens(TranscriptTextArea.textArea,
                            TranscriptTextArea.textArea[0].childNodes[nodeRange.start],
                            TranscriptTextArea.textArea[0].childNodes[nodeRange.start + 1],
                            AudioCoordinator.timeStamps.slice(nodeRange.start, nodeRange.start + 2));
                        return {
                            shouldEdit: true,
                            selection: {
                                node: TranscriptTextArea.textArea[0].childNodes[nodeRange.start + 1],
                                offset: deltaSegment.length
                            }
                        };
                    }
                }
            } else {
                var resID = startTS.resourceID;
                for (i = nodeRange.start + 1; i <= nodeRange.end; i++) {
                    if (AudioCoordinator.timeStamps[i].resourceID != resID) {
                        alert("You can't delete words from different recordings at the same time.");
                        return { shouldEdit: false };
                    }
                }
                AudioCoordinator.timeStamps.splice(nodeRange.start, nodeRange.end - nodeRange.start + 1, new Timestamp(resID, contents, startTS.startTime, endTS.endTime));
            }
            drawAnnotationCanvas_(areaElement[0]);
            return { shouldEdit: true };
        };
    };

    this.initialize = function () {
        drawAnnotationCanvas_(areaElement[0]);

        var transcriptView = areaElement.find('#transcriptView');
        TranscriptTextArea.init(transcriptView);
        if (this.editable)
            this.initTextAreaEditing(transcriptView);
        else {
            TranscriptTextArea.showsTokenBorders = false;
            TranscriptTextArea.textArea.removeAttr('contenteditable').blur();
        }
        TranscriptTextArea.onSelectionChange = function () {
            var line = TranscriptTextArea.lineSelection();
            var wordIntervals = AudioCoordinator.renderedWordIntervals;
            if (wordIntervals && wordIntervals.length > 0) {
                avHandler.beginVisible = wordIntervals[line.start].startTime;
                avHandler.endVisible = (wordIntervals[line.end] || wordIntervals[wordIntervals.length - 1]).endTime;
                avHandler.renderWaveform();
            } else {
                avHandler.clear();
            }
        };

        TranscriptTextArea.onPlay = function (textArea, nodeIdx) {
            var time = nodeIdx < AudioCoordinator.renderedWordIntervals.length - 1 ?
            AudioCoordinator.renderedWordIntervals[nodeIdx].startTime * 1000 : 0;
            annotEditor.playAudio(time);
            window.requestAnimFrame(drawAudiovisual);
        };

        avHandler.clear();
        r2.audioRecorder.Init("../").catch(
            function(err){
                alert(err.message);
            }
        );

        //Comment out the below statement to go back to traditional one-time transcription
        r2.audioRecorder.liveRecording = true;

        AudioCoordinator.init();
        window.requestAnimFrame(drawAudiovisual);

        areaElement.find('#play_btn').mousedown(function (e) {
            var ae = document.activeElement;
            setTimeout(function() {
                ae.focus();
            }, 1);
        });

        initRecordButton();
    };

    this.initializeWithContext = function (ctx) {
        viewContext = ctx;
    };

    this.onFinished = function (audioBlob, transcription) {};

    console.log("Editable:", editable);
    this.editable = (typeof editable !== 'undefined') ? editable : true;

    var currentlyTranscribedText = '';
    var runningWordIntervals;
    var finishedRecordingUrl = null, recordingBuffer = null;
    var transcriptInsertLocation = 0;

    var testingRawAudio = false, testingRenderer = true;

    this.clear = function () {
        currentlyTranscribedText = '';
        finishedRecordingUrl = null;
        recordingBuffer = null;
        transcriptInsertLocation = 0;
        avHandler.clear();
        AudioCoordinator.init();
        TranscriptTextArea.textArea.empty();
        drawAnnotationCanvas_(areaElement[0]);
    };

    /**
     * Called right after audio rendering finishes (to display the information).
     * @param finalBlob
     * @param wordIntervals
     */
    function renderCompletion (finalBlob, wordIntervals) {
        var transcriptView = TranscriptTextArea.textArea;
        currentlyTranscribedText = transcriptView.text().trim();
        for (var i = 0; i < wordIntervals.length; i++) {
            if (wordIntervals[i].word == "%HESITATION")
                wordIntervals[i].word = " ";
        }
        TranscriptUtils.formatTranscriptionTokens(transcriptView, wordIntervals, TranscriptTextArea.showsTokenBorders);
        TranscriptTextArea.textArea.find('.annotationToken, .annotationSpace').click(function (e) {
            if (r2.audioPlayer.isPlaying()) {
                var nodeIdx = TranscriptTextArea.positionOfNode(e.target);
                var time = nodeIdx < AudioCoordinator.renderedWordIntervals.length - 1 ?
                AudioCoordinator.renderedWordIntervals[nodeIdx].startTime * 1000 : 0;
                annotEditor.playAudio(time);
                window.requestAnimFrame(drawAudiovisual);
            }
        });
        drawAnnotationCanvas_(areaElement[0]);
        TranscriptTextArea.setCursorWordPosition(Math.min(transcriptInsertLocation + runningWordIntervals.length, wordIntervals.length));
        transcriptInsertLocation = 0;

        r2.audioRecorder.parseWAV(finalBlob, function (wavInfo) {
            var line = TranscriptTextArea.lineSelection();
            avHandler.setAudioFrames(wavInfo.samples);
            avHandler.wordIntervals = wordIntervals;
            avHandler.beginVisible = wordIntervals[line.start].startTime;
            avHandler.endVisible = wordIntervals[line.end].endTime;
            avHandler.renderWaveform();

            audiovisual.mousedown(waveformMouseDown);
        });
    }

    /**
     * Called right after recording finishes.
     */
    var finishRecording = function() {
        if (!finishedRecordingUrl)
            return;

        var transcriptView = TranscriptTextArea.textArea,
            duration, cb;
        if (testingRawAudio && !testingRenderer) {
            duration = recordingBuffer.length / (2 * r2.audioRecorder.RECORDER_SAMPLE_RATE);
            runningWordIntervals.push(new Timestamp(0, '. ', runningWordIntervals[runningWordIntervals.length - 1].endTime, duration));
            AudioCoordinator.renderedWordIntervals = runningWordIntervals;
            var xhr = new XMLHttpRequest();
            xhr.open('GET', finishedRecordingUrl, true);
            xhr.responseType = 'blob';
            xhr.onload = function(e) {
                AudioCoordinator.renderedAudioBlob = this.response;
                renderCompletion(finishedRecordingUrl, runningWordIntervals);
            };
            xhr.send();
        }
        else {
            cb = function () {
                console.log("Running intervals before render:", JSON.stringify(runningWordIntervals));
                var delta = AudioCoordinator.mergeSpaceGroups();
                if (transcriptInsertLocation)
                    transcriptInsertLocation -= delta;
                AudioCoordinator.renderAudio(renderCompletion);
            };

            duration = recordingBuffer.length / (2 * r2.audioRecorder.RECORDER_SAMPLE_RATE);
            if (document.activeElement == transcriptView[0]) {
                // Insert the current recording into the time interval dictated by transcriptInsertLocation
                if (runningWordIntervals.length && runningWordIntervals[0].startTime > 0)
                    runningWordIntervals.splice(0, 0, TranscriptUtils.spaceWordInterval(0, runningWordIntervals[0].startTime));
                if (duration - runningWordIntervals[runningWordIntervals.length - 1].endTime > 0)
                    runningWordIntervals.push(TranscriptUtils.spaceWordInterval(runningWordIntervals[runningWordIntervals.length - 1].endTime, duration));
                AudioCoordinator.insertAudioResource(finishedRecordingUrl, transcriptInsertLocation, runningWordIntervals, cb);
            } else {
                // Add the current recording at the end of the working annotation
                if (duration - runningWordIntervals[runningWordIntervals.length - 1].endTime > 0)
                    runningWordIntervals.push(TranscriptUtils.spaceWordInterval(runningWordIntervals[runningWordIntervals.length - 1].endTime, duration));
                AudioCoordinator.appendAudioResource(finishedRecordingUrl, runningWordIntervals, cb);
                finishedRecordingUrl = null;
            }
        }
    };

    /*
    Called when data is sent from the transcription service containing the text transcription and possibly time
    intervals for each word.
     */
    var transcriptionCallback_ = function (transcription, final, timestamps) {

        var transcriptView = TranscriptTextArea.textArea;
        if (document.activeElement === transcriptView[0]) {
            var offset = TranscriptUtils.insertTemporaryTranscriptionTokens(transcriptView, ' ' + transcription + ' ', transcriptInsertLocation);
            TranscriptTextArea.setCursorWordPosition(Math.max(0, transcriptInsertLocation + offset));
        }
        else {
            TranscriptUtils.insertTemporaryTranscriptionTokens(transcriptView, transcription, TranscriptTextArea.textArea[0].childNodes.length);
        }

        transcriptFinalized = final;
        if (final && timestamps.length) {
            // Format the timestamps from IBM Watson
            var prevEnd = -1;
            if (runningWordIntervals.length &&
                timestamps[0][1] - runningWordIntervals[runningWordIntervals.length - 1].endTime > 0)
                prevEnd = runningWordIntervals[runningWordIntervals.length - 1].endTime;
            else if (timestamps[0][1] > 0)
                prevEnd = 0;
            runningWordIntervals = runningWordIntervals.concat(TranscriptUtils.parseTimestamps(timestamps, prevEnd));
        }

        // Redraw annotation canvas in case it was resized
        drawAnnotationCanvas_(areaElement[0]);

    };

    // Recording methods

    this.startRecording = function(recordButton) {
        if (!recordButton)
            recordButton = areaElement.find('#recording_start_btn');
        var currentModel = localStorage.getItem('currentModel'),
            transcriptView = TranscriptTextArea.textArea,
            selectionRange;

        areaElement.find('#play_btn').attr('disabled', true);

        if (testingRawAudio) {
            // Circumvent the default recording behavior for testing purposes
            var audio = "https://dl.dropboxusercontent.com/u/6125532/RSI/quickbrownfox3.wav";
            this.transcriptAudio(viewContext, audio);
        }
        else if (r2.audioRecorder.liveRecording) {
            runningWordIntervals = [];
            currentlyTranscribedText = transcriptView.text();

            // If necessary, insert the new recording at the current word selection
            if (document.activeElement == transcriptView.get(0)) {
                selectionRange = TranscriptTextArea.currentWordSelection();
                if (selectionRange.start == selectionRange.end) {
                    TranscriptTextArea.dimAll();
                    transcriptInsertLocation = selectionRange.start;
                    if (TranscriptTextArea.currentWordSelectionIndex() > 0)
                        transcriptInsertLocation++;
                }
            }

            // Initialize the microphone
            handleMicrophone(viewContext.token, currentModel, r2.audioRecorder, function(err, socket) {
                // Opened callback

                if (err) {
                    var msg = 'Error: ' + err.message;
                    console.log(msg);
                    alert(msg);
                    currentlyRecording = false;
                } else {
                    recordButton.text('Stop');
                    console.log('starting mic');
                    r2.audioRecorder.BgnRecording();
                    currentlyRecording = true;
                }

            }, transcriptionCallback_, function() {
                // Socket close callback

                if (transcriptFinalized)
                    finishRecording();
                else {
                    alert("We didn't quite catch that. Please try again!");
                    AudioCoordinator.renderAudio(renderCompletion);
                }

            });
        } else {
            recordButton.text('Stop');
            console.log('starting mic');
            r2.audioRecorder.BgnRecording();
            currentlyRecording = true;
        }
    };

    /**
     * Initializes the record button, and also configures the behaviors of the microphone and the transcript
     * text box.
     */
    var initRecordButton = function() {
        var recordButton = areaElement.find('#recording_start_btn');

        // Prevent the record button from stealing focus
        recordButton.mousedown(function (e) {
            var ae = document.activeElement;
            setTimeout(function() {
                ae.focus();
            }, 1);
        });

        recordButton.click((function() {
            return function(evt) {

                // Prevent default anchor behavior
                evt.preventDefault();

                if (r2.audioPlayer.isPlaying())
                    return;
                if (!viewContext)
                    return;

                if (!currentlyRecording) {
                    annotEditor.startRecording(recordButton);
                } else {
                    /* Stop the recording, but don't necessarily finish the recording process (may still be processing
                     data from Bluemix) */
                    recordButton.text('Record');
                    areaElement.find('#play_btn').attr('disabled', false);
                    $.publish('hardsocketstop');
                    r2.audioRecorder.EndRecording(function(url, blob, buffer){
                        finishedRecordingUrl = url;
                        recordingBuffer = buffer.subarray(44);

                        //For regular, non-streamed transcriptions:
                        if (r2.audioRecorder.liveRecording == false) {
                            annotEditor.transcriptAudio(viewContext, finishedRecordingUrl);
                        }
                    });
                    currentlyRecording = false;
                }
            }
        })());
    };

    /**
     * This is a method for sending full WAV audio files to Bluemix to transcribe. Change the hardcoded URL in utils.js
     * to the correct server, and make sure to add Access-Control-Allow-Origin headers to the result in that server.
     * Also, the URL you provide needs to be accessible from another origin, so it cannot be a blob.
     * @param ctx - The session context containing the authentication token
     * @param audio - a URL pointing to an audio file
     */
    this.transcriptAudio = function (ctx, audio) {
        var transcriptView = TranscriptTextArea.textArea,
            xhr = new XMLHttpRequest();
        runningWordIntervals = [];

        xhr.open('GET', audio, true);
        xhr.responseType = 'blob';
        xhr.onload = function(e) {
            if (this.status == 200) {
                var blob = this.response;
                finishedRecordingUrl = (window.URL || window.webkitURL).createObjectURL(blob);
                /* We will use this method to establish a socket connection to IBM Watson, even though we are not
                using the microphone (that's why null is passed for the `mic` parameter).
                 */
                handleMicrophone(ctx.token, 'en-US_BroadbandModel', null, function(err, socket) {
                        // Open callback
                        console.log("Opened, blob is", blob);
                        var parseOptions = { file: blob };

                        utils.onFileProgress(parseOptions,
                            // On data chunk
                            function(chunk) {
                                socket.send(chunk);
                            },
                            // On file read error
                            function(evt) {
                                console.log('Error reading file: ', evt.message);
                                alert('Error: ' + evt.message);
                            },
                            // On load end
                            function() {
                                socket.send(JSON.stringify({'action': 'stop'}));
                            });

                    }, transcriptionCallback_, function () {
                        // Close callback

                        r2.audioRecorder.parseWAV(blob, function (wavInfo) {
                            recordingBuffer = wavInfo.samples;
                            finishRecording();
                        });

                    }
                );
            }
        };
        xhr.send();
    };

    // Playback and button clicks

    this.doneButtonPressed = function (event) {
        if (AudioCoordinator.timeStamps.length) {
            AudioCoordinator.renderAudio(function (blob) {
                annotEditor.onFinished(blob, TranscriptTextArea.textArea.text().replace(/ +/g, ' ').trim());
                annotEditor.clear();
            });
        } else {
            annotEditor.onFinished(null, '');
            annotEditor.clear();
        }
    };

    this.playButtonPressed = function (event) {
        if (r2.audioPlayer.isPlaying()) {
            playbackJustStarted = false;
            this.stopAudio();
        } else {
            var startPoint = 0;
            if (document.activeElement == TranscriptTextArea.textArea.get(0)) {
                startPoint = TranscriptTextArea.currentWordSelection().start;
                if (startPoint >= TranscriptTextArea.textArea[0].childNodes.length - 1)
                    startPoint = 0;
            }
            AudioCoordinator.renderAudio(function (finalBlob, wordIntervals) {
                avHandler.wordIntervals = wordIntervals;
                if (startPoint > 0) {
                    annotEditor.playAudio(wordIntervals[startPoint].startTime * 1000);
                } else {
                    annotEditor.playAudio(0);
                }
            });
        }
    };

    this.playAudio = function (startTime) {
        r2.audioPlayer.play(Math.random() * 10, (window.URL || window.webkitURL).createObjectURL(AudioCoordinator.renderedAudioBlob), startTime);
        var startIdx;
        for (startIdx = 0; startIdx < AudioCoordinator.renderedWordIntervals.length; startIdx++) {
            if (AudioCoordinator.renderedWordIntervals[startIdx].endTime > startTime / 1000)
                break;
        }
        playbackTimestampIndex = startIdx;
        playbackJustStarted = true;
        window.requestAnimFrame(drawAudiovisual);

        areaElement.find('#play_btn').text('Stop');
        areaElement.find('#recording_start_btn').attr('disabled', true);
    };

    this.stopAudio = function () {
        if (playbackJustStarted)
            return;
        if (playbackTimestampIndex != -1) {
            r2.audioPlayer.stop();
        }
        avHandler.renderWaveform();

        playbackTimestampIndex = -1;
        TranscriptTextArea.unhighlightAll();
        areaElement.find('#play_btn').text('Play');
        areaElement.find('#recording_start_btn').attr('disabled', false);
    };

    var waveformMouseDown = function (event){
        AudioCoordinator.renderAudio(function (finalBlob, wordIntervals) {
            avHandler.wordIntervals = wordIntervals;
            var start = avHandler.beginVisible,
                end = avHandler.endVisible;
            var time = 1000 * (start + (end - start) * event.offsetX/audiovisual.width());
            annotEditor.playAudio(time);
            window.requestAnimFrame(drawAudiovisual);
        });
    };

    function drawAudiovisual () {
        window.requestAnimFrame(drawAudiovisual);
        if (r2.audioPlayer.isPlaying()) {
            var ts = AudioCoordinator.renderedWordIntervals[playbackTimestampIndex],
                line;
            if (ts && r2.audioPlayer.getPlaybackTime() / 1000 >= ts.endTime) {
                playbackTimestampIndex++;
                playbackJustStarted = false;
                if (playbackTimestampIndex >= AudioCoordinator.renderedWordIntervals.length)
                    TranscriptTextArea.unhighlightAll();
                else
                    TranscriptTextArea.highlightWord(playbackTimestampIndex);
            } else {
                TranscriptTextArea.highlightWord(playbackTimestampIndex);
            }
            line = TranscriptTextArea.lineSelection(playbackTimestampIndex);
            avHandler.beginVisible = AudioCoordinator.renderedWordIntervals[line.start].startTime;
            avHandler.endVisible = AudioCoordinator.renderedWordIntervals[line.end].endTime;
            avHandler.renderWaveform(r2.audioPlayer.getPlaybackTime() / r2.audioPlayer.getDuration());
        } else if (!playbackJustStarted) {
            annotEditor.stopAudio();
        }
    }

    this.initialize();
};
