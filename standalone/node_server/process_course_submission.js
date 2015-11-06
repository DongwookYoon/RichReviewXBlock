/**
 * Created by Dongwook on 11/2/2015.
 */

var fs = require('fs');
var env = require('./lib/env.js');
var spawn = require("child_process").spawn;
var crypto = require('crypto');
var mkdirp = require('mkdirp');
var Promise = require("promise");

var js_utils = require("./lib/js_utils.js");
var azure = require('./lib/azure');
var RedisClient = require('./lib/redis_client').RedisClient;
var R2D = require("./lib/r2d.js");

var INSTRUCTOR_EMAIL = 'dy252@cornell.edu';

var getSaltedSha1 = function(email){
    var shasum = crypto.createHash('sha1');
    shasum.update(email+env.sha1_salt.netid);
    return shasum.digest('hex').toLowerCase();
};

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
        var dir_path = 'cache/' + azure_course_id + '/' + key;
        var full_path = '../' + dir_path + '/' + pdf_filename;

        return new Promise(function(resolve, reject) { // donwload
            if(data.status === 'Submitted'){
                console.log('+', data.email, azure_course_id, key+'/'+pdf_filename);
                var skip_pdf_download = true;
                if(skip_pdf_download){
                    resolve(true);
                    return;
                }
                mkdirp('../' + dir_path);
                azure.BlobFileDownload(azure_course_id, key+'/'+pdf_filename, full_path, function (err) {
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
                    return runPythonProcess('../../node_server/' + dir_path, pdf_filename);
                }
                return null;
            }
        ).then(
            function(python_output){
                if(python_output === null){return;}
                var output = constructVsDoc(parsePcsData(python_output));
                var fs = require('fs');
                fs.writeFile('../' + dir_path + '/doc.vs_doc', JSON.stringify(output), function(err) {
                    if(err) {
                        return console.log(err);
                    }
                });
            }
        );
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
                console.error('python_process stderr:', data);
            });
            python_process.on('close', function(code){
                resolve(output);
            });
            python_process.on('error', function (err) {
                console.error('python_process error:'+err);
                reject(err);
            });
        });
    };

    var constructVsDocPage = function(w, h, splits){
        var round2 = function(x){
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
            /*console.log('# page :', i);
            console.log('w', pcs_pages[i].w);
            console.log('h:', pcs_pages[i].h);
            console.log('split_pts:', pcs_pages[i].split_pts.length);
            console.log('');*/
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

        var s = '';
        for(i = 0, l = pcs_pages.length; i < l; ++i){
            s += ' ' + pcs_pages[i].split_pts.length.toString();
        }
        console.log('    splits:', s);
        return vs_doc
    };

    return pub;
}());

var uploader = (function(){
    var pub = {};

    pub.run = function(course_id, submission_id, data){
        var azure_course_id = course_id.replace('_', '-');
        var pdf_filename = submission_id + '.pdf';
        var key = getSaltedSha1(data.email);
        var dir_path = 'cache/' + azure_course_id + '/' + key;
        var full_path = '../' + dir_path + '/' + pdf_filename;
        var pdf_hash = null;

        return new Promise(function(resolve, reject) { // donwload
            if(data.status === 'Submitted'){
                console.log('+', data.email, azure_course_id, key+'/'+pdf_filename, full_path, dir_path);
                resolve(true);
            }
            else{
                console.log('-', data.email);
                resolve(false);
            }
        }).then(
            function(to_run){
                if(!to_run){return;}
                return getFileSha1(full_path).then(
                    function(rtn){
                        pdf_hash = rtn;
                    }
                ).then(
                    function(){
                        return Promise.denodeify(azure.svc.createContainerIfNotExists.bind(azure.svc))(
                            pdf_hash,
                            { publicAccessLevel : 'blob' }
                        );
                    }
                ).then(
                    function(){ // upload the merged pdf
                        return Promise.denodeify(azure.svc.createBlockBlobFromLocalFile.bind(azure.svc))(
                            pdf_hash,
                            'doc.pdf',
                            '../' + dir_path + '/merged.pdf'
                        ).then(
                            function(rtn){
                                console.log('    uploaded:', azure.BLOB_HOST+pdf_hash+'/doc.pdf');
                            }
                        );
                    }
                ).then(
                    function(){ // upload the metadata file
                        return Promise.denodeify(azure.svc.createBlockBlobFromLocalFile.bind(azure.svc))(
                            pdf_hash,
                            'doc.vs_doc',
                            '../' + dir_path + '/doc.vs_doc'
                        )
                    }
                ).then(
                    function(){
                        return createCrsSubmissionDoc(
                            course_id,
                            submission_id,
                            data.email,
                            pdf_hash
                        );
                    }
                );

            }
        ).catch(
            function(err){
                console.error(err);
            }
        );
    };

    var getFileSha1 = function(path){
        return Promise.denodeify(fs.readFile)(path, "binary").then(
            function(pdf_str){
                var shasum = crypto.createHash('sha1');
                shasum.update(pdf_str);
                return shasum.digest('hex').toLowerCase();
            }
        );
    };

    var createCrsSubmissionDoc = function(course_id, subject_id, student_email, pdf_hash){
        var instructor_id = null;
        var student_id = null;
        var doc_id = null;
        var group_id = null;

        var getInstructorId = RedisClient.HGET(
            'email_user_lookup',
            INSTRUCTOR_EMAIL);
        var getStudentId = RedisClient.HGET(
            'email_user_lookup',
            student_email);

        return Promise.all([getInstructorId, getStudentId]).then( // get ids
            function(result){
                instructor_id = result[0];
                student_id = result[1];
                console.log(result);

                return R2D.Doc.CreateNew( // create doc
                    instructor_id.substring(4),
                    (new Date()).getTime(),
                    pdf_hash,
                    {course_id: course_id, subject_id: subject_id, student_email: student_email}
                )
            }
        ).then(
            function(_doc_id){ // create group
                doc_id = _doc_id;
                return R2D.Doc.AddNewGroup(instructor_id.substring(4), doc_id);
            }
        ).then(
            function(_group_id){ // add instructor
                group_id = _group_id;
                return R2D.Group.connectUserAndGroup(group_id.substring(4), instructor_id.substring(4));
            }
        ).then(
            function(){ // add group
                return R2D.Group.connectUserAndGroup(group_id.substring(4), student_id.substring(4));
            }
        ).then(
            function(){ // set doc name
                var course_title = null;
                return RedisClient.HGET('crs:'+course_id, 'title').then(
                    function(_course_title){
                        course_title = _course_title;
                        return RedisClient.HGET('crs:'+course_id, 'submissions');
                    }
                ).then(
                    function(submissions){
                        submissions = JSON.parse(submissions);
                        return R2D.Doc.Rename(doc_id, course_title + ', ' + submissions[subject_id].title);
                    }
                );
            }
        ).then( // set group name
            function(){
                return R2D.Group.Rename(group_id, 'Instructor\'s Feedback');
            }
        );
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
            var download = false; // download or upload
            if(download){ // download_and_process
                var promises = subs.map(function(sub){
                    return function(){
                        return downloader.run(course_id, submission_id, sub);
                    }
                });
            }
            else{ // upload
                var promises = subs.map(function(sub){
                    return function(){
                        return uploader.run(course_id, submission_id, sub);
                    }
                });
            }
            return js_utils.serialPromiseFuncs(promises);
        }
    ).then(
        function(results){
            RedisClient.end();
        }
    ).catch(
        function(err){
            console.error(err);
        }
    );
};
