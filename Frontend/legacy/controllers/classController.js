/**
 * Controller for /class route (MyClass app)
 *
 * created by Colin
 */

// npm modules
const assert = require("chai").assert;

// import library
const util   = require('../util');
const env    = require("../lib/env");
const Course = require("../lib/Course");

/**
 *
 */
exports.getCourses = (req, res) => {

  // // DEMO
  // const KORN = Course.cache.get(env.INSTITUTION.UBC, env.COURSE_GROUP.KORN_102_001_2018W);
  // const CHIN = Course.cache.get(env.INSTITUTION.UBC, env.COURSE_GROUP.CHIN_141_002_2018W);
  // const TEST = Course.cache.get(env.INSTITUTION.TEST, env.COURSE_GROUP.TEST_112_001_2019W);
  // // send the courses
  // res.send([KORN.send(), CHIN.send(), TEST.send()]);
  res.sendStatus(404);
};

const opForCourse = (req, res) => {
  // assert.exists(req.query.institution, "opForCourse: institution field");
  //   // assert.exists(req.query.course_group, "opForCourse: course_group field");
  //   // util.debug(req.query.institution);
  //   // util.debug(req.query.course_group);
  //   // const course = Course.cache.get(req.query.institution, req.query.course_group);
  //   // res.send(course.sendUsers());
  res.sendStatus(404);
};

exports.getUsers = (req, res) => {

  // DEMO
  // util.debug(req.query.op);
  // switch(req.query.op) {
  //   case "ForCourse":
  //     opForCourse(req, res);
  //     break;
  //   default:
  //     res.send({
  //       students: {
  //         blocked: [ ],
  //         active:  [ ]
  //       },
  //       instructors: [ ]
  //     });
  // }
  res.sendStatus(404);
};
