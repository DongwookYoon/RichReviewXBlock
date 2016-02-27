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
    submissions: {
        assignment1:{
                title: <str>,
                due: <time>,
                status: <str>, // Open or Closed
                submitted: <int>
            },
        assignment1review:{
                title...
            }
        ...
    }
}

stu:math2220_fall2015_<email> = {
    submissions: {
        assignment1: {
            due: <time> // is always the same as crs:<>.submissions[n].due
            extension: <time>, // or null if there's no extension
            group: <group_id>, // or null if it's pending
            status: <str> // Submitted or Not Submitted
        },
        assignment1review: {
            extension: ...
        }
    }
}

// file path on the Azure blob storage
<BLOB_HOST>/math2220_fall2015/<salted_email>/<assignment_id>.pdf

*/


//var MATH_COURSE_ID = 'math2220_fall2015'; // last semester's course ID
var MATH_COURSE_ID = 'math2220_sp2016';

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
        R2D.User.prototype.findById(req.user.id).then(
            function(user) {
                return cmsUtil.isInstructor(MATH_COURSE_ID, user.email);
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

// asserts that the login user is the student with req.body.email
cmsUtil.assertStudent = function(req, res, func){
    if(js_utils.identifyUser(req, res)){
        R2D.User.prototype.findById(req.user.id).then(
            function(user) {
                if(req.body.email !== user.email){
                    throw 'you are not a valid student user of this course.';
                }
                return cmsUtil.isStudent(MATH_COURSE_ID, user.email);
            }
        ).then(
            function(is_student){
                if(is_student){
                    return func();
                }
                else{
                    throw 'you are not a registered student of this course.';
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
        );
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
            // create a corresponding stu: database
            function(){
                return RedisClient.HGET('crs:'+MATH_COURSE_ID, 'submissions').then(
                    function(dict){
                        var dict = JSON.parse(dict);
                        stu_submissions = {};
                        for(id in dict){
                            stu_submissions[id] = {
                                title: dict[id].title,
                                due: dict[id].due,
                                extension:null,
                                group:null,
                                submission_time:null,
                                status:'Not Submitted'
                            };
                        }
                        return stu_submissions;
                    }
                ).then(
                    function(stu_submissions){
                        return RedisClient.HSET(
                            'stu:'+MATH_COURSE_ID+'_'+email,
                            'submissions',
                            JSON.stringify(stu_submissions)
                        );
                    }
                );
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
    });
};

postCms.getReviewItems = function(req, res){
    cmsUtil.assertInstructor(req, res, function(){
        var emails = [];
        return RedisClient.HGET('crs:' + req.body.course_id, 'students').then(
            function (_emails) {
                emails = JSON.parse(_emails);
                var promises = emails.map(function(email){
                    return RedisClient.HGET(
                        'stu:'+req.body.course_id + '_' + email,
                        'submissions'
                    ).then(
                        function(item){
                            return JSON.parse(item);
                        }
                    );
                });
                return Promise.all(promises);
            }
        ).then(
            function(stu_data){
                var rtn = [];
                for(var i = 0, l = stu_data.length; i < l; ++i){
                    var item = stu_data[i][req.body.review];
                    item.email = emails[i];
                    rtn.push(item);
                }
                js_utils.PostResp(res, req, 200, rtn);
                return null;
            }
        );
    });
};


/*

 submissions: {
 assignment1:{
 title: <str>,
 due: <time>,
 status: <str>, // Open or Closed
 submitted: <int>
 },
 assignment1review:{
 title...
 }

 stu:math2220_fall2015_<email> = {
 submissions: {
 assignment1: {
 title: <str> // is always the same as crs:<>.submissions[n].title
 due: <time> // is always the same as crs:<>.submissions[n].due
 extension: <time>, // or null if there's no extension
 group: <group_id>, // or null if it's pending
 status: <str> // Submitted or Not Submitted
 }

 */

postCms.student_getSubmissions = function(req, res){
    cmsUtil.assertStudent(req, res, function(){
        return RedisClient.HGET('stu:'+req.body.course_id + '_' + req.body.email, 'submissions').then(
            function(submissions){
                js_utils.PostResp(res, req, 200, JSON.parse(submissions));
                return null;
            }
        )
    });
};

postCms.student__getUploadSas = function(req, res){
    cmsUtil.assertStudent(req, res, function(){
        var key = cmsUtil.getSaltedSha1(req.user.email);
        var sas = azure.getSas(MATH_COURSE_ID.replace('_','-'), key+'/'+req.body.filename, 300);// 5 minutes
        js_utils.PostResp(res, req, 200, sas);
        return null;
    });
};

postCms.student__doneUploadPdf = function(req, res){
    cmsUtil.assertStudent(req, res, function(){
        var stu_key = 'stu:'+req.body.course_id+'_'+req.body.email;
        return RedisClient.HGET(stu_key, 'submissions').then(
            function(submissions){
                submissions = JSON.parse(submissions);
                submissions[req.body.submission_id].status = 'Submitted';
                submissions[req.body.submission_id].submission_time = (new Date()).toISOString();
                return submissions;
            }
        ).then(
            function(submissions){
                return RedisClient.HSET(stu_key, 'submissions', JSON.stringify(submissions));
            }
        ).then(
            function(){
                js_utils.PostResp(res, req, 200);
                return null;
            }
        );
    });
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

(function danglingStudentCheckUp(){
    var stus = null;
    var existing_students = [];
    var subs = null;
    RedisClient.HGET('crs:'+MATH_COURSE_ID, 'students').then(
        function(stu_str){
            stus = JSON.parse(stu_str);
            var promises = stus.map(
                function(email){
                    return RedisClient.EXISTS('stu:'+MATH_COURSE_ID+'_'+email);
                }
            );
            return Promise.all(promises); // check all students existance
        }
    ).then(
        function(stu_exist){
            for(var i = 0, l = stu_exist.length; i < l; ++i){
                if(stu_exist[i]){
                    existing_students.push(stus[i]);
                }
                else{
                    console.log('Dangling stu:'+MATH_COURSE_ID+'_'+stus[i]);
                }
            }
            return null;
        }
    ).then(
        function(){
            return RedisClient.HGET('crs:'+MATH_COURSE_ID, 'submissions').then(
                function(sub_str){
                    subs = JSON.parse(sub_str);
                    var promises = existing_students.map(
                        function(email){
                            return RedisClient.HGET(
                                'stu:'+MATH_COURSE_ID+'_'+email,
                                'submissions'
                            );
                        }
                    );
                    return Promise.all(promises); //get all exsiting students
                }
            ).then(
                function(stu_subs){
                    for(var i = 0, l = stu_subs.length; i < l; ++i) {
                        var stu_sub = JSON.parse(stu_subs[i]);
                        for(id_crs_sub in subs){
                            var x = stu_sub[id_crs_sub];
                            if(stu_sub[id_crs_sub].due !== subs[id_crs_sub].due ||
                                stu_sub[id_crs_sub].title !== subs[id_crs_sub].title ){
                                console.log('inconsistent data: '+
                                'stu:'+MATH_COURSE_ID+'_'+existing_students[i]+
                                ', '+id_crs_sub);
                            }
                        }
                    }
                }
            );
        }
    ).catch(
        function(err){
            console.log(err);
        }
    );
}());

exports.get = function (req, res) {
    req.session.latestUrl = req.originalUrl;
    var course_id = MATH_COURSE_ID;
    if(js_utils.redirectUnknownUser(req, res)){
        R2D.User.prototype.findById(req.user.id).then(
            function(user){
                var key = cmsUtil.getSaltedSha1(req.user.email);
                if(req.query['review']){
                    return cmsUtil.isInstructor(course_id, user.email).then(
                        function(is_instructor){
                            if(!is_instructor){
                                throw 'only instructors can access this page.';
                            }
                            return null;
                        }
                    ).then(
                        function(){
                            res.render('cms_instructor_review',
                                {
                                    cur_page: 'CmsInstructor',
                                    user: req.user,
                                    BLOB_HOST: azure.BLOB_HOST,
                                    HOST: js_utils.getHostname() + "/",
                                    key: key,
                                    review: req.query['review']
                                }
                            );
                        }
                    );
                }
                else{
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
                                        HOST: js_utils.getHostname() + "/",
                                        key: key
                                    }
                                );
                            }
                            else if(result[1]){ // is_student
                                res.render('cms_student',
                                    {
                                        cur_page: 'CmsStudent',
                                        user: req.user,
                                        BLOB_HOST: azure.BLOB_HOST,
                                        HOST: js_utils.getHostname() + "/",
                                        key: key
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
        case 'getReviewItems':
            postCms.getReviewItems(req, res);
            break;

        /* student */
        case 'student_getSubmissions':
            postCms.student_getSubmissions(req, res);
            break;
        case 'student__getUploadSas':
            postCms.student__getUploadSas(req, res);
            break;
        case 'student__doneUploadPdf':
            postCms.student__doneUploadPdf(req, res);
            break;
        default:
            js_utils.PostResp(res, req, 400, "unidentified request: "+req.query['op']);
            break;
    }
};