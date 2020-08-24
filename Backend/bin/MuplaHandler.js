
class MuplaHandler {

    constructor(){
        this.path = `${path.sep}tmp${path.sep}richreview${path.sep}pdfs${path.sep}`;

        const dom = new JSDOM(`<!DOCTYPE html>`);

        this.window = dom.window;
        this.document = dom.window.document;

        this.PAGE_W = 500.0;
        this.NARROW_COLUMN_W = 150;
        this.PAGENUM_DETECTION_RANGE_Y = 80;
    }



    static async get_instance() {
        if (this.instance) {
            console.log('Database handler instance found');
            return this.instance;
        }

        this.instance = await new MuplaHandler();
        return this.instance;
    }



    async analyze_vs_doc (context) {

        let pdf_data = await this.get_pdf_data(context.blob_localfile_path);
        let mupla_data = this.get_mupla_from_vs_doc(context);

        let num_pages = pdf_data._pdfInfo.numPages;

        let page_layout_js = [];

        for (let i = 0; i < num_pages; i++) {
            let page_data = await this.get_page_data(pdf_data, i, num_pages, mupla_data);
            page_layout_js.push(page_data);
        }

        return {
            ver: 6.0,
            pages: page_layout_js
        }
    }



    async get_pdf_data (pdf_path) {

        let buffer = new Uint8Array(fs.readFileSync(pdf_path));
        let pdf_data = await pdfjsLib.getDocument({
            data: buffer,
            disableFontFace: false
          });
        return pdf_data;
    }



    get_mupla_from_vs_doc (context) {
        return JSON.parse(fs.readFileSync(`${this.path}${context['uuid']}${path.sep}merged.js`, 'utf8'));
    }



    async get_page_data (pdf_data, page_number, num_pages, mupla_data) {
        let page = await pdf_data.getPage(page_number + 1);
        let pdf_page_data = await this.get_pdf_page_data(page, page_number, num_pages, mupla_data);
        this.preprocess_text_boxes(pdf_page_data.mupla_data,
            {
                w: pdf_page_data.pdfjs_canv.width,
                h: pdf_page_data.pdfjs_canv.height
            });

        let render_ctx = {};
        let rects = multicolumn.get_rects(pdf_page_data.mupla_data);
        let alley_range = multicolumn.get_alley_range(rects);

        render_ctx.pla_ctx = multicolumn.xy_cut.run(rects, alley_range);

        let max_wght_group = multicolumn.run_histogram_analysis(
            render_ctx.pla_ctx.block_group, alley_range
        );

        let textboxes_by_regions = multicolumn.categorize_text_boxes_into_regions(
            render_ctx.pla_ctx.block_group, max_wght_group
        );

        let texttearing_pieces = multicolumn.slice_regions_into_text_tearing_pieces(
            textboxes_by_regions,
            pdf_page_data.mupla_data.bbox,
            max_wght_group.alley
        );

        this.set_text(texttearing_pieces, pdf_page_data.mupla_data);

        render_ctx.rects = rects;
        render_ctx.alley_range = alley_range;
        render_ctx.ycuts = multicolumn.project_on_y_axis_and_get_cuts(rects);
        render_ctx.ycut_blocks = multicolumn.get_rect_blocks_from_projected_cuts(rects);
        render_ctx.pla_ctx.doublecolumn_rects = textboxes_by_regions;
        render_ctx.multicolumn = texttearing_pieces;
        render_ctx.n_page = page.n_page;
        render_ctx.n_page_total = page.n_page_total;

        return {
            bbox: pdf_page_data.mupla_data.bbox,
            rgns: texttearing_pieces
        }
    }



    set_text (tt_pieces, mupla_data){
        let overlappingArea = function(x, y){
            let l, t, r, b;
            l = Math.max(x[0], y[0]);
            t = Math.max(x[1], y[1]);
            r = Math.min(x[2], y[2]);
            b = Math.min(x[3], y[3]);
            return (r>l && b>t) ? (r-l)*(b-t) : 0.0;
        };

        let setTextLine = function(bbox, text){
            let best = null; let best_area = 0.0;
            for(let i = 0, li = tt_pieces.length; i < li; ++i){
                let region = tt_pieces[i];
                for(let j = 0, lj = region.rects.length; j < lj; j ++){
                    let area = overlappingArea(bbox, region.rects[j]);
                    if(area > best_area){
                        best = region.rects[j];
                        best_area = area;
                    }
                }
            }
            if(best){
                if(best[4]){
                    best[4] += '\n'+text;
                }
                else{
                    best.push(text);
                }
            }
        };

        for(let i = 0, li = mupla_data['tblocks'].length; i < li; ++i){
            let block = mupla_data['tblocks'][i];
            for(let j = 0, lj = block.lines.length; j < lj; j ++){
                let line = block.lines[j];
                setTextLine(line.bbox, line.text);
            }
        }
    }


