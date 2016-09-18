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

var currentPlaybackController = null;

var AnnotationControllerState = {
    normal: "ACSNormal",
    loading: "ACSLoading"
};

var VoiceAnnotationController = function (annotationElement, editable, staticBlob, staticIntervals) {

    var areaElement = $(annotationElement),
        audiovisual = areaElement.find('.audiovisual'),
        avHandler = new Audiovisual(audiovisual[0]),
        viewContext = null,
        currentlyRecording = false,
        socketClosed = true,
        transcriptFinalized = false,
        playbackTimestampIndex = -1,
        playbackJustStarted = false,
        _this = this,
        transcriptManager = null,
        recordingProcessTimeout = null;

    if (!editable) {
        this.staticAudioBlob = staticBlob;
        this.staticWordIntervals = staticIntervals;
    }

    this.mode = AnnotationControllerState.normal;

    this.initTextAreaEditing = function (transcriptView) {
        transcriptManager.revisionBox = areaElement.find('#revision-box');
        transcriptManager.onDeletion = function (textArea, deletionRange, cb) {
            if (!AudioCoordinator.renderedWordIntervals)
                return;
            if (r2.audioPlayer.isPlaying())
                _this.stopAudio();
            if (currentlyRecording)
                _this.stopRecording(areaElement.find('.recording_start_btn'));

            var deletedStamps, beginTime, endTime, currentText;
            if (deletionRange.end - deletionRange.start >= AudioCoordinator.renderedWordIntervals.length - 1) {
                deletedStamps = AudioCoordinator.timeStamps;
                AudioCoordinator.timeStamps = [];
            } else {
                deletedStamps = AudioCoordinator.timeStamps.slice(deletionRange.start, deletionRange.end + 1);
                AudioCoordinator.timeStamps.splice(deletionRange.start, deletionRange.end - deletionRange.start + 1);
            }

            // Save these timestamps in case the user wants to change the transcript instead of deleting the audio.
            if (deletedStamps.length > 1 || TranscriptUtils.isWordString(deletedStamps[0].word)) {
                if (transcriptManager.selectionContext['ts'])
                    transcriptManager.selectionContext['ts'] = deletedStamps.concat(transcriptManager.selectionContext['ts']);
                else
                    transcriptManager.selectionContext['ts'] = deletedStamps;
            }

            beginTime = AudioCoordinator.renderedWordIntervals[deletionRange.start].startTime;
            endTime = AudioCoordinator.renderedWordIntervals[deletionRange.end].endTime;
            currentlyTranscribedText = transcriptView.text().trim();
            TranscriptUtils.formatTranscriptionTokens(transcriptView,
                AudioCoordinator.renderWordIntervals(),
                transcriptManager.editable);
            drawAnnotationCanvas_(areaElement[0]);
            if (cb)
                cb();

            currentText = transcriptView.text();
            areaElement.find('.play_btn').implicitDisable();
            AudioCoordinator.renderAudio(function (finalBlob, wordIntervals) {
                areaElement.find('.play_btn').implicitEnable();
                if (transcriptView.text() != currentText) {
                    return;
                }
                if (!finalBlob || !wordIntervals.length) {
                    avHandler.clear();
                } else {
                    r2.audioRecorder.parseWAV(finalBlob, function (wavInfo) {
                        avHandler.wordIntervals = wordIntervals;
                        var line = transcriptManager.lineSelection();
                        avHandler.beginVisible = AudioCoordinator.renderedWordIntervals[line.start].startTime;
                        avHandler.endVisible = AudioCoordinator.renderedWordIntervals[line.end].endTime;
                        if (wordIntervals.length)
                            avHandler.animateDeletion(wavInfo.samples, beginTime, endTime);
                    });
                }
            });
        };

        transcriptManager.onEdit = function (textArea, nodeRange, contents, overwrite) {
            if (nodeRange.start < 0)
                nodeRange.start = 0;
            if (nodeRange.end < 0)
                nodeRange.end = 0;
            if (r2.audioPlayer.isPlaying()) {
                _this.stopAudio();
            }
            if (currentlyRecording)
                _this.stopRecording(areaElement.find('.recording_start_btn'));

            var startTS = AudioCoordinator.timeStamps[nodeRange.start],
                endTS = AudioCoordinator.timeStamps[nodeRange.end],
                completion = function (finalBlob, wordIntervals) {
                    drawAnnotationCanvas_(areaElement[0]);
                    r2.audioRecorder.parseWAV(finalBlob, function (wavInfo) {
                        avHandler.setAudioFrames(wavInfo.samples);
                        avHandler.wordIntervals = wordIntervals;
                        avHandler.selectedInterval = transcriptManager.currentWordSelection();
                        if (!avHandler.selectedInterval.multipleSelect) {
                            avHandler.selectedInterval.start++;
                            avHandler.selectedInterval.end++;
                        }
                        var line = transcriptManager.lineSelection();
                        avHandler.beginVisible = wordIntervals[line.start].startTime;
                        avHandler.endVisible = wordIntervals[line.end].endTime;
                        avHandler.renderWaveform();
                        audiovisual.mousedown(waveformMouseDown);
                    });
                };
            if (!overwrite) {
                var selCtx = transcriptManager.selectionContext['ts'],
                    deltaSegment, nextTS;

                if (transcriptManager.currentWordSelectionIndex() > 0)
                    deltaSegment = contents.slice(startTS.word.length);
                else
                    deltaSegment = contents.slice(0, 1);
                if (!deltaSegment.length) {
                    // Special case: the text is being entered at the first position in the text view.
                    AudioCoordinator.timeStamps.splice(nodeRange.start, 0, TranscriptUtils.spaceWordInterval(0, SPACE_CHAR_DURATION));
                    TranscriptUtils.formatTranscriptionTokens(transcriptManager.textArea,
                        AudioCoordinator.renderWordIntervals(),
                        transcriptManager.editable);
                    AudioCoordinator.renderAudio(completion);
                    console.log(AudioCoordinator.timeStamps, nodeRange);
                    return {
                        shouldEdit: true,
                        selection: {
                            node: transcriptManager.textArea[0].childNodes[nodeRange.start],
                            offset: 1
                        }
                    };
                }
                else if (selCtx && deltaSegment.trim().length) {
                    // The user wants to edit the transcript, so we should restore the recording segments he/she just deleted.
                    var diffIdx, insertedTS;
                    for (diffIdx = 0; diffIdx < selCtx.length; diffIdx++) {
                        if (selCtx[diffIdx].resourceID != selCtx[0].resourceID)
                            break;
                    }
                    selCtx = selCtx.slice(0, diffIdx);
                    insertedTS = new Timestamp(selCtx[0].resourceID, contents.slice(startTS.word.length), selCtx[0].startTime, selCtx[selCtx.length - 1].endTime);
                    AudioCoordinator.timeStamps.splice(nodeRange.start + 1, 0, insertedTS);
                    TranscriptUtils.formatTranscriptionTokens(transcriptManager.textArea,
                        AudioCoordinator.timeStamps,
                        transcriptManager.editable);

                    AudioCoordinator.renderAudio(function (blob, wordIntervals) {
                        if (!blob) {
                            avHandler.clear();
                        } else {
                            completion(blob, wordIntervals);
                        }
                    });

                    return { shouldEdit: true,
                        selection: { node: transcriptManager.textArea[0].childNodes[nodeRange.start + 1], offset: insertedTS.word.length}};
                } else {
                    // Check if we should be inserting the text into the beginning of the subsequent token instead of the
                    // end of the current token.
                    var beginning = false;
                    if (transcriptManager.currentWordSelectionIndex() > 0 &&
                        nodeRange.start < AudioCoordinator.timeStamps.length - 1) {
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
                                console.log(JSON.stringify(AudioCoordinator.timeStamps));
                            } else if (TranscriptUtils.isWordString(startTS.word)) {
                                AudioCoordinator.timeStamps.splice(nodeRange.start + 1, 0, TranscriptUtils.spaceWordInterval(0, SPACE_CHAR_DURATION));
                                TranscriptUtils.formatTranscriptionTokens(transcriptManager.textArea,
                                    AudioCoordinator.renderWordIntervals(),
                                    transcriptManager.editable);
                                AudioCoordinator.renderAudio(completion);
                                return {
                                    shouldEdit: true,
                                    selection: {
                                        node: transcriptManager.textArea[0].childNodes[nodeRange.start + 1],
                                        offset: 1
                                    }
                                };
                            }
                        }
                    }

                    startTS.word = contents;
                    if (!TranscriptUtils.isWordString(startTS.word)) {
                        AudioCoordinator.renderAudio(completion);
                    }
                    if (beginning) {
                        drawAnnotationCanvas_(areaElement[0]);
                        TranscriptUtils.updateTranscriptionTokens(transcriptManager.textArea,
                            transcriptManager.textArea[0].childNodes[nodeRange.start],
                            transcriptManager.textArea[0].childNodes[nodeRange.start + 1],
                            AudioCoordinator.timeStamps.slice(nodeRange.start, nodeRange.start + 2));
                        return {
                            shouldEdit: true,
                            selection: {
                                node: transcriptManager.textArea[0].childNodes[nodeRange.start + 1],
                                offset: deltaSegment.length
                            }
                        };
                    }
                }
            } else {
                var resID = startTS.resourceID;
                endTS = startTS;    // Increment the endTS to be the last non-space token
                for (var i = nodeRange.start + 1; i <= nodeRange.end; i++) {
                    var ts = AudioCoordinator.timeStamps[i];
                    if (resID == SPACE_RESOURCE) {
                        resID = ts.resourceID;
                        startTS = ts;
                    }
                    if (ts.resourceID != SPACE_RESOURCE) {
                        if (ts.resourceID != resID) {
                            alert("You can't delete words from different recordings at the same time.");
                            return { shouldEdit: false };
                        } else {
                            endTS = ts;
                        }
                    }
                }
                console.log(startTS, endTS);
                if (contents.trim().length)
                    AudioCoordinator.timeStamps.splice(
                        nodeRange.start,
                        nodeRange.end - nodeRange.start + 1,
                        new Timestamp(resID, contents, startTS.startTime, endTS.endTime));
                else
                    AudioCoordinator.timeStamps.splice(
                        nodeRange.start,
                        nodeRange.end - nodeRange.start + 1,
                        TranscriptUtils.spaceWordInterval(0, SPACE_CHAR_DURATION)
                    );
            }
            AudioCoordinator.renderAudio(completion);
            return { shouldEdit: true };
        };
    };

    this.initialize = function () {
        drawAnnotationCanvas_(areaElement[0]);

        var transcriptView = areaElement.find('.transcript-view');
        transcriptManager = new TranscriptTextArea(transcriptView);
        if (this.editable) {
            this.initTextAreaEditing(transcriptView);
            transcriptView.css('min-height', '100px');
        }
        else {
            transcriptManager.editable = false;
            transcriptManager.textArea.removeAttr('contenteditable').blur();
        }
        transcriptView.css('max-height', '500px');
        transcriptManager.onSelectionChange = function (textArea, selectionRange) {
            if (currentlyRecording)
                return;
            var line = transcriptManager.lineSelection(),
                wordIntervals = _this.getPlaybackInfo().intervals;
            if (wordIntervals && wordIntervals.length > 0) {
                avHandler.beginVisible = wordIntervals[line.start].startTime;
                avHandler.endVisible = (wordIntervals[line.end] || wordIntervals[wordIntervals.length - 1]).endTime;
                avHandler.selectedInterval = transcriptManager.currentWordSelection();
                if (!avHandler.selectedInterval.multipleSelect) {
                    avHandler.selectedInterval.start++;
                    avHandler.selectedInterval.end++;
                }
                avHandler.renderWaveform();
            } else {
                avHandler.clear();
            }
        };

        transcriptManager.onPlay = function (textArea, nodeIdx) {
            if (r2.audioPlayer.isPlaying()) {
                _this.stopAudio();
            } else {
                var intervals = _this.getPlaybackInfo().intervals;
                var time = nodeIdx < intervals.length - 1 ? intervals[Math.max(nodeIdx, 0)].startTime * 1000 : 0;
                _this.playAudio(time);
                window.requestAnimFrame(drawAudiovisual);
            }
        };

        avHandler.clear();
        r2.audioRecorder.Init("../../").catch(
            function(err){
                alert(err.message);
            }
        );

        //Comment out the below statement to go back to traditional one-time transcription
        r2.audioRecorder.liveRecording = true;

        if (this.editable)
            AudioCoordinator.init();
        window.requestAnimFrame(drawAudiovisual);

        areaElement.find('.play_btn').mousedown(function (e) {
            var ae = document.activeElement;
            setTimeout(function() {
                ae.focus();
            }, 1);
        });

        initRecordButton();
        this.disableView();
    };

    this.initializeWithContext = function (ctx) {
        viewContext = ctx;
        this.enableView();
        _this.exitLoadingMode();
    };

    this.refreshConsumerView = function () {
        if (this.editable)
            return;
        var playInfo = this.getPlaybackInfo();
        TranscriptUtils.formatTranscriptionTokens(transcriptManager.textArea, playInfo.intervals, transcriptManager.editable);
        transcriptManager.textArea.find('.annotation-token, .annotation-space').click(function (e) {
            if (r2.audioPlayer.isPlaying()) {
                var nodeIdx = transcriptManager.positionOfNode(e.target);
                var time = nodeIdx < playInfo.intervals.length - 1 ? playInfo.intervals[nodeIdx].startTime * 1000 : 0;
                _this.playAudio(time);
                window.requestAnimFrame(drawAudiovisual);
            }
        });
        drawAnnotationCanvas_(areaElement[0]);
        r2.audioRecorder.parseWAV(playInfo.blob, function (wavInfo) {
            var line = transcriptManager.lineSelection();
            avHandler.setAudioFrames(wavInfo.samples);
            avHandler.wordIntervals = playInfo.intervals;
            avHandler.beginVisible = playInfo.intervals[line.start].startTime;
            avHandler.endVisible = playInfo.intervals[line.end].endTime;
            avHandler.renderWaveform();

            audiovisual.mousedown(waveformMouseDown);
        });
    };

    this.getPlaybackInfo = function () {
        if (this.editable) {
            return { blob: AudioCoordinator.renderedAudioBlob,
                    intervals: AudioCoordinator.renderedWordIntervals };
        } else {
            return { blob: this.staticAudioBlob, intervals: this.staticWordIntervals };
        }
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
        if (this.editable)
            AudioCoordinator.init();
        transcriptManager.textArea.empty();
        drawAnnotationCanvas_(areaElement[0]);
    };

    this.enterLoadingMode = function(loadText) {
        this.mode = AnnotationControllerState.loading;
        var loadLabel = areaElement.find('.loading-label');
        if (loadText)
            loadLabel.text(loadText);
        else
            loadLabel.text('Loading...');
        loadLabel.fadeIn(150);
        this.disableView();
    };

    this.exitLoadingMode = function() {
        this.mode = AnnotationControllerState.normal;
        areaElement.find('.loading-label').fadeOut(150);
        this.enableView();
    };

    this.disableView = function () {
        areaElement.css('pointer-events', 'none');
    };

    this.enableView = function () {
        areaElement.css('pointer-events', 'auto');
    };

    // Recording

    /**
     * Called right after audio rendering finishes (to display the information).
     * @param finalBlob
     * @param wordIntervals
     */
    function renderCompletion (finalBlob, wordIntervals) {
        var transcriptView = transcriptManager.textArea;
        currentlyTranscribedText = transcriptView.text().trim();
        for (var i = 0; i < wordIntervals.length; i++) {
            if (wordIntervals[i].word == "%%HESITATION") {
                console.log("Hesitation. REMOVING");
                wordIntervals[i].word = " ";
            }
        }
        TranscriptUtils.formatTranscriptionTokens(transcriptView, wordIntervals, transcriptManager.editable);
        drawAnnotationCanvas_(areaElement[0]);
        transcriptManager.setCursorWordPosition(Math.min(transcriptInsertLocation + runningWordIntervals.length, wordIntervals.length));
        transcriptInsertLocation = 0;

        currentlyRecording = false;

        r2.audioRecorder.parseWAV(finalBlob, function (wavInfo) {
            var line = transcriptManager.lineSelection();
            avHandler.setAudioFrames(wavInfo.samples);
            avHandler.wordIntervals = wordIntervals;
            avHandler.beginVisible = wordIntervals[line.start].startTime;
            avHandler.endVisible = wordIntervals[line.end].endTime;
            avHandler.renderWaveform();

            areaElement.find('.recording_start_btn').stopLoadingBlink();
            areaElement.find('.play_btn').implicitEnable();
            _this.exitLoadingMode();

            audiovisual.mousedown(waveformMouseDown);
        });
    }

    /**
     * Called right after recording finishes.
     */
    var finishRecording = function() {

        if (!finishedRecordingUrl) {
            console.error("No recording URL. What happened?");
            return;
        }

        var transcriptView = transcriptManager.textArea,
            duration, cb;

        _this.exitLoadingMode();
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
                var delta = AudioCoordinator.mergeSpaceGroups();
                if (transcriptInsertLocation)
                    transcriptInsertLocation -= delta;
                AudioCoordinator.renderAudio(renderCompletion);
            };

            duration = recordingBuffer.length / (2 * r2.audioRecorder.RECORDER_SAMPLE_RATE);
            if (!runningWordIntervals.length) {
                areaElement.find('.recording_start_btn').stopLoadingBlink();
                areaElement.find('.play_btn').implicitEnable();
                _this.exitLoadingMode();
                currentlyRecording = false;
            } else if (document.activeElement == transcriptView[0]) {
                // Insert the current recording into the time interval dictated by transcriptInsertLocation
                if (runningWordIntervals.length && runningWordIntervals[0].startTime > 0)
                    runningWordIntervals.splice(0, 0, TranscriptUtils.spaceWordInterval(0, runningWordIntervals[0].startTime, 0));
                if (duration - runningWordIntervals[runningWordIntervals.length - 1].endTime > 0)
                    runningWordIntervals.push(TranscriptUtils.spaceWordInterval(runningWordIntervals[runningWordIntervals.length - 1].endTime, duration, 0));
                AudioCoordinator.insertAudioResource(finishedRecordingUrl, transcriptInsertLocation, runningWordIntervals, cb);
            } else {
                // Add the current recording at the end of the working annotation
                if (duration - runningWordIntervals[runningWordIntervals.length - 1].endTime > 0)
                    runningWordIntervals.push(TranscriptUtils.spaceWordInterval(runningWordIntervals[runningWordIntervals.length - 1].endTime, duration, 0));
                if (_this.editable) {
                    AudioCoordinator.appendAudioResource(finishedRecordingUrl, runningWordIntervals, cb);
                } else {
                    var xhr = new XMLHttpRequest();
                    xhr.open('GET', finishedRecordingUrl, true);
                    xhr.responseType = 'blob';
                    xhr.onload = function(e) {
                        if (this.status == 200) {
                            _this.staticAudioBlob = this.response;
                            _this.staticWordIntervals = runningWordIntervals.slice(0);
                            _this.refreshConsumerView();
                        }
                    };
                    xhr.send();

                }
                finishedRecordingUrl = null;
            }
        }
    };

    /*
    Called when data is sent from the transcription service containing the text transcription and possibly time
    intervals for each word.
     */
    var transcriptionCallback_ = function (transcription, final, timestamps) {

        var transcriptView = transcriptManager.textArea;
        if (document.activeElement === transcriptView[0]) {
            var offset = TranscriptUtils.insertTemporaryTranscriptionTokens(transcriptView, ' ' + transcription + ' ', transcriptInsertLocation);
            transcriptManager.setCursorWordPosition(Math.max(0, transcriptInsertLocation + offset));
        }
        else {
            TranscriptUtils.insertTemporaryTranscriptionTokens(transcriptView, transcription, transcriptManager.textArea[0].childNodes.length);
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
            if (transcriptFinalized && socketClosed && finishedRecordingUrl) {
                clearTimeout(recordingProcessTimeout);
                finishRecording();
            }
        }

        // Redraw annotation canvas in case it was resized
        drawAnnotationCanvas_(areaElement[0]);

    };

    // Recording methods

    this.startRecording = function(recordButton) {
        if (!recordButton)
            recordButton = areaElement.find('.recording_start_btn');
        var currentModel = localStorage.getItem('currentModel'),
            transcriptView = transcriptManager.textArea,
            selectionRange;

        recordButton.startLoadingBlink();
        areaElement.find('.play_btn').implicitDisable();

        if (testingRawAudio) {
            // Circumvent the default recording behavior for testing purposes
            var audio = "https://dl.dropboxusercontent.com/u/6125532/RSI/quickbrownfox3.wav";
            this.transcriptAudio(viewContext, audio);
        }
        else if (r2.audioRecorder.liveRecording) {
            this.disableView();
            runningWordIntervals = [];
            currentlyTranscribedText = transcriptView.text();
            finishedRecordingUrl = null;
            recordingBuffer = null;

            // If necessary, insert the new recording at the current word selection
            if (document.activeElement == transcriptView.get(0)) {
                selectionRange = transcriptManager.currentWordSelection();
                if (selectionRange.start == selectionRange.end) {
                    transcriptManager.dimAll();
                    transcriptInsertLocation = Math.max(0, selectionRange.start);
                    if (transcriptManager.currentWordSelectionIndex() > 0)
                        transcriptInsertLocation++;
                }
            }

            // Initialize the microphone
            handleMicrophone(viewContext.token, currentModel, r2.audioRecorder, function(err, socket) {
                // Opened callback

                socketClosed = false;
                _this.enableView();
                if (err) {
                    var msg = 'Error: ' + err.message;
                    console.log(msg);
                    alert(msg);
                    currentlyRecording = false;
                } else {
                    recordButton.html('<i class="fa fa-stop"></i>');
                    console.log('starting mic');
                    r2.audioRecorder.BgnRecording();
                    currentlyRecording = true;
                }

            }, transcriptionCallback_, function() {
                // Socket close callback

                socketClosed = true;
                if (socketClosed && finishedRecordingUrl) {
                    if (transcriptFinalized)
                        finishRecording();
                    else {
                        recordingProcessTimeout = setTimeout(function () {
                            alert("We didn't quite catch that. Please try again!");
                            AudioCoordinator.renderAudio(renderCompletion);
                            areaElement.find('.recording_start_btn').stopLoadingBlink();
                            areaElement.find('.play_btn').implicitEnable();
                            _this.exitLoadingMode();
                            currentlyRecording = false;
                        }, 3000);
                    }
                }

            });
        } else {
            recordButton.html('<i class="fa fa-stop"></i>');
            console.log('starting mic');
            r2.audioRecorder.BgnRecording();
            currentlyRecording = true;
        }
    };

    this.stopRecording = function (recordButton) {
        /* Stop the recording, but don't necessarily finish the recording process (may still be processing
         data from Bluemix) */
        recordButton.html('<i class="fa fa-microphone"></i>');
        this.enterLoadingMode('Processing...');
        $.publish('hardsocketstop');
        r2.audioRecorder.EndRecording().then(
            function(result){
                finishedRecordingUrl = result.url;
                recordingBuffer = result.buffer.subarray(44);

                //For regular, non-streamed transcriptions:
                if (r2.audioRecorder.liveRecording == false) {
                    _this.transcriptAudio(viewContext, finishedRecordingUrl);
                } else {
                    if (socketClosed && finishedRecordingUrl) {
                        if (transcriptFinalized)
                            finishRecording();
                        else {
                            recordingProcessTimeout = setTimeout(function () {
                                alert("We didn't quite catch that. Please try again!");
                                AudioCoordinator.renderAudio(renderCompletion);
                                areaElement.find('.recording_start_btn').stopLoadingBlink();
                                areaElement.find('.play_btn').implicitEnable();
                                _this.exitLoadingMode();
                                currentlyRecording = false;
                            }, 3000);
                        }
                    }
                }
            }
        );
    };

    /**
     * Initializes the record button, and also configures the behaviors of the microphone and the transcript
     * text box.
     */
    var initRecordButton = function() {
        var recordButton = areaElement.find('.recording_start_btn');

        // Prevent the record button from stealing focus
        recordButton.mousedown(function (e) {
            var ae = document.activeElement;
            setTimeout(function() {
                ae.focus();
            }, 1);
        });

        recordButton.click(function(evt) {
            // Prevent default anchor behavior
            evt.preventDefault();

            if (r2.audioPlayer.isPlaying())
                return;
            if (!viewContext)
                return;

            if (!currentlyRecording) {
                _this.startRecording(recordButton);
            } else {
                _this.stopRecording(recordButton);
            }
        });
    };

    /**
     * This is a method for sending full WAV audio files to Bluemix to transcribe. Change the hardcoded URL in misc_utils.js
     * to the correct server, and make sure to add Access-Control-Allow-Origin headers to the result in that server.
     * Also, the URL you provide needs to be accessible from another origin, so it cannot be a blob.
     * @param ctx - The session context containing the authentication token
     * @param audio - a URL pointing to an audio file
     */
    this.transcriptAudio = function (ctx, audio) {
        var transcriptView = transcriptManager.textArea,
            xhr = new XMLHttpRequest();
        runningWordIntervals = [];

        xhr.open('GET', audio, true);
        xhr.responseType = 'blob';
        xhr.onload = function(e) {
            if (this.status == 200) {
                var blob = this.response;
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
                            finishedRecordingUrl = (window.URL || window.webkitURL).createObjectURL(blob);
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
                _this.onFinished(blob, transcriptManager.textArea.text().replace(/ +/g, ' ').trim(), AudioCoordinator.renderedWordIntervals);
                _this.clear();
            });
        } else {
            _this.onFinished(null, '', []);
            _this.clear();
        }
    };

    this.playButtonPressed = function (event) {
        if (r2.audioPlayer.isPlaying()) {
            playbackJustStarted = false;
            this.stopAudio();
        } else {
            var intervals = _this.getPlaybackInfo().intervals;
            if (intervals && intervals.length) {
                areaElement.find('.play_btn').startLoadingBlink();
                this.disableView();
            }
            else
                return;
            var startPoint = 0;
            if (transcriptManager.currentWordSelection().start >= 0) {
                console.log("Playing:", transcriptManager.currentWordSelection());
                startPoint = transcriptManager.currentWordSelection().start;
                if (startPoint >= transcriptManager.textArea[0].childNodes.length - 1)
                    startPoint = 0;
            }
            var cb = function () {
                avHandler.wordIntervals = intervals;
                if (startPoint > 0) {
                    _this.playAudio(avHandler.wordIntervals[startPoint].startTime * 1000);
                } else {
                    _this.playAudio(0);
                }
            };
            if (this.editable) {
                AudioCoordinator.renderAudio(cb);
            } else {
                cb();
            }
        }
    };

    this.playAudio = function (startTime) {
        var playInfo = this.getPlaybackInfo();
        r2.audioPlayer.play(Math.random() * 10, (window.URL || window.webkitURL).createObjectURL(playInfo.blob),
            startTime, undefined, function () {
                areaElement.find('.play_btn').stopLoadingBlink();
                _this.enableView();
                currentPlaybackController = _this;
            });
        var startIdx;
        for (startIdx = 0; startIdx < playInfo.intervals.length; startIdx++) {
            if (playInfo.intervals[startIdx].endTime > startTime / 1000)
                break;
        }
        playbackTimestampIndex = startIdx;
        playbackJustStarted = true;
        window.requestAnimFrame(drawAudiovisual);

        areaElement.find('.play_btn').html('<i class="fa fa-stop"></i>');
        areaElement.find('.recording_start_btn').implicitDisable();
    };

    this.stopAudio = function () {
        if (playbackJustStarted)
            return;
        if (playbackTimestampIndex != -1) {
            avHandler.renderWaveform();
            r2.audioPlayer.stop();
            playbackTimestampIndex = -1;
            transcriptManager.unhighlightAll();
            areaElement.find('.play_btn').html('<i class="fa fa-play"></i>');
            areaElement.find('.recording_start_btn').implicitEnable();
        }
    };

    var waveformMouseDown = function (event){
        var cb = function () {
            avHandler.wordIntervals = _this.getPlaybackInfo().intervals;
            var start = avHandler.beginVisible,
                end = avHandler.endVisible;
            var time = 1000 * (start + (end - start) * event.offsetX/audiovisual.width());
            _this.playAudio(time);
            window.requestAnimFrame(drawAudiovisual);
        };
        if (_this.editable)
            AudioCoordinator.renderAudio(cb);
        else
            cb();
    };

    this.updateAudioPlayback = function () {
        if (r2.audioPlayer.isPlaying()) {
            var intervals = this.getPlaybackInfo().intervals;
            var ts = intervals[playbackTimestampIndex],
                line;
            if (ts && r2.audioPlayer.getPlaybackTime() / 1000 >= ts.endTime) {
                playbackTimestampIndex++;
                playbackJustStarted = false;
                if (playbackTimestampIndex >= intervals.length)
                    transcriptManager.unhighlightAll();
                else
                    transcriptManager.highlightWord(playbackTimestampIndex);
            } else {
                transcriptManager.highlightWord(playbackTimestampIndex);
            }
            line = transcriptManager.lineSelection(playbackTimestampIndex);
            avHandler.beginVisible = intervals[line.start].startTime;
            avHandler.endVisible = intervals[line.end].endTime;
            avHandler.renderWaveform(r2.audioPlayer.getPlaybackTime() / r2.audioPlayer.getDuration());
        } else if (!playbackJustStarted) {
            this.stopAudio();
        }
    };

    this.initialize();
};

function drawAudiovisual () {
    window.requestAnimFrame(drawAudiovisual);
    if (currentPlaybackController)
        currentPlaybackController.updateAudioPlayback();
}