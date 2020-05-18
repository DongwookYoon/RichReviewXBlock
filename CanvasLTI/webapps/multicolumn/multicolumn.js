/**
 * Created by yoon on 4/1/15.
 */

/** @namespace Pla */
(function(Pla){
    "use strict";

    /**
     * Creates a new Histogram
     * @class
     * @constructor
     */
    Pla.Histogram = function(){
        /**
         *  @member {Array} data - 'p' is the left-end point of a section, and 'wght' is the weight of that section.
         *                         histogram[i].wght is the weight for the segment [histogram[i].p, histogram[i+1].p]
         */
        this.data = [];

        /** @memeber {float} cut_threshold */
        this.cut_threshold = 0.0;

        /** @memeber {Object} thresholded_block */
        this.thresholded_block = [];
    };

    /**
     * Create a histogram by projecting rectangle's edge and accumulating it's height as weight.
     * Note that only one side (left or right, determined by 'use_left_side') is taken into account.
     *
     * @param rects - list of rectangels [ [l, t, r, b], [...], ... ]
     * @param window_size
     * @param use_left_side
     * @param window_size_Lpf
     * @returns {*[]}
     */
    Pla.Histogram.prototype.init = function(rects, window_size, use_left_side, window_size_Lpf){
        var idx_side = use_left_side ? 0 : 2;
        this.data = [{p:Number.NEGATIVE_INFINITY, wght:0.0}, {p:Number.POSITIVE_INFINITY, wght:0.0}];

        this.subslice(rects.map(function(r){return r[idx_side]-window_size*0.5}));
        this.subslice(rects.map(function(r){return r[idx_side]+window_size*0.5}));

        var histogram_from_rect_height = rects.map(function(r){
            return {seg:[r[idx_side]-window_size*0.5, r[idx_side]+window_size*0.5], wght:r[3]-r[1]};
        });

        var h;
        for(var i = 0; h = histogram_from_rect_height[i]; ++i) {
            for (var j = 0; j < this.data.length - 1; ++j) {
                if(Pla.rectUtil.testOverlapSegmentsIgnoreEdge([this.data[j].p, this.data[j+1].p], h.seg)){
                    this.data[j].wght += h.wght;
                }
            }
        }

        if(window_size_Lpf) // it's undefined when not running lpf
            this.lowPassFilter(window_size_Lpf);
    };

    /**
     * Subslices the given histogram with the cutting points. The shape of the histogram remains the same, but
     * only the domain is subdivided.
     * @param cut_pts
     */
    Pla.Histogram.prototype.subslice = function(cut_pts){
        for(var i = 0; i < cut_pts.length; ++i){
            for(var j = 0; j < this.data.length-1; ++j){
                if(this.data[j].p < cut_pts[i] && cut_pts[i] < this.data[j+1].p){
                    this.data.splice(j+1, 0, {p:cut_pts[i], wght:this.data[j].wght});
                }
            }
        }
    };

    /**
     * Low pass filters the existing histogram by averaging the weights within a window.
     * @param window_size_Lpf
     */
    Pla.Histogram.prototype.lowPassFilter = function(window_size_Lpf){
        var n_cuts = Math.ceil((this.data[this.data.length-2].p-this.data[1].p)/window_size_Lpf)+1;
        var origin_left = this.data[1].p;
        var cut_pts = $.map($(new Array(n_cuts)),function(val, i) { return origin_left+window_size_Lpf*i; });
        this.subslice(cut_pts);

        var new_histogram = $.map($(new Array(n_cuts)),function(val, i) { return {p:origin_left+window_size_Lpf*i, wght:0}; });

        var j = 1;
        for(var i = 0; i < new_histogram.length-1; ++i){
            while(this.data[j].p < new_histogram[i+1].p){
                new_histogram[i].wght += this.data[j].wght*(this.data[j+1].p-this.data[j].p);
                ++j;
            }
            new_histogram[i].wght /= window_size_Lpf;
        }

        this.data.splice(0, this.data.length); // clear all
        this.data.push({p:Number.NEGATIVE_INFINITY, wght:0.0});
        for(var k = 0; k < new_histogram.length; ++k){
            this.data.push(new_histogram[k]);
        }
        this.data.push({p:Number.POSITIVE_INFINITY, wght:0.0});
    };

    Pla.Histogram.prototype.getThreshold = function(scale){
        var sum = 0.0;
        for(var i = 1; i < this.data.length-2; ++i){
            sum += this.data[i].wght*(this.data[i+1].p-this.data[i].p);
        }
        this.cut_threshold = scale*sum/(this.data[this.data.length-2].p-this.data[1].p);
    };

    Pla.Histogram.prototype.runThresholding = function(){
        var blocks = [];
        var new_blk = {range: [0.0, 0.0], wght:0.0};
        for(var i = 0; i < this.data.length-1; ++i){
            if(this.data[i].wght < this.cut_threshold && this.data[i+1].wght >= this.cut_threshold){ // where new block bgns
                new_blk = {range:[this.data[i+1].p, 0,0], wght: this.data[i+1].wght};
            }
            else if(this.data[i].wght >= this.cut_threshold && this.data[i+1].wght >= this.cut_threshold){ // extending the block
                new_blk.wght = Math.max(new_blk.wght, this.data[i+1].wght);
            }
            else if(this.data[i].wght >= this.cut_threshold && this.data[i+1].wght < this.cut_threshold){ // ends up the block
                new_blk.range[1] = this.data[i+1].p;
                blocks.push(new_blk);
            }
        }
        this.thresholded_block = blocks;
    };


    /**
     * Calculates a double column layout from the given XY-Cut result.
     */
    Pla.multiColumn = (function(){
        var pub = {};

        // index of the double column page layout components
        var HEAD = 0;
        var LEFT = 1;
        var RGHT = 2;
        var FOOT = 3;

        pub.runHistogramAnalysis = function(block_group, alley_range){
            for(var idx_block = 0; idx_block < block_group.length; ++idx_block){
                var group = block_group[idx_block];
                initHistograms(group);

                // skip if the group's height is shorter than the height criterion.
                if(group.bbox[3]-group.bbox[1] < Pla.Param.TWOCOLUMN_MIN_H){
                    continue;
                }

                // getting the widest cut amongst all the cuts in the 'alley range'.
                var cuts = Pla.rectUtil.projectOnXaxisAndGetCuts(group.rects);
                var widest_cut = {
                    w: 0,
                    idx: -1,
                    mid: 0
                };
                widest_cut.mid = 0;
                for(var idx_cut = 1; idx_cut < cuts.length-1; ++idx_cut){
                    var cut = cuts[idx_cut];
                    if(alley_range[0] < cut[0] && cut[1] < alley_range[1]){
                        if(widest_cut.w < cut[1]-cut[0]){
                            widest_cut.w = cut[1]-cut[0];
                            widest_cut.idx = idx_cut;
                            widest_cut.mid = 0.5*(cuts[widest_cut.idx][0]+cuts[widest_cut.idx][1]);
                        }
                    }
                }

                // Perform histogram analysis when the following three conditions met:
                if(widest_cut.w > Pla.Param.MIN_ALLEY_W &&                           // (1) alley is wide enough
                    widest_cut.mid - group.bbox[0] > Pla.Param.NARROW_COLUMN_W &&    // (2) the left column is wide enough
                    group.bbox[2] - widest_cut.mid > Pla.Param.NARROW_COLUMN_W       // (3) the rght column is wide enough
                ){
                    group.alley = cuts[widest_cut.idx];

                    var use_left_side, window_size_Lpf; // named parameters
                    group.histogram_left.init(
                        group.rects, Pla.Param.EDGE_SPLATTER_HIST_L_WINDOW, use_left_side = true
                    );
                    group.histogram_left.getThreshold(Pla.Param.EDGE_SPLATTER_HIST_L_CUTOFF_RATIO);
                    group.histogram_left.runThresholding();

                    group.histogram_rght.init(
                        group.rects, Pla.Param.EDGE_SPLATTER_HIST_R_WINDOW, use_left_side = false, window_size_Lpf = Pla.Param.EDGE_SPLATTER_HIST_R_LPF_W
                    );
                    group.histogram_rght.getThreshold(Pla.Param.EDGE_SPLATTER_HIST_R_CUTOFF_RATIO);
                    group.histogram_rght.runThresholding();

                    // get the highst peak of the histogram
                    group.histogram_max_wght = Math.max(
                        group.histogram_left.thresholded_block.reduce(function(prev, cur){return Math.max(prev,cur.wght);}, 0),
                        group.histogram_rght.thresholded_block.reduce(function(prev, cur){return Math.max(prev,cur.wght);}, 0)
                    );

                    // cutoff by threshold. Remember that the histogram weight is the sum of the rectangles' heights by definition.
                    if(group.histogram_max_wght < Pla.Param.TWOCOLUMN_MIN_H){
                        initHistograms(group);
                    }
                }
            }

            // among multiple groups, find the one with the maximum weight (in other words, the maximum height)
            // 'idx_group_max_wght' being -1 indicates the single column page
            var max_wght_group = {
                idx: -1,
                alley: null
            };

            max_wght_group.idx = block_group.reduce(
                function(prev_idx, cur_block_group, cur_idx){
                    if(prev_idx >= 0){
                        if(block_group[prev_idx].histogram_max_wght > cur_block_group.histogram_max_wght){
                            return prev_idx;
                        }
                        else{
                            return cur_idx;
                        }
                    }
                    else{
                        if(cur_block_group.histogram_max_wght > 0) {
                            return cur_idx;
                        }
                        else{
                            return -1;
                        }
                    }
                },
                -1
            );
            if (max_wght_group.idx != -1){
                max_wght_group.alley = block_group[max_wght_group.idx].alley;
            }
            return max_wght_group;
        };

        function initHistograms(block_group){
            block_group.histogram_left = new Pla.Histogram();
            block_group.histogram_rght = new Pla.Histogram();
            block_group.histogram_max_wght = 0;
        }

        pub.categorizeTextBoxesIntoRegions = function(block_group, max_wght_group){

            // assigning
            var rects = [[],[],[],[]];

            // fill rects from the foot
            var idx_rect;
            for(var i = block_group.length-1; i > max_wght_group.idx; --i){
                for( idx_rect = 0; idx_rect < block_group[i].rects.length; ++idx_rect){
                    rects[FOOT].push(block_group[i].rects[idx_rect]);
                }
            }
            if(max_wght_group.idx > -1){ // now i === idx_group_max_wght;
                var nj;
                for(idx_rect = 0, nj = block_group[max_wght_group.idx].rects.length; idx_rect < nj; ++idx_rect){
                    if(block_group[max_wght_group.idx].rects[idx_rect][0] < max_wght_group.alley[1]){
                        rects[LEFT].push(block_group[max_wght_group.idx].rects[idx_rect]);
                    }
                    else{
                        rects[RGHT].push(block_group[max_wght_group.idx].rects[idx_rect]);
                    }
                }
                --i;
                for(; i >= 0; --i){
                    for(idx_rect = 0; idx_rect < block_group[i].rects.length; ++idx_rect){
                        rects[HEAD].push(block_group[i].rects[idx_rect]);
                    }
                }
            }
            else{ // if it's single column, put everything in the head.
                rects[HEAD] = rects[FOOT];
                rects[FOOT] = [];
            }
            return rects;
        };

        pub.sliceRegionsIntoTextTearingPieces = function(textboxes_by_region, doc_bbox, alley){
            // formatting
            var cut_pts_y = [[],[],[],[]];
            var range_x = [[0, 0],[0, 0],[0, 0],[0, 0]];

            for(var i_rgn = 0; i_rgn < 4; ++i_rgn){
                for(var idx_rect = 0; idx_rect < textboxes_by_region[i_rgn].length; ++idx_rect){
                    cut_pts_y[i_rgn].push(textboxes_by_region[i_rgn][idx_rect][3]);
                }
            }

            // doc_bbox is a bounding box of the document [0, 0, doc_width, doc_height]
            var range_y;
            var alley_x;
            if(textboxes_by_region[LEFT].length == 0 && textboxes_by_region[RGHT].length == 0) { // no double columns, only header
                range_y = [doc_bbox[3], doc_bbox[3]];
                alley_x = 0.5*(doc_bbox[0]+doc_bbox[2]);
            }
            else{
                var left_bbox = Pla.rectUtil.getRectsBBox(textboxes_by_region[LEFT]);
                var rght_bbox = Pla.rectUtil.getRectsBBox(textboxes_by_region[RGHT]);
                range_y = [Math.min(left_bbox[1], rght_bbox[1]), Math.max(left_bbox[3], rght_bbox[3])]; // the double column's range
                alley_x = 0.5*(alley[0]+alley[1]);
            }

            cut_pts_y[HEAD].push(doc_bbox[1]);
            cut_pts_y[HEAD].push(range_y[0]);
            range_x[HEAD][0] = doc_bbox[0];
            range_x[HEAD][1] = doc_bbox[2];

            cut_pts_y[LEFT].push(range_y[0]);
            cut_pts_y[LEFT].push(range_y[1]);
            range_x[LEFT][0] = doc_bbox[0];
            range_x[LEFT][1] = alley_x;

            cut_pts_y[RGHT].push(range_y[0]);
            cut_pts_y[RGHT].push(range_y[1]);
            range_x[RGHT][0] = alley_x;
            range_x[RGHT][1] = doc_bbox[2];

            cut_pts_y[FOOT].push(range_y[1]);
            cut_pts_y[FOOT].push(doc_bbox[3]);
            range_x[FOOT][0] = doc_bbox[0];
            range_x[FOOT][1] = doc_bbox[2];

            var idx_rgn;
            for(idx_rgn = 0; idx_rgn < 4; ++idx_rgn){
                cut_pts_y[idx_rgn] = cut_pts_y[idx_rgn].sort(
                    function(a,b){
                        if(a < b){return -1;}
                        else if(a > b){return 1;}
                        else{return 0;}
                    });
                Pla.rectUtil.mergeOverlappingPts(cut_pts_y[idx_rgn], Pla.Param.MULTICOLUMN_MERGE_Y);

                if(cut_pts_y[idx_rgn].length == 1)
                    cut_pts_y[idx_rgn].push(Pla.rectUtil.copyRect(cut_pts_y[idx_rgn][0]));
            }

            // ttX is text range, ttW is the width of the text region, and rect are actual text boxes.
            var doublecolumn_text_boxes = [{},{},{},{}];
            for(idx_rgn = 0; idx_rgn < 4; ++idx_rgn){
                var rgn_bbox = Pla.rectUtil.getRectsBBox(textboxes_by_region[idx_rgn]);
                doublecolumn_text_boxes[idx_rgn].ttX = rgn_bbox[0];
                doublecolumn_text_boxes[idx_rgn].ttW = rgn_bbox[2]-rgn_bbox[0];
                doublecolumn_text_boxes[idx_rgn].rects = [];
                for(var j = 0; j < cut_pts_y[idx_rgn].length-1; ++j){
                    doublecolumn_text_boxes[idx_rgn].rects.push([
                        range_x[idx_rgn][0], cut_pts_y[idx_rgn][j], range_x[idx_rgn][1], cut_pts_y[idx_rgn][j+1]
                    ]);
                }
            }
            return doublecolumn_text_boxes;
        };

        return pub;
    })();

    /**
     * Implementation of recursive XY-Cut algorithm
     * See "Optimized XY-Cut for Determining a Page Reading Order (Meunier, 1995)"
     */
    Pla.xyCut = (function(){
        var pub = {};

        var NOSHARE = -1;

        pub.run = function(rects, alley_range){
            var i, j;
            var verbose = false;

            // Project rects on Y axis. When the shadow--line segment--of the projection overlaps, combine them into a block.
            var ycut_blocks = Pla.rectUtil.getRectBlocksFromProjectedCuts(rects);
            if(ycut_blocks.length == 0){return getEmptyPageCtx();}

            // X-cuts for each y-cut blocks.
            var xcuts = [];
            for( i = 0; i < ycut_blocks.length; ++i){
                xcuts.push(Pla.rectUtil.projectOnXaxisAndGetCuts(rects = ycut_blocks[i].rects, alley_range));
            }

            // BC(i, X) -> memoization[i][pX], pX points to xcut_seqs. See the paper for the detail.
            var memoization = [];
            for(i = 0; i < ycut_blocks.length; ++i){
                memoization.push({});
            }

            var xcut_seqs = {}; // xcut_seqs["2,0,3,0,4,0"] = [{seq:[[2,0],[3,0],[4,0]], xcut: [-infinity, 132.0]}]

            var bbox_height = Pla.rectUtil.getRectsBBoxHeight(rects);

            // BC internal functions
            var BC_CascadeXCut = function(seq){
                if(!xcut_seqs.hasOwnProperty(seq)){
                    var v;
                    v = {};
                    v.seq = seq;
                    if(seq.length==1){
                        v.xcut = xcuts[seq[0][0]][seq[0][1]];
                    }
                    else{
                        v.xcut = Pla.rectUtil.intersectSegment(
                            xcuts[seq[seq.length-1][0]][seq[seq.length-1][1]], BC_CascadeXCut(seq.slice(0, seq.length-1))
                        );
                    }
                    xcut_seqs[seq] = v;
                }
                return xcut_seqs[seq].xcut;
            };

            var BC_Overlap_seg_list = function(seg, list){
                var l = [];
                for(var i = 0; i < list.length; ++i){
                    if(Pla.rectUtil.testOverlapSegments(seg, list[i])){
                        l.push(i);
                    }
                }
                return l;
            };

            var BC_LargestOverlap_seg_list = function(seq, list){
                var l = [];
                for(var i = 0; i < list.length; ++i){
                    l.push(Pla.rectUtil.intersectSegment(seq, list[i]));
                }
                l.sort(function(a,b){
                    var da = a[1]-a[0];
                    var db = b[1]-b[0];
                    if(da < db){return 1;}
                    else if(da > db){return -1;}
                    else{return 0;}
                });
                return l[0];
            };

            /**
             * @returns {number}
             */
            var BC_Height = function(i){
                return ycut_blocks[i].bbox[3]-ycut_blocks[i].bbox[1];
            };

            /**
             * @returns {number}
             */
            var BC_Dist = function(ia, ib){
                return ycut_blocks[ib].bbox[1] - ycut_blocks[ia].bbox[3];
            };

            /**
             * @returns {number} - score (to maximize)
             */
            var BC = function(i, pX){
                if(i >= ycut_blocks.length){return 0;}
                if(memoization[i].hasOwnProperty(pX)){return memoization[i][pX];}

                var Xi = xcuts[i];
                var score;
                if(pX == NOSHARE){
                    score = BC(i+1, NOSHARE);
                    for(var j = 0; j < Xi.length; ++j){
                        var s = BC(i+1, [[i, j]]);
                        if(s > 0){
                            s += BC_Height(i);
                        }
                        score = Math.max(score, s);
                    }
                }
                else{
                    var cascade_xcut = BC_CascadeXCut(pX);
                    var overlap_list = BC_Overlap_seg_list(cascade_xcut, Xi);
                    if(cascade_xcut[0] > cascade_xcut[1] ||
                        overlap_list.length == 0){
                        score = 0;
                    }
                    else{
                        var largest_seg = BC_LargestOverlap_seg_list(cascade_xcut, Xi);
                        if(largest_seg[1] < largest_seg[0] + Pla.Param.MIN_ALLEY_W){
                            score = 0;
                        }
                        else{
                            score = BC(i+1, NOSHARE);
                            for( j = 0; j < overlap_list.length; ++j) {
                                score = Math.max(score, BC(i+1, pX.concat([[i, overlap_list[j]]])));
                            }
                            score += bbox_height-BC_Dist(i-1, i) + BC_Height(i); // share_score
                        }
                    }
                }
                memoization[i][pX] = score;
                return score;
            };

            // run xy-cut
            BC(0, NOSHARE);

            if(verbose){
                console.log("=====XYCut.memoization.bgn=====");
                for (var bKey in memoization) {
                    if (memoization.hasOwnProperty(bKey)) {
                        console.log("Block:", bKey);
                        var pKeys = Object.keys(memoization[bKey]);
                        for ( i = 0; i < pKeys.length; ++i) {
                            if (memoization[bKey].hasOwnProperty(pKeys[i])) {
                                console.log("    ", memoization[bKey][pKeys[i]].toFixed(2), "    ", pKeys[i] == -1 ? "NOSHARE" : JSON.stringify(xcut_seqs[pKeys[i]].seq), pKeys[i] == -1 ? " " : JSON.stringify(xcut_seqs[pKeys[i]].xcut));
                            }
                        }
                    }
                }
            }

            // optimal sequence
            var group_seqs = getOptimalGroupSeqs(memoization, xcut_seqs);
            if(verbose){
                console.log("=====XYCut.group_seqs.bgn=====");
                console.log(JSON.stringify(group_seqs));
            }

            var block_group = [];
            var group_seq;
            for( i = 0; group_seq = group_seqs[i]; ++i){
                var grp = {};
                grp.seq = group_seq;
                grp.rects = [];
                for( j = 0; j < group_seq.length; ++j){
                    var rect;
                    for(var k = 0; rect = ycut_blocks[group_seq[j]].rects[k]; ++k){
                        grp.rects.push(rect);
                    }
                }
                grp.bbox = Pla.rectUtil.getRectsBBox(grp.rects);
                block_group.push(grp);
            }

            var ctx  = {};
            ctx.xcuts = xcuts;
            ctx.ycut_blocks = ycut_blocks;
            ctx.block_group = block_group;

            return ctx;
        };

        /**
         * calcuating optimal sequence
         * @param memoization
         * @param xcut_seqs
         * @returns {Array}
         */
        var getOptimalGroupSeqs = function(memoization, xcut_seqs){
            var verbose = false;
            var i, j, seq;
            /**
             * @returns {boolean}
             */
            function Contains_NOSHARE(l){
                var item;
                for(var i = 0; item = l[i]; ++i){
                    if(item==NOSHARE){
                        return true;
                    }
                }
                return false;
            }

            /**
             * @returns {boolean}
             */
            function Contains_MatchingSeq(seq, prev_seq_l){
                var prev_seq;
                for(var i = 0; prev_seq = prev_seq_l[i]; ++i){
                    if( prev_seq != NOSHARE && prev_seq.equals(seq.slice(0, seq.length-1)) )
                        return true;
                }
                return false;

            }

            var opt_seq = [];
            for ( i = 0; i < memoization.length; ++i){
                opt_seq.push([]);
            }
            opt_seq[0].push(NOSHARE);
            for ( i = 1; i < memoization.length; ++i){
                var possible_seq = [];
                var seq_keys = Object.keys(memoization[i]);
                var seq_key;
                for ( j = 0; seq_key = seq_keys[j]; ++j){
                    if(seq_key == NOSHARE){
                        possible_seq.push(NOSHARE);
                    }
                    else{
                        seq = xcut_seqs[seq_key].seq;
                        if(seq.length == 1){
                            if(Contains_NOSHARE(opt_seq[i-1]))
                                possible_seq.push(seq);
                        }
                        else{
                            if(Contains_MatchingSeq(seq, opt_seq[i-1]))
                                possible_seq.push(seq);
                        }
                    }

                }
                var highscore = 0;
                for( j = 0; seq = possible_seq[j]; ++j){
                    highscore = Math.max(highscore, memoization[i][seq]);
                }

                if(highscore == 0){
                    opt_seq[i].push(NOSHARE);
                }
                else{
                    for( j = 0; seq = possible_seq[j]; ++j){
                        if(memoization[i][seq] == highscore){
                            opt_seq[i].push(seq);
                        }
                    }
                }
            }

            if(verbose){
                console.log("=====XYCut.optimal_path.bgn=====");
                for ( i = 0; i < memoization.length; ++i) {
                    console.log("Block:", i);
                    for ( j = 0; seq = opt_seq[i][j]; ++j) {
                        console.log("    ", JSON.stringify(seq));
                    }
                }
            }


            var group_seqs = [];
            for ( i = 0; i < memoization.length; ++i) {
                if(Contains_NOSHARE(opt_seq[i])){
                    group_seqs.push([i]);
                    seq = [];
                }
                else{
                    for( j = 0; j < opt_seq[i].length; ++j){
                        if(seq.equals(opt_seq[i][j].slice(0, opt_seq[i][j].length-1))){
                            group_seqs[group_seqs.length-1].push(i);
                            seq = opt_seq[i][j];
                            break;
                        }
                    }
                }
            }
            return group_seqs;
        };

        var getEmptyPageCtx = function(){
            var ctx  = {};
            ctx.xcuts = [];
            ctx.ycut_blocks = [];
            ctx.block_group = [];
            return ctx;
        };


        return pub;
    })();

    /**
     * Utilities that sorts and merges rectanges and segments.
     * A rectagle is a list of four floats like [0, 0, 100, 100] (in the order of 'left-top-right-bottom').
     * A segment is a list of two floats like [0, 100]. It can represents a projection of a rectangle or a line segment.
     */
    Pla.rectUtil = (function(){
        var pub = {};

        /**
         * Usage: rects.sort(Pla.rectUtil.rectSortCriteria)
         * @param a
         * @param b
         * @returns {number}
         */
        pub.rectSortCriteria = function(a,b){
            if(a[1] > b[1]){return 1;}
            else if(a[1] < b[1]){return -1;}
            else{
                if(a[0] > b[0]){return 1;}
                else if(a[0] < b[0]){return -1;}
                else{return 0;}
            }
        };

        /**
         * Usage: segments.sort(Pla.rectUtil.segmentSortCriteria)
         * @param a
         * @param b
         * @returns {number}
         */
        pub.segmentSortCriteria = function(a,b){
            if(a[0] > b[0]){return 1;}
            else if(a[0] < b[0]){return -1;}
            else{
                if(a[1] > b[1]){return 1;}
                else if(a[1] < b[1]){return -1;}
                else{return 0;}
            }
        };

        /**
         * Tests if the given two segments overlap.
         * Usage:   testOverlapSegments([0, 2], [1, 3]) === True
         *          testOverlapSegments([0, 2], [4, 6]) === False
         *          testOverlapSegments([0, 2], [2, 4]) === True (** Note that overlapping edge counts.)
         * @param a
         * @param b
         * @returns {boolean}
         */
        pub.testOverlapSegments = function(a, b){
            return !(a[0] > b[1] || b[0] > a[1]);
        };

        /**
         * Tests if the given two segments overlaps. But overlapping edge doesn't count.
         * Usage: testOverlapSegmentsIgnoreEdge([0, 1], [1, 2]) === False
         * @param a
         * @param b
         * @returns {boolean}
         */
        pub.testOverlapSegmentsIgnoreEdge = function(a, b){
            return !(a[0] >= b[1] || b[0] >= a[1]);
        };

        /**
         * Tests if the given two rectanges overlaps
         * @param ra
         * @param rb
         * @returns {boolean}
         */
        pub.testOverlapRects = function(ra, rb){
            return pub.testOverlapSegments([ra[0], ra[2]], [rb[0], rb[2]]) &&
                pub.testOverlapSegments([ra[1], ra[3]], [rb[1], rb[3]]);
        };

        /**
         * Returns the list of rectangles in 'rects' that overlaps with 'rect'.
         * @param rect - A rectangle
         * @param rects - An array of rectangles
         * @returns {Array}
         */
        pub.getOverlappingRects = function(rect, rects){
            var ovrlp = [];
            for(var i = 0; i < rects.length; ++i){
                if(pub.testOverlapRects(rect, rects[i])){
                    ovrlp.push(rects[i]);
                }
            }
            return ovrlp;
        };

        /**
         * Get intersection of two segments
         * @param a
         * @param b
         * @returns {*[]}
         */
        pub.intersectSegment = function(a, b){
            return [Math.max(a[0], b[0]), Math.min(a[1], b[1])];
        };

        /**
         * Returns bounding box of a list of rectangles
         * @param rects
         * @returns {*[]}
         */
        pub.getRectsBBox = function(rects){
            var bbox = [Number.POSITIVE_INFINITY,Number.POSITIVE_INFINITY,Number.NEGATIVE_INFINITY,Number.NEGATIVE_INFINITY];
            var rect;
            for(var i = 0; rect = rects[i]; ++i){
                bbox[0] = Math.min(bbox[0], rect[0]);
                bbox[1] = Math.min(bbox[1], rect[1]);
                bbox[2] = Math.max(bbox[2], rect[2]);
                bbox[3] = Math.max(bbox[3], rect[3]);
            }
            return bbox;
        };

        /**
         * Get Height of the given rectangles' bounding box
         * @param rects
         * @returns {number}
         */
        pub.getRectsBBoxHeight = function(rects){
            var bbox = Pla.rectUtil.getRectsBBox(rects);
            return bbox[3]-bbox[1];
        };

        /**
         * Returns potential x range of the alley. Here, the alley means the horizontal gap within the double column.
         * @param rects
         * @returns {*[]}
         */
        pub.getAlleyRange = function(rects){
            var x_com = getRectsCenterOfMass(rects)[0];
            var alley_range_width = Pla.Param.PAGE_W - 2.0*Pla.Param.NARROW_COLUMN_W;
            return [x_com - alley_range_width*0.5, x_com + alley_range_width*0.5];
        };

        /**
         * Get center of mass of a set of rectangles
         * @param rects
         * @returns {*}
         */
        var getRectsCenterOfMass = function(rects){
            var accum = [0, 0];
            var wsum = 0;
            var rect;
            for(var i = 0; rect = rects[i]; ++i){
                var w = (rect[3]-rect[1])*(rect[2]-rect[0]);
                accum[0] += (rect[0]+rect[2])*0.5*w;
                accum[1] += (rect[1]+rect[3])*0.5*w;
                wsum += w;
            }
            if(wsum == 0){return [0,0];}
            else{return [accum[0]/wsum,accum[1]/wsum];}
        };

        /**
         * Get cuts of the given segments. Cuts are simple inverts of the merged segments.
         *      Usage: pub.getCutsOfSegments([ [0, 1], [10, 52], [49,100] ]) ===
         *                          [ [Number.NEGATIVE_INFINITY,0], [1,10] [100,Number.POSITIVE_INFINITY] ]
         * @param segments
         * @param x_range
         * @returns {*}
         */
        pub.getCutsOfSegments = function(segments, x_range){
            if(segments.length == 0){return [[Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY]];}
            var merged_segments = mergeOverlappingSegments(segments);

            var cuts = [];
            cuts.push([Number.NEGATIVE_INFINITY, merged_segments[0][0]]);
            for(var i = 0; i < merged_segments.length-1; ++i){
                cuts.push([merged_segments[i][1], merged_segments[i+1][0]]);
            }
            cuts.push([merged_segments[merged_segments.length-1][1], Number.POSITIVE_INFINITY]);

            // when range is given, clips the segments within the range, or remove it when it's out of the range
            if(x_range){
                for(i = 0; i < cuts.length; ++i){
                    if(Pla.rectUtil.testOverlapSegments(x_range, cuts[i])){
                        cuts[i] = Pla.rectUtil.intersectSegment(x_range, cuts[i]);
                    }
                    else{
                        cuts.splice(i--, 1);
                    }
                }
            }
            return cuts;
        };

        /**
         * Returns a list of merge segments
         * @param segments
         * @returns {Array}
         */
        var mergeOverlappingSegments = function(segments){
            var merged = [];
            var segment;
            var last = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
            for(var i = 0; segment = segments[i]; ++i) {
                if(Pla.rectUtil.testOverlapSegments(segment, last)){
                    merged.splice(merged.length-1,1);
                    last = mergeSegmentsToSingle([segment, last])
                }
                else{
                    last = [segment[0], segment[1]];
                }
                merged.push(last);
            }
            return merged;
        };

        /**
         * Simply takes a min-max and get range of segments
         * @param segments
         * @returns {*[]}
         */
        var mergeSegmentsToSingle = function(segments){
            var rtn = [Number.POSITIVE_INFINITY,Number.NEGATIVE_INFINITY];
            segments.forEach(function(block){
                rtn[0] = Math.min(rtn[0], block[0]);
                rtn[1] = Math.max(rtn[1], block[1]);
            });
            return rtn;
        };

        /**
         * Merges points within the tolerance distance
         * @param pts
         * @param tolerance
         */
        pub.mergeOverlappingPts = function(pts, tolerance){
            // assert that l was sorted
            for(var i = 0; i < pts.length-1; ++i){
                if(pts[i+1] - pts[i] < tolerance){
                    pts.splice(i, 2, 0.5*(pts[i]+pts[i+1]));
                    --i;
                }
            }
        };

        pub.copyRect = function(r){
            return [r[0],r[1],r[2],r[3]];
        };

        /**
         * This function gets the projected cuts of the given rectangles. To specify:
         *      (1) it first project Rects into a 2D (x or y axis specified by cut_y), and get line segments
         *      (2) and calling 'getCutsOfSegments' merges the segments and inverses it to get 'cuts'.
         * @param rects
         * @param range
         * @param cut_y
         * @returns {*}
         */
        var projectAndCutRects = function(rects, range, cut_y){
            var i = 0;
            var j = 2;
            if(cut_y){
                i = 1; j = 3;
            }
            var segments = [];
            rects.forEach(function(rect){
                segments.push([rect[i], rect[j]]);
            });
            segments.sort(Pla.rectUtil.segmentSortCriteria);
            return Pla.rectUtil.getCutsOfSegments(segments, range);
        };

        pub.projectOnXaxisAndGetCuts = function(rects, range){
            var cut_y = false;
            return projectAndCutRects(rects, range, cut_y);
        };

        pub.projectOnYaxisAndGetCuts = function(rects, range){
            var cut_y = true;
            return projectAndCutRects(rects, range, cut_y);
        };

        /**
         *
         * @param rects
         * @returns {Array}
         */
        pub.getRectBlocksFromProjectedCuts = function(rects){
            var i, j;
            var blocks = [];
            var ycuts = pub.projectOnYaxisAndGetCuts(rects);

            var visited_rect = new Array(rects.length);
            for(j = 0; j < rects.length; ++j){visited_rect[j] = false;}
            for(i = 0; i < ycuts.length-1; ++i){
                var cut_range = [ycuts[i][1], ycuts[i+1][0]];
                var block = {};
                block.rects = [];

                for(j = 0; j < rects.length; ++j){
                    if( (!visited_rect[j]) &&
                        (cut_range[0] <= rects[j][1] && rects[j][3] <= cut_range[1])){
                        block.rects.push(rects[j]);
                        visited_rect[j] = true;
                    }
                }

                block.rects.sort(Pla.rectUtil.rectSortCriteria);
                block.bbox = Pla.rectUtil.getRectsBBox(block.rects);
                blocks.push(block);
            }

            return blocks;
        };

        return pub;
    })();

}(window.Pla = window.Pla || {}));

