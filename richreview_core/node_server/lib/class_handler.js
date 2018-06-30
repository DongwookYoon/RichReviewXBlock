

const crypto = require('crypto');

const R2D = require('./r2d');
const RedisClient = require('./redis_client').RedisClient;
const env = require('./env');
const js_utils = require('./js_utils');
const util = require('../util');
const dummyData = require('../data/dummy_data');

/******************/
/** user methods **/
/******************/

/**
 *
 * @param email
 */
const makeID = (email) => {
  let hmac = crypto.createHmac('sha1', env.sha1_salt.netid);
  hmac.update(email, 'utf8');
  return hmac.digest('hex').toLowerCase();
};

const makeSalt = () => {
  return crypto.randomBytes(64).toString('hex');
};

/**
 *
 * @param password {string} - a string that is at least 8 characters in length
 * @param salt {string}
 */
const encryptPassword = (password, salt) => {
  return crypto.createHmac('sha1', salt).update(password, 'utf8').digest('hex');
};

/**
 * A wrapper to create user according to UBC study.
 *
 * If password is shorter than 8 characters then reject.
 * Note that we d
 */
const createUser = (email, password) => {
  const go = () => {
    util.logger("ADMIN UBC STUDY","creating user "+email);
    util.logger("ADMIN UBC STUDY","making ID");
    const id = makeID(email);
    util.logger("ADMIN UBC STUDY","making salt");
    const salt = makeSalt();
    util.logger("ADMIN UBC STUDY","making password hash");
    const password_hash = encryptPassword(password, salt);
    const is_admin = false;
    const sid = "";
    const first_name = "";
    const last_name = "";
    util.logger("ADMIN UBC STUDY","calling R2D User create()");
    return R2D.User.prototype.create(
      id, email, password_hash, salt, is_admin, sid, first_name, last_name
    );
  };

  util.logger("ADMIN UBC STUDY","checking email is valid");
  if(!js_utils.validateEmail(email)) {
    return Promise.reject("bad email");
  }

  util.logger("ADMIN UBC STUDY","checking password is valid");
  if(!util.isString(password) || password.length < 8) {
    return Promise.reject("bad password");
  }

  util.logger("ADMIN UBC STUDY","check if user already exists");
  return R2D.User.prototype.findByEmail(email)
    .then((user) => {
      if(user) {
        throw "user "+email+" already exists";
      } else {
        return go();
      }
    });
};

/**
 *
 * @param user
 * @param password
 * @throws {string} - user does not have stored password
 * @return {boolean} true if password is correct, false otherwise
 */
const validatePassword = (user, password) => {
  if(!user.password_hash || !user.salt) {
    throw "user does not have stored password";
  }

  return user.password_hash === encryptPassword(password, user.salt);
};

exports.makeID = makeID;
exports.createUser = createUser;
exports.validatePassword = validatePassword;

/*
 * Course ( `course:<course-dept>:<course-number>` )
 *
 * userid is sha1 hash with salt
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
 *
 */

