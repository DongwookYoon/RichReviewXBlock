#!/usr/bin/env node

const util = require('../util');

// import built-in modules
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require('crypto');

// import npm modules
const Promise = require("promise"); // jshint ignore:line

/**
 * Set the environment to development
 *
 * should be placed before require(app)
 */
if(
  typeof v8debug === 'object'       ||
  os.hostname() !== "richreview"    ||
  os.hostname() !== "richreview-vm"
) {
    process.env.NODE_ENV = 'development';
} else {
    process.env.NODE_ENV = 'production';
}

// import libraries (depends on Node environment)
const env = require('../lib/env');
const file_utils = require('../lib/file_utils');
const azure = require('../lib/azure');
// const js_utils = require("../lib/js_utils");

const HOSTNAME = os.hostname() === 'richreview' ? 'richreview' : 'localhost';
const HASHFILE = HOSTNAME+'/richreview_webapp_hash.txt';
const WEBAPP_PATH = path.resolve(__dirname, '../../webapps/richreview/');

util.start('App NODE_ENV:'+process.env.NODE_ENV);
util.start('App hostname:'+os.hostname());

/**
 * Sync the richreview web app
 */
var webAppSync = (function(){
    var files = null;

    var pub = {};
    pub.run = function() {
        util.start("doing web-app sync");
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
                        });
                }
                else{
                    return null;
                }
            });
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
        file_utils.walkSync(WEBAPP_PATH, all_files);
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
                blob: HOSTNAME+file.slice(WEBAPP_PATH.length, file.length),
                blob_localfile_path: file
            });
        });
        return Promise.all(promises);
    }

    return pub;
}());


const runServer = () => {
    const app = require('../app');

    let httpsPort = null;
    let httpPort = null;

    //if (HOSTNAME === 'richreview') { // on richreview.net
    if (process.env.NODE_ENV === 'production') {
        httpsPort = 443;
        httpPort = 80;
    } else{ // on localhost
        httpsPort = 8001;
        httpPort = 8002;
    }

    process.setMaxListeners(0);

    app.https.set('port', process.env.PORT || httpsPort);
    app.http.set('port', process.env.PORT || httpPort);

    require('http').createServer(app.http).listen(
        app.http.get('port'),
        function () {
            util.start("listening on HTTP port: " + app.http.get('port'));
        }
    );

    require('https').createServer(
        {
            key: env.ssl_key,
            cert: env.ssl_cert,
            ca: [env.ssl_ca]
        },
        app.https
    ).listen(
        app.https.get('port'),
        function () {
            util.start("listening on HTTPS port: " + app.https.get('port'));
        }
    );
};

if(process.env.NODE_ENV === 'production') {
    webAppSync.run().then(() => {
        runServer();
    });
} else {
    util.start("skipping web-app sync");
    runServer();
}

/*if(process.argv[2]){
    var process_course_submission = function(course_id, submission_id) {
        var pcs = require('../process_course_submission');
        pcs.run(course_id, submission_id);
    };
    process_course_submission(process.argv[2], process.argv[3]);
}
else{
    webAppSync.run().then(function(){runServer();});
}*/
