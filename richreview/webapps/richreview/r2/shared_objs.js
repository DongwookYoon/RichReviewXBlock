/** Constants */
var r2Const = (function () {
    "use strict";

    var pub = {};

    // piece
    pub.PIECE_LINE_WIDTH = 0.00075;
    pub.PIECE_LINE_DASH = 0.01;
    pub.PIECE_TEXTTEARING_INDENT = 0.012;

    // piece audio
    pub.PIECEAUDIO_TIME_PER_WIDTH = 10000;
    pub.PIECEAUDIO_HEIGHT = 0.02;
    pub.PIECEAUDIO_STEP_W = 0.005;
    pub.PIECEAUDIO_STEP_T = pub.PIECEAUDIO_TIME_PER_WIDTH*pub.PIECEAUDIO_STEP_W;
    pub.PIECEAUDIO_LINE_WIDTH = 0.001;

    // piece keyboard
    pub.PIECEKEYBOARD_PRIVATE_SHIFT_X = 0.1;
    pub.PIECEKEYBOARD_FONTSIZE = 13/920;

    // spotlight
    pub.SPLGHT_WIDTH = 0.04;
    pub.SPLGHT_PRIVATE_WIDTH = 0.025;

    // inks
    pub.INK_WIDTH = 0.001;

    // page navbar
    pub.NAVBAR_PAGES_N = 5; // should be an odd number

    // page rendering
    pub.MAX_CANVS_N = 15;

    // radial menu
    pub.RADIAL_MENU_ITEM_N = 4;
    pub.RADIALMENU_OFFSET_X = 0.021;
    pub.RADIALMENU_SIZE = 19/920; // 23 pixel on the 920 px width screen
    pub.RADIALMENU_RADIUS = pub.RADIALMENU_SIZE*1.6*0.5; // 23px*1.6em/2

    // on screen btn
    pub.ONSCRBTN_SIZE = 13/920;

    // mouse click control
    pub.MOUSE_CLICK_DIST_CRITERIA = 5;

    // legacy
    pub.LEGACY_USERNAME = "__legacy_username";

    // timeouts
    pub.TIMEOUT_MINIMAL = 10;
    pub.TIMEOUT_FRAMERATE = 1000/30;
    pub.TIMEOUT_RESIZE_DELAY = 100;
    pub.TIMEOUT_PRIVATE_HIGHLIGHT_UPDATE = 5*1000;

    // db sync polling interval
    pub.DB_SYNC_POLLING_INTERVAL = 5*1000; // 5 secs

    // error message
    pub.ERROR_MSG = "We caught an invalid operation of the system. Please refresh the webpage, and report this error to the system manager (dy252@cornell.edu). The report is the most helpful when you Copy and Paste the following error message. Thank you!";

    return pub;
})();

/** Web app main */
var r2App = (function() {
    "use strict";

    var pub = {};

    pub.AppModeEnum = {
        IDLE : 0,
        REPLAYING : 1,
        RECORDING: 2
    };

    r2.util.setAjaxCsrfToken();

    pub.file_storage_url = "https://richreview.blob.core.windows.net/";
    pub.server_url = document.location.hostname == "localhost" ? "https://localhost:8001/" : "https://richreview.net/";

    pub.invalidate_static_scene = false;
    pub.invalidate_dynamic_scene = false;
    pub.invalidate_size = false;
    pub.invalidate_page_layout = false;
    pub.invalidate_dom = false;

    pub.mode = pub.AppModeEnum.IDLE;

    pub.is_first_error = true;

    pub.cur_time = 0;

    pub.cur_mouse_pt = new Vec2(-1, -1);

    pub.doc = null;
    pub.cur_page = null;
    pub.cur_pdf_pagen = 0;

    pub.cur_annot_id = null;
    pub.cur_audio_time = 0;

    pub.annots = {};
    pub.annot_private_spotlight = null;
    pub.pieces_cache = {};

    pub.selected_piece = null;
    pub.selected_radialmenu = null;

    pub.cur_recording_annot = null;
    pub.cur_recording_pieceaudios = null;
    pub.cur_recording_minmax = [0.05, 0.25];
    pub.cur_recording_spotlight = null;
    pub.cur_recording_spotlight_segment = null;
    pub.cur_recording_spotlight_segment_piece = null;
    pub.cur_recording_spotlight_pt = null;
    pub.cur_focused_piece_keyboard = null;

    pub.splight_prerender = null;
    pub.splight_prerender_ctx = null;


    pub.ctrlkey_dn = false;

    pub.docid = null;
    pub.groupid = null;

    pub.recording_trigger = false;

    pub.url_queries = new r2.util.urlQuery(location.search);

    pub.pieceSelector = (function(){
        var pub = {};

        var selected_piece = null;

        pub.get = function(){
            return selected_piece;
        };

        pub.set = function(piece){
            selected_piece = piece;
        };

        pub.reset = function(){
            selected_piece = null;
        };

        pub.isNull = function(){
            return selected_piece === null;
        };

        pub.isSelected = function(piece){
            return selected_piece !== null && piece === selected_piece;
        };

        pub.update = function(cur_mouse_pt){
            var piece = r2App.cur_page.GetPieceByHitTest(r2.viewCtrl.mapScrToDoc(cur_mouse_pt));
            if(selected_piece !== piece){
                selected_piece = piece;
                r2App.invalidate_dynamic_scene = true;
                r2App.invalidate_dom = true;
            }
        };

        pub.draw = function(canvas_ctx){
            if(selected_piece)
                selected_piece.DrawSelected(canvas_ctx);
        };

        return pub;
    }());

    pub.asyncErr = (function(){
        var pub = {};
        var errs = [];
        pub.throw = function(err){
            errs.push(err);
        };
        pub.sync = function(){
            if(errs.length){
                var err = errs[0];
                errs = [];
                throw err;
            }
        };
        return pub;
    }());

    pub.SetCurPdfPageN = function(i){
        this.cur_pdf_pagen = i;
        this.cur_page = this.doc.GetPage(this.cur_pdf_pagen);
    };

    return pub;
})();