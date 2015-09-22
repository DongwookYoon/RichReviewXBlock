/**
 * Created by Dongwook on 10/18/2014.
 */

/** @namespace r2 */
(function(r2){
    "use strict";

    /** main procedures that updates and draws the scene */
    r2.loop = (function(){
        var pub = {};

        /** update and draw callback */
        pub.tick = function(){
            requestAnimFrame(pub.tick);

            try {
                update();

                if(r2App.invalidate_page_layout){
                    r2App.cur_page.Relayout();
                    r2.dom_model.relayoutPage();
                    r2App.invalidate_page_layout = false;
                }

                if(r2App.invalidate_size){
                    r2.resizeWindow();
                    r2App.invalidate_size = false;
                }

                if(r2App.invalidate_static_scene){
                    drawStaticScene();
                    r2App.invalidate_static_scene = false;
                }

                if(r2App.mode !== r2App.AppModeEnum.IDLE || r2.spotlightCtrl.nowRecording()){
                    r2App.invalidate_dynamic_scene = true;
                }
                if(r2App.invalidate_dynamic_scene){
                    drawDynamicScene();
                    r2App.invalidate_dynamic_scene = false;
                }
            }
            catch(err) {
                r2.util.handleError(err, r2Const.ERROR_MSG);
            }
        };

        /** update the scene */
        function update(){
            r2App.asyncErr.sync();

            r2App.cur_time = new Date().getTime();

            updateFromAudioStatus();

            if(r2App.mode == r2App.AppModeEnum.REPLAYING || r2App.mode == r2App.AppModeEnum.IDLE){
                // upload spotlight cmds
                var private_spotlight_cmds_to_upload = r2App.annot_private_spotlight.GetCmdsToUpload();
                if(private_spotlight_cmds_to_upload){
                    r2Sync.PushToUploadCmd(private_spotlight_cmds_to_upload);
                }

                // upload and download cmds
                r2Sync.loop();

                triggerReservedRecordingBgn();
            }
            else if(r2App.mode == r2App.AppModeEnum.RECORDING){
                r2.recordingUpdate();
            }

            r2.log.Consume(true); // delayed consumption of the log upload queue
        }

        var updateFromAudioStatus = function(){
            r2App.cur_audio_time = r2.audioPlayer.getPlaybackTime();
            r2App.cur_annot_id = r2.audioPlayer.getCurAudioFileId();

            var status_transition = r2.audioPlayer.getStatusChange();
            if(status_transition !== null && status_transition !== r2.audioPlayer.Status.LOADING){
                if(status_transition === r2.audioPlayer.Status.UNINITIALIZE ||
                    status_transition === r2.audioPlayer.Status.STOPPED){
                    r2App.mode = r2App.AppModeEnum.IDLE;
                }
                else if(status_transition === r2.audioPlayer.Status.PLAYING){
                    r2App.mode = r2App.AppModeEnum.REPLAYING;
                }
                pub.invalidate_dynamic_scene = true;
            }
        };

        var triggerReservedRecordingBgn = function(){
            if(r2App.recordingTrigger.isReady()){
                if(r2App.mode === r2App.AppModeEnum.REPLAYING){
                    r2.rich_audio.stop();
                }
                if(r2App.mode === r2App.AppModeEnum.IDLE && r2.audioPlayer.isIdle()){
                    r2App.recordingTrigger.bgn();
                }
            }
        };

        function initCanvasCtx(canvas_ctx) {
            canvas_ctx.setTransform(1, 0, 0, 1, 0, 0);
            canvas_ctx.clearRect(0, 0, r2.viewCtrl.canv_px_size.x, r2.viewCtrl.canv_px_size.y);

            canvas_ctx.scale(r2.viewCtrl.canv_px_size.x, r2.viewCtrl.canv_px_size.x);
        }

        /** draws the scene */
        function drawStaticScene() {
            initCanvasCtx(r2.canv_ctx);

            r2App.cur_page.drawBackgroundWhite();
            r2App.cur_page.RunRecursive('DrawPiece');
            r2App.cur_page.RunRecursive('DrawInk');

            r2App.cur_page.drawSpotlightPrerendered();
        }

        function drawDynamicScene(){
            initCanvasCtx(r2.annot_canv_ctx);

            r2App.cur_page.RunRecursive('DrawPieceDynamic', [r2App.cur_annot_id, r2.annot_canv_ctx]);

            r2App.cur_page.RunRecursive('drawInkReplaying', [r2.annot_canv_ctx]);

            r2App.cur_page.drawReplayBlob(r2.annot_canv_ctx);

            r2.spotlightCtrl.drawDynamicSceneBlob(
                r2.annot_canv_ctx,
                r2App.mode === r2App.AppModeEnum.RECORDING ? false : true, // isprivate
                r2App.mode === r2App.AppModeEnum.RECORDING ? r2.userGroup.cur_user.color_splight_dynamic : r2.userGroup.cur_user.color_splight_private
            );

            if(r2App.cur_recording_pieceaudios){
                for(var i = 0; i < r2App.cur_recording_pieceaudios.length; ++i){
                    r2App.cur_recording_pieceaudios[i].DrawPieceDynamic(null, r2.annot_canv_ctx, true); // force
                }
            }
            r2.spotlightCtrl.drawDynamicSceneTraces(r2.annot_canv_ctx);

            r2App.pieceSelector.draw(r2.annot_canv_ctx);
        }

        return pub;
    }());

    /** main app initializer*/
    r2.main = (function(){
        var pub = {};

        pub.Run = function(resource_urls) {
            r2.HtmlTemplate.initHT(resource_urls).then(
                function(){
                    return checkPlatform();
                }
            ).then(
                function(){
                    return initAudioPlayer();
                }
            ).then(
                function(){
                    return initAudioRecorder(resource_urls);
                }
            ).then(
                function(){
                    r2.dom.initDom();
                    r2.canv_ctx = r2.dom.getPageCanvCtx();
                    r2.annot_canv_ctx = r2.dom.getAnnotCanvCtx();

                    r2.resizeWindow({});

                    r2.onScreenButtons.Init();
                    r2.mouse.setDomEvents();
                }
            ).then(
                initUserSet
            ).then(
                getDocMetaData
            ).then(
                setDocs
            ).then(
                getDocPdf
            ).then(
                r2.pdfRenderer.initPdfRenderer
            ).then(
                function(){
                    initR2();
                    initSystem();
                    r2.loop.tick();
                }
            ).catch(r2.util.handleError);
        };

        function checkPlatform(){
            if(r2.ctx["pmo"] == ""){ // pass mobile is not set
                if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                    r2.coverMsg.Show([
                        "RichReviewWebApp does not support mobile platform yet.",
                        "Please try again in a desktop or laptop browser."
                    ]);
                    throw new Error("RichReviewWebApp does not support mobile platform yet.");
                }
            }
        }

        function initAudioPlayer(){
            r2.audioPlayer.cbPlay(
                function(annot_id){
                    r2.dom_model.cbAudioPlay(annot_id);
                }
            );
            r2.audioPlayer.cbStop(
                function(annot_id){
                    r2.dom_model.cbAudioStop(annot_id);
                }
            );
            return;
        }

        function initAudioRecorder(resource_urls){
            if(r2.ctx["pmo"] !== "") { // pass mobile is not set
                return;
            }
            return r2.audioRecorder.Init(resource_urls).then(
                function(){
                    r2.coverMsg.Show([""]);
                }
            ).catch(
                function (){
                    r2.coverMsg.Show([
                        "Failed to set up your mic. Please check the following:",
                        "1. Your machine's mic is working.",
                        "2. Your browser was updated to the latest version.",
                        "3. Go to the Browser setting by copy and paste  chrome://settings/content  to the address bar,",
                        "And, in the Media -> Manage exceptions..., remove blocks of microphone resources to our website.",
                        "If nothing helps, please report this to the manager (dy252@cornell.edu). Thank you."
                    ]);
                    throw new Error("Failed to set up your mic.");
                }
            );
        }

        function initUserSet(){
            return r2.util.postToDbsServer(
                'GetGroupData',
                {docid: r2.ctx["docid"], groupid:"grp:" + r2.ctx["groupid"]}
            ).then(
                function(groupdata){
                    return r2.userGroup.Set(groupdata)
                }
            );
        }

        function getDocMetaData(){
            r2.modalWindowLoading.showModalWindow();
            r2.modalWindowLoading.bgnDownloadingMetafile();
            return r2.util.getUrlData(
                r2.util.normalizeUrl(r2.ctx.pdfjs_url),
                "",
                function (progress){
                    r2.modalWindowLoading.setDocProgress(progress);
                }
            ).then(
                function(docjs){
                    r2.modalWindowLoading.endDownloadingMetafile();
                    return docjs;
                }
            );
        }

        function setDocs(docjs_str){
            var docjs = JSON.parse(docjs_str);

            var doc_json_upgrade_legacy = function(docjs){
                for(var i = 0; i < docjs['pages'].length; ++i){
                    var pagejs = docjs['pages'][i];
                    pagejs.bbox = [pagejs.v0[0], pagejs.v0[1], pagejs.v1[0], pagejs.v1[1]];

                    pagejs.rgns = [];
                    for(var j = 0; j < pagejs.regions.length; ++j){
                        var rgnjs = pagejs.regions[j];
                        pagejs.rgns.push(rgnjs);
                        rgnjs.rects = [];
                        var tt_x0 = Number.NEGATIVE_INFINITY;
                        var tt_x1 = Number.POSITIVE_INFINITY;

                        for(var k = 0; k < rgnjs.pieces.length; ++k){
                            var piecejs = rgnjs.pieces[k];
                            if(piecejs.Type === 'PieceText'){
                                var rect = [piecejs.v0[0], piecejs.v0[1], piecejs.v1[0], piecejs.v1[1]];
                                rect.id = piecejs.id;
                                rgnjs.rects.push(rect);
                            }
                            tt_x0 = Math.max(tt_x0, piecejs.tt_x0);
                            tt_x1 = Math.min(tt_x1, piecejs.tt_x1);
                        }
                        rgnjs.ttX = tt_x0;
                        rgnjs.ttW = tt_x1-tt_x0;
                    }
                }
                return docjs;
            };


            if(docjs.hasOwnProperty("ver") && docjs.ver >= 6){
                return setFromJs(docjs);
            }
            else{
                doc_json_upgrade_legacy(docjs);
                return setFromLegacyDoc(docjs);
            }

            function setFromJs(docjs){
                r2App.doc = r2.createDoc.createR2DocFromDocJs(docjs);
                r2.dom_model.init(r2App.doc);
            }

            function setFromLegacyDoc(docjs){
                return r2Legacy.SetDoc(docjs).then(
                    function(){
                        r2App.doc = r2.createDoc.extractDocFromLegacyDoc(r2Legacy.doc);
                        r2.dom_model.init(r2App.doc);
                        var cmds = r2.createDoc.extractCmdsFromLegacyDoc(r2Legacy.doc);
                        for(var i = 0; i < cmds.length; ++i){
                            r2.cmd.executeCmd(r2App.doc, cmds[i], true, false); // legacy_user_only, skip_self
                        }
                    }
                );
            }
        }

        function getDocPdf(){
            return r2.util.getPdf(r2.util.normalizeUrl(r2.ctx.pdf_url));
        }

        /** init r2 after loading document */
        function initR2(){
            r2App.invalidate_dynamic_scene = true;
            r2App.cur_time = new Date().getTime();

            var annot_private_spotlight_id = r2.userGroup.cur_user.GetAnnotPrivateSpotlightId();
            r2App.annot_private_spotlight = new r2.AnnotPrivateSpotlight();
            r2App.annot_private_spotlight.SetAnnot(annot_private_spotlight_id, null, 0, 0, [], r2.userGroup.cur_user.name, "");
            r2App.annots[annot_private_spotlight_id] = r2App.annot_private_spotlight;

            r2.booklet.initBooklet();
            r2.cheatSheet.Init();

            if(r2.ctx["comment"] != ''){
                var searchresult = r2App.doc.SearchPieceByAnnotId(r2.ctx["comment"]);
                r2.turnPageAndSetFocus(searchresult);
            }

            r2.coverMsg.Hide();
            r2.modalWindowLoading.hideModalWindow();
            r2.modalWindowIntro.Init();

            r2.log.Log_Simple('DoneLoading');
        }

        /** init system */
        function initSystem() {
            // render ticks
            window.requestAnimFrame = (function () {
                return window.requestAnimationFrame ||
                    window.webkitRequestAnimationFrame ||
                    window.mozRequestAnimationFrame ||
                    window.oRequestAnimationFrame ||
                    window.msRequestAnimationFrame ||
                    function (callback) {
                        window.setTimeout(callback, r2Const.TIMEOUT_FRAMERATE);
                    };
            })();

            // resize event handle
            $(window).resize(function () {
                if (this.resize_time_out) clearTimeout(this.resize_time_out);
                this.resize_time_out = setTimeout(function () {
                    $(this).trigger('resizeEvent');
                }, r2Const.TIMEOUT_RESIZE_DELAY);
            });
            $(window).bind('resizeEvent', function () {
                r2App.invalidate_size = true;
            });

            // disable tablet bumping
            document.addEventListener("touchmove", function (event) {
                event.preventDefault();
            });
            var scrollingDiv = document.getElementById('scrollDiv');
            if (scrollingDiv) {
                scrollingDiv.addEventListener('touchmove', function (event) {
                    event.stopPropagation();
                });
            }

            // prevent data loss
            window.onbeforeunload = function () {
                r2.log.Consume(false); // delayed
                var now_tying = r2.keyboard.getMode() === r2.KeyboardModeEnum.FOCUSED &&
                    r2App.cur_focused_piece_keyboard != null &&
                    r2App.cur_focused_piece_keyboard.WasChanged();
                var now_uploading = r2Sync.NowUploading();
                if (now_tying || now_uploading || r2App.annot_private_spotlight.changed) {
                    if (now_tying)
                        $(r2App.cur_focused_piece_keyboard.dom_textarea).blur();
                    return "The webapp is uploading your note. Please wait for seconds, and retry.";
                }
            };

            // enable bootstrap tooltips
            $(function () {
                $('[data-toggle="tooltip"]').tooltip()
            });
            $('.r2-tooltip').tooltip();

            r2.dom.setContextMenuEvent(
                function(){
                    return !r2.keyboard.ctrlkey_dn; // disables the context menu when <Ctrl> key is pressed.
                }
            );
        }

        return pub;
    })();

}(window.r2 = window.r2 || {}));