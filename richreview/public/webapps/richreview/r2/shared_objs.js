/** Constants */
var r2Const = (function () {
    "use strict";

    var pub = {};

    // piece
    pub.PIECE_LINE_WIDTH = 0.00075;
    pub.PIECE_LINE_DASH = 0.01;
    pub.PIECE_SELECTION_LINE_WIDTH = 0.0015;
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
    pub.ERASER_RADIUS = 0.01;

    // page navbar
    pub.NAVBAR_PAGES_N = 5; // should be an odd number

    // page rendering
    pub.MAX_CANVS_N = 15;

    // radial menu
    pub.RADIAL_MENU_ITEM_N = 4;
    pub.RADIALMENU_OFFSET_X = 0.021;
    pub.RADIALMENU_SIZE = 19/920; // 23 pixel on the 920 px width screen
    pub.RADIALMENU_RADIUS = pub.RADIALMENU_SIZE*1.6*0.5; // 23px*1.6em/2
    pub.RAIDALMENU_FONTSIZE_SCALE = 100; // this is required to circumvent minimum font size setting
    pub.FONT_SIZE_SCALE = 50;

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
    pub.TIMEOUT_STATIC_INK_UPDATE = 5*1000;


    // db sync polling interval
    pub.DB_SYNC_POLLING_INTERVAL = 5*1000; // 5 secs

    // error message
    pub.ERROR_MSG =
        'We caught an invalid operation of the system. ' +
        'Refresh the webpage, and if the error Recurs, please report this message to the system manager (dy252@cornell.edu). ' +
        'The report is the most helpful when you Copy and Paste the following error message. Thank you!';

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

    pub.RecordingUI = {
        WAVEFORM : 0,
        SIMPLE_SPEECH : 1,
        NEW_SPEAK: 2
    };

    r2.util.setAjaxCsrfToken();

    pub.file_storage_url = "https://richreview.blob.core.windows.net/";
    pub.server_url = document.location.hostname == "localhost" ? "https://localhost:8001/" : "https://richreview.net/";

    pub.bluemix_tts_auth_context = null;
    pub.invalidate_static_scene = false;
    pub.invalidate_dynamic_scene = false;
    pub.invalidate_size = false;
    pub.invalidate_page_layout = false;

    pub.mode = pub.AppModeEnum.IDLE;
    pub.disable_comment_production = false;

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
    pub.annot_static_ink = null;
    pub.pieces_cache = {};


    pub.cur_recording_annot = null;
    pub.cur_recording_pieceaudios = null;
    pub.cur_recording_anchor_piece = null;
    pub.cur_recording_minmax = [0.05, 0.25];
    pub.cur_focused_piece_keyboard = null;

    pub.splight_prerender = null;
    pub.splight_prerender_ctx = null;

    pub.docid = null;
    pub.groupid = null;

    pub.url_queries = new r2.util.urlQuery(location.search);

    pub.pieceSelector = (function(){
        var pub_ps = {};

        var selected_piece = null;

        pub_ps.get = function(){
            return selected_piece;
        };

        pub_ps.set = function(piece){
            if(typeof piece === 'string'){
                selected_piece = pub.pieces_cache[piece];
            }
            else{
                selected_piece = piece;
            }
            r2App.invalidate_dynamic_scene = true;
        };

        pub_ps.reset = function(){
            selected_piece = null;
        };

        pub_ps.isNull = function(){
            return selected_piece === null;
        };

        pub_ps.isSelected = function(piece){
            return selected_piece !== null && piece === selected_piece;
        };

        pub_ps.update = function(cur_mouse_pt){
            if(r2.mouse.mode !== r2.MouseModeEnum.HOVER){return}
            var piece_dy_obj = r2App.cur_page.GetPieceOfClosestBottom(r2.viewCtrl.mapScrToDoc(cur_mouse_pt));
            if(selected_piece !== piece_dy_obj[1]){ // piece[0] is dy, piece[1] is the obj.
                selected_piece = piece_dy_obj[1];
                r2App.invalidate_dynamic_scene = true;
            }
        };

        pub_ps.draw = function(canvas_ctx){
            if(selected_piece){
                if(selected_piece.DrawSelected){
                    selected_piece.DrawSelected(canvas_ctx);
                }
            }
        };

        return pub_ps;
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
        pub.cur_pdf_pagen = i;
        pub.cur_page = pub.doc.GetPage(pub.cur_pdf_pagen);
    };

    pub.annotStaticInkMgr = (function(){
        var pub = {};

        var annots = [];

        pub.addNewUser = function(user){
            var annot_static_ink_id = user.GetAnnotStaticInkId();
            if(r2App.annots[annot_static_ink_id]){ // do nothing if the annot exists already
                return;
            }
            else{
                var annot = new r2.AnnotStaticInk();
                annots.push(annot);
                annot.SetAnnot(annot_static_ink_id, null, 0, 0, [], user.name, '');
                r2App.annots[annot_static_ink_id] = annot;
            }
        };

        pub.setCurUser = function(user){
            r2App.annot_static_ink = r2App.annots[user.GetAnnotStaticInkId()];
        };

        pub.getAnnots = function(){
            return annots;
        };

        pub.checkCmdToUploadExist = function(){
            for(var i = 0; i < annots.length; ++i){
                if(annots[i].checkCmdToUploadExist()){
                    return true;
                }
            }
            return false;
        };

        return pub;
    }());

    return pub;
})();