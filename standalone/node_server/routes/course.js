/**
 * Created by yoon on 10/7/15.
 */


var Promise = require("promise");
var crypto = require('crypto');
var env = require('../lib/env.js');
var js_error = require("../lib/js_error");
var js_utils = require("../lib/js_utils");
var R2D = require("../lib/r2d.js");
var azure = require("../lib/azure");
var RedisClient = require('../lib/redis_client').RedisClient;

/*
Redis database examples

crs:math2220_fall2015 = {
    announcements: [<html>,<html>],
    surveys:  [<html>,<html>],
    submissions: {
        assignment1: {
            title: <str>,
            due: <time>,
            status: <str>, // open or closed
        },
        assignment1review: ,
        ...
    }
    instructors: [<NetId>,<NetId>],
    students: [<NetId>, ...],
}

stu:math2220_fall2015_<salted_netid> = {
    usr: <userid>,
    crs: math2220_fall2015,
    sub: {
        assignment1: {
            extension: <time>,
            review: <str>, // pending or ready
            pdf: <SHA1>
        }
}

// file path on the Azure blob storage
<BLOB_HOST>/math2220_fall2015/<salted_netid>/<SHA1>.pdf

*/

var cms = {};

cms.isInstructor = function(courseid, email){
    return RedisClient.HGET('crs:'+courseid, 'instructors').then(
        function(instructors){
            return JSON.parse(instructors).indexOf(email) !== -1;
        }
    )
};

cms.isStudent = function(courseid, email){
    return RedisClient.HGET('crs:'+courseid, 'students').then(
        function(students){
            return JSON.parse(students).indexOf(email) !== -1;
        }
    )
};

cms.getSaltedSha1 = function(email){
    var shasum = crypto.createHash('sha1');
    shasum.update(email+env.sha1_salt.netid);
    return shasum.digest('hex').toLowerCase();
};

cms.getCourse = function(req, res){
    return RedisClient.HGET('crs:'+courseid, 'assignment').then(
        function(students){
            return JSON.parse(students).indexOf(email) !== -1;
        }
    )
};

cms.getAnnouncements = function(req, res){
    if(req.user){

    }
    else{
        js_utils.PostResp(res, req, 400, 'you are an unidentified user. please sign in and try again.');
    }
};

cms.submission = {};

cms.submission.setStatus = function(req, res){

};

cms.submission.setDue = function(req, res){

};

cms.student = {};

cms.student.addStudent = function(courseid, email){

};

cms.student.removeStudent = function(courseid, email){

};

cms.student.extendDue = function(courseid, email, submission, new_due){

};

cms.student.getUploadCtx = function(courseid, netid, submission){

};

cms.student.doneUpload = function(courseid, netid, submission, path){

};

exports.post = function(req, res){
    switch(req.query['op']){
        case "getCourse":
            cms.getCourse(req, res);
            break;
        case 'getAnnouncements':
            cms.getAnnouncements(req, res);
            break;
        default:
            js_utils.PostResp(res, req, 400, "unidentified request: "+req.query['op']);
            break;
    }
};

exports.get = function (req, res) {
    req.session.latestUrl = req.originalUrl;
    if(req.user){
        var courseid = 'math2220_fall2015';
        R2D.User.prototype.findById(req.user.id).then(
            function(user){
                return Promise.all(
                    [
                        cms.isStudent(courseid, user.email),
                        cms.isInstructor(courseid, user.email)
                    ]
                ).then(
                    function(result){
                        if(result[0]){ // is_student
                            res.render('cms_student',
                                {
                                    cur_page: 'CmsStudent',
                                    user: req.user,
                                    BLOB_HOST: azure.BLOB_HOST,
                                    HOST: js_utils.getHostname() + "/"
                                }
                            );
                        }
                        else if(result[1]){ // is_instructor
                            res.render('cms_instructor_overview',
                                {
                                    cur_page: 'CmsInstructor',
                                    user: req.user,
                                    BLOB_HOST: azure.BLOB_HOST,
                                    HOST: js_utils.getHostname() + "/"
                                }
                            );
                        }
                        else{
                            res.render('cms_unidentified',
                                {
                                    cur_page: 'CmsUnidentified',
                                    user: req.user
                                }
                            );
                        }
                    }
                );
            }
        ).catch(
            function(err){
                js_utils.PostResp(res, req, 400, err);
            }
        );
    }
    else{
        res.redirect('/login');
    }
};