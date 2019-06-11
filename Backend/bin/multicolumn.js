const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const dom = new JSDOM(`<!DOCTYPE html>`);
this.window = dom.window;
this.document = dom.window.document;
this.PAGE_W = 500.0;
this.NARROW_COLUMN_W = 150;
this.PAGENUM_DETECTION_RANGE_Y = 80;
exports.MIN_ALLEY_W = 9;
exports.TWOCOLUMN_MIN_H = 50;
exports.EDGE_SPLATTER_HIST_L_WINDOW = 9; // === MIN_ALLEY_W
exports.EDGE_SPLATTER_HIST_R_WINDOW = 9 * 3.0;  // === MIN_ALLEY_W*3.0
exports.EDGE_SPLATTER_HIST_R_LPF_W = 10;
exports.EDGE_SPLATTER_HIST_L_CUTOFF_RATIO = 4.0;
exports.EDGE_SPLATTER_HIST_R_CUTOFF_RATIO = 1.5;
exports.MULTICOLUMN_MERGE_Y = 3;

const HEAD = 0;
const LEFT = 1;
const RIGHT = 2;
const FOOT = 3;


exports.get_output_scale = function(ctx) {
    let devicePixelRatio = this.window.devicePixelRatio || 1;
    let backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
        ctx.mozBackingStorePixelRatio ||
        ctx.msBackingStorePixelRatio ||
        ctx.oBackingStorePixelRatio ||
        ctx.backingStorePixelRatio || 1;
    let pixelRatio = devicePixelRatio / backingStoreRatio;
    return {
        sx: pixelRatio,
        sy: pixelRatio,
        scaled: pixelRatio !== 1
    };
};



exports.get_rects = function (mupla) {
    let rects = [];
    for(let i = 0; i < mupla.tblocks.length; ++i){
        let lines = mupla.tblocks[i].lines;
        for(let j = 0; j < lines.length; ++j){
            rects.push(lines[j].bbox);
        }
    }
    return rects;
};



exports.get_rects_bbox = function(rects) {
    let bbox = [Number.POSITIVE_INFINITY,Number.POSITIVE_INFINITY,Number.NEGATIVE_INFINITY,Number.NEGATIVE_INFINITY];
    let rect;
    for(let i = 0; rect = rects[i]; ++i){
        bbox[0] = Math.min(bbox[0], rect[0]);
        bbox[1] = Math.min(bbox[1], rect[1]);
        bbox[2] = Math.max(bbox[2], rect[2]);
        bbox[3] = Math.max(bbox[3], rect[3]);
    }
    return bbox;
};



exports.get_rects_bbox_height = function(rects){
    let bbox = this.get_rects_bbox(rects);
    return bbox[3]-bbox[1];
};



exports.test_overlap_segments = function (a, b) {
    return !(a[0] > b[1] || b[0] > a[1]);
};



exports.test_overlap_rects = function (ra, rb) {
    return this.test_overlap_segments([ra[0], ra[2]], [rb[0], rb[2]]) &&
        this.test_overlap_segments([ra[1], ra[3]], [rb[1], rb[3]]);
};



exports.get_overlapping_rects = function(rect, rects) {
    let overlap = [];
    for(let i = 0; i < rects.length; ++i){
        if(this.test_overlap_rects(rect, rects[i])){
            overlap.push(rects[i]);
        }
    }
    return overlap;
};



exports.get_alley_range = function (rects) {
    let x_com = this.get_rects_center_of_mass(rects)[0];
    let alley_range_width = this.PAGE_W - 2.0 * this.NARROW_COLUMN_W;
    return [x_com - alley_range_width*0.5, x_com + alley_range_width * 0.5];
};


exports.get_rects_center_of_mass = function (rects) {
    let accum = [0, 0];
    let wsum = 0;
    let rect;
    for(let i = 0; rect = rects[i]; ++i){
        let w = (rect[3]-rect[1])*(rect[2]-rect[0]);
        accum[0] += (rect[0]+rect[2])*0.5*w;
        accum[1] += (rect[1]+rect[3])*0.5*w;
        wsum += w;
    }
    if(wsum === 0){return [0,0];}
    else{return [accum[0]/wsum,accum[1]/wsum];}
};



