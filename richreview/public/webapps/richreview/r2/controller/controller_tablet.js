/*create by Yuan and Tianwei*/
/** @namespace r2 */
(function(r2){


    r2.tabletInteraction = (function(){
        var pub = {};
        var isTabletDisplay = false;
        var isPenSupported =false;
		var in_menu = false;
		var touchnowX = 0;
		var touchnowY = 0;
		pub.inMenu = function(){in_menu = true;};
        pub.outMenu = function(){in_menu = false;};
		//pub.curPenHandler = r2.tabletInteraction.penNonSupportedHandler;
		pub.tabletInit = function(){
            if(isTabletDisplay==true) return;
            isTabletDisplay = true;
			
            if(window.PointerEvent){
                isPenSupported = true;
                r2.tabletInteraction.penSupportedHandler.setDomEvents();
				pub.curPenHandler = r2.tabletInteraction.penSupportedHandler;
            }
            else {
                r2.tabletInteraction.penNonSupportedHandler.setDomEvents();
				pub.curPenHandler = r2.tabletInteraction.penNonSupportedHandler;
            }
			//r2.attach(pub.curPenhandler);
        };
        pub.detectTabletDisplay = function(){
            if(isTabletDisplay==true) return;
            isTabletDisplay = true;
			
            //pub.curPenHandler = r2.tabletInteraction.penNonSupportedHandler.adaptDomEvent();
            
			//r2.attach(pub.curPenhandler);
        };

        

        pub.penSupportedHandler = (function(){
            var pub_ps = {};
			pub_ps.setDomEvents = function(){
				r2.dom.setPointerEventHandlers(
					pub_ps.handleDn,
					pub_ps.handleMv,
					pub_ps.handleUp,
					pub_ps.handleEn,
					pub_ps.handleLv
				);
			};
			pub_ps.getPos = function(event){
				return r2.viewCtrl.mapBrowserToScr(new Vec2(event.clientX, event.clientY))
			};
			//PointerEvent and mouse event togeter
			pub_ps.handleDn = function(event){
				switch (event.pointerType) {
					case "mouse":
						break;
					case "pen":
						//alert("test");
						//do the pen thing
						break;
					case "touch":
						r2.tabletInteraction.touchStart(event);
						//do the touch thing
						//alert("t");
						break;
					default:
						alert("strange pointerType");
						break;
				}
			};

			pub_ps.handleMv = function(event){
				
			};

			pub_ps.handleUp = function(event){

			};
			pub_ps.handleEn = function(event){
			};
			pub_ps.handleLv = function(event){
				
			};
			return pub_ps;
		}());

        pub.penNonSupportedHandler = (function(){
            var pub = {};
			pub.setDomEvents = function(){
				r2.dom.setTouchEventHandlers(
					pub.touchStart,
					pub.touchMove,
					pub.touchEnd,
					pub.touchCancel
				);
				
				//r2.dom.setPenEventHandlers
			};
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

            
            return pub;

        }());

		pub.touchStart = function(evt){
			//alert("touchStart");
        };
        pub.touchEnd = function(evt) {
			
        };
		pub.touchCancel = function(evt) {
        };
        pub.touchMove = function(evt) {
			/*
			event.preventDefault();
			var touch1 = event.changedTouches[0];
			$(window).moveBy(touch1.clientX-touchnowX,touch1.clientY-touchnowY);
			touchnowX = touch1.clientX;
			touchnowY = touch1.clientY;
			*/
        };
        return pub;

    }());



}(window.r2 = window.r2 || {}));