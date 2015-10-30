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
    instructors: [<email>,<email>],
    students: [<email>, ...],
    submissions: [
        {
            id: <str>,
            title: <str>,
            due: <time>,
            status: <str>, // Open or Closed
            submitted: <int>
        },
        {
            id...
        }
        ...
    ]
}

stu:math2220_fall2015_<email> = {
    submissions: {
        assignment1: {
            extension: <time>, // or null if there's no extension
            group: <group_id>, // or null if it's pending
            status: <str> // Submitted or Not Submitted
        },
        assignment1review: {
            extension...
        }
    }
}

// file path on the Azure blob storage
<BLOB_HOST>/math2220_fall2015/<salted_email>/<SHA1>.pdf

*/


var cmsUtil = {};

cmsUtil.catchErr = function(foo){
    foo.catch(
        function(err){
            js_utils.PostResp(res, req, 400, err);
        }
    )
};

cmsUtil.isInstructor = function(course_id, email){
    return RedisClient.HGET('crs:'+course_id, 'instructors').then(
        function(instructors){
            return JSON.parse(instructors).indexOf(email) !== -1;
        }
    )
};

cmsUtil.isStudent = function(course_id, email){
    return RedisClient.HGET('crs:'+course_id, 'students').then(
        function(students){
            return JSON.parse(students).indexOf(email) !== -1;
        }
    )
};

cmsUtil.getSaltedSha1 = function(email){
    var shasum = crypto.createHash('sha1');
    shasum.update(email+env.sha1_salt.netid);
    return shasum.digest('hex').toLowerCase();
};

cmsUtil.assertInstructor = function(req, res, func){
    if(js_utils.identifyUser(req, res)){
        var course_id = 'math2220_fall2015';
        R2D.User.prototype.findById(req.user.id).then(
            function(user) {
                return cmsUtil.isInstructor(course_id, user.email);
            }
        ).then(
            function(is_instructor){
                if(is_instructor){
                    return func();
                }
                else{
                    js_utils.PostResp(res, req, 400, 'you are not an instructor of this course.');
                }
            }
        ).catch(
            function(err){
                js_utils.PostResp(res, req, 400, err);
            }
        );
    }
};


var postCms = {};

postCms.getAnnouncements = function(req, res){
    if(js_utils.identifyUser(req, res)){
        cmsUtil.catchErr(
            RedisClient.HGET('crs:'+req.body.course_id, 'announcements').then(
                function(announcements){
                    js_utils.PostResp(res, req, 200, JSON.parse(announcements));
                    return null;
                }
            )
        );
    }
};

postCms.getSurveys = function(req, res){
    if(js_utils.identifyUser(req, res)){
        cmsUtil.catchErr(
            RedisClient.HGET('crs:'+req.body.course_id, 'surveys').then(
                function(surveys){
                    js_utils.PostResp(res, req, 200, JSON.parse(surveys));
                    return null;
                }
            )
        );
    }
};

postCms.getSubmissions = function(req, res){
    if(js_utils.identifyUser(req, res)){
        cmsUtil.catchErr(
            RedisClient.HGET('crs:'+req.body.course_id, 'submissions').then(
                function(submissions){
                    js_utils.PostResp(res, req, 200, JSON.parse(submissions));
                    return null;
                }
            )
        );
    }
};

postCms.getEnrollment = function(req, res){
    cmsUtil.assertInstructor(req, res, function(){
        return RedisClient.HGET('crs:' + req.body.course_id, 'students').then(
            function (students) {
                js_utils.PostResp(res, req, 200, JSON.parse(students));
                return null;
            }
        )
    });
};

postCms.removeEnrollment = function(req, res){
    cmsUtil.assertInstructor(req, res, function(){
        return RedisClient.HGET('crs:'+req.body.course_id, 'students').then(
            function(students){
                var obj = JSON.parse(students);
                var i = obj.indexOf(req.body.email);
                if(i === -1){throw req.body.email + ' is not in the enrollment list.'}
                obj.splice(i, 1);
                return obj;
            }
        ).then(
            function(obj){
                return RedisClient.HSET('crs:'+req.body.course_id, 'students', JSON.stringify(obj));
            }
        ).then(
            function(){
                js_utils.PostResp(res, req, 200);
                return null;
            }
        );
    });
};

