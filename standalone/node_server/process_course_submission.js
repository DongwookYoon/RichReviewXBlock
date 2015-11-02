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

var getSaltedSha1 = function(email){
    var shasum = crypto.createHash('sha1');
    shasum.update(email+env.sha1_salt.netid);
    return shasum.digest('hex').toLowerCase();
};

var process_course_submission = function(course_id, submission_id, data){

    return new Promise(function(resolve, reject) { // donwload
        if(data.status === 'Submitted'){

            var c= course_id.replace('_', '-');
            var b = getSaltedSha1()+'/'+submission_id+'.pdf';
            var path = '../cache/' + c + '/' + b;
            console.log('+', data.email, c, b);

            var dir = path.substring(0, path.lastIndexOf('/'));
            mkdirp(dir);
            azure.BlobFileDownload(c, b, path, function (err) {
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
        function(){
            return null;
        }
    );
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