    preprocess_text_boxes (mupla, pdfjs_canv_size) {

        let i, j, lines, bbox;
        if(mupla.resize_done === undefined){
            let ratio_x = pdfjs_canv_size.w/(mupla.bbox[2]-mupla.bbox[0]);
            let ratio_y = pdfjs_canv_size.h/(mupla.bbox[3]-mupla.bbox[1]);
            for( i = 0; i < mupla['tblocks'].length; ++i){
                lines = mupla['tblocks'][i].lines;
                for( j = 0; j < lines.length; ++j){
                    bbox = lines[j].bbox;
                    bbox[0] = ratio_x*bbox[0];
                    bbox[1] = ratio_y*bbox[1];
                    bbox[2] = ratio_x*bbox[2];
                    bbox[3] = ratio_y*bbox[3];
                }
            }
            mupla.bbox[0] = mupla.bbox[0]*ratio_x;
            mupla.bbox[1] = mupla.bbox[1]*ratio_y;
            mupla.bbox[2] = mupla.bbox[2]*ratio_x;
            mupla.bbox[3] = mupla.bbox[3]*ratio_y;
            mupla.resize_done = true;
        }

        // filter out space only text boxes
        for(i = 0; i < mupla['tblocks'].length; ++i){
            lines = mupla['tblocks'][i].lines;
            for(j = 0; j < lines.length; ++j){
                if((/^\s*$/).test(lines[j].text)){
                    lines.splice(j, 1);
                    --j;
                }
            }
        }

        // filter out Page Number box
        let rects = multicolumn.get_rects(mupla);
        bbox = multicolumn.get_rects_bbox(rects);
        let range_y = [bbox[3] - this.PAGENUM_DETECTION_RANGE_Y, bbox[3]];

        for(i = 0; i < mupla['tblocks'].length; ++i) {
            lines = mupla['tblocks'][i].lines;
            for (j = 0; j < lines.length; ++j) {
                let rect = lines[j].bbox;
                if((/^([0-9]|\s)+$/).test(lines[j].text) &&
                    multicolumn.test_overlap_segments(range_y, [rect[1], rect[3]])
                ){
                    // Check other boxes nearby
                    let w = rect[2]-rect[0];
                    let h = rect[3]-rect[1];
                    let cx = (rect[0]+rect[2])*0.5;
                    let cy = (rect[1]+rect[3])*0.5;
                    let exp_rect = [cx-w, cy-h, cx+w, cy+h];
                    if(multicolumn.get_overlapping_rects(exp_rect, rects).length === 1){
                        // Page Number's box detected
                        rect[0] = bbox[0];
                        rect[2] = bbox[2];
                    }
                }
            }
        }
    }



    async get_pdf_page_data (page, page_number, num_pages, mupla_data) {
        let s = this.PAGE_W / page._pageInfo.view[2];
        let viewport = page.getViewport(s);
        let canv = this.document.createElement('canvas');
        let canv_ctx = canv.getContext('2d');
        let canv_pixel_ratio = multicolumn.get_output_scale(canv_ctx);

        canv.width = Math.floor(viewport.width * canv_pixel_ratio.sx) | 0;
        canv.height = Math.floor(viewport.height * canv_pixel_ratio.sy) | 0;
        canv_ctx.scale(canv_pixel_ratio.sx, canv_pixel_ratio.sy);


        let page_datum = {};
        page_datum.img_boxes = [];
        page_datum.pdfjs_canv = canv;
        page_datum.mupla_data = mupla_data[page_number];
        page_datum.n_page = page_number;
        page_datum.n_page_total = num_pages;
        return page_datum;
    }
}

module.exports = MuplaHandler;

const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const pdfjsLib = require('pdfjs-dist');
const multicolumn = require('./multicolumn');
const path = require('path');


