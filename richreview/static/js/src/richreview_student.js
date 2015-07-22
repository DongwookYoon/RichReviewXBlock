/* Javascript for RichReviewXBlock. */

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

var disableWheelSelectively = function(){
    function preventDefault(e) {
        e = e || window.event;
        if (e.preventDefault)
            e.preventDefault();
        e.returnValue = false;
    }
    function wheel(e) {
        preventDefault(e);
    }
    function disableScroll(){
        if (window.addEventListener) {
            window.addEventListener('DOMMouseScroll', wheel, false);
        }
        window.onmousewheel = document.onmousewheel = wheel;
    }
    function enableScroll(){
        if (window.removeEventListener) {
            window.removeEventListener('DOMMouseScroll', wheel, false);
        }
        window.onmousewheel = document.onmousewheel = null;
    }
    $(document.getElementById('r2_iframe')).on( "mouseenter", disableScroll );
    $(document.getElementById('r2_iframe')).on( "mouseleave", enableScroll );
};

var promisifyXBlockRuntime = function(runtime, element, handle_name, json_data){
    return new Promise(function(resolve, reject){
        $.ajax({
            url: runtime.handlerUrl(element, handle_name),
            type: "POST",
            data: JSON.stringify(json_data),
            success: resolve,
            error: reject
        });
    });
};


var loadRichReview = function(runtime, element){
    var app_url = "";
    promisifyXBlockRuntime(runtime, element, "app_addr", {}).then(
        function(resp){
            app_url = location.protocol + "//" + resp["url"];
            return loadJsScript(app_url+"/load.js", "js")
        }
    ).then(
        function(){
            return promisifyXBlockRuntime(runtime, element, "get_richreview_context", {});
        }
    ).then(
        function(resp){
            (function(r2){
                r2.platform = 'edx';
                r2.scroll_wrapper = window;
                r2.ctx = {
                    pdfid: resp["pdfid"],
                    docid: resp["docid"],
                    groupid: resp["groupid"],
                    pdf_url: resp["pdf_url"],
                    pdfjs_url: resp["pdfjs_url"],
                    serve_dbs_url: runtime.handlerUrl(element, 'serve_dbs')+'?',
                    upload_audio_url: runtime.handlerUrl(element, 'upload_audio')+'?',
                    pmo: "",
                    comment: ""
                };
                r2.loadApp(app_url+"/");
            }(window.r2 = window.r2 || {}));
        }
    ).catch(
        function(err){
            alert(JSON.stringify(err));
        }
    );
};

function RichReviewXBlock(runtime, element) {

    if($("#r2_app_container")[0]){ // when the instructor posted a PDF,
        disableWheelSelectively();

        loadRichReview(runtime, element);
    }

    $("#test_a").click(
        function(){
            promisifyXBlockRuntime(runtime, element, "test", {op: "reload_webapp"}).catch(
                function(err){
                    alert(JSON.stringify(err));
                }
            );
        }
    );

    $("#test_b").click(
        function(){
            promisifyXBlockRuntime(runtime, element, "test", {op: "test_mupla"}).catch(
                function(err){
                    alert(JSON.stringify(err));
                }
            );
        }
    );
}
