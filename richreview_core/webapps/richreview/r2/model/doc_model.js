/**
 * Created by yoon on 12/27/14.
 */
//written by Yuan Huang
//written by Tianwei Huang

/** @namespace r2 */
(function(r2){
    "use strict";

    /*
     * Obj
     */
    r2.Obj = function(){
        this.pos = new Vec2(0, 0); this.size = new Vec2(0, 0);
        this._parent = null;
        this.child = [];
        this._isvisible = true;
    };
    r2.Obj.prototype.RunRecursive = function(func_name, args){
        if(typeof this[func_name] !== 'undefined')
            this[func_name].apply(this, args);

        var i, child;
        for(i = 0; child = this.child[i]; ++i){
            child.RunRecursive(func_name, args);
        }
    };
    r2.Obj.prototype.AddChildAtBack = function(obj){
        obj.SetParent(this);
        this.child.push(obj);
    };
    r2.Obj.prototype.AddChildAtFront = function(obj){
        obj.SetParent(this);
        this.child.unshift(obj);
    };
    r2.Obj.prototype.AddChildrenChronologically = function(objs){
        var time = objs[0].GetCreationTime();
        var i = 0;
        for(; i < this.child.length; ++i){
            if(time > this.child[i].GetCreationTime()){
                break;
            }
        }
        var j = 0;
        for(; j < objs.length; ++j){
            objs[j].SetParent(this);
            this.child.splice(i+j, 0, objs[j]);
        }
    };
    r2.Obj.prototype.AddChildrenAtFront = function(objs){
        var i = 0;
        while(this.child[i] === objs[i]){
            ++i;
        }
        for(; i < objs.length; ++i){
            objs[i].SetParent(this);
            this.child.splice(i, 0, objs[i]);
        }
    };
    r2.Obj.prototype.SetParent = function(parent){
        this._parent = parent;
    };
    r2.Obj.prototype.GetParent = function(){
        return this._parent;
    };
    r2.Obj.prototype.SetVisibility = function(visible){
        this._isvisible = visible;
        this.child.forEach(function(child){
            child.SetVisibility(visible);
        });
    };
    r2.Obj.prototype.GetChild = function(i){
        return this.child[i];
    };
    r2.Obj.prototype.GetRegionType = function(){
        return this._parent.GetRegionType();
    };
    r2.Obj.prototype.DrawRect = function(color){
        r2.canv_ctx.strokeStyle = color;
        r2.canv_ctx.beginPath();
        r2.canv_ctx.lineWidth="0.002";
        r2.canv_ctx.rect(this.pos.x,this.pos.y,this.size.x,this.size.y);
        r2.canv_ctx.stroke();
    };
    r2.Obj.prototype.Relayout = function(){
        console.log("Relayout from r2.Obj");
    };
    r2.Obj.prototype.SearchPiece = function(id){
        var i, child;
        for(i = 0; child = this.child[i]; ++i){
            var rtn = child.SearchPiece(id);
            if (rtn){
                return rtn;
            }
        }
        return null;
    };
    r2.Obj.prototype.SearchPieceAudioByAnnotId = function(annotid, time){
        var i, child;
        for(i = 0; child = this.child[i]; ++i){
            var rtn = child.SearchPieceAudioByAnnotId(annotid, time);
            if (rtn){
                return rtn;
            }
        }
        return null;
    };
    r2.Obj.prototype.SearchPieceByAnnotId = function(annotid){
        var i, child;
        for(i = 0; child = this.child[i]; ++i){
            var rtn = child.SearchPieceByAnnotId(annotid);
            if (rtn){
                return rtn;
            }
        }
        return null;
    };
    r2.Obj.prototype.GatherPieceAudioByAnnotId = function(annotid){
        var rtn = [];
        var i, child;
        for(i = 0; child = this.child[i]; ++i){
            rtn = rtn.concat(child.GatherPieceAudioByAnnotId(annotid));
        }
        return rtn;
    };
    r2.Obj.prototype.HitTest = function(pt){
        var rtn = [];
        if(this._isvisible){
            for(var i = 0; i < this.child.length; ++i){
                rtn = rtn.concat(this.child[i].HitTest(pt));
            }
            if(this.pos.x < pt.x && this.pos.x+this.size.x > pt.x &&
                this.pos.y < pt.y && this.pos.y+this.size.y > pt.y && this._isvisible)
            {
                rtn.push(this);
            }
        }
        return rtn;
    };
    r2.Obj.prototype.GetPieceByHitTest = function(pt){
        var l = this.HitTest(pt);
        if(l.length > 0 && l[0].IsPiece) {
            return l[0];
        }
        else{
            return null;
        }
    };
    r2.Obj.prototype.GetPieceOfClosestBottom = function(pt, dy_obj){
        if (typeof dy_obj === 'undefined'){
            dy_obj = [Number.POSITIVE_INFINITY, null];
        }
        for(var i = 0; i < this.child.length; ++i){
            this.child[i].GetPieceOfClosestBottom(pt, dy_obj);
        }
        return dy_obj;
    };
    r2.Obj.prototype.RemoveAnnot = function(annotid){
        for(var i = 0; i < this.child.length; ++i){
            if(this.child[i].IsPiece){
                if(this.child[i]['GetAnnotId']){
                    if(this.child[i].GetAnnotId() == annotid){
                        this.child[i].Destructor();
                        this.child.splice(i--, 1);
                    }
                }
            }
        }
    };
    r2.Obj.prototype.GetNumPage = function(){
        return this._parent.GetNumPage();
    };
    r2.Obj.prototype.IsOnLeftColumn = function(){
        return this._parent.IsOnLeftColumn();
    };

    /*
     * Doc
     */
    r2.Doc = function(){
        this._pages = [];
    };
    r2.Doc.prototype.RunRecursive = function(func_name, args){
        var i, page;
        for(i = 0; page = this._pages[i]; ++i){
            page.RunRecursive(func_name, args);
        }
    };
    r2.Doc.prototype.AddPage = function(page){
        this._pages.push(page); // page has no parent
    };
    r2.Doc.prototype.GetPage = function(i){
        return this._pages[i];
    };
    r2.Doc.prototype.GetNumPages = function(){
        return this._pages.length;
    };
    r2.Doc.prototype.GetTargetPiece = function(target){
        if(target.type == "PieceKeyboard")
            return this._pages[target.page].SearchPiece(target.pid);
        if(target.type == "PieceNewSpeak")
            return this._pages[target.page].SearchPiece(target.pid);
        return null;
    };
    r2.Doc.prototype.SearchPieceByAnnotId = function(annotid){
        var i, page;
        for(i = 0; page = this._pages[i]; ++i){
            var rtn = page.SearchPieceByAnnotId(annotid);
            if(rtn){return {page_n:i, piece:rtn};}
        }
        return null;
    };


    /*
     * Page
     */
    r2.Page = function() {
        r2.Obj.call(this);
    };
    r2.Page.prototype = Object.create(r2.Obj.prototype);

    r2.Page.prototype.SetPage = function(_num, size){
        this._num = _num;
        this.size = size;
        this._spotlight_cache = [];
        this._spotlight_cache_newspeak = [];
    };
    r2.Page.prototype.GetNumPage = function(){
        return this._num;
    };
    r2.Page.prototype.GetRegion = function(i){
        return this.child[i];
    };
    r2.Page.prototype.Relayout = function(){
        var rt = this.child[0];
        var rl = this.child[1];
        var rr = this.child[2];
        var rb = this.child[3];

        var s_rt = rt.Relayout(new Vec2(0, 0));
        var s_rl = rl.Relayout(new Vec2(0, s_rt.y));
        var s_rr = rr.Relayout(new Vec2(s_rl.x, s_rt.y));
        var mx = Math.max(s_rt.x, s_rl.x+s_rr.x);
        var my = s_rt.y + Math.max(s_rl.y, s_rr.y);
        var s_rb = rb.Relayout(new Vec2(0, my));
        mx = Math.max(mx, s_rb.x);
        my = my + s_rb.y;

        this.size = new Vec2(mx, my);

        this.refreshSpotlightPrerender();
        this.refreshSpotlightPrerenderNewspeak();
        this.refreshInkPrerender();

        r2App.invalidate_static_scene = true;
        r2App.invalidate_dynamic_scene = true;

        return this.size;
    };
    r2.Page.prototype.refreshSpotlightPrerender = function(){
        this._spotlight_cache = [];
        var i, spotlight, cache;
        for (var annotid in r2App.annots) {
            if (
                (r2App.annots.hasOwnProperty(annotid) && !r2App.annots[annotid].getIsBaseAnnot()) ||
                (r2App.cur_recording_annot !== null && annotid === r2App.cur_recording_annot.GetId())
            ){
                var annot = r2App.annots[annotid];
                var spotlights_of_page = annot.GetSpotlightsByNumPage(this._num);

                for(i = 0; spotlight = spotlights_of_page[i]; ++i){
                    var segments = spotlight.getValidSegments();
                    if(segments.length > 0){
                        var n_total_pts = segments.reduce(function(sum, item){return sum+item.GetNumPts();}, 0);
                        var t_step = (spotlight.t_end-spotlight.t_bgn)/n_total_pts;

                        var segment = segments[0];
                        var cache_tbgn = spotlight.t_bgn;
                        var cache_pid = segment.GetPieceId();
                        var cache_pts = segment.CopyPtsWithOffset(r2App.pieces_cache[segment.GetPieceId()].pos);

                        for(var j = 1; j < segments.length; ++j){
                            segment = segments[j];
                            if(!r2.Piece.prototype.isTheSameOrAdjecent(segment.GetPieceId(),cache_pid)){
                                cache = new r2.Spotlight.Cache();
                                var t_end_segment = cache_tbgn + cache_pts.length*t_step;
                                cache.setCache(
                                    annot,
                                    cache_tbgn,
                                    t_end_segment,
                                    cache_pts);
                                this._spotlight_cache.push(cache);
                                cache_pts = [];
                                cache_tbgn = t_end_segment;
                            }
                            cache_pid = segment.GetPieceId();
                            cache_pts = cache_pts.concat(segment.CopyPtsWithOffset(r2App.pieces_cache[segment.GetPieceId()].pos));
                        }
                        cache = new r2.Spotlight.Cache();
                        cache.setCache(
                            annot,
                            cache_tbgn,
                            spotlight.t_end,
                            cache_pts);
                        this._spotlight_cache.push(cache);
                    }
                }
            }
        }

        r2.spotlightRenderer.setCanvCtx(r2.viewCtrl.page_width_noscale, this.size.y/this.size.x);
        for(i = 0; spotlight = this._spotlight_cache[i]; ++i){
            spotlight.preRender(r2.spotlightRenderer.getCanvCtx(), r2.spotlightRenderer.getCanvWidth()); // ctx, ratio
        }
    };
    r2.Page.prototype.refreshSpotlightPrerenderNewspeak = function(){
        this._spotlight_cache_newspeak = [];
        var i, spotlight, cache;
        for (var annotid in r2App.annots) {
            if ((r2App.annots.hasOwnProperty(annotid) && r2App.annots[annotid].getIsBaseAnnot()))
            {
                var annot = r2App.annots[annotid];
                var spotlights_of_page = annot.GetSpotlightsByNumPage(this._num);

                for(i = 0; spotlight = spotlights_of_page[i]; ++i){
                    var segments = spotlight.getValidSegments();
                    if(segments.length > 0){
                        var n_total_pts = segments.reduce(function(sum, item){return sum+item.GetNumPts();}, 0);
                        var t_step = (spotlight.t_end-spotlight.t_bgn)/n_total_pts;

                        var segment = segments[0];
                        var cache_tbgn = spotlight.t_bgn;
                        var cache_pid = segment.GetPieceId();
                        var cache_pts = segment.CopyPtsWithOffset(r2App.pieces_cache[segment.GetPieceId()].pos);

                        for(var j = 1; j < segments.length; ++j){
                            segment = segments[j];
                            if(!r2.Piece.prototype.isTheSameOrAdjecent(segment.GetPieceId(),cache_pid)){
                                cache = new r2.Spotlight.Cache();
                                var t_end_segment = cache_tbgn + cache_pts.length*t_step;
                                cache.setCache(
                                    annot,
                                    cache_tbgn,
                                    t_end_segment,
                                    cache_pts);
                                this._spotlight_cache_newspeak.push(cache);
                                cache_pts = [];
                                cache_tbgn = t_end_segment;
                            }
                            cache_pid = segment.GetPieceId();
                            cache_pts = cache_pts.concat(segment.CopyPtsWithOffset(r2App.pieces_cache[segment.GetPieceId()].pos));
                        }
                        cache = new r2.Spotlight.Cache();
                        cache.setCache(
                            annot,
                            cache_tbgn,
                            spotlight.t_end,
                            cache_pts);
                        this._spotlight_cache_newspeak.push(cache);
                    }
                }
            }
        }

    };
    r2.Page.prototype.dynamicSpotlightNewspeak = function(canvas_ctx, word_gestures, first){

        var spotlight;
        for(var i = 0; spotlight = this._spotlight_cache_newspeak[i]; ++i){
            var valid_word_gestures = [];
            for(var j = 0; j < word_gestures.length; ++j){
                var word_gesture = word_gestures[j];
                if(word_gesture.annot === spotlight._annot){
                    if(!(word_gesture.bgn > spotlight._t_end || word_gesture.end < spotlight._t_bgn))
                    {
                        //console.log('match_found',word_gesture.bgn, spotlight._t_bgn );
                        valid_word_gestures.push(word_gesture);
                    }
                }
            }
            var min_vwg = Number.MAX_VALUE;
            var max_vwg = Number.MIN_VALUE;
            for(var j = 0; j < valid_word_gestures.length; ++j){
                min_vwg = Math.min(min_vwg, valid_word_gestures[j].bgn);
                max_vwg = Math.max(max_vwg, valid_word_gestures[j].end);
            }
            if(valid_word_gestures.length){
                spotlight.drawReplayNewSpeak(canvas_ctx); // ctx
            }
            //console.log('gesture_seg', max_vwg,min_vwg, spotlight._t_end - spotlight._t_bgn);
            if(
                (max_vwg-min_vwg > 0.25*(spotlight._t_end - spotlight._t_bgn)) ||
                (min_vwg < spotlight._t_bgn && max_vwg < spotlight._t_end)
            ){
                spotlight.drawReplayNewSpeak(canvas_ctx); // ctx
            }
        }
    };

    r2.Page.prototype.refreshInkPrerender = function(){
        r2.inkCtrl.dynamicScene.clear();

        this._Ink_cache = [];
        var i, Ink, cache;
        for (var annotid in r2App.annots) {
            if (r2App.annots.hasOwnProperty(annotid)){
                var annot = r2App.annots[annotid];
                var Inks_of_page = annot.GetInksByNumPage(this._num);

                for(i = 0; Ink = Inks_of_page[i]; ++i){
                    var segments = Ink.getValidSegments();
                    if(segments.length > 0){
                        var n_total_pts = segments.reduce(function(sum, item){return sum+item.GetNumPts();}, 0);

                        var t_step = (Ink.t_end-Ink.t_bgn)/n_total_pts;

                        var segment = segments[0];
                        var cache_tbgn = Ink._t_bgn;
                        var cache_pid = segment.GetPieceId();
                        var cache_pts = segment.CopyPtsWithOffset(r2App.pieces_cache[segment.GetPieceId()].pos);

                        for(var j = 1; j < segments.length; ++j){
                            segment = segments[j];
                            if(!r2.Piece.prototype.isTheSameOrAdjecent(segment.GetPieceId(),cache_pid)){
                                cache = new r2.Ink.Cache();
                                var t_end_segment = cache_tbgn + cache_pts.length*t_step;
                                cache.setCache(
                                    annot,
                                    cache_tbgn,
                                    t_end_segment,
                                    cache_pts);
                                this._Ink_cache.push(cache);
                                cache_pts = [];
                                cache_tbgn = t_end_segment;
                            }
                            cache_pid = segment.GetPieceId();
                            cache_pts = cache_pts.concat(segment.CopyPtsWithOffset(r2App.pieces_cache[segment.GetPieceId()].pos));
                        }
                        cache = new r2.Ink.Cache();
                        cache.setCache(
                            annot,
                            cache_tbgn,
                            Ink._t_end,
                            cache_pts);
                        this._Ink_cache.push(cache);
                    }
                }
            }
        }
        r2.InkRenderer.setCanvCtx(r2.viewCtrl.page_width_noscale, this.size.y/this.size.x);
        for(i = 0; Ink = this._Ink_cache[i]; ++i){
            Ink.preRender(r2.InkRenderer.getCanvCtx()); // ctx, ratio
        }
    };

    r2.Page.prototype.drawBackgroundWhite = function(){
        r2.canv_ctx.fillStyle = 'white';
        r2.canv_ctx.fillRect(0, 0, this.size.x, this.size.y);
    };
    r2.Page.prototype.drawSpotlightPrerendered = function(){
        r2.canv_ctx.drawImage(
            r2.spotlightRenderer.getCanv(),
            0, 0, 1.0, r2.spotlightRenderer.getRenderHeight(this.size.y, r2.viewCtrl.page_width_noscale)
        );
    };
    r2.Page.prototype.drawInkPrerendered = function(){
        var i, inks;
        for(i = 0; inks = this._Ink_cache[i]; ++i){
            inks.preRender(r2.canv_ctx);
        }
    };
    r2.Page.prototype.drawReplayBlob = function(canvas_ctx){
        var i, spotlight;
        for(i = 0; spotlight = this._spotlight_cache[i]; ++i){
            spotlight.drawReplayBlob(canvas_ctx);
        }
    };
    r2.Page.prototype.HitTest = function(pt){
        var rtn = r2.Obj.prototype.HitTest.apply(this, [pt]);
        /* spotlight indexing disabled
        var i, spotlight;
        for(i = 0; spotlight = this._spotlight_cache[i]; ++i){
            var v = spotlight.HitTest(pt);
            if(v){
                rtn.push(v);
            }
        }*/
        return rtn;
    };

    /*
     * Region
     */
    r2.Region = function() {
        r2.Obj.call(this);
    };
    r2.Region.prototype = Object.create(r2.Obj.prototype);

    r2.Region.prototype.GetRegionType = function(){
        var i, rgn;
        for(i = 0; rgn = this._parent.child[i]; ++i){
            if(rgn === this){
                return i;
            }
        }
        return -1;
    };

    r2.Region.prototype.Relayout = function(origin){
        origin = typeof origin !== 'undefined' ? origin : new Vec2(0, 0);
        this.pos = origin.clone();

        var mx = 0;
        var my = 0;
        var piece;
        for(var i = 0; piece = this.child[i]; ++i){
            var s = piece.Relayout();
            mx = Math.max(mx, s.x);
            my += s.y;
        }

        this.size = new Vec2(mx, my);
        return this.size;
    };
    r2.Region.prototype.DrawRect = function(){
        r2.Obj.prototype.DrawRect.apply(this, ['rgba(255,50,50,0.3)']);
        var p;
        for(var i = 0; p = this.child[i]; ++i) {
            p.DrawRect('rgba(50,255,50,0.3)');
        }
    };
    r2.Region.prototype.IsOnLeftColumn = function(){
        return this._parent.GetChild(1) === this;
    };


    /*
     * Piece
     */
    r2.Piece = function () {
        r2.Obj.call(this);

        this.IsPiece = true;
        this._id = null;
        this._creationTime = 0;
        this._cnt_size = new Vec2(0, 0); // contents size
        this._visible = true;
        this._ttDepth = 0;
        this._ttX = 0;
        this._ttW = 0;
        this._inks = {}; // [annoid][idx]
        this._isprivate = false;
        this._dom_piece = null;
    };
    r2.Piece.prototype = Object.create(r2.Obj.prototype);

    r2.Piece.prototype.Destructor = function(){
        delete r2App.pieces_cache[this._id];
    };
    r2.Piece.prototype.GetId = function(){
        return this._id;
    };
    r2.Piece.prototype.GetContentSize = function(){
        return this._cnt_size;
    };
    r2.Piece.prototype.GetCreationTime = function(){
        return this._creationTime;
    };
    r2.Piece.prototype.IsPrivate = function(){
        return this._isprivate;
    };

    r2.Piece.prototype.SetPiece = function(id, creationTime, cnt_size, tt_data){
        this._visible = true;
        this._id = id;
        this._creationTime = creationTime;
        this._cnt_size = cnt_size;
        this._ttDepth = tt_data[0];
        this._ttX = tt_data[1];
        this._ttW = tt_data[2];

        r2App.pieces_cache[this._id] = this;
    };
    r2.Piece.prototype.SetDom = function($dom_piece){
        this._dom_piece = $dom_piece.get(0);
    };
    r2.Piece.prototype.GetNewPieceSize = function(){
        return new Vec2(this._cnt_size.x, r2Const.PIECEAUDIO_HEIGHT);
    };
    r2.Piece.prototype.GetCurTtData = function(){
        return [this._ttDepth, this._ttX, this._ttW];
    };
    r2.Piece.prototype.GetTTData = function(){
        return [this._ttDepth+1, this._ttX, this._ttW];
    };
    r2.Piece.prototype.GetTtDepth = function(){
        return this._ttDepth;
    };
    r2.Piece.prototype.GetTtWidth = function(){
        return this._ttW;
    };
    r2.Piece.prototype.Relayout = function(){
        var dom_piece = this._dom_piece === null ? $(document.getElementById(this.GetId())).get(0) : this._dom_piece;

        var rect = r2.dom.getPosAndWidthInPage(dom_piece);

        this.pos = new Vec2(rect[0], rect[1]);
        this.size = new Vec2(rect[2], rect[3]);

        var piece;
        for(var i = 0; piece = this.child[i]; ++i){
            piece.Relayout();
        }
        return  this.size;
    };
    r2.Piece.prototype.GetPieceOfClosestBottom = function(pt, dy_obj){
        if (typeof dy_obj === 'undefined'){
            dy_obj = [Number.POSITIVE_INFINITY, null];
        }
        var dy = Math.abs(this.pos.y + this._cnt_size.y - pt.y);
        if( (dy <= dy_obj[0]) &&
            ( this.pos.x < pt.x && pt.x < this.pos.x + this._cnt_size.x )){
            dy_obj[0] = dy;
            dy_obj[1] = this;
        }
        for(var i = 0; i < this.child.length; ++i){
            this.child[i].GetPieceOfClosestBottom(pt, dy_obj);
        }
        return dy_obj;
    };
    r2.Piece.prototype.SearchPiece = function(id){
        if (this._id == id)
            return this;
        var rtn = r2.Obj.prototype.SearchPiece.apply(this, [id]);
        if (rtn){
            return rtn;
        }
        return null;
    };
    r2.Piece.prototype.GetTtIndent = function(){
        var d;
        if(this._ttDepth == 0){
            d = 0;
        }
        else{
            d = this._ttDepth-1;
        }
        return this._ttX + (d+1)*r2Const.PIECE_TEXTTEARING_INDENT;
    };
    r2.Piece.prototype.GetTtIndentedWidth = function(){
        return this._ttX+this._ttW-this.GetTtIndent();
    };
    r2.Piece.prototype.addInk = function(annotid, stroke){
        if(!this._inks.hasOwnProperty(annotid)){
            this._inks[annotid] = [];
        }
        this._inks[annotid].push(stroke);
    };
    r2.Piece.prototype.getCollidingInks = function(pt, rtn){
        var ink;
        var pt_on_piece = pt.subtract(this.pos, true);
        var i, l;
        for (var key in this._inks) {
            if (this._inks.hasOwnProperty(key)) {
                for (i = 0, l = this._inks[key].length; i < l; ++i) {
                    ink = this._inks[key][i];
                    if(ink.getUsername() === r2.userGroup.cur_user.name){
                        if(ink.dist(pt_on_piece) <  r2Const.ERASER_RADIUS){
                            rtn.push(ink)
                        }
                    }
                }
            }
        }
    };
    r2.Piece.prototype.detachInk = function(ink){
        var inks = this._inks[ink._annotid];
            if(inks){
            var idx = inks.indexOf(ink);
            if(idx > -1) {
                inks.splice(idx, 1);
            }
        }
        else{
            throw new Error('detachInk:' + ink._annotid + JSON.stringify(ink));
        }
    };
    r2.Piece.prototype.getInkByTimeBgn = function(time, annotid){
        var inks = this._inks[annotid];
        if(typeof inks === 'undefined'){
            inks = this._inks[''];
        }
        if(inks){
            var i, l;
            for (i = 0, l = inks.length; i < l; ++i) {
                var t = inks[i].getTimeBgn();
                if(t === time){
                    return inks[i];
                }
            }
        }
        console.error('getInkByTimeBgn:', time, annotid);
        return null;
    };
    r2.Piece.prototype.drawInkReplaying = function(canvas_ctx){
        var ink;
        for (var key in this._inks) {
            if (this._inks.hasOwnProperty(key)) {
                for (var i = 0; ink = this._inks[key][i]; ++i) {
                    ink.drawReplaying(canvas_ctx);
                }
            }
        }
    };
    r2.Piece.prototype.GetSelectedColors = function(){
        var line_color; var glow_color;
        if(this._username && !this._isprivate){
            var user = r2.userGroup.GetUser(this._username);
            line_color = user.color_transparent_dark_html;
            glow_color = user.color_transparent_normal_html;
        }
        else{
            line_color = 'rgba(0, 0, 0, 0.5)';
            glow_color = 'rgba(75, 75, 75, 0.5)';
        }
        return [line_color, glow_color];
    };
    r2.Piece.prototype.DrawSelected = function(canvas_ctx, x_offset){
        x_offset = typeof x_offset === "undefined" ? 0.0 : x_offset;

        if(this._visible) {
            var colors = this.GetSelectedColors();
            var x_bgn = this.pos.x + this.GetTtIndent();
            var x0, x1, y;

            x0 = x_offset + x_bgn;
            x1 = x_offset + this.pos.x + this._ttX + this._ttW;
            y = this.pos.y + this._cnt_size.y;

            // line
            canvas_ctx.beginPath();
            canvas_ctx.moveTo(x0, y);
            canvas_ctx.lineTo(x1, y);

            canvas_ctx.shadowBlur = 0;
            canvas_ctx.shadowColor = colors[0];
            canvas_ctx.strokeStyle = colors[1];
            canvas_ctx.lineWidth = r2Const.PIECE_SELECTION_LINE_WIDTH;
            canvas_ctx.lineCap = 'butt';
            canvas_ctx.lineJoin = 'miter';
            canvas_ctx.stroke();
            canvas_ctx.shadowBlur = 0;

            // triangles

            var tri_w = 0.005;
            var tri_h_half = 0.0025;

            canvas_ctx.beginPath();
            canvas_ctx.fillStyle = colors[1];

            canvas_ctx.moveTo(x0, y);
            canvas_ctx.lineTo(x0-tri_w, y-tri_h_half);
            canvas_ctx.lineTo(x0-tri_w, y+tri_h_half);
            canvas_ctx.moveTo(x1, y);
            canvas_ctx.lineTo(x1+tri_w, y+tri_h_half);
            canvas_ctx.lineTo(x1+tri_w, y-tri_h_half);

            canvas_ctx.fill();
        }
    };
    /**
     * @returns {boolean}
     */
    r2.Piece.prototype.isTheSameOrAdjecent = function(pid0, pid1){
        if(pid0===pid1){
            return true;
        }
        else {
            var piece0 = r2App.pieces_cache[pid0];
            var piece1 = r2App.pieces_cache[pid1];

            return (
                Math.min(
                    Math.abs(piece0.pos.y+piece0.GetContentSize().y - piece1.pos.y),
                    Math.abs(piece1.pos.y+piece1.GetContentSize().y - piece0.pos.y)
                ) < 0.001
            );
        }
    };

    r2.Piece.prototype.RemoveAnnot = function(annotid){
        r2.Obj.prototype.RemoveAnnot.apply(this, [annotid]);
        if(this._inks.hasOwnProperty(annotid)){
            delete this._inks[annotid];
        }
    };


    /*
     * PieceText
     */
    r2.PieceText = function() {
        r2.Piece.call(this);
        this._t_src_x = 0;
        this._t_src_y = 0;
        this._t_src_w = 1;
        this._t_src_h = 1;
        this._t_dr_x = 0;
        this._t_dr_y = 0;
        this._t_dr_w = 1;
        this._t_dr_h = 1;
        this._t_pdf_w = 1;
    };
    r2.PieceText.prototype = Object.create(r2.Piece.prototype);

    r2.PieceText.prototype.GetAnchorTo = function(){
        // anchorTo: {type: 'PieceText', id: pid, page: 2} or
        var anchorCmd = {};
        anchorCmd.type = 'PieceText';
        anchorCmd.id = this.GetId();
        anchorCmd.page = this.GetNumPage();
        return anchorCmd;
    };
    r2.PieceText.prototype.SetPieceText = function(texCoordLT, texCoordRB, text){
        this._texCoordLT = texCoordLT;
        this._texCoordRB = texCoordRB;
        this._text = typeof text === 'string' ? text : '(empty)';
    };
    r2.PieceText.prototype.GetPieceText = function(){
        return this._text;
    };
    r2.PieceText.prototype.SetVisibility = function(visible){
        r2.Obj.prototype.SetVisibility.apply(this, [visible]);
        this._isvisible = true;
    };
    r2.PieceText.prototype.Relayout = function(){
        var rtn = r2.Piece.prototype.Relayout.apply(this, []);
        var pdf_x = Math.floor(this.pos.x * this._t_pdf_w);
        var pdf_y = Math.floor(this.pos.y * this._t_pdf_w);
        this._t_dr_x = pdf_x/this._t_pdf_w;
        this._t_dr_y = pdf_y/this._t_pdf_w;
        return rtn;
    };
    r2.PieceText.prototype.SetPdf = function(canvas_size){
        this._t_pdf_w = canvas_size.x;

        this._t_src_x = Math.floor(this._texCoordLT.x * canvas_size.x);
        this._t_src_y = Math.floor((1.0-this._texCoordLT.y) * canvas_size.y);
        this._t_src_w = Math.floor((this._cnt_size.x) * this._t_pdf_w);
        this._t_src_h = Math.floor((this._cnt_size.y) * this._t_pdf_w + 1);

        this._t_dr_x = Math.floor(this.pos.x * this._t_pdf_w)/this._t_pdf_w;
        this._t_dr_y = Math.floor(this.pos.y * this._t_pdf_w)/this._t_pdf_w;
        this._t_dr_w = this._t_src_w/this._t_pdf_w;
        this._t_dr_h = this._t_src_h/this._t_pdf_w;
    };

    r2.PieceText.prototype.DrawPiece = function(){
        var canv = r2.pdfRenderer.getCanvas(this.GetNumPage());
        if(canv){
            r2.canv_ctx.drawImage(canv,
                this._t_src_x, this._t_src_y, this._t_src_w, this._t_src_h,
                this._t_dr_x, this._t_dr_y, this._t_dr_w, this._t_dr_h);
        }
    };


    /*
     * PieceTeared
     */
    r2.PieceTeared = function() {
        r2.Piece.call(this);
        this._username = null;
    };
    r2.PieceTeared.prototype = Object.create(r2.Piece.prototype);

    r2.PieceTeared.prototype.ExportToCmd = function(){
        // time: 2014-12-21T13...
        // user: 'red user'
        // op: 'CreateComment'
        // type: 'TextTearing'
        // anchorTo: ...
        // data: {pid: id, height: 0.1}
        var cmd = {};
        cmd.time = (new Date(this._creationTime)).toISOString();
        cmd.user = this._username;
        cmd.op = "CreateComment";
        cmd.type = "TextTearing";
        cmd.anchorTo = this._parent.GetAnchorTo();
        cmd.data = {};
        cmd.data.pid = this._id;
        cmd.data.height = this._cnt_size.y;
        return cmd;
    };
    r2.PieceTeared.prototype.getUsername = function(){
        return this._username;
    };
    r2.PieceTeared.prototype.GetAnchorTo = function(){
        //           {type: 'PieceTeared', id: pid, page: 2}
        var anchorCmd = {};
        anchorCmd.type = 'PieceTeared';
        anchorCmd.id = this.GetId();
        anchorCmd.page = this.GetNumPage();
        return anchorCmd;
    };
    r2.PieceTeared.prototype.resize = function(new_height){
        this._cnt_size.y = new_height;
    };
    r2.PieceTeared.prototype.SetPieceTeared = function(username){
        this._username = username;
    };
    r2.PieceTeared.prototype.DrawPiece = function(){
        var x_bgn = this.pos.x + this.GetTtIndent();

        r2.canv_ctx.setLineDash([r2Const.PIECE_LINE_DASH*0.75, r2Const.PIECE_LINE_DASH*0.25]);
        r2.canv_ctx.beginPath();
        r2.canv_ctx.moveTo(x_bgn, this.pos.y);
        r2.canv_ctx.lineTo(x_bgn + this._ttW, this.pos.y);
        r2.canv_ctx.strokeStyle = r2.userGroup.GetUser(this._username).color_normal_html;
        r2.canv_ctx.lineWidth = r2Const.PIECE_LINE_WIDTH;
        r2.canv_ctx.lineCap = 'butt';
        r2.canv_ctx.lineJoin = 'miter';
        r2.canv_ctx.stroke();
        r2.canv_ctx.setLineDash([]);

        if(this._visible) {
            r2.canv_ctx.beginPath();
            r2.canv_ctx.moveTo(x_bgn, this.pos.y);
            r2.canv_ctx.lineTo(x_bgn, this.pos.y+this._cnt_size.y);
            r2.canv_ctx.strokeStyle = r2.userGroup.GetUser(this._username).color_normal_html;
            r2.canv_ctx.lineWidth = r2Const.PIECE_LINE_WIDTH;
            r2.canv_ctx.lineCap = 'butt';
            r2.canv_ctx.lineJoin = 'miter';
            r2.canv_ctx.stroke();
        }
    };


    /*
     * PieceAudio
     */
    r2.PieceAudio = function() {
        r2.Piece.call(this);
        this._annotid = null;
        this._username = null;
        this._t_bgn = 0;
        this._t_end = 0;
        this._audio_dbs = [];
        this._audio_dbs_recording = [];

        this.__annot = null;
    };
    r2.PieceAudio.prototype = Object.create(r2.Piece.prototype);

    r2.PieceAudio.prototype.GetAnchorTo = function(){
        //           {type: 'CommentAudio', id: annotId, page: 2, time: [t0, t1]}
        var anchorCmd = {};
        anchorCmd.type = 'CommentAudio';
        anchorCmd.id = this._annotid;
        anchorCmd.page = this.GetNumPage();
        anchorCmd.time = [this._t_bgn, this._t_end];
        return anchorCmd;
    };
    r2.PieceAudio.prototype.Destructor = function(){
        r2.Piece.prototype.Destructor.apply(this);
    };
    r2.PieceAudio.prototype.GetAnnot = function(){
        if(this.__annot==null){
            this.__annot = r2App.annots[this._annotid];
        }
        return this.__annot;
    };
    r2.PieceAudio.prototype.GetAnnotId = function(){
        if(this._annotid != null){
            return this._annotid;
        }
    };
    r2.PieceAudio.prototype.SearchPieceByAnnotId = function(annotid){
        var result = r2.Obj.prototype.SearchPieceByAnnotId.apply(this, [annotid]);
        if(result){
            return result;
        }
        else{
            if(this._annotid == annotid){ // ToDo check it returns the first piece
                return this;
            }
            else{
                return null;
            }
        }
    };
    r2.PieceAudio.prototype.SearchPieceAudioByAnnotId = function(annotid, time){
        var rtn = r2.Obj.prototype.SearchPieceAudioByAnnotId.apply(this, [annotid, time]);
        if(rtn != null){
            return rtn;
        }
        else{
            if(this._annotid == annotid && time < this._t_end){
                return this;
            }
            else{
                return null;
            }
        }
    };
    r2.PieceAudio.prototype.GatherPieceAudioByAnnotId = function(annotid){
        var rtn = r2.Obj.prototype.GatherPieceAudioByAnnotId.apply(this, [annotid]);
        if(this._annotid == annotid){
            rtn = rtn.concat([this]);
        }
        return rtn;
    };
    r2.PieceAudio.prototype.GetTimeBgn = function(){
        return this._t_bgn;
    };
    r2.PieceAudio.prototype.GetTimeEnd = function(){
        return this._t_end;
    };
    r2.PieceAudio.prototype.SetPieceAudio = function(annotid, username, t_bgn, t_end){
        this._annotid = annotid;
        this._username = username;
        this._t_bgn = t_bgn;
        this._t_end = t_end;

        var w = (this._t_end-this._t_bgn)/r2Const.PIECEAUDIO_TIME_PER_WIDTH;
        var n = Math.floor(w/r2Const.PIECEAUDIO_STEP_W);

        this._audio_dbs = [];
        for(var i = 0; i < n+1; ++i){
            var v = 0.9*this.GetAnnot().SampleAudioDbs(this._t_bgn+i*r2Const.PIECEAUDIO_STEP_T);
            if(v>0){
                this._audio_dbs.push(v.toFixed(3));
            }
            else{
                this._audio_dbs.push(0);
            }
        }
    };
    r2.PieceAudio.prototype.UpdateAudioDbsRecording = function(t_end){
        this._t_end = t_end;

        var w = (this._t_end-this._t_bgn)/r2Const.PIECEAUDIO_TIME_PER_WIDTH;
        var n = Math.floor(w/r2Const.PIECEAUDIO_STEP_W);

        for(var i = this._audio_dbs_recording.length; i < n+1; ++i){
            var v = Math.max(0, 0.9*this.GetAnnot().SampleAudioDbs(this._t_bgn+i*r2Const.PIECEAUDIO_STEP_T));
            if(v>0){
                this._audio_dbs_recording.push(v);
            }
            else{
                this._audio_dbs_recording.push(0);
            }
        }
    };
    r2.PieceAudio.prototype.Relayout = function(){
        var rtn = r2.Piece.prototype.Relayout.apply(this, []);
        return rtn;
    };
    r2.PieceAudio.prototype.DrawPiece = function(){
        var x_bgn = this.pos.x + this.GetTtIndent();
        var y_bgn = this.pos.y-r2Const.PIECEAUDIO_LINE_WIDTH;

        if(this._isvisible){
            r2.canv_ctx.beginPath();
            var x = x_bgn;
            var y = y_bgn+this._cnt_size.y;
            r2.canv_ctx.moveTo(x, y);
            for(var i = 0; i < this._audio_dbs.length; ++i){
                x = x_bgn+i*r2Const.PIECEAUDIO_STEP_W;
                y = y_bgn+this._cnt_size.y*(1.0-this._audio_dbs[i]);
                r2.canv_ctx.lineTo(x, y);
            }
            y = y_bgn+this._cnt_size.y;
            r2.canv_ctx.lineTo(x, y);
            r2.canv_ctx.fillStyle = this.GetAnnot().GetUser().color_light_html;
            r2.canv_ctx.closePath();
            r2.canv_ctx.fill();
        }

        var cnt_size_y = this._cnt_size.y;
        if(!this._isvisible){
            cnt_size_y = 0
        }
        r2.canv_ctx.beginPath();


        r2.canv_ctx.moveTo(x_bgn, y_bgn+cnt_size_y);
        r2.canv_ctx.lineTo(x_bgn+this.GetTtIndentedWidth(), y_bgn+cnt_size_y);


        r2.canv_ctx.strokeStyle = this.GetAnnot().GetUser().color_light_html;
        r2.canv_ctx.lineWidth = r2Const.PIECEAUDIO_LINE_WIDTH;
        r2.canv_ctx.lineCap = 'round';
        r2.canv_ctx.lineJoin = 'round';
        r2.canv_ctx.stroke();


        if(this._t_bgn === 0) {
            var pieceaudios = this.GetParent().GatherPieceAudioByAnnotId(this._annotid);
            var lastpiece = pieceaudios[pieceaudios.length-1];
            var last_y = lastpiece.pos.y+lastpiece.GetContentSize().y-r2Const.PIECEAUDIO_LINE_WIDTH;
            var ratio = Math.pow(0.8, this.GetTtDepth());
            var x_tip = this.pos.x + this.GetTtIndent() - (r2Const.RADIALMENU_OFFSET_X - r2Const.RADIALMENU_RADIUS) * ratio;
            r2.canv_ctx.beginPath();
            r2.canv_ctx.moveTo(x_bgn, last_y);
            r2.canv_ctx.lineTo(x_bgn, y - cnt_size_y);
            r2.canv_ctx.lineTo(x_tip, y - cnt_size_y);
            r2.canv_ctx.fillStyle = this.GetAnnot().GetUser().color_audiopiece_guideline_html;
            r2.canv_ctx.closePath();
            r2.canv_ctx.fill();

            r2.canv_ctx.beginPath();
            r2.canv_ctx.moveTo(x_bgn, y_bgn);
            r2.canv_ctx.lineTo(x_bgn, last_y);
            r2.canv_ctx.strokeStyle = this.GetAnnot().GetUser().color_light_html;
            r2.canv_ctx.lineWidth = r2Const.PIECEAUDIO_LINE_WIDTH;
            r2.canv_ctx.lineCap = 'round';
            r2.canv_ctx.lineJoin = 'round';
            r2.canv_ctx.stroke();
        }
    };
    r2.PieceAudio.prototype.DrawPieceDynamic = function(cur_annot_id, canvas_ctx, force){
        var n;
        if(force){
            n = this._audio_dbs.length;
        }
        else{
            if(this._annotid != cur_annot_id){return;}
            n = Math.min((r2App.cur_audio_time-this._t_bgn)/r2Const.PIECEAUDIO_STEP_T, this._audio_dbs.length);
        }

        var x_bgn = this.pos.x + this.GetTtIndent();
        var y_bgn = this.pos.y-r2Const.PIECEAUDIO_LINE_WIDTH;

        canvas_ctx.beginPath();
        var x = x_bgn;
        var y = y_bgn+this._cnt_size.y;
        canvas_ctx.moveTo(x, y);
        for(var i = 0; i < n; ++i){
            x = x_bgn+i*r2Const.PIECEAUDIO_STEP_W;
            y = y_bgn+this._cnt_size.y*(1.0-this._audio_dbs[i]);
            canvas_ctx.lineTo(x, y);
        }
        y = y_bgn+this._cnt_size.y;
        canvas_ctx.lineTo(x, y);
        canvas_ctx.fillStyle = this.GetAnnot().GetUser().color_normal_html;
        canvas_ctx.closePath();
        canvas_ctx.fill();
    };
    r2.PieceAudio.prototype.GetPlayback = function(pt){
        var rtn = {};

        var dx = pt.x - this.pos.x - this.GetTtIndent();
        var t = this._t_bgn+r2Const.PIECEAUDIO_TIME_PER_WIDTH*dx;
        if( t > this._t_bgn && t < this._t_end){
            rtn.annot = this._annotid;
            rtn.t = t;
            return rtn;
        }
        else{
            return null;
        }
    };
    r2.PieceAudio.prototype.IsAnnotHasComment = function(annotid, rtn){
        if(this._annotid == annotid){
            rtn.push(this.child.length != 0);
        }
    };
    r2.PieceAudio.prototype.FillUpAudioDbs = function(){
        for(var i = this._audio_dbs.length; i < this._audio_dbs_recording.length; ++i) {
            r2App.cur_recording_minmax[0] = Math.min(this._audio_dbs_recording[i], r2App.cur_recording_minmax[0]);
            r2App.cur_recording_minmax[1] = Math.max(this._audio_dbs_recording[i], r2App.cur_recording_minmax[1]);
            var v = 0.9*(this._audio_dbs_recording[i]-r2App.cur_recording_minmax[0])/(r2App.cur_recording_minmax[1]-r2App.cur_recording_minmax[0]);
            this._audio_dbs.push(v.toFixed(3));
        }
    };
    r2.PieceAudio.prototype.RefreshAudioDbs = function(){
        this._audio_dbs = [];
        for(var i = 0; i < this._audio_dbs_recording.length; ++i) {
            r2App.cur_recording_minmax[0] = Math.min(this._audio_dbs_recording[i], r2App.cur_recording_minmax[0]);
            r2App.cur_recording_minmax[1] = Math.max(this._audio_dbs_recording[i], r2App.cur_recording_minmax[1]);
            var v = 0.9*(this._audio_dbs_recording[i]-r2App.cur_recording_minmax[0])/(r2App.cur_recording_minmax[1]-r2App.cur_recording_minmax[0]);
            this._audio_dbs.push(v.toFixed(3));
        }
    };
    r2.PieceAudio.prototype.NormalizePieceAudio = function(l, refresh_all){
        if(!refresh_all){
            var i, pa;
            for(i = 0; pa = l[i]; ++i){
                pa.FillUpAudioDbs();
            }
        }
        else{
            var i, pa;
            for(i = 0; pa = l[i]; ++i){
                pa.RefreshAudioDbs();
            }
        }
    };

    /*
     * PieceNewSpeak
     */
    r2.PieceNewSpeak = function(){
        r2.Piece.call(this);
        this._annotid = null;
        this._username = null;

        this.dom = null;
        this.dom_textbox = null;
        this.done_recording = true;
        this.done_captioning = true;
        this.annotids = [];
        this.to_upload_async = false;
        this.__contentschanged = false;
    };
    r2.PieceNewSpeak.prototype = Object.create(r2.Piece.prototype);
    r2.PieceNewSpeak.prototype.Destructor = function(){
        r2.Piece.prototype.Destructor.apply(this);
    };
    r2.PieceNewSpeak.prototype.ExportToCmd = function(){
        // time: 2014-12-21T13...
        // user: 'red user'
        // op: 'CreateComment'
        // type: 'CommentNewSpeak'
        // anchorTo: {type: 'PieceText or PieceTeared', id: pid, page: 2} or
        // data: {aid: ..., text: "this is a", isprivate:}
        var cmd = {};
        cmd.time = (new Date(this._creationTime)).toISOString();
        cmd.user = this._username;
        cmd.op = "CreateComment";
        cmd.type = "CommentNewSpeak";
        cmd.anchorTo = this._parent.GetAnchorTo();
        cmd.data = {};
        cmd.data.pid = this._id;
        cmd.data.aid = this._annotid;
        cmd.data.text = this.dom_textbox.innerHTML;
        cmd.data.annot = r2App.annots[this._annotid].ExportToCmd();
        return cmd;
    };
    r2.PieceNewSpeak.prototype.ExportToNewBaseAnnot = function(){
        // time: 2014-12-21T13...
        // user: 'red user'
        // op: 'CreateComment'
        // type: 'CommentNewSpeak'
        // anchorTo: {type: 'PieceText or PieceTeared', id: pid, page: 2} or
        // data: {aid: ..., text: "this is a", isprivate:}
        var cmd = {};
        cmd.time = (new Date(new Date().getTime()+100)).toISOString();
        cmd.user = this._username;
        cmd.op = "ChangeProperty";
        cmd.type = "PieceNewSpeakNewBaseAnnot";
        cmd.anchorTo = this._parent.GetAnchorTo();
        cmd.data = {};
        cmd.data.pid = this._id;
        cmd.data.aid = this._annotid;
        cmd.data.text = this.dom_textbox.innerHTML;
        cmd.target = this.GetTargetData();
        cmd.data.annot = r2App.annots[this.annotids[this.annotids.length-1]].ExportToCmd();
        return cmd;
    };
    r2.PieceNewSpeak.prototype.ExportToTextChange = function(){
        // time: 2014-12-21T13...
        // user: 'red user'
        // op: 'ChangeProperty'
        // type: 'PieceNewSpeakTextChange'
        // target: {type: 'PieceNewSpeak', pid: pid, page: 2}
        // data: 'lorem ipsum ...'
        var cmd = {};
        cmd.time = (new Date()).toISOString();
        cmd.user = this._username;
        cmd.op = "ChangeProperty";
        cmd.type = "PieceNewSpeakChange";
        cmd.target = this.GetTargetData();
        cmd.data = this.dom_textbox.innerHTML;

        return cmd;
    };
    r2.PieceNewSpeak.prototype.ExportToCmdDeleteComment = function(){
        // time: 2014-12-21T13...
        // user: 'red user'
        // op: 'DeleteComment'
        // target: {type: 'PieceKeyboard', pid: pid, page: 2}
        var cmd = {};
        cmd.time = (new Date()).toISOString();
        cmd.user = this._username;
        cmd.op = "DeleteComment";
        cmd.target = this.GetTargetData();
        return cmd;
    };
    r2.PieceNewSpeak.prototype.getUsername = function(){
        return this._username;
    };
    r2.PieceNewSpeak.prototype.GetTargetData = function() {
        return {
            type: 'PieceNewSpeak',
            pid: this.GetId(),
            aid: this._annotid,
            page: this.GetNumPage()
        };
    };
    r2.PieceNewSpeak.prototype.SetPieceNewSpeak = function(
        anchor_pid, annotid, username, inner_html, live_recording
    ){
        this._annotid = annotid;
        this._username = username;

        var dom = this.CreateDom();

        r2.dom_model.appendPieceEditableAudio(
            this._username,
            this._annotid,
            this.GetId(),
            anchor_pid,
            this._creationTime,
            dom,
            this,
            live_recording
        );
        this.SetText(inner_html);

        return dom;
    };
    r2.PieceNewSpeak.prototype.GetAnnotId = function(){
        if(this._annotid != null){
            return this._annotid;
        }
    };
    r2.PieceNewSpeak.prototype.GetAnchorTo = function(){
        // anchorTo: {type: 'PieceText', id: pid, page: 2} or
        var anchorCmd = {};
        anchorCmd.type = 'PieceNewSpeak';
        anchorCmd.id = this.GetId();
        anchorCmd.page = this.GetNumPage();
        return anchorCmd;
    };
    r2.PieceNewSpeak.prototype.SetText = function(text){
        this.dom_textbox.innerHTML = text;
        this.updateSizeWithTextInput();
        this.newspeak.updateText();
    };
    r2.PieceNewSpeak.prototype.SetNewBaseAnnot = function(data){

    };
    r2.PieceNewSpeak.prototype.CreateDom = function(){
        this.dom = document.createElement('div');
        this.dom.classList.toggle('r2_piece_editable_audio', true);
        this.dom.classList.toggle('unselectable', true);
        this.dom.setAttribute('aria-label', 'text comment');
        this.dom.setAttribute('role', 'article');

        this.dom_tr = document.createElement('div');
        this.dom_tr.classList.toggle('r2_piece_editable_audio_tr', true);
        this.dom_tr.classList.toggle('unselectable', true);
        $(this.dom_tr).css('left', this.GetTtIndent()*r2Const.FONT_SIZE_SCALE+'em');
        $(this.dom_tr).css('width', this.GetTtIndentedWidth()*r2Const.FONT_SIZE_SCALE+'em');
        this.dom.appendChild(this.dom_tr);

        this.dom_textbox = document.createElement('div');
        this.dom_textbox.setAttribute('contenteditable', this._username === r2.userGroup.cur_user.name);
        this.dom_textbox.classList.toggle('r2_piece_newspeak', true);
        this.dom_textbox.classList.toggle('text_selectable', true);
        this.dom_textbox.style.color = r2.userGroup.GetUser(this._username).color_piecekeyboard_text;
        this.dom_tr.appendChild(this.dom_textbox);

        this.dom_textbox.addEventListener('focus', function(event){
            r2App.cur_focused_piece_keyboard = this;
            var color = r2.userGroup.GetUser(this._username).color_piecekeyboard_box_shadow;
            this.dom_textbox.style.boxShadow = "0 0 0.2em "+color+" inset, 0 0 0.2em "+color;
            $(this.dom).css("pointer-events", 'auto');
            $(this.dom_textbox).toggleClass('editing', true);
        }.bind(this));
        r2.keyboard.pieceEventListener.setTextbox(this.dom_textbox);

        this.dom_textbox.addEventListener('input', function() {
            this.__contentschanged = true;
        }.bind(this));

        this.dom_textbox.addEventListener('blur', function(event){
            // remove cursor complete from the textbox,
            // otherwise it will interfere with mouse interaction for other visual entities
            window.getSelection().removeAllRanges();

            r2App.cur_focused_piece_keyboard = null;
            this.dom_textbox.style.boxShadow = "none";
            $(this.dom_textbox).toggleClass('editing', false);
            if(this.__contentschanged){
                r2Sync.uploader.pushCmd(this.ExportToTextChange());
                this.__contentschanged = false;
            }
        }.bind(this));

        this.newspeak = new r2.newspeakUI(this.dom_textbox, this._annotid, this.annotids, this._username === r2.userGroup.cur_user.name);
        this.newspeak.fitDomSize = function() {
            if(this.updateSizeWithTextInput()){
                r2App.invalidate_size = true;
                r2App.invalidate_page_layout = true;
                r2App.invalidate_dynamic_scene = true;
                r2App.invalidate_static_scene = true;
            }
        }.bind(this);
        this.newspeak.insertRecording = function(){
            r2.recordingCtrl.set(
                this._parent,
                { // option
                    ui_type: r2App.RecordingUI.NEW_SPEAK,
                    piece_to_insert: this
                }
            );
        }.bind(this);

        return this.dom;
    };
    r2.PieceNewSpeak.prototype.updateSizeWithTextInput = function(){
        var getHeight = function($target){
            var $next = $target.next();
            if($next.length !== 0){
                return $next.offset().top-$target.offset().top;
            }
            else{
                return $target.innerHeight();
            }
        };

        var new_height = r2.viewCtrl.mapDomToDocScale(getHeight($(this.dom)));
        if(this._cnt_size.y != new_height){
            this._cnt_size.y = new_height;
            return true;
        }
        return false;
    };
    r2.PieceNewSpeak.prototype.DrawPiece = function(){
        var x_bgn = this.pos.x + this.GetTtIndent();
        var y_bgn = this.pos.y-r2Const.PIECEAUDIO_LINE_WIDTH;

        r2.canv_ctx.beginPath();
        r2.canv_ctx.moveTo(x_bgn, y_bgn);
        r2.canv_ctx.lineTo(x_bgn, y_bgn+this._cnt_size.y);
        r2.canv_ctx.moveTo(x_bgn, y_bgn+this._cnt_size.y);
        r2.canv_ctx.lineTo(x_bgn+this.GetTtIndentedWidth(), y_bgn+this._cnt_size.y);

        r2.canv_ctx.strokeStyle = r2.userGroup.GetUser(this._username).color_light_html;
        r2.canv_ctx.lineWidth = r2Const.PIECEAUDIO_LINE_WIDTH;
        r2.canv_ctx.lineCap = 'round';
        r2.canv_ctx.lineJoin = 'round';
        r2.canv_ctx.stroke();
    };
    r2.PieceNewSpeak.prototype.DrawPieceDynamic = function(cur_annot_id, canvas_ctx, force) {
        if (this._annotid != cur_annot_id) {
            return;
        }
        this.newspeak.drawDynamic(canvas_ctx);
    };
    r2.PieceNewSpeak.prototype.resizeDom = function(){
        if(this.updateSizeWithTextInput()){
            r2App.invalidate_size = true;
            r2App.invalidate_page_layout = true;
            r2App.invalidate_dynamic_scene = true;
            r2App.invalidate_static_scene = true;
        }
    };
    r2.PieceNewSpeak.prototype.bgnCommenting = function(recording_annot_id){
        r2App.annots[recording_annot_id].setIsBaseAnnot();
        this.annotids.push(recording_annot_id);
        this.done_recording = false;
        this.done_captioning = false;
        this.newspeak.bgnCommenting();
    };
    r2.PieceNewSpeak.prototype.bgnCommentingAsync = function(recording_annot_id){
        this.newspeak.bgnCommentingAsync();
    };
    r2.PieceNewSpeak.prototype.setCaptionTemporary = function(words){
    };
    r2.PieceNewSpeak.prototype.setCaptionFinal = function(words){
        this.newspeak.setCaptionFinal(words, this.annotids[this.annotids.length-1]); // words and the base_annotid
        this.resizeDom();
    };
    r2.PieceNewSpeak.prototype.doneCaptioning = function(){
        this.Focus();
        this.done_captioning = true;
        this.doneCommentingAsync();
        this.resizeDom();
    };
    r2.PieceNewSpeak.prototype.onEndRecording = function(audioURL) {
        this.done_recording = true;
        this.newspeak.onEndRecording();
        this.gatherSpotlights();
        r2.radialMenu.bgnLoading('rm_'+r2.util.escapeDomId(this._annotid));
        this.doneCommentingAsync();
    };
    r2.PieceNewSpeak.prototype.gatherSpotlights = function(){
        var annot = r2App.annots[this._annotid];
        annot._spotlights = [];
        for(var i = 0; i < this.annotids.length; ++i){
            var base_annot = r2App.annots[this.annotids[i]];
            for(var j = 0; j < base_annot._spotlights.length; ++j){
                annot._spotlights.push(base_annot._spotlights[j]);
            }
        }
    };
    r2.PieceNewSpeak.prototype.doneCommentingAsync = function() {
        if(this.done_captioning && this.done_recording){
            r2.radialMenu.endLoading('rm_'+r2.util.escapeDomId(this._annotid));
            this.newspeak.doneCommentingAsync();
            if(this.to_upload_async){
                if(this.annotids.length == 1){
                    r2Sync.uploader.pushCmd(this.ExportToCmd());
                    r2Sync.uploader.pushCmd(this.ExportToNewBaseAnnot());
                }
                else{
                    r2Sync.uploader.pushCmd(this.ExportToNewBaseAnnot());
                }
            }
        }
    };
    r2.PieceNewSpeak.prototype.Focus = function(){
        this.dom_textbox.focus();
    };
    r2.PieceNewSpeak.prototype.SearchPieceByAnnotId = function(annotid){
        var result = r2.Obj.prototype.SearchPieceByAnnotId.apply(this, [annotid]);
        if(result){
            return result;
        }
        else{
            if(this._annotid == annotid){ // ToDo check it returns the first piece
                return this;
            }
            else{
                return null;
            }
        }
    };
    r2.PieceNewSpeak.prototype.SetData = function(data){
        this.newspeak.setData(data);
    };
    r2.PieceNewSpeak.prototype.Play = function(cbLoadingBgn, cbLoadingEnd){
        this.newspeak.Play(cbLoadingBgn, cbLoadingEnd);
    };
    r2.PieceNewSpeak.prototype.setUploadAsync = function(to_upload_async){
        this.to_upload_async = to_upload_async;
    };

    /*
     * PieceSimpleSpeech
     */
    r2.PieceSimpleSpeech = function(){
        r2.Piece.call(this);
        this._annotid = null;
        this._username = null;

        this.dom = null;
        this.dom_textbox = null;
        this.done_recording = true;
        this.done_captioning = true;
        this.annotids = [];
    };
    r2.PieceSimpleSpeech.prototype = Object.create(r2.Piece.prototype);
    r2.PieceSimpleSpeech.prototype.Destructor = function(){
        r2.Piece.prototype.Destructor.apply(this);
    };
    r2.PieceSimpleSpeech.prototype.SetPieceSimpleSpeech = function(
        anchor_pid, annotid, username, inner_html, live_recording
    ){
        this._annotid = annotid;
        this._username = username;

        var dom = this.CreateDom();

        r2.dom_model.appendPieceEditableAudio(
            this._username,
            this._annotid,
            this.GetId(),
            anchor_pid,
            this._creationTime,
            dom,
            this,
            live_recording
        );

        this.resizeDom();

        return dom;
    };
    r2.PieceSimpleSpeech.prototype.GetAnnotId = function(){
        if(this._annotid != null){
            return this._annotid;
        }
    };
    r2.PieceSimpleSpeech.prototype.GetAnchorTo = function(){
        // anchorTo: {type: 'PieceText', id: pid, page: 2} or
        var anchorCmd = {};
        anchorCmd.type = 'PieceSimpleSpeech';
        anchorCmd.id = this.GetId();
        anchorCmd.page = this.GetNumPage();
        return anchorCmd;
    };
    r2.PieceSimpleSpeech.prototype.CreateDom = function(){
        this.dom = document.createElement('div');
        this.dom.classList.toggle('r2_piece_editable_audio', true);
        this.dom.classList.toggle('unselectable', true);
        this.dom.setAttribute('aria-label', 'text comment');
        this.dom.setAttribute('role', 'article');

        this.dom_tr = document.createElement('div');
        this.dom_tr.classList.toggle('r2_piece_editable_audio_tr', true);
        this.dom_tr.classList.toggle('unselectable', true);
        $(this.dom_tr).css('left', this.GetTtIndent()*r2Const.FONT_SIZE_SCALE+'em');
        $(this.dom_tr).css('width', this.GetTtIndentedWidth()*r2Const.FONT_SIZE_SCALE+'em');
        this.dom.appendChild(this.dom_tr);

        var dom_overlay = document.createElement('div');
        dom_overlay.classList.toggle('ssui-overlay', true);
        dom_overlay.classList.toggle('unselectable', true);

        this.dom_tr.appendChild(dom_overlay);

        this.dom_textbox = document.createElement('div');
        this.dom_textbox.setAttribute('contenteditable', this._username === r2.userGroup.cur_user.name);
        this.dom_textbox.classList.toggle('r2_piece_simplespeech', true);
        this.dom_textbox.classList.toggle('text_selectable', true);
        this.dom_textbox.style.color = r2.userGroup.GetUser(this._username).color_piecekeyboard_text;
        this.dom_tr.appendChild(this.dom_textbox);

        // SimpleSpeech UI wrapper
        this.simplespeech = new r2.transcriptionUI(
            this.dom_textbox, dom_overlay, this._annotid, this.annotids
        );

        /* add event handlers*/
        this.simplespeech.on_input = function() {
            if(this.updateSizeWithTextInput()){
                r2App.invalidate_size = true;
                r2App.invalidate_page_layout = true;
                r2App.invalidate_dynamic_scene = true;
                r2App.invalidate_static_scene = true;
            }
        }.bind(this);

        this.simplespeech.synthesizeAndPlay = function(content_changed, time){
            return new Promise(function(resolve, reject){
                if(content_changed){
                    this.simplespeech.synthesizeNewAnnot(this._annotid).then(
                        function(){
                            r2.rich_audio.play(this._annotid, time);
                            resolve();
                        }.bind(this)
                    );
                }
                else{
                    r2.rich_audio.play(this._annotid,time);
                    resolve();
                }
            }.bind(this));
        }.bind(this);

        this.simplespeech.insertRecording = function(){
            r2.recordingCtrl.set(
                this._parent,
                { // option
                    ui_type: r2App.RecordingUI.SIMPLE_SPEECH,
                    piece_to_insert: this
                }
            );
        }.bind(this);

        this.simplespeech.bgn_streaming = function(){
            r2.radialMenu.bgnLoading('rm_'+r2.util.escapeDomId(this._annotid));
        }.bind(this);
        this.simplespeech.end_streaming = function(){
            r2.radialMenu.endLoading('rm_'+r2.util.escapeDomId(this._annotid));
        }.bind(this);



        this.dom_textbox.addEventListener('focus', function(event){
            r2App.cur_focused_piece_keyboard = this;
            var color = r2.userGroup.GetUser(this._username).color_piecekeyboard_box_shadow;
            this.dom_textbox.style.boxShadow = "0 0 0.2em "+color+" inset, 0 0 0.2em "+color;
            $(this.dom).css("pointer-events", 'auto');
            $(this.dom_textbox).toggleClass('editing', true);
        }.bind(this));
        r2.keyboard.pieceEventListener.setTextbox(this.dom_textbox);

        this.dom_textbox.addEventListener('blur', function(event){
            // remove cursor complete from the textbox,
            // otherwise it will interfere with mouse interaction for other visual entities
            window.getSelection().removeAllRanges();

            r2App.cur_focused_piece_keyboard = null;
            this.dom_textbox.style.boxShadow = "none";

            //$(this.dom).css("pointer-events", 'none');
            $(this.dom_textbox).toggleClass('editing', false);
        }.bind(this));
        /* add event handlers*/

        return this.dom;
    };
    r2.PieceSimpleSpeech.prototype.updateSizeWithTextInput = function(){
        var getHeight = function($target){
            var $next = $target.next();
            if($next.length !== 0){
                return $next.offset().top-$target.offset().top;
            }
            else{
                return $target.innerHeight();
            }
        };

        var new_height = r2.viewCtrl.mapDomToDocScale(getHeight($(this.dom)));
        if(this._cnt_size.y != new_height){
            this._cnt_size.y = new_height;
            return true;
        }
        return false;
    };
    r2.PieceSimpleSpeech.prototype.DrawPiece = function(){
        var x_bgn = this.pos.x + this.GetTtIndent();
        var y_bgn = this.pos.y-r2Const.PIECEAUDIO_LINE_WIDTH;

        r2.canv_ctx.beginPath();
        r2.canv_ctx.moveTo(x_bgn, y_bgn);
        r2.canv_ctx.lineTo(x_bgn, y_bgn+this._cnt_size.y);
        r2.canv_ctx.moveTo(x_bgn, y_bgn+this._cnt_size.y);
        r2.canv_ctx.lineTo(x_bgn+this.GetTtIndentedWidth(), y_bgn+this._cnt_size.y);

        r2.canv_ctx.strokeStyle = r2.userGroup.GetUser(this._username).color_light_html;
        r2.canv_ctx.lineWidth = r2Const.PIECEAUDIO_LINE_WIDTH;
        r2.canv_ctx.lineCap = 'round';
        r2.canv_ctx.lineJoin = 'round';
        r2.canv_ctx.stroke();
    };
    r2.PieceSimpleSpeech.prototype.DrawPieceDynamic = function(cur_annot_id, canvas_ctx, force) {
        if (this._annotid != cur_annot_id) {
            return;
        }
        this.simplespeech.drawDynamic(r2App.cur_audio_time);
    };
    r2.PieceSimpleSpeech.prototype.resizeDom = function(){
        if(this.updateSizeWithTextInput()){
            r2App.invalidate_size = true;
            r2App.invalidate_page_layout = true;
            r2App.invalidate_dynamic_scene = true;
            r2App.invalidate_static_scene = true;
        }
    };
    r2.PieceSimpleSpeech.prototype.bgnCommenting = function(recording_annot_id){
        console.log('bgnCommenting');
        r2App.annots[recording_annot_id].setIsBaseAnnot();
        this.annotids.push(recording_annot_id);
        this.done_recording = false;
        this.done_captioning = false;
        this.simplespeech.bgnCommenting();
    };
    r2.PieceSimpleSpeech.prototype.bgnCommentingAsync = function(recording_annot_id){
        console.log('bgnCommentingAsync');
        this.simplespeech.bgnCommentingAsync();
    };
    r2.PieceSimpleSpeech.prototype.setCaptionTemporary = function(words){
    };
    r2.PieceSimpleSpeech.prototype.setCaptionFinal = function(words){
        this.simplespeech.setCaptionFinal(words, this.annotids[this.annotids.length-1]);
        this.resizeDom();
    };
    r2.PieceSimpleSpeech.prototype.doneCaptioning = function(){
        this.Focus();
        this.done_captioning = true;
        this.doneCommentingAsync();
        this.resizeDom();
    };
    r2.PieceSimpleSpeech.prototype.onEndRecording = function(audioURL) {
        this.done_recording = true;
        this.simplespeech.endCommenting();
        r2.radialMenu.bgnLoading('rm_'+r2.util.escapeDomId(this._annotid));
        this.doneCommentingAsync();
    };
    r2.PieceSimpleSpeech.prototype.doneCommentingAsync = function() {
        if(this.done_captioning && this.done_recording){
            r2.radialMenu.endLoading('rm_'+r2.util.escapeDomId(this._annotid));
            this.simplespeech.doneCommentingAsync();
            this.simplespeech.synthesizeNewAnnot(this._annotid);
        }
    };
    r2.PieceSimpleSpeech.prototype.Focus = function(){
        this.dom_textbox.focus();
    };
    r2.PieceSimpleSpeech.prototype.SearchPieceByAnnotId = function(annotid){
        var result = r2.Obj.prototype.SearchPieceByAnnotId.apply(this, [annotid]);
        if(result){
            return result;
        }
        else{
            if(this._annotid == annotid){ // ToDo check it returns the first piece
                return this;
            }
            else{
                return null;
            }
        }
    };
    r2.PieceSimpleSpeech.prototype.SetData = function(data){
        this.simplespeech.SetData(data);
    };

    /*
     * PieceKeyboard
     */
    r2.PieceKeyboard = function() {
        r2.Piece.call(this);
        this._annotid = null;
        this._username = null;

        this.dom = null;
        this.dom_textbox = null;

        this.__private_shift_x = null;
        this._isprivate = false;

        this.__contentschanged = false;
    };
    r2.PieceKeyboard.prototype = Object.create(r2.Piece.prototype);

    r2.PieceKeyboard.prototype.Destructor = function(){
        r2.Piece.prototype.Destructor.apply(this);
    };
    r2.PieceKeyboard.prototype.getUsername = function(){
        return this._username;
    };
    r2.PieceKeyboard.prototype.GetAnchorTo = function(){
        // anchorTo: {type: 'PieceText', id: pid, page: 2} or
        var anchorCmd = {};
        anchorCmd.type = 'PieceKeyboard';
        anchorCmd.id = this.GetId();
        anchorCmd.page = this.GetNumPage();
        return anchorCmd;
    };
    r2.PieceKeyboard.prototype.WasChanged = function(){
        return this.__contentschanged;
    };
    r2.PieceKeyboard.prototype.SetText = function(text){
        this.dom_textbox.innerHTML = text;
        this.ResizeDom();
    };
    r2.PieceKeyboard.prototype.ExportToCmd = function(){
        // time: 2014-12-21T13...
        // user: 'red user'
        // op: 'CreateComment'
        // type: 'CommentText'
        // anchorTo: {type: 'PieceText or PieceTeared', id: pid, page: 2} or
        // data: {aid: ..., text: "this is a", isprivate:}
        var cmd = {};
        cmd.time = (new Date(this._creationTime)).toISOString();
        cmd.user = this._username;
        cmd.op = "CreateComment";
        cmd.type = "CommentText";
        cmd.anchorTo = this._parent.GetAnchorTo();
        cmd.data = {};
        cmd.data.pid = this._id;
        cmd.data.aid = this._annotid;
        cmd.data.text = this.dom_textbox.innerHTML;
        cmd.data.isprivate = this._isprivate;

        return cmd;
    };
    r2.PieceKeyboard.prototype.ExportToTextChange = function(){
        // time: 2014-12-21T13...
        // user: 'red user'
        // op: 'ChangeProperty'
        // type: 'PieceKeyboardTextChange'
        // target: {type: 'PieceKeyboard', pid: pid, page: 2}
        // data: 'lorem ipsum ...'
        var cmd = {};
        cmd.time = (new Date()).toISOString();
        cmd.user = this._username;
        cmd.op = "ChangeProperty";
        cmd.type = "PieceKeyboardTextChange";
        cmd.target = this.GetTargetData();
        cmd.data = this.dom_textbox.innerHTML;

        return cmd;
    };

    r2.PieceKeyboard.prototype.ExportToCmdPubPrivate = function(){
        // time: 2014-12-21T13...
        // user: 'red user'
        // op: 'ChangeProperty'
        // type: 'PieceKeyboardPubPrivate'
        // target: {type: 'PieceKeyboard', pid: pid, page: 2}
        // data: 'private' or 'pub'
        var cmd = {
            time: (new Date()).toISOString(),
            user: this._username,
            op: "ChangeProperty",
            type: "PieceKeyboardPubPrivate",
            target: this.GetTargetData(),
            data: this._isprivate ? "private" : "pub"
        };
        return cmd;
    };
    r2.PieceKeyboard.prototype.ExportToCmdDeleteComment = function(){
        // time: 2014-12-21T13...
        // user: 'red user'
        // op: 'DeleteComment'
        // target: {type: 'PieceKeyboard', pid: pid, page: 2}
        var cmd = {};
        cmd.time = (new Date()).toISOString();
        cmd.user = this._username;
        cmd.op = "DeleteComment";
        cmd.target = this.GetTargetData();
        return cmd;
    };
    r2.PieceKeyboard.prototype.SetPieceKeyboard = function(anchor_pid, annotid, username, text, isprivate, isOnLeftColumn){
        this._annotid = annotid;
        this._username = username;

        var dom = this.CreateDom();
        this.SetText(text);
        this._isprivate = isprivate;
        if(this._isprivate){
            //$(this.dom_btn_pub).toggleClass("fa-flip-horizontal", r2.util.myXOR(true, isOnLeftColumn));
        }
        else{
            //$(this.dom_btn_pub).toggleClass("fa-flip-horizontal", r2.util.myXOR(false, isOnLeftColumn));
        }

        r2.dom_model.appendPieceKeyboard(
            this._username,
            this._annotid,
            this.GetId(),
            anchor_pid,
            this._creationTime,
            dom,
            this
        );

        this.UpdateSizeWithTextInput();

        return dom;
    };
    r2.PieceKeyboard.prototype.GetAnnotId = function(){
        if(this._annotid != null){
            return this._annotid;
        }
    };
    r2.PieceKeyboard.prototype.GetPrivateShiftX = function(){
        if(this.__private_shift_x == null){
            if(this.IsOnLeftColumn()){
                this.__private_shift_x = -r2Const.PIECEKEYBOARD_PRIVATE_SHIFT_X;
            }
            else{
                this.__private_shift_x = r2Const.PIECEKEYBOARD_PRIVATE_SHIFT_X;
            }
        }
        return this.__private_shift_x;
    };
    r2.PieceKeyboard.prototype.GetTargetData = function() {
        return {
            type: 'PieceKeyboard',
            pid: this.GetId(),
            aid: this._annotid,
            page: this.GetNumPage()
        };
    };
    r2.PieceKeyboard.prototype.CreateDom = function(){
        this.dom = document.createElement('div');
        this.dom.classList.toggle('r2_piecekeyboard', true);
        this.dom.classList.toggle('unselectable', true);
        this.dom.setAttribute('aria-label', 'text comment');
        this.dom.setAttribute('role', 'article');

        this.dom_tr = document.createElement('div');
        this.dom_tr.classList.toggle('r2_peicekeyboard_tr', true);
        this.dom_tr.classList.toggle('unselectable', true);
        this.dom.appendChild(this.dom_tr);

        this.dom_textbox = document.createElement('div');
        this.dom_textbox.classList.toggle('r2_piecekeyboard_textbox', true);
        this.dom_textbox.classList.toggle('text_selectable', true);
        this.dom_textbox.setAttribute('contenteditable', 'true');
        this.dom_textbox.style.color = r2.userGroup.GetUser(this._username).color_piecekeyboard_text;
        this.dom_tr.appendChild(this.dom_textbox);

        $(this.dom_tr).css('left', this.GetTtIndent()*r2Const.FONT_SIZE_SCALE+'em');
        $(this.dom_tr).css('width', this.GetTtIndentedWidth()*r2Const.FONT_SIZE_SCALE+'em');

        if(this._username != r2.userGroup.cur_user.name){
            this.dom_textbox.setAttribute('contenteditable', 'false');
        }

        /* add event handlers*/
        var func_UpdateSizeWithTextInput = this.UpdateSizeWithTextInput.bind(this);

        this.dom_textbox.addEventListener('input', function() {
            this.__contentschanged = true;
            if(func_UpdateSizeWithTextInput()){
                r2App.invalidate_size = true;
                r2App.invalidate_page_layout = true;
            }
        }.bind(this), false);

        this.dom_textbox.addEventListener('focus', function(event){
            r2App.cur_focused_piece_keyboard = this;
            var color = r2.userGroup.GetUser(this._username).color_piecekeyboard_box_shadow;
            this.dom_textbox.style.boxShadow = "0 0 0.2em "+color+" inset, 0 0 0.2em "+color;
            $(this.dom).css("pointer-events", 'auto');
        }.bind(this));
        r2.keyboard.pieceEventListener.setTextbox(this.dom_textbox);

        this.dom_textbox.addEventListener('blur', function(event){
            // remove cursor complete from the textbox,
            // otherwise it will interfere with mouse interaction for other visual entities
            window.getSelection().removeAllRanges();

            r2App.cur_focused_piece_keyboard = null;
            this.dom_textbox.style.boxShadow = "none";
            $(this.dom).css("pointer-events", 'none');
            if(this.__contentschanged){
                console.log('>>>>__contentschanged:', this.ExportToTextChange());
                r2Sync.uploader.pushCmd(this.ExportToTextChange());
                this.__contentschanged = false;
            }
        }.bind(this));
        /* add event handlers*/

        this.ResizeDom();

        return this.dom;
    };
    r2.PieceKeyboard.prototype.edit = function(){
        this.dom_textbox.focus();
    };

    r2.PieceKeyboard.prototype.SetPubPrivate = function(isprivate){
        this._isprivate = isprivate;
    };
    r2.PieceKeyboard.prototype.UpdateForPubPrivate = function(){
        if(this._isprivate){
            //$(this.dom_btn_pub).toggleClass("fa-flip-horizontal", r2.util.myXOR(true, this.IsOnLeftColumn()));
        }
        else{
            //$(this.dom_btn_pub).toggleClass("fa-flip-horizontal", r2.util.myXOR(false, this.IsOnLeftColumn()));
        }
    };
    r2.PieceKeyboard.prototype.Relayout = function(){
        this._isvisible = (!this._isprivate || r2.userGroup.cur_user.name == this._username);
        return r2.Piece.prototype.Relayout.apply(this, []);
    };
    r2.PieceKeyboard.prototype.DrawPiece = function(){
        var x_shift = this._isprivate ? this.GetPrivateShiftX() : 0;
        if(!this._isvisible){
            x_shift = -100;
        }

        var x_bgn = this.pos.x + this.GetTtIndent()+x_shift;
        var y_bgn = this.pos.y-r2Const.PIECEAUDIO_LINE_WIDTH;

        if(this._isprivate && this._isvisible){ // private
            r2.canv_ctx.fillStyle = 'dimgray';
            if(x_shift < 0){
                var x = x_bgn+this.GetTtIndentedWidth();
                r2.canv_ctx.fillRect(x,y_bgn,this.pos.x+this._cnt_size.x-x,this._cnt_size.y);
            }
            else{
                r2.canv_ctx.fillRect(this.pos.x,y_bgn,x_bgn-this.pos.x,this._cnt_size.y);
            }
            r2.canv_ctx.fillStyle = 'white';
            r2.canv_ctx.fillRect(this.pos.x+x_shift,y_bgn,this._cnt_size.x,this._cnt_size.y);
        }

        r2.canv_ctx.beginPath();
        r2.canv_ctx.moveTo(x_bgn, y_bgn);
        r2.canv_ctx.lineTo(x_bgn, y_bgn+this._cnt_size.y);
        r2.canv_ctx.moveTo(x_bgn, y_bgn+this._cnt_size.y);
        r2.canv_ctx.lineTo(x_bgn+this.GetTtIndentedWidth(), y_bgn+this._cnt_size.y);

        r2.canv_ctx.strokeStyle = r2.userGroup.GetUser(this._username).color_light_html;
        r2.canv_ctx.lineWidth = r2Const.PIECEAUDIO_LINE_WIDTH;
        r2.canv_ctx.lineCap = 'round';
        r2.canv_ctx.lineJoin = 'round';
        r2.canv_ctx.stroke();
    };

    r2.PieceKeyboard.prototype.DrawSelected = function(canvas_ctx, x_offset){
        if(this._visible) {
            if(typeof x_offset === "undefined"){
                if(this._isprivate){
                    x_offset = this.GetPrivateShiftX();
                }
                else{
                    x_offset = 0;
                }
            }
            r2.Piece.prototype.DrawSelected.apply(this, [canvas_ctx, x_offset]);
        }
    };

    r2.PieceKeyboard.prototype.UpdateSizeWithTextInput = function(){
        var realHeight = function($target){
            var $next = $target.next();
            if($next.length !== 0){
                return $next.offset().top-$target.offset().top;
            }
            else{
                return $target.innerHeight();
            }
        };

        var new_height = r2.viewCtrl.mapDomToDocScale(realHeight($(this.dom)));
        if(this._cnt_size.y != new_height){
            this._cnt_size.y = new_height;
            return true;
        }
        return false;
    };
    r2.PieceKeyboard.prototype.ResizeDom = function(){
        this.UpdateSizeWithTextInput();
    };
    r2.PieceKeyboard.prototype.Focus = function(){
        this.dom_textbox.focus();
    };
    r2.PieceKeyboard.prototype.IsAnnotHasComment = function(annotid, rtn){
        if(this._annotid == annotid){
            rtn.push(this.child.length != 0);
        }
    };
    r2.PieceKeyboard.prototype.SearchPieceByAnnotId = function(annotid){
        var result = r2.Obj.prototype.SearchPieceByAnnotId.apply(this, [annotid]);
        if(result){
            return result;
        }
        else{
            if(this._annotid == annotid){
                return this;
            }
            else{
                return null;
            }
        }
    };

    /*
     * Annot
     */
    r2.Annot = function(){
        this._id = null;
        this._anchorpid = null;
        this._bgn_time = 0;
        this._duration = 0;
        this._audio_dbs = [];
        this._username = null;
        this._spotlights = [];
        this._inks = [];
        this._audiofileurl = "";
        this._is_base_annot = false;
        this._ui_type = null;
    };

    r2.Annot.prototype.ExportToCmd = function(){
        // time: 2014-12-21T13...
        // user: 'red user'
        // op: 'CreateComment'
        // type: CommentAudio
        // anchorTo: {type: 'PieceText', id: pid, page: 2} or
        //           {type: 'PieceTeared', id: pid, page: 2}
        //           {type: 'CommentAudio', id: annotId, page: 2, time: [t0, t1]}
        // data: {aid: ..., duration: t, waveform_sample: [0, 100, 99, 98 ...], Spotlights: [Spotlight, Spotlight, ...] };
        var cmd = {};
        cmd.time = new Date(this._bgn_time).toISOString();
        cmd.user = this._username;
        cmd.op = 'CreateComment';
        cmd.type = 'CommentAudio';
        cmd.anchorTo = r2App.pieces_cache[this._anchorpid].GetAnchorTo();
        cmd.data = {};
        cmd.data.aid = this._id;
        cmd.data.duration = this._duration;
        cmd.data.waveform_sample = this._ui_type === 'new_speak' ? [] : this._audio_dbs;
        cmd.data.Spotlights = [];
        this._spotlights.forEach(function(splght){
            cmd.data.Spotlights.push(splght.ExportToCmd());
        });
        cmd.data.Inks = [];
        this._inks.forEach(function(ink){
            cmd.data.Inks.push(ink.ExportToCmd());
        });
        cmd.data.audiofileurl = this._audiofileurl;
        cmd.data.ui_type = this._ui_type;
        cmd.data.is_base_annot = this._is_base_annot;
        return cmd;
    };
    r2.Annot.prototype.setIsBaseAnnot = function(){
        this._is_base_annot = true;
    };
    r2.Annot.prototype.getIsBaseAnnot = function(){
        return this._is_base_annot;
    };
    r2.Annot.prototype.ExportToCmdDeleteComment = function(){
        // time: 2014-12-21T13...
        // user: 'red user'
        // op: 'DeleteComment'
        // target: {type: 'PieceKeyboard', pid: pid, page: 2}
        var cmd = {};
        cmd.time = (new Date()).toISOString();
        cmd.user = this._username;
        cmd.op = "DeleteComment";
        cmd.target = this.GetTargetData();
        return cmd;
    };
    r2.Annot.prototype.GetTargetData = function(){
        return {
            type: 'CommentAudio',
            aid: this._id,
            page: r2App.pieces_cache[this._anchorpid].GetNumPage()
        };
    };
    r2.Annot.prototype.GetDuration = function(){
        return this._duration;
    };
    r2.Annot.prototype.GetId = function(){
        return this._id;
    };
    r2.Annot.prototype.GetAnchorPid = function(){
        return this._anchorpid;
    };
    r2.Annot.prototype.GetAnnotId = r2.Annot.prototype.GetId;
    r2.Annot.prototype.GetBgnTime = function(){
        return this._bgn_time;
    };
    r2.Annot.prototype.GetRecordingAudioBlob = function(){
        return this._reacordingaudioblob;
    };
    r2.Annot.prototype.GetSpotlightsByNumPage = function(n){
        return this._spotlights.filter(function(spotlight){return spotlight.GetPage() == n;})
    };
    r2.Annot.prototype.GetInksByNumPage = function(n){
        return this._inks.filter(function(Ink){return Ink.GetPage() == n;})
    };
    r2.Annot.prototype.GetUser = function(){
        return r2.userGroup.GetUser(this._username);
    };
    r2.Annot.prototype.GetUsername = function(){
        return this._username;
    };
    r2.Annot.prototype.SetAnnot = function(id, anchorpid, t_bgn, duration, audio_dbs, username, audiofileurl, ui_type){
        this._id = id;
        this._anchorpid = anchorpid;
        this._bgn_time = t_bgn;
        this._duration = duration;
        this._audio_dbs = audio_dbs;
        this._username = username;

        this._audiofileurl = audiofileurl;
        this._reacordingaudioblob = null;
        this._ui_type = ui_type;
    };
    r2.Annot.prototype.AddSpotlight = function(spotlight, toupload){
        this._spotlights.push(spotlight);
    };
    r2.Annot.prototype.addInk = function(ink, toupload){
        if(ink.segments.length>0){
            this._inks.push(ink);
        }
    };
    r2.Annot.prototype.detachInk = function(ink){
        var idx = this._inks.indexOf(ink);
        if(idx > -1){
            this._inks.splice(idx, 1);
        }
    };
    r2.Annot.prototype.GetAudioFileUrl = function(){
        return r2.util.normalizeUrl(this._audiofileurl);
    };
    r2.Annot.prototype.SetRecordingAudioFileUrl = function(url, blob, buffer){
        this._audiofileurl = url;
        this._reacordingaudioblob = blob;

        if(buffer){
            var view = new DataView(buffer);
            var l = [];
            for(var i = 44; i < buffer.byteLength; i+=2){
                var v = view.getInt16(i, true);
                l.push(v);
            }

            this._duration = 1000*l.length/r2.audioRecorder.RECORDER_SAMPLE_RATE;

            var samples_per_sec = 256;
            var n_chunk = Math.floor(r2.audioRecorder.RECORDER_SAMPLE_RATE/samples_per_sec+0.5); // 32 power samples per sec
            this._audio_dbs = [];
            for(var i = 0, d = Math.floor(l.length/n_chunk); i < d; ++i){
                this._audio_dbs.push(r2.util.rootMeanSquare(l, n_chunk*i, n_chunk*(i+1)));
            }

            var min = 0.0;
            var max = 0.2;
            this._audio_dbs.forEach(function(v){
                min = Math.min(min, v);
                max = Math.max(max, v);
            });
            for(var i = 0; i < this._audio_dbs.length; ++i){
                this._audio_dbs[i] = ((this._audio_dbs[i]-min)/(max-min)).toFixed(3);
            }

        }
    };

    r2.Annot.prototype.SampleAudioDbs = function(msec) {
        var x = this._audio_dbs.length*(msec/this._duration);
        var p = x-Math.floor(x);
        var v0 = (1.0-p)*this._audio_dbs[Math.max(0, Math.min(this._audio_dbs.length-1, Math.floor(x)))];
        var v1 = p*this._audio_dbs[Math.max(0, Math.min(this._audio_dbs.length-1, Math.floor(x)+1))];
        return v0+v1;
    };
    r2.Annot.prototype.UpdateDbs = function(dbs){
        this._duration = r2App.cur_time-this._bgn_time;

        var dbsPerSec = r2.audioRecorder.RECORDER_POWER_SAMPLE_PER_SEC;
        var nDbs = Math.floor((r2App.cur_time-this._bgn_time) * dbsPerSec);

        for(var i = this._audio_dbs.length; i < nDbs; ++i) {
            this._audio_dbs.push((r2.audioRecorder.RECORDER_SAMPLE_SCALE*dbs).toFixed(3));
        }
    };


    /* abstract annot that contains private spotlights */
    r2.AnnotPrivateSpotlight = function() {
        r2.Annot.call(this);
        this.timeLastChanged = 0;
        this.changed = false;
        this._spotlightsDictionary = {};
        this._spotlightsToUpload = [];
    };
    r2.AnnotPrivateSpotlight.prototype = Object.create(r2.Annot.prototype);
    r2.AnnotPrivateSpotlight.prototype.ExportToCmd = function(){
        // time: 2014-12-21T13...
        // user: 'red user'
        // op: 'CreateComment'
        // type: PrivateHighlight
        // data: {Spotlights: [Spotlight, Spotlight, ...] };
        var cmd ={};
        cmd.time = new Date(this.timeLastChanged).toISOString();
        cmd.user = r2.userGroup.cur_user.name;
        cmd.op = "CreateComment";
        cmd.type = "PrivateHighlight";
        cmd.data = {};
        cmd.data.Spotlights = [];
        this._spotlightsToUpload.forEach(function(splght){
            cmd.data.Spotlights.push(splght.ExportToCmd());
        });
        this._spotlightsToUpload = [];
        return cmd;
    };
    r2.AnnotPrivateSpotlight.prototype.AddSpotlight = function(spotlight, toupload){
        if(spotlight.time in this._spotlightsDictionary){return;}
        this._spotlights.push(spotlight);
        this._spotlightsDictionary[spotlight.time] = true;
        if(toupload){
            this._spotlightsToUpload.push(spotlight);
        }
    };
    r2.AnnotPrivateSpotlight.prototype.getCmdsToUpload = function(){
        if( this.changed &&
            r2App.cur_time-this.timeLastChanged > r2Const.TIMEOUT_PRIVATE_HIGHLIGHT_UPDATE){

            this.changed = false;
            return this.ExportToCmd();
        }
        else{
            return null;
        }
    };

    /* abstract annot that contains static inks */
    r2.AnnotStaticInk = function(){
        r2.Annot.call(this);
        this.inks_dict = {};
        this.add_ink_cmd_uploader = new r2.CmdTimedUploader();
        this.add_ink_cmd_uploader.init(r2Const.TIMEOUT_STATIC_INK_UPDATE);
    };
    r2.AnnotStaticInk.prototype = Object.create(r2.Annot.prototype);
    r2.AnnotStaticInk.prototype.addInk = function(ink, to_upload){
        if(ink._t_bgn in this.inks_dict){return;}

        this._inks.push(ink);
        this.inks_dict[ink._t_bgn] = true;

        if(to_upload){
            this.add_ink_cmd_uploader.addCmd(ink.ExportToCmd());
        }
    };
    r2.AnnotStaticInk.prototype.getCmdsToUpload = function(){
        // time: 2014-12-21T13...
        // user: 'red user'
        // op: 'CreateComment'
        // type: 'StaticInk'
        // data: {inks: [Ink, Ink, ...] };
        var ink_cmds = this.add_ink_cmd_uploader.getCmdsToUpload();
        if(ink_cmds){
            var cmd ={};
            cmd.time = new Date(ink_cmds.time).toISOString();
            cmd.user = r2.userGroup.cur_user.name;
            cmd.op = "CreateComment";
            cmd.type = "StaticInk";
            cmd.data = {};
            cmd.data.inks = ink_cmds.cmds;
            return cmd;
        }
        return null;
    };
    r2.AnnotStaticInk.prototype.checkCmdToUploadExist = function(){
        return this.add_ink_cmd_uploader.checkCmdToUploadExist();
    };

    /*
     * Ink
     */
    r2.Ink = function(){
        this._username = '';
        this._annotid = null;
        this._t_bgn = 0;
        this._t_end = 0;
        this.npage = 0;
        this._pid = '';
        this.segments = [];
    };
    r2.Ink.prototype.SetInk = function(pid, username, annotid, t_bgn_and_end, npage){
        this._pid = pid;
        this._username = username;

        this._annotid = annotid !== '' ?
            annotid :
            r2.userGroup.GetUser(this._username).GetAnnotStaticInkId();
        this._t_bgn = t_bgn_and_end[0];
        this._t_end = t_bgn_and_end[1];
        this.npage = npage;
    };
    r2.Ink.prototype.erase = function(to_upload){
        var piece = r2App.pieces_cache[this._pid];
        var annot = this._annotid === '' ?
            r2App.annots[r2.userGroup.GetUser(this._username).GetAnnotStaticInkId()] :
            r2App.annots[this._annotid];

        piece.detachInk(this);
        annot.detachInk(this);
        if(to_upload){
            return this.exportToDeleteComment();
        }
        return null;
    };
    r2.Ink.prototype.exportToDeleteComment = function(){
        // time: 2014-12-21T13...
        // user: 'red user'
        // op: 'DeleteComment'
        // type: 'Ink'
        // target: {pid: pid, page: 2, aid: annotid, t_bgn: <time>}
        var cmd = {};
        cmd.time = (new Date()).toISOString();
        cmd.target = {
            pid: this._pid,
            aid: this._annotid,
            t_bgn: this._t_bgn
        };
        return cmd;
    };
    r2.Ink.prototype.GetPage = function(){
        return this.npage;
    };
    r2.Ink.prototype.getTimeBgn = function(){
        return this._t_bgn;
    };
    r2.Ink.prototype.getUsername = function(){
        return this._username;
    };
    r2.Ink.prototype.ExportToCmd = function(){
        //Ink: {_username: ..., _annotid:..., t_bgn:..., t_end:..., npage: 0, segments: [Segment, Segment, ...]}
        var cmd = {};
        cmd.username = this._username;
        cmd.annotid = this._annotid;
        cmd.pid = this._pid;
        cmd.t_bgn = this._t_bgn;
        cmd.t_end = this._t_end;
        cmd.npage = this.npage;
        cmd.segments = [];
        this.segments.forEach(function(sgmnt){
            cmd.segments.push(sgmnt.ExportToCmd());
        });

        return cmd;
    };
    r2.Ink.prototype.Relayout = function(piece_pos){
    };
    r2.Ink.prototype.Draw = function(){
        this.DrawSegments(r2.canv_ctx);
    };

    r2.Ink.prototype.drawReplaying = function(canvas_ctx){
        var numall=0;
        for (i = 0; segment = this.segments[i]; ++i) {
            numall = numall+segment._pts.length;
        }
        if(r2App.cur_annot_id != null && r2App.cur_annot_id === this._annotid) {
            var n = Math.floor(numall * (r2App.cur_audio_time - this._t_bgn) / (this._t_end - this._t_bgn));
            n = Math.min(numall, n);
            var curn=0;
            if (n >= 2) {
                canvas_ctx.beginPath();
                var i, segment;
                var wasbgn = false;
                for (i = 0; segment = this.segments[i]; ++i) {
                    if(n<curn){
                        break;
                    }
                    wasbgn = segment.drawReplaying(canvas_ctx, wasbgn, n-curn);
                    curn=curn+segment._pts.length;

                }
                canvas_ctx.strokeStyle = r2.userGroup.GetUser(this._username).color_stroke_dynamic_past;
                canvas_ctx.lineWidth = r2Const.INK_WIDTH * 3;
                canvas_ctx.lineCap = 'round';
                canvas_ctx.lineJoin = 'round';
                canvas_ctx.stroke();
            }
        }
    };
    r2.Ink.prototype.AddSegment = function(segment){
        this.segments.push(segment);
    };
    r2.Ink.prototype.getValidSegments = function(){
        var rtn = [];
        var i, segment;
        for(i = 0; segment = this.segments[i]; ++i){
            if(r2App.pieces_cache.hasOwnProperty(segment.GetPieceId())){
                rtn.push(segment);
            }
        }
        return rtn;
    };
    r2.Ink.prototype.DrawSegments = function(canvas_ctx){
        canvas_ctx.beginPath();
        var i, segment;
        var wasbgn = false;
        for(i = 0; segment = this.segments[i]; ++i){
            wasbgn = segment.Draw(canvas_ctx, wasbgn);
        }
        if(r2App.cur_annot_id != null && r2App.cur_annot_id == this._annotid) {
            canvas_ctx.strokeStyle = r2.userGroup.GetUser(this._username).color_stroke_dynamic_future;
        }
        else{
            canvas_ctx.strokeStyle = r2.userGroup.GetUser(this._username).color_dark_html;
        }
        canvas_ctx.lineWidth = r2Const.INK_WIDTH;
        canvas_ctx.lineCap = 'round';
        canvas_ctx.lineJoin = 'round';
        canvas_ctx.stroke();
    };
    r2.Ink.prototype.smoothing = function(canvas_ctx){
        var i, segment;
        for(i = 0; segment = this.segments[i]; ++i) {
            segment.smoothing();
        }
    };
    r2.Ink.prototype.dist = function(pt){
        var min_dist = Number.POSITIVE_INFINITY;
        var i, segment;
        for(i = 0; segment = this.segments[i]; ++i) {
            min_dist = Math.min(min_dist, segment.dist(pt));
        }
        return min_dist;
    };

    /*
    ink segment
     */
    r2.Ink.Segment = function(){
        this._pid = null;
        this._pts = [];
    };
    r2.Ink.Segment.prototype.ExportToCmd = function(){
        //Ink.Segment: {pid: ..., pts: [Vec2, Vec2, ...]}
        var cmd = {};
        cmd.pid = this._pid;
        cmd.pts = r2.util.vec2ListToNumList(this._pts);
        return cmd;
    };
    r2.Ink.Segment.prototype.GetPieceId = function(){
        return this._pid;
    };
    r2.Ink.Segment.prototype.GetNumPts = function(){
        return this._pts.length;
    };
    r2.Ink.Segment.prototype.SetSegment = function(pid, pts){
        this._pid = pid;
        this._pts = pts;
    };
    r2.Ink.Segment.prototype.CopyPtsWithOffset = function(offset){
        var rtn = new Array(this._pts.length);
        for(var i = 0; i < this._pts.length; ++i){
            rtn[i] = new Vec2(this._pts[i].x+offset.x, this._pts[i].y + offset.y);
        }
        return rtn;
    };
    r2.Ink.Segment.prototype.AddPt = function(pt){
        this._pts.push(pt);
    };
    r2.Ink.Segment.prototype.Draw = function(canvas_ctx, wasbgn){
        //
        var piece = r2App.pieces_cache[this._pid];
        if(piece){
            var offset = piece.pos;
            for(var i = 0; i < this._pts.length; ++i) {
                if(wasbgn){
                    canvas_ctx.lineTo(offset.x+this._pts[i].x, offset.y+this._pts[i].y);
                }
                else{
                    canvas_ctx.moveTo(offset.x+this._pts[i].x, offset.y+this._pts[i].y);
                    wasbgn = true;
                }
            }
        }
        return wasbgn;
    };
    r2.Ink.Segment.prototype.smoothing = function(){
        this._pts = r2.util.SimplifyStrokeDouglasPuecker(this._pts,0,this._pts.length, 0.001);
    };
    r2.Ink.Segment.prototype.drawReplaying = function(canvas_ctx,wasbgn,cnt){

        var piece = r2App.pieces_cache[this._pid];
        cnt=Math.min(cnt,this._pts.length);
        if(piece){
            var offset = piece.pos;
            for(var i = 0; i < cnt; ++i) {
                if(wasbgn){
                    canvas_ctx.lineTo(offset.x+this._pts[i].x, offset.y+this._pts[i].y);
                }
                else{
                    canvas_ctx.moveTo(offset.x+this._pts[i].x, offset.y+this._pts[i].y);
                    wasbgn = true;
                }
            }
        }
        return wasbgn;
    };
    r2.Ink.Segment.prototype.dist = function(pt){
        var min_dist = Number.POSITIVE_INFINITY;
        var i, l;
        for(i = 0, l = this._pts.length; i < l; ++i) {
            min_dist = Math.min(min_dist, pt.distance(this._pts[i]));
        }
        return min_dist;
    };
    /*
      ink cache
     */
    r2.Ink.Cache = function(){
        this._annot = null;
        this._t_bgn = 0;
        this._t_end = 0;
        this._pts = [];
    };
    r2.Ink.Cache.prototype.setCache = function(annot, t_bgn, t_end, pts){
        this._annot = annot;
        this._t_bgn = t_bgn;
        this._t_end = t_end;
        this._pts = pts;

        this._user = this._annot.GetUser();
    };
    r2.Ink.Cache.prototype.preRender = function(ctx){
        if(this._pts.length == 0){return;}

        ctx.beginPath();
        ctx.moveTo(this._pts[0].x, this._pts[0].y);
        for(var i = 0; i < this._pts.length; ++i) {
            ctx.lineTo(this._pts[i].x, this._pts[i].y);
        }
        ctx.strokeStyle = this._user.color_stroke_dynamic_past;
        ctx.lineWidth = r2Const.INK_WIDTH;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    };


    r2.Ink.Cache.prototype.GetPlayback = function(pt) {
        if(this._pts.length>1 && this._annot != null && this._t_end > this._t_bgn){
            for(var i = 0; i < this._pts.length-1; ++i){
                if(r2.util.linePointDistance(this._pts[i], this._pts[i+1], pt) < r2Const.SPLGHT_WIDTH/2){
                    var rtn = {};
                    rtn.annot = this._annot.GetId();
                    rtn.t = this._t_bgn + (i/this._pts.length)*(this._t_end-this._t_bgn);
                    return rtn;
                }
            }
        }
        return null;
    };

    /*
     * Spotlight
     */
    // Spotlight: {t_bgn:..., t_end:..., npage: 0, segments: [Segment, Segment, ...]}
    // Spotlight.Segment: {pid: ..., pts: [Vec2, Vec2, ...]}

    r2.Spotlight = function(){
        this.username = null;
        this.annotid = null;
        this.npage = 0;
        this.time = 0;
        this.t_bgn = 0;
        this.t_end = 0;

        this.segments = [];
    };
    r2.Spotlight.prototype.ExportToCmd = function(){
        //Spotlight: {t_bgn:..., t_end:..., npage: 0, segments: [Segment, Segment, ...]}
        var cmd = {};
        cmd.time = this.time;
        cmd.t_bgn = this.t_bgn;
        cmd.t_end = this.t_end;
        cmd.npage = this.npage;
        cmd.segments = [];
        this.segments.forEach(function(sgmnt){
            cmd.segments.push(sgmnt.ExportToCmd());
        });
        return cmd;
    };
    r2.Spotlight.prototype.GetPage = function(){
        return this.npage;
    };
    r2.Spotlight.prototype.SetSpotlight = function(username, annotid, npage, time, t_bgn, t_end){
        this.username = username;
        this.annotid = annotid;
        this.npage = npage;
        this.time = time;
        this.t_bgn = t_bgn;
        this.t_end = t_end;
    };
    r2.Spotlight.prototype.AddSegment = function(segment){
        this.segments.push(segment);
    };
    r2.Spotlight.prototype.getValidSegments = function(){
        var rtn = [];
        var i, segment;
        for(i = 0; segment = this.segments[i]; ++i){
            if(r2App.pieces_cache.hasOwnProperty(segment.GetPieceId())){
                rtn.push(segment);
            }
        }
        return rtn;
    };
    r2.Spotlight.prototype.Draw = function(canvas_ctx){
        canvas_ctx.beginPath();
        var i, segment;
        var wasbgn = false;
        for(i = 0; segment = this.segments[i]; ++i){
            wasbgn = segment.Draw(canvas_ctx, wasbgn);
        }

        var color;
        var width;
        color = r2.userGroup.GetUser(this.username).color_splight_static;
        width = r2Const.SPLGHT_WIDTH;
        canvas_ctx.strokeStyle = color;
        canvas_ctx.lineWidth = width;
        canvas_ctx.lineCap = 'round';
        canvas_ctx.lineJoin = 'round';
        canvas_ctx.stroke();
    };
    r2.Spotlight.prototype.Retarget = function(annotid, t_bgn, t_end){
        var rtn = jQuery.extend({}, this);
        rtn.annotid = annotid;
        rtn.t_bgn = t_bgn;
        rtn.t_end = t_end;
        return rtn;
    };

    /*
     * Spotlight.Segment
     */
    r2.Spotlight.Segment = function(){
        this._pid = null;
        this._pts = [];
    };
    r2.Spotlight.Segment.prototype.ExportToCmd = function(){
        //Spotlight.Segment: {pid: ..., pts: [Vec2, Vec2, ...]}
        var cmd = {};
        cmd.pid = this._pid;
        cmd.pts = r2.util.vec2ListToNumList(this._pts);
        return cmd;
    };
    r2.Spotlight.Segment.prototype.GetPieceId = function(){
        return this._pid;
    };
    r2.Spotlight.Segment.prototype.GetNumPts = function(){
        return this._pts.length;
    };
    r2.Spotlight.Segment.prototype.SetSegment = function(pid, pts){
        this._pid = pid;
        this._pts = pts;
    };
    r2.Spotlight.Segment.prototype.CopyPtsWithOffset = function(offset){
        var rtn = new Array(this._pts.length);
        for(var i = 0; i < this._pts.length; ++i){
            rtn[i] = new Vec2(this._pts[i].x+offset.x, this._pts[i].y + offset.y);
        }
        return rtn;
    };
    r2.Spotlight.Segment.prototype.AddPt = function(pt){
        this._pts.push(pt);
    };
    r2.Spotlight.Segment.prototype.Draw = function(canvas_ctx, wasbgn){
        var piece = r2App.pieces_cache[this._pid];
        if(piece){
            var offset = piece.pos;
            for(var i = 0; i < this._pts.length; ++i) {
                if(wasbgn){
                    canvas_ctx.lineTo(offset.x+this._pts[i].x, offset.y+this._pts[i].y);
                }
                else{
                    canvas_ctx.moveTo(offset.x+this._pts[i].x, offset.y+this._pts[i].y);
                    wasbgn = true;
                }

            }
        }
        return wasbgn;
    };


    /*
     * Spotlight.Cache
     */
    r2.Spotlight.Cache = function(){
        this._annot = null;
        this._t_bgn = 0;
        this._t_end = 0;
        this._pts = [];
        this._bb = [];
    };
    r2.Spotlight.Cache.prototype.setCache = function(annot, t_bgn, t_end, pts){
        this._annot = annot;
        this._t_bgn = t_bgn;
        this._t_end = t_end;
        this._pts = pts;

        this._user = this._annot.GetUser();
        var max = new Vec2(Number.MIN_VALUE, Number.MIN_VALUE);
        var min = new Vec2(Number.MAX_VALUE, Number.MAX_VALUE);
        for(var i = 0; i < this._pts.length; ++i){
            var v = this._pts[i];
            max.x = Math.max(max.x, v.x);
            max.y = Math.max(max.y, v.y);
            min.x = Math.min(min.x, v.x);
            min.y = Math.min(min.y, v.y);
        }
        max.x+=r2Const.SPLGHT_WIDTH/2;max.y+=r2Const.SPLGHT_WIDTH/2;
        min.x-=r2Const.SPLGHT_WIDTH/2;min.y-=r2Const.SPLGHT_WIDTH/2;
        this._bb = [min, max];
    };
    r2.Spotlight.Cache.prototype.preRender = function(ctx, ratio){
        if(this._pts.length == 0){return;}

        ctx.beginPath();
        ctx.moveTo(this._pts[0].x*ratio, this._pts[0].y*ratio);
        for(var i = 0; i < this._pts.length; ++i) {
            ctx.lineTo(this._pts[i].x*ratio, this._pts[i].y*ratio);
        }

        var color;
        var width;
        color = this._user.color_splight_static;
        width = Math.floor(r2Const.SPLGHT_WIDTH*ratio);

        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    };
    r2.Spotlight.Cache.prototype.drawReplayBlob = function(canvas_ctx){
        if(this._annot.GetId() === r2App.cur_annot_id){
            if(this._pts.length &&
                r2App.cur_audio_time > this._t_bgn &&
                r2App.cur_audio_time < this._t_end){

                var idx = (this._pts.length-2)*(r2App.cur_audio_time-this._t_bgn)/(this._t_end-this._t_bgn)+0.25;
                idx = Math.max(0, Math.min(this._pts.length-2, Math.floor(idx)));

                var p0 = this._pts[idx];
                var p1;
                if(this._pts.length-1 == idx){
                    p1 = p0;
                }
                else{
                    p1 = this._pts[idx+1];
                }
                this.drawMovingBlob(
                    p0,
                    p1,
                    false,  // forprivate
                    this._user.color_splight_dynamic,  // color,
                    canvas_ctx
                );
            }
        }
    };
    r2.Spotlight.Cache.prototype.drawReplayNewSpeak = function(ctx){
        if(this._pts.length == 0){return;}

        ctx.beginPath();
        ctx.moveTo(this._pts[0].x, this._pts[0].y);
        for(var i = 0; i < this._pts.length; ++i) {
            ctx.lineTo(this._pts[i].x, this._pts[i].y);
        }

        var color;
        var width;
        color = this._user.color_splight_dynamic_newspeak;
        width = r2Const.SPLGHT_WIDTH;

        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    };
    r2.Spotlight.Cache.prototype.drawMovingBlob = function(p0, p1, forprivate, color, canvas_ctx){
        var line_width = 0;
        if(forprivate){
            line_width = r2Const.SPLGHT_PRIVATE_WIDTH;
        }
        else{
            line_width = r2Const.SPLGHT_WIDTH;
        }
        if(p0.distance(p1) < 0.02){
            canvas_ctx.beginPath();
            canvas_ctx.arc(p0.x, p0.y, line_width*0.5, 0, 2 * Math.PI, false);
            canvas_ctx.fillStyle = color;
            canvas_ctx.fill();
        }
        else{
            canvas_ctx.beginPath();
            canvas_ctx.moveTo(p0.x, p0.y);
            canvas_ctx.lineTo(p1.x, p1.y);

            canvas_ctx.lineWidth = line_width;
            canvas_ctx.strokeStyle = color;
            canvas_ctx.lineCap = 'round';
            canvas_ctx.lineJoin = 'round';
            canvas_ctx.stroke();
        }
    };
    r2.Spotlight.Cache.prototype.HitTest = function(pt){
        if( pt.x > this._bb[0].x && pt.y > this._bb[0].y &&
            pt.x < this._bb[1].x && pt.y < this._bb[1].y){
            return this;
        }
        else{
            return null;
        }
    };
    r2.Spotlight.Cache.prototype.GetPlayback = function(pt) {
        if(this._pts.length>1 && this._annot != null && this._t_end > this._t_bgn){
            for(var i = 0; i < this._pts.length-1; ++i){
                if(r2.util.linePointDistance(this._pts[i], this._pts[i+1], pt) < r2Const.SPLGHT_WIDTH/2){
                    var rtn = {};
                    rtn.annot = this._annot.GetId();
                    rtn.t = this._t_bgn + (i/this._pts.length)*(this._t_end-this._t_bgn);
                    return rtn;
                }
            }
        }
        return null;
    };

}(window.r2 = window.r2 || {}));
