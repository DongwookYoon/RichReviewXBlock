(function(Pla) {
    "use strict";

    Pla.loadApp = function(path_prefix){
        var scripts = [
            ["pdfjs/pdf.js", "js"],
            ["bowser/bowser.min.js", "js"],
            ["utils.js", "js"],
            ["multicolumn.js", "js"],
            ["main.js", "js"]
        ];

        Pla.loadJsScript = function(url, type){
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

        var job = function(i){
            if(i !== scripts.length){
                return Pla.loadJsScript(path_prefix+scripts[i][0], scripts[i][1]).then(
                    function(){
                        return job(i+1);
                    }
                );
            }
            else{
                PDFJS.workerSrc = path_prefix+'pdfjs/pdf.worker.js';
                return Pla.ctrl.start();
            }
        };
        job(0).catch(
            function(err){
                alert(err);
                //ToDo redirect back to the webpage when failed to load a resource.
            }
        );
    };

}(window.Pla = window.Pla || {}));