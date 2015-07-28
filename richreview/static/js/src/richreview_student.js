/* Javascript for RichReviewXBlock. */

function RichReviewXBlock(runtime, element) {
    "use strict";

    (function($, Promise){


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


        var normalizeUrl = function(url){
            var protocols = {x:'http://', o:'https://'};
            if(location.protocol + '//' === protocols.x){
                protocols.x = [protocols.o, protocols.o = protocols.x][0]; // swap
            }
            if(url.substring(0, protocols.x.length) === protocols.x){
                url = protocols.o + url.substring(protocols.x.length);
            }
            else if(url[0] !== '/'){
                url = protocols.o + url;
            }
            return url;
        };

        var loadRichReview = function(runtime, element){
            var r2_ctx;
            promisifyXBlockRuntime(runtime, element, "get_richreview_context", {}).then(
                function(resp){
                    r2_ctx = resp;
                    r2_ctx.app_url = normalizeUrl(r2_ctx.app_url);

                    return loadJsScript(r2_ctx.app_url+"/load.js", "js");
                }
            ).then(
                function(){
                    (function(r2){
                        r2.platform = 'edx';
                        r2.scroll_wrapper = window;
                        r2.ctx = r2_ctx;
                        r2.ctx.serve_dbs_url = runtime.handlerUrl(element, 'serve_dbs')+'?';
                        r2.ctx.upload_audio_url = runtime.handlerUrl(element, 'upload_audio')+'?';
                        r2.ctx.pmo = "";
                        r2.ctx.comment = "";
                        r2.loadApp(r2_ctx.app_url+"/");
                    }(window.r2 = window.r2 || {}));
                }
            ).catch(
                function(err){
                    alert(err);
                }
            );
        };

        if($("#r2_app_container")[0]){ // when the instructor posted a PDF,
            loadRichReview(runtime, element);
        }

    }(jQuery, Promise));
}
