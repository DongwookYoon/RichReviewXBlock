/**
 * Created by Dongwook on 12/13/2014.
 */


var SERVER_URL = null;
console.log("DEBUG: document.location.hostname="+document.location.hostname);
if (document.location.hostname === "localhost") {
    SERVER_URL = "https://localhost:8001/";
} else {
    SERVER_URL = "https://40.85.241.164:443/";
}
// else{SERVER_URL = "https://richreview.net/";}

var FILE_UPLOAD_URL = "upload";
var DOC_LAYOUT_UPLOAD_URL = SERVER_URL+"upload?mode=UploadDocLayout";

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

var FileList = (function(){
    "use strict";

    var pub = {};
    var file_list = [];
    var $ul_filelist = $(document.getElementById('ul_filelist'));
    var $btn_submit = $(document.getElementById('btn_submit'));
    var myuuid = "";
    var file_upload_error = false;

    $btn_submit.click(function(){
        try{
            FileInput.Disable();
            $(this).toggleClass('disabled', true);
            $btn_submit.text("NOW UPLOADING");
            console.log("Upload List");
            for (var i = 0, f; f = file_list[i]; i++) {
                console.log("    ", f.name);
            }

            GetUuid().then(
                UploadFiles
            ).then(
                MergePdfs
            ).then(
                loadMultiColumnAnalyzer
            ).catch(
                function(err){
                    $btn_submit.toggleClass("btn-primary", false);
                    $btn_submit.toggleClass("btn-danger", true);
                    $btn_submit.text("FAILED");
                    alert('Sorry, we failed to receive/analyze that PDF file. Please try again, and if the error recurs, please contact the system manager dy252@cornell.edu. Thank you.');
                    Helper.Util.HandleError(err);
                }
            );
        }
        catch(err){
            Helper.Util.HandleError(err);
        }
    });

    pub.Add = function(f){
        if(!TestDuplicate(f)){
            if(file_list.indexOf(f) < 0){
                file_list.push(f);
                UpdateDom();
            }
        }
        else{
            alert(f.name + " is already in the list.")
        }
    };

    /**
     * @returns {boolean}
     */
    function TestDuplicate(f){
        for (var i = 0; i < file_list.length; i++) {
            if(f.name == file_list[i].name){
                return true;
            }
        }
        return false;
    }

    function UpdateDom(){
        try{
            $ul_filelist.empty();
            for (var i = 0, f; f = file_list[i]; i++) {
                var li = document.createElement("li");
                $(li).toggleClass('list-group-item', true);
                $(li).toggleClass('upload-item', true);


                var btn_rmv = document.createElement("button");
                btn_rmv.file = f;
                btn_rmv.li = li;
                $(btn_rmv).toggleClass('btn', true);
                $(btn_rmv).toggleClass('btn-xs', true);
                $(btn_rmv).toggleClass('btn-primary', true);
                $(btn_rmv).toggleClass('float_right', true);
                btn_rmv.textContent = 'X';
                btn_rmv.onclick = function(){
                    $(this.li).remove();
                    file_list.splice(file_list.indexOf(this.file),1);
                };
                li.appendChild(btn_rmv);
                f.btn = btn_rmv;

                var p = document.createElement("p");
                p.textContent = f.name;
                $(p).toggleClass('upload-item-text', true);
                li.appendChild(p);
                f.li = li;

                li.appendChild($(document.createElement('div')).toggleClass('div-clear-both', true)[0]);

                $ul_filelist.append($(li));
            }
        }
        catch(err){
            Helper.Util.HandleError(err);
        }

    }
    function GetUuid(){
        return new Promise(function(resolve, reject){
            var posting = $.ajax({
                url: FILE_UPLOAD_URL+"?mode=GetUuid",
                data: "",
                cache: false,
                processData: false,
                contentType: false,
                type: 'POST'
            });
            posting.success(function(res){
                myuuid = res;
                console.log("UUID:", myuuid);
                resolve();
            });
            posting.fail(function(err){
                reject(err);
            });

        });
    }

    function UploadFiles(){
        return new Promise(function(resolve, reject){
            function UploadFile(idx){
                if(idx == 0){
                    file_upload_error = false;
                }
                if(file_list.length != idx){
                    $(file_list[idx].li).toggleClass('inprogress', true);
                    if(file_list[idx].size > 8700000){
                        var f = file_list[idx];
                        $(f.li).toggleClass('failed', true);
                        $(f.btn).text("File is too big");
                        $(f.btn).prop('disabled', true);
                        $(f.btn).toggleClass('btn-danger', true);
                        reject(new Error("File should be smaller than 7.5 MB"))
                    }
                    else{
                        var data = new FormData();
                        data.append('file', file_list[idx]);
                        var posting = $.ajax({
                            url: FILE_UPLOAD_URL+"?mode=UploadFile&uuid="+myuuid+"&fileidx="+idx,
                            data: data,
                            cache: false,
                            processData: false,
                            contentType: false,
                            type: 'POST'
                        });
                        posting.success(function(res){
                            var f = file_list[idx];
                            console.log('file post success:', f.name);

                            $(f.li).toggleClass('success', true);
                            f.btn.textContent = "Done";
                            $(f.btn).toggleClass('btn-success', true);
                            f.btn.onclick = function(){
                                window.prompt("Link to the RichReviewWebApp Document", res);
                                console.log(res.responseText);
                            };
                            UploadFile(idx+1);
                        });
                        posting.fail(function(err){
                            file_upload_error = true;

                            var f = file_list[idx];
                            $(f.li).toggleClass('failed', true);
                            $(f.btn).text(err.responseText);
                            $(f.btn).prop('disabled', true);
                            $(f.btn).toggleClass('btn-danger', true);

                            UploadFile(idx+1);
                        });
                    }
                }
                else{
                    if(file_upload_error){
                        reject("File upload failed");
                    }
                    else{
                        resolve();
                    }
                }
            }
            UploadFile(0);
        });
    }

    function MergePdfs(){
        return new Promise(function(resolve, reject){
            var posting = $.ajax({
                url: FILE_UPLOAD_URL+"?mode=MergePdfs&uuid="+myuuid,
                data: "",
                cache: false,
                processData: false,
                contentType: false,
                type: 'POST'
            });
            posting.success(function(){
                $btn_submit.toggleClass("btn-primary", false);
                $btn_submit.toggleClass("btn-danger", false);
                $btn_submit.toggleClass("btn-success", true);
                $btn_submit.text("DONE");
                resolve();
            });
            posting.fail(function(err){
                reject(err);
            });
        });
    }

    function loadMultiColumnAnalyzer(){
        $("#multicolumn").toggleClass("show", true);
        (function(Pla){
            var doc_url = SERVER_URL + 'mupla_pdfs/' + myuuid + '/';
            Pla.ctx = {
                pdf_url: doc_url + 'merged.pdf',
                js_url: doc_url + 'merged.js'
            };
            Pla.override = {};
            Pla.override.done = function(doc_layout_js){
                var posting = $.ajax(
                    {
                        type: 'POST',
                        url: DOC_LAYOUT_UPLOAD_URL + "&uuid="+myuuid,
                        data: JSON.stringify(doc_layout_js),
                        contentType:"application/jsonrequest"
                    }
                );

                posting.success(function(group_url){
                    window.location.replace(group_url);
                });

                posting.fail(function(err){
                    Helper.Util.HandleError(err);
                    window.location.replace(SERVER_URL + "upload");
                });
            };
            Pla.override.error = function(){
                window.location.replace(SERVER_URL + "upload");
            };

            return loadJsScript("/static_multicolumn/load.js", "js").then(
                getWebAppUrls // set Pla.app_urls in here
            ).then(
                function(){
                    Pla.loadApp(Pla.app_urls);
                }
            );



        }(window.Pla = window.Pla || {}));
    }

    return pub;
})();


