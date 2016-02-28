/**
 * Created by Dongwook on 2/9/2016.
 */

/** @namespace r2 */
(function(r2){

    r2.recordingCtrl = (function(){
        var pub = {};

        var triggered = false;
        var anchor_piece = null;
        var ui_type = null; // WAVEFORM, SIMPLE_SPEECH, OR NEW_SPEAK

        pub.set = function(_anchor_piece, _ui_type){
            if(r2App.disable_comment_production){
                alert('This page is only for the review. Features for creating comments are disabled.');
                return;
            }
            triggered = true;
            anchor_piece = _anchor_piece;
            ui_type = _ui_type;
        };

        pub.isReady = function(){
            return triggered;
        };

        pub.bgn = function(){
            triggered = false;
            if(ui_type === r2App.RecordingUI.WAVEFORM){
                r2.recordingBgn.waveform(anchor_piece);
            }
            else if(ui_type === r2App.RecordingUI.SIMPLE_SPEECH){
                var done = function(){
                    r2.recordingBgn.simpleSpeech(anchor_piece);
                };
                if(r2App.bluemix_tts_auth_context){
                    console.log('auth_set', r2App.bluemix_tts_auth_context);
                    done();
                }
                else{ // if auth context not set
                    bluemix_stt.getAuthInfo().then(
                        function(authToken) {
                            console.log('auth', authToken);
                            r2App.bluemix_tts_auth_context = {
                                token: authToken,
                                model: 'en-US_BroadbandModel', // audio sampled at >= 16 KHz
                                requestLogging: 'false' // opt-in for data logging that enhances model
                            };
                            return done();
                        }
                    );
                }
            }
        };

        pub.stop = function(){
            if(ui_type === r2App.RecordingUI.WAVEFORM){
                r2.recordingStop.waveform(anchor_piece);
            }
            else if(ui_type === r2App.RecordingUI.SIMPLE_SPEECH){
                r2.recordingStop.simpleSpeech(anchor_piece);
            }
        };

        pub.update = function(){
            if(ui_type === r2App.RecordingUI.WAVEFORM){
                r2.recordingUpdate();
            }
            else if(ui_type === r2App.RecordingUI.SIMPLE_SPEECH){
                ;
            }
        };

        return pub;
    }());

    r2.recordingBgn = (function(){
        var pub = {};
        pub.waveform = function(anchor_piece){
            run(anchor_piece, createPieceAudio);
        };
        pub.simpleSpeech = function(anchor_piece){
            run(anchor_piece, createPieceEditableAudio);
        };

        var run = function(anchor_piece, funcCreatePiece){

            /* create Annot */
            r2App.cur_recording_annot = new r2.Annot();
            var annotid = new Date(r2App.cur_time).toISOString();
            r2App.cur_recording_annot.SetAnnot(
                annotid, anchor_piece.GetId(), r2App.cur_time, r2App.cur_time, [], r2.userGroup.cur_user.name, ""
            );
            r2App.annots[annotid] = r2App.cur_recording_annot;

            /* set context */
            r2App.cur_recording_anchor_piece = anchor_piece;
            r2App.cur_recording_pieceaudios = [];

            /* create piece */
            funcCreatePiece(anchor_piece, annotid);

            /* begin audio recording */
            r2.audioRecorder.BgnRecording();

            /* update system variables */
            r2.dom.enableRecordingIndicators();
            r2App.mode = r2App.AppModeEnum.RECORDING;
            r2App.invalidate_size = true;
            r2App.invalidate_page_layout = true;
        };

        var createPieceAudio = function(anchor_piece, annotid){
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
            anchor_piece.AddChildrenAtFront(r2App.cur_recording_pieceaudios);

            /* update dom with the object */
            r2.dom_model.createCommentVoice(r2App.cur_recording_annot, r2App.cur_pdf_pagen, true); /* live_recording = true */
            r2.dom_model.appendPieceVoice(annotid, 0, r2App.cur_recording_annot.GetBgnTime(), pieceaudio);
        };

        var createPieceEditableAudio = function(anchor_piece, annotid){
            var piece_editable_audio = new r2.PieceEditableAudio();
            piece_editable_audio.SetPiece(
                r2.pieceHashId.voice(annotid, 0), // this piece is the first waveform line
                r2App.cur_recording_annot.GetBgnTime(),
                anchor_piece.GetNewPieceSize(),
                anchor_piece.GetTTData()
            );
            piece_editable_audio.SetPieceEditableAudio(
                anchor_piece.GetId(), annotid, r2.userGroup.cur_user.name,
                '', // inner_html
                true // live_recording
            );
            anchor_piece.AddChildAtFront(piece_editable_audio);

            // set event trigger
            bluemix_stt.messageParser.setCallbacks(
                function(words){
                    piece_editable_audio.setCaptionTemporary(words);
                },
                function(words, conf){
                    piece_editable_audio.setCaptionFinal(words);
                }
            );
            // begin recording
            bluemix_stt.handleMicrophone(
                r2App.bluemix_tts_auth_context,
                r2.audioRecorder,
                function(err, socket) { // opened
                    if (err) {

                    } else {

                    }
                },
                function(msg){ // transcript
                    bluemix_stt.messageParser.run(msg);
                },
                function() { // closed
                    piece_editable_audio.doneCaptioning();
                }
            );
        };

        return pub;
    }());


    r2.recordingStop = (function(){
        var pub = {};
        pub.waveform = function(to_upload){
            run(to_upload, onPieceAudio);
        };
        pub.simpleSpeech = function(to_upload){
            run(to_upload, onPieceEditableAudio);
        };

        var run = function(to_upload, funcOn){
            /* end audio recording */
            r2.audioRecorder.EndRecording(
                function(url, blob){
                    this.SetRecordingAudioFileUrl(url, blob);
                    if(to_upload)
                        r2Sync.PushToUploadCmd(this.ExportToCmd());
                }.bind(r2App.cur_recording_annot)
            );
            r2.PieceAudio.prototype.NormalizePieceAudio(r2App.cur_recording_pieceaudios, refresh_all = true);

            /* update dom */
            r2.dom_model.cbRecordingStop(r2App.cur_recording_annot.GetId());

            /* release context */
            r2App.cur_recording_annot = null;
            r2App.cur_recording_pieceaudios = null;

            /* update system variables */
            r2.dom.disableRecordingIndicators();
            r2App.mode = r2App.AppModeEnum.IDLE;
            r2App.invalidate_size = true;
            r2App.invalidate_page_layout = true;

            funcOn();
        };

        var onPieceAudio = function(){
        };

        var onPieceEditableAudio = function(){
            $.publish('hardsocketstop');
        };

        return pub;
    }());

    r2.recordingUpdate = function(){
        r2.audioRecorder.getDbs(function(dbs){
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
                anchorpiece.AddChildrenAtFront(r2App.cur_recording_pieceaudios);

                r2App.invalidate_size = true;
                r2App.invalidate_page_layout = true;

                /* dom */
                r2.dom_model.appendPieceVoice(annot.GetId(), npiece-1, r2App.cur_recording_annot.GetBgnTime(), pieceaudio);
            }
            r2.PieceAudio.prototype.NormalizePieceAudio(r2App.cur_recording_pieceaudios, refresh_all = false);
        });
    };
}(window.r2 = window.r2 || {}));
