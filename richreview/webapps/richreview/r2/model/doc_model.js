/**
 * Created by yoon on 12/27/14.
 */


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
    r2.Obj.prototype.Relayout = function(origin){
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
        var dy = Math.abs(this.pos.y + this.size.y - pt.y);
        if( (dy <= dy_obj[0]) &&
            ( this.pos.x < pt.x && pt.x < this.pos.x + this.size.x )){
            dy_obj[0] = dy;
            dy_obj[1] = this;
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
    };
    r2.Page.prototype.GetNumPage = function(){
        return this._num;
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

        r2App.invalidate_static_scene = true;
        r2App.invalidate_dynamic_scene = true;
        r2App.invalidate_size = true;
        r2App.invalidate_dom = true;

        return this.size;
    };
    r2.Page.prototype.refreshSpotlightPrerender = function(){
        this._spotlight_cache = [];
        var i, spotlight, cache;
        for (var annotid in r2App.annots) {
            if (r2App.annots.hasOwnProperty(annotid)){
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
    r2.Page.prototype.drawReplayBlob = function(canvas_ctx){
        var i, spotlight;
        for(i = 0; spotlight = this._spotlight_cache[i]; ++i){
            spotlight.drawReplayBlob(canvas_ctx);
        }
    };
    r2.Page.prototype.HitTest = function(pt){
        var rtn = r2.Obj.prototype.HitTest.apply(this, [pt]);
        var i, spotlight;
        for(i = 0; spotlight = this._spotlight_cache[i]; ++i){
            var v = spotlight.HitTest(pt);
            if(v){
                rtn.push(v);
            }
        }
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
            var s = piece.Relayout(new Vec2(origin.x, origin.y + my));
            mx = Math.max(mx, s.x);
            my += s.y;
        }

        this.size = new Vec2(mx, my);
        return this.size;
    };
    r2.Region.prototype.DrawRect = function(){
        r2.Obj.prototype.DrawRect.apply(this, ['rgba(255,50,50,0.3)']);
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
    r2.Piece.prototype.GetNewPieceSize = function(){
        return new Vec2(this._cnt_size.x, r2Const.PIECEAUDIO_HEIGHT);
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
    r2.Piece.prototype.Relayout = function(origin){
        origin = typeof origin !== 'undefined' ? origin : new Vec2(0, 0);
        this.pos = origin.clone();

        var mx = this._cnt_size.x;
        var my = this._cnt_size.y;
        if(!this._isvisible){
            my = 0;
        }
        var piece;
        for(var i = 0; piece = this.child[i]; ++i){
            var s = piece.Relayout(new Vec2(origin.x, origin.y + my));
            mx = Math.max(mx, s.x);
            my += s.y;
        }
        this.size = new Vec2(mx, my); // done for the piece background

        // this is for inks
        var ink;
        for (var key in this._inks) {
            if (this._inks.hasOwnProperty(key)) {
                for (var i = 0; ink = this._inks[key][i]; ++i) {
                    ink.Relayout(this.pos);
                }
            }
        }

        return this.size;
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
        return this._ttX + d*r2Const.PIECE_TEXTTEARING_INDENT;
    };
    r2.Piece.prototype.GetTtIndentedWidth = function(){
        return this._ttX+this._ttW-this.GetTtIndent();
    };
    r2.Piece.prototype.AddInk = function(annotid, stroke){
        if(!this._inks.hasOwnProperty(annotid)){
            this._inks[annotid] = [];
        }
        this._inks[annotid].push(stroke);
    };
    r2.Piece.prototype.DrawInk = function(){
        var ink;
        for (var key in this._inks) {
            if (this._inks.hasOwnProperty(key)) {
                for (var i = 0; ink = this._inks[key][i]; ++i) {
                    ink.Draw();
                }
            }
        }
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
            line_color = user.color_dark_html;
            glow_color = user.color_normal_html;
        }
        else{
            line_color = 'black';
            glow_color = 'gray';
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

            var tri_w = 0.01;
            var tri_h_half = 0.005;

            var path=new Path2D();
            path.moveTo(x0, y);
            path.lineTo(x0-tri_w, y-tri_h_half);
            path.lineTo(x0-tri_w, y+tri_h_half);

            path.moveTo(x1, y);
            path.lineTo(x1+tri_w, y+tri_h_half);
            path.lineTo(x1+tri_w, y-tri_h_half);

            canvas_ctx.fillStyle = colors[1];
            canvas_ctx.fill(path);
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
    r2.PieceText.prototype.SetPieceText = function(texCoordLT, texCoordRB){
        this._texCoordLT = texCoordLT;
        this._texCoordRB = texCoordRB;
    };
    r2.PieceText.prototype.SetVisibility = function(visible){
        r2.Obj.prototype.SetVisibility.apply(this, [visible]);
        this._isvisible = true;
    };
    r2.PieceText.prototype.Relayout = function(origin){
        var rtn = r2.Piece.prototype.Relayout.apply(this, [origin]);
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
        var canv = r2.pdfRenderer.GetCanvas(this.GetNumPage());
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

    r2.PieceTeared.prototype.GetAnchorTo = function(){
        //           {type: 'PieceTeared', id: pid, page: 2}
        var anchorCmd = {};
        anchorCmd.type = 'PieceTeared';
        anchorCmd.id = this.GetId();
        anchorCmd.page = this.GetNumPage();
        return anchorCmd;
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
        this._radialmenu = null;

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
        if(this._radialmenu)
            this._radialmenu.Destructor();
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
            if(this._radialmenu != null && this._annotid == annotid){
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
    r2.PieceAudio.prototype.HideDoms = function(){
        if(this._radialmenu){
            this._radialmenu.HideDoms();
        }
    };
    r2.PieceAudio.prototype.updateDom = function(){
        if(this._radialmenu){
            this._radialmenu.updateDom();
        }
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
                this._audio_dbs.push(v);
            }
            else{
                this._audio_dbs.push(0);
            }
        }

        if(this._t_bgn==0 && this._radialmenu == null){
            this._radialmenu = new r2.AnnotRadialMenu(this._annotid);
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
    r2.PieceAudio.prototype.Relayout = function(origin){
        var rtn = r2.Piece.prototype.Relayout.apply(this, [origin]);
        if(this._radialmenu){
            this._radialmenu.Relayout();
        }
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

        if(this._radialmenu) {
            var pieceaudios = this.GetParent().GatherPieceAudioByAnnotId(this._annotid);
            var lastpiece = pieceaudios[pieceaudios.length-1];
            var last_y = lastpiece.pos.y+lastpiece.GetContentSize().y-r2Const.PIECEAUDIO_LINE_WIDTH;
            var ratio = Math.pow(0.8, this.GetTtDepth() - 1);
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

        if(this._radialmenu){
            this._radialmenu.Draw();
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
            this._audio_dbs.push(v);
        }
    };
    r2.PieceAudio.prototype.RefreshAudioDbs = function(){
        this._audio_dbs = [];
        for(var i = 0; i < this._audio_dbs_recording.length; ++i) {
            r2App.cur_recording_minmax[0] = Math.min(this._audio_dbs_recording[i], r2App.cur_recording_minmax[0]);
            r2App.cur_recording_minmax[1] = Math.max(this._audio_dbs_recording[i], r2App.cur_recording_minmax[1]);
            var v = 0.9*(this._audio_dbs_recording[i]-r2App.cur_recording_minmax[0])/(r2App.cur_recording_minmax[1]-r2App.cur_recording_minmax[0]);
            this._audio_dbs.push(v);
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
     * PieceKeyboard
     */
    r2.PieceKeyboard = function() {
        r2.Piece.call(this);
        this._annotid = null;
        this._username = null;

        this.dom = null;
        this.dom_span = null;
        this.dom_pre = null;
        this.dom_textarea = null;
        this.dom_btn_rmv = null;
        this.dom_btn_pub = null;

        this.__private_shift_x = null;
        this._isprivate = false;

        this.__contentschanged = false;
        this.__dom_size = new Vec2(0,0);
    };
    r2.PieceKeyboard.prototype = Object.create(r2.Piece.prototype);

    r2.PieceKeyboard.prototype.Destructor = function(){
        if(this.dom){
            r2.dom.removeFromPageDom(this.dom);
        }
        r2.Piece.prototype.Destructor.apply(this);
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
        this.dom_span.textContent = text;
        this.dom_textarea.value = this.dom_textarea.textContent = text;
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
        cmd.data.text = this.dom_textarea.value;
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
        cmd.data = this.dom_textarea.value;

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
    r2.PieceKeyboard.prototype.SetPieceKeyboard = function(annotid, username, text, isprivate, isOnLeftColumn){
        this._annotid = annotid;
        this._username = username;

        this.CreateDom();
        this.SetText(text);
        this._isprivate = isprivate;
        if(this._isprivate){
            $(this.dom_btn_pub).toggleClass("fa-flip-horizontal", r2.util.myXOR(true, isOnLeftColumn));
        }
        else{
            $(this.dom_btn_pub).toggleClass("fa-flip-horizontal", r2.util.myXOR(false, isOnLeftColumn));
        }
        if(this._username != r2.userGroup.cur_user.name){
            $(this.dom_textarea).prop('readonly', true);
        }
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

        this.dom_pre = document.createElement('pre');
        this.dom_pre.classList.toggle('r2_piecekeyboard_pre', true);
        this.dom_pre.classList.toggle('unselectable', true);

        this.dom_span = document.createElement('span');
        this.dom_span.classList.toggle('unselectable', true);
        this.dom_pre.appendChild(this.dom_span);
        this.dom_pre.appendChild(document.createElement('br'));
        this.dom.appendChild(this.dom_pre);

        this.dom_textarea = document.createElement('textarea');
        this.dom_textarea.classList.toggle('r2_piecekeyboard_textarea', true);
        this.dom_textarea.classList.toggle('unselectable', true);
        this.dom_textarea.style.color = r2.userGroup.GetUser(this._username).color_piecekeyboard_text;
        this.dom.appendChild(this.dom_textarea);

        this.dom_btn_rmv = document.createElement('a');
        this.dom_btn_rmv.className += 'r2_piecekeyboard_btn_rmv fa fa-times-circle';
        this.dom_btn_rmv.style.color = r2.userGroup.GetUser(this._username).color_piecekeyboard_text;
        this.dom_btn_rmv.onmousedown = this.OnBtnRmv.bind(this);
        this.dom.appendChild(this.dom_btn_rmv);

        this.dom_btn_pub = document.createElement('a');
        this.dom_btn_pub.className += 'r2_piecekeyboard_btn_rmv fa fa-share-square';
        this.dom_btn_pub.style.color = r2.userGroup.GetUser(this._username).color_piecekeyboard_text;
        this.dom_btn_pub.onmousedown = this.OnBtnPub.bind(this);
        this.dom.appendChild(this.dom_btn_pub);

        ///////////////
        this.AddEventHandle = function () {
            //var TextAreaCommit = this.CommitTextAreaContent.bind(this);
            var func_UpdateSizeWithTextInput = this.UpdateSizeWithTextInput.bind(this);
            if (this.dom_textarea.addEventListener) {
                this.dom_textarea.addEventListener('input', function() {
                    this.__contentschanged = true;
                    this.dom_span.textContent = this.dom_textarea.value;
                    if(func_UpdateSizeWithTextInput()){
                        r2App.invalidate_page_layout = true
                    }
                }.bind(this), false);
                this.dom_textarea.addEventListener('focusout', function() {
                    r2.keyboard.mode = r2.KeyboardModeEnum.NORMAL;
                    r2App.cur_focused_piece_keyboard = null;
                    this.dom_textarea.style.boxShadow = "none";
                    this.dom_btn_rmv.style.display = "none";
                    this.dom_btn_pub.style.display = "none";
                    $(this.dom).css("pointer-events", 'none');
                    if(this.__contentschanged){
                        r2Sync.PushToUploadCmd(this.ExportToTextChange());
                        this.__contentschanged = false;
                    }
                }.bind(this), false);
                this.dom_textarea.addEventListener('focus', function() {
                    if(this._username != r2.userGroup.cur_user.name){
                        $(this.dom_textarea).blur();
                        return;
                    }
                    r2.keyboard.mode = r2.KeyboardModeEnum.FOCUSED;
                    r2App.cur_focused_piece_keyboard = this;
                    var color;
                    if(this._isprivate){
                        color = r2.userGroup.GetUser(this._username).color_piecekeyboard_private_box_shadow;
                    }
                    else{
                        color = r2.userGroup.GetUser(this._username).color_piecekeyboard_box_shadow;
                    }
                    this.dom_textarea.style.boxShadow = "0 0 0.2em "+color+" inset, 0 0 0.2em "+color;
                    if(this._username == r2.userGroup.cur_user.name) {
                        this.dom_btn_rmv.style.display = "block";
                        this.dom_btn_pub.style.display = "block";
                    }
                    $(this.dom).css("pointer-events", 'auto');
                }.bind(this), false);
            }
        }.bind(this);

        this.AddEventHandle();

        r2.dom.appendToPageDom(this.dom);
        this.ResizeDom();
    };

    r2.PieceKeyboard.prototype.OnBtnRmv = function(){
        r2.keyboard.mode = r2.KeyboardModeEnum.NORMAL;

        if(r2.userGroup.cur_user.name === this._username){
            if(r2.removeAnnot(this._annotid, true, false)){ // askuser, mute
                r2Sync.PushToUploadCmd(this.ExportToCmdDeleteComment());
                r2.log.Log_Simple("RemoveAnnot_Text_OnScrBtn");
            }
        }
        else{
            alert("You can only delete your own comments.")
        }
    };
    r2.PieceKeyboard.prototype.OnBtnPub = function(){
        r2.keyboard.mode = r2.KeyboardModeEnum.NORMAL;
        this._isprivate = !this._isprivate;
        this.UpdateForPubPrivate();
        r2Sync.PushToUploadCmd(this.ExportToCmdPubPrivate());
    };
    r2.PieceKeyboard.prototype.SetPubPrivate = function(isprivate){
        this._isprivate = isprivate;
    };
    r2.PieceKeyboard.prototype.UpdateForPubPrivate = function(){
        if(this._isprivate){
            $(this.dom_btn_pub).toggleClass("fa-flip-horizontal", r2.util.myXOR(true, this.IsOnLeftColumn()));
        }
        else{
            $(this.dom_btn_pub).toggleClass("fa-flip-horizontal", r2.util.myXOR(false, this.IsOnLeftColumn()));
        }
        this.dom_textarea.style.color = r2.userGroup.GetUser(this._username).color_piecekeyboard_text;
    };
    r2.PieceKeyboard.prototype.Relayout = function(origin){
        this._isvisible = (!this._isprivate || r2.userGroup.cur_user.name == this._username);
        return r2.Piece.prototype.Relayout.apply(this, [origin]);
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
    r2.PieceKeyboard.prototype.HideDoms = function(){
        this.dom.style.left = -10.0 * r2.viewCtrl.page_width_noscale + 'px';
        this.dom.style.top = -10.0 * r2.viewCtrl.page_width_noscale  + 'px';
    };

    r2.PieceKeyboard.prototype.UpdateSizeWithTextInput = function(){
        var new_height = r2.viewCtrl.mapDomToDocScale(this.dom.clientHeight);
        if(this._cnt_size.y != new_height){
            this._cnt_size.y = new_height;
            return true;
        }
        return false;
    };
    r2.PieceKeyboard.prototype.ResizeDom = function(){
        var fontsize = r2.viewCtrl.mapDocToDomScale(r2Const.PIECEKEYBOARD_FONTSIZE) + 'px';
        this.dom_textarea.style.fontSize = fontsize;
        this.dom_pre.style.fontSize = fontsize;
        this.dom_btn_rmv.style.fontSize = fontsize;
        this.dom_btn_pub.style.fontSize = fontsize;

        var w = r2.viewCtrl.mapDocToDomScale(this.GetTtIndentedWidth());
        this.dom.style.width = w + 'px';
        this.__dom_size = new Vec2(w, this.dom.clientHeight);
        this.UpdateSizeWithTextInput();
    };
    r2.PieceKeyboard.prototype.Focus = function(){
        this.dom_textarea.focus();
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
    r2.PieceKeyboard.prototype.updateDom = function(){
        var scale = r2.viewCtrl.scale;
        var x_shift = this._isprivate ? this.GetPrivateShiftX() : 0;
        if(!this._isvisible){
            x_shift = -100;
        }

        var p = r2.viewCtrl.mapDocToDom(Vec2(this.pos.x+this.GetTtIndent() + x_shift, this.pos.y));
        this.dom.style.left = p.x + 'px';
        this.dom.style.top = p.y  + 'px';

        this.dom_btn_rmv.style.left = this.__dom_size.x + scale*x_shift + 'px';
        this.dom_btn_rmv.style.top = 0;
        this.dom_btn_pub.style.left = this.__dom_size.x + scale*x_shift + 'px';
        this.dom_btn_pub.style.top = this.__dom_size.y - scale*13 + 'px';
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
        this._audiofileurl = "";
        this.__radialmenu = null;
    };

    r2.Annot.prototype.GetRadialMenu = function(){
        return this.__radialmenu;
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
        cmd.data.waveform_sample = this._audio_dbs;
        cmd.data.Spotlights = [];
        this._spotlights.forEach(function(splght){
            cmd.data.Spotlights.push(splght.ExportToCmd());
        });
        cmd.data.audiofileurl = this._audiofileurl;
        return cmd;
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
    r2.Annot.prototype.GetUser = function(){
        return r2.userGroup.GetUser(this._username);
    };
    r2.Annot.prototype.GetUsername = function(){
        return this._username;
    };
    r2.Annot.prototype.SetAnnot = function(id, anchorpid, t_bgn, duration, audio_dbs, username, audiofileurl){
        this._id = id;
        this._anchorpid = anchorpid;
        this._bgn_time = t_bgn;
        this._duration = duration;
        this._audio_dbs = audio_dbs;
        this._username = username;

        this._audiofileurl = audiofileurl;
        this._reacordingaudioblob = null;
    };
    r2.Annot.prototype.AddSpotlight = function(spotlight, toupload){
        this._spotlights.push(spotlight);
    };
    r2.Annot.prototype.GetAudioFileUrl = function(){
        return r2.util.normalizeUrl(this._audiofileurl);
    };
    r2.Annot.prototype.SetRecordingAudioFileUrl = function(url, blob){
        this._audiofileurl = url;
        this._reacordingaudioblob = blob;
    };
    r2.Annot.prototype.SetAnnotRadialMenu = function(annotradialmenu){
        this.__radialmenu = annotradialmenu;
    };

    r2.Annot.prototype.SampleAudioDbs = function(msec) {
        var x = this._audio_dbs.length*(msec/this._duration);
        var p = x-Math.floor(x);
        var v0 = (1.0-p)*this._audio_dbs[Math.max(0, Math.min(this._audio_dbs.length-1, Math.floor(x)))];
        var v1 = p*this._audio_dbs[Math.max(0, Math.min(this._audio_dbs.length-1, Math.floor(x)+1))];
        return v0+v1;
    };
    r2.Annot.prototype.UpdateDbs = function(buf){
        var dbsPerSec = r2.audioRecorder.RECORDER_SOURCE_SAMPLE_RATE/r2.audioRecorder.RECORDER_BUFFER_LEN/1000;
        var nDbs = Math.floor((r2App.cur_time-this._bgn_time) * dbsPerSec);

        this._duration = nDbs/dbsPerSec;

        if(buf.length != 0){
            var dbs = r2.util.rootMeanSquare(buf, buf.length-r2.audioRecorder.RECORDER_BUFFER_LEN, buf.length);
            for(var i = this._audio_dbs.length; i < nDbs; ++i) {
                this._audio_dbs.push((r2.audioRecorder.RECORDER_SAMPLE_SCALE*dbs).toFixed(3));
            }
        }
    };


    /*
     * AnnotRadialMenu
     */
    r2.AnnotPrivateSpotlight = function() {
        r2.Annot.call(this);
        this.isPrivateSpotlight = true;

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
    r2.AnnotPrivateSpotlight.prototype.GetCmdsToUpload = function(){
        if( this.changed &&
            r2App.cur_time-this.timeLastChanged > r2Const.TIMEOUT_PRIVATE_HIGHLIGHT_UPDATE){

            this.changed = false;
            return this.ExportToCmd();
        }
        else{
            return null;
        }
    };


    /*
     * AnnotRadialMenu
     */
    r2.AnnotRadialMenu = function(annotid){
        this._annotid = annotid;
        this._user = r2App.annots[this._annotid].GetUser();
        r2App.annots[this._annotid].SetAnnotRadialMenu(this);
        this._pos = new Vec2(0,0);

        var doms = this.CreateDom();
        this._nav = doms[0];
        this._menu_btn = doms[1];
        this._circle = doms[2];
        this._selecteditem = -2; // -2 for nothing, -1 for the center button, radial menu starts from 0

        this._radius = r2Const.RADIALMENU_RADIUS;

        this.__pieceaudio = null; // use GetPiece();
        this.__lastcenterbtnclass = 'fa-play';

        this._menu_btn.onmousedown = this.OnMouseDown.bind(this);
        this._menu_btn.onmouseup = this.OnMouseUp_CenterBtn.bind(this);
    };

    r2.AnnotRadialMenu.prototype.Destructor = function(){
        r2.dom.removeFromPageDom(this._nav);
    };
    r2.AnnotRadialMenu.prototype.GetPiece = function(){
        if(this.__pieceaudio == null){
            this.__pieceaudio = r2App.cur_page.SearchPieceAudioByAnnotId(this._annotid, -1);
        }
        return this.__pieceaudio;
    };
    r2.AnnotRadialMenu.prototype.CreateDom = function(){
        var nav = document.createElement('nav');
        nav.className += 'nav-circular-menu';

        var circle = document.createElement('div');
        circle.className += 'circle';
        nav.appendChild(circle);

        var menu_button = document.createElement('a');
        menu_button.className += 'menu-button menu-button-play fa fa-play';
        menu_button.style.background = this._user.color_radial_menu_unselected;
        nav.appendChild(menu_button);

        var items = [];
        var i, l;
        for(i = 0, l = r2Const.RADIAL_MENU_ITEM_N; i < l; ++i){
            items.push(document.createElement('a'));
            circle.appendChild(items[i]);
            items[i].style.left = (50 - 35*Math.cos(-0.5 * Math.PI - 2*(1/l)*i*Math.PI)).toFixed(4) + "%";
            items[i].style.top = (50 + 35*Math.sin(-0.5 * Math.PI - 2*(1/l)*i*Math.PI)).toFixed(4) + "%";
        }
        items[0].className += 'menu-button fa fa-chevron-up';
        items[1].className += 'menu-button fa fa-link';
        items[2].className += 'menu-button fa fa-chevron-down';
        items[3].className += 'menu-button fa fa-trash';

        r2.dom.appendToPageDom(nav);
        return [nav, menu_button, circle];
    };

    r2.AnnotRadialMenu.prototype.LoadingAudioBgn = function(){
        $(this._menu_btn).toggleClass("loading", true);
    };

    r2.AnnotRadialMenu.prototype.LoadingAudioEnd = function(){
        $(this._menu_btn).toggleClass("loading", false);
    };

    r2.AnnotRadialMenu.prototype.selectItem = function(n){
      if(this._selecteditem != n){
          this._selecteditem = n;
          this.setHighlight(this._menu_btn, -1 === n);
          for(var i = 0; i < r2Const.RADIAL_MENU_ITEM_N; ++i){
              this.setHighlight(this._circle.childNodes[i], i === n);
          }
      }
    };
    r2.AnnotRadialMenu.prototype.getSelectedItem = function(){
        return this._selecteditem;
    };
    r2.AnnotRadialMenu.prototype.setHighlight = function(item, flag){
        item.classList.toggle('highlight', flag);
        item.style.background = flag ? this._user.color_radial_menu_selected : this._user.color_radial_menu_unselected;
    };

    r2.AnnotRadialMenu.prototype.Draw = function(){

    };
    r2.AnnotRadialMenu.prototype.updateDom = function(){
        if(this.__pieceaudio){
            var ratio = Math.pow(0.8, this.__pieceaudio.GetTtDepth() - 1);
            this._radius = r2.viewCtrl.scale * r2Const.RADIALMENU_RADIUS * ratio;
            var dom_pos = r2.viewCtrl.mapDocToDom(this._pos);
            this._nav.style.left = dom_pos.x + 'px';
            this._nav.style.top = dom_pos.y  + 'px';
            this._nav.style.fontSize = r2.viewCtrl.mapDocToDomScale(r2Const.RADIALMENU_SIZE * ratio) + 'px';

            if(r2App.mode == r2App.AppModeEnum.REPLAYING && this._annotid == r2App.cur_annot_id){
                this.SetIconByType('fa-pause');
            }
            else if(r2App.mode == r2App.AppModeEnum.RECORDING && this._annotid == r2App.cur_recording_annot.GetId()){
                this.SetIconByType('fa-stop');
            }
            else{
                this.SetIconByType('fa-play');
            }
        }
    };
    r2.AnnotRadialMenu.prototype.HideDoms = function(){
        this._nav.style.left = -10.0 * r2.viewCtrl.page_width_noscale + 'px';
        this._nav.style.top = -10.0 * r2.viewCtrl.page_width_noscale  + 'px';
    };
    r2.AnnotRadialMenu.prototype.SetIconByType = function(type){
        if(this.__lastcenterbtnclass != type){
            this._menu_btn.classList.toggle(this.__lastcenterbtnclass, false);
            this._menu_btn.classList.toggle(type, true);
            this.__lastcenterbtnclass = type;
        }
    };
    r2.AnnotRadialMenu.prototype.Relayout = function(){
        var piece = this.GetPiece();
        if(piece){
            var ratio = Math.pow(0.8, this.__pieceaudio.GetTtDepth() - 1);
            this._pos.x = piece.pos.x+piece.GetTtIndent()-r2Const.RADIALMENU_OFFSET_X*ratio;
            this._pos.y = piece.pos.y;
        }
    };
    r2.AnnotRadialMenu.prototype.OnMouseDown = function(event) {
        event.preventDefault();
        if(r2.mouse.mode == r2.MouseModeEnum.HOVER && event.which == 1){ // on left click
            r2.mouse.mode = r2.MouseModeEnum.RADIALMENU;

            r2App.selected_radialmenu = this;
            this.selectItem(-1);
            if(r2App.mode != r2App.AppModeEnum.RECORDING){
                this._circle.classList.toggle('open', true);
            }
        }
    };
    r2.AnnotRadialMenu.prototype.OnMouseDrag = function(_pt){
        if(this._pos.distance(_pt)<this._radius){
            event.preventDefault();
            return this.OnMouseDrag_OverCenterBtn();
        }
        else{
            var idx = (Math.atan2(_pt.y-this._pos.y, _pt.x-this._pos.x)/(2*Math.PI/r2Const.RADIAL_MENU_ITEM_N))+(0.5+r2Const.RADIAL_MENU_ITEM_N/4);
            idx = parseInt(idx+r2Const.RADIAL_MENU_ITEM_N)%r2Const.RADIAL_MENU_ITEM_N;
            return this.OnMouseDrag_OverMenuItem(idx);
        }
    };
    r2.AnnotRadialMenu.prototype.OnMouseDrag_OverCenterBtn = function(){
        this.selectItem(-1);
        return false;
    };
    r2.AnnotRadialMenu.prototype.OnMouseDrag_OverMenuItem = function(n){
        this.selectItem(n);
        switch (n){
            case 0: // collapse
                /*this.GetPiece().GetParent().GatherPieceAudioByAnnotId(this._annotid).forEach(function(piece){
                    piece.SetVisibility(false);
                });
                r2App.invalidate_page_layout = true;
                */
                return true;
                break;
            case 2: // expand
                /*this.GetPiece().GetParent().GatherPieceAudioByAnnotId(this._annotid).forEach(function(piece){
                    piece.SetVisibility(true);
                });
                r2App.invalidate_page_layout = true;
                */
                return true;
                break;
            default :
                break;
        }
        return false;
    };
    r2.AnnotRadialMenu.prototype.OnMouseUp_CenterBtn = function(event){
        event.preventDefault();

        if(r2.mouse.mode != r2.MouseModeEnum.RADIALMENU){return;}
        if (r2App.mode == r2App.AppModeEnum.IDLE) {
            r2.rich_audio.play(this._annotid, -1);
            r2.log.Log_AudioPlay('radialmenu', this._annotid, r2.audioPlayer.getPlaybackTime());
        }
        else if (r2App.mode == r2App.AppModeEnum.REPLAYING) {
            if (r2App.cur_annot_id == this._annotid) {
                r2.log.Log_AudioStop('radialmenu', r2.audioPlayer.getCurAudioFileId(), r2.audioPlayer.getPlaybackTime());
                r2.rich_audio.stop();
            }
            else {
                r2.rich_audio.play(this._annotid, -1);
                r2.log.Log_AudioPlay('radialmenu', this._annotid, r2.audioPlayer.getPlaybackTime());
            }
        }
        else if(r2App.mode == r2App.AppModeEnum.RECORDING && this._annotid == r2App.cur_recording_annot.GetId()){
            r2.recordingStop(true); //toupload
            r2.log.Log_Simple("Recording_Stop_RadialMenu");
        }
    };
    r2.AnnotRadialMenu.prototype.OnMouseUp_MenuItem = function(_pt){
        if(r2.mouse.mode != r2.MouseModeEnum.RADIALMENU){return;}

        var d = this._pos.distance(_pt);
        if(d>0.02){ // btn radius
            switch(this.getSelectedItem()){
                case 0:
                    break;
                case 1:
                    var lnk = r2App.server_url+"viewer?access_code=" + r2.ctx["pdfid"] +
                            "&docid=" + r2.ctx["docid"] +
                            "&groupid=" + r2.ctx["groupid"] +
                            "&comment=" +encodeURIComponent(this._annotid);
                    window.prompt("Link to the Comment", lnk);
                    break;
                case 2:
                    break;
                case 3:
                    if(r2.userGroup.cur_user === this._user){
                        var annottodelete = r2App.annots[this._annotid];
                        if(r2.removeAnnot(this._annotid, true, false)){ // askuser, mute
                            r2Sync.PushToUploadCmd(annottodelete.ExportToCmdDeleteComment());
                            r2.log.Log_Simple("RemoveAnnot_Audio_RadialMenu");
                        }
                    }
                    else{
                        alert("You can only delete your own comments.")
                    }
                    break;
            }
        }

        r2.mouse.mode = r2.MouseModeEnum.HOVER;

        r2App.selected_radialmenu = null;
        this.selectItem(-2);
        this._circle.classList.toggle('open', false);
    };

    /*
     * Ink
     */
    r2.Ink = function(){
        this._anchorpid = null;
        this._username = '';
        this._pts = [];
        this._annotid = null;
        this._t_bgn = 0;
        this._t_end = 0;

        this._pts_abs = [];
        this._bb = new Vec2(0,0);
    };
    r2.Ink.prototype.SetInk = function(anchorpid, username, _pts, annotid, t_bgn_and_end){
        this._anchorpid = anchorpid;
        this._username = username;
        this._pts = _pts;

        this._annotid = annotid;
        this._t_bgn = t_bgn_and_end[0];
        this._t_end = t_bgn_and_end[1];
    };
    r2.Ink.prototype.Relayout = function(piece_pos){
        if(this._pts.length != this._pts_abs.length){
            this._pts_abs = [];
            for(var i = 0; i < this._pts.length; ++i){
                this._pts_abs.push(this._pts[i].add(piece_pos, true));
            }
        }
        else{
            for(var i = 0; i < this._pts.length; ++i){
                this._pts_abs[i] = this._pts[i].add(piece_pos, true);
            }
        }

    };
    r2.Ink.prototype.Draw = function(){
        if(this._pts_abs.length < 2){return;}

        r2.canv_ctx.beginPath();
        r2.canv_ctx.moveTo(this._pts_abs[0].x, this._pts_abs[0].y);
        for(var i = 1; i < this._pts_abs.length; ++i){
            r2.canv_ctx.lineTo(this._pts_abs[i].x, this._pts_abs[i].y);
        }

        if(r2App.cur_annot_id != null && r2App.cur_annot_id == this._annotid) {
            r2.canv_ctx.strokeStyle = r2.userGroup.GetUser(this._username).color_stroke_dynamic_future;
        }
        else{
            r2.canv_ctx.strokeStyle = r2.userGroup.GetUser(this._username).color_dark_html;
        }
        r2.canv_ctx.lineWidth = r2Const.INK_WIDTH;
        r2.canv_ctx.lineCap = 'round';
        r2.canv_ctx.lineJoin = 'round';
        r2.canv_ctx.stroke();
    };

    r2.Ink.prototype.drawReplaying = function(canvas_ctx){
        if(this._pts_abs.length < 2){return;}
        if(r2App.cur_annot_id != null && r2App.cur_annot_id === this._annotid) {
            var n = Math.floor(this._pts_abs.length*(r2App.cur_audio_time-this._t_bgn)/(this._t_end-this._t_bgn));
            n = Math.min(this._pts_abs.length, n);
            if(n >= 2){
                canvas_ctx.beginPath();
                canvas_ctx.moveTo(this._pts_abs[0].x, this._pts_abs[0].y);
                for(var j = 1; j < n; ++j){
                    canvas_ctx.lineTo(this._pts_abs[j].x, this._pts_abs[j].y);
                }
                canvas_ctx.strokeStyle = r2.userGroup.GetUser(this._username).color_stroke_dynamic_past;

                canvas_ctx.lineWidth = r2Const.INK_WIDTH*3;
                canvas_ctx.lineCap = 'round';
                canvas_ctx.lineJoin = 'round';
                canvas_ctx.stroke();
            }
        }
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
        if(!r2App.annots[this.annotid].isPrivateSpotlight){
            color = r2.userGroup.GetUser(this.username).color_splight_static;
            width = Math.floor(r2Const.SPLGHT_WIDTH);
        }
        else{
            color = r2.userGroup.GetUser(this.username).color_splight_private;
            width = Math.floor(r2Const.SPLGHT_PRIVATE_WIDTH);
        }
        canvas_ctx.strokeStyle = color;
        canvas_ctx.lineWidth = width;
        canvas_ctx.lineCap = 'round';
        canvas_ctx.lineJoin = 'round';
        canvas_ctx.stroke();
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
        if(!this._annot.isPrivateSpotlight){
            color = this._user.color_splight_static;
            width = Math.floor(r2Const.SPLGHT_WIDTH*ratio);
        }
        else{
            color = this._user.color_splight_private;
            width = Math.floor(r2Const.SPLGHT_PRIVATE_WIDTH*ratio);
        }
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
    r2.Spotlight.Cache.prototype.drawMovingBlob = function(p0, p1, forprivate, color, canvas_ctx){
        if(p0.equal(p1)){
            p1 = p0.add(new Vec2(0.001, 0.001), true);
        }
        canvas_ctx.beginPath();
        canvas_ctx.moveTo(p0.x, p0.y);
        canvas_ctx.lineTo(p1.x, p1.y);

        if(forprivate){
            canvas_ctx.lineWidth = r2Const.SPLGHT_PRIVATE_WIDTH;
        }
        else{
            canvas_ctx.lineWidth = r2Const.SPLGHT_WIDTH;
        }
        canvas_ctx.strokeStyle = color;
        canvas_ctx.lineCap = 'round';
        canvas_ctx.lineJoin = 'round';
        canvas_ctx.stroke();
    };
    r2.Spotlight.Cache.prototype.HitTest = function(pt){
        if( pt.x > this._bb[0].x && pt.y > this._bb[0].y &&
            pt.x < this._bb[1].x && pt.y < this._bb[1].y &&
            !this._annot.isPrivateSpotlight){
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