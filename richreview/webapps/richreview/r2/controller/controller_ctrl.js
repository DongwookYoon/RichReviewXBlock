/**
 * Created by dongwookyoon on 6/2/15.
 */

/** @namespace r2 */
(function(r2){

    r2.rich_audio = (function(){
        var pub = {};
        pub.play = function(annot_id, time) {
            r2.audioPlayer.play(
                annot_id, r2App.annots[annot_id].GetAudioFileUrl(), time,
                function(){
                },
                function(){
                }
            );
        };
        pub.stop = function(){
            r2.audioPlayer.stop();
        };
        return pub;
    }());

    r2.recordingBgn = function(target_piece){
        r2.audioRecorder.BgnRecording();

        r2App.cur_recording_anchor_piece = target_piece;
        var anchorpiece = target_piece;

        r2App.cur_recording_annot = new r2.Annot();
        var annotid = new Date(r2App.cur_time).toISOString();
        r2App.cur_recording_annot.SetAnnot(
            annotid, anchorpiece.GetId(), r2App.cur_time, r2App.cur_time, [], r2.userGroup.cur_user.name, ""
        );
        r2App.annots[annotid] = r2App.cur_recording_annot;

        var pieceaudio = new r2.PieceAudio();
        pieceaudio.SetPiece(
            r2.nameHash.getPieceVoice(annotid, 0),
            r2App.cur_recording_annot.GetBgnTime(),
            anchorpiece.GetNewPieceSize(),
            anchorpiece.GetTTData()
        );
        pieceaudio.SetPieceAudio(annotid, r2.userGroup.cur_user.name, 0, 0);

        r2App.cur_recording_pieceaudios = [];
        r2App.cur_recording_pieceaudios.push(pieceaudio);
        anchorpiece.AddChildrenAtFront(r2App.cur_recording_pieceaudios);

        r2App.mode = r2App.AppModeEnum.RECORDING;
        $('#recording_indicator').css("display","block");
        r2.dom.recordingBgn();


        /* dom */
        r2.dom_model.createCommentVoice(r2App.cur_pdf_pagen, anchorpiece.GetId(), annotid, r2.userGroup.cur_user, true); /* live_recording = true */
        r2.dom_model.appendPieceVoice(annotid, r2App.cur_recording_annot.GetBgnTime());


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

        r2App.cur_recording_annot = null;
        r2App.cur_recording_pieceaudios = null;

        r2App.mode = r2App.AppModeEnum.IDLE;
        $('#recording_indicator').css("display","none");
        r2.dom.recordingEnd();

        r2App.invalidate_static_scene = true;
        r2App.invalidate_dynamic_scene = true;
        r2App.invalidate_dom = true;
    };

    r2.recordingUpdate = function(){
        r2.audioRecorder.GetBuffer(function(buffer){
            r2App.cur_recording_annot.UpdateDbs(buffer[0]);
            r2.util.lastOf(r2App.cur_recording_pieceaudios).UpdateAudioDbsRecording(r2App.cur_time-r2App.cur_recording_annot.GetBgnTime());

            var timePerPiece = r2Const.PIECEAUDIO_TIME_PER_WIDTH*r2.util.lastOf(r2App.cur_recording_pieceaudios).GetTtIndentedWidth();
            var idx = Math.ceil(r2App.cur_recording_annot.GetDuration()/timePerPiece);
            if(r2App.cur_recording_pieceaudios.length < idx){
                var anchorpiece = r2App.cur_recording_anchor_piece;

                var pieceaudio = new r2.PieceAudio();
                var annot = r2App.cur_recording_annot;
                pieceaudio.SetPiece(
                    r2.nameHash.getPieceVoice(r2App.cur_recording_annot.GetId(), idx-1),
                    r2App.cur_recording_annot.GetBgnTime(),
                    anchorpiece.GetNewPieceSize(),
                    anchorpiece.GetTTData()
                );
                pieceaudio.SetPieceAudio(
                    annot.GetId(),
                    r2.userGroup.cur_user.name,
                    (idx-1)*timePerPiece,
                    r2App.cur_time-annot.GetBgnTime());


                r2App.cur_recording_pieceaudios.push(pieceaudio);
                anchorpiece.AddChildrenAtFront(r2App.cur_recording_pieceaudios);

                r2App.invalidate_page_layout = true;

                /* dom */
                r2.dom_model.appendPieceVoice(annot.GetId(), r2App.cur_recording_annot.GetBgnTime());
            }
            r2.PieceAudio.prototype.NormalizePieceAudio(r2App.cur_recording_pieceaudios, refresh_all = false);
        });
    };


    r2.removeAnnot = function(annotid, askuser, mute){
        var rtn = [];
        r2App.doc.RunRecursive("IsAnnotHasComment", [annotid, rtn]);
        if(rtn.reduce(function(accum_or, item){return accum_or || item;}, false)){
            if(!mute)
                alert('The comment cannot be deleted since there is a subsequent comment underneath it.');
        }
        else{
            if (askuser == false || confirm('Do you really want to delete this comment?')) {
                r2.dom_model.remove(annotid);
                r2App.doc.RunRecursive("RemoveAnnot", [annotid]);
                if(r2App.annots[annotid]){ /* when a voice comment */
                    var annot = r2App.annots[annotid];
                    console.log('>>>>delete:', annotid, r2App.annots[annotid]);
                    delete r2App.annots[annotid];
                }
                else{ /* when a typewritten comment*/

                }
                r2App.invalidate_page_layout = true;
                return true;
            }
        }
        return false;
    };


    /** Button clicks */
    r2.clickHowTo = function(){
        r2.log.Log_Simple('click_cheatsheet');
        r2.cheatSheet.BtnClick();
    };

    r2.clickPlay = function(){
        if(r2App.mode == r2App.AppModeEnum.IDLE && r2App.cur_annot_id != null){
            r2.rich_audio.play(r2App.cur_annot_id, -1);
            r2.log.Log_AudioPlay('r2.clickPlay', r2App.cur_annot_id, r2.audioPlayer.getPlaybackTime());
        }
    };

    r2.clickStop = function(){
        if(r2App.mode == r2App.AppModeEnum.REPLAYING && r2App.cur_annot_id != null) {
            r2.log.Log_AudioStop('r2.clickStop', r2.audioPlayer.getCurAudioFileId(), r2.audioPlayer.getPlaybackTime());
            r2.rich_audio.stop();
        }
    };

    r2.zoom = (function(){
        var pub = {};

        var scale_presets = [0.5, 0.75, 1.0, 1.25, 1.5];

        var zoom = function(delta){
            var i_match = 0;
            for(var i = 0; i < scale_presets.length; ++i){
                if(r2.viewCtrl.scale == scale_presets[i]){
                    i_match = i;
                    break;
                }
            }
            var new_scale = scale_presets[Math.max(0, Math.min(scale_presets.length-1, i_match+delta))];

            var scale_change_ratio = r2.viewCtrl.scale/new_scale;
            r2.viewCtrl.scale = new_scale;

            r2App.invalidate_size = true;
            r2App.invalidate_dom = true;

            /*
            var cur_pt = new Vec2(0.5, 0.5*r2.viewCtrl.app_container_size.y/r2.viewCtrl.app_container_size.x);
            cur_pt.subtract(r2.viewCtrl.pos);
            cur_pt.multiply(1.0-scale_change_ratio);
            cur_pt.add(r2.viewCtrl.pos);
            r2.viewCtrl.pos = cur_pt;

            r2.viewCtrl.pos.x = Math.round(r2.viewCtrl.pos.x*r2.viewCtrl.app_container_size.x)/r2.viewCtrl.app_container_size.x; // make it integer for sharper image
            r2.viewCtrl.pos.y = Math.round(r2.viewCtrl.pos.y*r2.viewCtrl.app_container_size.x)/r2.viewCtrl.app_container_size.x;*/
        };

        pub.in = function(){
            zoom(+1);
            r2.log.Log_Nav("r2.zoom.in");
        };

        pub.out = function(){
            zoom(-1);
            r2.log.Log_Nav("r2.zoom.out");
        };

        return pub;
    }());

    r2.clickPrevPage = function(){
        if(r2.booklet.goToPrevPage()){
            r2.log.Log_Simple("prev_page");
        }
    };

    r2.clickNextPage = function(){
        if(r2.booklet.goToNextPage()){
            r2.log.Log_Simple("next_page");
        }
    };

    /** relayouting buttons */
    r2.clickExpandAll = function (){
        cur_page.SetVisibility(true);
    };

    r2.clickCollapseAll = function(){
        cur_page.SetVisibility(false);
    };

    /** controller functions */
    r2.turnPageAndSetFocus = function(searchresult){
        var piece = searchresult["piece"];
        r2.booklet.goToAbsPage(searchresult["page_n"]);
        r2.viewCtrl.setToFocus(new Vec2(piece.pos.x+ piece.GetContentSize().x/2, piece.pos.y));
        r2App.pieceSelector.set(searchresult["piece"]);
    };

    /** reset canvas size */
    r2.resizeWindow = function(){
        var doc_yx_ratio = r2App.cur_page === null ? 1 : r2App.cur_page.size.y/r2App.cur_page.size.x;
        var app_container_size = r2.dom.calcAppContainerSize();

        var scale = r2.viewCtrl.scale;

        r2.viewCtrl.resizeView(app_container_size, doc_yx_ratio, {left:0.0, rght:0.0});
        r2.dom_model.resize(r2.viewCtrl.page_size_scaled.x);

        r2.dom.resizeDom(scale, app_container_size, r2.viewCtrl.page_size_scaled, r2.viewCtrl.page_margins, r2.viewCtrl.canv_px_size);

        if(r2App.cur_page){
            r2App.cur_page.RunRecursive("ResizeDom", []);
        }
        r2App.invalidate_static_scene = true;
        r2App.invalidate_dynamic_scene = true;



        r2.log.Log_RefreshCanvasSize();
    };

}(window.r2 = window.r2 || {}));

