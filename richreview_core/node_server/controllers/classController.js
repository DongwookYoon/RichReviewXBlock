/**
 * Controller for /class route (MyClass app)
 *
 * created by Colin
 */

const util   = require('../util');
const env    = require("../lib/env");
const Course = require("../lib/Course");

/**
 * 
 */
exports.getCourses = (req, res) => {
  //if(!req.user)
  
  // DEMO
  const KORN = Course.cache.get(env.INSTITUTION.UBC, env.COURSE_GROUP.KORN_102_001_2018W);
  const CHIN = Course.cache.get(env.INSTITUTION.UBC, env.COURSE_GROUP.CHIN_141_002_2018W);
  const TEST = Course.cache.get(env.INSTITUTION.TEST, env.COURSE_GROUP.TEST_112_001_2019W);
  // send the courses
  res.send([KORN.send(), CHIN.send(), TEST.send()]);
};

//exports.getStudents = (req, res) => {};