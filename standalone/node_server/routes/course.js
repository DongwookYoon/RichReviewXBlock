/**
 * Created by yoon on 10/7/15.
 */


var js_error = require("../lib/js_error");
var R2D = require("../lib/r2d.js");
var azure = require("../lib/azure");
var js_utils = require("../lib/js_utils");
var Promise = require("promise");

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

cms.isInstructor = function(course, netid){

};

cms.isStudent = function(course, netid){

};

cms.

cms.get = function(req, res){

};


cms.student = {};

cms.student.get = function(req, res){

};

