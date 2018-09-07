/**
 * Generates (UBC) Courses. To read more about courses please read the file richreview_core/node_server/db_schema.md
 * This file is temporary and is to be replaced by an admin UI that can create courses.
 * 
 * This file will also create test users to enroll in the test course env.COURSE_GROUP.TEST_112_001_2019W
 * 
 * by Colin
 */
// npm modules
const assert      = require('chai').assert;

// import library
const env         = require('../lib/env');
const RedisClient = require('../lib/redis_client').RedisClient;
const redis_utils = require('../lib/redis_client').util;
const Course      = require("../lib/Course");
const User        = require("../lib/r2d").User;
const InternalStudy = require("../lib/Model").InternalStudy;

const util        = require('../util');

const shouldMakeTestUsers = true;

/**
 * Creates a test user given the user attributes
 * @param {Object} userAttribute 
 * @returns {self|Promise<User>}
 */
const makeTestUser = (userAttribute) => {
  util.logger("make courses", `creating user with ${userAttribute.email}`);
  return InternalStudy.createUser(userAttribute.email, userAttribute.password)
    .catch(err => {
      if(err instanceof Error && err.message === "user already exists") {
        util.logger("make courses", `user with ${userAttribute.email} already exists; getting user`);
        return User.findByEmail(userAttribute.email);
      } else {
        util.error(err);
        throw err;
      }
    })
    .then(user => {
      return user.updateDetails(
        userAttribute.sid, 
        userAttribute.display_name,
        userAttribute.first_name,
        userAttribute.last_name
      )
    })
};

/**
 * Creates test users and adds them to the env.COURSE_GROUP.TEST_112_001_2019W test course
 * @returns {Promise}
 */
const makeTestUsers = () => {
  return User.cache.populate()
    .then(() => {
      const promises = env.TEST.ATTRIBUTE.USERS.map(userAttribute => {
        return makeTestUser(userAttribute);
      });
      return Promise.all(promises);
    })
    .then(users => { 
      // user[0] is active student
      // user[1] is blocked student
      // user[2] is instructor
      assert.isAtLeast(users.length, 3, "created at least 3 users");
      const course = Course.cache.get(env.INSTITUTION.TEST, env.COURSE_GROUP.TEST_112_001_2019W);
      return course.addStudent(users[0])
        .then((user) => {
          return course.activateStudent(user);
        })
        .then(() => {
          return course.addStudent(users[1]);
        })
        .then(() => {
          return course.addInstructor(users[2]);
        });
    })
};

Course.cache.populate()
  .then(() => {
    return RedisClient.KEYS("crs:ubc:*:prop");
  })
  .then((keys) => {
    const promises = Object.keys(env.COURSE_GROUP_DETAIL).map(key => {
      const o = env.COURSE_GROUP_DETAIL[key];
      util.logger("make courses", `creating course ${o.institution}:${o.course_group}`);
      return Course.create(o.institution, o.course_group, o);
    });
    return Promise.all(promises);
  })
  .then(() =>{
    
    if(shouldMakeTestUsers) {
      util.logger("make courses", "Made courses/already exists; now making test users");
      return makeTestUsers();
    }
    util.logger("make courses", "Made courses/already exists; skip making test users");
  })
  .then(() => {
    util.printer("make courses", "Done.");
    return RedisClient.quit();
  })
  .catch(err => {
    util.error(err);
  });