(function(r2){


    r2.tabletInteraction = (function(){
        var pub = {};
        var isTabletDisplay = false;
        var isPenSupported =false;
		pub.curPenHandler = r2.tabletInteraction.generalTablets;
        pub.detectTabletDisplay = function(e){
            if(isTabletDisplay==true) return;
            isTabletDisplay = true;
            if(window.PointerEvent){
                isPenSupported = true;
                pub.curPenHandler = r2.tabletInteraction.penSupportedHandler;
            }
            else {
                pub.curPenHandler = r2.tabletInteraction.penNonSupportedHandler;
            }
			//r2.attach(pub.curPenhandler);
        };

        

        pub.penSupportedHandler = (function(){
            var pub_ps = {};
			pub.setDomEvents = function(){
				r2.dom.setPointerEventHandlers(
					pub.handleDn,
					pub.handleMv,
					pub.handleUp,
					pub.handleEn,
					pub.handleLv
				);
			};
			pub.getPos = function(event){
				return r2.viewCtrl.mapBrowserToScr(new Vec2(event.clientX, event.clientY))
			};
			//PointerEvent and mouse event togeter
			pub.handleDn = function(event){
				switch (e.pointerType) {
					case "mouse":
						break;
					case "pen":
						//do the pen thing
						break;
					case "touch":
						//do the touch thing
						break;
					default:
						break;
				}
			};

			pub.handleMv = function(event){
				
			};

			pub.handleUp = function(event){
				
			};
			pub.handleEn = function(event){
				
			};
			pub.handleLv = function(event){
				
			};
			return pub_ps;
		}());

        pub.penNonSupportedHandler = (function(){
            var pub = {};

            pub.hoverTimer = null;

            pub.stopTimer = function() {
                if (pub.hoverTimer != null) {
                    clearTimeOut(pub.hoverTimer);
                    pub.hoverTimer = null;
                }
            };

            pub.mouseDn = function(evt){
                r2.mouse.handleDn(evt);
            };

            pub.mouseMv = function(evt){
                if (r2.mouse.mode === r2.MouseModeEnum.HOVER) { // it is a pen hover move
                    r2.hoverIn(evt);
                }

                r2.mouse.handleMv(evt);
            };

            pub.mouseUp = function(evt){
                r2.mouse.handleUp(evt);
            };

            /*
            pub.hoverIn = function(evt){

            };
            */

            pub.hoverIn = function(evt){
                //clear old timer and set new timer
                pub.stopTimer();
                pub.hoverTimer = setTimeout(function() {pub.hoverOut(evt);}, 50);
            };

            pub.hoverOut = function(evt){
                //TODO
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