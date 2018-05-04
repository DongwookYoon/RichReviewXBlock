/**
 * Created by dongwookyoon on 6/2/15.
 */

/** @namespace r2 */
(function(r2){

    r2.rich_audio = (function(){
        var pub = {};
        pub.play = function(annot_id, time) {
            if(r2.speechUi.mode === r2App.RecordingUI.NEW_SPEAK){ //fixMe: heuristic
                r2.speechSynth.cancel();
                r2.speechUi.set('waveform');
            }
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
        pub.jump = function(annot_id, time){
            r2.audioPlayer.jump(annot_id, r2App.annots[annot_id].GetAudioFileUrl(), time);
        };
        return pub;
    }());

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
                    delete r2App.annots[annotid];
                }
                else{ /* when a typewritten comment*/

                }
                r2App.invalidate_size = true;
                r2App.invalidate_page_layout = true;
                r2.scoreIndicator.show();
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
            r2.log.Log_AudioPlay('indexing_panel', r2App.cur_annot_id, r2.audioPlayer.getPlaybackTime());
        }
    };

    r2.clickStop = function(){
        if(r2App.mode == r2App.AppModeEnum.REPLAYING && r2App.cur_annot_id != null) {
            r2.log.Log_AudioStop('indexing_panel', r2.audioPlayer.getCurAudioFileId(), r2.audioPlayer.getPlaybackTime());
            r2.rich_audio.stop();
        }
    };

    r2.zoom = (function(){
        var pub = {};

        var scale_presets = [0.5, 0.75, 1.0, 1.25, 1.5];

        pub.in = function(){
            zoomStep(+1);
            r2.log.Log_Nav("r2.zoom.in");
        };

        pub.out = function(){
            zoomStep(-1);
            r2.log.Log_Nav("r2.zoom.out");
        };

        pub.touch = (function(){
            var pub_tc = {};

            var anchor = {
                scale: 1.0,
                scrollPos: new Vec2(0.0,0.0),
                screenPos: new Vec2(0.0,0.0),
                screenPosDist: 1.0
            };

            pub_tc.dn = function(p0, p1){
                anchor.scale = r2.viewCtrl.scale;
                anchor.scrollPos = r2.dom.getScroll();
                anchor.screenPos = p0.add(p1, true).multiply(0.5);
                anchor.screenPosDist = p0.distance(p1);
            };
            pub_tc.mv = function(p0, p1){
                r2.viewCtrl.scale = limitScale(
                    anchor.scale*p0.distance(p1)/anchor.screenPosDist
                );

                var s0 = anchor.scale;
                var x0 = anchor.screenPos;
                var t0 = anchor.scrollPos;

                var s1 = r2.viewCtrl.scale;
                var x1 = p0.add(p1, true).multiply(0.5);
                var t1 = new Vec2(
                    x1.x + (s1/s0)*(-t0.x-x0.x),
                    x1.y + (s1/s0)*(-t0.y-x0.y)
                );

                r2.dom.setScroll(-t1.x, -t1.y);
                r2App.invalidate_size = true;
            };
            pub_tc.up = function(p0, p1){
                pub_tc.mv(p0, p1); // verbose
            };

            function limitScale(scale){
                var mn = scale_presets[0];
                var mx = scale_presets[scale_presets.length-1];
                return Math.max(mn, Math.min(mx, scale));
            }

            return pub_tc;
        }());

        function zoomStep(delta){
            var new_scale = scale_presets[
                Math.max(0, Math.min(scale_presets.length-1,
                    getClosestPresetScaleIdx(r2.viewCtrl.scale)+delta))
                ];
            r2.viewCtrl.scale = new_scale;
            r2App.invalidate_size = true;

            function getClosestPresetScaleIdx(scale){
                var i_min = 0;
                var d_min = Number.POSITIVE_INFINITY;
                for(var i = 0; i < scale_presets.length; ++i){
                    var d = Math.abs(scale - scale_presets[i]);
                    if(d < d_min) {
                        i_min = i;
                        d_min = d;
                    }
                }
                return i_min;
            }
        }

        return pub;
    }());

    r2.clickFirstPage = function(){
        if(r2.booklet.goToFirstPage()){
            r2.log.Log_Simple("first_page");
        }
    };

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

    r2.clickLastPage = function(){
        if(r2.booklet.goToLastPage()){
            r2.log.Log_Simple("last_page");
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
    r2.turnPageAndSetFocus = function(searchresult, annotid){
        var piece = searchresult["piece"];
        r2.booklet.goToAbsPage(searchresult["page_n"]);
        r2.viewCtrl.setToFocus(new Vec2(piece.pos.x+ piece.GetContentSize().x/2, piece.pos.y));
        r2App.pieceSelector.set(searchresult["piece"]);
        return r2.dom_model.focusCtrl.focusAnnot(annotid);
    };

    /** reset canvas size */
    r2.resizeWindow = function(){
        var doc_yx_ratio;
        if(r2.dom_model.getCurPage()){
            var x = r2.dom.getPosAndWidthInPage(r2.dom_model.getCurPage().get(0));
            doc_yx_ratio = x[3]/x[2];
        }
        else{
            doc_yx_ratio = 1;
        }

         //= 1;//r2App.cur_page === null ? 1 : r2App.cur_page.size.y/r2App.cur_page.size.x;
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
    };

    r2.speechUi = (function(){
        var pub = {};

        pub.mode = null;

        var mode_map = {
            'waveform': r2App.RecordingUI.WAVEFORM,
            'simplespeech': r2App.RecordingUI.SIMPLE_SPEECH,
            'newspeak': r2App.RecordingUI.NEW_SPEAK
        };

        pub.init = function(){
            var cookie_setting = r2.util.getCookie('r2_speech_ui');
            if( cookie_setting === 'waveform' ||
                cookie_setting === 'newspeak' ||
                cookie_setting === 'simplespeech'){
                pub.set(cookie_setting);
            }
            else{
                pub.set('newspeak');
            }

            if(r2.ctx.lti){ // edX/cornellX
                pub.set('newspeak');
            }
        };

        pub.set = function(type_str){
            reset();
            pub.mode = mode_map[type_str];
            $('#btn-group-speech-ui-select').find('.'+type_str).toggleClass('btn-primary', true);
            r2.util.setCookie('r2_speech_ui', type_str, 7);
        };

        function reset(){
            var uis = ['.waveform', '.newspeak', '.simplespeech'];
            for(var i = 0; i < uis.length; ++i){
                var ui = uis[i];
                $('#btn-group-speech-ui-select').find(ui).toggleClass('btn-default', true);
                $('#btn-group-speech-ui-select').find(ui).toggleClass('btn-primary', false);
            }
        }

        return pub;
    }());

}(window.r2 = window.r2 || {}));

