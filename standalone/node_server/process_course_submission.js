/**
 * Created by Dongwook on 11/2/2015.
 */


var env = require('./lib/env.js');
var js_utils = require("./lib/js_utils.js");
var azure = require('./lib/azure');
var Promise = require("promise");
var RedisClient = require('./lib/redis_client').RedisClient;
var crypto = require('crypto');

var getSaltedSha1 = function(email){
    var shasum = crypto.createHash('sha1');
    shasum.update(email+env.sha1_salt.netid);
    return shasum.digest('hex').toLowerCase();
};

var process_course_submission = function(course_id, submission_id, data){
    var c= course_id.replace('_', '-');
    var b = getSaltedSha1(data.email)+'/'+submission_id+'.pdf';
    console.log(course_id, data, c, b, './cache/' + c + '/' + b);
    console.log(data.email, 'https://richreview.blob.core.windows.net/math2220-fall2015/bacca6e303c2fd44eaa75e86195a6f400c4d04a1/assignment1.pdf');
    return new Promise(function(resolve, reject) {
        if(data.status === 'Submitted'){
            azure.BlobFileDownload(c, b, './cache/' + c + '/' + b, function (err) {
                if (err) {
                    reject(err)
                }
                else {
                    resolve();
                }
            });
        }
        else{
            resolve();
        }
    });
};

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
            var promises = subs.map(function(sub){
                return function(){
                    return process_course_submission(course_id, submission_id, sub);
                }
            });
            return js_utils.serialPromiseFuncs(promises);
        }
    ).catch(
        function(err){
            console.log(err);
        }
    );
};