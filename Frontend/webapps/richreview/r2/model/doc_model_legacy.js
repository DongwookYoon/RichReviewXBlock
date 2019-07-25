/**
 * Created by ukka123 on 10/19/14.
 */


////////////////////////////////////////////////////////////////////////////////
//
// member variable notatations
// _* private
// * public
// t_* transient variables that will not be serialized
// _t_* transient private variables
////////////////////////////////////////////////////////////////////////////////
var r2Legacy = {
    doc: null
};

(function r2LagacyWrapper() {
    ////////////////////////////////////////////////////////////////////////////////
    // control variables
    ////////////////////////////////////////////////////////////////////////////////
    var proxies = {};
    var pieces = {};
    var doc_annots_toload = [];
    var annots = {};

    function SetDoc(docjs){
        return new Promise(function(resolve, reject){
            try{
                r2Legacy.doc = new DocObj(docjs);
                var job = function(i){
                    if(i != doc_annots_toload.length){
                        r2.util.getUrlData(
                            r2App.file_storage_url + r2.ctx["pdfid"] + "/" + doc_annots_toload[i] + ".vs_annot",
                            ""
                        ).then(
                            function(resp) {
                                var annotjs = JSON.parse(resp);
                                annots[annotjs['id']] = new Annot(annotjs);
                                job(i+1);
                            }
                        ).catch(reject);
                    }
                    else{
                        resolve();
                    }
                };
                job(0);
            }
            catch(err){
                reject(err);
            }

        });
    }
    r2Legacy.SetDoc = SetDoc;


    ////////////////////////////////////////////////////////////////////////////////
    // DobObj class.
    ////////////////////////////////////////////////////////////////////////////////

    var DocObj = function(js){
        this._pages = [];
        for(var i = 0; i < js['pages'].length; ++i){
            var page = new Page(js['pages'][i], i, null);
            this._pages.push(page);
            page.SetTtPieceGroup();
        }
    };
    r2Legacy.DocObj = DocObj;
    DocObj.prototype.GetPage = function(n){
        return this._pages[n];
    };
    DocObj.prototype.RunCmd = function(cmd){
        this._pages[cmd.page_n].RunCmd(cmd);
    };
    DocObj.prototype.SearchPieceTearedWithAnnotId = function(annotId){
        var i, page;
        for(i = 0; page = this._pages[i]; ++i) {
            var p = page.SearchPieceTearedWithAnnotId(annotId);
            if (p){
                return {'pageNum' : i, 'PieceTeared': p};
            }
        }
        return null;
    };
    DocObj.prototype.GetObjByType = function(type){
        var rtn = [];

        var i, page;
        for(i = 0; page = this._pages[i]; ++i) {
            rtn = rtn.concat(page.GetObjByType(type));
        }
        return rtn;
    };
    DocObj.prototype.ExtractR2DocCmd_SpotlightByAnnotId = function(annotid){
        // Spotlight: {t_bgn:..., t_end:..., npage: 0, segments: [Segment, Segment, ...]}
        // Spotlight.Segment: {pid: ..., pts: [Vec2, Vec2, ...]}

        var rtn = [];

        var i, page;
        for(i = 0; page = this._pages[i]; ++i) {
            rtn = rtn.concat(page.ExtractR2DocCmd_SpotlightByAnnotId(annotid));
        }
        // should sort this out by t_bgn.
        return rtn;
    };



    ////////////////////////////////////////////////////////////////////////////////
    // Rect class. Base of all the graphical elements
    ////////////////////////////////////////////////////////////////////////////////

    function Rect(js, parent){
        if(js)
        {
            if(js.hasOwnProperty('iscmd')) { // from cmd
                var target_piece = pieces[js.target_piece];
                if(js.operation == "create"){
                    if(["PieceTeared", "PieceKeyboard"].indexOf(js.datatype) >= 0){
                        this.trans = new Vec2(target_piece.trans.x, target_piece.trans.y+target_piece.size.y);
                        this.scale = 1;
                        this.size = new Vec2(target_piece.size.x, 0.0);
                        if(js.datatype == "PieceKeyboard"){
                            this.size = new Vec2(target_piece.size.x, 34/920);
                        }

                        this._children = [];
                        this._t_parent = parent;
                        this.t_absPtLt = null; // set by UpdateAbsoluteLayout
                        this.t_absPtRb = null;
                    }
                }
            }
            else{
                this.trans = new Vec2(parseFloat(js['trans'][0]), parseFloat(js['trans'][1]));
                this.scale = new Vec2(parseFloat(js['scale'][0]), parseFloat(js['scale'][1]));
                this.size = new Vec2(parseFloat(js['v1'][0]), parseFloat(js['v1'][1]));
                this._children = [];
                this._t_parent = parent;
                this.t_absPtLt = null; // set by UpdateAbsoluteLayout
                this.t_absPtRb = null;
            }
        }
    }
    Rect.prototype.GetParent = function(){
        return this._t_parent;
    };
    Rect.prototype.GetObjByType = function(type){
        var rtn = [];
        if(this instanceof type){rtn.push(this);}
        for(var i = 0; i < this._children.length; ++i){
            rtn = rtn.concat(this._children[i].GetObjByType(type));
        }
        return rtn;
    };
    Rect.prototype.SetTtPieceGroup = function() {
        for(var i = 0; i < this._children.length; ++i){
            this._children[i].SetTtPieceGroup();
        }
    };
    Rect.prototype.SetVisibility = function(b){
        for(var i = 0; i < this._children.length; ++i){
            this._children[i].SetVisibility(b);
        }
    };
    Rect.prototype.UpdateAbsoluteLayout = function(){
        if(this._t_parent){
            this.t_absPtLt = this._t_parent.t_absPtLt.add(this.trans, true);
            this.t_absPtRb = this.t_absPtLt.add(this.size, true);
        }
        else{
            this.t_absPtLt = this.trans.clone();
            this.t_absPtRb = this.t_absPtLt.clone();
        }
        for(var i = 0; i < this._children.length; ++i){
            this._children[i].UpdateAbsoluteLayout();
        }
    };
    Rect.prototype.HitTest = function(pt){
        var rtn = [];
        for(var i = 0; i < this._children.length; ++i){
            rtn = rtn.concat(this._children[i].HitTest(pt));
        }
        if(this.t_absPtLt.x < pt.x && this.t_absPtRb.x > pt.x &&
            this.t_absPtLt.y < pt.y && this.t_absPtRb.y > pt.y)
        {
            rtn.push(this);
        }
        return rtn;
    };
    Rect.prototype.DrSetPdf = function(pdf_canvas){
        for(var i = 0; i < this._children.length; ++i){
            this._children[i].DrSetPdf(pdf_canvas);
        }
    };
    Rect.prototype.DrDrawPiece = function(){
        for(var i = 0; i < this._children.length; ++i){
            this._children[i].DrDrawPiece();
        }
    };
    Rect.prototype.DrDrawWaveformLines_Dynamic = function(cur_annot_id){
        for(var i = 0; i < this._children.length; ++i){
            this._children[i].DrDrawWaveformLines_Dynamic(cur_annot_id);
        }
    };
    Rect.prototype.DrDrawWaveformLines_Static = function(){
        for(var i = 0; i < this._children.length; ++i){
            this._children[i].DrDrawWaveformLines_Static();
        }
    };
    Rect.prototype.DrDrawStrokeWrapper = function(cur_annot_id){
        for(var i = 0; i < this._children.length; ++i){
            this._children[i].DrDrawStrokeWrapper(cur_annot_id);
        }
    };
    Rect.prototype.DrDrawStrokes = function(cur_annot_id){
        for(var i = 0; i < this._children.length; ++i){
            this._children[i].DrDrawStrokes(cur_annot_id);
        }
    };
    Rect.prototype.DrDrawPDF = function(){
        for(var i = 0; i < this._children.length; ++i){
            this._children[i].DrDrawPDF();
        }
    };
    Rect.prototype.SearchPieceProxyWithProxyId = function(id){
        for(var i = 0; i < this._children.length; ++i){
            var r = this._children[i].SearchPieceProxyWithProxyId(id);
            if(r){
                return r;
            }
        }
        return null;
    };
    Rect.prototype.SearchPieceTearedWithAnnotId = function(annotId){
        for(var i = 0; c = this._children[i]; ++i) {
            var r = c.SearchPieceTearedWithAnnotId(annotId);
            if(r){
                return r;
            }
        }
        return null;
    };
    Rect.prototype.RunCmd = function(cmd){
        for(var i = 0; i < this._children.length; ++i){
            this._children[i].RunCmd(cmd);
        }
    };
    Rect.prototype.GatherRadialBtnPosition = function(){
        var rtn = [];
        for(var i = 0; i < this._children.length; ++i){
            rtn = rtn.concat(this._children[i].GatherRadialBtnPosition());
        }
        return rtn;
    };
    Rect.prototype.GatherWaveformPosition = function(){
        var rtn = [];
        for(var i = 0; i < this._children.length; ++i){
            rtn = rtn.concat(this._children[i].GatherWaveformPosition());
        }
        return rtn;
    };
    Rect.prototype.GatherPenStrokePosition = function(){
        var rtn = [];
        for(var i = 0; i < this._children.length; ++i){
            rtn = rtn.concat(this._children[i].GatherPenStrokePosition());
        }
        return rtn;
    };
    Rect.prototype.GatherSpotlightPosition = function(){
        var rtn = [];
        for(var i = 0; i < this._children.length; ++i){
            rtn = rtn.concat(this._children[i].GatherSpotlightPosition());
        }
        return rtn;
    };
    Rect.prototype.GetPieceTearedOfAnnot = function(annotId){
        for(var i = 0; i < this._children.length; ++i){
            var r = this._children[i].GetPieceTearedOfAnnot(annotId);
            if(r != null){
                return r;
            }
        }
        return null;
    };


    ////////////////////////////////////////////////////////////////////////////////
    // Page class
    ////////////////////////////////////////////////////////////////////////////////
    Page.prototype = new Rect;
    function Page(js, _num, parent){
        Rect.call(this, js, parent);
        this._t_regions = [];
        this._num = _num;
        for(var i = 0; i < js['regions'].length; ++i){
            this._t_regions.push(new Region(js['regions'][i], this));
            this._children.push(this._t_regions[this._t_regions.length-1])
        }
        this._sptlghts = this.LoadSpotlights(js['stroke_gesture']);
    }
    Page.prototype.LoadSpotlights = function(js){
        var rtn = {};
        for(var i = 0; i < js.length; ++i){
            var l = [];
            for(var j = 0; j < js[i]['stroke'].length; ++j){
                l.push(new Spotlight(js[i]['stroke'][j]))
            }
            rtn[js[i]['annot_id']] = l;
        }
        return rtn;
    };
    Page.prototype.GetNum = function(){
        return this._num;
    };
    Page.prototype.HitTest = function(pt){
        var rtn = [];
        for(var i = 0; i < this._children.length; ++i){
            rtn = rtn.concat(this._children[i].HitTest(pt));
        }
        for(var annot in this._sptlghts){ // for spotlights of all annotations
            if(this._sptlghts.hasOwnProperty(annot)) {
                for (i = 0; i < this._sptlghts[annot].length; ++i) { // ith spotlight of the annotation
                    var splght = this._sptlghts[annot][i]; // splght._ptsOnPieces[idx]
                    if(splght.HitTest(pt)){
                        rtn = rtn.concat([splght]);
                    }
                }
            }
        }
        return rtn;
    };
    Page.prototype.UpdateRelativeLayout = function(){
        for( var i = 0; i < 4; ++i){
            this._t_regions[i].UpdateRelativeLayout();
        }

        var y = 0;
        this._t_regions[0].trans.y = y;
        y += this._t_regions[0].size.y;
        this._t_regions[1].trans.y = y;
        this._t_regions[2].trans.y = y;
        y += Math.max(this._t_regions[1].size.y, this._t_regions[2].size.y);
        this._t_regions[3].trans.y = y;
        y += this._t_regions[3].size.y;
        this.size.y = y;
    };
    Page.prototype.DrDrawPDF = function(){
        r2.canv_ctx.fillStyle = 'white';
        r2.canv_ctx.fillRect(0, 0, this.size.x, this.size.y);
        Rect.prototype.DrDrawPDF.call(this);
    };
    Page.prototype.GatherSpotlightPosition = function(){
        var rtn = [];
        for(var annot in this._sptlghts){ // for spotlights of all annotations
            if(this._sptlghts.hasOwnProperty(annot)) {
                for (var i = 0; i < this._sptlghts[annot].length; ++i) { // ith spotlight of the annotation
                    var splght = this._sptlghts[annot][i]; // splght._ptsOnPieces[idx]
                    var p = splght.GetRepresentativePts();
                    if(p)
                        rtn.push(p);

                }
            }
        }
        return rtn;
    };
    Page.prototype.GetRegion = function(i){
        return this._t_regions[i]
    };

    Page.prototype.ExtractR2DocCmd_SpotlightByAnnotId = function(annotid){
        if( this._sptlghts[annotid] === undefined){return [];}
        var spotlights = this._sptlghts[annotid];
        var rtn = [];
        var i, spotlight;
        for(i = 0; spotlight = spotlights[i]; ++i){
            rtn.push(spotlight.ExtractR2DocCmd_Spotlight(this._num));
        }
        return rtn;
    };


    ////////////////////////////////////////////////////////////////////////////////
    // Region class
    ////////////////////////////////////////////////////////////////////////////////

    Region.prototype = new Rect;
    Region.constructor = Region;
    function Region(js, parent){
        Rect.call(this, js, parent);

        for(var i = 0; i < js['pieces'].length; ++i){
            var typestr = js['pieces'][i]['Type'];
            if(typestr == 'PieceText'){
                this._children.push(new PieceText(js['pieces'][i], this));
            }
            else if(typestr == 'PieceTeared'){
                this._children.push(new PieceTeared(js['pieces'][i], this));
            }
            else if(typestr == 'PieceProxy'){
                this._children.push(new PieceProxy(js['pieces'][i], this));
            }
        }
    }
    Region.prototype.UpdateRelativeLayout = function(){
        var y = 0;
        for( var i = 0; i < this._children.length; ++i){
            this._children[i].trans.y = y;
            y += this._children[i].GetHeight();
        }
        this.size.y = y;
    };
    Region.prototype.AddPieceAfter = function(new_picece, after_pid){
        for( var i = 0; i < this._children.length; ++i) {
            if(this._children[i].GetId() == after_pid){
                this._children.splice(i+1, 0, new_picece);
                break;
            }
        }
    };
    Region.prototype.RunCmd = function(cmd) {
        Rect.prototype.RunCmd.call(this, cmd);
        if(cmd.operation == "remove"){
            for(var i = 0; i < this._children.length; ++i) {
                if(this._children[i].GetId() == cmd.id){
                    this._children.splice(i--,1);
                    break;
                }
            }
        }
    };

    ////////////////////////////////////////////////////////////////////////////////
    // Piece class
    ////////////////////////////////////////////////////////////////////////////////

    Piece.prototype = new Rect;
    Piece.constructor = Piece;
    function Piece(js, parent){
        if(js) {
            Rect.call(this, js, parent);
            if(js.hasOwnProperty('iscmd')) { // from cmd
                if(js.operation == "create"){
                    if(["PieceTeared", "PieceKeyboard"].indexOf(js.datatype) >= 0){
                        var target_piece = pieces[js.target_piece];
                        this._id = js['id'];
                        this._visible = true;
                        this._type = js.datatype;
                        var tt_data = target_piece.GetTtDataSetForTtChild();
                        this._tt_level = tt_data.level; // go one level deeper
                        this._tt_x0 = tt_data.x0; // indent once
                        this._tt_x1 = tt_data.x1;
                        this._stroke_pen = {};
                        this._tt_parent = target_piece.GetId();
                        this._tt_childGroups = [];
                    }
                }
            }
            else{ // from json file
                this._id = js['id'];
                this._visible = true;
                this._type = js['Type'];
                this._tt_level = parseInt(js['tt_level']);
                this._tt_x0 = js['tt_x0'];
                this._tt_x1 = js['tt_x1'];
                this._stroke_pen = {};
                for(var i = 0; i < js['stroke_pen'].length; ++i) {
                    var js_strk = js['stroke_pen'][i];
                    var strokes = [];
                    for(var j = 0; j < js_strk['stroke'].length; ++j){
                        strokes.push(new StrokePen(js_strk['stroke'][j]))
                    }
                    this._stroke_pen[js_strk['annot_id']] = strokes;
                }
                this._tt_parent = null; // will be set by SetTtPieceGroup
                this._tt_childGroups = null;
                this._t_tt_parent_org = js['tt_parent_id'];
                this._t_tt_children_org = js['tt_children']; // children list of textteared data
            }
            pieces[this._id] = this;
        }
    }
    r2Legacy.Piece = Piece;
    Piece.prototype.GetId = function(){
        return this._id;
    };
    Piece.prototype.ExportArgumentsToR2Doc_Piece = function(){
        return [this._id, 0, this.size.clone(), [this._tt_level, this._tt_x0, this._tt_x1-this._tt_x0]];
    };
    Piece.prototype.GetNum_TtPieceGroup = function(_pid){
        for(var i = 0; i < this._tt_childGroups.length; ++i){
            var grp = this._tt_childGroups[i];
            if(grp.pidTeared == _pid){ // if this is a PieceTeared,
                return i;
            }
            for(var j = 0; j < grp.pidNoneTeared.length; ++j){// Otherwise
                if(grp.pidNoneTeared[j] == _pid){
                    return i;
                }
            }
        }
        return -1;
    };
    Piece.prototype.GetSiblingTtPieceGroups = function(){
        return pieces[this._tt_parent]._tt_childGroups;
    };
    Piece.prototype.GetSiblingTtTearedId = function(){
        var tt_n = pieces[this._tt_parent].GetNum_TtPieceGroup(this._id);
        var mygrp = this.GetSiblingTtPieceGroups()[tt_n];
        return mygrp.pidTeared;
    };
    Piece.prototype.GetType = function(){
        return this._type;
    };
    Piece.prototype.IsVisible = function(){
        return this._visible;
    };
    Piece.prototype.GetHeight = function(){
        if(this._visible){
            return this.size.y;
        }
        else{
            return 0;
        }
    };
    Piece.prototype.isTheSameOrAdjecent = function(pid0, pid1){
        return (pid0==pid1) || (Math.min(
                Math.abs(pieces[pid0].t_absPtLt.y - pieces[pid1].t_absPtRb.y),
                Math.abs(pieces[pid0].t_absPtRb.y - pieces[pid1].t_absPtLt.y)
            ) < 1.0/1000.0);
    };
    Piece.prototype.RunCmd = function(cmd){
        if(cmd.operation == "create"){
            if(cmd.target_piece == this._id){
                if(cmd.datatype == "PieceTeared"){
                    var new_piece = new PieceTeared(cmd, this._t_parent);
                    this._tt_childGroups.splice(0, 0, new TtPieceGroup(new_piece.GetId()));
                    this._t_parent.AddPieceAfter(new_piece, this._id); // put this in the region
                }
                else if(cmd.datatype == "PieceKeyboard"){
                    var new_piece = new PieceKeyboard(cmd, this._t_parent);
                    this._tt_childGroups[0].pidNoneTeared.splice(0, 0, new_piece.GetId());
                    this._t_parent.AddPieceAfter(new_piece, new_piece.GetSiblingTtTearedId()); // put this in the region
                }
            }
        }
        else if(cmd.operation == "remove"){
            if(cmd.datatype == "PieceKeyboard") {
                if (cmd.id == this._id) {
                    pieces[this._tt_parent].RemoveTtChild(this._id);
                    this.RemoveR2TextArea();
                    delete pieces[this._id];
                }
            }
            else if(cmd.datatype == "PieceTeared") {
                if (cmd.id == this._id) {
                    pieces[this._tt_parent].RemoveTtChild(this._id);
                    delete pieces[this._id];
                }
            }
            else{
                console.log("RunCmd: unsupported datatype for remove operation");
            }
        }
    };
    Piece.prototype.GetTtDataSetForTtChild = function(){
        if(this._type == "PieceTeared"){
            return {level: this._tt_level, x0: this._tt_x0, x1: this._tt_x1};
        }
        else{
            return {level: this._tt_level+1, x0: this._tt_x0, x1: this._tt_x1};
        }

    };
    Piece.prototype.SetTtPieceGroup = function(){
        this._tt_childGroups = [];
        if(this._t_tt_children_org.length != 0){
            var head = pieces[this._t_tt_children_org[0]];
            if(head.GetType() != 'PieceTeared') { console.log('Warning from SetTtPieceGroup');}
            var grp = new TtPieceGroup(this._t_tt_children_org[0]); // pass pid teard

            for(var i = 1; i < this._t_tt_children_org.length; ++i){
                var cur_piece = pieces[this._t_tt_children_org[i]];
                if(typeof cur_piece != 'undefined'){ // metro app bug
                    if(cur_piece.GetType() == 'PieceTeared'){
                        this._tt_childGroups.push(grp);
                        grp = new TtPieceGroup(this._t_tt_children_org[i]);
                    }
                    else{
                        grp.pidNoneTeared.push(this._t_tt_children_org[i])
                    }
                }
            }
            this._tt_childGroups.push(grp);
        }
        // _tt_parent is straight forward
        this._tt_parent = this._t_tt_parent_org;
    };
    Piece.prototype.SetVisibility = function(b){
        this._visible = b;
        for(var i = 0; i < this._tt_childGroups.length; ++i){
            var grp = this._tt_childGroups[i];
            pieces[grp.pidTeared].SetVisibility(b);
            for(var j = 0; j < grp.pidNoneTeared.length; ++j){
                pieces[grp.pidNoneTeared[j]].SetVisibility(b);
            }
        }
    };
    Piece.prototype.HitTest = function(pt){
        if(this._visible){
            var rtn = Rect.prototype.HitTest.call(this, pt);
            rtn = rtn.concat(this.HitTestStroke(pt));
            return rtn;
        }
    };
    Piece.prototype.HitTestStroke = function(pt){
        var rtn = [];
        for(var key in this._stroke_pen){
            if(this._stroke_pen.hasOwnProperty(key)){
                for(var i = 0; i < this._stroke_pen[key].length; ++i){
                    rtn = rtn.concat(this._stroke_pen[key][i].HitTest(pt));
                }
            }
        }
        return rtn;
    };
    Piece.prototype.UpdateAbsoluteLayout = function(){
        Rect.prototype.UpdateAbsoluteLayout.call(this);
        for(var key in this._stroke_pen){
            if(this._stroke_pen.hasOwnProperty(key)){
                for(var i = 0; i < this._stroke_pen[key].length; ++i){
                    this._stroke_pen[key][i].UpdateAbsoluteLayout(this.t_absPtLt);
                }
            }
        }
    };
    Piece.prototype.DrDrawStrokes = function(cur_annot_id) {
        if(this._visible) {
            Rect.prototype.DrDrawStrokes.call(this, cur_annot_id);

            for (var key in this._stroke_pen) {
                if (this._stroke_pen.hasOwnProperty(key)) {
                    for (var i = 0; i < this._stroke_pen[key].length; ++i) {
                        this._stroke_pen[key][i].DrDrawStrokes(cur_annot_id);
                    }
                }
            }
        }
    };
    Piece.prototype.RemoveTtChild = function(_pid){
        if(pieces[_pid].GetType() == "PieceTeared"){
            for(var i = 0; i < this._tt_childGroups.length; ++i){
                if(this._tt_childGroups[i].pidTeared == _pid){
                    if(this._tt_childGroups[i].pidNoneTeared.length == 0){
                        this._tt_childGroups.splice(i--, 1);
                    }
                    else{
                        console.log("RemoveTtChild: cannot remove note when it has a comment underneath");
                    }
                }
            }
        }
        else if(pieces[_pid].GetType() == "PieceKeyboard"){
            for(var i = 0; i < this._tt_childGroups.length; ++i){
                var grp = this._tt_childGroups[i];
                for(var j = 0; j < grp.pidNoneTeared.length; ++j){// Otherwise
                    if(grp.pidNoneTeared[j] == _pid){
                        grp.pidNoneTeared.splice(j--, 1);
                    }
                }
            }
        }
        else{
            console.log("RemoveTtChild: unsupported datatype -", pieces[_pid].type);
        }
    };
    Piece.prototype.GatherPenStrokePosition = function(){
        var rtn = [];
        if(this._visible){
            for (var key in this._stroke_pen) {
                if (this._stroke_pen.hasOwnProperty(key) && key != '') {
                    for (var i = 0; i < this._stroke_pen[key].length; ++i) {
                        var p = this._stroke_pen[key][i].GetRepresentativePts();
                        if(p){
                            rtn.push(p);
                        }
                    }
                }
            }
        }
        return rtn;
    };
    Piece.prototype.ExtractR2DocCmds_Ink = function(){

        // time: 2014-12-21T13...
        // user: 'red user'
        // op: 'CreateComment'
        // type: 'CommentInk'
        // anchorTo: {type: 'PieceText or PieceTeared', id: pid, page: 2} or
        // data: {aid: ..., strokes: [{time: [bgn, end], pts: []}, {...} ...]}
        var cmds = [];
        for (var key in this._stroke_pen) {
            if (this._stroke_pen.hasOwnProperty(key)) {
                var cmd = {};
                cmd.op = 'CreateComment';
                cmd.type = 'CommentInk';
                if(key == ''){
                    cmd.time = 0;
                }
                else{
                    cmd.time = annots[key].GetRecordBgnTime();
                }
                cmd.user = r2Const.LEGACY_USERNAME;
                cmd.anchorTo = this.GetAnchorTo();
                cmd.data = {};

                cmd.data.aid = key;
                cmd.data.strokes = [];

                for (var i = 0; stroke = this._stroke_pen[key][i]; ++i) {
                    cmd_stroke = {};
                    cmd_stroke.time = stroke.GetTimeBgnAndEnd();
                    cmd_stroke.pts = r2.util.vec2ListToNumList(stroke.GetPts());
                    cmd.data.strokes.push(cmd_stroke)
                }
                cmds.push(cmd);
            }
        }
        return cmds;

    };

    ////////////////////////////////////////////////////////////////////////////////
    // PieceText class
    ////////////////////////////////////////////////////////////////////////////////

    PieceText.prototype = new Piece;
    PieceText.constructor = PieceText;
    function PieceText(js, parent){
        Piece.call(this, js, parent);
        this._tex_coord_v0 = new Vec2(parseFloat(js['tex_coord_v0'][0]),parseFloat(1.0-js['tex_coord_v0'][1]));
        this._tex_coord_v1 = new Vec2(parseFloat(js['tex_coord_v1'][0]),parseFloat(1.0-js['tex_coord_v1'][1]));

        this._t_dr_x = 0;
        this._t_dr_y = 0;
        this._t_dr_w = 1;
        this._t_dr_h = 1;
        this._t_src_w = 1;
        this._t_src_h = 1;
        this._t_dr_pdf = null;
    }
    r2Legacy.PieceText = PieceText;
    PieceText.prototype.SetVisibility = function(b){
    };
    PieceText.prototype.GetAnchorTo = function(){
        var rtn = {};
        rtn.type = 'PieceText';
        rtn.id = this._id;
        rtn.page = this._t_parent.GetParent().GetNum();
        return rtn;
    };
    PieceText.prototype.DrSetPdf = function(pdf_canvas){
        var pdf_x = Math.floor(this.t_absPtLt.x * pdf_canvas.width);
        var pdf_y = Math.floor(this.t_absPtLt.y * pdf_canvas.width);
        var pdf_w = Math.floor((this.t_absPtRb.x-this.t_absPtLt.x) * pdf_canvas.width);
        var pdf_h = Math.floor((this.t_absPtRb.y-this.t_absPtLt.y) * pdf_canvas.width + 1);

        this._t_dr_x = pdf_x/pdf_canvas.width;
        this._t_dr_y = pdf_y/pdf_canvas.width;
        this._t_dr_w = pdf_w/pdf_canvas.width;
        this._t_dr_h = pdf_h/pdf_canvas.width;

        var src_x = Math.floor(this._tex_coord_v0.x * pdf_canvas.width);
        var src_y = Math.floor((1.0-this._tex_coord_v0.y) * pdf_canvas.height);
        this._t_src_w = pdf_w;
        this._t_src_h = pdf_h;

        this._t_dr_pdf = document.createElement('canvas');
        this._t_dr_pdf.width = this._t_src_w;
        this._t_dr_pdf.height = this._t_src_h;
        this._t_dr_pdf.getContext('2d').drawImage(pdf_canvas,
            src_x, src_y, this._t_src_w, this._t_src_h,
            0, 0, this._t_src_w, this._t_src_h);
    };
    PieceText.prototype.DrDrawPDF = function(){
        if(this._t_dr_pdf){
            r2.canv_ctx.drawImage(this._t_dr_pdf,
                0, 0, this._t_src_w, this._t_src_h,
                this._t_dr_x, this._t_dr_y, this._t_dr_w, this._t_dr_h);
        }
    };
    PieceText.prototype.ExportArgumentsToR2Doc_PieceText = function(){
        return [this._tex_coord_v0.clone(), this._tex_coord_v1.clone()];
    };

    ////////////////////////////////////////////////////////////////////////////////
    // PieceTeared class
    ////////////////////////////////////////////////////////////////////////////////

    PieceTeared.prototype = new Piece;
    PieceTeared.constructor = PieceTeared;
    function PieceTeared(js, parent){
        Piece.call(this, js, parent);
        if(js.hasOwnProperty('iscmd')){ // from cmd
            this._username = js.username;
            this._annotId = '';
        }
        else{ // from saved json file
            this._username = js['username'];
            this._annotId = js['annot_id'];

            if(this._annotId != ''){
                doc_annots_toload.push(this._annotId);
            }
        }
    }
    r2Legacy.PieceTeared = PieceTeared;
    PieceTeared.prototype.ExtractR2DocCmd_PieceTeared = function(){
        var cmd = {};
        // time: 2014-12-21T13...
        // user: 'red user'
        // op: 'CreateComment'
        // type: TextTearing
        // anchorTo: {type: 'PieceText', id: pid, page: 2} or
        //           {type: 'PieceTeared', id: pid, page: 2}
        //           {type: 'CommentAudio', id: annotId, page: 2, time: [t0, t1]}
        // data: {pid: id, height: 0.1}

        //if(this.size.y != 0)
        {
            cmd.time = this._annotId != '' ? annots[this._annotId].GetRecordBgnTime() : 0;
            cmd.user = r2Const.LEGACY_USERNAME;
            cmd.op = 'CreateComment';
            cmd.type = 'TextTearing';
            cmd.data = {};
            var parent = pieces[this._tt_parent];
            if(parent instanceof PieceText){
                cmd.anchorTo = parent.GetAnchorTo();
                cmd.data.pid = this.GetId();
                cmd.data.height = this.size.y;
            }
            else if(parent instanceof PieceTeared){
                cmd = {}
            }
            else if(parent instanceof PieceProxy){
                cmd = {}
            }
            else{
                cmd = {}
            }
        }

        return cmd;
    };
    PieceTeared.prototype.ExtractR2DocCmd_CommentAudio = function(){
        var cmd = {};
        // time: 2014-12-21T13...
        // user: 'red user'
        // op: 'CreateComment'
        // type: CommentAudio
        // anchorTo: {type: 'PieceText', id: pid, page: 2} or
        //           {type: 'PieceTeared', id: pid, page: 2}
        //           {type: 'CommentAudio', id: annotId, page: 2, time: [t0, t1]}
        // data: {aid: ..., duration: t, waveform_sample: [0, 100, 99, 98 ...], Spotlights: inking: };

        if(this._annotId != ''){
            var parent = pieces[this._tt_parent];
            annot = annots[this._annotId];

            cmd.time = annot.GetRecordBgnTime();
            cmd.user = r2Const.LEGACY_USERNAME;
            cmd.op = 'CreateComment';
            cmd.type = 'CommentAudio';
            cmd.anchorTo = {};
            cmd.data = {};

            if(parent instanceof PieceText){ //
                cmd.anchorTo = this.GetAnchorTo();
                cmd.data.aid = this._annotId;
                cmd.data.duration = annot.GetRecordDuration();
                cmd.data.waveform_sample = annot._audio_dbs;
                cmd.data.Spotlights = r2Legacy.doc.ExtractR2DocCmd_SpotlightByAnnotId(this._annotId);
                cmd.data.audiofileurl = r2App.file_storage_url + r2.ctx["pdfid"] + "/" + this._annotId + ".wav";
            }
            else if(parent instanceof PieceProxy){
                cmd = {}
            }
            else{
                cmd = {}
            }
        }

        return cmd;
    };
    PieceTeared.prototype.GetAnchorTo = function(){
        var rtn = {};
        rtn.type = 'PieceTeared';
        rtn.id = this._id;
        rtn.page = this._t_parent.GetParent().GetNum();
        return rtn;
    };
    PieceTeared.prototype.GetAnnotId = function(){
        return this._annotId;
    };
    PieceTeared.prototype.SetVisibility = function(b){
        Piece.prototype.SetVisibility.call(this, b);

        var tt_n = pieces[this._tt_parent].GetNum_TtPieceGroup(this._id);
        var mygrp = this.GetSiblingTtPieceGroups()[tt_n];
        for(var i = 0; i < mygrp.pidNoneTeared.length; ++i){
            pieces[mygrp.pidNoneTeared[i]].SetVisibility(b);
        }

        if(tt_n == 0){
            var grps = this.GetSiblingTtPieceGroups();
            for(var j = 1; j < grps.length; ++j){
                pieces[grps[j].pidTeared].SetVisibility(b);
            }
        }
    };
    PieceTeared.prototype.SearchPieceTearedWithAnnotId = function(annotId){
        return this._annotId == annotId ? this : null;
    };
    PieceTeared.prototype.UpdateAbsoluteLayout = function(){
        Piece.prototype.UpdateAbsoluteLayout.call(this);
    };
    PieceTeared.prototype.GetPieceTearedOfAnnot = function(annotId){
        if(annotId == this._annotId){
            return this._id;
        }
        else{
            return null;
        }
    };


    ////////////////////////////////////////////////////////////////////////////////
    // PieceProxy class
    ////////////////////////////////////////////////////////////////////////////////

    PieceProxy.prototype = new Piece;
    PieceProxy.constructor = PieceProxy;
    function PieceProxy(js, parent){
        Piece.call(this, js, parent);
        this._proxy_id = js['proxy_id'];
        this._t_proxy = null; // set by GetProxy
    }
    PieceProxy.prototype.GetProxy = function(){
        if(this._t_proxy==null){
            this._t_proxy = proxies[this._proxy_id];
        }
        return this._t_proxy;
    };
    PieceProxy.prototype.GetPlayback = function(pt){
        return this.GetProxy().GetPlayback(pt);
    };
    PieceProxy.prototype.GetAnchorTo = function(){
        //{type: 'CommentAudio', id: annotId, page: 2, time: [t0, t1]}
        var rtn = {};
        rtn.type = 'CommentAudio';
        rtn.id = this.GetProxy().GetAnnotId();
        rtn.page = this._t_parent.GetParent().GetNum();
        rtn.time = [this.GetProxy().GetTimeBgn(), this.GetProxy().GetTimeEnd()];
        return rtn;
    };
    PieceProxy.prototype.DrDrawWaveformLines_Dynamic = function(cur_annot_id){
        if(this._visible){
            var p = this.GetProxy();
            if(p){ // only for proxy_waveforms yet
                p.DrDrawWaveformLines_Dynamic(cur_annot_id);
            }
        }
    };
    PieceProxy.prototype.DrDrawWaveformLines_Static = function(){
        if(this._visible){
            var p = this.GetProxy();
            if(p){ // only for proxy_waveforms yet
                p.DrDrawWaveformLines_Static();
            }
        }
    };

    PieceProxy.prototype.SearchPieceProxyWithProxyId = function(id){
        if(id == this._proxy_id){
            return this._id;
        }
        else{
            return null;
        }

    };
    PieceProxy.prototype.GatherWaveformPosition = function(){
        var p = this.GetProxy();
        if(typeof p != 'undefined' && p.LongerThanHalf() && this._visible){
            return [new Vec2(0.5*(this._tt_x0+this._tt_x1)+this.t_absPtLt.x,
                0.5*(this.t_absPtLt.y+this.t_absPtRb.y))]
        }
        else{
            return [];
        }

    };


    ////////////////////////////////////////////////////////////////////////////////
    // PieceKeyboard class
    ////////////////////////////////////////////////////////////////////////////////
    PieceKeyboard.prototype = new Piece;
    PieceKeyboard.constructor = PieceKeyboard;
    function PieceKeyboard(js, parent) {
        Piece.call(this, js, parent);
        if(js){
            if(js.hasOwnProperty('iscmd')) { // from cmd
                this.type = "PieceKeyboard";
                this._username = js.username;
            }
            else{ // from json file

            }
        }
    }
    PieceKeyboard.prototype.RunCmd = function(cmd){
        Piece.prototype.RunCmd.call(this, cmd);
    };



    /**
     * Created by Dongwook on 12/18/2014.
     */


    ////////////////////////////////////////////////////////////////////////////////
    // Spotlight class
    ////////////////////////////////////////////////////////////////////////////////

    function Spotlight(js){
        var POINT = 0;
        var PIECE_ID = 1;
        this.trans = new Vec2(parseFloat(js['trans'][0]), parseFloat(js['trans'][1]));
        this.scale = new Vec2(parseFloat(js['scale'][0]), parseFloat(js['scale'][1]));
        this.size = new Vec2(parseFloat(js['v1'][0]), parseFloat(js['v1'][1]));
        this._annotId = js['annot_id'];
        this._username = js['username'];
        this._time_bgn = parseFloat(js['time_bgn'][2])/10000.0;
        this._time_end = parseFloat(js['time_end'][2])/10000.0;
        this._pts = [];
        for(var i = 0; i < js['pts'].length; ++i){
            this._pts.push(new Vec2(parseFloat(js['pts'][i][0]), parseFloat(js['pts'][i][1])));
        }
        this._ptsOnPieces = [];
        for(i = 0; i < js['pts_on_pieces'].length; ++i){
            var pt_on_piece = [];
            pt_on_piece.push(
                new Vec2(
                    parseFloat(js['pts_on_pieces'][i][POINT][0]),
                    parseFloat(js['pts_on_pieces'][i][POINT][1])));
            pt_on_piece.push(js['pts_on_pieces'][i][PIECE_ID]);
            this._ptsOnPieces.push(pt_on_piece);
        }
    }
    Spotlight.prototype.ExtractR2DocCmd_Spotlight = function(npage){
        var POINT = 0;
        var PIECE_ID = 1;

        // Spotlight: {t_bgn:..., t_end:..., npage: 0, segments: [Segment, Segment, ...]}
        // Spotlight.Segment: {pid: ..., pts: [Vec2, Vec2, ...]}
        var cmd = {};
        cmd.t_bgn = this._time_bgn;
        cmd.t_end = this._time_end;
        cmd.npage = npage;
        cmd.segments = [];

        var cmdsegment = {};
        cmdsegment.pid = this._ptsOnPieces[0][PIECE_ID];
        cmdsegment.pts = [this._ptsOnPieces[0][POINT]];
        for(var i = 1; i < this._ptsOnPieces.length; ++i){
            if(cmdsegment.pid != this._ptsOnPieces[i][PIECE_ID]){
                cmd.segments.push(cmdsegment);
                cmdsegment = {};
                cmdsegment.pid = this._ptsOnPieces[i][PIECE_ID];
                cmdsegment.pts = [];
            }
            cmdsegment.pts.push(this._ptsOnPieces[i][POINT]);
        }
        cmd.segments.push(cmdsegment);

        cmd.segments.forEach(function(segment){
            segment.pts = r2.util.vec2ListToNumList(segment.pts);
        });

        return cmd;
    };
    Spotlight.prototype.GetPlayback = function(pt){
        var t = this._time_bgn;
        return [this._annotId, t];
    };
    Spotlight.prototype.GetRepresentativePts = function(){
        var pid = this._ptsOnPieces[0][1]; // pid
        var v = this._ptsOnPieces[0][0]; // vec
        if(pieces[pid].IsVisible()){
            v = pieces[pid].t_absPtLt.add(v, true);
            return v;
        }
        else{
            return null;
        }

    };

    ////////////////////////////////////////////////////////////////////////////////
    // StrokePen class
    ////////////////////////////////////////////////////////////////////////////////

    function StrokePen(js){
        this.trans = new Vec2(parseFloat(js['trans'][0]), parseFloat(js['trans'][1]));
        this.scale = new Vec2(parseFloat(js['scale'][0]), parseFloat(js['scale'][1]));
        this.size = new Vec2(parseFloat(js['v1'][0]), parseFloat(js['v1'][1]));
        this._annotId = js['annot_id'];
        this._username = js['username'];
        this._time_bgn = parseFloat(js['time_bgn'][2])/10000.0;
        this._time_end = parseFloat(js['time_end'][2])/10000.0;
        this._pts = [];
        for(var i = 0; i < js['pts'].length; ++i){
            this._pts.push(new Vec2(parseFloat(js['pts'][i][0]), parseFloat(js['pts'][i][1])));
        }
        this._pts_abs = null;
    }
    StrokePen.prototype.UpdateAbsoluteLayout = function(v_abs){
        this._pts_abs = [];
        for(var i = 0; i < this._pts.length; ++i){
            this._pts_abs.push(this._pts[i].add(v_abs, true));
        }
    };
    StrokePen.prototype.GetUsername = function(){
        return this._username;
    };
    StrokePen.prototype.GetPts = function(){
        return this._pts;
    };
    StrokePen.prototype.GetTimeBgnAndEnd = function(){
        return [this._time_bgn, this._time_end];
    };
    StrokePen.prototype.GetPlayback = function(pt){
        return [this._annotId, this._time_bgn];
    };

    StrokePen.prototype.DrDrawStrokeWrapper = function(){
        if(this._pts_abs.length < 2){return;}

        r2.canv_ctx.moveTo(this._pts_abs[0].x, this._pts_abs[0].y);
        for(i = 1; i < this._pts_abs.length; ++i){
            r2.canv_ctx.lineTo(this._pts_abs[i].x, this._pts_abs[i].y);
        }
    };
    StrokePen.prototype.GetRepresentativePts = function(cur_annot_id) {
        if(this._pts_abs.length == 0){
            return null;
        }
        else{
            return this._pts_abs[0];
        }
    };
    ////////////////////////////////////////////////////////////////////////////////
    // Annot class
    ////////////////////////////////////////////////////////////////////////////////

    function Annot(js){
        this._id = js['id'];
        this._record_bgn_time = r2.util.epoch1601to1970(parseFloat(js['record_bgn_time'][2])/10000.0);
        this._record_duration = parseFloat(js['record_duration'][2])/10000.0;
        this._audio_dbs = this.GetAudioDbs(js["audio_dbs"]);
        this._username = js["username"];
        this._js_proxy_waveforms = js["proxy_waveforms"];

        this._t_proxy_waveforms = [];
        for(var i = 0; i < js["proxy_waveforms"].length; ++i){
            this._t_proxy_waveforms.push(new ProxyWaveform(this._js_proxy_waveforms[i], this._id, i))
        }
    }
    r2Legacy.Annot = Annot;
    Annot.prototype.GetRecordBgnTime = function(){
        return this._record_bgn_time;
    };
    Annot.prototype.GetRecordDuration = function(){
        return this._record_duration;
    };
    Annot.prototype.GetAudioDbs = function(js){
        var rtn = js.slice(0);
        var max = Math.max.apply(null, rtn);
        var min = Math.min.apply(null, rtn);
        if(max - min > 0.1){
            for(var i = 0; i < rtn.length; ++i){
                rtn[i] = (rtn[i]-min)/(max-min);
            }
        }
        else{
            for(i = 0; i < rtn.length; ++i){
                rtn[i] = (rtn[i]-min);
            }
        }
        return rtn;
    };
    /**
     * @returns {number}
     */
    Annot.prototype.SampleAudioDbs = function(msec) {
        var idx = Math.max(0, Math.floor(msec*30.0/1000.0+0.5));
        if(idx < this._audio_dbs.length){
            return this._audio_dbs[idx];
        }
        else{
            return -1;
        }
    };
    Annot.prototype.GetAudioFileUrl = function(){
        return r2App.file_storage_url + r2.ctx["pdfid"] + "/" + this._id + ".wav"
    };


    ////////////////////////////////////////////////////////////////////////////////
    // ProxyWaveform class
    ////////////////////////////////////////////////////////////////////////////////

    function ProxyWaveform(js, _annot_id, i){
        var annot_id = _annot_id;
        var annot = null;
        var t_bgn = parseFloat(js['time_bgn'][2])/10000.0;
        var t_end = parseFloat(js['time_end'][2])/10000.0;
        var height = js['height'];
        var id = Sha1.hash(annot_id + " ProxyWaveform " + i);

        var dbs;
        var origin;
        var x_bgn;

        proxies[id] = this;

        this.GetAnnot = function(){
            if(annot==null){
                annot = annots[annot_id];
            }
            return annot;
        };
        this.GetAnnotId = function(){
            return annot_id;
        };
        this.GetTimeBgn = function(){
            return t_bgn;
        };
        this.GetTimeEnd = function(){
            return t_end;
        };
        this.GetId = function(){
            return id;
        };
    }


    ////////////////////////////////////////////////////////////////////////////////
    // TtPieceGroup class
    ////////////////////////////////////////////////////////////////////////////////
    function TtPieceGroup(_pidTeared) {
        this.pidTeared = _pidTeared;
        this.pidNoneTeared = [];
    }

}());

