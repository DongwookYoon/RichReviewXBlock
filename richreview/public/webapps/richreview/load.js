(function(r2) {
    "use strict";
    r2.constructErrorMsg = function(is_lti){
        var msg = 'Interesting... The system caught an unexpected error. Please wait for a couple of minutes,';
        if(is_lti){
            msg += ' go back to the edX course page, and retry accessing this tool.'
        }
        else{
            msg += ' and refresh the page. '
        }
        msg +=  ' If it\'s the same, please copy-and-paste this error message and report this to the manager (dy252@cornell.edu).'
        return msg;
    };

    r2.CDN_URL = 'https://richreview.azureedge.net';
    r2.CDN_SUBURL = r2.CDN_URL+'/'+(window.location.hostname==='richreview'?'richreview':'localhost');

    r2.runSerialPromises = (function(){
        var runSerialPromises = function(promiseFuncs, rtns){
            if(typeof rtns === 'undefined'){
                rtns = [];
            }
            var run = promiseFuncs.shift();
            if(run){
                return run().then(
                    function(rtn){
                        rtns.push(rtn);
                        return runSerialPromises(promiseFuncs, rtns);
                    }
                ).catch(
                    function(err){
                        console.error(err);
                        rtns.push(err);
                        return runSerialPromises(promiseFuncs, rtns);
                    }
                );
            }
            else{
                return new Promise(function(resolve){
                    resolve(rtns);
                });
            }
        };
        return runSerialPromises;
    }());

    r2.makeLocalJs = function(url){
        return $.get(url)
            .then(function(data){
                var blob;
                try {
                    blob = new Blob([data], {type: 'application/javascript'});
                } catch (e) { // Backwards-compatibility
                    window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;
                    blob = new BlobBuilder();
                    blob.append(data);
                    blob = blob.getBlob();
                }
                return URL.createObjectURL(blob);
            });
    };


    r2.webappUrlMaps = (function(){
        var pub = {};

        var map = null;

        pub.init = function(src){
            if(src){
                map = src;
            }
        };

        pub.get = function(url){
            if(map === null){
                return '/static_viewer/'+url;
            }
            else{
                return map[url];
            }
        };

        return pub;
    })();

    r2.loadApp = function(webapp_url_maps){

        r2.webappUrlMaps.init(webapp_url_maps);

        var run = function(){
            var scripts = [
                ['https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.0/themes/smoothness/jquery-ui.css', 'css'],
                ['https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js', 'js'],
                [r2.CDN_URL + '/lib/font-awesome-4.6.3/css/font-awesome.min.css', 'css'],
                [r2.CDN_URL + '/lib/font-awesome-animation.min.css', 'css'],
                [r2.CDN_URL + '/lib/pdfjs/pdf.js', 'js'],
                [r2.CDN_URL + '/lib/sha1.js', 'js'],
                [r2.CDN_URL + '/lib/vec2.min.js', 'js'],
                [r2.CDN_URL + '/lib/bowser.js', 'js'],
                [r2.CDN_SUBURL + '/stylesheets/style.css', 'css'],
                [r2.CDN_SUBURL + '/lib_ext/recorder/recorder.js', 'js'],
                [r2.CDN_SUBURL + '/lib_ext/bluemix/bluemix_socket.js', 'js'],
                [r2.CDN_SUBURL + '/lib_ext/bluemix/bluemix_utils.js', 'js'],
                [r2.CDN_SUBURL + '/r2/audio_utils.js', 'js'],
                [r2.CDN_SUBURL + '/lib_ext/newspeak-ui.js', 'js'],
                [r2.CDN_SUBURL + '/lib_ext/transcription-ui.js', 'js'],
                [r2.CDN_SUBURL + '/r2/utils.js', 'js'],
                [r2.CDN_SUBURL + '/r2/helpers.js', 'js'],
                [r2.CDN_SUBURL + '/r2/shared_objs.js', 'js'],
                [r2.CDN_SUBURL + '/r2/model/dom_model.js', 'js'],
                [r2.CDN_SUBURL + '/r2/model/doc_model_legacy.js', 'js'],
                [r2.CDN_SUBURL + '/r2/model/doc_model.js', 'js'],
                [r2.CDN_SUBURL + '/r2/controller/controller_cmds.js', 'js'],
                [r2.CDN_SUBURL + '/r2/controller/controller_dbs.js', 'js'],
                [r2.CDN_SUBURL + '/r2/controller/controller_event.js', 'js'],
                [r2.CDN_SUBURL + '/r2/controller/controller_ctrl.js', 'js'],
                [r2.CDN_SUBURL + '/r2/controller/controller_recording.js', 'js'],
                [r2.CDN_SUBURL + '/r2/app.js', 'js']
            ];

            var promises = scripts.map(function(script){
                return function(){
                    var is_absolute_path = script[0].indexOf('http://') === 0 || script[0].indexOf('https://') === 0;
                    return loadScriptByUrlAndType(
                        is_absolute_path ? script[0] : r2.webappUrlMaps.get(script[0]), // url
                        script[1] // type
                    );
                };
            });

            r2.runSerialPromises(promises)
                .then(function(rtns){
                    for(var i = 0; i < rtns.length; ++i){
                        if(rtns[i].type === 'error'){
                            throw new Error('Cannot load a resource file: '+rtns[i].target.src)
                        }
                    }
                    return r2.makeLocalJs('https://richreview.azureedge.net/lib/pdfjs/pdf.worker.js') // prevent CORS issue
                        .then(function(local_url){
                            PDFJS.workerSrc = local_url;
                        });
                })
                .then(function(){
                    return r2.main.Run();
                })
                .catch(function(err){
                    console.error(err);
                    prompt(r2.constructErrorMsg(r2.ctx.lti), err);
                });
        };

        function loadScriptByUrlAndType(url, type){
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
                    elem.onload = resolve;
                    elem.onerror = function(err){reject(err);};
                    document.getElementsByTagName('head')[0].appendChild(elem);
                    $('#r2_app_container').append('.');
                    console.log('Loaded:', url);
                }
                else{
                    reject(new Error("Cannot load a resource file:" + url));
                }
            });
        }

        $('#r2_app_container').append('<br/>&nbsp;&nbsp;Launching Web App&nbsp;');

        run();
    };

}(window.r2 = window.r2 || {}));
