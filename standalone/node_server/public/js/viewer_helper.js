/**
 * Created by dongwookyoon on 6/10/15.
 */


function loadRichReview(r2_ctx) {
    loadJsScript("/static_viewer/load.js", "js").then(
        function(){
            (function(r2){
                r2.platform = 'Azure';
                r2.scroll_wrapper = document.getElementById('r2_app_page');
                r2.ctx = JSON.parse(decodeURIComponent(r2_ctx));
                console.log('r2.ctx', r2.ctx.app_urls);
                r2.loadApp(r2.ctx.app_urls);
            }(window.r2 = window.r2 || {}));
        }
    );
}

var loadJsScript = function(url, type){
    return new Promise(function(resolve, reject){
        var elem = null;
        if(type === 'js'){
            elem = document.createElement('script');
            elem.type = 'text/javascript';
            elem.src = url;
        }
        else if(type === 'css'){
            elem = document.createElement('link');
            elem.rel = 'stylesheet';
            elem.type = 'text/CSS';
            elem.href = url;
        }
        if(elem){
            elem.onreadystatechange = resolve;
            elem.onload = resolve;
            elem.onerror = function(){reject(new Error("Cannot load a resource file:" + url));};
            document.getElementsByTagName('head')[0].appendChild(elem);
        }
        else{
            reject(new Error("Cannot load a resource file:" + url));
        }
    });
};


var resizePageBody = function(){
    var win_rect = {
        width: $(this).width(),
        height: $(this).height()
    };
    var navbar_rect = $("#r2_navbar")[0].getBoundingClientRect();

    var $app_page = $("#r2_app_page");
    $app_page.width(win_rect.width);
    $app_page.height(win_rect.height-navbar_rect.height);
};


$(document).ready(function () {
    resizePageBody();
});

$(window).on('resize', function(){
    resizePageBody();
});