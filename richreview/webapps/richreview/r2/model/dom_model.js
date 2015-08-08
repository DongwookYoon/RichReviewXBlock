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

        /* submodule for data loading bgn */
        var loader = (function(){
            var pub_loader = {};

            pub_loader.loadDoc = function(doc_json){
                for(var i = 0; i < doc_json.pages.length; ++i){
                    var page_json = doc_json.pages[i];
                    var $tc_page = loadPage(page_json, i);
                    $tc_doc.append($tc_page);
                    $tc_pages.push($tc_page);
                }
            };

            var loadPage = function(page_json, npage){
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

                var page_bbox = new Vec2(
                    (page_json.bbox[2]-page_json.bbox[0]),
                    (page_json.bbox[3]-page_json.bbox[1])
                );

                var $head = loadRegion('tc_head', page_json.rgns[0], page_bbox, npage, 0);
                $head_row.append($head);
                var $left = loadRegion('tc_left', page_json.rgns[1], page_bbox, npage, 1);
                $body_row.append($left);
                var $rght = loadRegion('tc_rght', page_json.rgns[2], page_bbox, npage, 2);
                $body_row.append($rght);
                var $foot = loadRegion('tc_foot', page_json.rgns[3], page_bbox, npage, 3);
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

            var loadRegion = function(cls, region_json, page_bbox, npage, nrgn){
                var $tight_col = $(document.createElement('div'));
                $tight_col.toggleClass(cls, true);
                $tight_col.toggleClass('tc_cols', true);
                $tight_col.toggleClass('tc_tight', true);

                for(var i = 0; i < region_json.rects.length; i ++){
                    var $comment_text = loadCommentText(region_json.rects[i], page_bbox, npage, nrgn, i, region_json.ttX, region_json.ttW);
                    $tight_col.append($comment_text)
                }

                return $tight_col;
            };


            var loadCommentText = function(rect, page_bbox, npage, nrgn, npt, ttX, ttW){
                var $comment = $(document.createElement('div'));
                $comment.toggleClass('tc_comment', true);
                $comment.toggleClass('tc_comment_text', true);
                $comment.attr("tabindex", 0);

                var $piece = $(document.createElement('div'));
                $piece.toggleClass('tc_piece', true);

                var id = typeof rect.id !== 'undefined' ? rect.id : Sha1.hash("P"+npage+"_R"+nrgn+"_L"+npt);
                var creationTime = 0;
                var content_size = new Vec2(
                    (rect[2]-rect[0])/page_bbox.x,
                    (rect[3]-rect[1])/page_bbox.x
                );

                var tt_size = [
                    0, // ttDepth
                    (ttX-rect[0])/page_bbox.x, // ttX
                    ttW/page_bbox.x // ttW
                ];

                var tex_coord = [
                    new Vec2( // texcoordLT
                        rect[0]/page_bbox.x,
                        1.0-rect[1]/page_bbox.y
                    ),
                    new Vec2( // texcoordRB
                        rect[2]/page_bbox.x,
                        1.0-rect[3]/page_bbox.y
                    )
                ];

                $piece.attr('id', id);
                setPieceProperties($piece, id, creationTime, content_size.x, 0, tt_size[1], tt_size[2]);

                var $content = $(document.createElement('div'));
                $content.toggleClass('tc_content', true);
                $content.width(content_size.x+'em');
                $content.height(content_size.y+'em');

                $piece.append($content);
                $comment.append($piece);
                return $comment;
            };

            return pub_loader;
        }());
        /* submodule for data loading end */

        var appendComment = function($target, cls){
            var $comment = $(document.createElement('div'));
            $comment.toggleClass('tc_comment', true);
            $comment.toggleClass(cls, true);
            $comment.attr("tabindex", 0);

            $target.append($comment);
            return $comment;
        };

        pub.createTextTearing = function(cmd){
            // time: 2014-12-21T13...
            // user: 'red user'
            // op: 'CreateComment'
            // type: 'TextTearing'
            // anchorTo: {type: 'PieceText', id: pid, page: 2} or
            //           {type: 'CommentAudio', id: annotId, page: 2, time: [t0, t1]}
            // data: {pid: id, height: 0.1}

            var $anchor = $tc_pages[cmd.anchorTo.page].find('#'+cmd.anchorTo.id);
            var dom_anchor = $anchor.get(0);
            if(dom_anchor){
                var $comment = appendComment($anchor, 'tc_comment_texttearing');

                var $piece = $(document.createElement('div'));
                $piece.toggleClass('tc_piece', true);
                $piece.attr('id', cmd.data.pid);
                setPieceProperties(
                    $piece,
                    cmd.data.pid,
                    0,
                    dom_anchor.pp.w,
                    dom_anchor.pp.tt_depth+1,
                    dom_anchor.pp.tt_x,
                    dom_anchor.pp.tt_w
                );

                var $content = $(document.createElement('div'));
                $content.toggleClass('tc_content', true);
                $content.toggleClass('tc_piece_text', true);
                $content.height(cmd.data.height+'em');
                $content.width(dom_anchor.pp.w+'em');

                $piece.append($content);
                $comment.append($piece);
                $anchor.children().first().after($comment);
                return true;
            }
            return false;
        };

        pub.createCommentVoice = function(n_page, anchor_id, annot_id, user, live_recording){
            // time: 2014-12-21T13...
            // user: 'red user'
            // op: 'CreateComment'
            // type: CommentAudio
            // anchorTo: {type: 'PieceText', id: pid, page: 2} or
            //           {type: 'PieceTeared', id: pid, page: 2}
            //           {type: 'CommentAudio', id: annotId, page: 2, time: [t0, t1]}
            // data: {aid: ..., duration: t, waveform_sample: [0, 100, 99, 98 ...], Spotlights: [Spotlight, Spotlight, ...] };
            // Spotlight: {t_bgn:..., t_end:..., npage: 0, segments: [Segment, Segment, ...]}
            // Spotlight.Segment: {pid: ..., pts: [Vec2, Vec2, ...]}
            var annot_id_esc = r2.util.escapeDomId(annot_id);

            var $anchor = $tc_pages[n_page].find('#'+anchor_id);
            var dom_anchor = $anchor.get(0);
            if(dom_anchor){
                var $comment = appendComment($anchor, 'tc_comment_voice');
                $comment.attr('id', annot_id_esc);
                $anchor.children().first().after($comment);


                { /* add menu */
                    var rm_ratio = getCommentRmRatio($comment);
                    var rm_size = rm_ratio*0.00063;
                    var rm_btn_size = 30;

                    var $rm = r2.radialMenu.create('rm_'+annot_id_esc, rm_size, (live_recording === true ? 'fa-stop' : 'fa-play'), function(){
                        if(r2App.mode === r2App.AppModeEnum.RECORDING){
                            if(annot_id === r2App.cur_recording_annot.GetId()){
                                r2.recordingStop(true); /* to upload */
                                r2.log.Log_Simple("Recording_Stop_RadialMenu");
                                r2.radialMenu.changeCenterIcon('rm_'+annot_id_esc, 'fa-play');
                            }
                        }
                        else{
                            if (r2App.mode === r2App.AppModeEnum.IDLE) {
                                r2.rich_audio.play(annot_id, -1);
                            }
                            else if (r2App.mode === r2App.AppModeEnum.REPLAYING) {
                                if (r2App.cur_annot_id === annot_id) {
                                    r2.rich_audio.stop();
                                }
                                else {
                                    r2.rich_audio.play(annot_id, -1);
                                }
                            }
                        }
                    });
                    r2.radialMenu.addBtnCircular($rm, 'fa-chevron-up', function(){
                        ;
                    });
                    r2.radialMenu.addBtnCircular($rm, 'fa-link', function(){
                        var lnk = r2App.server_url+"viewer?access_code=" + r2.ctx["pdfid"] +
                            "&docid=" + r2.ctx["docid"] +
                            "&groupid=" + r2.ctx["groupid"] +
                            "&comment=" +encodeURIComponent(annot_id);
                        window.prompt("Link to the Comment", lnk);
                    });
                    r2.radialMenu.addBtnCircular($rm, 'fa-chevron-down', function(){
                        ;
                    });
                    r2.radialMenu.addBtnCircular($rm, 'fa-trash', function(){
                        if(r2.userGroup.cur_user === user.name){
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
                    r2.radialMenu.setColors($rm, user.color_radial_menu_unselected, user.color_radial_menu_selected);

                    var rm_x = getCommentTtIndentX($comment)-r2Const.RADIALMENU_OFFSET_X*rm_ratio;

                    $rm.css('left', (rm_x)/rm_size+'em');
                    //$rm.css('top', (rm_size*0.4*rm_btn_size)/rm_size+'em');

                    $comment.prepend($rm);
                }


                return true;
            }
            return false;
        };

        pub.appendPieceVoice = function(annot_id, time){
            var annot_id_esc = r2.util.escapeDomId(annot_id);

            var $comment = $('#' + annot_id_esc);
            var dom_comment = $comment.get(0);
            if(dom_comment){
                var i = $comment.find('.tc_piece').length;
                var $anchor = $comment.parent();
                var dom_anchor = $anchor.get(0);

                var id = r2.nameHash.getPieceVoice(annot_id, i);

                var $piece = $(document.createElement('div'));
                $piece.toggleClass('tc_piece', true);
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
                $content.height(r2Const.PIECEAUDIO_HEIGHT+'em');
                $content.width($anchor.get(0).pp.w+'em');

                $piece.append($content);
                $comment.append($piece);
            }
        };

        pub.appendPieceKeyboard = function(username, annot_id, pid, anchor_id, creation_time, dom_piecekeyboard, doc_model_piecekeyboard){
            var user = r2.userGroup.GetUser(username);
            var annot_id_esc = r2.util.escapeDomId(annot_id);
            var $anchor = $('#'+anchor_id);
            var $dom_piecekeyboard = $(dom_piecekeyboard);
            var dom_anchor = $anchor.get(0);
            if(dom_anchor){
                var $comment = appendComment($anchor, 'tc_comment_keyboard');
                $comment.attr('id', annot_id_esc);
                var $piece = $(document.createElement('div'));
                $piece.toggleClass('tc_piece', true);
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
                $dom_piecekeyboard.css('width', dom_anchor.pp.w+'em');
                $comment.append($piece);

                {/* add menu */
                    var rm_ratio = getPieceRmRatio($piece);
                    var rm_size = rm_ratio*0.00063;
                    var rm_btn_size = 30;

                    var $rm = r2.radialMenu.create('rm_'+pid, rm_size, 'fa-keyboard-o', function(){
                            doc_model_piecekeyboard.edit();
                    });
                    r2.radialMenu.addBtnCircular($rm, 'fa-chevron-up', function(){
                            ;
                    });
                    r2.radialMenu.addBtnCircular($rm, 'fa-link', function(){
                        var lnk = r2App.server_url+"viewer?access_code=" + r2.ctx["pdfid"] +
                            "&docid=" + r2.ctx["docid"] +
                            "&groupid=" + r2.ctx["groupid"] +
                            "&comment=" +encodeURIComponent(annot_id);
                        window.prompt("Link to the Comment", lnk);
                    });
                    r2.radialMenu.addBtnCircular($rm, 'fa-chevron-down', function(){
                        ;
                    });
                    r2.radialMenu.addBtnCircular($rm, 'fa-trash', function(){
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
                    r2.radialMenu.setColors($rm, user.color_radial_menu_unselected, user.color_radial_menu_selected);

                    var rm_x = getPieceTtIndentX($piece)-r2Const.RADIALMENU_OFFSET_X*rm_ratio;

                    $rm.css('left', (rm_x)/rm_size+'em');
                    //$rm.css('top', (rm_size*0.4*rm_btn_size)/rm_size+'em');

                    $comment.prepend($rm);
                }

                $anchor.children().first().after($comment);
                return true;
            }
            return false;
        };

        pub.remove = function(annot_id){
            var annot_id_esc = r2.util.escapeDomId(annot_id);
            $('#'+annot_id_esc).remove();
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


        pub.init = function(doc_json){
            $tc_doc = $('#tc_doc');

            loader.loadDoc(doc_json);

            $tc_cur_page = $tc_pages[0];
            for(var i = 0; i < $tc_pages.length; ++i){
                $tc_pages[i].css('display','none');
            }
            $tc_cur_page.css('display','none');
        };

        pub.resize = function(width){
            if($tc_cur_page)
                $tc_cur_page.css('font-size', width+'px');
        };

        pub.setCurPage = function(n){
            $tc_cur_page.css('display','none');
            $tc_cur_page = $tc_pages[n];
            $tc_cur_page.css('display','block');
        };

        pub.cbAudioPlay = function(annot_id){
            r2.radialMenu.changeCenterIcon('rm_'+r2.util.escapeDomId(annot_id), 'fa-pause');
            r2.log.Log_AudioPlay('radialmenu', annot_id, r2.audioPlayer.getPlaybackTime());
        };

        pub.cbAudioStop = function(annot_id){
            r2.radialMenu.changeCenterIcon('rm_'+r2.util.escapeDomId(annot_id), 'fa-play');
            r2.log.Log_AudioStop('radialmenu', annot_id, r2.audioPlayer.getPlaybackTime());
        }

        return pub;
    }())
}(window.r2 = window.r2 || {}));