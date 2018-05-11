#!/usr/bin/env node
var fs = require("fs");
var os = require("os");
const path = require("path");

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

/**
 * Sync the richreview web app
 *
 * comment made on 20180504
 */
var webAppSync = (function(){
    var HOSTNAME = os.hostname() === 'richreview' ? 'richreview' : 'localhost';
    var HASHFILE = HOSTNAME+'/richreview_webapp_hash.txt';
    // var WEBAPP_PATH = './../../webapps/richreview/'; // TODO: test and delete
    var WEBAPP_PATH = path.resolve(__dirname, '../../webapps/richreview/');

    var Promise = require("promise");
    var crypto = require('crypto');
    var azure = require('../lib/azure');
    var js_utils = require("../lib/js_utils");

    var files = null;

    var pub = {};
    pub.run = function(){
        return getBlobStorageHash()
            .then(function(storage_hash){
                var local_hash = getLocalFileHash(getLocalFileList());
                if(local_hash === storage_hash){
                    return;
                }
                else{
                    console.log('WebApp Updated:', storage_hash, ' (storage), ', local_hash, ' (local)');
                    return uploadLocalFile(getLocalFileList())
                        .then(function(resp){
                            console.log(resp);
                            return setBlobStorageHash(local_hash)
                        });
                }
            })
            .then(function(){
                console.log('WebAppSync successfully finished.');
            })
            .catch(function(err){
                console.error(err, err.stack);
            });
    };

    function getBlobStorageHash(){
        return azure.DoesBlobExist({container: 'cdn', blob: HASHFILE})
            .then(function(ctx){
                if(ctx.is_blob_exist){
                    return azure.GetBlobToText(ctx)
                        .then(function(ctx){
                            return ctx.text;
                        })
                }
                else{
                    return null;
                }
            })
    }

    function setBlobStorageHash(text){
        return azure.SetBlobFromText({container: 'cdn', blob: HASHFILE, text: text})
    }

    function getLocalFileList(){
        if(files){
            return files;
        }
        files = [];
        var all_files = [];
        js_utils.walkSync(WEBAPP_PATH, all_files);
        var valid_exts = ['.js', '.css', '.html'];
        for(var i in all_files){
            var path = all_files[i];
            for(var j in valid_exts){
                var valid_ext = valid_exts[j];
                if(path.slice(path.length-valid_ext.length, path.length) === valid_ext){
                    files.push(path);
                    break;
                }
            }
        }
        return files;
    }

    function getLocalFileHash(files){
        files.sort();
        var shasum = crypto.createHash('sha1');
        for(var i in files){
            shasum.update(files[i]);
            shasum.update(fs.readFileSync(files[i]).toString());
        }
        return shasum.digest('hex').toLowerCase();
    }

    function uploadLocalFile(files){
        var promises = files.map(function(file){
            return azure.CreateBlobFromLocalFile({
                container: 'cdn',
                blob: HOSTNAME+'/'+file.slice(WEBAPP_PATH.length, file.length),
                blob_localfile_path: file
            })
        });
        return Promise.all(promises)
    }

    return pub;
}());


var runServer = function() {
    var app = require('../app');
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

    /*require('https').createServer(
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
    );*/
    require('https').createServer(
        {
            key: fs.readFileSync(path.join(__dirname, '..', 'ssl/richreview_net.key')),
            cert: fs.readFileSync(path.join(__dirname, '..', 'ssl/richreview_net.crt')),
            ca: [fs.readFileSync(path.join(__dirname, '..', 'ssl/root.crt'))]
        },
        app.https
    ).listen(
        app.https.get('port'),
        function () {
            console.log('Express server listening on HTTPS port:', app.https.get('port'));
        }
    );
};


if(process.argv[2]){
    var process_course_submission = function(course_id, submission_id){
        var pcs = require('../process_course_submission');
        pcs.run(course_id, submission_id);
    };
    process_course_submission(process.argv[2], process.argv[3]);
}
else{
    webAppSync.run().then(function(){runServer();});
}
