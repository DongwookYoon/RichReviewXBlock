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
		var pendown =false;
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

		pub.getPos = function(event){
			return r2.viewCtrl.mapBrowserToScr(new Vec2(event.clientX, event.clientY))
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
						//event.preventDefault();
						break;
					case "pen":
						//alert("test");
						event.preventDefault();
						r2.tabletInteraction.penDown(event);
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
				switch (event.pointerType) {
					case "mouse":
						//event.preventDefault();
						break;
					case "pen":
						event.preventDefault();
						r2.tabletInteraction.penMv(event);
						break;
					case "touch":
						r2.tabletInteraction.touchMove(event);
						break;
					default:
						alert("strange pointerType");
						break;
				}
			};

			pub_ps.handleUp = function(event){
                switch (event.pointerType) {
                    case "mouse":
                        //event.preventDefault();
                        break;
                    case "pen":
						event.preventDefault();
                        r2.tabletInteraction.penUp(event);
                        break;
                    case "touch":
                        r2.tabletInteraction.touchEnd(event);
                        break;
                    default:
                        alert("strange pointerType");
                        break;
                }
			};
			pub_ps.handleEn = function(event){
			};
			pub_ps.handleLv = function(event){

			};
			return pub_ps;
		}());

        pub.penNonSupportedHandler = (function(){
            var pub = {};
            r2.PenModeEnum = {
                IDLE: 0,
                GESTURE: 1,
                INKING: 2
            };
            pub.penMode = r2.PenModeEnum.IDLE;
            pub.mode = r2.MouseModeEnum.HOVER;

			pub.setDomEvents = function(){
				r2.dom.setTouchEventHandlers(
					r2.tabletInteraction.touchStart,
					r2.tabletInteraction.touchMove,
					r2.tabletInteraction.touchEnd,
					r2.tabletInteraction.touchCancel
				);

                //set mouse events
                r2.dom.setMouseEventHandlers(
                    pub.mouseDn,
                    pub.mouseMv,
                    pub.mouseUp
                );

			};

            pub.hoverTimer = null;

            pub.pos_dn = new Vec2(0, 0);

            pub.getPos = function(event){
                return r2.viewCtrl.mapBrowserToScr(new Vec2(event.clientX, event.clientY))
            };

            pub.isTap = function(pt){
                var d = pub.pos_dn.subtract(pt, true);
                d = Math.sqrt(d.x * d.x + d.y * d.y) * r2.viewCtrl.page_width_noscale;
                return d < r2Const.MOUSE_CLICK_DIST_CRITERIA;
            };


            pub.stopTimer = function() {
                if (pub.hoverTimer != null) {
                    clearTimeOut(pub.hoverTimer);
                    pub.hoverTimer = null;
                }
            };

            pub.mouseDn = function(event){
                var new_mouse_pt = pub.getPos(event);
                //if (pub.mode === r2.MouseModeEnum.HOVER) {
                    switch (event.which) {
                        case 1: // left click
                            //pub.mode = r2.MouseModeEnum.LDN;
                            pub.pos_dn = new_mouse_pt;
                            if(r2App.mode == r2App.AppModeEnum.IDLE || r2App.mode == r2App.AppModeEnum.REPLAYING){
                                if(r2.keyboard.ctrlkey_dn)
                                    r2.spotlightCtrl.recordingSpotlightDn(r2.viewCtrl.mapScrToDoc(new_mouse_pt), r2App.annot_private_spotlight);
                            }
                            else if(r2App.mode == r2App.AppModeEnum.RECORDING){
                                if (pub.penMode == r2.PenModeEnum.GESTURE) { // stop previous gesture
                                    pub.hoverOut(event);
                                }
                                pub.penMode = r2.PenModeEnum.INKING;
                                //TODO Call Inking
                                //r2.spotlightCtrl.recordingSpotlightDn(r2.viewCtrl.mapScrToDoc(new_mouse_pt), r2App.cur_recording_annot);
                            }
                            break;
                        default:
                            break;
                    }
                //}
                r2App.cur_mouse_pt = new_mouse_pt;
            };

            pub.mouseMv = function(event){
                var new_mouse_pt = pub.getPos(event);

                /*
                if(pub.mode == r2.MouseModeEnum.HOVER){
                    // select piece
                    r2App.pieceSelector.update(r2App.cur_mouse_pt);
                }
                */
                //else if(pub.mode == r2.MouseModeEnum.LDN){
                    if(r2App.mode == r2App.AppModeEnum.IDLE || r2App.mode == r2App.AppModeEnum.REPLAYING){
                        if(r2.spotlightCtrl.nowRecording()){
                            r2.spotlightCtrl.recordingSpotlightMv(r2.viewCtrl.mapScrToDoc(new_mouse_pt), r2App.annot_private_spotlight);
                        }
                        else{
                            r2.onScreenButtons.drawDnMv(pub.pos_dn, new_mouse_pt);
                        }
                    }
                    else if(r2App.mode == r2App.AppModeEnum.RECORDING){
                        if (pub.penMode == r2.PenModeEnum.IDLE) {
                            pub.penMode = r2.PenModeEnum.GESTURE;
                            r2.spotlightCtrl.recordingSpotlightDn(r2.viewCtrl.mapScrToDoc(new_mouse_pt), r2App.cur_recording_annot);
                            pub.hoverIn(event);
                        }
                        else if (pub.penMode == r2.PenModeEnum.GESTURE) {
                            r2.spotlightCtrl.recordingSpotlightMv(r2.viewCtrl.mapScrToDoc(new_mouse_pt), r2App.cur_recording_annot);
                        }
                        else if (pub.penMode == r2.PenModeEnum.INKING) {
                            //TODO FINISH PREVIOUS INKING

                            pub.penMode = r2.PenModeEnum.GESTURE;
                            r2.spotlightCtrl.recordingSpotlightDn(r2.viewCtrl.mapScrToDoc(new_mouse_pt), r2App.cur_recording_annot);
                            pub.hoverIn(event);

                        }
                    }
                //}

                r2App.cur_mouse_pt = new_mouse_pt;
            };

            pub.mouseUp = function(event){
                var new_mouse_pt = pub.getPos(event);
                if(r2App.mode == r2App.AppModeEnum.IDLE || r2App.mode == r2App.AppModeEnum.REPLAYING){
                    if (!in_menu && pub.isTap(new_mouse_pt)) {
                        pub.handleTimeIndexingUp(r2.viewCtrl.mapScrToDoc(new_mouse_pt));
                    }
                    if(r2.spotlightCtrl.recordingSpotlightUp(r2.viewCtrl.mapScrToDoc(new_mouse_pt), r2App.annot_private_spotlight)){
                        r2App.annot_private_spotlight.timeLastChanged = (new Date()).getTime();
                        r2App.annot_private_spotlight.changed = true;
                    }
                }
                else if(r2App.mode == r2App.AppModeEnum.RECORDING){
                    if (pub.penMode == r2.PenModeEnum) {
                        //TODO INKING UP
                    }
                }
            };

            pub.hoverIn = function(event){
                //clear old timer and set new timer
                pub.stopTimer();
                pub.hoverTimer = setTimeout(function() {pub.hoverOut(event);}, 50);
            };

            pub.hoverOut = function(event){
                var new_mouse_pt = pub.getPos(event);
               r2.spotlightCtrl.recordingSpotlightUp(r2.viewCtrl.mapScrToDoc(new_mouse_pt), r2App.cur_recording_annot);
            };


            return pub;

        }());

		pub.touchStart = function(evt){
			//alert("touchStart");
			//evt.preventDefault();
			//pub.penDown(evt.changedTouches[0]);
			if(in_menu){
				//evt.preventDefault()
			}
        };
        pub.touchEnd = function(evt) {
			if(in_menu){
				//evt.preventDefault()
			}
			//evt.preventDefault();
			//pub.penUp(evt.changedTouches[0]);
        };
		pub.touchCancel = function(evt) {
			if(in_menu){
				//evt.preventDefault()
			}
        };
        pub.touchMove = function(evt) {
			//evt.preventDefault();
			//pub.penMv(evt.changedTouches[0]);
        };
		pub.penIn = function(evt){

        };
        pub.penDown = function(evt) {
			var new_pen_pt = pub.getPos(evt);
			pub.pendown =true;
			pub.pos_dn = new_pen_pt;
			if(r2App.mode == r2App.AppModeEnum.IDLE || r2App.mode == r2App.AppModeEnum.REPLAYING){
				//r2.spotlightCtrl.recordingSpotlightDn(r2.viewCtrl.mapScrToDoc(new_pen_pt), r2App.annot_private_spotlight);
			}
			else if(r2App.mode == r2App.AppModeEnum.RECORDING){
				r2.inkCtrl.recordingInkDn(r2.viewCtrl.mapScrToDoc(new_pen_pt), r2App.cur_recording_annot);
			}
        };
		pub.penMv = function(evt) {

            var new_pen_pt = pub.getPos(evt);
            if(pub.pendown){
                if(r2App.mode == r2App.AppModeEnum.IDLE || r2App.mode == r2App.AppModeEnum.REPLAYING){
                    if(r2.inkCtrl.nowRecording()){
                        //r2.inkCtrl.recordingInkMv(r2.viewCtrl.mapScrToDoc(new_pen_pt), r2App.annot_private_spotlight);
                    }
                }
                else if(r2App.mode == r2App.AppModeEnum.RECORDING){
                    r2.inkCtrl.recordingInkMv(r2.viewCtrl.mapScrToDoc(new_pen_pt), r2App.cur_recording_annot);
                }
            }

            //r2App.cur_mouse_pt = new_mouse_pt;
        };
        pub.penUp = function(evt) {
			var new_pen_pt = pub.getPos(evt);
			if(pub.pendown){
				pub.pendown = false;
				if(r2App.mode == r2App.AppModeEnum.IDLE || r2App.mode == r2App.AppModeEnum.REPLAYING){
					if(r2.inkCtrl.nowRecording()){
						//r2.inkCtrl.recordingInkMv(r2.viewCtrl.mapScrToDoc(new_pen_pt), r2App.annot_private_spotlight);
					}
				}
				else if(r2App.mode == r2App.AppModeEnum.RECORDING){
					r2.inkCtrl.recordingInkUp(r2.viewCtrl.mapScrToDoc(new_pen_pt), r2App.cur_recording_annot);
				}
			}

			//r2App.cur_mouse_pt = new_mouse_pt;
        };
		pub.penLv = function(evt) {

		};
        return pub;

    }());

	r2.inkCtrl = (function(){
		var pub = {};
		var cur_recording_ink = null;
		var cur_recording_ink_piece = null;
		//var cur_recording_ink_pts = [];

		pub.nowRecording = function(){
			return cur_recording_ink !== null;
		};

		/*pub.drawDynamicSceneBlob = function(canv_ctx, isprivate, color){
			if(cur_recording_ink._pt){
				r2.Ink.Cache.prototype.Relayout(cur_recording_ink._pt);
			}
		};*/

		pub.drawDynamicSceneTraces = function() {

			if (cur_recording_ink !== null) {

				//alert("called");
				cur_recording_ink.Draw();
			}
		};

		pub.recordingInkDn = function(pt, target_annot){
			var piece = r2App.cur_page.GetPieceByHitTest(pt);
			//alert(piece==null);
			if(piece){

				var curInk = new r2.Ink();
				curInk.SetInk(
					target_annot.GetAnchorPid(),
					target_annot.GetUsername(),
					[pt.subtract(piece.pos, true)],
					target_annot.GetId(),
					[r2App.cur_time-target_annot.GetBgnTime(),r2App.cur_time-target_annot.GetBgnTime()]);
				cur_recording_ink = curInk;
				cur_recording_ink_piece = piece;
				//alert(cur_recording_ink._pts.length);
			}
		};
		pub.recordingInkMv = function(pt, target_annot){
			if(cur_recording_ink){
				var piece = r2App.cur_page.GetPieceByHitTest(pt);
				if(piece === cur_recording_ink_piece){

					if(piece){
						// add point
						cur_recording_ink._pts.push(pt.subtract(piece.pos, true));
						cur_recording_ink._t_end = r2App.cur_time-target_annot.GetBgnTime();
					}
					else{
						// cut segment
						//cur_recording_ink_segment = null;
					}
				}
				else{
					// cut segment
					//cur_recording_ink_segment = null;
					if(piece){
						// add new segment and add point
						/*var segment  = new r2.Ink.Segment();
						segment.SetSegment(piece.GetId(), [pt.subtract(piece.pos, true)]);
						if(segment.GetNumPts()>0){
							cur_recording_ink.AddSegment(segment);
						}
						cur_recording_ink_segment = segment;*/
						cur_recording_ink.t_end = r2App.cur_time-target_annot.GetBgnTime();
						cur_recording_ink_piece.AddInk(target_annot.GetId(),cur_recording_ink);
						var curInk = new r2.Ink();
						curInk.SetInk(
							target_annot.GetAnchorPid(),
							target_annot.GetUsername(),
							[pt.subtract(piece.pos, true)],
							target_annot.GetId(),
							[r2App.cur_time-target_annot.GetBgnTime(),r2App.cur_time-target_annot.GetBgnTime()]);
						cur_recording_ink = curInk;
						cur_recording_ink._pts.push(pt.subtract(piece.pos, true));
					}
				}
				cur_recording_ink_piece = piece;
				//cur_recording_ink_pt = pt;

			}
		};

		pub.recordingInkUp = function(pt, target_annot){
			if(cur_recording_ink){
				/*if(cur_recording_ink_segment){
					cur_recording_ink_segment = null;
				}
				if(cur_recording_ink.segments.length>0){
					target_annot.Addink(cur_recording_ink, toupload = true);
				}
				cur_recording_ink_pt = null;
				//Relayout
			*/
				//cur_recording_ink.Relayout(cur_recording_ink_piece.pos);
				if(cur_recording_ink_piece){
					cur_recording_ink_piece.AddInk(target_annot.GetId(),cur_recording_ink);
				}
				//alert(cur_recording_ink._pts.length);
				cur_recording_ink_piece=null;
				cur_recording_ink = null;
				r2App.invalidate_static_scene = true;
				r2App.invalidate_dynamic_scene = true;
				return true;
			}
			else{
				cur_recording_ink = null;
				return false;
			}
		};

		return pub;
	}());

}(window.r2 = window.r2 || {}));