exports.intersect_segment = function(a, b){
    return [Math.max(a[0], b[0]), Math.min(a[1], b[1])];
};



exports.segment_sort_criteria = function(a,b){
    if(a[0] > b[0]){return 1;}
    else if(a[0] < b[0]){return -1;}
    else{
        if(a[1] > b[1]){return 1;}
        else if(a[1] < b[1]){return -1;}
        else{return 0;}
    }
};


exports.rect_sort_criteria = function(a, b){
    if(a[1] > b[1]){return 1;}
    else if(a[1] < b[1]){return -1;}
    else{
        if(a[0] > b[0]){return 1;}
        else if(a[0] < b[0]){return -1;}
        else{return 0;}
    }
};



exports.merge_segments_to_single = function(segments){
    let rtn = [Number.POSITIVE_INFINITY,Number.NEGATIVE_INFINITY];
    segments.forEach(function(block){
        rtn[0] = Math.min(rtn[0], block[0]);
        rtn[1] = Math.max(rtn[1], block[1]);
    });
    return rtn;
};



exports.merge_overlapping_segments = function(segments){
    let merged = [];
    let segment;
    let last = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
    for(let i = 0; segment = segments[i]; ++i) {
        if(this.test_overlap_segments(segment, last)){
            merged.splice(merged.length-1,1);
            last = this.merge_segments_to_single([segment, last])
        }
        else{
            last = [segment[0], segment[1]];
        }
        merged.push(last);
    }
    return merged;
};



exports.get_cuts_of_segments = function(segments, x_range){
    if(segments.length === 0){return [[Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY]];}
    let merged_segments = this.merge_overlapping_segments(segments);

    let cuts = [];
    cuts.push([Number.NEGATIVE_INFINITY, merged_segments[0][0]]);
    for(let i = 0; i < merged_segments.length-1; ++i){
        cuts.push([merged_segments[i][1], merged_segments[i+1][0]]);
    }
    cuts.push([merged_segments[merged_segments.length-1][1], Number.POSITIVE_INFINITY]);

    // when range is given, clips the segments within the range, or remove it when it's out of the range
    if(x_range){
        for(let i = 0; i < cuts.length; ++i){
            if(this.test_overlap_segments(x_range, cuts[i])){
                cuts[i] = this.intersect_segment(x_range, cuts[i]);
            }
            else{
                cuts.splice(i--, 1);
            }
        }
    }
    return cuts;
};



exports.project_and_cut_rects = function(rects, range, cut_y){
    let i = 0;
    let j = 2;
    if(cut_y){
        i = 1; j = 3;
    }
    let segments = [];
    rects.forEach(function(rect){
        segments.push([rect[i], rect[j]]);
    });
    segments.sort(this.segment_sort_criteria);
    return this.get_cuts_of_segments(segments, range);
};


exports.project_on_x_axis_and_get_cuts = function(rects, range){
    let cut_y = false;
    return this.project_and_cut_rects(rects, range, cut_y);
};


exports.project_on_y_axis_and_get_cuts = function(rects, range){
    let cut_y = true;
    return this.project_and_cut_rects(rects, range, cut_y);
};



exports.get_rect_blocks_from_projected_cuts = function(rects){
    let i, j;
    let blocks = [];
    let ycuts = this.project_on_y_axis_and_get_cuts(rects);

    let visited_rect = new Array(rects.length);
    for(j = 0; j < rects.length; ++j){visited_rect[j] = false;}
    for(i = 0; i < ycuts.length-1; ++i){
        let cut_range = [ycuts[i][1], ycuts[i+1][0]];
        let block = {};
        block.rects = [];

        for(j = 0; j < rects.length; ++j){
            if( (!visited_rect[j]) &&
                (cut_range[0] <= rects[j][1] && rects[j][3] <= cut_range[1])){
                block.rects.push(rects[j]);
                visited_rect[j] = true;
            }
        }

        block.rects.sort(this.rect_sort_criteria);
        block.bbox = this.get_rects_bbox(block.rects);
        blocks.push(block);
    }

    return blocks;
};



