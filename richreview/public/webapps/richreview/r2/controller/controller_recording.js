/**
 * Created by Dongwook on 2/9/2016.
 */

/** @namespace r2 */
(function(r2){

    r2.recordingCtrl = (function(){
        var pub = {};

        var triggered = false;
        var anchor_piece = null;
        var options = {}; // has ui_type WAVEFORM, SIMPLE_SPEECH, OR NEW_SPEAK

        pub.set = function(_anchor_piece, _options){
            if(r2App.is_recording_or_transcribing){
                alert('Recording and transcribing is currently in progress.');
                return;
            }
            if(r2App.disable_comment_production){
                alert('This page is only for the review. Features for creating comments are disabled.');
                return;
            }
            triggered = true;
            anchor_piece = _anchor_piece;
            options = _options;
            r2.log.Log_Simple('Recording_Bgn_' + _options.log_type + '_' + JSON.stringify(_options.ui_type));
        };

        pub.isReady = function(){
            return triggered;
        };

        pub.bgn = function(){
            triggered = false;
            if(options.ui_type === r2App.RecordingUI.WAVEFORM){
                r2.recordingBgn.waveform(anchor_piece, options);
            }
            else{
                var done = function(){
                    r2.recordingBgn.transcription(anchor_piece, options);
                };
                if(r2App.bluemix_tts_auth_context){
                    done();
                }
                else{ // if auth context not set
                    bluemix_stt.getAuthInfo().catch(
                        function(e){
                            throw 'Invalid BlueMix authentication error: need login';
                        }
                    ).then(
                        function(authToken) {
                            if(authToken){ // auth successful
                                console.log('Got Bluemix token', authToken);
                                r2App.bluemix_tts_auth_context = {
                                    token: authToken,
                                    model: 'en-US_BroadbandModel', // audio sampled at >= 16 KHz
                                    requestLogging: 'false' // opt-in for data logging that enhances model
                                };
                                return done();
                            }
                            else{ // auth failed
                                console.log('Getting Bluemix auth failed:', authToken);
                                throw 'Invalid BlueMix authentication error: invalid user';
                            }
                        }
                    );
                }
            }
        };

        pub.stop = function(to_upload){
            if(options.ui_type === r2App.RecordingUI.WAVEFORM){
                r2.recordingStop.waveform(to_upload);
            }
            else{
                r2.recordingStop.transcription(to_upload);
            }
        };

        pub.update = function(){
            if(options.ui_type === r2App.RecordingUI.WAVEFORM){
                r2.recordingUpdate();
            }
        };

        return pub;
    }());

    r2.recordingBgn = (function(){
        var pub = {};
        pub.waveform = function(anchor_piece, options){
            run(anchor_piece, createPieceAudio, options);
        };
        pub.transcription = function(anchor_piece, options){
            run(anchor_piece, createPieceTranscription, options);
        };

        var run = function(anchor_piece, funcCreatePiece, options){
            /* create Annot */
            var annotid = new Date(r2App.cur_time).toISOString();
            var args_new_annot = [annotid, anchor_piece.GetId(), r2App.cur_time, 0, [], r2.userGroup.cur_user.name, "",
                options.ui_type === r2App.RecordingUI.NEW_SPEAK ? 'new_speak' : null];

            r2App.cur_recording_annot = new r2.Annot();
            r2.Annot.prototype.SetAnnot.apply(r2App.cur_recording_annot, args_new_annot);
            r2App.annots[annotid] = r2App.cur_recording_annot;

            /* set context */
            r2App.cur_recording_anchor_piece = anchor_piece;
            r2App.cur_recording_pieceaudios = [];
            r2App.cur_recording_piece = null;
            r2App.cur_recording_asyn_delta_t = r2App.cur_time;

            /* create piece */
            funcCreatePiece(anchor_piece, annotid, options).then(
                function(){
                    /* begin audio recording */
                    r2.audioRecorder.BgnRecording();

                    /* update system variables */
                    r2App.cur_recording_asyn_delta_t = r2App.cur_time-r2App.cur_recording_asyn_delta_t;
                    if(r2App.cur_recording_piece.bgnCommentingAsync)
                        r2App.cur_recording_piece.bgnCommentingAsync();
                    if(options.piece_to_insert){
                        r2.dom_model.cbRecordingBgn(options.piece_to_insert.GetAnnotId(), 'fa-stop');
                    }
                    else {
                        r2.dom_model.cbRecordingBgn(r2App.cur_recording_piece.GetAnnotId(), 'fa-stop');
                    }
                    r2.dom.enableRecordingIndicators();
                    r2App.mode = r2App.AppModeEnum.RECORDING;
                }
            ).catch(
                function(err){
                    throw err;
                }
            );

            r2App.invalidate_size = true;
            r2App.invalidate_page_layout = true;
        };

        var createPieceAudio = function(anchor_piece, annotid){
            return new Promise(function(resolve, reject){
                /* create piece object */
                var pieceaudio = new r2.PieceAudio();
                pieceaudio.SetPiece(
                    r2.pieceHashId.voice(annotid, 0), // this piece is the first waveform line
                    r2App.cur_recording_annot.GetBgnTime(),
                    anchor_piece.GetNewPieceSize(),
                    anchor_piece.GetTTData()
                );
                pieceaudio.SetPieceAudio(annotid, r2.userGroup.cur_user.name, 0, 0);
                r2App.cur_recording_pieceaudios.push(pieceaudio);
                r2App.cur_recording_piece = pieceaudio;
                anchor_piece.AddChildrenAtFront(r2App.cur_recording_pieceaudios);

                /* update dom with the object */
                r2.dom_model.createCommentVoice(r2App.cur_recording_annot, r2App.cur_pdf_pagen, true); /* live_recording = true */
                /* live_recording = true */
                r2.dom_model.appendPieceVoice(annotid, 0, r2App.cur_recording_annot.GetBgnTime(), pieceaudio);
                resolve();
            });
        };

        var createPieceTranscription = function(anchor_piece, recording_annot_id, options){
            return new Promise(function(resolve, reject){

                var NewPieceType = null;
                var setPieceFunc = '';
                if(options.ui_type === r2App.RecordingUI.NEW_SPEAK){
                    NewPieceType = r2.PieceNewSpeak;
                    setPieceFunc = r2.PieceNewSpeak.prototype.SetPieceNewSpeak;
                }
                else if(options.ui_type === r2App.RecordingUI.SIMPLE_SPEECH){
                    NewPieceType = r2.PieceSimpleSpeech;
                    setPieceFunc = r2.PieceSimpleSpeech.prototype.SetPieceSimpleSpeech;
                }

                var piece_simple_speech = null;
                if(options.piece_to_insert){
                    piece_simple_speech = options.piece_to_insert;
                }
                else{
                    var time_simple_speech = r2App.cur_time+128;
                    var piece_annot_id = new Date(time_simple_speech).toISOString();
                    var piece_annot = new r2.Annot();
                    var args_new_annot = [piece_annot_id, anchor_piece.GetId(), time_simple_speech, time_simple_speech, [], r2.userGroup.cur_user.name, "",
                        options.ui_type === r2App.RecordingUI.NEW_SPEAK ? 'new_speak' : null];

                    r2.Annot.prototype.SetAnnot.apply(piece_annot, args_new_annot);
                    r2App.annots[piece_annot_id] = piece_annot;

                    piece_simple_speech = new NewPieceType();

                    var args_set_piece = [
                        r2.pieceHashId.voice(piece_annot_id, 0),
                        piece_annot.GetBgnTime(),
                        anchor_piece.GetNewPieceSize(),
                        anchor_piece.GetTTData()
                    ];
                    piece_simple_speech.SetPiece.apply(
                        piece_simple_speech, args_set_piece
                    );

                    var args_set_piece_func = [
                        anchor_piece.GetId(),
                        piece_annot_id,
                        r2.userGroup.cur_user.name,
                        '',
                        true // live_recording
                    ];
                    setPieceFunc.apply(
                        piece_simple_speech, args_set_piece_func
                    );
                    anchor_piece.AddChildAtFront(piece_simple_speech);
                }

                r2App.cur_recording_piece = piece_simple_speech;
                piece_simple_speech.bgnCommenting(recording_annot_id);

                // set event trigger
                bluemix_stt.messageParser.setCallbacks(
                    function(words){
                        piece_simple_speech.setCaptionTemporary(words);
                    },
                    function(words, conf){
                        piece_simple_speech.setCaptionFinal(words);
                    }
                );
                // begin recording
                bluemix_stt.handleMicrophone(
                    r2App.bluemix_tts_auth_context,
                    r2.audioRecorder,
                    function(err, socket) { // opened
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    },
                    function(msg){ // transcript
                        bluemix_stt.messageParser.run(msg);
                    },
                    function() { // closed
                        piece_simple_speech.doneCaptioning();
                    }
                );
            });
        };

        return pub;
    }());


    r2.recordingStop = (function(){
        var pub = {};
        pub.waveform = function(to_upload){
            run(to_upload, onPieceAudio);
        };
        pub.transcription = function(to_upload){
            run(to_upload, onPieceTranscription);
        };

        var run = function(to_upload, funcOn){
            // stop recording mode
            r2App.mode = r2App.AppModeEnum.IDLE;

            /* end audio recording */
            r2.audioRecorder.EndRecording().then(
                function(result){
                    r2.PieceAudio.prototype.NormalizePieceAudio(r2App.cur_recording_pieceaudios, refresh_all = true);

                    /* annot */
                    r2App.cur_recording_annot.SetRecordingAudioFileUrl(result.url, result.blob, result.buffer);

                    /* upload */
                    if(r2App.cur_recording_annot._ui_type === 'new_speak'){
                        if(to_upload) {
                            r2App.cur_recording_piece.setUploadAsync(true);
                        }
                        else{
                            r2App.cur_recording_piece.setUploadAsync(false);
                        }
                    }
                    else{
                        if(to_upload) {
                            r2Sync.uploader.pushCmd(r2App.cur_recording_annot.ExportToCmd());
                        }
                    }

                    /* update dom */
                    r2.dom.disableRecordingIndicators();

                    r2.dom_model.cbRecordingStop(r2App.cur_recording_piece.GetAnnotId());

                    if(r2App.cur_recording_piece.onEndRecording)
                        r2App.cur_recording_piece.onEndRecording(result.url);

                    /* release context */
                    r2App.cur_recording_annot = null;
                    r2App.cur_recording_pieceaudios = null;
                    r2App.cur_recording_piece = null;

                    r2App.invalidate_size = true;
                    r2App.invalidate_page_layout = true;
                    r2App.invalidate_dynamic_scene = true;
                    r2App.invalidate_static_scene = true;

                    funcOn();
                }
            );
        };

        var onPieceAudio = function(){
        };

        var onPieceTranscription = function(){
            $.publish('hardsocketstop');
        };

        return pub;
    }());

    r2.recordingUpdate = function(){
        var l = r2.audioRecorder.getRecorder().getPower();
        var dbs = l[l.length-1];
        //console.log(dbs, l.length);
        {
            r2App.cur_recording_annot.UpdateDbs(dbs);
            r2.util.lastOf(r2App.cur_recording_pieceaudios).UpdateAudioDbsRecording(r2App.cur_time-r2App.cur_recording_annot.GetBgnTime());

            var timePerPiece = r2Const.PIECEAUDIO_TIME_PER_WIDTH*r2.util.lastOf(r2App.cur_recording_pieceaudios).GetTtIndentedWidth();
            var npiece = Math.ceil(r2App.cur_recording_annot.GetDuration()/timePerPiece);
            if(r2App.cur_recording_pieceaudios.length < npiece){
                var anchorpiece = r2App.cur_recording_anchor_piece;

                var pieceaudio = new r2.PieceAudio();
                var annot = r2App.cur_recording_annot;
                pieceaudio.SetPiece(
                    r2.pieceHashId.voice(r2App.cur_recording_annot.GetId(), npiece-1),
                    r2App.cur_recording_annot.GetBgnTime(),
                    anchorpiece.GetNewPieceSize(),
                    anchorpiece.GetTTData()
                );
                pieceaudio.SetPieceAudio(
                    annot.GetId(),
                    r2.userGroup.cur_user.name,
                    (npiece-1)*timePerPiece,
                    r2App.cur_time-annot.GetBgnTime());

                r2App.cur_recording_pieceaudios.push(pieceaudio);
                r2App.cur_recording_piece = pieceaudio;
                anchorpiece.AddChildrenAtFront(r2App.cur_recording_pieceaudios);

                r2App.invalidate_size = true;
                r2App.invalidate_page_layout = true;
                r2App.invalidate_dynamic_scene = true;
                r2App.invalidate_static_scene = true;

                /* dom */
                r2.dom_model.appendPieceVoice(annot.GetId(), npiece-1, r2App.cur_recording_annot.GetBgnTime(), pieceaudio);
            }
            r2.PieceAudio.prototype.NormalizePieceAudio(r2App.cur_recording_pieceaudios, refresh_all = false);
        }
    };
}(window.r2 = window.r2 || {}));
