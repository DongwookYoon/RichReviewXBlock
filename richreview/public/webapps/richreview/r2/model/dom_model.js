/**
 * Created by dongwookyoon on 8/4/15.
 */

/** @namespace r2 */
(function(r2){

    r2.dom_model = (function(){
        var pub = {};

        var $tc_doc = null;
        var $tc_pages = [];
        var $tc_cur_page = null;

        pub.init = function(doc){
            $tc_doc = $('#tc_doc');

            loader.loadDoc(doc);

            pub.setCurPage(0);
        };

        pub.resize = function(width){
            if($tc_cur_page)
                $tc_cur_page.css('font-size', width/r2Const.FONT_SIZE_SCALE+'px');
        };

        pub.setCurPage = function(n){
            if($tc_cur_page)
                $tc_cur_page.css('display','none');
            $tc_cur_page = $tc_pages[n];
            $tc_cur_page.css('display','block');
        };

        pub.getCurPage = function(){
            return $tc_cur_page;
        };

        pub.cbAudioPlay = function(annot_id){
            r2.radialMenu.changeCenterIcon('rm_'+r2.util.escapeDomId(annot_id), 'fa-pause');
        };

        pub.cbAudioStop = function(annot_id){
            r2.radialMenu.changeCenterIcon('rm_'+r2.util.escapeDomId(annot_id), 'fa-play');
        };

        pub.cbRecordingStop = function(annot_id){
            r2.radialMenu.changeCenterIcon('rm_'+r2.util.escapeDomId(annot_id), 'fa-play');
        };

        pub.remove = function(annot_id){
            var annot_id_esc = r2.util.escapeDomId(annot_id);
            $('#'+annot_id_esc).remove();
        };

        pub.getPieceLayout = function(piece){
            var $piece = $tc_cur_page.find('#'+piece.GetId());
            var $content = $piece.find('.tc_content');

        };

        /* submodule for data loading bgn */
        var loader = (function(){
            var pub_loader = {};

            pub_loader.loadDoc = function(doc){

                for(var i = 0, l = doc.GetNumPages(); i < l; ++i){
                    var page = doc.GetPage(i);
                    var $tc_page = loadPage(page, i);
                    $tc_doc.append($tc_page);
                    $tc_page.css('display','none');
                    $tc_pages.push($tc_page);
                }
            };

            var loadPage = function(page, npage){
                var $tc_page = $(document.createElement('div'));
                $tc_page.toggleClass('tc_page', true);

                var appendTightRow = function($target, cls){
                    var $tight_row = $(document.createElement('div'));
                    $tight_row.toggleClass(cls, true);
                    $tight_row.toggleClass('tc_rows', true);
                    $tight_row.toggleClass('tc_tight', true);

                    $target.append($tight_row);
                    return $tight_row;
                };

                $head_row = appendTightRow($tc_page);
                $body_row = appendTightRow($tc_page);
                $foot_row = appendTightRow($tc_page);

                var $head = loadRegion('tc_head', page.GetRegion(0));
                $head_row.append($head);
                var $left = loadRegion('tc_left', page.GetRegion(1));
                $body_row.append($left);
                var $rght = loadRegion('tc_rght', page.GetRegion(2));
                $body_row.append($rght);
                var $foot = loadRegion('tc_foot', page.GetRegion(3));
                $foot_row.append($foot);

                $tc_page.regions = [];
                $tc_page.regions.push($head);
                $tc_page.regions.push($left);
                $tc_page.regions.push($rght);
                $tc_page.regions.push($foot);

                $tc_page.append($head_row);
                $tc_page.append($body_row);
                $tc_page.append($foot_row);

                return $tc_page;
            };

            var loadRegion = function(cls, region){
                var $tight_col = $(document.createElement('div'));
                $tight_col.toggleClass(cls, true);
                $tight_col.toggleClass('tc_cols', true);
                $tight_col.toggleClass('tc_tight', true);

                for(var i = 0, l = region.child.length; i < l; i ++){
                    var piece_text = region.child[i];
                    if(! (piece_text instanceof  r2.PieceText)){throw new Error('invalid input file');}
                    pub.createBodyText($tight_col, piece_text);
                }

                return $tight_col;
            };

            return pub_loader;
        }());

        pub.createBodyText = function($tight_col, piece_text){
            var $comment = appendPieceGroup($tight_col, 'tc_comment_text');
            $comment.attr('aria-label', typeof piece_text.GetPieceText() === 'string' ? piece_text.GetPieceText() : 'empty texts');
            $comment.attr('role', 'document');
            var $piece = $(document.createElement('div'));
            $piece.toggleClass('tc_piece', true);
            piece_text.SetDom($piece);

            var id = piece_text.GetId();
            var creationTime = 0;
            var content_size = piece_text.GetContentSize();

            var tt_size = piece_text.GetCurTtData();

            $piece.attr('id', id);
            setPieceProperties($piece, id, creationTime, content_size.x, 0, tt_size[1], tt_size[2]);

            var $content = $(document.createElement('div'));
            $content.toggleClass('tc_content', true);
            $content.width(content_size.x*r2Const.FONT_SIZE_SCALE+'em');
            $content.height(content_size.y*r2Const.FONT_SIZE_SCALE+'em');

            $piece.append($content);
            $comment.append($piece);
        };

        pub.createTextTearing = function(piece_teared){
            // time: 2014-12-21T13...
            // user: 'red user'
            // op: 'CreateComment'
            // type: 'TextTearing'
            // anchorTo: {type: 'PieceText', id: pid, page: 2} or
            //           {type: 'CommentAudio', id: annotId, page: 2, time: [t0, t1]}
            // data: {pid: id, height: 0.1}

            var $anchor = $tc_pages[piece_teared.GetNumPage()].find('#'+piece_teared.GetParent().GetId());
            var dom_anchor = $anchor.get(0);
            if(dom_anchor){
                var $comment = appendPieceGroup($anchor, 'tc_comment_texttearing');
                $comment.attr('aria-label', 'whitespace');
                $comment.attr('role', 'document');
                var id = piece_teared.GetId();

                var $piece = $(document.createElement('div'));
                $piece.toggleClass('tc_piece', true);
                piece_teared.SetDom($piece);

                $piece.attr('id', id);
                setPieceProperties(
                    $piece,
                    id,
                    0,
                    dom_anchor.pp.w,
                    dom_anchor.pp.tt_depth+1,
                    dom_anchor.pp.tt_x,
                    dom_anchor.pp.tt_w
                );

                var $content = $(document.createElement('div'));
                $content.toggleClass('tc_content', true);
                $content.toggleClass('tc_piece_text', true);
                $content.height(piece_teared.GetContentSize().y*r2Const.FONT_SIZE_SCALE+'em');
                $content.width(dom_anchor.pp.w*r2Const.FONT_SIZE_SCALE+'em');
                $content[0].dom_model = piece_teared;
                $piece.append($content);

                $comment.append($piece);
                $anchor.children().first().after($comment);
                return true;
            }
            return false;
        };

        pub.updateSizeTextTearing = function(piece_teared){
            var $piece = $('#'+piece_teared.GetId());
            $piece.find('.tc_content').height(piece_teared.GetContentSize().y*r2Const.FONT_SIZE_SCALE+'em');
        };

        pub.createCommentVoice = function(annot, pagen, live_recording){
            var user = r2.userGroup.GetUser(annot.GetUsername());
            var annot_id = annot.GetId();
            var annot_id_esc = r2.util.escapeDomId(annot_id);

            var $anchor = $tc_pages[pagen].find('#'+annot.GetAnchorPid());
            var dom_anchor = $anchor.get(0);
            if(dom_anchor){
                var $comment = appendPieceGroup($anchor, 'tc_comment_voice');
                $comment.attr('id', annot_id_esc);
                $comment.attr('aria-label', 'voice comment');
                $comment.attr('role', 'article');
                $anchor.children().first().after($comment);

                { /* add menu */
                    var rm_ratio = getCommentRmRatio($comment);
                    var rm_size = rm_ratio*0.00063;

                    var $rm = r2.radialMenu.create(
                        'rm_'+annot_id_esc,
                        rm_size,
                        (live_recording === true ? 'fa-stop' : 'fa-play'),
                        'play or stop audio',
                        function(){
                            if(r2App.mode === r2App.AppModeEnum.RECORDING){
                                if(annot_id === r2App.cur_recording_annot.GetId()){
                                    r2.recordingCtrl.stop(true); /* to upload */
                                    r2.log.Log_Simple("Recording_Stop_RadialMenu");
                                    r2.radialMenu.changeCenterIcon('rm_'+annot_id_esc, 'fa-play');
                                }
                            }
                            else{
                                if (r2App.mode === r2App.AppModeEnum.IDLE) {
                                    r2.rich_audio.play(annot_id, -1);
                                    r2.log.Log_AudioPlay('play_btn', annot_id, r2.audioPlayer.getPlaybackTime());
                                    console.log(r2.audioPlayer.getPlaybackTime());
                                }
                                else if (r2App.mode === r2App.AppModeEnum.REPLAYING) {
                                    if (r2App.cur_annot_id === annot_id) {
                                        r2.log.Log_AudioStop('stop_btn', r2.audioPlayer.getCurAudioFileId(), r2.audioPlayer.getPlaybackTime());
                                        r2.rich_audio.stop();
                                        console.log(r2.audioPlayer.getCurAudioFileId(), r2.audioPlayer.getPlaybackTime());
                                    }
                                    else {
                                        r2.rich_audio.play(annot_id, -1);
                                        r2.log.Log_AudioPlay('play_btn', annot_id, r2.audioPlayer.getPlaybackTime());
                                        console.log(r2.audioPlayer.getPlaybackTime());
                                    }
                                }
                            }
                        }
                    );
                    r2.radialMenu.addBtnCircular($rm, 'fa-chevron-up', 'fold layout', function(){
                        ;
                    });
                    r2.radialMenu.addBtnCircular($rm, 'fa-link', 'share', function(){
                        var lnk = r2App.server_url+"viewer?access_code=" + r2.ctx["pdfid"] +
                            "&docid=" + r2.ctx["docid"] +
                            "&groupid=" + r2.ctx["groupid"] +
                            "&comment=" +encodeURIComponent(annot_id);
                        window.prompt("Link to the Comment", lnk);
                    });
                    r2.radialMenu.addBtnCircular($rm, 'fa-chevron-down', 'expand layout', function(){
                        ;
                    });
                    r2.radialMenu.addBtnCircular($rm, 'fa-trash', 'erase', function(){
                        if(r2.userGroup.cur_user.name === user.name){
                            var annottodelete = r2App.annots[annot_id];
                            if(r2.removeAnnot(annot_id, true, false)){ // askuser, mute
                                r2Sync.PushToUploadCmd(annottodelete.ExportToCmdDeleteComment());
                                r2.log.Log_Simple("RemoveAnnot_Audio_RadialMenu");
                            }
                        }
                        else{
                            alert("You can only delete your own comments.")
                        }
                    });
                    r2.radialMenu.finishInit($rm, user.color_radial_menu_unselected, user.color_radial_menu_selected);

                    var rm_x = getCommentTtIndentX($comment)-r2Const.RADIALMENU_OFFSET_X*rm_ratio;
                    $rm.css('left', (rm_x)/rm_size/r2Const.RAIDALMENU_FONTSIZE_SCALE+'em');
                    $comment.prepend($rm);
                }


                return true;
            }
            return false;
        };

        pub.appendPieceVoice = function(annot_id, order, time, pieceaudio){
            var annot_id_esc = r2.util.escapeDomId(annot_id);

            var $comment = $('#' + annot_id_esc);
            var dom_comment = $comment.get(0);
            if(dom_comment){
                var i = $comment.find('.tc_piece').length;
                var $anchor = $comment.parent();
                var dom_anchor = $anchor.get(0);

                var id = r2.pieceHashId.voice(annot_id, order);

                var $piece = $(document.createElement('div'));
                $piece.toggleClass('tc_piece', true);
                pieceaudio.SetDom($piece);

                $piece.attr('id', id);
                setPieceProperties(
                    $piece,
                    id,
                    (new Date(time)).getTime(),
                    dom_anchor.pp.w,
                    dom_anchor.pp.tt_depth+1,
                    dom_anchor.pp.tt_x,
                    dom_anchor.pp.tt_w
                );

                var $content = $(document.createElement('div'));
                $content.toggleClass('tc_content', true);
                $content.height(r2Const.PIECEAUDIO_HEIGHT*r2Const.FONT_SIZE_SCALE+'em');
                $content.width($anchor.get(0).pp.w*r2Const.FONT_SIZE_SCALE+'em');

                $piece.append($content);
                $comment.append($piece);
            }
        };

        pub.appendPieceKeyboard = function(username, annot_id, pid, anchor_id, creation_time, dom_piecekeyboard, doc_model_piecekeyboard){
            var user = r2.userGroup.GetUser(username);
            var annot_id_esc = r2.util.escapeDomId(annot_id);
            if($('#'+annot_id_esc).length !== 0){
                return true;
            }
            var $anchor = $('#'+anchor_id);
            var $dom_piecekeyboard = $(dom_piecekeyboard);
            var dom_anchor = $anchor.get(0);
            if(dom_anchor){
                var $comment = appendPieceGroup($anchor, 'tc_comment_keyboard');
                $comment.attr('id', annot_id_esc);
                var $piece = $(document.createElement('div'));
                $piece.toggleClass('tc_piece', true);
                doc_model_piecekeyboard.SetDom($piece);
                $piece.attr('id', pid);
                setPieceProperties(
                    $piece,
                    anchor_id,
                    creation_time,
                    dom_anchor.pp.w,
                    dom_anchor.pp.tt_depth+1,
                    dom_anchor.pp.tt_x,
                    dom_anchor.pp.tt_w
                );

                $piece.append($dom_piecekeyboard);
                $dom_piecekeyboard.toggleClass('tc_content', true);
                $dom_piecekeyboard.toggleClass('tc_piece_keyboard', true);
                $dom_piecekeyboard.css('width', dom_anchor.pp.w*r2Const.FONT_SIZE_SCALE+'em');
                $comment.append($piece);

                {/* add menu */
                    var rm_ratio = getPieceRmRatio($piece);
                    var rm_size = rm_ratio*0.00063;
                    var rm_btn_size = 30;

                    var $rm = r2.radialMenu.create('rm_'+pid, rm_size, 'fa-keyboard-o', 'select text comment', function(){
                        doc_model_piecekeyboard.edit();
                    });
                    r2.radialMenu.addBtnCircular($rm, 'fa-chevron-up', 'fold layout', function(){
                        ;
                    });
                    r2.radialMenu.addBtnCircular($rm, 'fa-link', 'share', function(){
                        var lnk = r2App.server_url+"viewer?access_code=" + r2.ctx["pdfid"] +
                            "&docid=" + r2.ctx["docid"] +
                            "&groupid=" + r2.ctx["groupid"] +
                            "&comment=" +encodeURIComponent(annot_id);
                        window.prompt("Link to the Comment", lnk);
                    });
                    r2.radialMenu.addBtnCircular($rm, 'fa-chevron-down', 'expand layout', function(){
                        ;
                    });
                    r2.radialMenu.addBtnCircular($rm, 'fa-trash', 'erase', function(){
                        if(r2.userGroup.cur_user.name === username){
                            if(r2.removeAnnot(annot_id, true, false)){ // askuser, mute
                                r2Sync.PushToUploadCmd(doc_model_piecekeyboard.ExportToCmdDeleteComment());
                                r2.log.Log_Simple("RemoveAnnot_Text_OnScrBtn");
                            }
                        }
                        else{
                            alert("You can only delete your own comments.")
                        }
                    });
                    r2.radialMenu.finishInit($rm, user.color_radial_menu_unselected, user.color_radial_menu_selected);

                    var rm_x = getPieceTtIndentX($piece)-r2Const.RADIALMENU_OFFSET_X*rm_ratio;

                    $rm.css('left', (rm_x)/rm_size/r2Const.RAIDALMENU_FONTSIZE_SCALE+'em');
                    //$rm.css('top', (rm_size*0.4*rm_btn_size)/rm_size+'em');

                    $comment.prepend($rm);
                }

                $anchor.children().first().after($comment);
                return true;
            }
            return false;
        };

        pub.appendPieceEditableAudio = function(username, annot_id, pid, anchor_id, creation_time, dom, piece, live_recording){
            var user = r2.userGroup.GetUser(username);
            var annot_id_esc = r2.util.escapeDomId(annot_id);
            if($('#'+annot_id_esc).length !== 0){
                return true;
            }
            var $anchor = $('#'+anchor_id);
            var $dom_piecekeyboard = $(dom);
            var dom_anchor = $anchor.get(0);
            if(dom_anchor){
                var $comment = appendPieceGroup($anchor, 'tc_comment_editable_audio');
                $comment.attr('id', annot_id_esc);
                var $piece = $(document.createElement('div'));
                $piece.toggleClass('tc_piece', true);
                piece.SetDom($piece);
                $piece.attr('id', pid);
                setPieceProperties(
                    $piece,
                    anchor_id,
                    creation_time,
                    dom_anchor.pp.w,
                    dom_anchor.pp.tt_depth+1,
                    dom_anchor.pp.tt_x,
                    dom_anchor.pp.tt_w
                );

                $piece.append($dom_piecekeyboard);
                $dom_piecekeyboard.toggleClass('tc_content', true);
                $dom_piecekeyboard.toggleClass('tc_piece_editable_audio', true);
                $dom_piecekeyboard.css('width', dom_anchor.pp.w*r2Const.FONT_SIZE_SCALE+'em');
                $comment.append($piece);

                { /* add menu */
                    var rm_ratio = getCommentRmRatio($comment);
                    var rm_size = rm_ratio*0.00063;

                    var $rm = r2.radialMenu.create(
                        'rm_'+annot_id_esc,
                        rm_size,
                        (live_recording === true ? 'fa-stop' : 'fa-play'),
                        'play or stop audio',
                        function(){
                            if(r2App.mode === r2App.AppModeEnum.RECORDING){
                                if(annot_id === r2App.cur_recording_annot.GetId()){
                                    r2.recordingCtrl.stop(true); /* to upload */
                                    r2.log.Log_Simple("Recording_Stop_RadialMenu");
                                    r2.radialMenu.changeCenterIcon('rm_'+annot_id_esc, 'fa-play');
                                }
                            }
                            else{
                                if (r2App.mode === r2App.AppModeEnum.IDLE) {
                                    r2.rich_audio.play(annot_id, -1);
                                    r2.log.Log_AudioPlay('play_btn', annot_id, r2.audioPlayer.getPlaybackTime());
                                }
                                else if (r2App.mode === r2App.AppModeEnum.REPLAYING) {
                                    if (r2App.cur_annot_id === annot_id) {
                                        r2.log.Log_AudioStop('stop_btn', r2.audioPlayer.getCurAudioFileId(), r2.audioPlayer.getPlaybackTime());
                                        r2.rich_audio.stop();
                                    }
                                    else {
                                        r2.rich_audio.play(annot_id, -1);
                                        r2.log.Log_AudioPlay('play_btn', annot_id, r2.audioPlayer.getPlaybackTime());
                                    }
                                }
                            }
                        }
                    );
                    r2.radialMenu.addBtnCircular($rm, 'fa-chevron-up', 'fold layout', function(){
                        ;
                    });
                    r2.radialMenu.addBtnCircular($rm, 'fa-link', 'share', function(){
                        var lnk = r2App.server_url+"viewer?access_code=" + r2.ctx["pdfid"] +
                            "&docid=" + r2.ctx["docid"] +
                            "&groupid=" + r2.ctx["groupid"] +
                            "&comment=" +encodeURIComponent(annot_id);
                        window.prompt("Link to the Comment", lnk);
                    });
                    r2.radialMenu.addBtnCircular($rm, 'fa-chevron-down', 'expand layout', function(){
                        ;
                    });
                    r2.radialMenu.addBtnCircular($rm, 'fa-trash', 'erase', function(){
                        if(r2.userGroup.cur_user.name === user.name){
                            alert("This feature is yet to be implemented.")
                        }
                        else{
                            alert("You can only delete your own comments.")
                        }
                    });
                    r2.radialMenu.finishInit($rm, user.color_radial_menu_unselected, user.color_radial_menu_selected);

                    var rm_x = getCommentTtIndentX($comment)-r2Const.RADIALMENU_OFFSET_X*rm_ratio;
                    $rm.css('left', (rm_x)/rm_size/r2Const.RAIDALMENU_FONTSIZE_SCALE+'em');
                    $comment.prepend($rm);
                }

                $anchor.children().first().after($comment);
                return true;
            }
            return false;
        };


        var appendPieceGroup = function($target, cls){
            var $comment = $(document.createElement('div'));
            $comment.toggleClass('tc_piecegroup', true);
            $comment.toggleClass(cls, true);
            $comment.mousedown(function(event){
                //event.preventDefault(); // prevent focus
            });
            pub.focusCtrl.setFocusable($comment);

            $target.append($comment);
            return $comment;
        };

        var setPieceProperties = function($target, id, time, w, tt_depth, tt_x, tt_w){
            var dom = $target.get(0);
            dom.pp = {};
            dom.pp.id = id;
            dom.pp.time = time;
            dom.pp.w = w;
            dom.pp.tt_depth = tt_depth;
            dom.pp.tt_x = tt_x;
            dom.pp.tt_w = tt_w;
        };

        var getRmRatio = function(tt_depth){
            return Math.pow(0.8, tt_depth - 1);
        };

        var getCommentRmRatio = function($comment){
            var $anchor = $comment.parent();
            var dom_anchor = $anchor.get(0);
            return getRmRatio(dom_anchor.pp.tt_depth + 1);
        };

        var getPieceRmRatio = function($piece){
            var dom = $piece.get(0);
            return getRmRatio(dom.pp.tt_depth);
        };

        var getTtIndentX = function(tt_depth, tt_x){
            return tt_x + (tt_depth === 0 ? 0 : tt_depth - 1)*r2Const.PIECE_TEXTTEARING_INDENT;
        };

        var getCommentTtIndentX = function($comment){
            var $anchor = $comment.parent();
            var dom_anchor = $anchor.get(0);
            return getTtIndentX(dom_anchor.pp.tt_depth + 1, dom_anchor.pp.tt_x);
        };

        var getPieceTtIndentX = function($piece){
            var dom = $piece.get(0);
            return getTtIndentX(dom.pp.tt_depth, dom.pp.tt_x);
        };


        pub.focusCtrl = (function(){
            var pub_fc = {};
            var last_focused_comment = null;

            pub_fc.focusPiece = function(annot_id){
                var $p = $tc_cur_page.find('#'+r2.util.escapeDomId(annot_id));
                if($p.hasClass('tc_piece')){
                    $p.parent().focus();
                }
                else{
                    $p.focus();
                }
            };

            pub_fc.next = function(){
                var $focused = $(':focus');
                if($focused.hasClass('tc_piecegroup')){
                    var $next  = $focused.next('.tc_piecegroup');
                    if($next.length !== 0){
                        $next.focus();
                    }
                    else{
                        if($focused.parent().hasClass('tc_cols')){ // when it's a topmost comment/text,
                            var nextTcCols = getNextTcCols($focused.parent());
                            nextTcCols.find('.tc_piecegroup').first().focus();
                        }
                        else{ // when it's a nested comment
                            $focused.parent().parent().find('.tc_piecegroup').first().focus();
                        }
                    }
                }
                else if($focused.hasClass('rm_btn')){
                    r2.radialMenu.getNextRmBtn($focused).focus();
                }
                else{
                    $tc_cur_page.find('.tc_piecegroup').first().focus();
                }
            };

            pub_fc.prev = function(){
                var $focused = $(':focus');
                if($focused.hasClass('tc_piecegroup')){
                    var $prev  = $focused.prev('.tc_piecegroup');
                    if($prev.length !== 0){
                        $prev.focus();
                    }
                    else{
                        if($focused.parent().hasClass('tc_cols')){ // when it's a topmost comment/text,
                            var nextTcCols = getPrevTcCols($focused.parent());
                            nextTcCols.children().filter('.tc_piecegroup').last().focus();
                        }
                        else{ // when it's a nested comment
                            $focused.parent().children().filter('.tc_piecegroup').last().focus();
                        }
                    }
                }
                else if($focused.hasClass('rm_btn')){
                    r2.radialMenu.getPrevRmBtn($focused).focus();
                }
                else{
                    $tc_cur_page.find('.tc_piecegroup').last().focus();
                }
            };

            pub_fc.in = function(){
                var $focused = $(':focus');
                if($focused.hasClass('tc_piecegroup')){
                    var $in = $focused.find('.tc_piecegroup');
                    if($in.length !== 0){
                        $in.first().focus();
                    }
                }
                else if($focused.hasClass('rm_btn')){
                    r2.radialMenu.getNextRmBtn($focused).focus();
                }
            };

            pub_fc.up = function(){
                var $focused = $(':focus');
                if($focused.hasClass('tc_piecegroup')){
                    var $up = $focused.parent().parent();
                    if($up.hasClass('tc_piecegroup')){
                        $up.focus();
                    }
                }
                else if($focused.hasClass('rm_btn')){
                    r2.radialMenu.getPrevRmBtn($focused).focus();
                }
            };

            pub_fc.esc = function(){
                var $focused = $(':focus');
                if($focused.hasClass('r2_piecekeyboard_textbox')){
                    $focused.parent().parent().parent().parent().focus();
                }
                else if($focused.hasClass('rm_btn')){
                    $focused.parents('.tc_piecegroup').first().focus();
                }
                else if($focused.hasClass('tc_piecegroup')){
                    $('#dashboard-comments-title').focus();
                }
                else{
                    if(last_focused_comment !==0){
                        last_focused_comment.focus();
                    }
                }
            };

            pub_fc.setFocusable = function($target){
                $target.attr('tabindex', 0);
                $target.get(0).addEventListener('focus', function(){
                    $(this).css('outline', 'rgba(77, 144, 254, 0.5) solid 1px');
                    $(this).css('box-shadow', 'inset 0 0 0 0.003em rgba(77, 144, 254, 0.5)');
                    last_focused_comment = $(this);
                });
                $target.get(0).addEventListener('blur', function(){
                    $(this).css('outline', 'none');
                    $(this).css('box-shadow', 'none');
                });
                /*
                $target.on(
                    'focus',
                    function(evt){
                        $(this).css('outline', 'rgba(77, 144, 254, 0.5) solid 1px');
                        $(this).css('box-shadow', 'inset 0 0 0 0.003em rgba(77, 144, 254, 0.5)');
                        last_focused_comment = $(this);
                    }
                ).on(
                    'blur',
                    function(evt){
                        $(this).css('outline', 'none');
                        $(this).css('box-shadow', 'none');
                    }
                );*/
            };

            var getPrevTcCols = function($tc_cols){
                return getTcColsOffset($tc_cols, -1);
            };
            var getNextTcCols = function($tc_cols){
                return getTcColsOffset($tc_cols, +1);
            };
            var getTcColsOffset = function($tc_cols, offset){
                var $l = $tc_cols.parent().parent().find('.tc_cols');
                for(var i = 0, l = $l.length; i < l; ++i){
                    if($tc_cols[0] === $l[i]){
                        return $($l[(i+offset+l)%l]);
                    }
                }
                return null;
            };

            return pub_fc;
        }());

        return pub;
    }())
}(window.r2 = window.r2 || {}));