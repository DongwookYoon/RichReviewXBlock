/**
 * Course
 *
 * The file for the Course class
 *
 * created by Colin
 */

// import libraries
const js_utils = require('./js_utils.js');
const RedisClient = require('./redis_client').RedisClient;
const redis_utils = require('./redis_client').util;
const R2D = require('./r2d');
const util = require('../util');

const assert = require('chai').assert;



/**
 * In redis
 * Course ( `course:<course-dept>:<course-number>` )
 *
 * course properties ( `course:<course-dept>:<course-number>:prop` )
 * @type hash / class
 * @member is_active {boolean} - true if course is active, false otherwise
 * @member name  {string} - name of the course; defaults to `<course-dept> <course-number>`
 *
 * course instructors ( `course:<course-dept>:<course-number>:instructors` ) is of type set containing the userid of instructors of course
 *
 * course active students ( `course:<course-dept>:<course-number>:students:active` ) is of type set containing the userid of active students of course
 *
 * course blocked students ( `course:<course-dept>:<course-number>:students:blocked` ) is of type set containing the userid of blocked students of course
 */

/**
 * Course class to manage school courses, instructors, and student registration+access level
 *
 * @param dept {string}
 * @param number {string}
 * @param is_active {boolean} - whether the course is active or disabled
 * @param name {string}
 * @constructor
 */
const Course = function(dept, number, is_active, name) {
  this.dept = dept;
  this.number = number;
  this.is_active = is_active;
  this.name = name;
};

/**
 * Course cache
 * @constuctor
 */
Course.cache = (function () {
  let cache = {};
  const pub = {};

  const loadFromDBInternal = (course_key) => {
    return RedisClient.HGETALL(course_key)
      .then((course_prop) => {
        const course_arr = course_key.split(':');
        const course_dept = course_arr[1];
        const course_nbr = course_arr[2];
        const is_active = (course_prop.is_active === "true");
        cache[course_key] = new Course(
          course_dept, course_nbr, is_active, course_prop.name
        );
        return cache[course_key];
      });
  };

  pub.loadFromDB = (course_dept, course_nbr) => {
    const course_key = "course:"+course_dept+":"+course_nbr+":prop";
    return loadFromDBInternal(course_key);
  };

  pub.populate = () => {
    cache = { };
    return RedisClient.KEYS("course:*:*:prop")
      .then((course_keys) => {
        const promises = course_keys.map(loadFromDBInternal);
        return Promise.all(promises);
      })
      .then((courses) => {
        util.logger("Course", courses.length+" courses loaded");
        return null;
      })
  };

  pub.get = (course_dept, course_nbr) => {
    const course_key = "course:"+course_dept+":"+course_nbr+":prop";
    if(pub.exists(course_dept, course_nbr)) {
      return cache[course_key];
    } else {
      throw course_dept+" "+course_nbr+" does not exist";
    }
  };

  pub.exists = (course_dept, course_nbr) => {
    const course_key = "course:"+course_dept+":"+course_nbr+":prop";
    return cache.hasOwnProperty(course_key);
  };

  // WARNING: Race condition
  // TODO: change impl of initial populate
  /*pub.populate()
    .catch((err) => { util.error(err) });*/

  return pub;
} ( ));

/**
 *
 * @param course_dept
 * @param course_nbr
 * @param course_name
 * @return {Promise.<Course>}
 */
Course.createCourse = (course_dept, course_nbr, course_name) => {
  const flag = /^[a-zA-Z0-9]+$/.test(course_dept) && /^[a-zA-Z0-9]+$/.test(course_nbr);
  if (!flag) {
    return Promise.reject("course dept or course name should only contain letters and numbers");
  }
  course_dept = course_dept.toLowerCase();
  course_nbr  = course_nbr.toLowerCase();
  if (Course.cache.exists(course_dept, course_nbr)) {
    return Promise.reject("course already exists");
  }
  const course_key = "course:"+course_dept+":"+course_nbr+":prop";
  return RedisClient.HMSET(
    course_key,
    "name", course_name,
    "course_is_active", false
  )
    .then((b) => {
      util.logger("Course", course_nbr+" "+course_name+": "+course_name+" created");
      return Course.cache.loadFromDB(course_dept, course_nbr);
    });
};

/**
 * TODO: delete assignments assoc. with course
 * TODO: uncouple groups when deleting assignments
 */
Course.prototype.delete = function() {
  const _key = "course:"+this.dept+":"+this.number;
  const course_key = _key+":prop";
  const course_instructors_key = _key+":instructors";
  const course_active_students_key = _key+":students:active";
  const course_blocked_students_key = _key+":students:blocked";
  const promises = [
    RedisClient.DEL(course_key),
    RedisClient.DEL(course_instructors_key),
    RedisClient.DEL(course_active_students_key),
    RedisClient.DEL(course_blocked_students_key)
  ];
  return Promise.all(promises)
    .then((bArr) => {
      return Course.cache.populate();
    });
};

