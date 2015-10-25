(function(r2) {
    "use strict";

    r2.loadJsScript = function(url, type){
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

    r2.loadApp = function(resource_urls){
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
			['r2/controller/controller_tablet.js', 'js'],
            ['r2/app.js', 'js']
        ];

        var job = function(i){
            if(i !== scripts.length){
                var path = scripts[i][0].substring(0, 8);
                if(scripts[i][0].substring(0, 7)==='http://' || scripts[i][0].substring(0, 8)==='https://'){
                    path = scripts[i][0];
                }
                else{
                    path = resource_urls[scripts[i][0]];
                }
                return r2.loadJsScript(path, scripts[i][1]).then(
                    function(){
                        return job(i+1);
                    }
                );
            }
            else{
                PDFJS.workerSrc = resource_urls['lib_ext/pdfjs/pdf.worker.js'];
                return r2.main.Run(resource_urls);
            }
        };
        job(0).catch(
            function(err){
                console.log(err);
                alert(err);
                //ToDo redirect back to the webpage when failed to load a resource.
            }
        );
    };

}(window.r2 = window.r2 || {}));