postCms.addEnrollment = function(req, res){
    var addIndividualStudent = function(email){
        return RedisClient.HGET('crs:'+req.body.course_id, 'students').then(
            function(students){
                var obj = JSON.parse(students);
                obj.push(email);
                return obj;
            }
        ).then(
            function(obj){
                return RedisClient.HSET('crs:'+req.body.course_id, 'students', JSON.stringify(obj));
            }
        ).then(
            function(){
                return email;
            }
        )
    };

    var parseEmails = function(emails){
        emails = emails.split(/[\s,]+/).map(function(x){return x.trim();});
        var emails2 = [];
        emails.forEach(function(email){
            if(email !== ''){
                emails2.push(email);
            }
        });
        emails2.forEach(function(email){
            if(!js_utils.validateEmail(email)){
                throw email + ' is not a valid email address.';
            }
        });
        if(emails2.length === 0){
            throw 'please input student email(s).'
        }
        return emails2;
    };

    cmsUtil.assertInstructor(req, res, function(){
        var emails = parseEmails(req.body.emails);

        return RedisClient.HGET('crs:'+req.body.course_id, 'students').then(
            function(students){
                var existing_pupils = JSON.parse(students);
                existing_pupils.forEach(function(existing_pupil){
                    emails.forEach(function(email){
                        if(existing_pupil === email){
                            throw email + ' is already in the list.';
                        }
                    })
                });
                return js_utils.serialPromiseFuncs(
                    emails.map(
                        function(email){
                            return function(){
                                return addIndividualStudent(email);
                            }
                        }
                    )
                )
            }
        ).then(
            function(email_final){
                js_utils.PostResp(res, req, 200, email_final);
            }
        );

        /*
        return RedisClient.HGET('crs:'+req.body.course_id, 'students').then(
            function(students){
                var obj = JSON.parse(students);
                var i = obj.indexOf(req.body.email);
                if(i === -1){throw req.body.email + ' is not in the enrollment list.'}
                obj.splice(i, 1);
                return obj;
            }
        ).then(
            function(obj){
                return RedisClient.HSET('crs:'+req.body.course_id, 'students', JSON.stringify(obj));
            }
        ).then(
            function(){
                js_utils.PostResp(res, req, 200);
                return null;
            }
        );
        */
    });
};

postCms.getSubmissionStudent = function(req, res){
    if(js_utils.identifyUser(req, res)){
        cmsUtil.catchErr(
            RedisClient.HGET('crs:'+req.body.course_id, 'submissions').then(
                function(submissions){
                    js_utils.PostResp(res, req, 200, JSON.parse(submissions));
                    return null;
                }
            )
        );
    }
};

postCms.submission = {};

postCms.submission.setStatus = function(req, res){

};

postCms.submission.setDue = function(req, res){

};

postCms.student = {};

postCms.student.addStudent = function(course_id, email){

};

postCms.student.removeStudent = function(course_id, email){

};

postCms.student.extendDue = function(course_id, email, submission, new_due){

};

postCms.student.getUploadCtx = function(course_id, netid, submission){

};

postCms.student.doneUpload = function(course_id, netid, submission, path){

};

exports.get = function (req, res) {
    req.session.latestUrl = req.originalUrl;
    if(js_utils.redirectUnknownUser(req, res)){
        var course_id = 'math2220_fall2015';
        R2D.User.prototype.findById(req.user.id).then(
            function(user){
                return Promise.all(
                    [
                        cmsUtil.isInstructor(course_id, user.email),
                        cmsUtil.isStudent(course_id, user.email)
                    ]
                ).then(
                    function(result){
                        if(result[0]){ // is_instructor
                            res.render('cms_instructor_overview',
                                {
                                    cur_page: 'CmsInstructor',
                                    user: req.user,
                                    BLOB_HOST: azure.BLOB_HOST,
                                    HOST: js_utils.getHostname() + "/"
                                }
                            );
                        }
                        else if(result[1]){ // is_student
                            res.render('cms_student',
                                {
                                    cur_page: 'CmsStudent',
                                    user: req.user,
                                    BLOB_HOST: azure.BLOB_HOST,
                                    HOST: js_utils.getHostname() + "/"
                                }
                            );
                        }
                        else {
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
};

exports.post = function(req, res){
    switch(req.query['op']){

        /* common */
        case 'getAnnouncements':
            postCms.getAnnouncements(req, res);
            break;
        case 'getSurveys':
            postCms.getSurveys(req, res);
            break;
        case 'getSubmissions':
            postCms.getSubmissions(req, res);
            break;

        /* instructor */
        case 'getEnrollment':
            postCms.getEnrollment(req, res);
            break;
        case 'removeEnrollment':
            postCms.removeEnrollment(req, res);
            break;
        case 'addEnrollment':
            postCms.addEnrollment(req, res);
            break;

        /* student */
        case 'getSubmissionStudent':
            postCms.getSubmissionStudent(req, res);
            break;
        default:
            js_utils.PostResp(res, req, 400, "unidentified request: "+req.query['op']);
            break;
    }
};