var FileInput = (function(){
    var pub = {};
    var $file_input = $(document.getElementById('file_input'));
    $file_input.change(OnFileInputChange);

    pub.Reset = function(){
        $file_input.wrap('<form>').closest('form').get(0).reset();
        $file_input.unwrap();
    };

    pub.Disable = function(){
        $file_input.prop('disabled', true);
    };

    function OnFileInputChange(event){
        try{
            var files = event.target.files; // FileList object
            for (var i = 0; i < files.length; i++) {
                FileList.Add(files[i]);
            }
            pub.Reset();
        }
        catch(err){
            Helper.Util.HandleError(err);
        }
    }

    return pub;
})();

var DropZone = (function(){
    var $drop_zone =  $(document.getElementById('drop_zone'));

    $drop_zone.get(0).ondrop = function(e) {
        try{
            e.preventDefault();
            $drop_zone.toggleClass("highlight", false);

            var files = e.dataTransfer.files; // FileList object
            for (var i = 0; i < files.length; i++) {
                FileList.Add(files[i]);
            }
            FileInput.Reset();
        }
        catch(err){
            Helper.Util.HandleError(err);
        }
    };

    $drop_zone.get(0).ondragover = function() {
        $drop_zone.toggleClass("highlight", true);
        return false;
    };

    $drop_zone.get(0).ondragleave = function() {
        $drop_zone.toggleClass("highlight", false);
        return false;
    };
})();


var getWebAppUrls = function(){
    return new Promise(function(resolve, reject){
        $.get('/resources?op=get_multicolumn_webapp_urls')
            .success(function(data){
                Pla.app_urls = data;
                resolve();
            }).error(function(jqXHR, textStatus, errorThrown) {
                reject(errorThrown);
            });
    });
};

var checkPlatform = function(){
    var is_mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    var is_supported_browser = bowser.chrome || bowser.firefox || bowser.safari || bowser.msedge;
    if(is_mobile) {
        $('.container').find('#multicolumn').remove();
        var $well = $('.well');
        $well.empty();
        var $p = $(document.createElement('h5'));
        $p.text('Sorry! The upload feature is not supported on mobile platform yet. Please try again on your laptop or desktop.');
        $well.append($p);
    }
    else if(!is_supported_browser){
        $('.container').find('#multicolumn').remove();
        var $well = $('.well');
        $well.empty();
        var $p = $(document.createElement('h5'));
        $p.text('Sorry! RichReview only supports Chrome, Firefox, Safari, or MS Edge browsers. But you are using something else...');
        $well.append($p);
    }
};