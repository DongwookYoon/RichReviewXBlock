/**
 * Controller for /class route (MyClass app)
 *
 * created by Colin
 */

const util = require('../util');
const dummyData = require('../scripts/dummy_data');
const class_handler = require('../lib/class_handler');

const Course = require("../lib/Course");

/**
 * 
 */
exports.getCourses = (req, res) => {
  //if(!req.user) 
  const courses = Course.cache.getCourses.withUser(req.user);
  /*const result = courses.map((course) => {
    
  });*/
};

exports.getUsersFromCourse = (req, res) => {
  const course_key = req.params.course_key;

  Promise.all([
    class_handler.getCourseInstructorList(course_key),
    class_handler.getCourseActiveStudentsList(course_key),
    class_handler.getCourseBlockedStudentsList(course_key)
  ])
    .then((arr) => {
      const promise_instructors = Promise.all(arr[0].map(getUserFromRedis));
      const promise_active_stu  = Promise.all(arr[1].map(getUserFromRedis));
      const promise_blocked_stu = Promise.all(arr[2].map(getUserFromRedis));
      return Promise.all([
        promise_instructors,
        promise_active_stu,
        promise_blocked_stu
      ]);
    })
    .then((arr) => {
      util.debug(JSON.stringify(arr));
      res.send({
        instructors:      arr[0],
        active_students:  arr[1],
        blocked_students: arr[2]
      });
    });
};

exports.getAssignmentsFromCourse = (req, res) => {
  const course_key = req.params.course_key;

  const cb1 = (student_key) => {
    return class_handler.getAssignmentKeysOfCourseAndUser(course_key, student_key)
      .then((asgmt_keys) => {
        return [student_key, asgmt_keys];
      });
  };
  const cb2 = (arr_depth_2) => {
    const promise_student = getUserFromRedis(arr_depth_2[0]);
    const promises_assignments = arr_depth_2[1].map(class_handler.getAssignmentProperties);
    const promise_for_asgmts = Promise.all(promises_assignments);
    return Promise.all([
      promise_student,
      promise_for_asgmts
    ])
      .then((obj) => {
        return {
          student: obj[0],
          asgmts: obj[1]
        };
      });
  };

  class_handler.getCourseActiveStudentsList(course_key)
    .then((student_keys) => {
      const promises = student_keys.map(cb1);
      return Promise.all(promises);
    })
    .then((arr_depth_3) => {
      const promises = arr_depth_3.map(cb2);
      return Promise.all(promises);
    })
    .then((arr) => {
      res.send(arr);
    });
};