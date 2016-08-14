(function(r2) {
    "use strict";
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
                ['https://code.jquery.com/ui/1.11.4/themes/ui-lightness/jquery-ui.css', 'css'],
                ['https://code.jquery.com/ui/1.11.4/jquery-ui.js', 'js'],
                ['https://maxcdn.bootstrapcdn.com/font-awesome/4.3.0/css/font-awesome.min.css', 'css'],
                ['https://cdnjs.cloudflare.com/ajax/libs/font-awesome-animation/0.0.9/font-awesome-animation.min.css', 'css'],
                ['https://richreview.azureedge.net/richreview/lib_ext/pdfjs/pdf.js', 'js'],
                ['https://richreview.azureedge.net/richreview/lib_ext/sha1.js', 'js'],
                ['https://richreview.azureedge.net/richreview/lib_ext/vec2.min.js', 'js'],
                ['https://richreview.azureedge.net/richreview/lib_ext/bowser.min.js', 'js'],
                ['stylesheets/style.css', 'css'],
                ['lib_ext/recorder/recorder.js', 'js'],
                ['lib_ext/bluemix/bluemix_socket.js', 'js'],
                ['lib_ext/bluemix/bluemix_utils.js', 'js'],
                ['r2/audio_utils.js', 'js'],
                ['r2/utils.js', 'js'],
                ['r2/helpers.js', 'js'],
                ['r2/shared_objs.js', 'js'],
                ['r2/model/dom_model.js', 'js'],
                ['r2/model/doc_model_legacy.js', 'js'],
                ['r2/model/doc_model.js', 'js'],
                ['r2/controller/controller_cmds.js', 'js'],
                ['r2/controller/controller_dbs.js', 'js'],
                ['r2/controller/controller_event.js', 'js'],
                ['r2/controller/controller_ctrl.js', 'js'],
                ['r2/controller/controller_recording.js', 'js'],
                ['r2/app.js', 'js']
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
                .then(function(){
                    return r2.makeLocalJs('https://richreview.azureedge.net/richreview/lib_ext/pdfjs/pdf.worker.js') // prevent CORS issue
                        .then(function(local_url){
                            PDFJS.workerSrc = local_url;
                        });
                })
                .then(function(){
                    return r2.main.Run();
                })
                .catch(function(err){
                    //ToDo redirect back to the webpage when failed to load a resource.
                    console.log(err);
                    alert(err);
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
                    elem.onerror = function(){reject()};
                    document.getElementsByTagName('head')[0].appendChild(elem);
                    $('#r2_app_container').append('&nbsp;&nbsp;&nbsp;&nbsp;'+url+'<br/>');
                }
                else{
                    reject(new Error("    Cannot load a resource file:" + url));
                }
            });
        }

        $('#r2_app_container').append('<br/><p>&nbsp;&nbsp;Launching Web App</p>');

        run();
    };

}(window.r2 = window.r2 || {}));
