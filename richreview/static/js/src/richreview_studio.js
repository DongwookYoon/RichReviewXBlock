/* Javascript for RichReviewXBlock. */

function RichReviewXBlockStudio(runtime, element) {
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

        var pdfupload_url = runtime.handlerUrl(element, 'pdfupload');
        var pdfjsupload_url = runtime.handlerUrl(element, 'pdfjsupload');

        $("#pdf_upload_button").click(
            function(){
                var $form = $("#pdfupload_form");
                if($form.find("input")[0].files.length === 0){
                    alert("Please select a PDF file and a JS file");
                    return;
                }

                var formData = new FormData($form[0]);
                $.ajax(
                    {
                        url: pdfupload_url,
                        type: "POST",
                        data: formData,
                        success: function(resp){
                            runMultiColumnAnalyzer(resp);
                        },
                        error: function(err){
                            alert(JSON.stringify(err));
                        },
                        processData: false,
                        contentType: false
                    }
                );
            }
        );

        var normalizeUrl = function(url){
            var protocols = {x:'http://', o:'https://'};
            if(location.protocol === protocols.x){
                protocols.x = [protocols.o, protocols.o = protocols.x][0]; // swap
            }

            if(url.substring(0, protocols.x.length) === protocols.x){
                url = protocols.o + url.substring(protocols.x.length);
            }
            return url;
        };

        var runMultiColumnAnalyzer = function(ctx){
            $("#multicolumn").toggleClass("show", true);

            var webapp_url = normalizeUrl(ctx.multicolumn_webapp_url);

            loadJsScript(webapp_url + '/load.js', 'js').then(
                function(){
                    (function(Pla) {
                        Pla.ctx = ctx;
                        Pla.ctx.doc_layout_upload_url = pdfjsupload_url;

                        Pla.override = {};
                        Pla.override.done = function(pla_result){
                            promisifyXBlockRuntime(runtime, element, "pdfjsupload", pla_result).then(
                                function(resp){
                                    alert("The PDF file was successfully uploaded.");
                                }
                            ).catch(
                                function(resp){
                                    alert("Error");
                                }
                            );
                        };
                        Pla.override.error = function(err){
                            alert(JSON.stringify(err));
                        };
                        Pla.loadApp(webapp_url + '/');
                    }(window.Pla = window.Pla || {}));
                }
            );

        };

        $("#pdf_delete_button").click(
            function(){
                promisifyXBlockRuntime(runtime, element, "pdfdelete", {}).then(
                    function(){
                        alert('Files were deleted successfully');
                        $('#existing_doc').toggleClass('hide');
                    }
                ).catch(
                    function(err){
                        alert(JSON.stringify(err));
                    }
                );
            }
        );

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

    }(jQuery, Promise));
}
