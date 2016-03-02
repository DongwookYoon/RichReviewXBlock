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

        pub.initHT = function(resource_urls){
            var promises = l.map(function(template){
                return pub.loadOnce(resource_urls, template);
            });
            return Promise.all(promises);
        };

        pub.add = function(name){
            l.push(name);
        };

        pub.loadOnce = function(resource_urls, name){
            return r2.util.getUrlData(resource_urls['htmls/' + name + '.xml'], '').then(
                function(resp) {
                    $("#" + name).html(resp);
                    return null;
                }
            );
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

        var dom = null;
        var dom_text = null;

        var SetDoms = function(){
            if(dom == null)
                dom = document.getElementById("cover_msg");
            if(dom_text == null)
                dom_text = document.getElementById("cover_msg_text");
        };
        pub.Show = function(msgList){
            SetDoms();
            dom.style.display = "table";
            while (dom_text.firstChild) {
                dom_text.removeChild(dom_text.firstChild);
            }
            msgList.forEach(function(msg){
                var p = document.createElement("p");
                p.textContent = msg;
                dom_text.appendChild(p);
            });
        };
        pub.Hide = function(){
            SetDoms();
            dom.style.display = 'none';
        };

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

            pub.AddItem("Moving in Page", ": DRAG-with-RIGHT-Click", "translate");
            pub.AddItem("Zooming In/Out", ": PRESS '+'/'-' Key or 'Magnifying Buttons'", "zooming");
            pub.AddItem("Commenting with Voice", ": PRESS-ENTER to start recording, PRESS-ENTER again to stop", "enter_voice");
            pub.AddItem("Commenting with Text", ": PRESS-ENTER + just TYPE", "enter_text");
            pub.AddItem("Pointing while Speaking", ": Start-VOICE-Recording + DRAG-with-LEFT-Click", "spotlight");
            pub.AddItem("Indexing Waveform", ": LEFT-Click over Waveform", "waveform_indexing");
            pub.AddItem("Indexing Pointing Gesture", ": LEFT-Click over a Gesture's trace", "spotlight_indexing");
            pub.AddItem("Highlighting (Private)", ": HOLD-CTRL + DRAG-with-LEFT-Click", "highlight");
            pub.AddItem("Commenting (Private)", ": HOLD-CTRL + PRESS-ENTER", "private_note");
            pub.AddItem("Publishing Private Comment", ": Click 'Publish Button'", "publish_private");
            pub.AddItem("Deleting Voice Comment", ": HOLD-LEFT-Click on 'Play Button' and select 'Trash Can'", "delete_voice");

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

            var item_gif = document.createElement("img");
            $(item_gif).toggleClass("item-gif", true);
            $(item_gif).attr("src", "https://richreview.blob.core.windows.net/data/gif/"+ gif +".gif");
            $(item_description).append(item_gif);
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
                        r2.turnPageAndSetFocus(searchresult, annotid);
                        r2.log.Log_CommentHistory("audio", annotid);
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
                        r2.turnPageAndSetFocus(searchresult, annotid);
                        r2.log.Log_CommentHistory('text', annotid);
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

        pub.consumeCmd = function(cmd){
            if(cmd.op == "CreateComment"){
                //console.log(JSON.stringify(cmd));
                if(cmd.type == "CommentAudio"){
                    addItem(cmd.user, "audio", cmd.data.aid);
                }
                if(cmd.type == "CommentText"){
                    if(cmd.data.isprivate == false || (cmd.data.isprivate && cmd.user == r2.userGroup.cur_user.name) )
                        addItem(cmd.user, "text", cmd.data.aid);
                }
            }
            else if(cmd.op == "DeleteComment"){
                if(cmd.target.type == "PieceKeyboard"){
                    removeItem(cmd.user, cmd.target.aid);
                }
                if(cmd.target.type == "CommentAudio"){
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

        pub.GetLogTemplate = function(op) {
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
            log_q.push(this.GetLogTemplate(op));
        };

        pub.Log_Nav = function(input){
            var log = this.GetLogTemplate('Nav');
            log.viewpos = new Vec2();
            log.viewscale = new Vec2(r2.viewCtrl.scale);
            log.pagen = r2App.cur_pdf_pagen;
            log.input = input;
            log_q.push(log);
        };
        pub.Log_RefreshCanvasSize = function(){
            var log = this.GetLogTemplate('RefreshCanvasSize');
            log.app_container_size = new Vec2(r2.viewCtrl.getAppContainerSize());
            log.canv_px_size = new Vec2(r2.viewCtrl.canv_px_size);
            log_q.push(log);
        };
        pub.Log_AudioPlay = function(type, annotId, pbtime){
            var log = this.GetLogTemplate('AudioPlay');
            log.type = type;
            log.annotId = annotId;
            log.time = pbtime;
            log_q.push(log);
        };
        pub.Log_AudioStop = function(type, annotId, pbtime){
            var log = this.GetLogTemplate('AudioStop');
            log.type = type;
            log.annotId = annotId;
            log.time = pbtime;
            log_q.push(log);
        };
        pub.Log_CommentHistory = function(type, annotId){
            var log = this.GetLogTemplate('CommentHistory');
            log.type = type;
            log.annotId = annotId;
            log_q.push(log);
        };
        pub.Log_Collapse = function(what){
            var log = this.GetLogTemplate('Collapse');
            log.what = what;
            log_q.push(log);
        };
        pub.Log_Expand = function(what){
            var log = this.GetLogTemplate('Expand');
            log.what = what;
            log_q.push(log);
        };
        pub.Post = function(log){
            r2.util.postToDbsServer(
                "WebAppLog",
                {
                    group_n : r2.ctx["groupid"],
                    log : JSON.stringify(log)
                }
            ).catch(
                function(){
                    console.log('Logger Post Failed: ', log);
                    log_q.push(log);
                }
            );
        };
        pub.RemoveDuplicatesInQ = function(){
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
            var n_refresh_size = 0;
            for(i = 0; i < log_q.length; ++i){
                if(log_q[i].op == 'RefreshCanvasSize'){
                    ++n_refresh_size;
                }
            }
            if(n_refresh_size > 0){
                n = 1; // th
                for(i = 0; i < log_q.length; ++i) {
                    if(log_q[i].op == 'RefreshCanvasSize') {
                        if(n != n_refresh_size){
                            log_q.splice(i--, 1);
                        }
                        n++;
                    }
                }
            }
        };
        /**
         * @returns {boolean}
         */
        pub.GoodToFlushPost = function(delayed) {
            var toPost = false;
            if(log_q.length > 0){
                if(delayed){
                    if(Date.now() - (new Date(log_q[0].event_time)).getTime() > 3000){
                        toPost = true;
                    }
                }
                else{
                    toPost = true;
                }
            }
            return toPost;
        };
        pub.Consume = function(delayed){
            if(this.GoodToFlushPost(delayed)){
                this.RemoveDuplicatesInQ();
                while(log_q.length > 0){
                    var l = log_q.shift();
                    //console.log('r2.log Consume:', JSON.stringify(l));
                    this.Post(l);
                }
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
            [187, 62, 82], // red
            [56, 172, 84], // green
            [255, 165, 0], // orange
            [229, 64, 40], // blue
            [149, 3, 255]  // indigo
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
            this.color_splight_static = this.GetHtmlColor(this.color_light, 0.15);
            this.color_splight_dynamic = this.GetHtmlColor(this.color_normal, 0.6);
            this.color_splight_private = this.GetHtmlColor(this.color_normal, 0.2);
            this.color_stroke_dynamic_future = this.GetHtmlColor(this.color_dark, 0.5);
            this.color_stroke_dynamic_past = this.GetHtmlColor(this.color_dark, 1.0);
            this.color_radial_menu_selected = this.GetHtmlColor(this.color_normal, 1.0);
            this.color_radial_menu_unselected = this.GetHtmlColor(this.color_light, 0.8);
            this.color_audiopiece_guideline_html = this.GetHtmlColor(this.color_light, 0.6);
            this.color_piecekeyboard_box_shadow = this.GetHtmlColor(this.color_normal, 0.8);
            this.color_piecekeyboard_private_box_shadow = 'rgba(64,64,64, 0.8)';
            this.color_piecekeyboard_text = this.GetHtmlColor(this.color_dark, 1.0);
            this.color_onscrbtn_normal = this.GetHtmlColor(this.color_normal, 0.5);
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

            $("#observer_indicator").css("display", pub.cur_user.isguest ? "block" : "none");
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
                    a.textContent = " " + nick;
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

        pub.goToPrevPage = function(){
            return goToPage(groups[cur_groupn].cur_pagen - 1);
        };

        pub.goToNextPage = function(){
            return goToPage(groups[cur_groupn].cur_pagen + 1);
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

        pub.initPdfRenderer = function(pdf_doc){
            return GetPdfPage(pdf_doc).then(
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

        /**
         * @returns {*}
         */
        pub.GetCanvas = function(n_page){
            var n_canv = pages[n_page].ncanv;
            if(n_canv != -1){
                canvs[n_canv].t = (new Date()).getTime();
                return canvs[n_canv].dom;
            }
            else{
                ScheduleRender(n_page);
                return null;
            }
        };

        function GetPdfPage(pdf_doc){
            return new Promise(function(resolve, reject){
                var pdf_pages = [];
                var job = function(n){
                    if(n != pdf_doc.numPages){
                        pdf_doc.getPage(n+1).then(function (pdf_page) {
                            pdf_pages.push(pdf_page);
                            job(n+1);
                        }).catch(reject);
                    }
                    else{
                        resolve(pdf_pages);
                    }
                };
                job(0);
            });
        }

        function ScheduleRender(n_page){
            if(npage_render.now == -1){ //
                Render(n_page);
            }
            else{ // now rendering
                npage_render.next = n_page;
            }
        }

        function ShowRenderingIndicator(){
            var app_container_size = r2.viewCtrl.getAppContainerSize();
            var $ri = $("#rendering_spinner");
            var $ri_w = 25;
            $ri.css("top", app_container_size.y/2-$ri_w+"px");
            $ri.css("left", app_container_size.x/2-$ri_w+"px");
            $ri.css("display", "block");
            $ri.toggleClass("animated", "true");
        }
        function HideRenderingIndicator(){
            var $ri = $("#rendering_spinner");
            $ri.toggleClass("animated", "false");
            $ri.css("display", "none");
        }

        function Render(n_page){
            npage_render.now = n_page;
            var n_canv = GetAvailableCanv();

            canvs[n_canv].npage = n_page;
            pages[n_page].ncanv = n_canv;
            var ctx = {
                canvasContext: canvs[n_canv].ctx,
                viewport: pages[n_page].viewport
            };


            ShowRenderingIndicator();
            canvs[n_canv].ctx.clearRect(0, 0, canvs[n_canv].dom.width/r2.viewCtrl.hdpi_ratio.sx, canvs[n_canv].dom.height/r2.viewCtrl.hdpi_ratio.sy);
            pages[n_page].pdf.render(ctx).then(function(){
                HideRenderingIndicator();
                if(npage_render.next != -1){
                    var npage_to_render = npage_render.next;
                    npage_render.next = -1;
                    Render(npage_to_render);
                }
                else{
                    npage_render.now = -1;
                }
                r2App.invalidate_static_scene = true;
            });
        }


        /**
         * @returns {number}
         */
        function GetAvailableCanv(){
            var min_t = Number.POSITIVE_INFINITY;
            var min_i = 0;
            for(var i = 0; i < canvs.length; ++i){
                if(i != GetCurRenderingCanv()){
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

        /**
         * @returns {*}
         */
        function GetCurRenderingCanv(){
            if(npage_render.now == -1){
                return -1;
            }
            else{
                return pages[npage_render.now].ncanv;
            }
        }

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
            $icon[0].fa_font = fa_font;
        };


        pub.getPrevRmBtn = function($rm_btn){
            return getRmBtnOffset($rm_btn, -1);
        };

        pub.getNextRmBtn = function($rm_btn){
            return getRmBtnOffset($rm_btn, +1);
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
                $(this).first().css('left', (50 - 35*Math.cos(-0.5*Math.PI - 2*(1/l)*i*Math.PI)).toFixed(2) + "%");
                $(this).first().css('top', (50 + 35*Math.sin(-0.5* Math.PI - 2*(1/l)*i*Math.PI)).toFixed(2) + "%");
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
            $(view).height(app_container_size.y-getDomheight(dashboard));
            $(browse_comments).width(getDomWidth(browse_row)-getDomWidth(dashboard_users));

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

    r2.environment_detector = (function(){
        var pub = {};

        pub.is_mobile = false;
        pub.is_msedge = false;
        pub.is_supported_browser = false;

        pub.init = function(){
            return new Promise(function(resolve, reject){
                pub.is_mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                pub.is_supported_browser = bowser.chrome || bowser.firefox || bowser.safari || bowser.msedge;
                pub.is_msedge = bowser.msedge;
                r2.log.Log_Simple('openbrowser_'+bowser.name+'_'+bowser.version);
                if(pub.is_mobile) {
                    alert('Mobile data warning: listening voice comments can consume your mobile data very quickly.');
                    /*
                    r2.coverMsg.Show([
                        'Sorry! RichReview does not support mobile platform yet.',
                        'Please try again on your laptop or desktop.'
                    ]);
                    var err = new Error('unsupported mobile access');
                    err.silent = true;
                    reject(err);*/
                    resolve();
                }
                else if(!pub.is_supported_browser){
                    r2.coverMsg.Show([
                        'Sorry! RichReview only supports Chrome, Firefox, Safari, or MS Edge browsers.',
                        "But you are using something else..."
                    ]);
                    var err = new Error('unsupported browser');
                    err.silent = true;
                    reject(err);
                }
                else{
                    resolve();
                }
            });
        };
        return pub;
    }());

}(window.r2 = window.r2 || {}));

