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

    r2.loadApp = function(resource_urls){
        var run = function(){
            var scripts = [
                ['https://code.jquery.com/ui/1.11.4/themes/ui-lightness/jquery-ui.css', 'css'],
                ['https://code.jquery.com/ui/1.11.4/jquery-ui.js', 'js'],
                ['https://maxcdn.bootstrapcdn.com/font-awesome/4.3.0/css/font-awesome.min.css', 'css'],
                ['lib_ext/font-awesome-animation.min.css', 'css'],
                ['stylesheets/style.css', 'css'],
                ['lib_ext/pdfjs/pdf.js', 'js'],
                ['lib_ext/recorder/recorder.js', 'js'],
                ['lib_ext/sha1.js', 'js'],
                ['lib_ext/vec2.min.js', 'js'],
                ['lib_ext/bowser.min.js', 'js'],
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
                return function(){return loadScript(script);}
            });

            r2.runSerialPromises(promises).then(
                function(){
                    PDFJS.workerSrc = resource_urls['lib_ext/pdfjs/pdf.worker.js'];
                    return r2.main.Run(resource_urls);
                }
            ).catch(
                function(err){
                    console.log(err);
                    alert(err);
                    //ToDo redirect back to the webpage when failed to load a resource.
                }
            );
        };


        /* helpers */
        var loadScriptByUrlAndType = function(url, type){
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
                }
                else{
                    reject(new Error("Cannot load a resource file:" + url));
                }
            });
        };

        function loadScript(script){
            return new Promise(function(resolve, reject){
                var path = script[0].substring(0, 8);
                if(script[0].substring(0, 7)==='http://' || script[0].substring(0, 8)==='https://'){
                    path = script[0];
                }
                else{
                    path = resource_urls[script[0]];
                }
                loadScriptByUrlAndType(path, script[1]).then(
                    resolve
                ).catch(
                    reject
                );
            });
        }

        run();
    };

}(window.r2 = window.r2 || {}));
