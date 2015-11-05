/**
 * Created by Dongwook on 11/2/2015.
 */

var env = require('./lib/env.js');
var mkdirp = require('mkdirp');
var js_utils = require("./lib/js_utils.js");
var azure = require('./lib/azure');
var Promise = require("promise");
var RedisClient = require('./lib/redis_client').RedisClient;
var crypto = require('crypto');
var spawn = require("child_process").spawn;


var downloader = (function(){
    var pub = {};

    var RGNS = {
        HEAD:0,
        LEFT:1,
        RGHT:2,
        FOOT:3
    };

    pub.run = function(course_id, submission_id, data){
        var azure_course_id = course_id.replace('_', '-');
        var pdf_filename = submission_id + '.pdf';
        var key = getSaltedSha1(data.email);
        var direcctory_path = 'cache/' + azure_course_id + '/' + key;
        var fullpath = '../' + direcctory_path + '/' + pdf_filename;

        return new Promise(function(resolve, reject) { // donwload
            if(data.status === 'Submitted'){
                resolve(true);
                return null;
                mkdirp('../' + direcctory_path);
                console.log('+', data.email, azure_course_id, key+'/'+pdf_filename, fullpath, direcctory_path);
                azure.BlobFileDownload(azure_course_id, key+'/'+pdf_filename, fullpath, function (err) {
                    if (err) {
                        reject(err)
                    }
                    else {
                        resolve(true);
                    }
                });
            }
            else{
                console.log('-', data.email);
                resolve(false);
            }
        }).then(
            function(to_run){
                if(to_run){
                    return runPythonProcess('../../node_server/' + direcctory_path, pdf_filename);
                }
                return null;
            }
        ).then(
            function(python_output){
                if(python_output === null){return;}
                console.log('Python processCourseSubmission output:');
                console.log(python_output);
                console.log(python_output.split('<page>'));
                var output = constructVsDoc(parsePcsData(python_output));
                var fs = require('fs');
                fs.writeFile('../' + direcctory_path + '/vs_doc.txt', JSON.stringify(output), function(err) {
                    if(err) {
                        return console.log(err);
                    }
                });
            }
        );
    };

    var getSaltedSha1 = function(email){
        var shasum = crypto.createHash('sha1');
        shasum.update(email+env.sha1_salt.netid);
        return shasum.digest('hex').toLowerCase();
    };

    var runPythonProcess = function(path, pdf){
        return new Promise(function(resolve, reject){
            var python_process = spawn('python',["../../django_server/lined_notebook/from_pdf.py", path, pdf]);

            var output = '';
            python_process.stdout.on('data', function(data){
                output += data;
                //console.log('python_process data: ', output);
            });
            python_process.stderr.on('data', function (data) {
                console.log('python_process stderr:', data);
            });
            python_process.on('close', function(code){
                console.log('python_process closed');
                resolve(output);
            });
            python_process.on('error', function (err) {
                console.log('python_process error:'+err);
                reject(err);
            });
        });
    };

    var constructVsDocPage = function(w, h, splits){
        var round2 = function(x){
            console.log(x);
            return Math.round(x * 100.0) / 100.0;
        };

        var margin = w*0.05;

        var page = {};
        page.bbox = [0, 0, w, h];
        page.rgns = [
            {
                ttX: round2(margin),
                ttW: round2(w-2*margin)
            },
            {
                ttX: 0.0,
                ttW: 0.5
            },
            {
                ttX: 0.0,
                ttW: 0.5
            },
            {
                ttX: round2(margin),
                ttW: round2(w-2*margin)
            }
        ];
        page.rgns[RGNS.HEAD].rects = [];
        var top_split = 0;
        splits.forEach(function(split){
            page.rgns[RGNS.HEAD].rects.push(
                [0, top_split, w, split]
            );
            top_split = split;
        });
        page.rgns[RGNS.HEAD].rects.push(
            [0, top_split, w, h]
        );
        page.rgns[RGNS.LEFT].rects = [
            [0, h, 0.5*w, h]
        ];
        page.rgns[RGNS.RGHT].rects = [
            [0.5*w, h, w, h]
        ];
        page.rgns[RGNS.FOOT].rects = [
            [0, h, w, h]
        ];
        for(var r = 0; r < 4; ++r){
            for(var p = 0, l = page.rgns[r].rects.length; p < l; ++p){
                for(var i = 0; i < 4; ++i) {
                    page.rgns[r].rects[p][i] = round2(page.rgns[r].rects[p][i]);
                }
            }
        }

        return page;
    };

    var parsePcsData = function(data){
        data = data.split('<page>');
        var pcs_pages = [];
        data.forEach(function(datum){
            if ( datum.slice(-9, -2) === '</page>' || datum.slice(-8, -1) === '</page>'){
                pcs_pages.push(datum.slice(0, -9));
            }
        });

        for(var i = 0, l = pcs_pages.length; i < l; ++i){
            pcs_pages[i] = JSON.parse(pcs_pages[i].replace(/'/g, '"'));
            console.log('# page :', i);
            console.log('w', pcs_pages[i].w);
            console.log('h:', pcs_pages[i].h);
            console.log('split_pts:', pcs_pages[i].split_pts.length);
            console.log('');
        }
        return pcs_pages;
    };

    var constructVsDoc = function(pcs_pages){
        var vs_doc = {};
        vs_doc.ver = 6;
        vs_doc.pages = [];
        for(var i = 0, l = pcs_pages.length; i < l; ++i){
            vs_doc.pages.push(constructVsDocPage(pcs_pages[i].w, pcs_pages[i].h, pcs_pages[i].split_pts));
        }
        return vs_doc
    };

    return pub;
}());

var uploader = (function(){
    var pub = {};

    pub.run = function(submissions){

    };

    return pub;
}());


exports.run = function(course_id, submission_id){

    RedisClient.HGET('crs:'+course_id, 'students').then(
        function(stus){
            var promises = JSON.parse(stus).map(function(stu){
                return RedisClient.HGET('stu:'+course_id+'_'+stu, 'submissions').then(
                    function(sub){
                        sub = JSON.parse(sub);
                        sub[submission_id].email = stu;
                        return sub[submission_id];
                    }
                );
            });
            return Promise.all(promises);
        }
    ).then(
        function(subs){
            if(true){ // download_and_process
                var promises = subs.map(function(sub){
                    return function(){
                        return downloader.run(course_id, submission_id, sub);
                    }
                });
            }
            else{ // upload
                Promise.denodeify(fs.readFile)(pdf_path, "binary").then(
                    function(pdf_str){
                        var shasum = crypto.createHash('sha1');
                        shasum.update(pdf_str);
                        _ctx.pdf_hash = shasum.digest('hex').toLowerCase();

                        var ctx = {
                            container: _ctx.pdf_hash,
                            blob: "doc.pdf",
                            blob_localfile_path:pdf_path
                        };

                        return azure.CreateContainerIfNotExist(ctx)
                }
            }
            return js_utils.serialPromiseFuncs(promises);
        }
    ).then(
        function(){
            RedisClient.end();
        }
    ).catch(
        function(err){
            console.log(err);
        }
    );
    /*
    var fs = require('fs');
    fs.readFile("pcs_output.txt", 'utf8', function(err, data) {
        if(err) {
            return console.log(err);
        }
        else{
            var json_vs_doc = constructVsDoc(parsePcsData(data));

            var fs = require('fs');
            fs.writeFile("pcs_output.json", JSON.stringify(json_vs_doc), function(err) {
                if(err) {
                    return console.log(err);
                }
            });
        }
    });
    RedisClient.end();
     */

};
