(function(r2){


    r2.tabletInteraction = (function(){
        var pub = {};
        var isTabletDisplay = false;
        var isPenSupported =false;
		//pub.curPenHandler = r2.tabletInteraction.penNonSupportedHandler;
        pub.detectTabletDisplay = function(e){
            if(isTabletDisplay==true) return;
            isTabletDisplay = true;
            if(e.pointerType!==undefined){
                isPenSupported = true;
                pub.curPenHandler = r2.tabletInteraction.penSupportedHandler;
            }
            else {
                pub.curPenHandler = r2.tabletInteraction.penNonSupportedHandler;
            }
			//r2.attach(pub.curPenhandler);
        };

        

        pub.penSupportedHandler = (function(){
            var pub_ht = {};

            

            return pub_ht;
        }());

        pub.penNonSupportedHandler = (function(){
            r2.penMouseModeEnum = {
                IDLE : 0,
                HOVERIN : 1,
                HOVEROUT : 2,
                LDN : 3,
                UP : 4
            };

            var pub = {};
            pub.mode = r2.penMouseModeEnum.IDLE;

            /* not sure if useful */
            pub.pos_dn = new Vec2(0,0);
            var in_menu = false;
            pub.inMenu = function() {in_menu = true;};
            pub.outMenu = function() {in_menu = false;};
            /**/

            pub.setDomEvents = function() {
                r2.dom.setMouseEventHandlers(
                    pub.mouseDn,
                    pub.mouseMv,
                    pub.mouseUp
                );
            };

            pub.getPos = function(evt) {
                return r2.viewCtrl.mapBrowserToScr(new Vec2(evt.clientX, event.clientY))
            }

            pub.hoverTimer = null;

            pub.stopTimer = function() {
                if (pub.hoverTimer != null) {
                    clearTimeOut(pub.hoverTimer);
                    pub.hoverTimer = null;
                }
            };

            pub.mouseDn = function(evt){
               // left for inking
               // r2.mouse.handleDn(evt);
            };


            pub.mouseUp = function(evt) {
                // left for inking
            };



            pub.mouseMv = function(evt){
                pub.hoverIn(evt);
                var new_mouse_pt = pub.getPos(evt);
                if (pub.mode === r2.penMouseModeEnum.IDLE) { // first hover in
                    pub.mode = r2.penMouseModeEnum.HOVERIN;
                    pub.pos_dn = new_mouse_pt;
                    if (r2App.mode == r2App.AppModeEnum.IDLE || r2App.mode == r2App.AppModeEnum.REPLAYING) {
                        if (r2.keyboard.ctrlkey_dn)
                            r2.spotlightctrl.recordingSpotlightDn(r2.viewCtrl.mapScrToDoc(new_mouse_pt), r2App.annot_private_spotlight);
                    }
                    else if (r2App.mode == r2App.AppModeEnum.RECORDING) {
                        r2.spotlightctrl.recordingSpotlightDn(r2.viewCtrl.mapScrToDoc(new_mouse_pt), r2App.cur_recording_annot);
                    }
                }
                else if (pub.mode === r2.penMouseModeEnum.HOVERIN) { // not first hover in, in this case we need to update the selection area (similar to old mouseMv)
                    if(r2App.mode == r2App.AppModeEnum.IDLE || r2App.mode == r2App.AppModeEnum.REPLAYING){
                        if(r2.spotlightCtrl.nowRecording()){
                            r2.spotlightCtrl.recordingSpotlightMv(r2.viewCtrl.mapScrToDoc(new_mouse_pt), r2App.annot_private_spotlight);
                        }
                        else{
                            r2.onScreenButtons.drawDnMv(pub.pos_dn, new_mouse_pt);
                        }
                    }
                    else if(r2App.mode == r2App.AppModeEnum.RECORDING){
                         r2.spotlightCtrl.recordingSpotlightMv(r2.viewCtrl.mapScrToDoc(new_mouse_pt), r2App.cur_recording_annot);
                    }
                }
            };

            pub.hoverIn = function(evt){
                //clear old timer and set new timer
                pub.stopTimer();
                pub.hoverTimer = setTimeout(function() {pub.hoverOut(evt);}, 1000);
            };

            pub.hoverOut = function(evt){
                //hover out should serve as the signal of the end of a stroke (similar to old handle up)
                pub.mode = r2.penMouseModeEnum.IDLE;

                var new_mouse_pt = pub.getPos(evt);
                if (r2App.mode == r2App.AppModeEnum.RECORDING) {
                    r2.spotlightCtrl.recordingSpotlightUp(r2.viewCtrl.mapScrToDoc(new_mouse_pt), r2App.cur_recording_annot);
                }

            };

            pub.touchStart = function(evt){

            };

            pub.touchEnd = function(evt) {

            };

            pub.touchMove = function(evt) {

            };

            return pub;

        }());


        return pub;

    }());



}(window.r2 = window.r2 || {}));