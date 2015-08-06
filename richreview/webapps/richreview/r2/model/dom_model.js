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

        pub.createCommentVoice = function(n_page, anchor_id, annot_id){
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
                console.log('hihi');
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

        pub.appendPieceKeyboard = function(username, annot_id, pid, anchor_id, creation_time, dom_piecekeyboard){
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
                    var $menu = r2.radialMenu.create('rm_'+pid, 0.0005, function(){;}, 'fa-keyboard-o');
                    r2.radialMenu.addBtnCircular($menu, 'fa-chevron-up', function(){;});
                    r2.radialMenu.addBtnCircular($menu, 'fa-twitter', function(){;});
                    r2.radialMenu.addBtnCircular($menu, 'fa-chevron-down', function(){alert('home');});
                    r2.radialMenu.addBtnCircular($menu, 'fa-trash', function(){
                        if(r2.userGroup.cur_user.name === username){
                            if(r2.removeAnnot(annot_id, true, false)){ // askuser, mute
                                //r2Sync.PushToUploadCmd(this.ExportToCmdDeleteComment());
                                r2.log.Log_Simple("RemoveAnnot_Text_OnScrBtn");
                            }
                        }
                        else{
                            alert("You can only delete your own comments.")
                        }
                    });
                    r2.radialMenu.setColors($menu, user.color_radial_menu_unselected, user.color_radial_menu_selected);

                    $menu.css('left', '60em');
                    $menu.css('top', '23em');

                    $comment.append($menu);
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

        var getPieceTtIndentX = function($piece){
            var dom = $piece.get(0);
            var d;
            if(dom.pp.tt_depth == 0){
                d = 0;
            }
            else{
                d = dom.pp.tt_depth-1;
            }
            return dom.pp.tt_x + d*r2Const.PIECE_TEXTTEARING_INDENT;
        };

        var getPieceTtIndentedWidth = function($piece){
            var dom = $piece.get(0);
            return dom.pp.tt_x + dom.pp.tt_w - getPieceTtIndentX($piece);
        };

        var appendBtn = function($target){
            $radialBtn = $(document.createElement('div'));
            $radialBtn.toggleClass('radialBtn');
            $radialBtn.attr("tabindex", 0);

            $target.append($radialBtn);
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

        return pub;
    }())
}(window.r2 = window.r2 || {}));