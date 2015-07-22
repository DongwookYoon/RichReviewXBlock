/**
 * Created by yoon on 12/21/14.
 */

var r2Ctrl = {};

/** @namespace r2 */
(function(r2){

    r2.MouseModeEnum = {
        HOVER : 0,
        RADIALMENU : 1,
        LDN : 2,
        RDN : 3
    };

    r2.mouse = (function(){
        var pub = {};

        pub.mode = r2.MouseModeEnum.HOVER;
        pub.pos_dn = new Vec2(0,0);

        pub.setDomEvents = function(){
            r2.dom.setMouseEventHandlers(
                pub.handleDn,
                pub.handleMv,
                pub.handleUp
            );
        };

        pub.getPos = function(event){
            return r2.viewCtrl.mapBrowserToScr(new Vec2(event.clientX, event.clientY))
        };

        pub.isTap = function(pt){
            var d = pub.pos_dn.subtract(pt, true);
            d = Math.sqrt(d.x * d.x + d.y * d.y) * r2.viewCtrl.page_width_noscale;
            console.log(d);
            return d < r2Const.MOUSE_CLICK_DIST_CRITERIA;
        };

        pub.handleDn = function(event){
            var new_mouse_pt = pub.getPos(event);
            if(pub.mode === r2.MouseModeEnum.HOVER){
                switch (event.which) {
                    case 1: // left click
                        pub.mode = r2.MouseModeEnum.LDN;
                        pub.pos_dn = new_mouse_pt;
                        if(r2App.mode == r2App.AppModeEnum.IDLE || r2App.mode == r2App.AppModeEnum.REPLAYING){
                            if(r2App.ctrlkey_dn)
                                recordingSpotlightDn(r2.viewCtrl.mapScrToDoc(new_mouse_pt), r2App.annot_private_spotlight);
                        }
                        else if(r2App.mode == r2App.AppModeEnum.RECORDING){
                            recordingSpotlightDn(r2.viewCtrl.mapScrToDoc(new_mouse_pt), r2App.cur_recording_annot);
                        }
                        break;
                    case 3: // rght click
                        //pub.mode = r2.MouseModeEnum.RDN;
                        //pub.pos_dn = new_mouse_pt;
                        break;
                    default:
                        break;
                }
            }
            r2App.cur_mouse_pt = new_mouse_pt;
        };

        pub.handleMv = function(event){
            var new_mouse_pt = pub.getPos(event);

            if(pub.mode == r2.MouseModeEnum.HOVER){
            }
            else if(pub.mode == r2.MouseModeEnum.LDN){
                if(r2App.mode == r2App.AppModeEnum.IDLE || r2App.mode == r2App.AppModeEnum.REPLAYING){
                    recordingSpotlightMv(r2.viewCtrl.mapScrToDoc(new_mouse_pt), r2App.annot_private_spotlight);
                }
                else if(r2App.mode == r2App.AppModeEnum.RECORDING){
                    recordingSpotlightMv(r2.viewCtrl.mapScrToDoc(new_mouse_pt), r2App.cur_recording_annot);
                }
            }
            else if(pub.mode == r2.MouseModeEnum.RDN){
                // move viewpoint by diff
                //r2.viewCtrl.pos.add(new_mouse_pt.subtract(r2App.cur_mouse_pt, true));
            }
            else if(pub.mode == r2.MouseModeEnum.RADIALMENU){
                pub.handleRadialMenuMv(event)
            }

            if(pub.mode !== r2.MouseModeEnum.RADIALMENU){
                r2App.cur_mouse_pt = new_mouse_pt;
            }
        };

        pub.handleUp = function(event){
            var new_mouse_pt = pub.getPos(event);

            if(pub.mode == r2.MouseModeEnum.HOVER){
                // do nothing, there's something gone wierd.
            }
            else if(pub.mode == r2.MouseModeEnum.LDN){
                if(r2App.mode == r2App.AppModeEnum.IDLE || r2App.mode == r2App.AppModeEnum.REPLAYING){
                    if (pub.isTap(new_mouse_pt)) {
                        pub.handleTimeIndexingUp(r2.viewCtrl.mapScrToDoc(new_mouse_pt));
                    }
                    if(recordingSpotlightUp(r2.viewCtrl.mapScrToDoc(new_mouse_pt), r2App.annot_private_spotlight)){
                        r2App.annot_private_spotlight.timeLastChanged = (new Date()).getTime();
                        r2App.annot_private_spotlight.changed = true;
                    }
                }
                else if(r2App.mode == r2App.AppModeEnum.RECORDING){
                    recordingSpotlightUp(r2.viewCtrl.mapScrToDoc(new_mouse_pt), r2App.cur_recording_annot);
                }
                pub.mode = r2.MouseModeEnum.HOVER;
            }
            else if(pub.mode == r2.MouseModeEnum.RDN){
                if(r2App.mode == r2App.AppModeEnum.IDLE || r2App.mode == r2App.AppModeEnum.REPLAYING){
                    if (pub.isTap(new_mouse_pt)) {
                        pub.handleTimeIndexingUp(r2.viewCtrl.mapScrToDoc(new_mouse_pt));
                    }
                    else {
                        r2.log.Log_Nav("mouse");
                    }
                }
                pub.mode = r2.MouseModeEnum.HOVER;
            }
            else if(pub.mode == r2.MouseModeEnum.RADIALMENU){
                pub.handleRadialMenuUp(event);
            }

            r2App.cur_mouse_pt = new_mouse_pt;
        };

        pub.handleRadialMenuMv = function(event){
            if (r2App.selected_radialmenu && event.which == 1) {
                var pt = r2.viewCtrl.mapScrToDoc(pub.getPos(event));
                r2App.selected_radialmenu.OnMouseDrag(pt);
                return true;
            }
            else {
                return false;
            }
        };

        pub.handleRadialMenuUp = function(event){
            if (r2App.selected_radialmenu && event.which == 1) {
                var pt = r2.viewCtrl.mapScrToDoc(pub.getPos(event));
                r2App.selected_radialmenu.OnMouseUp_MenuItem(pt);
                return true;
            }
            return false;
        };


        pub.handleTimeIndexingUp = function(pt){
            var l = r2App.cur_page.HitTest(pt);
            if(l.length == 0){return;}

            var obj_front = l[0];
            if(obj_front instanceof r2.PieceAudio){
                var playback = obj_front.GetPlayback(pt);
                if(playback){
                    r2.rich_audio.play(playback.annot, playback.t);
                    r2.log.Log_AudioPlay('indexing_wf', playback.annot, playback.t);
                }
            }
            else if(obj_front instanceof r2.PieceKeyboard){
                obj_front.Focus();
            }
            else{
                var spotlights = [];
                l.forEach(function(item){if(item instanceof r2.Spotlight.Cache){spotlights.push(item);}});
                for(var i = 0; spotlight = spotlights[i]; ++i){
                    var playback = spotlight.GetPlayback(pt);
                    if(playback){
                        r2.rich_audio.play(playback.annot, playback.t);
                        r2.log.Log_AudioPlay('indexing_sp', playback.annot, playback.t);
                        break;
                    }
                }
            }
        };

        return pub;
    }());


    r2.KeyboardModeEnum = {
        FOCUSED : 0,
        NORMAL : 1
    };

    r2.keyboard = (function(){
        var pub = {};

        pub.mode = r2.KeyboardModeEnum.NORMAL;

        pub.handleDn = function(event){
            if(r2App.mode == r2App.AppModeEnum.IDLE && pub.mode == r2.KeyboardModeEnum.NORMAL){
                switch(event.which){
                    case 17: // left ctrl
                    case 25: // rght ctrl
                        r2App.ctrlkey_dn = true;
                        break;
                    case 37:
                        r2.clickPrevPage();
                        break;
                    case 39:
                        r2.clickNextPage();
                        break;
                    default:
                        break;
                }
            }
            if(r2App.mode == r2App.AppModeEnum.REPLAYING && pub.mode == r2.KeyboardModeEnum.NORMAL){
                switch(event.which){
                    case 17: // left ctrl
                    case 25: // rght ctrl
                        r2App.ctrlkey_dn = true;
                        break;
                    case 37:
                        r2.clickPrevPage();
                        break;
                    case 39:
                        r2.clickNextPage();
                        break;
                    default:
                        break;
                }
            }
            else if(r2App.mode == r2App.AppModeEnum.RECORDING){
                if(event.which == 13 || event.which == 32){ // enter or space
                    // for Recording_Stop() when key up;
                }
                else{
                    if(r2App.cur_recording_pieceaudios.length == 1){
                        replacePieceAudioToPieceKeyboard();
                    }
                }
            }

            if( pub.mode === r2.KeyboardModeEnum.NORMAL &&
                    (event.which === 13 || event.which === 32) ){
                event.preventDefault();
                event.stopPropagation();
            }
        };

        pub.handleUp = function(event){
            var key_str = String.fromCharCode(event.which);
            if (r2App.mode == r2App.AppModeEnum.IDLE && pub.mode == r2.KeyboardModeEnum.NORMAL) {
                switch (key_str) {
                    case ' ':
                        if (r2App.cur_annot_id) {
                            r2.rich_audio.play(r2App.cur_annot_id, -1);
                            r2.log.Log_AudioPlay('space', r2App.cur_annot_id, r2.audioPlayer.getPlaybackTime());
                        }
                        break;
                    case '\r': // enter
                        if (r2App.ctrlkey_dn) {
                            createPieceKeyboard(isprivate = true);
                            r2.log.Log_Simple("CreatePieceKeyboard_Private_Enter");
                        }
                        else {
                            r2App.recording_trigger = true;
                            r2.log.Log_Simple("Recording_Bgn_Enter");
                        }
                        break;
                    default:
                        break;
                }
            }
            else if (r2App.mode == r2App.AppModeEnum.REPLAYING && pub.mode == r2.KeyboardModeEnum.NORMAL) {
                switch (key_str) {
                    case ' ':
                        r2.log.Log_AudioStop('space', r2.audioPlayer.getCurAudioFileId(), r2.audioPlayer.getPlaybackTime());
                        r2.rich_audio.stop();
                        break;
                    case '\r': // enter
                        r2.log.Log_AudioStop('enter_0', r2.audioPlayer.getCurAudioFileId(), r2.audioPlayer.getPlaybackTime());
                        r2.rich_audio.stop();
                        if (r2App.ctrlkey_dn) {
                            createPieceKeyboard(isprivate = true);
                            r2.log.Log_Simple("CreatePieceKeyboard_Private_Enter");
                        }
                        else {
                            r2App.recording_trigger = true;
                            r2.log.Log_Simple("Recording_Bgn_Enter");
                        }
                        break;
                    default:
                        break;
                }
            }
            else if(r2App.mode == r2App.AppModeEnum.RECORDING) {
                if (event.which == 13 || event.which == 32) { // enter or space
                    r2.recordingStop(toupload = true);
                    r2.log.Log_Simple("Recording_Stop_Enter");
                }
            }

            switch(event.which){
                case 17: // left ctrl
                case 25: // rght ctrl
                    r2App.ctrlkey_dn = false;
                    break;
                case 107:
                    if(pub.mode == r2.KeyboardModeEnum.NORMAL)
                        r2.clickZoomIn();
                    break;
                case 109:
                    if(pub.mode == r2.KeyboardModeEnum.NORMAL)
                        r2.clickZoomOut();
                    break;
                default:
                    break;
            }
        };

        document.onkeyup = pub.handleUp;
        document.onkeydown = pub.handleDn;

        return pub;
    }());

    r2.onScreenButtons = (function(){
        var pub = {};
        var btn_audio = null;
        var btn_text = null;
        var btn_audio_size = 0;
        var btn_text_size = 0;

        pub.Init = function(){
            if(btn_audio != null || btn_text != null){
                r2.dom.removeFromPageDom(btn_audio);
                r2.dom.removeFromPageDom(btn_text);
            }
            btn_audio = CreateBtn();
            $(btn_audio.icon).toggleClass("fa-microphone", true);
            btn_audio.onmouseup = function(event){
                event.preventDefault();
                if(event.which != 1 || r2App.ctrlkey_dn){return;}
                if(r2App.mode == r2App.AppModeEnum.RECORDING){
                    r2.recordingStop(toupload = true);
                    r2.log.Log_Simple("Recording_Stop_OnScrBtn");
                }
                else{
                    r2App.recording_trigger = true;
                    r2.log.Log_Simple("Recording_Bgn_OnScrBtn");
                }
                pub.mode = r2.MouseModeEnum.HOVER; // should set mouse mode here, since we are calling stopPropagation().
            };
            btn_text = CreateBtn();

            $(btn_text.icon).toggleClass("fa-keyboard-o", true);
            btn_text.onmouseup = function(event){
                event.preventDefault();

                if(event.which != 1 || r2App.ctrlkey_dn){return;}
                createPieceKeyboard(isprivate = r2App.ctrlkey_dn);
                if(r2App.ctrlkey_dn){
                    r2.log.Log_Simple("CreatePieceKeyboard_Private_OnScrBtn");
                }
                else{
                    r2.log.Log_Simple("CreatePieceKeyboard_Public_OnScrBtn");
                }
                pub.mode = r2.MouseModeEnum.HOVER; // should set mouse mode here, since we are calling stopPropagation().
            };
        };

        pub.SetUserColor = function(user){
            btn_audio.style.color = user.color_onscrbtn_normal;
            btn_audio.circle.style.color = user.color_onscrbtn_normal;
            btn_audio.onmouseover = function(){
                btn_audio.circle.style.color = user.color_onscrbtn_hover;
            };
            btn_audio.onmouseout = function(){
                btn_audio.circle.style.color = user.color_onscrbtn_normal;
            };
            btn_text.style.color = user.color_onscrbtn_normal;
            btn_text.circle.style.color = user.color_onscrbtn_normal;
            btn_text.onmouseover = function(){
                btn_text.circle.style.color = user.color_onscrbtn_hover;
            };
            btn_text.onmouseout = function(){
                btn_text.circle.style.color = user.color_onscrbtn_normal;
            };
        };

        var CreateBtn = function(){
            var btn = document.createElement('div');
            btn.className += 'r2_onscreen_btn fa-stack fa-lg';
            btn.circle = document.createElement('a');
            btn.circle.className += 'center_vertical fa fa-circle fa-stack-2x';
            btn.circle.href = "javascript:void(0)";
            btn.appendChild(btn.circle);
            btn.icon = document.createElement('a');
            btn.icon.className += 'center_vertical fa fa-inverse fa-stack-1x';
            btn.icon.href = "javascript:void(0)";
            btn.appendChild(btn.icon);

            r2.dom.appendToPageDom(btn);

            btn.resizeBtnDom = function(){
                this.style.fontSize = r2.viewCtrl.mapDocToDomScale(r2Const.ONSCRBTN_SIZE) + 'px';
            };
            btn.resizeBtnDom();
            btn.icon.style.fontSize = '1em';
            btn.icon.style.color = 'white';
            btn.icon.style.fontFamily = 'FontAwesome';
            btn.circle.style.fontSize = '1.7em';
            btn.circle.style.fontFamily = 'FontAwesome';
            btn.onmousedown = function(event){
                if(event.which == 1){
                    event.preventDefault();
                    event.stopPropagation();
                }
                else if(event.which == 3){
                    r2.mouse.handleDn(event);
                }
            };
            return btn;
        };

        pub.ResizeDom = function(){
            if(btn_audio != null && btn_text != null){
                var selected_piece = r2App.pieceSelector.get();
                btn_audio.resizeBtnDom();
                btn_text.resizeBtnDom();
                btn_audio_size = new Vec2(btn_audio.clientWidth, btn_audio.clientHeight);
                btn_text_size = new Vec2(btn_text.clientWidth, btn_text.clientHeight);
            }
        };

        pub.MicToStop = function(){
            btn_audio.icon.classList.toggle('fa-microphone', false);
            btn_audio.icon.classList.toggle('fa-square', true);
        };
        pub.StopToMic = function(){
            btn_audio.icon.classList.toggle('fa-microphone', true);
            btn_audio.icon.classList.toggle('fa-square', false);
        };

        pub.updateDom = function(){
            var x, y;
            var selected_piece = r2App.pieceSelector.get();
            if(selected_piece && !selected_piece.IsPrivate()){
                x = selected_piece.pos.x + selected_piece.GetTtIndent()+selected_piece.GetTtIndentedWidth();
                y = selected_piece.pos.y + selected_piece._cnt_size.y;
            }
            else{
                x = -100;
                y = -100;
            }
            var pos = r2.viewCtrl.mapDocToDom(Vec2(x,y));
            btn_audio.style.left = Math.floor(pos.x - btn_audio_size.x) + 'px';
            btn_audio.style.top = Math.floor(pos.y - btn_audio_size.y*0.9)+ 'px';
            btn_text.style.left = Math.floor(pos.x - btn_text_size.x*1.8) + 'px';
            btn_text.style.top = Math.floor(pos.y - btn_text_size.y*0.9)+ 'px';
        };

        return pub;
    })();

    var replacePieceAudioToPieceKeyboard = function(){
        var annotid = r2App.cur_recording_annot.GetId();
        r2.recordingStop(toupload = false);
        r2.log.Log_Simple("Recording_Stop_CancelForTextComment");
        r2.log.Log_Simple("CreatePieceKeyboard_Public_Enter");
        r2.removeAnnot(annotid, askuser = false, mute = true);
        createPieceKeyboard(isprivate = false);
    };

    var recordingSpotlightDn = function(pt, target_annot){
        var piece = r2App.cur_page.GetPieceByHitTest(pt);
        if(piece){
            var spotlight = new r2.Spotlight();
            spotlight.SetSpotlight(
                target_annot.GetUsername(),
                target_annot.GetId(),
                r2App.cur_pdf_pagen,
                r2App.cur_time,
                r2App.cur_time-target_annot.GetBgnTime(),
                r2App.cur_time-target_annot.GetBgnTime());

            var segment  = new r2.Spotlight.Segment();
            segment.SetSegment(piece.GetId(), [pt.subtract(piece.pos, true)]);

            spotlight.AddSegment(segment);

            r2App.cur_recording_spotlight = spotlight;
            r2App.cur_recording_spotlight_segment = segment;
            r2App.cur_recording_spotlight_segment_piece = piece;
            r2App.cur_recording_spotlight_pt = pt;
        }
    };
    var recordingSpotlightMv = function(pt, target_annot){
        if(r2App.cur_recording_spotlight && r2App.cur_recording_spotlight_segment){
            var piece = r2App.cur_page.GetPieceByHitTest(pt);
            if(piece === r2App.cur_recording_spotlight_segment_piece){
                if(piece){
                    // add point
                    r2App.cur_recording_spotlight_segment.AddPt(pt.subtract(piece.pos, true));
                    r2App.cur_recording_spotlight.t_end = r2App.cur_time-target_annot.GetBgnTime();
                }
                else{
                    // cut segment
                    r2App.cur_recording_spotlight_segment = null;
                }
            }
            else{
                // cut segment
                r2App.cur_recording_spotlight_segment = null;
                if(piece){
                    // add new segment and add point
                    var segment  = new r2.Spotlight.Segment();
                    segment.SetSegment(piece.GetId(), [pt.subtract(piece.pos, true)]);
                    if(segment.GetNumPts()>0){
                        r2App.cur_recording_spotlight.AddSegment(segment);
                    }
                    r2App.cur_recording_spotlight_segment = segment;
                    r2App.cur_recording_spotlight.t_end = r2App.cur_time-target_annot.GetBgnTime();
                }
            }
            r2App.cur_recording_spotlight_segment_piece = piece;
            r2App.cur_recording_spotlight_pt = pt;
        }
    };

    var recordingSpotlightUp = function(pt, target_annot){
        if(r2App.cur_recording_spotlight){
            if(r2App.cur_recording_spotlight_segment){
                r2App.cur_recording_spotlight_segment = null;
            }
            if(r2App.cur_recording_spotlight.segments.length>0){
                target_annot.AddSpotlight(r2App.cur_recording_spotlight, toupload = true);
            }
            r2App.cur_recording_spotlight_pt = null;
            r2App.cur_page.refreshSpotlightPrerender();

            r2App.cur_recording_spotlight = null;
            r2App.invalidate_static_scene = true;
            r2App.invalidate_dynamic_scene = true;
            return true;
        }
        else{
            r2App.cur_recording_spotlight = null;
            return false;
        }
    };

    var createPieceKeyboard = function(isprivate){
        var anchorpiece = null;
        if(r2App.mode == r2App.AppModeEnum.REPLAYING){
            r2.log.Log_AudioStop('enter', r2.audioPlayer.getCurAudioFileId(), r2.audioPlayer.getPlaybackTime());
            r2.rich_audio.stop();
            anchorpiece = r2App.cur_page.SearchPieceAudioByAnnotId(this._annotid, r2.audioPlayer.getPlaybackTime());
        }
        else if(r2App.mode == r2App.AppModeEnum.IDLE){
            anchorpiece = r2App.pieceSelector.get();
        }
        if(anchorpiece){
            var annotid = new Date(r2App.cur_time).toISOString();
            var piecekeyboard = new r2.PieceKeyboard();
            piecekeyboard.SetPiece(
                Sha1.hash(annotid+" PieceKeyboard 0"),
                r2App.cur_time,
                anchorpiece.GetNewPieceSize(),
                anchorpiece.GetTTData());
            piecekeyboard.SetPieceKeyboard(annotid, r2.userGroup.cur_user.name, '', isprivate, anchorpiece.IsOnLeftColumn());
            anchorpiece.AddChildAtFront(piecekeyboard);
            r2App.cur_page.Relayout();
            piecekeyboard.updateDom();
            piecekeyboard.Focus();
            r2Sync.PushToUploadCmd(piecekeyboard.ExportToCmd());

            // reposition docs so that the textarea lies on the screen
            /*
            var shiftx = 0;
            if(isprivate){
                shiftx = piecekeyboard.GetPrivateShiftX();
            }
            var doc_l = piecekeyboard.pos.add(new Vec2(shiftx, 0), true);
            var scr_l = r2.viewCtrl.mapDocToScr(doc_l);
            var doc_r = piecekeyboard.pos.add(piecekeyboard.GetContentSize(), true).add(new Vec2(shiftx, 0), true);
            var scr_r = r2.viewCtrl.mapDocToScr(doc_r);
            if(scr_l.x < 0){
                r2.viewCtrl.pos.x = -r2.viewCtrl.scale*doc_l.x;
            }
            else if(scr_r.x > 1.0){
                r2.viewCtrl.pos.x = 1.0-r2.viewCtrl.scale*doc_r.x
            }
            */
        }
    };

}(window.r2 = window.r2 || {}));
