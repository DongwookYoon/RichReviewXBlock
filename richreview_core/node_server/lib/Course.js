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
const R2D = require('./r2d');
const util = require('../util');

/*
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

Course.cache = (function() {
  let cache = {};
  const pub = {};

  const loadFromDBInternal = (course_key) => {
    return RedisClient.HGETALL(course_key)
      .then((course_prop) => {
        const course_arr = course_key.split(':');
        const course_dept = course_arr[1];
        const course_nbr = course_arr[2];
        cache[course_key] = new Course(
          course_dept, course_nbr, course_prop.is_active, course_prop.name
        );
        return cache[course_key];
      });
  };

  pub.loadFromDB = (course_dept, course_nbr) => {
    const course_key = "course:"+course_dept+":"+course_nbr+":prop";
    return loadFromDBInternal(course_key);
  };

  pub.populate = () => {
    return RedisClient.KEYS("course:*:*:prop")
      .then((course_keys) => {
        const promises = course_keys.map(loadFromDBInternal);
        return Promise.all(promises);
      })
      .then((courses) => {
        util.logger("Course", courses.length+" courses loaded");
      })
      .catch((err) => {
        util.error(err);
      });
  };

  pub.get = (course_dept, course_nbr) => {
    const course_key = "course:"+course_dept+":"+course_nbr+":prop";
    return new Promise((resolve, reject) => {
      if(cache.hasOwnProperty(course_key)) {
        resolve(cache[course_key]);
      } else {
        reject(course_dept+" "+course_nbr+" does not exist");
      }
    });
  };

  pub.populate();

  return pub;
}());

Course.createCourse = (course_dept, course_nbr, course_name) => {
  const course_key = "course:"+course_dept+":"+course_nbr+":prop";
  return RedisClient.HMSET(
    course_key,
    "name", course_name,
    "course_is_active", false
  )
    .then((b) => {
      return Course.cache.loadFromDB(course_dept, course_nbr);
    })
    .catch((err) => {
      util.error(err);
    });
};

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
      util.logger();
    })
    .catch((err) => {
      util.error(err);
    });
};

Course.prototype.addInstructor = function(user) {
  //return RedisClient.
};

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

Course.prototype.getActiveStudents = function() {
  const cb = (instr_id) => {
    return R2D.User.prototype.findById(instr_id);
  };

  const course_instr_key = "course:"+this.dept+":"+this.number+":students:active";
  return RedisClient.SMEMBERS(course_instr_key)
    .then((instr_ids) => {
      const promises = instr_ids.map(cb);
      return Promise.all(promises);
    });
};

Course.prototype.getBlockedStudents = function() {
  const cb = (instr_id) => {
    return R2D.User.prototype.findById(instr_id);
  };

  const course_instr_key = "course:"+this.dept+":"+this.number+":students:blocked";
  return RedisClient.SMEMBERS(course_instr_key)
    .then((instr_ids) => {
      const promises = instr_ids.map(cb);
      return Promise.all(promises);
    });
};

exports.Course = Course;