/**
 * Add instructor to course
 * @param {User} user - the instructor to add
 */
Course.prototype.addInstructor = function(user) {
  const course_instructors_key = "course:"+this.dept+":"+this.number+":instructors";
  return redis_utils.isMember(course_instructors_key, user.id)
    .then((b) => {
      if(b) {
        throw "instructor is already instructing";
      } else {
        return RedisClient.SADD(course_instructors_key, user.id);
      }
    })
    .catch((err) => {
      util.error(err);
    });
};

/**
 * Get instructors of course
 * @return {Array.<User>}
 */
Course.prototype.getInstructors = function() {
  const cb = (instr_id) => {
    return R2D.User.prototype.findById(instr_id);
  };

  const course_instr_key = "course:"+this.dept+":"+this.number+":instructors";
  return RedisClient.SMEMBERS(course_instr_key)
    .then((instr_ids) => {
      const promises = instr_ids.map(cb);
      return Promise.all(promises);
    });
};

Course.prototype.isEnrolled = function(user) {
  const _key = "course:"+this.dept+":"+this.number+":students";
  const course_actv_key = _key+":active";
  const course_blkd_key = _key+":blocked";
  const promise1 = redis_utils.isMember(course_actv_key, user.id);
  const promise2 = redis_utils.isMember(course_blkd_key, user.id);
  return Promise.all([promise1, promise2])
    .then((bArr) => {
      assert.strictEqual(bArr[0] && bArr[1], false);
      return bArr.includes(true);
    })
};

/**
 * Adds student iff it is not in students:blocked and students:active sets
 * @param {User} user - the student to add
 */
Course.prototype.addStudent = function(user) {
  const course_blkd_key = "course:"+this.dept+":"+this.number+":students:blocked";
  return Course.prototype.isEnrolled(user)
    .then((b) => {
      if(b) {
        throw "student is already enrolled"
      } else {
        return RedisClient.SADD(course_blkd_key, user.id);
      }
    });
};

Course.prototype.activateStudent = function(user) {
  const _key = "course:"+this.dept+":"+this.number+":students";
  const course_actv_key = _key+":active";
  const course_blkd_key = _key+":blocked";
  return Course.prototype.isEnrolled(user)
    .then((b) => {
      if(b) {
        return RedisClient.SREM(course_blkd_key, user.id);
      } else {
        throw "can't activate, student is not enrolled"
      }
    })
    .then((b) => {
      return RedisClient.SADD(course_actv_key, user.id);
    })
};

Course.prototype.blockStudent = function(user) {

};

Course.prototype.getActiveStudents = function() {
  const cb = (instr_id) => {
    return R2D.User.prototype.findById(instr_id);
  };

  const course_actv_key = "course:"+this.dept+":"+this.number+":students:active";
  return RedisClient.SMEMBERS(course_actv_key)
    .then((instr_ids) => {
      const promises = instr_ids.map(cb);
      return Promise.all(promises);
    });
};

/**
 * Get blocked students from course
 * @return {Promise.<Array.<User>>}
 * @throws
 */
Course.prototype.getBlockedStudents = function() {
  const cb = (instr_id) => {
    return R2D.User.prototype.findById(instr_id);
  };

  const course_blkd_key = "course:"+this.dept+":"+this.number+":students:blocked";
  return RedisClient.SMEMBERS(course_blkd_key)
    .then((instr_ids) => {
      const promises = instr_ids.map(cb);
      return Promise.all(promises);
    });
};

/**
 *
 * @return {Promise.<{ blocked: User[], active: User[]}>} - the students of the course by blocked and active students
 */
Course.prototype.getStudents = function () {
  const cb = (instr_id) => {
    return R2D.User.prototype.findById(instr_id);
  };

  const promises = [
    Course.prototype.getActiveStudents(),
    Course.prototype.getBlockedStudents()
  ];
  return Promise.all(promises)
    .then((twoArr) => {
      const promise1 = twoArr[0].map(cb);
      const promise2 = twoArr[1].map(cb);
      const promise = [ Promise.all(promise1), Promise.all(promise2) ];
      return Promise.all(promise);
    })
    .then((twoArr) => {
      const students = { };
      const activeStudents  = twoArr[0];
      const blockedStudents = twoArr[1];
      if(activeStudents.length  > 0) { students.active = activeStudents; }
      if(blockedStudents.length > 0) { students.blocked = blockedStudents; }
      return students;
    })
};

Course.readAttributes = () => {
  // STUB
};

module.exports = Course;