/**
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
        const course = new Course(
          course_dept, course_nbr, course_prop.is_active, course_prop.name
        );
        cache[course_key] = course;
        return course;
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
        resolve();
      } else {
        reject(course_dept+" "+course_nbr+" does not exist");
      }
    });
  };

  pub.populate();

  return pub;
}());



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

  const course_instr_key = "course:"+this.dept+":"+this.number+":active:students";
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

  const course_instr_key = "course:"+this.dept+":"+this.number+":blocked:students";
  return RedisClient.SMEMBERS(course_instr_key)
    .then((instr_ids) => {
      const promises = instr_ids.map(cb);
      return Promise.all(promises);
    });
};

const createCourse = (course_dept, course_nbr, course_name) => {
  const course_key = "course:"+course_dept+":"+course_nbr;
  return RedisClient.HMSET(
    course_key,
    "course_is_active", false,
    name, course_name
  )
    .then((b) => {
      return Course.cache.loadFromDB(course_dept, course_nbr);
    });
};

const deleteCourse = (course_dept, course_nbr) => {

};

const addInstructorToCourse = (course_dept, course_nbr, user) => {
  const course_instructors_key = "course:"+course_dept+":"+course_nbr+":instructors";
  return RedisClient.SADD(course_instructors_key, user.id);
};

const addStudentToCourse = (course_dept, course_nbr, user) => {
  const course_stu_bl_key = "course:"+course_dept+":"+course_nbr+":students:blocked";
  return RedisClient.SADD(course_stu_bl_key, user.id);
};

const activateStudent = (course_dept, course_nbr, user) => {
  const course_key = "course:"+course_dept+":"+course_nbr;
  const course_stu_bl_key = course_key+":students:blocked";
  const course_stu_av_key = course_key+":students:active";
  return RedisClient.SMOVE(course_stu_bl_key, course_stu_av_key, user.id)
    .then((b) => {
      // TODO: maybe throw if b is false
      util.debug("in makeStudentActive(): "+b);
    });
};

const blockStudent = (course_dept, course_nbr, user) => {
  const course_key = "course:"+course_dept+":"+course_nbr;
  const course_stu_bl_key = course_key+":students:blocked";
  const course_stu_av_key = course_key+":students:active";
  return RedisClient.SMOVE(course_stu_av_key, course_stu_bl_key, user.id)
    .then((b) => {
      // TODO: maybe throw if b is false
      util.debug("in makeStudentActive(): "+b);
    });
};

const getCoursesWhereUserIsInstructor = (user) => {
  const cb1 = (course_key) => {
    return RedisClient.SISMEMBER(course_key, user.id)
      .then((b) => {
        if(b === 1) {
          return { key: course_key, is_instructor: true };
        } else {
          return { key: course_key, is_instructor: false };
        }
      });
  };

  const cb2 = (query_obj) => {

  };

  return RedisClient.KEYS("course:*")
    .then((course_keys) => {
      const promises = course_keys.map(cb1);
      return Promise.all(promises);
    })
    .then((query_objs) => {
      return query_objs.filter(cb2);
    });

};

exports.getCourseProperties = (course_key) => {
  // corr. with cmd `keys course:*`
  return Promise.resolve({
    id: course_key,
    name: dummyData.mockCourses[course_key].name,
    course_is_active: dummyData.mockCourses[course_key].course_is_active,
  });
};

exports.getCourseKeysFromRedis = () => {
  // corr. with cmd `keys course:*`
  const keys = Object.keys(dummyData.mockCourses);
  return Promise.resolve(keys);
};

exports.getCourseInstructorList = (course_key) => {
  // corr. with cmd `smembers course:<..>:<..>:instructors`
  const instructors = dummyData.mockCourses[course_key].instructors;
  return Promise.resolve(instructors);
};

exports.getCourseActiveStudentsList = (course_key) => {
  // corr. with cmd `smembers course:<..>:<..>:students:active`
  const actives = dummyData.mockCourses[course_key].active_students;
  return Promise.resolve(actives);
};

exports.getCourseBlockedStudentsList = (course_key) => {
  // corr. with cmd `smembers course:<..>:<..>:students:blocked`
  const blockeds = dummyData.mockCourses[course_key].blocked_students;
  return Promise.resolve(blockeds);
};

exports.getAssignmentProperties = (asgmt_key) => {
  const asgmt = dummyData.mockAssignments[asgmt_key];
  asgmt.id = asgmt_key;
  return Promise.resolve(asgmt);
};

exports.getAssignmentKeysOfCourseAndUser = (course_key, user_key) => {
  const course_frag = course_key.substring(7);
  const user_frag = user_key.substring(4);
  let asgmt_keys = Object.keys(dummyData.mockAssignments);
  asgmt_keys = asgmt_keys.filter((asgmt_key) => {
    return asgmt_key.indexOf(user_frag+":"+course_frag) !== -1;
  });
  return Promise.resolve(asgmt_keys);
};

exports.getAssignmentKeysOfCourse = (course_key) => {
  // corr. with cmd `keys asgmt:*:<course_frag>:*`
  const course_frag = course_key.substring(7);
  let asgmt_keys = Object.keys(dummyData.mockAssignments);
  asgmt_keys = asgmt_keys.filter((asgmt_key) => {
    return asgmt_key.indexOf(course_frag) !== -1;
  });
  return Promise.resolve(asgmt_keys);
};