exports.xy_cut = (() => {
    let pub = {};

    let NOSHARE = -1;

    pub.run = (rects, alley_range) => {
        let i, j;
        let verbose = false;

        // Project rects on Y axis. When the shadow--line segment--of the projection overlaps, combine them into a block.
        let ycut_blocks = this.get_rect_blocks_from_projected_cuts(rects);
        if (ycut_blocks.length === 0) {
            return getEmptyPageCtx();
        }

        // X-cuts for each y-cut blocks.
        let xcuts = [];
        for (i = 0; i < ycut_blocks.length; ++i) {
            xcuts.push(this.project_on_x_axis_and_get_cuts(rects = ycut_blocks[i].rects, alley_range));
        }

        // BC(i, X) -> memoization[i][pX], pX points to xcut_seqs. See the paper for the detail.
        let memoization = [];
        for (i = 0; i < ycut_blocks.length; ++i) {
            memoization.push({});
        }

        let xcut_seqs = {}; // xcut_seqs["2,0,3,0,4,0"] = [{seq:[[2,0],[3,0],[4,0]], xcut: [-infinity, 132.0]}]

        let bbox_height = this.get_rects_bbox_height(rects);

        // BC internal functions
        let BC_CascadeXCut = (seq) => {
            if (!xcut_seqs.hasOwnProperty(seq)) {
                let v;
                v = {};
                v.seq = seq;
                if (seq.length === 1) {
                    v.xcut = xcuts[seq[0][0]][seq[0][1]];
                }
                else {
                    v.xcut = this.intersect_segment(
                        xcuts[seq[seq.length - 1][0]][seq[seq.length - 1][1]], BC_CascadeXCut(seq.slice(0, seq.length - 1))
                    );
                }
                xcut_seqs[seq] = v;
            }
            return xcut_seqs[seq].xcut;
        };

        let BC_Overlap_seg_list = (seg, list) => {
            let l = [];
            for (let i = 0; i < list.length; ++i) {
                if (this.test_overlap_segments(seg, list[i])) {
                    l.push(i);
                }
            }
            return l;
        };

        let BC_LargestOverlap_seg_list = (seq, list) => {
            let l = [];
            for (let i = 0; i < list.length; ++i) {
                l.push(this.intersect_segment(seq, list[i]));
            }
            l.sort((a, b) => {
                let da = a[1] - a[0];
                let db = b[1] - b[0];
                if (da < db) {
                    return 1;
                }
                else if (da > db) {
                    return -1;
                }
                else {
                    return 0;
                }
            });
            return l[0];
        };

        /**
         * @returns {number}
         */
        let BC_Height = function (i) {
            return ycut_blocks[i].bbox[3] - ycut_blocks[i].bbox[1];
        };

        /**
         * @returns {number}
         */
        let BC_Dist = function (ia, ib) {
            return ycut_blocks[ib].bbox[1] - ycut_blocks[ia].bbox[3];
        };

        /**
         * @returns {number} - score (to maximize)
         */
        let BC = function (i, pX) {
            if (i >= ycut_blocks.length) {
                return 0;
            }
            if (memoization[i].hasOwnProperty(pX)) {
                return memoization[i][pX];
            }

            let Xi = xcuts[i];
            let score;
            if (pX === NOSHARE) {
                score = BC(i + 1, NOSHARE);
                for (let j = 0; j < Xi.length; ++j) {
                    let s = BC(i + 1, [[i, j]]);
                    if (s > 0) {
                        s += BC_Height(i);
                    }
                    score = Math.max(score, s);
                }
            }
            else {
                let cascade_xcut = BC_CascadeXCut(pX);
                let overlap_list = BC_Overlap_seg_list(cascade_xcut, Xi);
                if (cascade_xcut[0] > cascade_xcut[1] ||
                    overlap_list.length === 0) {
                    score = 0;
                }
                else {
                    let largest_seg = BC_LargestOverlap_seg_list(cascade_xcut, Xi);
                    if (largest_seg[1] < largest_seg[0] + this.MIN_ALLEY_W) {
                        score = 0;
                    }
                    else {
                        score = BC(i + 1, NOSHARE);
                        for (j = 0; j < overlap_list.length; ++j) {
                            score = Math.max(score, BC(i + 1, pX.concat([[i, overlap_list[j]]])));
                        }
                        score += bbox_height - BC_Dist(i - 1, i) + BC_Height(i); // share_score
                    }
                }
            }
            memoization[i][pX] = score;
            return score;
        };

        // run xy-cut
        BC(0, NOSHARE);

        if (verbose) {
            console.log("=====XYCut.memoization.bgn=====");
            for (let bKey in memoization) {
                if (memoization.hasOwnProperty(bKey)) {
                    console.log("Block:", bKey);
                    let pKeys = Object.keys(memoization[bKey]);
                    for (i = 0; i < pKeys.length; ++i) {
                        if (memoization[bKey].hasOwnProperty(pKeys[i])) {
                            console.log("    ", memoization[bKey][pKeys[i]].toFixed(2), "    ", pKeys[i] === -1 ? "NOSHARE" : JSON.stringify(xcut_seqs[pKeys[i]].seq), pKeys[i] === -1 ? " " : JSON.stringify(xcut_seqs[pKeys[i]].xcut));
                        }
                    }
                }
            }
        }

        // optimal sequence
        let group_seqs = getOptimalGroupSeqs(memoization, xcut_seqs);
        if (verbose) {
            console.log("=====XYCut.group_seqs.bgn=====");
            console.log(JSON.stringify(group_seqs));
        }

        let block_group = [];
        let group_seq;
        for (i = 0; group_seq = group_seqs[i]; ++i) {
            let grp = {};
            grp.seq = group_seq;
            grp.rects = [];
            for (j = 0; j < group_seq.length; ++j) {
                let rect;
                for (let k = 0; rect = ycut_blocks[group_seq[j]].rects[k]; ++k) {
                    grp.rects.push(rect);
                }
            }
            grp.bbox = this.get_rects_bbox(grp.rects);
            block_group.push(grp);
        }

        let ctx = {};
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
    let getOptimalGroupSeqs = function(memoization, xcut_seqs) {
        let verbose = false;
        let i, j, seq;
        /**
         * @returns {boolean}
         */
        function Contains_NOSHARE(l){
            let item;
            for(let i = 0; item = l[i]; ++i){
                if(item === NOSHARE){
                    return true;
                }
            }
            return false;
        }

        /**
         * @returns {boolean}
         */
        function Contains_MatchingSeq(seq, prev_seq_l){
            let prev_seq;
            for(let i = 0; prev_seq = prev_seq_l[i]; ++i){
                if( prev_seq !== NOSHARE && prev_seq.equals(seq.slice(0, seq.length-1)))
                    return true;
            }
            return false;

        }

        let opt_seq = [];
        for ( i = 0; i < memoization.length; ++i){
            opt_seq.push([]);
        }
        opt_seq[0].push(NOSHARE);
        for ( i = 1; i < memoization.length; ++i){
            let possible_seq = [];
            let seq_keys = Object.keys(memoization[i]);
            let seq_key;
            for ( j = 0; seq_key = seq_keys[j]; ++j){
                if(seq_key === NOSHARE.toString()){
                    possible_seq.push(NOSHARE);
                }
                else{
                    seq = xcut_seqs[seq_key].seq;
                    if(seq.length === 1){
                        if(Contains_NOSHARE(opt_seq[i-1]))
                            possible_seq.push(seq);
                    }
                    else{
                        if(Contains_MatchingSeq(seq, opt_seq[i-1]))
                            possible_seq.push(seq);
                    }
                }

            }
            let highscore = 0;
            for( j = 0; seq = possible_seq[j]; ++j){
                highscore = Math.max(highscore, memoization[i][seq]);
            }

            if(highscore === 0){
                opt_seq[i].push(NOSHARE);
            }
            else{
                for( j = 0; seq = possible_seq[j]; ++j){
                    if(memoization[i][seq] === highscore){
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


        let group_seqs = [];
        for ( i = 0; i < memoization.length; ++i) {
            if(Contains_NOSHARE(opt_seq[i])){
                group_seqs.push([i]);
                seq = [];
            }
            else{
                for( j = 0; j < opt_seq[i].length; ++j){
                    if(seq.equals(opt_seq[i][j].slice(0, opt_seq[i][j].length-1))) {
                        group_seqs[group_seqs.length-1].push(i);
                        seq = opt_seq[i][j];
                        break;
                    }
                }
            }
        }
        return group_seqs;
    };

    let getEmptyPageCtx = function(){
        let ctx  = {};
        ctx.xcuts = [];
        ctx.ycut_blocks = [];
        ctx.block_group = [];
        return ctx;
    };


    return pub;
})();



Array.prototype.equals = function (array) {
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time
    if (this.length !== array.length)
        return false;

    for (let i = 0, l=this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].equals(array[i]))
                return false;
        }
        else if (this[i] !== array[i]) {
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;
        }
    }
    return true;
};



class histogram {

    constructor(){
        /**
         *  @member {Array} data - 'p' is the left-end point of a section, and 'wght' is the weight of that section.
         *                         histogram[i].wght is the weight for the segment [histogram[i].p, histogram[i+1].p]
         */
        this.data = [];

        /** @memeber {float} cut_threshold */
        this.cut_threshold = 0.0;

        /** @memeber {Object} thresholded_block */
        this.thresholded_block = [];
    }

    init (rects, window_size, use_left_side, window_size_Lpf) {
        let idx_side = use_left_side ? 0 : 2;
        this.data = [{p:Number.NEGATIVE_INFINITY, wght:0.0}, {p:Number.POSITIVE_INFINITY, wght:0.0}];

        this.subslice(rects.map(function(r){return r[idx_side]-window_size*0.5}));
        this.subslice(rects.map(function(r){return r[idx_side]+window_size*0.5}));

        let histogram_from_rect_height = rects.map(function(r){
            return {seg:[r[idx_side]-window_size*0.5, r[idx_side]+window_size*0.5], wght:r[3]-r[1]};
        });

        let h;
        for(let i = 0; h = histogram_from_rect_height[i]; ++i) {
            for (let j = 0; j < this.data.length - 1; ++j) {
                if(this.test_overlap_segments_ignore_edge([this.data[j].p, this.data[j+1].p], h.seg)){
                    this.data[j].wght += h.wght;
                }
            }
        }

        if(window_size_Lpf) // it's undefined when not running lpf
            this.low_pass_filter(window_size_Lpf);
    }



    subslice (cut_pts){
        for(let i = 0; i < cut_pts.length; ++i){
            for(let j = 0; j < this.data.length-1; ++j){
                if(this.data[j].p < cut_pts[i] && cut_pts[i] < this.data[j+1].p){
                    this.data.splice(j+1, 0, {p:cut_pts[i], wght:this.data[j].wght});
                }
            }
        }
    }



    low_pass_filter (window_size_Lpf) {
        let n_cuts = Math.ceil((this.data[this.data.length-2].p-this.data[1].p)/window_size_Lpf)+1;
        let origin_left = this.data[1].p;
        let cut_pts = new Array(n_cuts).fill(0).map((val, i) => {
            return origin_left + window_size_Lpf * i;
        });
        this.subslice(cut_pts);

        let new_histogram = new Array(n_cuts).fill(0).map((val, i) => {
            return {
                p: origin_left + window_size_Lpf * i,
                wght: 0
            };
        });

        let j = 1;
        for(let i = 0; i < new_histogram.length-1; ++i){
            while(this.data[j].p < new_histogram[i+1].p){
                new_histogram[i].wght += this.data[j].wght*(this.data[j+1].p-this.data[j].p);
                ++j;
            }
            new_histogram[i].wght /= window_size_Lpf;
        }

        this.data.splice(0, this.data.length); // clear all
        this.data.push({p:Number.NEGATIVE_INFINITY, wght:0.0});
        for(let k = 0; k < new_histogram.length; ++k){
            this.data.push(new_histogram[k]);
        }
        this.data.push({p:Number.POSITIVE_INFINITY, wght:0.0});
    }


    test_overlap_segments_ignore_edge (a, b) {
        return !(a[0] >= b[1] || b[0] >= a[1]);
    }



    get_threshold (scale) {
        let sum = 0.0;

        for(let i = 1; i < this.data.length - 2; ++i){
            sum += this.data[i]['wght'] * (this.data[i+1].p - this.data[i].p);
        }
        this.cut_threshold = scale*sum/(this.data[this.data.length-2].p-this.data[1].p);
    }




    run_thresholding (){
        let blocks = [];
        let new_blk = {range: [0.0, 0.0], wght:0.0};
        for(let i = 0; i < this.data.length-1; ++i){
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
    }
}


exports.init_histograms = function (block_group) {
    block_group.histogram_left = new histogram();
    block_group.histogram_rght = new histogram();
    block_group.histogram_max_wght = 0;
};



exports.run_histogram_analysis = function(block_group, alley_range){
    for(let idx_block = 0; idx_block < block_group.length; ++idx_block){
        let group = block_group[idx_block];
        this.init_histograms(group);

        // skip if the group's height is shorter than the height criterion.
        if(group.bbox[3]-group.bbox[1] < this.TWOCOLUMN_MIN_H){
            continue;
        }

        // getting the widest cut amongst all the cuts in the 'alley range'.
        let cuts = this.project_on_x_axis_and_get_cuts(group.rects);
        let widest_cut = {
            w: 0,
            idx: -1,
            mid: 0
        };
        widest_cut.mid = 0;
        for(let idx_cut = 1; idx_cut < cuts.length-1; ++idx_cut){
            let cut = cuts[idx_cut];
            if(alley_range[0] < cut[0] && cut[1] < alley_range[1]){
                if(widest_cut.w < cut[1]-cut[0]){
                    widest_cut.w = cut[1]-cut[0];
                    widest_cut.idx = idx_cut;
                    widest_cut.mid = 0.5*(cuts[widest_cut.idx][0]+cuts[widest_cut.idx][1]);
                }
            }
        }

        // Perform histogram analysis when the following three conditions met:
        if(widest_cut.w > this.MIN_ALLEY_W &&                           // (1) alley is wide enough
            widest_cut.mid - group.bbox[0] > this.NARROW_COLUMN_W &&    // (2) the left column is wide enough
            group.bbox[2] - widest_cut.mid > this.NARROW_COLUMN_W       // (3) the rght column is wide enough
        ){
            group.alley = cuts[widest_cut.idx];

            let use_left_side, window_size_Lpf; // named parameters
            group.histogram_left.init(
                group.rects, this.EDGE_SPLATTER_HIST_L_WINDOW, use_left_side = true
            );
            group.histogram_left.get_threshold(this.EDGE_SPLATTER_HIST_L_CUTOFF_RATIO);
            group.histogram_left.run_thresholding();

            group.histogram_rght.init(
                group.rects, this.EDGE_SPLATTER_HIST_R_WINDOW, use_left_side = false, window_size_Lpf = this.EDGE_SPLATTER_HIST_R_LPF_W
            );
            group.histogram_rght.get_threshold(this.EDGE_SPLATTER_HIST_R_CUTOFF_RATIO);
            group.histogram_rght.run_thresholding();

            // get the highest peak of the histogram
            group.histogram_max_wght = Math.max(
                group.histogram_left.thresholded_block.reduce(function(prev, cur){return Math.max(prev,cur.wght);}, 0),
                group.histogram_rght.thresholded_block.reduce(function(prev, cur){return Math.max(prev,cur.wght);}, 0)
            );

            // cutoff by threshold. Remember that the histogram weight is the sum of the rectangles' heights by definition.
            if(group.histogram_max_wght < this.TWOCOLUMN_MIN_H){
                this.init_histograms(group);
            }
        }
    }

    // among multiple groups, find the one with the maximum weight (in other words, the maximum height)
    // 'idx_group_max_wght' being -1 indicates the single column page
    let max_wght_group = {
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
    if (max_wght_group.idx !== -1){
        max_wght_group.alley = block_group[max_wght_group.idx].alley;
    }
    return max_wght_group;
};




exports.categorize_text_boxes_into_regions = function(block_group, max_wght_group){

    // assigning
    let rects = [[],[],[],[]];

    // fill rects from the foot
    let idx_rect;
    let i;
    for(i = block_group.length-1; i > max_wght_group.idx; --i) {
        for( idx_rect = 0; idx_rect < block_group[i].rects.length; ++idx_rect){
            rects[FOOT].push(block_group[i].rects[idx_rect]);
        }
    }
    if(max_wght_group.idx > -1){ // now i === idx_group_max_wght;
        let nj;
        for(idx_rect = 0, nj = block_group[max_wght_group.idx].rects.length; idx_rect < nj; ++idx_rect){
            if(block_group[max_wght_group.idx].rects[idx_rect][0] < max_wght_group.alley[1]){
                rects[LEFT].push(block_group[max_wght_group.idx].rects[idx_rect]);
            }
            else{
                rects[RIGHT].push(block_group[max_wght_group.idx].rects[idx_rect]);
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


exports.merge_overlapping_pts = function(pts, tolerance){
    // assert that l was sorted
    for(let i = 0; i < pts.length-1; ++i){
        if(pts[i+1] - pts[i] < tolerance){
            pts.splice(i, 2, 0.5*(pts[i]+pts[i+1]));
            --i;
        }
    }
};


exports.copy_rect = function(r){
    return [r[0],r[1],r[2],r[3]];
};



exports.slice_regions_into_text_tearing_pieces = function(textboxes_by_region, doc_bbox, alley){
    // formatting
    let cut_pts_y = [[],[],[],[]];
    let range_x = [[0, 0],[0, 0],[0, 0],[0, 0]];

    for(let i_rgn = 0; i_rgn < 4; ++i_rgn){
        for(let idx_rect = 0; idx_rect < textboxes_by_region[i_rgn].length; ++idx_rect){
            cut_pts_y[i_rgn].push(textboxes_by_region[i_rgn][idx_rect][3]);
        }
    }

    // doc_bbox is a bounding box of the document [0, 0, doc_width, doc_height]
    let range_y;
    let alley_x;
    if(textboxes_by_region[LEFT].length === 0 && textboxes_by_region[RIGHT].length === 0) { // no double columns, only header
        range_y = [doc_bbox[3], doc_bbox[3]];
        alley_x = 0.5*(doc_bbox[0]+doc_bbox[2]);
    }
    else{
        let left_bbox = this.get_rects_bbox(textboxes_by_region[LEFT]);
        let right_bbox = this.get_rects_bbox(textboxes_by_region[RIGHT]);
        range_y = [Math.min(left_bbox[1], right_bbox[1]), Math.max(left_bbox[3], right_bbox[3])]; // the double column's range
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

    cut_pts_y[RIGHT].push(range_y[0]);
    cut_pts_y[RIGHT].push(range_y[1]);
    range_x[RIGHT][0] = alley_x;
    range_x[RIGHT][1] = doc_bbox[2];

    cut_pts_y[FOOT].push(range_y[1]);
    cut_pts_y[FOOT].push(doc_bbox[3]);
    range_x[FOOT][0] = doc_bbox[0];
    range_x[FOOT][1] = doc_bbox[2];

    let idx_rgn;
    for(idx_rgn = 0; idx_rgn < 4; ++idx_rgn){
        cut_pts_y[idx_rgn] = cut_pts_y[idx_rgn].sort(
            function(a,b){
                if(a < b){return -1;}
                else if(a > b){return 1;}
                else{return 0;}
            });
        this.merge_overlapping_pts(cut_pts_y[idx_rgn], this.MULTICOLUMN_MERGE_Y);

        if(cut_pts_y[idx_rgn].length === 1)
            cut_pts_y[idx_rgn].push(this.copy_rect(cut_pts_y[idx_rgn][0]));
    }

    // ttX is text range, ttW is the width of the text region, and rect are actual text boxes.
    let doublecolumn_text_boxes = [{},{},{},{}];
    for(idx_rgn = 0; idx_rgn < 4; ++idx_rgn){
        let rgn_bbox = this.get_rects_bbox(textboxes_by_region[idx_rgn]);
        doublecolumn_text_boxes[idx_rgn].ttX = rgn_bbox[0];
        doublecolumn_text_boxes[idx_rgn].ttW = rgn_bbox[2]-rgn_bbox[0];
        doublecolumn_text_boxes[idx_rgn].rects = [];
        for(let j = 0; j < cut_pts_y[idx_rgn].length-1; ++j){
            doublecolumn_text_boxes[idx_rgn].rects.push([
                range_x[idx_rgn][0], cut_pts_y[idx_rgn][j], range_x[idx_rgn][1], cut_pts_y[idx_rgn][j+1]
            ]);
        }
    }
    return doublecolumn_text_boxes;
};