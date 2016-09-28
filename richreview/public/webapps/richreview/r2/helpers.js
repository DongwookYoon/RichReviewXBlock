/**
 * Created by Dongwook Yoon on 11/30/14.
 */

/** @namespace r2 */
(function(r2){
    'use strict';

    /** Html Template Class */
    r2.HtmlTemplate = (function(){
        var pub = {};

        var l = [];

        var TEXTONLY_TEMPLATE = ['cheatsheet', 'cornellx_intro', 'modal-window-intro-video', 'onscrbtns'];

        pub.initHT = function(){
            var p = Promise.resolve();
            l.forEach(function(template){
                p = p.then(function(){
                    return pub.loadOnce(template)
                        .then(function(resp){
                            return $('#' + template).html(resp);
                        });
                })
            });
            return p;
        };

        pub.add = function(name){
            l.push(name);
        };

        pub.loadOnce = function(name){
            if(!r2.ctx.text_only || TEXTONLY_TEMPLATE.indexOf(name)<0){
                return r2.util.getUrlData(r2.CDN_SUBURL+'/html_templates/' + name + '.html', '');
            }
            else{
                return r2.util.getUrlData(r2.CDN_SUBURL+'/html_templates/' + name + '_textonly.html', '');
            }
        };

        return pub;
    }());

    r2.HtmlTemplate.add("r2_app_container");

    /** Modal-Window-Loading */
    r2.modalWindowLoading = (function(){
        var pub = {};

        r2.HtmlTemplate.add("modal-window-loading");

        var $dom;
        pub.showModalWindow = function(){
            $dom = $('#modal-window-loading');
            $dom.dialog({
                resizable: false,
                width: 600,
                modal: true
            });
            $('#progress-bar-loading-doc').progressbar({value:0});
            $('#progress-bar-loading-pdf').progressbar({value:0});
        };

        pub.hideModalWindow = function(){
            $dom.dialog( "close" );
        };

        pub.setDocProgress = function(progress){
            $('#progress-bar-loading-doc').progressbar({value:progress});
        };

        pub.setPdfProgress = function(progress){
            $('#progress-bar-loading-pdf').progressbar({value:progress});
        };

        pub.bgnDownloadingMetafile = function(){
            $("#progress-downmeta").toggleClass("animated", true);
        };

        pub.endDownloadingMetafile = function(){
            $("#progress-downmeta").toggleClass("animated", false);
        };

        pub.bgnDownloadingPdf = function(){
            $("#progress-downpdf").toggleClass("animated", true);
        };

        return pub;
    }());

    /** Cover message */
    r2.coverMsg = (function(){
        var pub = {};

        var $dom = null;
        var $panels = {};

        var setDoms = function(){
            $dom = $('#cover_msg');
        };

        /* z-idx
            10 - fatal error
            9 - mobile warning
            8 - errors blocking the progress
            7 - white page
        */

        pub.showUnsupportedBrowser = function(){
            show(10, 'browser_unsupported');
        };

        pub.showMobileWarning = function(){
            show(9, 'mobile_warning');
        };

        pub.showSpeechSynthFailed = function(){
            return showBrowserTemplateName('speechsynthfailed');
        };

        pub.showMicSetup = function(){
            return showBrowserTemplateName('micsetup');
        };

        pub.showMicFailed = function(){
            return showBrowserTemplateName('micfailed');
        };

        pub.hideMicSetup = function(){
            hideBrowserTemplateName('micsetup');
        };

        pub.done = function(){
        };

        pub.hide = function(template_name){
            if($dom === null){
                setDoms();
            }
            $dom.children('#'+template_name).remove();
            if($dom.children().length === 0){
                $('#r2_app_container').css('overflow', 'hidden');
                $dom.css('display', 'none');
            }
        };

        function showBrowserTemplateName(template_name){
            if(r2.EnvironmentDetector.browser.chrome){
                return show(8, 'chrome_'+template_name);
            }
            else if(r2.EnvironmentDetector.browser.firefox){
                return show(8, 'firefox_'+template_name);
            }
            else if(r2.EnvironmentDetector.browser.msedge){
                return show(8, 'msedge_'+template_name);
            }
            return Promise.resolve();

        }

        function hideBrowserTemplateName(template_name){
            if(r2.EnvironmentDetector.browser.chrome){
                pub.hide('chrome_'+template_name);
            }
            else if(r2.EnvironmentDetector.browser.firefox){
                pub.hide('firefox_'+template_name);
            }
            else if(r2.EnvironmentDetector.browser.msedge){
                pub.hide('msedge_'+template_name);
            }
        }

        function show(z_idx, template_name){
            setDoms();
            if($panels.hasOwnProperty(z_idx)){
                $panels[z_idx].remove();
                delete $panels[z_idx];
            }
            return r2.HtmlTemplate.loadOnce('cover_msg/'+template_name)
                .then(function(html){
                    if(!r2.ctx.lti){
                        html = html.replace('from the edX.org', 'by refreshing the page')
                    }
                    var $d = $('<div>');
                    $d.html(html);
                    $d.addClass('cover_msg_text');
                    $d.css('z-index', z_idx.toString());
                    $d.attr('id', template_name);
                    $dom.append($d);
                    { // refresh Safari rendering
                        $dom.css('display', 'none');
                        $dom.outerHeight();
                    }
                    $dom.css('display', 'table');
                    $panels[z_idx] = $d;
                    $('#r2_app_container').css('overflow', 'scroll');
                })
                .catch(r2.util.handleError);
        }

        return pub;
    })();

    /** CheatSheet */
    r2.cheatSheet = (function(){
        var pub = {};

        var ondisplay = false;
        var $cheatsheet;
        var $btn_cheatsheet;

        r2.HtmlTemplate.add("cheatsheet");

        pub.Init = function(){
            $cheatsheet = $("#cheatsheet");
            $btn_cheatsheet = $("#btn-cheatsheet");

            pub.AddItem("Turning pages", ": Press '<'/'>' button on the top menu.", "nav_pageturn");
            pub.AddItem("Zooming in/out", ": Press '+'/'-' Buttons on the top menu.", "nav_zooming");
            if(!r2.ctx.text_only){
                pub.AddItem("Voice recording", ": Press ENTER-KEY to start recording, and ENTER-KEY once again to stop.", "voice_recording");
                pub.AddItem("Voice gesturing", ": Start voice recording, and then DRAG-with-LEFT-CLICK your cursor.", "voice_gesture");
                pub.AddItem("Voice re-recording", ": Press SHIFT+ENTER-KEYS to record voice in addtion to the existing voice.", "voice_adding");
                pub.AddItem("Voice indexing", ": Click the PLAY-BUTTON to listen to the voice from the CURSOR-POSITION.", "voice_indexing");
            }
            pub.AddItem("Text commenting", ": Click the KEYBOARD Button.", "text");
            pub.AddItem("Deleting a commment", ": HOVER the cursor on the play button and select TRASH-CAN.", "deleting");

            $cheatsheet.find(".item").hover(
                function(){
                    $(this).find(".item-gif").css( "display", "inline" );
                    $(this).css("background", "indigo");
                    /*
                     $(this).find(".item-gif").each(function(){
                     var newsrc = $(this).attr('src').replace(/\?.*$/,"")+"?x="+Math.random();
                     $(this).attr("src", newsrc);
                     });*/
                },
                function(){
                    $(this).find(".item-gif").css( "display", "none" );
                    $(this).css("background", "transparent");
                }
            );
            $cheatsheet.hover(
                function(){
                    return false;
                },
                function(){

                }
            );
            $btn_cheatsheet.hover(
                function(){
                    $cheatsheet.css("display", "block");
                },
                function(){
                    if(!ondisplay){
                        $cheatsheet.css("display", "none");
                    }
                }
            );
        };

        pub.AddItem = function(name, description, gif){
            var item = document.createElement("div");
            $(item).toggleClass("item", true);
            $cheatsheet.append(item);

            var item_name = document.createElement("div");
            $(item_name).toggleClass("item-name", true);
            item_name.textContent = name;
            $(item).append(item_name);

            var item_description = document.createElement("div");
            $(item_description).toggleClass("item-description", true);
            item_description.textContent = description;
            $(item).append(item_description);

            if(gif){
                var item_gif = document.createElement("img");
                $(item_gif).toggleClass("item-gif", true);
                $(item_gif).attr("src", r2.CDN_URL+"/gifs/"+ gif +".gif");
                $(item_description).append(item_gif);
            }
        };

        pub.BtnClick = function(){
            ondisplay = !ondisplay;
            if(ondisplay){
                $btn_cheatsheet.toggleClass("btn-primary", false);
                $btn_cheatsheet.toggleClass("btn-info", true);
                $cheatsheet.toggleClass("anchored", true);
                $cheatsheet.css("display", "block");
            }
            else{
                $btn_cheatsheet.toggleClass("btn-primary", true);
                $btn_cheatsheet.toggleClass("btn-info", false);
                $cheatsheet.toggleClass("anchored", false);
            }
        };

        pub.Dismiss = function(){
            ondisplay = false;
            $cheatsheet.css("display", "none");
            $btn_cheatsheet.toggleClass("btn-primary", true);
            $btn_cheatsheet.toggleClass("btn-info", false);
            $cheatsheet.toggleClass("anchored", false);
        };

        return pub;
    }());

    r2.modalWindowIntro = (function(){
        var pub = {};

        r2.HtmlTemplate.add("modal-window-intro-video");

        pub.Init = function(){
            if(r2.util.getCookie("r2_intro_video_never_show_again") == ""){
                // ToDo bootstrap fix
                $('#modal-window-intro-video').modal('show');
            }
        };
        pub.Dismiss = function(never_show_again){
            if(never_show_again){
                r2.util.setCookie("r2_intro_video_never_show_again", true, 7); // never show the window for 7days
            }
            // ToDo bootstrap fix
            $('#modal-window-intro-video').modal('hide');
        };
        pub.show = function(){
            r2.log.Log_Simple('TutorialVideo');
            $('#modal-window-intro-video').modal('show');
            r2.util.resetCookie("r2_intro_video_never_show_again");
        };

        return pub;
    }());

    r2.commentHistory = (function(){
        var pub = {};

        function addItem(userid, type, annotid){
            var container = $('#dashboard-comment-history')[0];
            var $a = $(document.createElement('a'));
            $a.attr('userid', userid);
            $a.attr('annotid', annotid);
            $a.attr('href', 'javascript:void(0);');
            $a.addClass('dashboard-comments-icon');
            $a.addClass('btn-dashboard');

            var $i = $(document.createElement('i'));
            $i.addClass('fa');
            $i.addClass('fa-lg');
            $i.css('color', r2.userGroup.GetUser(userid).color_meta_comment_list_normal);
            $a.append($i);
            $i.hover(
                function () {
                    $i.css('color', r2.userGroup.GetUser(userid).color_meta_comment_list_hover);
                },
                function () {
                    $i.css('color', r2.userGroup.GetUser(userid).color_meta_comment_list_normal);
                }
            );

            if(type==='audio'){
                $a.attr('aria-label', 'audio comment');
                $i.toggleClass('fa-volume-up');
                $(container).prepend($a);
                $a.click(function(){
                    var searchresult = r2App.doc.SearchPieceByAnnotId(annotid);
                    if(searchresult){
                        var $piece_group = r2.turnPageAndSetFocus(searchresult, annotid);
                        r2.log.Log_CommentHistory("audio", annotid);
                        highlight($a, $piece_group);
                    }
                });
            }
            else if(type==='text'){
                $a.attr('aria-label', 'text comment');
                $i.toggleClass('fa-edit');
                $(container).prepend($a);
                $a.click(function(){
                    var searchresult = r2App.doc.SearchPieceByAnnotId(annotid);
                    if(searchresult){
                        var $piece_group = r2.turnPageAndSetFocus(searchresult, annotid);
                        r2.log.Log_CommentHistory('text', annotid);
                        highlight($a, $piece_group);
                    }
                });
            }
        }

        function removeItem(userid, annotid){
            var container = $("#dashboard-comment-history")[0];
            for(var i = 0; i < container.childNodes.length; ++i){
                if(container.childNodes[i].nodeName.toLowerCase() == "a" && container.childNodes[i].getAttribute("userid") == userid &&
                    container.childNodes[i].getAttribute("annotid") == annotid ){
                    container.removeChild(container.childNodes[i]);
                    return;
                }
            }
        }

        var $highlight_a = null;
        var $highlight_piecegroup = null;
        function highlight($a, $piece_group){
            if($highlight_a)
                $highlight_a.removeClass('highlight');
            $a.addClass('highlight');
            $highlight_a = $a;

            if($highlight_piecegroup)
                $highlight_piecegroup.removeClass('highlight');
            $piece_group.addClass('highlight');
            $highlight_piecegroup= $piece_group;
        }

        pub.consumeCmd = function(cmd){
            if(cmd.op == "CreateComment"){
                if(cmd.type == "CommentAudio"){
                    addItem(cmd.user, "audio", cmd.data.aid);
                }
                if(cmd.type == "CommentText"){
                    if(cmd.data.isprivate == false || (cmd.data.isprivate && cmd.user == r2.userGroup.cur_user.name) )
                        addItem(cmd.user, "text", cmd.data.aid);
                }
                if(cmd.type == "CommentNewSpeak"){
                    addItem(cmd.user, "audio", cmd.data.aid);
                }
            }
            else if(cmd.op == "DeleteComment"){
                if(cmd.target.type == "PieceKeyboard"){
                    removeItem(cmd.user, cmd.target.aid);
                }
                if(cmd.target.type == "CommentAudio"){
                    removeItem(cmd.user, cmd.target.aid);
                }
                if(cmd.target.type == "PieceNewSpeak"){
                    removeItem(cmd.user, cmd.target.aid);
                }
            }
        };

        return pub;
    }());

    /** Logger */
    r2.log = (function(){
        var pub = {};
        var log_q = [];
        var upload_q = [];

        var getLogTemplate = function(op) {
            var log = {};
            log.op = op;
            log.event_time = (new Date(r2App.cur_time)).toISOString();
            if(r2.userGroup.cur_user){
                log.user = r2.userGroup.cur_user.name;
                log.user_isguest = r2.userGroup.cur_user.isguest;
            }
            return log;
        };

        pub.Log_Simple = function(op) {
            log_q.push(getLogTemplate(op));
        };

        pub.Log_SpeechSynth= function(s) {
            var log = getLogTemplate('SpeechSynth');
            log.s = s;
            log_q.push(log);
        };

        pub.Log_Nav = function(input){
            var log = getLogTemplate('Nav');
            log.viewpos = new Vec2();
            log.viewscale = new Vec2(r2.viewCtrl.scale);
            log.pagen = r2App.cur_pdf_pagen;
            log.input = input;
            log_q.push(log);
        };
        pub.Log_AudioPlay = function(type, annotId, pbtime){
            var log = getLogTemplate('AudioPlay');
            log.type = type;
            log.annotId = annotId;
            log.time = pbtime;
            log_q.push(log);
        };
        pub.Log_AudioStop = function(type, annotId, pbtime){
            var log = getLogTemplate('AudioStop');
            log.type = type;
            log.annotId = annotId;
            log.time = pbtime;
            log_q.push(log);
        };
        pub.Log_CommentHistory = function(type, annotId){
            var log = getLogTemplate('CommentHistory');
            log.type = type;
            log.annotId = annotId;
            log_q.push(log);
        };
        pub.Log_Collapse = function(what){
            var log = getLogTemplate('Collapse');
            log.what = what;
            log_q.push(log);
        };
        pub.Log_Expand = function(what){
            var log = getLogTemplate('Expand');
            log.what = what;
            log_q.push(log);
        };

        pub.SyncLog = function(what){
            $.get('synclog?what='+what)
                .fail(function(err){
                    console.error(err);
                });
        };

        var upload = function(logs){
            return r2.util.postToDbsServer(
                'WebAppLogs',
                {
                    group_n : r2.ctx['groupid'],
                    logs : logs.map(function(log){return JSON.stringify(log);})
                }
            )
        };

        var removeDuplicatesInQ = function(){
            var n_wheel = 0;
            var n, i;
            for(i = 0; i < log_q.length; ++i){
                if(log_q[i].op == 'Nav' && log_q[i].input == 'wheel'){
                    ++n_wheel;
                }
            }
            if(n_wheel > 0){
                n = 1; // th
                for(i = 0; i < log_q.length; ++i) {
                    if(log_q[i].op == 'Nav' && log_q[i].input == 'wheel') {
                        if(n != n_wheel){
                            log_q.splice(i--, 1);
                        }
                        n++;
                    }
                }
            }
        };

        var uploadReady = function(delayed) {
            if( log_q.length === 0 || // when there's nothing to upload, or
                upload_q.length !== 0){ // when there's something uploading now
                return false;
            }
            // now there's something to upload
            if(!delayed){ // upload right away
                return true;
            }
            else if(Date.now() - (new Date(log_q[0].event_time)).getTime() > r2Const.INTERVAL_LOGPOST){
                return true;
            }
            else{
                return false;
            }
        };

        pub.Consume = function(delayed){
            if(uploadReady(delayed)){
                removeDuplicatesInQ();

                while(log_q.length !== 0){
                    upload_q.push(log_q.shift());
                }

                    r2.util.retryPromise(upload(upload_q), r2Const.INTERVAL_LOGRETRY, r2Const.N_LOGRETRY)
                    .then(function(){
                        upload_q = [];
                    })
                    .catch(function(err){
                        console.error(err, err.stack);
                        err.custom_msg = 'We failed to sync data with server. Please check your internet connection and retry, otherwise you may lose your comments.';
                        r2App.asyncErr.throw(err);
                    });
            }
        };

        return pub;
    })();


    /** user group */
    r2.userGroup = (function(){
        var pub = {};

        var users = {};

        pub.cur_user = null;

        var user_colors = [
            [187,  62,  82], // 0 Red
            [ 56, 172,  84], // 1 Green
            [255, 165,   0], // 2 Orange
            [229,  64,  40], // 3 Blue
            [149,   3, 255], // 4 Indigo
            [218, 112, 214], // 5 Lavender
            [102, 205, 170], // 6 Aqua
            [255, 215,   0], // 7 Gold
            [165,  42,  42], // 8 Brown
            [128, 128,   0], // 9 Olive
            [ 50, 205, 50], // 10 Lime
            [  0, 191, 255] // 11 LightBlue
        ];
        var user_color_legacy =
            [51, 172, 227]; // blue
        var user_color_anonymous =
            [50, 50, 50]; // gray

        var R2User = function(_name, nick, email, _color, isguest, n){
            this.name = _name;
            this.nick = nick;
            this.email = email;
            this.isguest = isguest;
            this.n = n;

            this.color_normal = _color.map(function(v){return v/255.;});
            this.color_dark = _color.map(function(v){return v/400.;});
            this.color_light = _color.map(function(v){return (v+(255.-v)/1.5)/255;});

            /**
             * @returns {string}
             */
            this.GetHtmlColor = function(_c, _alpha){
                return 'rgba(' + Math.floor(_c[0]*255.0) + ',' + Math.floor(_c[1]*255.0) + ',' + Math.floor(_c[2]*255.0) + ',' + _alpha + ')';
            };

            this.color_light_html = this.GetHtmlColor(this.color_light, 1.0);
            this.color_normal_html = this.GetHtmlColor(this.color_normal, 1.0);
            this.color_dark_html = this.GetHtmlColor(this.color_dark, 1.0);
            this.color_transparent_normal_html = this.GetHtmlColor(this.color_normal, 0.5);
            this.color_transparent_dark_html = this.GetHtmlColor(this.color_dark, 0.5);
            this.color_splight_static = this.GetHtmlColor(this.color_light, 0.25);
            this.color_splight_dynamic = this.GetHtmlColor(this.color_normal, 0.6);
            this.color_splight_dynamic_newspeak = this.GetHtmlColor(this.color_normal, 0.4);
            this.color_splight_private = this.GetHtmlColor(this.color_normal, 0.2);
            this.color_stroke_dynamic_future = this.GetHtmlColor(this.color_dark, 0.5);
            this.color_stroke_dynamic_past = this.GetHtmlColor(this.color_dark, 1.0);
            this.color_radial_menu_selected = this.GetHtmlColor(this.color_normal, 1.0);
            this.color_radial_menu_unselected = this.GetHtmlColor(this.color_light, 0.8);
            this.color_audiopiece_guideline_html = this.GetHtmlColor(this.color_light, 0.6);
            this.color_piecekeyboard_box_shadow = this.GetHtmlColor(this.color_normal, 0.8);
            this.color_piecekeyboard_private_box_shadow = 'rgba(64,64,64, 0.8)';
            this.color_piecekeyboard_text = this.GetHtmlColor(this.color_dark, 1.0);
            this.color_onscrbtn_normal = this.GetHtmlColor(this.color_normal, 1.0);
            this.color_onscrbtn_hover = this.GetHtmlColor(this.color_normal, 1.0);
            this.color_meta_comment_list_normal = this.GetHtmlColor(this.color_normal, 0.6);
            this.color_meta_comment_list_hover = this.GetHtmlColor(this.color_normal, 1.0);

            /**
             * @returns {string}
             */
            this.GetAnnotPrivateSpotlightId = function(){
                return 'private_highlight_'+this.name;
            };

            this.GetAnnotStaticInkId = function(){
                return 'static_ink_'+this.name;
            };
        };

        pub.Set = function(groupdata){
            if(groupdata == null){
                throw new Error("Cannot load the group data from the server.");
            }
            var type;

            pub.Clear();
            pub.AddUser( r2Const.LEGACY_USERNAME, "Legacy User", "legacy@email.com", type = "legacy");
            pub.AddUser( "anonymous", "Anonymous", "anonymous@email.com", type = "guest");

            if(groupdata.users){
                groupdata.users.forEach(function(user){
                    pub.AddUser( user.id, user.nick, user.email, type = "member");
                });
            }

            if(pub.cur_user === null && groupdata.self === ''){
                pub.SetCurUser('anonymous');
            }
            else{
                if(groupdata.self){
                    pub.AddUser(groupdata.self.id, groupdata.self.nick, groupdata.self.email, type = "guest");
                    pub.SetCurUser(groupdata.self.id);
                }
            }

            $('#observer_indicator').css("display", pub.cur_user.isguest ? "block" : "none");
            r2.onScreenButtons.SetUserColor(r2.userGroup.cur_user);
            r2App.invalidate_size = true;
            return null;
        };

        pub.GetUser = function(name){
            return users[name];
        };

        /**
         * @returns {boolean}
         */
        pub.IsValidMember = function(name){
            return users.hasOwnProperty(name) && (!users[name].isguest || name == r2Const.LEGACY_USERNAME);
        };

        pub.AddUser = function(name, nick, email, type){
            var color;
            var isguest;
            switch (type){
                case "member":
                    color = user_colors[pub.GetCurMemberUsersNum()];
                    isguest = false;
                    break;
                case "legacy":
                    color = user_color_legacy;
                    isguest = true;
                    break;
                case "guest":
                    color = user_color_anonymous;
                    isguest = true;
                    break;
                default :
                    throw new Error("undefined user type");
                    break;
            }
            if(!users.hasOwnProperty(name)){
                users[name] = new R2User(name, nick, email, color, isguest, Object.keys(users).length);
                r2App.annotStaticInkMgr.addNewUser(users[name]);

                if(!isguest) {
                    var div = document.createElement("div");
                    $(div).toggleClass("dashboard-btn");
                    $("#dashboard_users")[0].appendChild(div);

                    var i = document.createElement("i");
                    $(i).toggleClass("fa");
                    $(i).toggleClass("fa-user");
                    $(i).css('color', users[name].color_normal_html);
                    div.appendChild(i);

                    var a = document.createElement("a");
                    $(a).attr('href', 'javascript:void(0);');
                    a.textContent = " " + nick.slice(0,4) + '...';
                    div.appendChild(a);
                }
            }
        };

        pub.Clear = function(){
            users = [];
            pub.cur_user = null;
            $("#dashboard_users").find(".dashboard-btn").remove();
        };

        pub.SetCurUser = function(name){
            pub.cur_user = users[name];
            r2App.annotStaticInkMgr.setCurUser(pub.cur_user);
        };

        /**
         * @returns {number}
         */
        pub.GetCurMemberUsersNum = function(){
            var n = 0;
            for (var name in users) {
                if(users.hasOwnProperty(name)){
                    var user = users[name];
                    if(!user.isguest && user.name != r2Const.LEGACY_USERNAME && user.name != "anonymous"){
                        n+=1;
                    }
                }
            }
            return n;
        };

        return pub;
    }());



    /** FPS counter */
    function FpsCounter() {
        /**
         * How to use:
         * fpsCounter.Tick(function(avg){document.getElementById('fps').innerHTML = 'fps : ' + parseInt(avg);});
         */

        var lastRenderCalledTime = null;
        var lastFpsDispTime = 0;
        var fps = 0;
        var fpsq = [];

        this.Tick = function(cbDisplay){
            if(lastRenderCalledTime == null) {
                lastRenderCalledTime = Date.now();
                fps = 0;
            }
            else{
                var delta = (new Date().getTime() - lastRenderCalledTime)/1000;
                lastRenderCalledTime = Date.now();
                fps = 1/delta;
            }
            if(lastRenderCalledTime - lastFpsDispTime > 200){
                fpsq.push(fps);
                if(fpsq.length>10){
                    fpsq.shift();
                }
                var avg = fpsq.reduce(function(a, b) { return a + b; }) / fpsq.length;
                cbDisplay(avg);
                lastFpsDispTime = lastRenderCalledTime;
            }
        }
    }

    /** Booklet */
    r2.booklet = (function(){
        var pub = {};
        var groups = [];

        var $booklet_nav;
        var cur_groupn = 0;

        pub.initBooklet = function(){
            $booklet_nav = $("#booklet_nav");

            var bookletjs = getBookletData();

            if(bookletjs.length == 1){
                $booklet_nav.css("display", "none");
            }

            for(var i = 0; i < bookletjs.length; ++i){
                var group = {};

                var $div = $(document.createElement("div"));
                group.$btn = makeBookletBtn(createElementA());
                group.$title = makeBookletTitle(createElementA());
                var func_select = (function(_i){return function(){gelectGroup(_i);}})(i);
                group.$btn.click(func_select);
                group.$title.click(func_select);
                group.$title.text(bookletjs[i].title);
                $div.append(group.$btn);
                $div.append(group.$title);
                $booklet_nav.append($div);

                group.page_range = bookletjs[i].pages;
                group.cur_pagen = 0;

                groups.push(group);
            }
            hideTitles();

            $booklet_nav.on( "mouseenter", showTitles );
            $booklet_nav.on( "mouseleave", hideTitles );

            gelectGroup(0);
        };

        pub.goToAbsPage = function(n, booklet_n){
            if(typeof booklet_n === 'undefined'){
                for(var i = 0; i < groups.length; ++i){
                    if(groups[i].page_range[0] <= n && groups[i].page_range[1] >= n){
                        booklet_n = i;
                    }
                }
            }
            if(typeof booklet_n !== 'undefined'){
                if(booklet_n < groups.length) {
                    var group = groups[booklet_n];
                    group.cur_pagen = n - group.page_range[0];
                    gelectGroup(booklet_n);
                }

            }
        };

        pub.goToFirstPage = function(){
            return goToPage(0);
        };

        pub.goToPrevPage = function(){
            return goToPage(groups[cur_groupn].cur_pagen - 1);
        };

        pub.goToNextPage = function(){
            return goToPage(groups[cur_groupn].cur_pagen + 1);
        };

        pub.goToLastPage = function(){
            var group = groups[cur_groupn];
            return goToPage(group.page_range[1] - group.page_range[0]);
        };

        var getBookletData = function(){
            // some hardcoded pieces for experiments
            var bookletjs;
            if( r2.ctx["pdfid"] == "5be80b884132dc551640e771aa5f03993df907ff" ||
                r2.ctx["pdfid"] == "fcac724307463e542655014f34ccff35032802aa"){

                bookletjs = [
                    {pages:[0, 0], title:"General Discussion"},
                    {pages:[1, 24], title:"4. Locating the Value in Privacy"},
                    {pages:[25, 55], title:"7. Contexts, Informational Norms, Actors …"},
                    {pages:[56, 83], title:"8. Breaking Rules for Good"},
                    {pages:[84, 96], title:"Conclusion"}
                ];
            }
            else if( r2.ctx["pdfid"] == "e5b3a37e184244f319b4393eae6059fb46f76953"){
                bookletjs = [
                    {pages:[0, 0], title:"General Discussion"},
                    {pages:[1, 22], title:"Performance-Led Research in the Wild [Benford et al.]"},
                    {pages:[23, 69], title:"Discipline and Practice [Gupta and Ferguson]"},
                    {pages:[70, 79], title:"Breakdown, Obsolescence and Reuse [Jackson and Kang]"}
                ];
            }
            else{
                bookletjs = [
                    {pages:[0, r2App.doc.GetNumPages()-1], title:"Document"}
                ];
            }
            return bookletjs;
        };

        var getPageCount = function(){
            var range = groups[cur_groupn].page_range;
            return range[1]-range[0]+1;
        };

        var getCurPdfPageN = function(){
            var group = groups[cur_groupn];
            return group.page_range[0]+group.cur_pagen;
        };

        var getCurPageN = function(){
            return groups[cur_groupn].cur_pagen;
        };

        var goToPage = function(n){
            var group = groups[cur_groupn];
            if(0 <= n && n <= group.page_range[1] - group.page_range[0]){
                groups[cur_groupn].cur_pagen = n;
                SetPdfPageN(getCurPdfPageN());
                return true;
            }
            return false;
        };

        function gelectGroup(i){
            groups[cur_groupn].$btn.toggleClass("btn-primary", false);

            cur_groupn = i;
            groups[cur_groupn].$btn.toggleClass("btn-primary", true);

            SetPdfPageN(getCurPdfPageN());
        }

        function SetPdfPageN(n){
            r2.log.Log_Nav('SetPdfPageN_'+n);
            if(r2App.mode == r2App.AppModeEnum.REPLAYING){
                r2.log.Log_AudioStop('SetPdfPageN', r2.audioPlayer.getCurAudioFileId(), r2.audioPlayer.getPlaybackTime());
                r2.rich_audio.stop();
            }

            r2.dom_model.setCurPage(n);

            r2App.pieceSelector.reset();

            r2App.SetCurPdfPageN(n);
            r2.dom.resetScroll();
            r2App.cur_page.RunRecursive("ResizeDom", []);
            r2App.invalidate_size = true;
            r2App.invalidate_page_layout = true;

            updatePageNavBar();
        }

        function updatePageNavBar(){
            var cur_page = getCurPageN();
            var page_count = getPageCount();
            $("#page_nav_input").val(cur_page+1);
            $("#page_nav_count").text("of " + page_count);
            $("#page_nav_prev").toggleClass("disabled", cur_page == 0);
            $("#page_nav_next").toggleClass("disabled", cur_page == page_count-1);
            $("#page_nav_first").toggleClass("disabled", cur_page == 0);
            $("#page_nav_last").toggleClass("disabled", cur_page == page_count-1);
        }

        function showTitles(){
            $booklet_nav.toggleClass("opened", true);
            groups.forEach(function(group){
                group.$title.show();
            });
        }

        function hideTitles(){
            $booklet_nav.toggleClass("opened", false);
            groups.forEach(function(group){
                group.$title.hide();
            });
        }

        function createElementA(){
            var $a = $(document.createElement("a"));
            $a.toggleClass("btn", true);
            $a.toggleClass("btn-default", true);
            $a.attr("href", "javascript:void(0);");
            return $a;
        }

        function makeBookletBtn($a){
            $a.toggleClass("booklet-btn", true);
            var $i = $(document.createElement("a"));
            $i.toggleClass("fa", true);
            $i.toggleClass("fa-file-text-o", true);
            $a.append($i);
            return $a;
        }

        function makeBookletTitle($a){
            $a.toggleClass("booklet-title", true);
            return $a;
        }

        return pub;
    }());

    /** PDF Render Manager */
    r2.pdfRenderer = (function(){
        var pub = {};

        var canvs = []; // {dom:, ctx:, t:, npage:}
        var pages = []; // {pdf:, viewport:, ncanv:}
        var npage_render = {now: -1, next: -1};
        var now_rendering = -1;

        pub.initPdfRenderer = function(pdf_doc){
            return getPdfPages(pdf_doc).then(
                function(pdf_pages){
                    return new Promise(function(resolve, reject){
                        try{
                            var canv_w = 0;
                            var canv_h = 0;

                            pages = $.map($(new Array(pdf_pages.length)),
                                function(val, i){
                                    var pdf = pdf_pages[i];
                                    var page = {
                                        pdf: pdf,
                                        viewport: pdf.getViewport( r2.viewCtrl.page_width_noscale / (pdf.pageInfo.view[2]-pdf.pageInfo.view[0])),
                                        ncanv:-1
                                    };
                                    var sz = new Vec2(
                                        Math.floor(page.viewport.width*r2.viewCtrl.hdpi_ratio.sx),
                                        Math.floor(page.viewport.height*r2.viewCtrl.hdpi_ratio.sy)
                                    );
                                    canv_w = Math.max(canv_w, sz.x);
                                    canv_h = Math.max(canv_h, sz.y);

                                    r2App.doc.GetPage(i).RunRecursive('SetPdf', [sz]);

                                    return page;
                                }
                            );

                            canvs = $.map($(new Array(Math.min(r2Const.MAX_CANVS_N, pages.length))),
                                function(val, i){
                                    var dom = document.createElement('canvas');
                                    var ctx = dom.getContext('2d');
                                    dom.width = canv_w;
                                    dom.height = canv_h;

                                    ctx.scale(r2.viewCtrl.hdpi_ratio.sx, r2.viewCtrl.hdpi_ratio.sy);

                                    return {
                                        dom: dom,
                                        ctx: ctx,
                                        t: (new Date()).getTime(),
                                        npage:-1
                                    };
                                }
                            );
                            resolve(pdf_doc);
                        }
                        catch (err){
                            reject(err);
                        }
                    }); // return Promise end

                }
            );
        };

        function getPdfPages(pdf_doc){
            var promises = [];
            for(var i = 0; i < pdf_doc.numPages; ++i){
                promises.push(pdf_doc.getPage(i+1));
            }
            return Promise.all(promises);
        }


        pub.getCanvas = function(n_page){
            var n_canv = pages[n_page].ncanv;
            if(n_canv !== -1){
                canvs[n_canv].t = (new Date()).getTime();
                renderNextPage(n_page);
                return canvs[n_canv].dom;
            }
            else{
                render_q.pushFront(n_page);
                runRender().then(function(){
                    return renderNextPage(n_page);
                }).catch(
                    function(err){
                        console.error(err);
                    }
                );
                return null;
            }

            // push next page if available
            function renderNextPage(_n_page){
                if(_n_page+1 < pages.length && pages[_n_page+1].ncanv === -1){
                    render_q.pushFront(_n_page+1);
                    return runRender();
                }
                else{
                    return Promise.resolve();
                }
            }
        };

        function runRender(){
            if(now_rendering === -1){
                now_rendering = render_q.popFront();
                return runRenderPage(now_rendering).then(
                    function(){
                        now_rendering = -1;
                        if(!render_q.isEmpty()){
                            return runRender();
                        }
                    }
                )
            }
            else{
                return Promise.resolve();
            }
        }

        function runRenderPage(n_page){
            var n_canv = getAvailableCanv();

            canvs[n_canv].npage = n_page;
            pages[n_page].ncanv = n_canv;
            var ctx = {
                canvasContext: canvs[n_canv].ctx,
                viewport: pages[n_page].viewport
            };

            spinner.show();
            canvs[n_canv].ctx.clearRect(0, 0, canvs[n_canv].dom.width/r2.viewCtrl.hdpi_ratio.sx, canvs[n_canv].dom.height/r2.viewCtrl.hdpi_ratio.sy);
            return pages[n_page].pdf.render(ctx).then(function(){
                spinner.hide();
                r2App.invalidate_static_scene = true;
                return null;
            });
        }

        var render_q = (function(){
            var pub_q = {};

            var q = [];

            pub_q.pushFront = function(v){
                removeDup(v);
                q.unshift(v);
            };

            pub_q.popFront = function(){
                return q.shift();
            };

            pub_q.isEmpty = function(){
                return q.length === 0;
            };

            var removeDup = function(v){
                var i = q.indexOf(v);
                if(i != -1) {q.splice(i, 1);}
            };

            return pub_q;
        }());

        function renderPage(n_page){
            npage_render.now = n_page;
            var n_canv = getAvailableCanv();

            canvs[n_canv].npage = n_page;
            pages[n_page].ncanv = n_canv;
            var ctx = {
                canvasContext: canvs[n_canv].ctx,
                viewport: pages[n_page].viewport
            };

            spinner.show();
            canvs[n_canv].ctx.clearRect(0, 0, canvs[n_canv].dom.width/r2.viewCtrl.hdpi_ratio.sx, canvs[n_canv].dom.height/r2.viewCtrl.hdpi_ratio.sy);
            pages[n_page].pdf.render(ctx).then(function(){
                spinner.hide();
                if(npage_render.next != -1){
                    var n = npage_render.next;
                    npage_render.next = -1;
                    renderPage(n);
                }
                else{
                    npage_render.now = -1;
                }
                r2App.invalidate_static_scene = true;
            });
        }

        function getAvailableCanv(){
            function getCurRenderingCanv(){if(npage_render.now == -1){return -1;}else{return pages[npage_render.now].ncanv;}}

            var min_t = Number.POSITIVE_INFINITY;
            var min_i = 0;
            for(var i = 0; i < canvs.length; ++i){
                if(i !== getCurRenderingCanv()){
                    if(canvs[i].npage == -1){
                        return i;
                    }
                    if(canvs[i].t < min_t){
                        min_t = canvs[i].t;
                        min_i = i;
                    }
                }
            }
            pages[canvs[min_i].npage].ncanv = -1;
            return min_i;
        }

        var spinner = (function(){
            var pub_sp = {};

            pub_sp.show = function(){
                var app_container_size = r2.viewCtrl.getAppContainerSize();
                var $ri = $("#rendering_spinner");
                var $ri_w = 25;
                $ri.css("top", app_container_size.y/2-$ri_w+"px");
                $ri.css("left", app_container_size.x/2-$ri_w+"px");
                $ri.css("display", "block");
                $ri.toggleClass("animated", "true");
            };

            pub_sp.hide = function(){
                var $ri = $("#rendering_spinner");
                $ri.toggleClass("animated", "false");
                $ri.css("display", "none");
            };

            return pub_sp;
        }());



        return pub;
    }());

    /** Prerenders Spotlights  */
    r2.spotlightRenderer = (function(){
        var pub = {};

        var canv;
        var canv_ctx;
        var _original_canv_width_stored = 0;
        var _ratio_stored = 0;

        pub.setCanvCtx = function(original_canv_width, ratio){
            if(_original_canv_width_stored != original_canv_width || _ratio_stored != ratio){
                _original_canv_width_stored = original_canv_width;
                _ratio_stored = ratio;

                canv = document.createElement('canvas');
                canv.width = original_canv_width/4;
                canv.height = canv.width*ratio;
                canv_ctx = canv.getContext('2d');
            }
            else{
                canv_ctx.clearRect(0, 0, canv.width, canv.height);
            }
        };

        pub.getCanvCtx = function(){
           return canv_ctx;
        };

        pub.getCanv = function(){
            return canv;
        };

        pub.getCanvWidth = function(){
            return canv.width;
        };

        pub.getCanvRatio = function(){
            return canv.height/canv.width;
        };

        pub.getRenderHeight = function(original_size_y, page_width){
            return Math.floor(original_size_y*page_width/4)*4/page_width;
        };

        return pub;

    }());

    /** Prerenders Inks  */
    r2.InkRenderer = (function(){
        var pub = {};

        var canv;
        var canv_ctx;
        var _original_canv_width_stored = 0;
        var _ratio_stored = 0;

        pub.setCanvCtx = function(original_canv_width, ratio){
            if(_original_canv_width_stored != original_canv_width || _ratio_stored != ratio){
                _original_canv_width_stored = original_canv_width;
                _ratio_stored = ratio;

                canv = document.createElement('canvas');
                canv.width = original_canv_width/4;
                canv.height = canv.width*ratio;
                canv_ctx = canv.getContext('2d');
            }
            else{
                canv_ctx.clearRect(0, 0, canv.width, canv.height);
            }
        };

        pub.getCanvCtx = function(){
            return canv_ctx;
        };

        pub.getCanv = function(){
            return canv;
        };

        pub.getCanvWidth = function(){
            return canv.width;
        };

        pub.getCanvRatio = function(){
            return canv.height/canv.width;
        };

        pub.getRenderHeight = function(original_size_y, page_width){
            return Math.floor(original_size_y*page_width/4)*4/page_width;
        };

        return pub;

    }());

    r2.radialMenu = (function(){
        var pub = {};

        var menus = [];

        pub.create = function(rm_id, rm_size, btn_center_fa_font, btn_alt, cb){
            var $menu = $(document.createElement('div'));
            $menu.addClass('rm_menu');
            $menu.attr('id', rm_id);
            $menu.attr('aria-label', 'menu');
            $menu.css('font-size', r2Const.FONT_SIZE_SCALE*r2Const.RAIDALMENU_FONTSIZE_SCALE*rm_size+'em');

            var $btn_center = $(document.createElement('a'));
            $btn_center.addClass('rm_btn_center').addClass('rm_btn');
            $btn_center.attr('href', 'javascript:void(0);');
            $btn_center.attr('aria-label', btn_alt);
            $btn_center.attr('role', 'button');
            r2.dom_model.focusCtrl.setFocusable($btn_center);
            $btn_center.append(createIcon(btn_center_fa_font));
            if(typeof cb !== 'undefined'){$btn_center.click(closeRadialMenuAndRun($menu,cb));}
            $menu.append($btn_center);
            r2.keyboard.pieceEventListener.setBtn($btn_center.get(0));

            var $btn_radials = $(document.createElement('div'));
            $btn_radials.addClass('rm_btn_raidial');
            $menu.append($btn_radials);

            menus.push($menu);
            return $menu;
        };

        pub.addBtnCircular = function($menu, fa_font, alt, cb){
            var $btn = $(document.createElement('a'));
            $btn.addClass('rm_btn');
            $btn.attr('href', 'javascript:void(0);');
            $btn.attr('aria-label', alt);
            $btn.attr('role', 'button');
            r2.dom_model.focusCtrl.setFocusable($btn);
            $btn.append(createIcon(fa_font));
            $btn.click(closeRadialMenuAndRun($menu, cb));
            $menu.find('.rm_btn_raidial').append($btn);
            r2.keyboard.pieceEventListener.setBtn($btn.get(0));

            setBtnRadialPos($menu);
        };

        pub.finishInit = function($menu, normal, selected){
            var setColorNormal = function(){
                $(this).css('background', normal);
            };
            var setColorSelected = function(){
                $(this).css('background', selected);
            };

            $menu.find('.rm_btn').css('background', normal);
            $menu.find('.rm_btn').mouseover(setColorSelected);
            $menu.find('.rm_btn').mouseout(setColorNormal);
            $menu.find('.rm_btn').focus(setColorSelected);
            $menu.find('.rm_btn').blur(setColorNormal);
        };

        pub.changeCenterIcon = function(rm_id, fa_font){
            var $icon = $('#'+rm_id).find('.rm_btn_center').find('i');
            $icon.toggleClass($icon[0].fa_font, false);
            $icon.toggleClass(fa_font, true);
            $icon.toggleClass('fa-spin', false);
            $icon[0].fa_font = fa_font;
        };


        pub.getPrevRmBtn = function($rm_btn){
            return getRmBtnOffset($rm_btn, -1);
        };

        pub.getNextRmBtn = function($rm_btn){
            return getRmBtnOffset($rm_btn, +1);
        };

        pub.bgnLoading = function(rm_id){
            var $icon = $('#'+rm_id).find('.rm_btn_center').find('i');
            $icon.toggleClass($icon[0].fa_font, false);
            $icon.toggleClass('fa-refresh', true);
            $icon.toggleClass('fa-spin', true);
        };

        pub.endLoading = function(rm_id){
            var $icon = $('#'+rm_id).find('.rm_btn_center').find('i');
            $icon.toggleClass($icon[0].fa_font, true);
            $icon.toggleClass('fa-refresh', false);
            $icon.toggleClass('fa-spin', false);
        };

        var getRmBtnOffset = function($rm_btn, offset){
            var $l = $rm_btn.parents('.rm_menu').find('.rm_btn');
            for(var i = 0, l = $l.length; i < l; ++i){
                if($rm_btn[0] === $l[i]){
                    return $($l[(i+offset+l)%l]);
                }
            }
            return null;
        };

        var createIcon = function(fa_font){
            var $icon = $(document.createElement('i'));
            $icon.addClass('fa').addClass('fa-2x').addClass(fa_font);
            $icon[0].fa_font = fa_font;
            return $icon;
        };

        var setBtnRadialPos = function($menu){
            var items = $menu.find('.rm_btn_raidial a');
            var l = items.length;
            items.each(function( i ){
                $(this).first().css('left', (50 - 35*Math.cos(-1.0*Math.PI - 2*(1/l)*i*Math.PI)).toFixed(2) + "%");
                $(this).first().css('top', (50 + 35*Math.sin(-1.0* Math.PI - 2*(1/l)*i*Math.PI)).toFixed(2) + "%");
            });

            $menu.on('mouseenter',function(e) {
                r2.input.inMenu();
                $menu.toggleClass('open', true);
            }).on('mouseleave',function(e) {
                r2.input.outMenu();
                $menu.toggleClass('open', false);
                $menu.find('.rm_btn').blur();
            });

            $menu.find('.rm_btn').on('focus', function(e){
                updateMenuOpenStatus($menu);
            }).on('blur', function(e){
                updateMenuOpenStatus($menu);
            });
        };

        var updateMenuOpenStatus = function($menu){
            setTimeout(function(){
                $menu.toggleClass('open', $menu.find(':focus').length !== 0);
            }, 10);
        };

        var closeRadialMenuAndRun = function($menu, cb){
            return function(){
                r2.input.outMenu();
                $menu.toggleClass('open', false);
                cb();
            };
        };

        return pub;
    }());


    r2.viewCtrl = (function(){
        var pub = {};

        pub.scale = 1;

        pub.page_width_noscale = 128;
        pub.page_margins = {left: 0.0, rght: 0.0};
        pub.page_size_scaled = Vec2(0.0, 0.0);

        var app_container_size = new Vec2(128, 128);

        pub.canv_px_size = new Vec2(128, 128);
        pub.hdpi_ratio = {
            sx: 1.0,
            sy: 1.0,
            scaled: false
        };

        pub.resizeView = function(_app_container_size, view_ratio, page_margins){
            pub.hdpi_ratio = r2.util.getOutputScale(r2.canv_ctx);

            r2.viewCtrl.page_margins = page_margins;

            app_container_size = _app_container_size;

            pub.page_width_noscale = app_container_size.x-40;

            pub.page_size_scaled = Vec2(pub.scale*pub.page_width_noscale, pub.scale*pub.page_width_noscale*view_ratio);

            pub.canv_px_size.x = Math.round(pub.page_size_scaled.x*pub.hdpi_ratio.sx); // canvas pixel size (maybe different from the DOM size)
            pub.canv_px_size.y = Math.round(pub.page_size_scaled.y*pub.hdpi_ratio.sy);

            /*console.log("== ViewCtrl resized");
            console.log("canv_px_size", pub.canv_px_size.x, pub.canv_px_size.y);
            console.log("app_container_size", app_container_size.x, app_container_size.y);
            console.log("page_size", pub.page_size_scaled.x, pub.page_size_scaled.y);*/
        };

        pub.getAppContainerSize = function(){
            return app_container_size;
        };

        pub.setToFocus = function(p){
        };

        pub.mapDocToDom = function(p){
            return new Vec2(
                pub.scale * (p.x * pub.page_width_noscale + pub.page_margins.left),
                pub.scale * (p.y * pub.page_width_noscale)
            );
        };

        pub.mapDocToDomScale = function(s){
            return s * pub.scale * pub.page_width_noscale;
        };

        pub.mapDomToDocScale = function(s){
            return s/(pub.page_width_noscale * pub.scale);
        };

        pub.mapBrowserToScr = function(p){
            var page_offset = r2.dom.getPageOffset();
            return new Vec2(
                (p.x - page_offset.x)/pub.page_width_noscale/pub.scale,
                (p.y - page_offset.y)/pub.page_width_noscale/pub.scale
            );
        };

        pub.mapScrToDoc = function(p){
            return p;//.divide(pub.scale, true);
        };

        pub.mapDocToScr = function(p){
            return p;//.multiply(pub.scale, true);
        };

        return pub;
    }());

    r2.dom = (function(){
        var pub = {};

        // dom object cache
        var dashboard;
        var dashboard_users;
        var browse_comments;
        var browse_row;
        var app_container;
        var view;
        var content;
        var page_canvas;
        var annot_canvas;
        var overlay_container;

        // dom data cache
        var page_offset = new Vec2(0, 0);
        var dashboard_height = 0;

        pub.initDom = function(){
            dashboard = document.getElementById("dashboard");
            dashboard_users = document.getElementById("dashboard_users");
            browse_comments = document.getElementById("browse_comments");
            browse_row = document.getElementById("browse_row");
            app_container = document.getElementById("r2_app_container");
            view = document.getElementById("r2_view");
            content = document.getElementById("r2_content");
            page_canvas = document.getElementById("r2_page_canvas");
            annot_canvas = document.getElementById("r2_annot_canvas");
            overlay_container = document.getElementById("overlay_container");

            $(view).scroll(function(){
                updateScroll();
            });
            if(r2.scroll_wrapper){
                $(r2.scroll_wrapper).scroll(function(){
                    updateScroll();
                });
            }

            $( "#main_progress_bar" ).progressbar({
                value: 100
            });
        };

        /**
         * Adopt HTML DOM size to the giveen setting
         * @returns {Vec2}
         */
        pub.resizeDom = function(scale, app_container_size, page_size, page_margins, canv_px_size){
            // ToDo prevent layout thrashing

            dashboard_height = getDomheight(dashboard);
            $(browse_comments).width(getDomWidth(browse_row)-getDomWidth(dashboard_users));
            $(view).height(app_container_size.y-getDomheight(dashboard));

            $(content).width(page_size.x + scale*(page_margins.left + page_margins.rght));
            $(content).height(page_size.y);

            $(page_canvas).width(page_size.x); // html size
            $(page_canvas).height(page_size.y);
            page_canvas.dom_width = page_size.x;

            $(annot_canvas).width(page_size.x); // html size
            $(annot_canvas).height(page_size.y);
            $(annot_canvas).css( "left", scale*page_margins.left + "px" );

            page_canvas.width = canv_px_size.x; // canvas pixel size (maybe different from the DOM size)
            page_canvas.height = canv_px_size.y;
            annot_canvas.width = canv_px_size.x;
            annot_canvas.height = canv_px_size.y;

            updateScroll();

        };

        pub.calcAppContainerSize = function(){
            return Vec2(getDomWidth(app_container), getDomheight(app_container));
        };

        pub.getPageCanvCtx = function(){
            return page_canvas.getContext('2d');
        };

        pub.getAnnotCanvCtx = function(){
            return annot_canvas.getContext('2d');
        };

        pub.appendToPageDom = function(dom_obj){
            content.appendChild(dom_obj);
        };

        pub.removeFromPageDom = function(dom_obj){
            content.removeChild(dom_obj);
        };

        pub.onMouseEventHandlers = function(dn, mv, up){
            $(content).on('mousedown', dn);
            $(content).on('mousemove', mv);
            $(content).on('mouseup', up);
        };

        pub.offMouseEventHandlers = function(dn, mv, up){
            $(content).off('mousedown', dn);
            $(content).off('mousemove', mv);
            $(content).off('mouseup', up);
        };

        pub.onTouchEventHandlers = function(dn, mv, up){
            content.addEventListener('touchstart', dn, false);
            content.addEventListener('touchmove', mv, false);
            content.addEventListener('touchend', up, false);
        };

        pub.offTouchEventHandlers = function(dn, mv, up){
            content.removeEventListener('touchstart', dn, false);
            content.removeEventListener('touchmove', mv, false);
            content.removeEventListener('touchend', up, false);
        };

        pub.setContextMenuEvent = function(func){
            $(content).on('contextmenu', func);
        };

        pub.enableRecordingIndicators = function(){
            $('#recording_indicator').css("display","block");
            $(view).toggleClass("recording", true);
        };

        pub.disableRecordingIndicators = function(){
            $('#recording_indicator').css("display","none");
            $(view).toggleClass("recording", false);
        };

        pub.getPageOffset = function(){
            return page_offset;
        };

        pub.resetScroll = function(){
            $(view).scrollTop(0);
        };

        pub.setScroll = function(x, y){
            $(view).scrollLeft(x);
            $(view).scrollTop(y);
        };

        pub.getScroll = function(){
            return new Vec2($(view).scrollLeft(), $(view).scrollTop());
        };

        pub.getPosAndWidthInPage = function(dom){
            var rect = dom.getBoundingClientRect();
            var rtn = [
                (rect.left - page_offset.x) / page_canvas.dom_width,
                (rect.top - page_offset.y) / page_canvas.dom_width,
                rect.width / page_canvas.dom_width,
                rect.height / page_canvas.dom_width
            ];
            return rtn;
        };

        pub.getCanvasWidth = function(){
            return page_canvas.dom_width;
        };

        /** helper */
        function getDomWidth(dom){
            return dom.getBoundingClientRect().width;
        }

        /** helper */
        function getDomheight(dom){
            return dom.getBoundingClientRect().height;
        }

        function updateScroll(){
            page_offset.x = $(content).offset().left + r2.viewCtrl.page_margins.left*r2.viewCtrl.scale;
            page_offset.y = $(content).offset().top;
            if(r2.scroll_wrapper == window){
                page_offset.y -= $(window).scrollTop();
            }
            r2App.t_last_scroll = new Date().getTime();
        }

        return pub;
    }());

    /* upload timer */
    r2.CmdTimedUploader = function(){
        this._time_interval = 0;
        this._time_last_modified = 0;
        this._modified = false;
        this._cmds_to_upload = [];
    };
    r2.CmdTimedUploader.prototype.init = function(time_interval){
        this._time_interval = time_interval;
    };
    r2.CmdTimedUploader.prototype.addCmd = function(cmd){
        this._cmds_to_upload.push(cmd);
        this._modified = true;
        this._time_last_modified = r2App.cur_time;
    };
    r2.CmdTimedUploader.prototype.getCmdsToUpload = function(){
        if( this._modified && r2App.cur_time-this._time_last_modified > this._time_interval){
            var rtn = this._cmds_to_upload.slice(); // copy array

            this._cmds_to_upload = [];
            this._modified = false;

            return {time: this._time_last_modified, cmds: rtn};
        }
        else{
            return null;
        }
    };
    r2.CmdTimedUploader.prototype.checkCmdToUploadExist = function(){
        return this._cmds_to_upload.length !== 0;
    };

    r2.pieceHashId = (function(){
        var pub = {};

        pub.voice = function(annot_id, i){
            return Sha1.hash(annot_id + ' PieceAudio ' + i);
        };

        pub.text = function(npage, nrgn, npt){
            return Sha1.hash("P"+npage+"_R"+nrgn+"_L"+npt);
        };

        pub.teared = function(annotid){
            return Sha1.hash(annotid+" PieceTeared 0")
        };

        pub.keyboard = function(annotid){
            return Sha1.hash(annotid+" PieceKeyboard 0")
        };

        return pub;
    }());

    r2.EnvironmentDetector = (function(){
        var pub = {};

        pub.is_mobile = false;
        pub.is_mac = navigator.platform.indexOf('Mac') > -1;

        pub.browser = {chrome: false, firefox:false, msedge: false, etc: false};

        pub.init = function(){
            return new Promise(function(resolve, reject){
                pub.browser.chrome = bowser.chrome ? true : false;
                pub.browser.firefox = bowser.firefox ? true : false;
                pub.browser.msedge = bowser.msedge ? true : false;
                pub.browser.etc = bowser.chrome || bowser.firefox || bowser.msedge ? false : true;

                pub.is_mobile = bowser.mobile === true ? true : false;

                r2App.cur_time = (new Date()).getTime();
                r2.log.Log_Simple('OpenBrowser:'+bowser.name+'/'+bowser.version+'/'+bowser.mac+'/'+bowser.windows+'/'+bowser.ios+'/'+pub.is_mobile);
                if(pub.browser.etc){
                    r2.coverMsg.showUnsupportedBrowser();
                    console.error('Unsupported browser.');
                    resolve();
                }
                else{
                    if(pub.is_mobile) {
                        r2.coverMsg.showMobileWarning();
                    }
                    resolve();
                }
            });
        };
        return pub;
    }());

    r2.gestureSynthesizer = (function(){
        var pub = {};

        pub.run = function(target_annot_id, talkens){
            /*
             // data description
             You can use it like...

             r2.gestureSynthesizer.run(
             this._annotid,
             [
             {
             base_annotid: <this.annots[0]> or null,
             base_bgn: <...>,
             base_end: <...>,
             new_bgn: <...>,
             new_end: <...>
             word: <...>,
             },
             {

             }
             ...
             ]
             )
             */

            talkens.forEach(function(talken){
                talken.base_bgn *= 1000.;
                talken.base_end *= 1000.;
                talken.new_bgn *= 1000.;
                talken.new_end *= 1000.;
            });

            var getGestureChops = function(talken){
                var rtn = [];
                if(talken.base_annotid){
                    r2App.annots[talken.base_annotid]._spotlights.forEach(function(spotlight, idx){
                        // when overlapping
                        if( !(spotlight.t_end < talken.base_bgn || talken.base_end < spotlight.t_bgn )){
                            /*
                             r0 = (t0-g0)/(g1-g0)
                             r1 = (t1-g0)/(g1-g0)
                             */
                            var spotlight_duration = spotlight.t_end-spotlight.t_bgn;
                            if( spotlight_duration > 0){
                                rtn.push({
                                    gesture_id: talken.base_annotid+'___'+idx,
                                    t_ratio: [
                                        (talken.base_bgn-spotlight.t_bgn)/spotlight_duration,
                                        (talken.base_end-spotlight.t_bgn)/spotlight_duration
                                    ]
                                });
                            }
                        }
                    });
                }
                return rtn;
            };

            var gesture_ids_to_check = new Set();
            var gesture_stack = [];
            talkens.forEach(function(talken){
                var stk = {};
                var chops = getGestureChops(talken);
                chops.forEach(function(chop){
                    stk[chop.gesture_id] = chop.t_ratio;
                    gesture_ids_to_check.add(chop.gesture_id);
                });
                gesture_stack.push(stk);
            });



            r2App.annots[target_annot_id]._spotlights = [];
            gesture_ids_to_check.forEach(function(gesture_id){
                var last_t_ratio_bgn = Number.MAX_VALUE;
                var streak_talken_idxs = [];
                gesture_stack.forEach(function(stk, idx){
                    if(stk.hasOwnProperty(gesture_id)){
                        if(last_t_ratio_bgn > stk[gesture_id][0]){ // streak broken
                            streak_talken_idxs.push([idx, idx]);
                        }
                        else{  // streak continues
                            streak_talken_idxs[streak_talken_idxs.length-1][1] = idx;
                        }
                        last_t_ratio_bgn = stk[gesture_id][0];
                    }
                });

                streak_talken_idxs.forEach(function(streak_talken_idx){
                    var gidsplit = gesture_id.split('___');
                    var base_annotid = gidsplit[0];
                    var spotlight_idx = parseInt(gidsplit[1]);

                    var ratio_bgn = gesture_stack[streak_talken_idx[0]][gesture_id][0];
                    var ratio_end = gesture_stack[streak_talken_idx[1]][gesture_id][1];

                    var target_bgn = talkens[streak_talken_idx[0]].new_bgn;
                    var target_end = talkens[streak_talken_idx[1]].new_end;
                    /*
                     g0 = (r1*t0-r0*t1) / (r1-r0)
                     g1 = (g0*(r0-1)+t0)/r0
                     */

                    var g0 = (ratio_end*target_bgn-ratio_bgn*target_end)/(ratio_end-ratio_bgn);
                    var g1 = (g0*(ratio_bgn-1.)+target_bgn)/ratio_bgn;

                    var src_spotlight = r2App.annots[base_annotid]._spotlights[spotlight_idx];
                    r2App.annots[target_annot_id]._spotlights.push(
                        src_spotlight.Retarget(
                            target_annot_id,
                            g0,
                            g1
                        )
                    );
                });
                //console.log(gesture_id, streak_talken_idxs);
            });



            r2App.invalidate_page_layout = true;

            return new Promise(function(resolve, reject){
                resolve();
            });
        };

        return pub;
    }());

    r2.tooltip = function($parent, init_text, pos, cb_done, cb_cancel){
        var $tooltip = $(document.createElement('div'));
        $tooltip.addClass('simplespeech_tooltip');
        $tooltip.addClass('text_selectable');
        $tooltip.css('left', pos.x);
        $tooltip.css('top', pos.y);
        $parent.append($tooltip);

        var $arrow_up = $(document.createElement('div'));
        $arrow_up.addClass('arrow_up');
        $tooltip.append($arrow_up);

        var $tooltip_input = $(document.createElement('div'));
        $tooltip_input.addClass('tooltip_input');
        $tooltip_input.attr('contenteditable', true);
        r2.keyboard.pieceEventListener.setToolTip($tooltip_input[0]);
        $tooltip.append($tooltip_input);

        var done_by_enter = false;

        $tooltip.find('.tooltip_input')[0].addEventListener('keyup', function(event){
            if(event.which === r2.keyboard.CONST.KEY_ENTER){
                event.preventDefault();
            }
            else if(event.which === r2.keyboard.CONST.KEY_ESC){
                $tooltip_input.blur();
                event.preventDefault();
            }
            else{
                //centerDiv();
            }
        });
        $tooltip.find('.tooltip_input')[0].addEventListener('keydown', function(event){
            if(event.which === r2.keyboard.CONST.KEY_ENTER){
                done_by_enter = true;
                $tooltip_input.blur();
                event.preventDefault();
            }
            else if(event.which === r2.keyboard.CONST.KEY_ESC){
                event.preventDefault();
            }
        });
        $tooltip.find('.tooltip_input')[0].addEventListener('input', function(event){
            centerDiv();
        });

        $tooltip.find('.tooltip_input')[0].addEventListener('blur', function(event){
            done();
        });

        var centerDiv = function(){
            $tooltip.css('margin-left', -$tooltip[0].getBoundingClientRect().width/2+'px');
        };

        var done = function(){
            if(done_by_enter){
                cb_done($tooltip_input.text());
            }
            else{
                cb_cancel();
            }
            $tooltip.remove();
        };

        this.focus = function(){
            $tooltip_input.focus();
            var sel = window.getSelection();
            var range = document.createRange();
            range.setStart($tooltip_input[0], 1);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        };

        this.selectAll = function(){
            $tooltip_input.focus();
            var sel = window.getSelection();
            var range = document.createRange();
            range.selectNodeContents($tooltip_input[0]);
            sel.removeAllRanges();
            sel.addRange(range);
        };

        this.setText = function(text){
            $tooltip_input.text(text);
            centerDiv();
        };

        this.setText(init_text);
    };

    r2.tooltipAudioWaveform = (function(){
        var pub_ta = {};

        var CONST = {
            CANV_W: 120,
            CANV_H: 40,
            CANV_W_DOM: '3.6em',
            CANV_H_DOM: '1.2em'
        };

        var is_display = false;

        var $tooltip = $(document.createElement('div'));
        $tooltip.addClass('tooltip_audio_waveform');

        var $timer_text = $('<p>0:00</p>');
        $tooltip.append($timer_text);
        var t_timer_bgn = 0;
        var t_str_displayed = '';

        var canv = document.createElement('canvas');
        canv.width = CONST.CANV_W;
        canv.height = CONST.CANV_H;
        var ctx = canv.getContext('2d');
        $tooltip.append($(canv));

        pub_ta.show = function(){
            is_display = true;
            $timer_text.text('0:00');
            t_timer_bgn = (new Date()).getTime();
            $('#recording_indicator').append($tooltip);
        };

        pub_ta.dismiss = function(){
            is_display = false;
            $tooltip.remove();
        };

        pub_ta.updateTimerStr = function(){
            if(!is_display){return;}

            var sec = ((new Date()).getTime() - t_timer_bgn)/1000.;
            sec = Math.floor(sec);
            var min = Math.floor(sec/60);
            sec = Math.floor(sec%60);
            var to_disp = min + ':' + (sec<10?'0':'') + sec;
            if(to_disp != t_str_displayed){
                $timer_text.text(to_disp);
                t_str_displayed = to_disp;
            }
        };

        pub_ta.drawDynamic = function(){
            if(is_display){
                var l = r2.audioRecorder.getRecorder().getPower();
                var power = [];
                var p = 0;
                while(l.length + p < CONST.CANV_W){
                    power.push(0);
                    p++;
                }
                for(var i = l.length-(CONST.CANV_W-p); i < l.length; ++i ){
                    power.push(l[i]);
                }

                var min = 0.0;
                var max = 0.2;
                power.forEach(function(v){
                    min = Math.min(min, v);
                    max = Math.max(max, v);
                });

                for(var i = 0; i < power.length; ++i){
                    power[i] = (power[i]-min) / (max-min);
                }

                ctx.clearRect(0, 0, CONST.CANV_W, CONST.CANV_H);
                ctx.beginPath();
                var x = 0;
                var y = CONST.CANV_H;
                ctx.moveTo(x, y);
                for(var i = 0; i < CONST.CANV_W; ++i){
                    x = i;
                    y = CONST.CANV_H*(1.0-power[i]*1.2);
                    ctx.lineTo(x, y);
                }
                y = CONST.CANV_H;
                ctx.lineTo(x, y);
                ctx.fillStyle = "rgb(200,0,0)";
                ctx.closePath();
                ctx.fill();
            }
        };

        return pub_ta;

    }());

    r2.scoreIndicator = (function(){
        var pub = {};

        var $div = null;

        pub.init = function(){
            $div = $('#score_indicator');
            if(r2.ctx.lti){
                $div.css('display', 'block');
            }
        };

        pub.show = function(){
            if(!r2.ctx.lti){return;}

            var status = getStatus();
            var str = constructStr(status.ncomments, status.nreplies);

            $div.children('#score').text(str.score);
            if(status.ncomments < 3 || status.nreplies < 3){
                $div.children('#goal').css('display', 'block');
                $div.children('#goal').text(str.goal);
            }
            else{
                $div.children('#goal').css('display', 'none');
            }

            $div.toggleClass('show', true);
            setTimeout(pub.hide, 5000);
        };

        pub.hide = function(){
            $div.toggleClass('show', false);
        };

        function getStatus(){
            function isMine(obj){
                if(obj.getUsername){
                    if(obj.getUsername() === r2.userGroup.cur_user.name){
                        return true;
                    }
                }
                return false;
            }

            var status = {ncomments: 0, nreplies:0};
            var mycomments = [];
            for(var pid in r2App.pieces_cache){
                var piece = r2App.pieces_cache[pid];
                if(isMine(piece)){
                    mycomments.push(piece);
                }
            }

            var replied_users = {};
            for(var i = 0; i < mycomments.length; ++i){
                var parent = mycomments[i].GetParent();
                if(parent && parent.getUsername && !isMine(parent)){
                    replied_users[parent.getUsername()] = true;
                }
            }

            status.ncomments = mycomments.length;
            status.nreplies = Object.keys(replied_users).length;

            return status;
        }

        function constructStr(ncomments, nreplies){
            var s = {
                score: 'Current score: ',
                goal: 'To earn the full score, '
            };

            var score = (ncomments >= 3 ? 1 : 0) + (nreplies >=3 ? 1 : 0);

            function getStrDetailComment(){
                return 'make ' + (3-ncomments) + ' more comment' + (ncomments<=1 ? 's' : '');
            }
            function getStrDetailReply(){
                return 'reply to ' + (3-nreplies) + ' other colleague' + (nreplies<=1 ? 's' : '');
            }

            if(ncomments < 3 || nreplies < 3){
                if(ncomments<3 && nreplies<3){
                    s.goal += getStrDetailComment()+' and '+getStrDetailReply()+'.'
                }
                else if(ncomments<3){
                    s.goal += getStrDetailComment()+'.'
                }
                else{ // nreplies<3
                    var sd = getStrDetailReply();
                    s.goal += sd +'.'
                }
            }

            s.score += Math.floor(score) + '.0/2.0';
            return s;
        }

        return pub;
    }());

}(window.r2 = window.r2 || {}));

