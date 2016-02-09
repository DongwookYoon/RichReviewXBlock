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
            triggered = true;
            anchor_piece = _anchor_piece;
            ui_type = _ui_type;
        };

        pub.isReady = function(){
            return triggered;
        };

        pub.bgn = function(){
            triggered = false;
            r2.recordingBgn(anchor_piece);
        };

        return pub;
    }());

    r2.recordingBgn = function(anchor_piece){
        r2.audioRecorder.BgnRecording();

        r2App.cur_recording_anchor_piece = anchor_piece;
        var anchorpiece = anchor_piece;

        r2App.cur_recording_annot = new r2.Annot();
        var annotid = new Date(r2App.cur_time).toISOString();
        r2App.cur_recording_annot.SetAnnot(
            annotid, anchorpiece.GetId(), r2App.cur_time, r2App.cur_time, [], r2.userGroup.cur_user.name, ""
        );
        r2App.annots[annotid] = r2App.cur_recording_annot;

        var pieceaudio = new r2.PieceAudio();
        pieceaudio.SetPiece(
            r2.pieceHashId.voice(annotid, 0), // this piece is the first waveform line
            r2App.cur_recording_annot.GetBgnTime(),
            anchorpiece.GetNewPieceSize(),
            anchorpiece.GetTTData()
        );
        pieceaudio.SetPieceAudio(annotid, r2.userGroup.cur_user.name, 0, 0);

        r2App.cur_recording_pieceaudios = [];
        r2App.cur_recording_pieceaudios.push(pieceaudio);
        anchorpiece.AddChildrenAtFront(r2App.cur_recording_pieceaudios);

        r2App.mode = r2App.AppModeEnum.RECORDING;

        r2.dom.recordingBgn();

        /* dom */
        r2.dom_model.createCommentVoice(r2App.cur_recording_annot, r2App.cur_pdf_pagen, true); /* live_recording = true */
        r2.dom_model.appendPieceVoice(annotid, 0, r2App.cur_recording_annot.GetBgnTime(), pieceaudio);

        r2App.invalidate_size = true;
        r2App.invalidate_page_layout = true;
    };

    r2.recordingStop = function(toupload){
        r2.audioRecorder.EndRecording(
            function(url, blob){
                this.SetRecordingAudioFileUrl(url, blob);
                if(toupload)
                    r2Sync.PushToUploadCmd(this.ExportToCmd());
            }.bind(r2App.cur_recording_annot));
        r2.PieceAudio.prototype.NormalizePieceAudio(r2App.cur_recording_pieceaudios, refresh_all = true);
        r2.dom_model.cbRecordingStop(r2App.cur_recording_annot.GetId());

        r2App.cur_recording_annot = null;
        r2App.cur_recording_pieceaudios = null;

        r2App.mode = r2App.AppModeEnum.IDLE;

        r2.dom.recordingEnd();

        r2App.invalidate_static_scene = true;
        r2App.invalidate_dynamic_scene = true;
    };

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
