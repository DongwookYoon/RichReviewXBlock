#!/usr/bin/env node

if(typeof v8debug === 'object'){
    process.env.NODE_ENV = 'development';
}
else{
    process.env.NODE_ENV = 'production'; // should be placed before require(app)
}
console.log('App NODE_ENV:', process.env.NODE_ENV);


var env = require('../lib/env.js');
// patching the fs module prevents the EMFILE error
var realFs = require('fs');
var gracefulFs = require('graceful-fs');
gracefulFs.gracefulify(realFs);


var run = function() {
    var app = require('../app');
    var fs = require("fs");
    var os = require("os");
    var hostname = os.hostname();
    if (hostname == 'richreview') { // on richreview.net
        httpsPort = 443;
        httpPort = 80;
    }
    else{ // on localhost
        httpsPort = 8001;
        httpPort = 8002;
    }

    process.setMaxListeners(0);

    app.https.set('port', process.env.PORT || httpsPort);
    app.http.set('port', process.env.PORT || httpPort);

    require('http').createServer(app.http).listen(
        app.http.get('port'),
        function () {
            console.log('Express server listening on HTTP port:', app.http.get('port'));
        }
    );

    require('https').createServer(
        {
            key: fs.readFileSync('../ssl/richreview_net.key'),
            cert: fs.readFileSync('../ssl/richreview_net.crt'),
            ca: [fs.readFileSync('../ssl/root.crt')]
        },
        app.https
    ).listen(
        app.https.get('port'),
        function () {
            console.log('Express server listening on HTTPS port:', app.https.get('port'));
        }
    );
};

var packingRichReviewJsFiles = function(){
    "use strict";
    console.log(env.path.webapp_richreview);
    /*
    return new Promise(function (resolve, reject) {
        azure.svc.createBlockBlobFromText(_ctx.pdf_hash, "doc.vs_doc", JSON.stringify(_ctx.doclayout), function(err, resp){
            if(err){
                reject(err);
            }
            else{
                resolve(_ctx);
            }
        });
    });*/
};

if(process.argv[2]){
    var process_course_submission = function(course_id, submission_id){
        var pcs = require('../process_course_submission');
        pcs.run(course_id, submission_id);
    };
    process_course_submission(process.argv[2], process.argv[3]);
}
else{
    //packingRichReviewJsFiles();
    run();
}
