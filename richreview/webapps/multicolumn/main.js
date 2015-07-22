/**
 * Created by yoon on 3/25/15.
 */

/** @namespace Pla */
(function(Pla){
    "use strict";

    Pla.Param = {
        PAGE_W: 500.0,
        NARROW_COLUMN_W: 150,
        MIN_ALLEY_W: 9,
        EPSILON_IMAGE_FILTER_BG: 4.0,
        PAGENUM_DETECTION_RANGE_Y: 80,
        TWOCOLUMN_MIN_H: 50,
        EDGE_SPLATTER_HIST_L_WINDOW: 9, // === MIN_ALLEY_W
        EDGE_SPLATTER_HIST_R_WINDOW: 9*3.0,  // === MIN_ALLEY_W*3.0
        EDGE_SPLATTER_HIST_R_LPF_W: 10,
        EDGE_SPLATTER_HIST_L_CUTOFF_RATIO: 4.0,
        EDGE_SPLATTER_HIST_R_CUTOFF_RATIO: 1.5,
        MULTICOLUMN_MERGE_Y: 3
    };

    Pla.Const = {
        PDF_FILENAME: "merged.pdf",
        MUPLA_FILENAME: "merged.js"
    };

    Pla.ctrl = (function(){
        var pub = {};

        var render_ctx = {};
        var cur_page = 0;
        var page_layout_js = [];

        pub.start = function(){
            return Pla.util.checkEnv().then(
                initCtrl
            ).then(
                batchRunPla
            ).then(
                Pla.override.done
            ).catch(
                Pla.util.handleErr
            );
        };

        var initCtrl = function(){
            document.onkeydown = onKeyDown;
            document.onmouseup = onMouseUp;

            var promise = Pla.model.initModel(Pla.ctx.pdf_url, Pla.ctx.js_url);
            page_layout_js = new Array(Pla.model.getNumPages());
            return promise;
        };

        var batchRunPla = function(){
            console.log("batchRunPla");
            return new Promise(function(resolve, reject){
                var job = function (){
                    if(cur_page != Pla.model.getNumPages()){
                        runPla().then(
                            function(){
                                console.log("batchRunPla, page: ", cur_page);
                                cur_page += 1;
                                job();
                            }
                        ).catch(
                            reject
                        );
                    }
                    else{
                        cur_page -= 1;

                        console.log("batchRunPla, resolve");
                        resolve(
                            {
                                ver: 6.0,
                                pages: page_layout_js
                            }
                        );
                    }
                };
                cur_page = 0;
                job();
            });
        };

        var runPla = function(){
            return Pla.model.getPdfPageData(cur_page).then(function(page){
                console.log("> runPla at page", cur_page);
                preprocessTextBoxes(
                    page.mupla_data,
                    {w: page.pdfjs_canv.width, h: page.pdfjs_canv.height}
                );

                var rects = page.mupla_data.GetRects();

                var alley_range = Pla.rectUtil.getAlleyRange(rects);

                render_ctx.pla_ctx = Pla.xyCut.run(rects, alley_range);

                var max_wght_group = Pla.multiColumn.runHistogramAnalysis(
                    render_ctx.pla_ctx.block_group, alley_range
                );

                var textboxes_by_regions = Pla.multiColumn.categorizeTextBoxesIntoRegions(
                    render_ctx.pla_ctx.block_group, max_wght_group
                );

                var texttearing_pieces = Pla.multiColumn.sliceRegionsIntoTextTearingPieces(
                    textboxes_by_regions,
                    page.mupla_data.bbox,
                    max_wght_group.alley
                );

                render_ctx.rects = rects;
                render_ctx.alley_range = alley_range;
                render_ctx.ycuts = Pla.rectUtil.projectOnYaxisAndGetCuts(rects);
                render_ctx.ycut_blocks = Pla.rectUtil.getRectBlocksFromProjectedCuts(rects);
                render_ctx.pla_ctx.doublecolumn_rects = textboxes_by_regions;
                render_ctx.multicolumn = texttearing_pieces;
                render_ctx.n_page = page.n_page;
                render_ctx.n_page_total = page.n_page_total;

                Pla.View.Render(render_ctx, page.pdfjs_canv);

                page_layout_js[cur_page] = {
                    bbox: page.mupla_data.bbox,
                    rgns: texttearing_pieces};
            }).catch(Pla.util.handleErr);
        };

        var preprocessTextBoxes = function(mupla, pdfjs_canv_size){
            var i, j, lines, bbox;
            if(typeof mupla.resize_done === "undefined"){
                var ratio_x = pdfjs_canv_size.w/(mupla.bbox[2]-mupla.bbox[0]);
                var ratio_y = pdfjs_canv_size.h/(mupla.bbox[3]-mupla.bbox[1]);
                for( i = 0; i < mupla.tblocks.length; ++i){
                    lines = mupla.tblocks[i].lines;
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

            function isMostlyAlphaNumeric(l){
                var n_an = 0;
                for(var i = 0; i < l.length; ++i){
                    if(/^[., A-Za-z0-9]$/.test(l[i])){
                        n_an += 1;
                    }
                }
                return n_an >= l.length/2;
            }


            // filter out space only text boxes
            for(i = 0; i < mupla.tblocks.length; ++i){
                lines = mupla.tblocks[i].lines;
                for(j = 0; j < lines.length; ++j){
                    if((/^\s*$/).test(lines[j].text) || !isMostlyAlphaNumeric(lines[j].text)){
                        lines.splice(j, 1);
                        --j;
                    }
                }
            }

            // filter out Page Number box
            var rects = mupla.GetRects();
            bbox = Pla.rectUtil.getRectsBBox(rects);
            var range_y = [bbox[3]-Pla.Param.PAGENUM_DETECTION_RANGE_Y, bbox[3]];

            for(i = 0; i < mupla.tblocks.length; ++i) {
                lines = mupla.tblocks[i].lines;
                for (j = 0; j < lines.length; ++j) {
                    var rect = lines[j].bbox;
                    if((/^([0-9]|\s)+$/).test(lines[j].text) && // number only text
                        Pla.rectUtil.testOverlapSegments(range_y, [rect[1], rect[3]])
                    ){
                        // Check other boxes nearby
                        var w = rect[2]-rect[0];
                        var h = rect[3]-rect[1];
                        var cx = (rect[0]+rect[2])*0.5;
                        var cy = (rect[1]+rect[3])*0.5;
                        var exp_rect = [cx-w, cy-h, cx+w, cy+h];
                        if(Pla.rectUtil.getOverlappingRects(exp_rect, rects).length == 1){
                            // Page Number's box detected
                            rect[0] = bbox[0];
                            rect[2] = bbox[2];
                        }
                    }
                }
            }
        };

        var onKeyDown = function(event){
            var turnPage = function(d){
                cur_page = cur_page + d;
                cur_page = Math.min(cur_page, Pla.model.getNumPages()-1);
                cur_page = Math.max(cur_page, 0);
            };

            switch(event.which){
                case 37: // L-arrow
                    turnPage(-1);
                    runPla();
                    break;
                case 39: // R-arrow
                    turnPage(+1);
                    runPla();
                    break;
                default:
                    break;
            }
        };

        var onMouseUp = function(event){
            var p = [event.clientX, event.clientY];
            Pla.model.getPdfPageData(cur_page).then(function(page){
                // Todo Fix it
                /*
                 page.text_boxes.forEach(function(item){
                 var rect = item.bbox;
                 if(rect[0] < p[0] && p[0] < rect[2] &&
                 rect[1] < p[1] && p[1] < rect[3]
                 ){
                 console.log(
                 "mouse_pos:", JSON.stringify(p), ",",
                 rect[0].toFixed(2), rect[1].toFixed(2), rect[2].toFixed(2), rect[3].toFixed(2), ",",
                 item.text
                 );
                 }
                 });*/
            }).catch(Pla.util.handleErr);
        };

        return pub;
    })();

    Pla.model = (function(){
        var pub = {};

        var pdf;
        var num_pages = 0;
        var page_data = [];
        var page_datum = {};
        var mupla_data = [];

        pub.getNumPages = function(){return num_pages;};

        pub.initModel = function(pdf_url, js_url){
            return getMuPlaJs(js_url).then(
                function(){
                    return getPdf(pdf_url)
                }
            );
        };

        function getMuPlaJs(js_url){
            return new Promise(function(resolve, reject){
                Pla.util.getUrlData(
                    js_url,
                    ""
                ).then(
                    function(js){
                        mupla_data = JSON.parse(js);
                        for(var i = 0; i < mupla_data.length; ++i){
                            mupla_data[i].GetRects = function(){
                                var rects = [];
                                for(var i = 0; i < this.tblocks.length; ++i){
                                    var lines = this.tblocks[i].lines;
                                    for(var j = 0; j < lines.length; ++j){
                                        rects.push(lines[j].bbox);
                                    }
                                }
                                return rects;
                            };
                        }
                        resolve();
                    }
                ).catch(
                    reject
                );
            });
        }

        function getPdf(pdf_url){
            return Pla.util.getUrlData(
                pdf_url,
                "arraybuffer",
                null
            ).then(
                PDFJS.getDocument
            ).then(
                function(_pdf){ // cb_success
                    pdf = _pdf;
                    num_pages = pdf.pdfInfo.numPages;
                    for(var i = 0; i < num_pages; ++i){
                        page_data.push(null);
                    }
                    console.log("Model.Init:", num_pages, "pages");
                }
            //).then(
            //    populatePdfPageData
            );
        }

        function populatePdfPageData(){
            return new Promise(function(resolve, reject){
                var job = function(n){
                    if(n != num_pages){
                        pub.getPdfPageData(n).then(function(){
                            job(n+1);
                        }).catch(reject);
                    }
                    else{
                        resolve();
                    }
                };
                job(0);
            });
        }

        /** called in the pdf.js */
        pub.addImgRect = function(rect){
            page_datum.img_boxes.push(rect);
        };

        pub.getPdfPageData = function(n){
            return new Promise(function(resolve, reject){
                if(page_data[n]){
                    resolve(page_data[n]);
                }
                else{
                    pdf.getPage(n+1).then(function(page){
                        var s = Pla.Param.PAGE_W / (page.pageInfo.view[2]); // set page width
                        var viewport = page.getViewport(s);
                        var canv = document.createElement('canvas');
                        var canv_ctx = canv.getContext('2d');
                        var canv_pixel_ratio = Pla.util.getOutputScale(canv_ctx);

                        canv.width = Math.floor(viewport.width*canv_pixel_ratio.sx) | 0;
                        canv.height = Math.floor(viewport.height*canv_pixel_ratio.sy) | 0;
                        canv_ctx.scale(canv_pixel_ratio.sx, canv_pixel_ratio.sy);

                        page_datum = {};
                        page_datum.img_boxes = [];
                        page_datum.pdfjs_canv = canv;
                        page_datum.mupla_data = mupla_data[n];
                        page_datum.n_page = n;
                        page_datum.n_page_total = page_data.length;
                        page_data[n] = page_datum;
                        page.render({
                            canvasContext: canv_ctx,
                            viewport: viewport
                        }).then(function(){
                            resolve(page_data[n]);
                        });
                    }).catch(reject);
                }
            });

        };

        return pub;
    })();

    Pla.View = (function() {
        var pub = {};
        var $maincanvas = $("#maincanvas");
        var dr_canvas = document.getElementById('maincanvas');
        var dr_ctx = dr_canvas.getContext('2d');

        pub.Render = function(render_ctx, pdfjs_canv){

            var margin = 10;

            var scale = pdfjs_canv.height / $maincanvas.height();
            dr_canvas.width = $maincanvas.width()*scale + 2.0*margin;
            dr_canvas.height = $maincanvas.height()*scale + 2.0*margin;

            dr_ctx.fillStyle = '#f9f9f9';
            dr_ctx.fillRect(0, 0, dr_canvas.width, dr_canvas.height);

            dr_ctx.save();
            dr_ctx.translate(dr_canvas.width*0.5 - pdfjs_canv.width*0.5, margin);
            { // canvas context save
                renderInner(render_ctx, pdfjs_canv)
            } // canvas context restore
            dr_ctx.restore();
        };

        var renderInner = function(render_ctx, pdfjs_canv){
            var i, j, h;
            var display = {
                rects: false,
                ycuts: false,
                ycut_blocks: false,
                textbox_by_regions: true,
                xcuts: false,
                alley_range: false,
                block_group_bbox: false,
                histogram: false,
                texttearing_pieces: false
            };

            dr_ctx.drawImage(pdfjs_canv,
                0, 0, pdfjs_canv.width, pdfjs_canv.height,
                0, 0, pdfjs_canv.width, pdfjs_canv.height);

            dr_ctx.strokeStyle = 'black';
            dr_ctx.lineWidth = 1;
            dr_ctx.beginPath();
            dr_ctx.rect(0, 0, pdfjs_canv.width, pdfjs_canv.height);
            dr_ctx.stroke();

            dr_ctx.fillStyle = "black";
            dr_ctx.font = "bold 16px Arial";
            dr_ctx.textAlign = 'right';
            dr_ctx.fillText((render_ctx.n_page+1) + " / " + (render_ctx.n_page_total), 470, 30);

            if(display.rects){
                var rects = render_ctx.rects;
                rects.forEach(function(rect){
                    dr_ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
                    dr_ctx.lineWidth = 1;
                    dr_ctx.beginPath();
                    dr_ctx.rect(rect[0], rect[1], rect[2]-rect[0], rect[3]-rect[1]);
                    dr_ctx.stroke();
                });
            }

            if(display.ycuts){
                var ycuts = render_ctx.ycuts;
                var x = 2;
                ycuts.forEach(function(yi){
                    dr_ctx.strokeStyle = 'rgba(255, 0, 0, 1.0)';
                    dr_ctx.lineWidth = 3;
                    dr_ctx.beginPath();
                    dr_ctx.moveTo(x, yi[0]);
                    dr_ctx.lineTo(x, yi[1]);
                    dr_ctx.stroke();
                    x += 2;
                });
            }

            if(display.ycut_blocks){
                var ycut_blocks = render_ctx.ycut_blocks;
                ycut_blocks.forEach(function(ycut_block){
                    var block = ycut_block.bbox;
                    dr_ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
                    dr_ctx.lineWidth = 2;
                    dr_ctx.beginPath();
                    dr_ctx.rect(block[0], block[1], block[2]-block[0], block[3]-block[1]);
                    dr_ctx.stroke();
                    x += 2;
                });
            }

            var pla_ctx = render_ctx.pla_ctx;
            if(display.xcuts){
                for(i = 0; i < pla_ctx.xcuts.length; ++i){
                    pla_ctx.xcuts[i].forEach(function(cut){
                        dr_ctx.fillStyle = 'rgba(0, 255, 255, 0.25)';
                        dr_ctx.fillRect(
                            cut[0],
                            pla_ctx.ycut_blocks[i].bbox[1],
                            cut[1]-cut[0],
                            pla_ctx.ycut_blocks[i].bbox[3]-pla_ctx.ycut_blocks[i].bbox[1]
                        );
                    });
                }
            }

            if(display.alley_range){
                // alley constraint lines
                dr_ctx.strokeStyle = 'rgba(50, 50, 50, 0.1)';
                dr_ctx.lineWidth = 2;
                dr_ctx.beginPath();
                dr_ctx.moveTo(render_ctx.alley_range[0], 0);
                dr_ctx.lineTo(render_ctx.alley_range[0], pdfjs_canv.height);
                dr_ctx.moveTo(render_ctx.alley_range[1], 0);
                dr_ctx.lineTo(render_ctx.alley_range[1], pdfjs_canv.height);
                dr_ctx.stroke();
            }

            if(display.textbox_by_regions){ // color boxes differently
                var COLORS = [
                    "rgba(255, 0, 0, 0.25)",
                    "rgba(0, 255, 0, 0.25)",
                    "rgba(0, 0, 255, 0.25)",
                    "rgba(255, 0, 255, 0.25)"
                ];

                for(var i_rgn = 0; i_rgn < 4; ++i_rgn){
                    dr_ctx.fillStyle = COLORS[i_rgn];
                    for(i = 0; i < pla_ctx.doublecolumn_rects[i_rgn].length; ++i){
                        var rect = pla_ctx.doublecolumn_rects[i_rgn][i];
                        dr_ctx.fillRect(
                            rect[0],
                            rect[1],
                            rect[2]-rect[0],
                            rect[3]-rect[1]
                        );
                    }
                }
            }

            var bgrp;
            for(i = 0; bgrp = pla_ctx.block_group[i]; ++i){
                // block group bbox
                if(display.block_group_bbox){
                    var block = bgrp.bbox;
                    dr_ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                    dr_ctx.lineWidth = 3;
                    dr_ctx.beginPath();
                    dr_ctx.rect(block[0], block[1], block[2]-block[0], block[3]-block[1]);
                    dr_ctx.stroke();
                    if(bgrp.alley){
                        dr_ctx.fillStyle = 'rgba(255, 0, 0, 0.25)';
                        dr_ctx.fillRect(
                            bgrp.alley[0],
                            block[1],
                            bgrp.alley[1]-bgrp.alley[0],
                            block[3]-block[1]
                        );
                    }
                }


                if(display.histogram) { // histogram analysis
                    dr_ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
                    for (j = 1; j < bgrp.histogram_left.data.length - 2; ++j) {
                        dr_ctx.fillRect(
                            bgrp.histogram_left.data[j].p,
                            block[3],
                            bgrp.histogram_left.data[j + 1].p - bgrp.histogram_left.data[j].p,
                            -bgrp.histogram_left.data[j].wght / 2
                        );
                    }
                    if (bgrp.histogram_left.data.length > 2) {
                        dr_ctx.strokeStyle = 'rgba(0, 255, 0, 1.0)';
                        dr_ctx.lineWidth = 2;
                        h = block[3] - bgrp.histogram_left.cut_threshold / 2;
                        dr_ctx.beginPath();
                        dr_ctx.moveTo(block[0] - 50, h);
                        dr_ctx.lineTo(block[2] + 50, h);
                        dr_ctx.stroke();
                    }

                    var threshold_block;
                    for (j = 0; j < bgrp.histogram_left.thresholded_block.length; ++j) {
                        threshold_block = bgrp.histogram_left.thresholded_block[j];
                        dr_ctx.strokeStyle = 'rgba(0, 150, 150, 1.0)';
                        dr_ctx.lineWidth = 2;
                        dr_ctx.beginPath();
                        dr_ctx.rect(
                            threshold_block.range[0],
                            block[3],
                            threshold_block.range[1] - threshold_block.range[0],
                            -threshold_block.wght / 2
                        );
                        dr_ctx.stroke();
                    }


                    for (j = 1; j < bgrp.histogram_rght.data.length - 2; ++j) {
                        dr_ctx.fillRect(
                            bgrp.histogram_rght.data[j].p,
                            block[1],
                            bgrp.histogram_rght.data[j + 1].p - bgrp.histogram_rght.data[j].p,
                            bgrp.histogram_rght.data[j].wght / 2
                        );
                    }
                    if (bgrp.histogram_rght.data.length > 2) {
                        dr_ctx.strokeStyle = 'rgba(0, 255, 0, 1.0)';
                        dr_ctx.lineWidth = 2;
                        h = block[1] + bgrp.histogram_rght.cut_threshold / 2;
                        dr_ctx.beginPath();
                        dr_ctx.moveTo(block[0] - 50, h);
                        dr_ctx.lineTo(block[2] + 50, h);
                        dr_ctx.stroke();
                    }
                    for (j = 0; j < bgrp.histogram_rght.thresholded_block.length; ++j) {
                        threshold_block = bgrp.histogram_rght.thresholded_block[j];
                        dr_ctx.strokeStyle = 'rgba(0, 150, 150, 1.0)';
                        dr_ctx.lineWidth = 2;
                        dr_ctx.beginPath();
                        dr_ctx.rect(
                            threshold_block.range[0],
                            block[1],
                            threshold_block.range[1] - threshold_block.range[0],
                            threshold_block.wght / 2
                        );
                        dr_ctx.stroke();
                    }
                }
            }

            if(display.texttearing_pieces){ // final cutting boxes
                for(var idx_rgn = 0; idx_rgn < 4; ++idx_rgn){
                    for(i = 0; i < render_ctx.multicolumn[idx_rgn].rects.length; ++i){
                        var box = render_ctx.multicolumn[idx_rgn].rects[i];
                        if(i%2==0){
                            dr_ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                        }
                        else{
                            dr_ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
                        }
                        dr_ctx.lineWidth = 1;
                        dr_ctx.beginPath();
                        dr_ctx.rect(
                            box[0],
                            box[1],
                            box[2]-box[0],
                            box[3]-box[1]
                        );
                        dr_ctx.stroke();
                    }
                }
            }
        };

        return pub;
    })();

}(window.Pla = window.Pla || {}));
