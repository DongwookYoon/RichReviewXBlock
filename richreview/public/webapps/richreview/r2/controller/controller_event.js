/**
 * Created by yoon on 12/21/14.
 */
//written by Tianwei Huang
//written by Yuan Huang
 
var r2Ctrl = {};

/** @namespace r2 */
(function(r2){

    /* input mode */
    r2.input = (function(){
        var pub = {};
        var InputMode = {
            DESKTOP : 0,
            TABLET : 1,
            TABLET_TOUCH: 2
        };
        var mode = InputMode.DESKTOP;
        var cursor_in_menu = false;

        pub.setModeDesktop = function(){
            resetMode();

            mode = InputMode.DESKTOP;
            $('#btn-input-set-mode-desktop').toggleClass('btn-primary', true);
            r2.mouse.rightClickContextMenu.enable();
            r2.mouse.setEventHandlers();
        };
        pub.setModeTabletTouch = function(){
            resetMode();

            mode = InputMode.TABLET_TOUCH;
            $('#btn-input-set-mode-tablet-touch').toggleClass('btn-primary', true);
            r2.mouse.rightClickContextMenu.enable();
            r2.tabletTouchInput.setEventHandlers();
            r2.mouse.setEventHandlers();
        };
        pub.setModeTablet = function(){
            resetMode();

            mode = InputMode.TABLET;
            $('#btn-input-set-mode-tablet').toggleClass('btn-primary', true);
            r2.mouse.rightClickContextMenu.disable();
            r2.tabletInput.on();
        };

        pub.getPos = function(event){
            return r2.viewCtrl.mapBrowserToScr(new Vec2(event.clientX, event.clientY))
        };

        pub.isTap = function(pt_dn, pt){
            var d = pt_dn.subtract(pt, true);
            d = Math.sqrt(d.x * d.x + d.y * d.y) * r2.viewCtrl.page_width_noscale;
            return d < r2Const.MOUSE_CLICK_DIST_CRITERIA;
        };

        pub.inMenu = function(){cursor_in_menu = true;};
        pub.outMenu = function(){cursor_in_menu = false;};
        pub.isInMenu = function(){return cursor_in_menu;};

        function resetMode(){
            $('#btn-input-set-mode-desktop').toggleClass('btn-primary', false);
            $('#btn-input-set-mode-desktop').toggleClass('btn-default', true);
            $('#btn-input-set-mode-tablet-touch').toggleClass('btn-primary', false);
            $('#btn-input-set-mode-tablet-touch').toggleClass('btn-default', true);
            $('#btn-input-set-mode-tablet').toggleClass('btn-primary', false);
            $('#btn-input-set-mode-tablet').toggleClass('btn-default', true);

            r2.mouse.removeEventHandlers();
            r2.tabletTouchInput.removeEventHandlers();
            r2.tabletInput.off();
        }

        return pub;
    }());
    /* end of input mode*/

    r2.tabletTouchInput = (function(){
        var pub_tti = {};

        var InputMode = {
            IDLE : 0,
            NAV_TRANS : 1,
            NAV_SCALE : 2,
            GESTURE : 3
        };
        var touches = {};
        var zoom_indices = [-1, -1];
        var mode = InputMode.IDLE;

        pub_tti.setEventHandlers = function(){
            r2.dom.onTouchEventHandlers(dnEvent, mvEvent, upEvent);
        };

        pub_tti.removeEventHandlers = function(){
            r2.dom.offTouchEventHandlers(dnEvent, mvEvent, upEvent);
            mode = InputMode.IDLE;
            touches = {};
        };

        function getLastTouch(id, idx){
            idx = typeof idx === 'undefined' ? 0 : idx;
            return touches[id][touches[id].length-1+idx];
        }
        function createTouch(touch){
            return {
                clientPos: new Vec2(touch.clientX, touch.clientY),
                docPos: r2.input.getPos(touch),
                time: new Date().getTime()
            }
        }
        function theOtherTouchId(id){
            var keys = Object.keys(touches);
            keys = keys.map(function(k){return parseInt(k);});
            if(keys.length === 2){
                var x = keys.indexOf(id);
                return keys[1-keys.indexOf(id)];
            }
            else{
                console.error('theOtherTouchId:', touches);
                throw new Error('theOtherTouchId:' + JSON.Stringify(touches));
            }
        }

        function dnTouch(touch, event){
            if(Object.keys(touches).length < 2){
                touches[touch.identifier] = [createTouch(touch)];
                if(mode === InputMode.IDLE){
                    if(r2App.mode === r2App.AppModeEnum.RECORDING){
                        mode = InputMode.GESTURE;
                        r2.spotlightCtrl.recordingSpotlightDn(
                            r2.viewCtrl.mapScrToDoc(getLastTouch(touch.identifier).docPos),
                            r2App.cur_recording_annot
                        );
                    }
                    else{
                        mode = InputMode.NAV_TRANS;
                    }
                }
                else if(mode === InputMode.NAV_TRANS || mode === InputMode.GESTURE){
                    if(mode === InputMode.GESTURE){
                        r2.spotlightCtrl.recordingSpotlightCancel();
                    }
                    mode = InputMode.NAV_SCALE;
                    zoom_indices[0] = touch.identifier;
                    zoom_indices[1] = theOtherTouchId(touch.identifier);
                    r2.zoom.touch.dn(
                        getLastTouch(zoom_indices[0]).clientPos,
                        getLastTouch(zoom_indices[1]).clientPos
                    );
                }
            }
            if(Object.keys(touches).length >= 2){
                event.preventDefault(); // prevents default zoom of the browser
            }
        }
        function mvTouch(touch, event){
            if(touches.hasOwnProperty(touch.identifier)){
                touches[touch.identifier].push(createTouch(touch));
                if(mode === InputMode.GESTURE){
                    r2.spotlightCtrl.recordingSpotlightMv(
                        r2.viewCtrl.mapScrToDoc(getLastTouch(touch.identifier).docPos),
                        r2App.cur_recording_annot
                    );
                    event.preventDefault(); // prevent default translation
                }
                else if(mode === InputMode.NAV_SCALE){
                    r2.zoom.touch.mv(
                        getLastTouch(zoom_indices[0]).clientPos,
                        getLastTouch(zoom_indices[1]).clientPos
                    );
                }
                if(Object.keys(touches).length >= 2){
                    event.preventDefault(); // prevents default zoom of the browser
                }
            }
            else{
                event.preventDefault();
            }
        }
        function upTouch(touch, event){
            if(touches.hasOwnProperty(touch.identifier)){
                //console.log('touchUp:', touch.identifier, touches[touch.identifier].length);
                touches[touch.identifier].push(createTouch(touch));
                if(Object.keys(touches).length >= 2){
                    event.preventDefault();
                }
                if(mode === InputMode.GESTURE){
                    r2.spotlightCtrl.recordingSpotlightUp(
                        r2.viewCtrl.mapScrToDoc(getLastTouch(touch.identifier).docPos),
                        r2App.cur_recording_annot
                    );
                }
                else if(mode === InputMode.NAV_SCALE) {
                    r2.zoom.touch.up(
                        getLastTouch(zoom_indices[0]).clientPos,
                        getLastTouch(zoom_indices[1]).clientPos
                    );
                }
                delete touches[touch.identifier];
                mode = InputMode.IDLE;
            }
            else{
                event.preventDefault();
            }
        }

        function dnEvent(event){
            for(var i = 0; i < event.changedTouches.length; ++i){
                dnTouch(event.changedTouches[i], event);
            }
        }
        function mvEvent(event){
            for(var i = 0; i < event.changedTouches.length; ++i){
                mvTouch(event.changedTouches[i], event);
            }
        }
        function upEvent(event){
            for(var i = 0; i < event.changedTouches.length; ++i){
                upTouch(event.changedTouches[i], event);
            }
        }

        return pub_tti;
    }());

    /* input controller for the tablet with pen and touch */
    r2.tabletInput = (function(){
        var pub_ti = {};

        var enabled = false;
        var $content = null;

        pub_ti.setEventHandlers = function(){
            if($content === null){
                $content = $('#r2_content');
            }
            $content.on('pointerdown', dn);
            $content.on('pointerup', up);
            $content.on('pointermove', mv);
            $content.on('pointerenter', en);
            $content.on('pointerleave', lv);
        };

        pub_ti.on = function(){
            enabled = true;
        };

        pub_ti.off = function(){
            enabled = false;
        };

        var dn = function(event){
            if(!enabled){return;}

            if(event.originalEvent.pointerType === 'pen'){
                r2.pen.dn(event);
            }
            else if(event.originalEvent.pointerType === 'touch'){
                r2.touch.dn(event);
            }
        };

        var up = function(event){
            if(!enabled){return;}

            if(event.originalEvent.pointerType === 'pen'){
                r2.pen.up(event);
            }
            else if(event.originalEvent.pointerType === 'touch'){
                r2.touch.up(event);
            }
        };

        var mv = function(event){
            if(!enabled){return;}

            if(event.originalEvent.pointerType === 'pen'){
                r2.pen.mv(event);
            }
            else if(event.originalEvent.pointerType === 'touch'){
                r2.touch.mv(event);
            }
        };

        var en = function(event){
            if(!enabled){return;}

            if(event.originalEvent.pointerType === 'pen'){
                r2.pen.en(event);
            }
        };

        var lv = function(event){
            if(!enabled){return;}

            if(event.originalEvent.pointerType === 'pen'){
                r2.pen.lv(event);
            }
        };

        return pub_ti;
    }());

    /* touch */
    r2.touch = (function(){
        var pub_tc = {};

        pub_tc.dn = function(event){
        };

        pub_tc.up = function(event){
        };

        pub_tc.mv = function(event){
        };

        return pub_tc;
    }());
    /* end of touch*/

    /* pen */
    r2.pen = (function(){
        var pub_pn = {};

        var PenEventType = {
            NORMAL: 1,
            FIRST_BTN:6,
            SECOND_BTN:3
        };

        var PenMode = {
            NORMAL: 0,
            MANIPULATION: 1,
            TEARING: 2,
            ERASER: 3
        };
        var mode = PenMode.NORMAL;
        var cur_dn = false;
        var pos_dn = new Vec2(0, 0);
        var pos_writing = new Vec2(0, 0);
        var pos_splight = new Vec2(0, 0);
        var cur_piece_tearing = null;


        pub_pn.dn = function(event){
            dn(event);
        };

        pub_pn.up = function(event){
            up(event);
        };

        pub_pn.mv = function(event){
            if(cur_dn){
                mv(event);
            }
            else{
                hv(event);
            }
        };
        pub_pn.en = function(event){
            en(event);
        };

        pub_pn.lv = function(event){
            lv(event);
        };

        var dn = function(event){
            cur_dn = true;

            var new_pen_pt = r2.input.getPos(event);
            var pos_px = new Vec2(event.clientX, event.clientY);
            if(r2App.mode === r2App.AppModeEnum.RECORDING){
                r2.inkCtrl.recordingInkDn(r2.viewCtrl.mapScrToDoc(new_pen_pt), r2App.cur_recording_annot);
                pos_writing = pos_px;
                r2.spotlightCtrl.recordingSpotlightCancel(); // just in case
            }
            else if(r2App.mode === r2App.AppModeEnum.IDLE || r2App.mode === r2App.AppModeEnum.REPLAYING) {
                if(event.which === PenEventType.NORMAL){
                    r2.inkCtrl.recordingInkDn(r2.viewCtrl.mapScrToDoc(new_pen_pt), r2App.annot_static_ink);
                }
                else if(event.which === PenEventType.FIRST_BTN){
                    mode = PenMode.MANIPULATION;
                }
                else if(event.which === PenEventType.SECOND_BTN){
                    mode = PenMode.ERASER;
                    r2.inkCtrl.eraser.dn();
                }
            }
            pos_dn = new_pen_pt;
        };
        var up = function(event){
            var new_pen_pt = r2.input.getPos(event);
            var pos_px = new Vec2(event.clientX, event.clientY);
            if(r2App.mode === r2App.AppModeEnum.RECORDING){
                r2.inkCtrl.recordingInkUp(r2.viewCtrl.mapScrToDoc(new_pen_pt), r2App.cur_recording_annot);
            }
            else if(r2App.mode === r2App.AppModeEnum.IDLE || r2App.mode === r2App.AppModeEnum.REPLAYING){
                if(r2.input.isTap(pos_dn, new_pen_pt)){
                    if(mode === PenMode.MANIPULATION){
                        if(!r2App.pieceSelector.isNull()){
                            r2.recordingCtrl.set(
                                r2App.pieceSelector.get(),
                                {ui_type: r2.speechUi.mode, log_type: 'PenTap'}
                            );
                        }
                    }
                    else if(mode === PenMode.NORMAL){
                        if (!r2.input.isInMenu()) {
                            handleTimeIndexingUp(r2.viewCtrl.mapScrToDoc(new_pen_pt));
                        }
                    }
                }
                if(event.which === PenEventType.NORMAL){
                    r2.inkCtrl.recordingInkUp(r2.viewCtrl.mapScrToDoc(new_pen_pt), r2App.annot_static_ink);
                }
                if(mode === PenMode.MANIPULATION){
                    mode = PenMode.NORMAL;
                }
                if(mode === PenMode.TEARING){
                    mode = PenMode.NORMAL;
                    r2Sync.uploader.pushCmd(cur_piece_tearing.ExportToCmd());
                    cur_piece_tearing = null;
                }
                if(mode === PenMode.ERASER){
                    r2.inkCtrl.eraser.up();
                    mode = PenMode.NORMAL;
                }
            }
            cur_dn = false;
        };
        var mv = function(event){
            var new_pen_pt = r2.input.getPos(event);
            var pos_px = new Vec2(event.clientX, event.clientY);
            if(r2App.mode === r2App.AppModeEnum.RECORDING){
                if(pos_writing.distance(pos_px) > 1 ){
                    r2.inkCtrl.recordingInkMv(r2.viewCtrl.mapScrToDoc(new_pen_pt), r2App.cur_recording_annot);
                    pos_writing = pos_px;
                }
            }
            else if(r2App.mode === r2App.AppModeEnum.IDLE || r2App.mode === r2App.AppModeEnum.REPLAYING) {
                if(event.which === PenEventType.NORMAL){
                    r2.inkCtrl.recordingInkMv(r2.viewCtrl.mapScrToDoc(new_pen_pt), r2App.annot_static_ink);
                    r2App.invalidate_dynamic_scene = true;
                }
                if(mode === PenMode.MANIPULATION){
                    if(new_pen_pt.y > pos_dn.y + 0.05 || new_pen_pt.y < pos_dn.y - 0.05){
                        mode = PenMode.TEARING;
                        cur_piece_tearing = createPieceTeared();
                    }
                }
                if(mode === PenMode.TEARING){
                    if(cur_piece_tearing){
                        var new_height = new_pen_pt.y-cur_piece_tearing.pos.y;
                        if(new_height >= 0){
                            cur_piece_tearing.resize(new_height);
                            r2.dom_model.updateSizeTextTearing(cur_piece_tearing);
                            r2App.invalidate_size = true;
                            r2App.invalidate_page_layout = true;
                        }
                    }
                }
                if(mode === PenMode.ERASER){
                    r2.inkCtrl.eraser.mv(r2.viewCtrl.mapScrToDoc(new_pen_pt));
                }
            }
        };
        var hv = function(event){
            var new_pen_pt = r2.input.getPos(event);
            var pos_px = new Vec2(event.clientX, event.clientY);

            // select piece
            r2App.pieceSelector.update(new_pen_pt);

            if(r2App.mode == r2App.AppModeEnum.RECORDING){
                if(pos_splight.distance(pos_px) > 1) {
                    r2.spotlightCtrl.recordingSpotlightMv(r2.viewCtrl.mapScrToDoc(new_pen_pt), r2App.cur_recording_annot);
                }
            }
        };
        var en = function(event){
            var new_pen_pt = r2.input.getPos(event);
            var pos_px = new Vec2(event.clientX, event.clientY);
            if(r2App.mode == r2App.AppModeEnum.RECORDING){
                r2.spotlightCtrl.recordingSpotlightDn(r2.viewCtrl.mapScrToDoc(new_pen_pt), r2App.cur_recording_annot);
                pos_splight = pos_px;
            }
        };
        var lv = function(event){
            var new_pen_pt = r2.input.getPos(event);
            var pos_px = new Vec2(event.clientX, event.clientY);
            if(r2App.mode == r2App.AppModeEnum.RECORDING){
                r2.spotlightCtrl.recordingSpotlightUp(r2.viewCtrl.mapScrToDoc(new_pen_pt), r2App.cur_recording_annot);
            }
        };

        return pub_pn;
    }());
    /* end of pen */

    /* mouse */
    r2.MouseModeEnum = {
        HOVER : 0,
        RDN : 1,
        LDN : 2
    };
    r2.MouseBtn = {
        NONE : 0,
        LEFT : 1,
        MDDL : 2,
        RGHT : 3
    };

    r2.mouse = (function(){
        var pub = {};

        pub.mode = r2.MouseModeEnum.HOVER;

        var pos_dn = new Vec2(0,0);

        pub.setEventHandlers = function(){
            r2.dom.onMouseEventHandlers(
                pub.handleDn,
                pub.handleMv,
                pub.handleUp
            );
        };

        pub.removeEventHandlers = function(){
            r2.dom.offMouseEventHandlers(
                pub.handleDn,
                pub.handleMv,
                pub.handleUp
            );
        };

        pub.handleDn = function(event){
            var new_mouse_pt = r2.input.getPos(event);

            if(r2.onScreenButtons.eventOnBtns(event)){
                pub.mode = r2.MouseModeEnum.HOVER;
                r2App.cur_mouse_pt = new_mouse_pt;
                return
            }

            if(pub.mode === r2.MouseModeEnum.HOVER){
                switch (event.which) {
                    case r2.MouseBtn.LEFT: // left click
                        pub.mode = r2.MouseModeEnum.LDN;
                        pos_dn = new_mouse_pt;
                        if(r2App.mode == r2App.AppModeEnum.IDLE || r2App.mode == r2App.AppModeEnum.REPLAYING){
                            /*if(r2.keyboard.ctrlkey_dn)
                                r2.spotlightCtrl.recordingSpotlightDn(r2.viewCtrl.mapScrToDoc(new_mouse_pt), r2App.annot_private_spotlight);// no private spotlight */
                        }
                        else if(r2App.mode == r2App.AppModeEnum.RECORDING){
                            r2.spotlightCtrl.recordingSpotlightDn(r2.viewCtrl.mapScrToDoc(new_mouse_pt), r2App.cur_recording_annot);
                        }
                        break;
                    case r2.MouseBtn.RGHT:
                        pub.mode = r2.MouseModeEnum.RDN;
                        r2.inkCtrl.eraser.dn();
                        break;
                    default:
                        break;
                }
            }
            r2App.cur_mouse_pt = new_mouse_pt;
        };

        pub.handleMv = function(event){
            var new_mouse_pt = r2.input.getPos(event);

            if(pub.mode == r2.MouseModeEnum.HOVER){
                // select piece
                r2App.pieceSelector.update(r2App.cur_mouse_pt);
            }
            else if(pub.mode == r2.MouseModeEnum.LDN){
                if(r2App.mode == r2App.AppModeEnum.IDLE || r2App.mode == r2App.AppModeEnum.REPLAYING){
                    if(r2.spotlightCtrl.nowRecording()){
                        r2.spotlightCtrl.recordingSpotlightMv(r2.viewCtrl.mapScrToDoc(new_mouse_pt), r2App.annot_private_spotlight);
                    }
                }
                else if(r2App.mode == r2App.AppModeEnum.RECORDING){
                    r2.spotlightCtrl.recordingSpotlightMv(r2.viewCtrl.mapScrToDoc(new_mouse_pt), r2App.cur_recording_annot);
                }
            }
            else if(pub.mode == r2.MouseModeEnum.RDN){
                r2.inkCtrl.eraser.mv(r2.viewCtrl.mapScrToDoc(new_mouse_pt));
            }

            r2App.cur_mouse_pt = new_mouse_pt;
        };

        pub.handleUp = function(event){
            var new_mouse_pt = r2.input.getPos(event);

            if(r2.onScreenButtons.eventOnBtns(event)){
                pub.mode = r2.MouseModeEnum.HOVER;
                r2App.cur_mouse_pt = new_mouse_pt;
                return
            }

            if(pub.mode == r2.MouseModeEnum.HOVER){
                // do nothing, there's something weird.
            }
            else if(pub.mode == r2.MouseModeEnum.LDN){
                if(r2App.mode == r2App.AppModeEnum.IDLE || r2App.mode == r2App.AppModeEnum.REPLAYING){
                    if (!r2.input.isInMenu() && r2.input.isTap(pos_dn, new_mouse_pt)) {
                        handleTimeIndexingUp(r2.viewCtrl.mapScrToDoc(new_mouse_pt));
                    }
                    if(r2.spotlightCtrl.recordingSpotlightUp(r2.viewCtrl.mapScrToDoc(new_mouse_pt), r2App.annot_private_spotlight)){
                        r2App.annot_private_spotlight.timeLastChanged = (new Date()).getTime();
                        r2App.annot_private_spotlight.changed = true;
                    }
                }
                else if(r2App.mode == r2App.AppModeEnum.RECORDING){
                    r2.spotlightCtrl.recordingSpotlightUp(r2.viewCtrl.mapScrToDoc(new_mouse_pt), r2App.cur_recording_annot);
                }

                //r2.onScreenButtons.mouseUp();
                pub.mode = r2.MouseModeEnum.HOVER;
            }
            else if(pub.mode == r2.MouseModeEnum.RDN){
                r2.inkCtrl.eraser.up();
                pub.mode = r2.MouseModeEnum.HOVER;
            }

            r2App.cur_mouse_pt = new_mouse_pt;
        };

        pub.rightClickContextMenu = (function(){
            var pub_rc = {};

            pub_rc.enable = function(){
                document.getElementById('r2_app_container').removeEventListener('contextmenu', disableFunc, false);
            };

            pub_rc.disable = function(){
                document.getElementById('r2_app_container').addEventListener('contextmenu', disableFunc, false);
            };

            function disableFunc(e){
                e.preventDefault();
            }

            return pub_rc;
        }());


        return pub;
    }());
    /* end of mouse */

    var handleTimeIndexingUp = function(pt){
        var l = r2App.cur_page.HitTest(pt);
        if(l.length == 0){return;}

        var playback;
        var obj_front = l[0];
        if(obj_front instanceof r2.PieceAudio){
            playback = obj_front.GetPlayback(pt);
            if(playback){
                r2.rich_audio.play(playback.annot, playback.t);
                r2.log.Log_AudioPlay('indexing_wf', playback.annot, playback.t);
                r2.dom_model.focusCtrl.focusAnnot(playback.annot);
            }
        }
        else if(obj_front instanceof r2.PieceKeyboard){
            obj_front.Focus();
        }
        else if(obj_front instanceof r2.PieceSimpleSpeech){
            obj_front.Focus();
        }
        else if(obj_front instanceof r2.PieceNewSpeak){
            obj_front.Focus();
        }
        else{
            if(obj_front instanceof r2.PieceText){
                r2.dom_model.focusCtrl.focusPiece(obj_front.GetId());
            }
            var spotlights = [];
            l.forEach(function(item){if(item instanceof r2.Spotlight.Cache){spotlights.push(item);}});
            for(var i = 0; spotlight = spotlights[i]; ++i){
                playback = spotlight.GetPlayback(pt);
                if(playback){
                    if(r2App.annots[playback.annot]._ui_type !== 'new_speak'){
                        r2.rich_audio.play(playback.annot, playback.t);
                        r2.log.Log_AudioPlay('indexing_sp', playback.annot, playback.t);
                    }
                    break;
                }
            }
        }
    };

    /* keyboard */
    r2.KeyboardModeEnum = {
        TEXTBOX : 0,
        NORMAL : 1,
        ON_BTN : 2,
        TOOLTIP: 3
    };

    r2.keyboard = (function(){
        var pub = {};

        var CONST = {
            KEY_LEFT: 37,
            KEY_RGHT: 39,
            KEY_UP: 38,
            KEY_DN: 40,
            KEY_HOM: 36,
            KEY_END: 35,
            KEY_PAGEUP: 33,
            KEY_PAGEDN: 34,
            KEY_PLUS: 107,
            KEY_MINUS: 109,

            KEY_C: 67,
            KEY_V: 86,
            KEY_X: 88,
            KEY_Z: 90,

            KEY_BSPACE: 8,
            KEY_DEL: 46,

            KEY_SPACE: 32,
            KEY_ENTER: 13,

            KEY_SHIFT: 16,
            KEY_CTRL: 17,
            KEY_CMD: 91,
            KEY_ESC: 27
        };

        var mode = r2.KeyboardModeEnum.NORMAL;
        pub.ctrlkey_dn = false;
        pub.shift_key_dn = false;
        pub.modifier_key_dn = false;
        pub.CONST = CONST;

        pub.getMode = function(){
            return mode;
        };

        pub.setMode = function(_mode){
            mode = _mode;
        };

        pub.pieceEventListener = (function(){
            var pub_ph = {};
            pub_ph.setTextbox = function(dom_textbox){
                dom_textbox.addEventListener('focus', function(){
                    mode = r2.KeyboardModeEnum.TEXTBOX;
                });
                dom_textbox.addEventListener('blur', function(){
                    mode = r2.KeyboardModeEnum.NORMAL;
                });
            };
            pub_ph.setBtn = function(dom_btn){
                dom_btn.addEventListener('focus', function(){
                    mode = r2.KeyboardModeEnum.ON_BTN;
                });
                dom_btn.addEventListener('blur', function(){
                    mode = r2.KeyboardModeEnum.NORMAL;
                });
                $(dom_btn).bind('destroyed', function(){
                    mode = r2.KeyboardModeEnum.NORMAL;
                });
            };
            pub_ph.setToolTip = function(dom_btn){
                dom_btn.addEventListener('focus', function(){
                    mode = r2.KeyboardModeEnum.TOOLTIP;
                });
                dom_btn.addEventListener('blur', function(){
                    mode = r2.KeyboardModeEnum.NORMAL;
                });
            };
            return pub_ph;
        }());

        pub.handleDn = function(event){
            if(r2App.mode === r2App.AppModeEnum.IDLE && mode === r2.KeyboardModeEnum.NORMAL){
                ;
            }
            else if(r2App.mode === r2App.AppModeEnum.REPLAYING && mode === r2.KeyboardModeEnum.NORMAL){
                ;
            }
            else if(r2App.mode === r2App.AppModeEnum.RECORDING){
                if(event.which === CONST.KEY_ENTER || event.which === CONST.KEY_SPACE){ // enter or space
                    // for Recording_Stop() when key up;
                }
                else{
                    if(r2App.cur_recording_pieceaudios.length == 1){
                        replacePieceAudioToPieceKeyboard();
                    }
                }
            }
            if(mode === r2.KeyboardModeEnum.NORMAL || mode === r2.KeyboardModeEnum.ON_BTN){
                switch(event.which){
                    case CONST.KEY_CTRL: // left ctrl
                        pub.ctrlkey_dn = true;
                        break;
                    case CONST.KEY_SHIFT: // left shift
                        pub.shift_key_dn = true;
                        break;
                    case CONST.KEY_PAGEUP:
                        r2.clickPrevPage();
                        event.preventDefault();
                        break;
                    case CONST.KEY_PAGEDN:
                        r2.clickNextPage();
                        event.preventDefault();
                        break;
                    case CONST.KEY_DN:
                        r2.dom_model.focusCtrl.next();
                        event.preventDefault();
                        break;
                    case CONST.KEY_UP:
                        r2.dom_model.focusCtrl.prev();
                        event.preventDefault();
                        break;
                    case CONST.KEY_LEFT:
                        r2.dom_model.focusCtrl.up();
                        event.preventDefault();
                        break;
                    case CONST.KEY_RGHT:
                        r2.dom_model.focusCtrl.in();
                        event.preventDefault();
                        break;
                    case CONST.KEY_ESC:
                        r2.dom_model.focusCtrl.esc();
                        event.preventDefault();
                        break;
                    default:
                        break;
                }
            }
            else{ // when focused
                switch(event.which){
                    case CONST.KEY_CTRL: // left ctrl
                        pub.ctrlkey_dn = true;
                        pub.modifier_key_dn = modifierKeyCtrl.dn(event.which);
                        break;
                    case CONST.KEY_CMD:
                        pub.modifier_key_dn = modifierKeyCtrl.dn(event.which);
                        break;
                    case CONST.KEY_SHIFT: // left shift
                        pub.shift_key_dn = true;
                        break;
                    case CONST.KEY_ESC:
                        r2.dom_model.focusCtrl.esc();
                        event.preventDefault();
                        break;
                    default:
                        break;
                }
            }

            if( mode === r2.KeyboardModeEnum.NORMAL &&
                    (event.which === CONST.KEY_ENTER || event.which === CONST.KEY_SPACE) ){
                event.preventDefault();
                event.stopPropagation();
            }
        };

        pub.handleUp = function(event){

            if (r2App.mode == r2App.AppModeEnum.IDLE && mode == r2.KeyboardModeEnum.NORMAL) {
                switch (event.which) {
                    case CONST.KEY_SPACE:
                        if (r2App.cur_annot_id) {
                            r2.rich_audio.play(r2App.cur_annot_id, -1);
                            r2.log.Log_AudioPlay('space', r2App.cur_annot_id, r2.audioPlayer.getPlaybackTime());
                        }
                        break;
                    case CONST.KEY_ENTER: // enter
                        if(!r2App.pieceSelector.isNull()){
                            r2.recordingCtrl.set(
                                r2App.pieceSelector.get(),
                                {ui_type: r2.speechUi.mode, log_type: 'Enter'}
                            );
                        }
                        break;
                    default:
                        break;
                }
            }
            else if (r2App.mode == r2App.AppModeEnum.REPLAYING && mode == r2.KeyboardModeEnum.NORMAL) {
                switch (event.which) {
                    case CONST.KEY_SPACE:
                        r2.log.Log_AudioStop('space', r2.audioPlayer.getCurAudioFileId(), r2.audioPlayer.getPlaybackTime());
                        r2.rich_audio.stop();
                        break;
                    case CONST.KEY_ENTER: // enter
                        r2.log.Log_AudioStop('enter', r2.audioPlayer.getCurAudioFileId(), r2.audioPlayer.getPlaybackTime());
                        r2.rich_audio.stop();
                        if(!r2App.pieceSelector.isNull()){
                            r2.recordingCtrl.set(
                                r2App.pieceSelector.get(),
                                {ui_type: r2.speechUi.mode, log_type: 'Enter'}
                            );
                        }
                        break;
                    default:
                        break;
                }
            }
            else if(r2App.mode == r2App.AppModeEnum.RECORDING) {
                switch (event.which) {
                    case CONST.KEY_SPACE:
                    case CONST.KEY_ENTER:
                        r2.recordingCtrl.stop(true);
                        r2.log.Log_Simple("Recording_Stop");
                        break;
                    default:
                        break;
                }
            }

            switch(event.which){
                case CONST.KEY_CTRL: // left ctrl
                    pub.ctrlkey_dn = false;
                    pub.modifier_key_dn = modifierKeyCtrl.up(event.which);
                    break;
                case CONST.KEY_CMD:
                    pub.modifier_key_dn = modifierKeyCtrl.up(event.which);
                    break;
                case CONST.KEY_SHIFT: // left shift
                    pub.shift_key_dn = false;
                    break;
                case CONST.KEY_PLUS:
                    if(mode == r2.KeyboardModeEnum.NORMAL)
                        r2.zoom.in();
                    break;
                case CONST.KEY_MINUS:
                    if(mode == r2.KeyboardModeEnum.NORMAL)
                        r2.zoom.out();
                    break;
                default:
                    break;
            }
        };

        var modifierKeyCtrl = (function(){
            var pub_mk = {};

            var is_dn = false;

            pub_mk.dn = function(which){
                if(which === r2.environment_detector.is_mac ? CONST.KEY_CMD : CONST.KEY_CTRL){
                    is_dn = true;
                }
                return is_dn;
            };

            pub_mk.up = function(which){
                if(which === r2.environment_detector.is_mac ? CONST.KEY_CMD : CONST.KEY_CTRL){
                    is_dn = false;
                }
                return is_dn;
            };

            return pub_mk;
        }());

        document.onkeyup = pub.handleUp;
        document.onkeydown = pub.handleDn;

        return pub;
    }());
    /* end of keyboard */

    r2.onScreenButtons = (function(){
        var pub = {};

        var $dom = $('<div id="onscrbtns_static"></div>');

        pub.Init = function(){
            r2.HtmlTemplate.loadDataFromUrl('onscrbtns')
                .then(function(resp){
                    $dom.html(resp);
                });
        };

        pub.setOnPiece = function($piece){
            if(!$dom.parent().is($piece.children('.tc_content'))){
                $dom.remove();
                $piece.children('.tc_content').append($dom);
            }
        };

        pub.onClick = function(type){
            if(type === 'keyboard'){
                if(r2.keyboard.ctrlkey_dn){return;}
                createPieceKeyboard(isprivate = false);
                r2.log.Log_Simple("CreatePieceKeyboard_OnScrBtn");
            }
            else if(type === 'waveform'){
                if(r2.keyboard.ctrlkey_dn){return;}
                if(r2App.mode === r2App.AppModeEnum.RECORDING){
                    r2.recordingCtrl.stop(true);
                    r2.log.Log_Simple("Recording_Stop_OnScrBtn");
                }
                else{
                    if(!r2App.pieceSelector.isNull()){
                        r2.recordingCtrl.set(
                            r2App.pieceSelector.get(),
                            {ui_type: r2.speechUi.mode, log_type: 'OnScrBtn'}
                        );
                    }
                }
            }
        };

        pub.changeVoiceCommentBtnIcon = function(old_fa, new_fa){
            $dom.children('.voice_comment_btn').children('.'+old_fa).removeClass(old_fa).addClass(new_fa);
        };

        pub.SetUserColor = function(user){
            $dom.css('color', user.color_onscrbtn_normal);
        };

        pub.eventOnBtns = function(event){
            return $dom.has($(event.target)).length > 0;
        };

        return pub;
    })();


    r2.inkCtrl = (function(){
        var pub = {};

        var cur_recording_Ink = null;
        var cur_recording_Ink_segment = null;
        var cur_recording_Ink_segment_piece = null;
        var cur_recording_Ink_pt = null;
        var cur_recording_Ink_piece = null;

        pub.nowRecording = function(){
            return cur_recording_Ink !== null;
        };

        pub.dynamicScene = (function(){
            var pub_ds = {};

            var inks = [];

            pub_ds.addInk = function(ink){
                inks.push(ink);
            };

            pub_ds.clear = function(){
                inks = [];
            };

            pub_ds.draw = function(canv_ctx){
                if(cur_recording_Ink){
                    cur_recording_Ink.DrawSegments(canv_ctx);
                }
                inks.forEach(function(ink){
                    ink.DrawSegments(canv_ctx);
                });
            };

            return pub_ds;
        }());

        pub.recordingInkDn = function(pt, target_annot){
            var piece = r2App.cur_page.GetPieceByHitTest(pt);
            cur_recording_Ink_piece = piece;
            if(piece){
                var ink = new r2.Ink();
                ink.SetInk(
                    piece.GetId(),
                    target_annot.GetUsername(),
                    target_annot.GetId(),
                    [r2App.cur_time-target_annot.GetBgnTime(),r2App.cur_time-target_annot.GetBgnTime()],
                    r2App.cur_pdf_pagen
                );

                var segment  = new r2.Ink.Segment();
                segment.SetSegment(piece.GetId(), [pt.subtract(piece.pos, true)]);

                ink.AddSegment(segment);

                cur_recording_Ink = ink;
                cur_recording_Ink_segment = segment;
                cur_recording_Ink_segment_piece = piece;
                cur_recording_Ink_pt = pt;
            }
        };

        pub.recordingInkMv = function(pt, target_annot){
            if(cur_recording_Ink && cur_recording_Ink_segment){
                var piece = r2App.cur_page.GetPieceByHitTest(pt);
                if(piece === cur_recording_Ink_segment_piece){
                    if(piece){
                        // add point
                        cur_recording_Ink_segment.AddPt(pt.subtract(piece.pos, true));
                        cur_recording_Ink._t_end = r2App.cur_time-target_annot.GetBgnTime();
                    }
                    else{
                        // cut segment
                        cur_recording_Ink_segment = null;
                    }
                }
                else{
                    // cut segment
                    cur_recording_Ink_segment = null;
                    if(piece){
                        // add new segment and add point
                        var segment  = new r2.Ink.Segment();
                        segment.SetSegment(piece.GetId(), [pt.subtract(piece.pos, true)]);
                        if(segment.GetNumPts()>0){
                            cur_recording_Ink.AddSegment(segment);
                        }
                        cur_recording_Ink_segment = segment;
                        cur_recording_Ink._t_end = r2App.cur_time-target_annot.GetBgnTime();
                    }
                }
                cur_recording_Ink_segment_piece=piece;
                cur_recording_Ink_pt = pt;
            }
        };

        pub.recordingInkUp = function(pt, target_annot){
            if(cur_recording_Ink){
                cur_recording_Ink.smoothing();
                cur_recording_Ink_piece.addInk(target_annot.GetId(),cur_recording_Ink);
                target_annot.addInk(cur_recording_Ink, toupload = true);
                pub.dynamicScene.addInk(cur_recording_Ink);
                if(cur_recording_Ink_segment){
                    cur_recording_Ink_segment = null;
                }

                cur_recording_Ink_pt = null;
                cur_recording_Ink = null;
                r2App.invalidate_dynamic_scene = true;
                return true;
            }
            else{
                cur_recording_Ink = null;
                return false;
            }
        };

        pub.eraser = (function(){
            var pub_er = {};

            var pos = null;
            var eraser_dn_time = null;
            var reserved_operations = [];
            var uploader = new r2.CmdTimedUploader();
            uploader.init(r2Const.TIMEOUT_STATIC_INK_UPDATE);

            pub_er.dn = function(){
                eraser_dn_time = r2App.cur_time;
            };

            pub_er.up = function(){
                if(reserved_operations.length){
                    uploader.addCmd(createCmd());
                }
                pos = null;
                r2App.invalidate_dynamic_scene = true;
            };

            pub_er.mv = function(pt){
                var inks = [];
                r2App.cur_page.RunRecursive('getCollidingInks', [pt, inks]);
                pos = pt;
                r2App.invalidate_dynamic_scene = true;
                if(inks.length){
                    for(var i = 0, l = inks.length; i < l; ++i){
                        reserved_operations.push(inks[i].erase(true)); // to_upload
                    }
                    r2App.invalidate_page_layout = true;
                }
            };

            pub_er.draw = function(ctx){
                if(pos){
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, r2Const.ERASER_RADIUS, 0, 2 * Math.PI, false);
                    ctx.lineWidth = 0.001;
                    ctx.strokeStyle = '#003300';
                    ctx.stroke();
                }
            };

            pub_er.getCmdsToUpload = function(){
                return uploader.getCmdsToUpload();
            };

            function createCmd(){
                var cmd ={};
                cmd.time = new Date(eraser_dn_time).toISOString();
                cmd.user = r2.userGroup.cur_user.name;
                cmd.op = 'DeleteComment';
                cmd.type = 'Inks';
                cmd.target = {
                    type: 'Inks'
                };
                cmd.data = reserved_operations.slice(0); // clone array

                reserved_operations = [];

                return cmd;
            }

            return pub_er;
        }());

        return pub;
    }());

    r2.spotlightCtrl = (function(){
        var pub = {};

        var cur_recording_spotlight = null;
        var cur_recording_spotlight_segment = null;
        var cur_recording_spotlight_segment_piece = null;
        var cur_recording_spotlight_pt = null;

        pub.nowRecording = function(){
            return cur_recording_spotlight !== null;
        };

        pub.drawDynamicSceneBlob = function(canv_ctx, isprivate, color){
            if(cur_recording_spotlight_pt){
                r2.Spotlight.Cache.prototype.drawMovingBlob(
                    cur_recording_spotlight_pt,
                    cur_recording_spotlight_pt,
                    isprivate,
                    color,
                    canv_ctx
                );
            }
            if(cur_recording_spotlight){
                cur_recording_spotlight.Draw(canv_ctx);
            }
            if(cur_recording_spotlight_segment){
                //cur_recording_spotlight_segment.Draw(canv_ctx, true);
            }
        };

        pub.recordingSpotlightDn = function(pt, target_annot){
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

                cur_recording_spotlight = spotlight;
                cur_recording_spotlight_segment = segment;
                cur_recording_spotlight_segment_piece = piece;
                cur_recording_spotlight_pt = pt;
            }
        };

        pub.recordingSpotlightMv = function(pt, target_annot){
            if(cur_recording_spotlight && cur_recording_spotlight_segment){
                var piece = r2App.cur_page.GetPieceByHitTest(pt);
                if(piece === cur_recording_spotlight_segment_piece){
                    if(piece){
                        // add point
                        cur_recording_spotlight_segment.AddPt(pt.subtract(piece.pos, true));
                        cur_recording_spotlight.t_end = r2App.cur_time-target_annot.GetBgnTime();
                    }
                    else{
                        // cut segment
                        cur_recording_spotlight_segment = null;
                    }
                }
                else{
                    // cut segment
                    cur_recording_spotlight_segment = null;
                    if(piece){
                        // add new segment and add point
                        var segment  = new r2.Spotlight.Segment();
                        segment.SetSegment(piece.GetId(), [pt.subtract(piece.pos, true)]);
                        if(segment.GetNumPts()>0){
                            cur_recording_spotlight.AddSegment(segment);
                        }
                        cur_recording_spotlight_segment = segment;
                        cur_recording_spotlight.t_end = r2App.cur_time-target_annot.GetBgnTime();
                    }
                }
                cur_recording_spotlight_segment_piece = piece;
                cur_recording_spotlight_pt = pt;
            }
        };

        pub.recordingSpotlightUp = function(pt, target_annot){
            if(cur_recording_spotlight){
                if(cur_recording_spotlight_segment){
                    cur_recording_spotlight_segment = null;
                }
                if(cur_recording_spotlight.segments.length>0){
                    target_annot.AddSpotlight(cur_recording_spotlight, toupload = true);
                }
                cur_recording_spotlight_pt = null;
                r2App.cur_page.refreshSpotlightPrerender();

                cur_recording_spotlight = null;
                r2App.invalidate_dynamic_scene = true;
                r2App.invalidate_static_scene = true;
                return true;
            }
            else{
                cur_recording_spotlight = null;
                return false;
            }
        };

        pub.recordingSpotlightCancel = function(){
            cur_recording_spotlight_segment = null;
            cur_recording_spotlight_pt = null;
            cur_recording_spotlight = null;
        };

        return pub;
    }());

    var replacePieceAudioToPieceKeyboard = function(){
        var annotid = r2App.cur_recording_annot.GetId();
        r2.recordingCtrl.stop(false);
        r2.removeAnnot(annotid, askuser = false, mute = true);
        r2.log.Log_Simple("Recording_Stop_CancelForTextComment");

        createPieceKeyboard(isprivate = false);
        r2.log.Log_Simple("CreatePieceKeyboard_Enter");
    };

    var createPieceTeared = function(){
        var anchorpiece = r2App.pieceSelector.get();
        if(anchorpiece){
            if(anchorpiece instanceof r2.PieceTeared && anchorpiece.getUsername() === r2.userGroup.cur_user.name){
                return anchorpiece;
            }
            else{
                var creation_time = new Date(r2App.cur_time);
                var pieceteared = new r2.PieceTeared();
                pieceteared.SetPiece(
                    r2.pieceHashId.teared(creation_time.toISOString()),
                    creation_time,
                    new Vec2(anchorpiece._cnt_size.x, 0.05),
                    anchorpiece.GetTTData()
                );
                pieceteared.SetPieceTeared(r2.userGroup.cur_user.name);
                anchorpiece.AddChildAtFront(pieceteared);

                r2.dom_model.createTextTearing(pieceteared);

                r2App.invalidate_size = true;
                r2App.invalidate_page_layout = true;
                return pieceteared;
            }
        }
        return null;
    };

    var createPieceKeyboard = function(isprivate){
        if(r2App.disable_comment_production){
            alert('This page is only for the review. Features for creating comments are disabled.');
            return;
        }
        var anchorpiece = null;
        if(r2App.mode == r2App.AppModeEnum.REPLAYING){
            r2.log.Log_AudioStop('createPieceKeyboard', r2.audioPlayer.getCurAudioFileId(), r2.audioPlayer.getPlaybackTime());
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
                r2.pieceHashId.keyboard(annotid),
                r2App.cur_time,
                anchorpiece.GetNewPieceSize(),
                anchorpiece.GetTTData()
            );

            piecekeyboard.SetPieceKeyboard(
                anchorpiece.GetId(), annotid, r2.userGroup.cur_user.name, '', isprivate, anchorpiece.IsOnLeftColumn()
            );
            anchorpiece.AddChildAtFront(piecekeyboard);
            piecekeyboard.Focus();
            r2Sync.uploader.pushCmd(piecekeyboard.ExportToCmd());

            r2App.invalidate_size = true;
            r2App.invalidate_page_layout = true;
        }
    };

    r2.pageNumBox = (function(){
        var pub = {};
        var page_nav_input_dom = null;

        pub.init = function(){
            page_nav_input_dom = document.getElementById('page_nav_input');

            page_nav_input_dom.addEventListener('focus', function(){
                r2.keyboard.setMode(r2.KeyboardModeEnum.TEXTBOX);
            });
            page_nav_input_dom.addEventListener('blur', function(){
                r2.keyboard.setMode(r2.KeyboardModeEnum.NORMAL);
            });
            page_nav_input_dom.addEventListener('keydown', function(e){
                if(e.which == 13) {
                    r2.booklet.goToAbsPage(parseInt(page_nav_input_dom.value)-1, 0);
                }
            });
        };

        return pub;
    }());

}(window.r2 = window.r2 || {}));
