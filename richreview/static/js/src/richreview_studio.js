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

        var uiCtrl = (function(){
            var pub = {};

            pub.bgnUploading = function(){
                $("#multicolumn").toggleClass('show', true);
                $('#r2_pdfupload').toggleClass('uploading', true);
                $('#existing_doc').toggleClass('hide', true);
            };

            pub.endUploading = function(msg){
                $('#r2_pdfupload').toggleClass('uploading', false);
                $('#r2_studio_block').toggleClass('uploaded', true);
                $("#multicolumn").toggleClass('show', false);
                alert(msg);
            };

            pub.bgnDeleting = function(){
                $('#existing_doc').toggleClass('deleting', true);
            };

            pub.endDeleting = function(msg){
                $('#existing_doc').toggleClass('deleting', false);
                alert(msg);
                $('#existing_doc').toggleClass('hide');
            };

            return pub;
        })();

        $("#pdf_upload_button").click(
            function(){
                uiCtrl.bgnUploading();
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

        var runMultiColumnAnalyzer = function(ctx){
            console.log(ctx.multicolumn_webapp_url);
            var webapp_url = normalizeUrl(ctx.multicolumn_webapp_url);
            console.log(webapp_url);

            loadJsScript(webapp_url + '/load.js', 'js').then(
                function(){
                    (function(Pla) {
                        Pla.ctx = ctx;
                        Pla.ctx.doc_layout_upload_url = pdfjsupload_url;

                        Pla.override = {};
                        Pla.override.done = function(pla_result){
                            console.log('Pla.override.done', pla_result);
                            promisifyXBlockRuntime(runtime, element, "pdfjsupload", pla_result).then(
                                function(resp){
                                    uiCtrl.endUploading("The PDF file was successfully uploaded.");
                                }
                            ).catch(
                                function(err){
                                    uiCtrl.endUploading(err);
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
                uiCtrl.bgnDeleting();

                promisifyXBlockRuntime(runtime, element, "pdfdelete", {}).then(
                    function(){
                        uiCtrl.endDeleting('Files were deleted successfully');
                    }
                ).catch(
                    function(err){
                        alert(JSON.stringify(err));
                    }
                );
            }
        );

    }(jQuery, Promise));
}
