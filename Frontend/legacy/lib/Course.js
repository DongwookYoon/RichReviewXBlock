/**
 * Course
 *
 * The file for the Course class
 *
 * created by Colin
 */

// import npm modules
const assert = require("chai").assert;

// import libraries
const js_utils    = require("./js_utils");
const RedisClient = require("./redis_client").RedisClient;
const redis_utils = require("./redis_client").util;
const R2D         = require("./r2d");
const env         = require("./env");
const util        = require("../util");

/**
 * Currently, Course is only used for UBC, using the UBC CWL auth. Course information will be stored in Redis as crs:ubc:*
 */

/**
 * In Redis
 * Course (`crs:<institution>:<course-group>:prop`) is a hash with keys:
 * course_group, is_active, institution, [dept], [number], [section], [year], [title]
 *
 *
 *
 * Active students can view the class and assignments. Blocked students cannot view anything.
 *
 * course instructors (`crs:<institution>:<course-group>:instructors`) is a set containing strings that are user IDs of instructors.
 *
 * course active students (`crs:<institution>:<course-group>:students:active`) is a set containing the user IDs of active students of course.
 *
 * course blocked students (`crs:<institution>:<course-group>:students:blocked`) is a set containing the user IDs of blocked students of course.
 */

/**
 * In NodeJS
 * @class Course
 * @member {string} course_group - the unique ID that identifies the course; this ID can be forwarded by ELDAP to CWL user profile in CWL auth callback.
 * @member {boolean} is_active   - true if the course is active (i.e. is showable in the front-end view); false otherwise.
 * @member {string} institution  - the course institution (i.e. ubc)
 * @member {string} [dept]       - the course department (i.e. cpsc)
 * @member {string} [number]     - the course number  (i.e. 210)
 * @member {string} [section]    - the course section (i.e. 001)
 * @member {string} [year]       - the year the course is held (i.e. 2018W)
 * @member {string} [title]      - the course title   (i.e. Software Construction)
 * @member {Set.<User>} instructors  - a list of instuctors
 * @member {Set.<User>} active_students  - a list of active students
 * @member {Set.<User>} blocked_students - a list of blocked students
 *
 * NOTE: course_group, institution, dept, number, section, year should be case insensitive
 */

/**
 * @class CourseOptions
 * @member {{ dept: string, number: string, section: string, year: string }} [detail]
 * @member {string} [title]
 */

/**
 * Course class to manage school courses, instructors, and student registration+access level
 * @constructor
 * @param {string} course_group
 * @param {boolean|string} is_active
 * @param {string} institution
 * @param {CourseOptions|null} options
 */
const Course = function(course_group, is_active, institution, options) {
  this.course_group = course_group;
  this.is_active    = is_active;
  this.institution  = institution;
  this.instructors      = new Set();
  this.active_students  = new Set();
  this.blocked_students = new Set();
  if(options) {
    if(options.detail) {
      this.dept    = options.detail.dept;
      this.number  = options.detail.number;
      this.section = options.detail.section;
      this.year    = options.detail.year;
    }
    if(options.title) this.title = options.title;
  }
};

/**
 * Course Methods
 *
 * Static methods:
 * create
 * plugCourse
 *
 * Instance methods (prototype):
 * getPropKey
 * getInstructorKey
 * getActiveStudentKey
 * getBlockedStudentKey
 * loadInstructors
 * loadActiveStudents
 * loadBlockedStudents
 * delete
 * removeStudent
 * removeInstructor
 * activate
 * deactivate
 *
 * TODO: populate methods
 */

Course.prototype.getInstitution = function() { return this.institution.toLocaleLowerCase(); };
Course.prototype.getCourseGroup = function() { return this.course_group.toLocaleLowerCase(); };

{/***************************************/
  const getKey = (institution, course_group) => `crs:${institution.toLocaleLowerCase()}:${course_group.toLocaleLowerCase()}`;
  /**
   * Get the Redis keys for course with given institution and course_group
   * @function Course.{get__Key}
   * @param {string} institution
   * @param {string} course_group
   * @returns {string}
   */
  Course.getPropKey = (institution, course_group) => `${getKey(institution, course_group)}:prop`;
  Course.getInstructorKey = (institution, course_group) => `${getKey(institution, course_group)}:instructors`;
  Course.getActiveStudentKey = (institution, course_group) => `${getKey(institution, course_group)}:student:active`;
  Course.getBlockedStudentKey = (institution, course_group) =>`${getKey(institution, course_group)}:student:blocked`;
}/***************************************/

{/***************************************/
  const getKey = function() {
    return `crs:${this.getInstitution()}:${this.getCourseGroup()}`
  };
  /**
   * Get the Redis key for the properties of this course.
   * @function Course.prototype.{get__Key}
   * @returns {string}
   */
  Course.prototype.getPropKey = function() { return `${getKey.call(this)}:prop`; };
  Course.prototype.getInstructorKey = function() { return `${getKey.call(this)}:instructors`; };
  Course.prototype.getActiveStudentKey = function() { return `${getKey.call(this)}:student:active`; };
  Course.prototype.getBlockedStudentKey = function() { return `${getKey.call(this)}:student:blocked`; };
}/***************************************/

Course.prototype.loadInstructors = function() {
  return RedisClient.SMEMBERS(this.getInstructorKey())
    .then(instructorIDs => {
      this.instructors = new Set();
      instructorIDs.forEach((instructorID) => {
        assert(R2D.User.cache.exists(instructorID), "loadInstructors: instructor ID is in cache");
        const instructor = R2D.User.cache.get(instructorID);
        this.instructors.add(instructor);
      });
    });
};

Course.prototype.loadActiveStudents = function() {
  return RedisClient.SMEMBERS(this.getActiveStudentKey())
    .then(activeStudentIDs => {
      this.active_students = new Set();
      activeStudentIDs.forEach((activeStudentID) => {
        assert(R2D.User.cache.exists(activeStudentID), "loadActiveStudents: active student ID is in cache");
        const active_student = R2D.User.cache.get(activeStudentID);
        this.active_students.add(active_student);
      });
    });
};

Course.prototype.loadBlockedStudents = function() {
  return RedisClient.SMEMBERS(this.getBlockedStudentKey())
    .then(blockedStudentIDs => {
      this.blocked_students = new Set();
      blockedStudentIDs.forEach((blockedStudentID) => {
        assert(R2D.User.cache.exists(blockedStudentID), "loadBlockedStudents: blocked student ID is in User.cache");
        const blocked_student = R2D.User.cache.get(blockedStudentID);
        this.blocked_students.add(blocked_student);
      });
    });
};

/**
 * Course cache
 * @constructor
 */
Course.cache = (function () {

  /**
   * @typedef {string} CourseCacheKey - the key of course cache has the form <institution>:<group_group>
   */

  /**
   * @type {Object.<CourseCacheKey, Course>} - cache of Course objects
   */
  let cache = {};

  const pub = {};

  const makeCacheKey = (institution, course_group) => `${institution.toLocaleLowerCase()}:${course_group.toLocaleLowerCase()}`;

  /**
   * Implementation to load a course from Redis, add it to cache, then return it.
   * @param {string} course_key - has form crs:<institution>:<group_group>:prop
   * @returns {Promise.<Course>}
   */
  const loadFromDBInternal = (course_key) => {
    return RedisClient.HGETALL(course_key)
      .then((course_obj) => {
        if(!course_obj) throw new Error(`${course_key} does not exist`);
        const cache_key = makeCacheKey(course_obj.institution, course_obj.course_group);
        const is_active   = (course_obj.is_active === "true");
        course_obj.detail = course_obj;
        cache[cache_key] = new Course(
          course_obj.course_group, is_active, course_obj.institution, course_obj
        );
        return Promise.all([
          cache[cache_key].loadInstructors(),
          cache[cache_key].loadActiveStudents(),
          cache[cache_key].loadBlockedStudents()
        ]).then(() => { return cache[cache_key]; });
      });
  };

  /**
   * Client to load a course from Redis, add it to cache, then return it.
   * @returns {*}
   */
  pub.loadFromDB = (institution, course_group) => {
    return loadFromDBInternal(Course.getPropKey(institution, course_group));
  };

  pub.populate = () => {
    cache = { };
    return RedisClient.KEYS("crs:*:*:prop")
      .then((course_keys) => {
        util.debug(JSON.stringify(course_keys));
        const promises = course_keys.map(loadFromDBInternal);
        return Promise.all(promises);
      })
      .then((courses) => {
        util.logger("Course", `${courses.length} courses loaded`);
      });
  };

  /**
   * Gets a course belonging to given institution and course group.
   * @param {string} institution
   * @param {string} course_group
   * @returns {Course}
   * @throws if course no course belonging to given institution and course group exists
   */
  pub.get = (institution, course_group) => {
    const cache_key = makeCacheKey(institution, course_group);
    if(cache.hasOwnProperty(cache_key)) {
      return cache[cache_key];
    } else {
      throw new Error(`Course for ${institution} ${course_group} does not exist`);
    }
  };

  /**
   * Returns true if a course belonging to given institution and course group exists, false if otherwise.
   * @param {string} institution
   * @param {string} course_group
   * @returns {boolean}
   */
  pub.exists = (institution, course_group) => {
    const cache_key = makeCacheKey(institution, course_group);
    return cache.hasOwnProperty(cache_key);
  };

  /**
   *
   * @returns {{institution: string, course_group: string}[]}
   */
  pub.getCourses = {
    /**
     * Get all courses with given user (student or instructor)
     * @param {User} user
     * @returns {Course[]}
     */
    withUser: (user) => {
      return Object.keys(cache).reduce(
        (courses, key) => {
          if(cache[key].isUser(user)) courses.push(cache[key]);
          return courses;
        },
        [ ]
      );
    },
    /**
     * Get all courses with given user as instructor
     * @param {User} user
     * @returns {Course[]}
     */
    withInstructor: (user) => {
      return Object.keys(cache).reduce(
        (courses, key) => {
          if(cache[key].isInstructor(user)) courses.push(cache[key]);
          return courses;
        },
        [ ]
      );
    },
    /**
     * Get all courses with given user as student
     * @param {User} user
     * @returns {Course[]}
     */
    withStudent: (user) => {
      return Object.keys(cache).reduce(
        (courses, key) => {
          if(cache[key].isStudent(user)) courses.push(cache[key]);
          return courses;
        },
        [ ]
      );
    }
  };

  return pub;
} ( ));

/**
 * WARNING: Race condition
 * TODO: change call of initial populate; I suggest putting this call in www.js
 */
Course.cache.populate();

/**
 * @class CourseOptions
 * @member {{ dept: string, number: string, section: string, year: string }} [detail]
 * @member {string} [title]
 */

/**
 * Creates a new course in Redis, adds it to cache, and sets the course as inactive
 * @static
 * @param {string} institution
 * @param {string} course_group
 * @param {CourseOptions} options
 * @return {Promise.<Course>}
 * TODO: update implementation and test
 */
Course.create = (institution, course_group, options) => {
  const flag = /^[a-zA-Z0-9_\-]+$/.test(institution) && /^[a-zA-Z0-9_\-]+$/.test(course_group);
  if (!flag)
    return Promise.reject("course dept or course name should only contain letters, numbers, '-', and '_'");
  institution = institution.toLocaleLowerCase();
  course_group  = course_group.toLocaleLowerCase();
  if (Course.cache.exists(institution, course_group)) {
    util.logger("Course.create", `${institution}:${course_group} already exists`);
    return Promise.resolve(null);
  }
  let sss = null;
  if(options) {
    sss = [ ];
    if(options.detail) sss.push(
        "dept", options.detail.dept, "number", options.detail.number,
        "section", options.detail.section, "year", options.detail.year,
      );
    if(options.title) sss.push("title", options.title);
  }
  return RedisClient.HMSET(
    Course.getPropKey(institution, course_group),
    "course_group", course_group,
    "is_active", false,
    "institution", institution
  )
    .then((b) => {
      if(sss) return RedisClient.HMSET.bind(null, Course.getPropKey(institution, course_group)).apply(null, sss);
    })
    .then(() => {
      return Course.cache.loadFromDB(institution, course_group);
    });
};

/**
 *
 * @function
 * @memberOf Course
 * @param {string} dept
 * @param {string} number
 * @param {string} section
 * @param {string} year
 * @param {string} [title]
 * TODO: finish and test
 */
Course.prototype.setDetail = function(dept, number, section, year, title) {
  const that = this;
  dept = dept.toLocaleLowerCase(); number = number.toLocaleLowerCase();
  section = section.toLocaleLowerCase(); year = year.toLocaleLowerCase();
  const sss = [
    "dept",    dept,
    "number",  number,
    "section", section,
    "year",    year
  ];
  if(title) {
    title = title.toLocaleLowerCase();
    sss.push("title", title);
  }
  return RedisClient.HMSET.bind(null, that.getPropKey()).apply(null, sss)
    .then(() => {
      that.dept = dept; that.number = number; that.section = section; that.year = year;
      if(title) that.title = title;
    });
};

/**
 * Deletes this course. Removes it from cache and redis.
 * @memberOf Course
 * TODO: update implementation and test
 *
 * Tasks when adding assignment functionality
 * TODO: delete assignments assoc. with course
 * TODO: uncouple groups when deleting assignments
 */
Course.prototype.delete = function() {
  return Promise.all([
    RedisClient.DEL(this.getPropKey()),
    RedisClient.DEL(this.getBlockedStudentKey()),
    RedisClient.DEL(this.getActiveStudentKey()),
    RedisClient.DEL(this.getInstructorKey())
  ])
    .then(() => {
      return Course.cache.populate();
    });
};

/**
 * Set the course to active in Redis and update itself in cache
 */
Course.prototype.activate = function() {
  const that = this;
  return RedisClient.HSET(that.getPropKey(), "is_active", true)
    .then(() => { that.is_active = true; });
};

/**
 * Set the course to not-active in Redis and update itself in cache
 */
Course.prototype.deactivate = function() {
  const that = this;
  return RedisClient.HSET(that.getPropKey(), "is_active", false)
    .then(() => { that.is_active = false; });enrollUser
};

/**
 * Add instructor to course, then return instructor
 * @memberOf Course
 * @param {User} user - the instructor to add
 * @returns {Promise.<User>}
 * TODO: update implementation and test
 */
Course.prototype.addInstructor = function(user) {
  if(this.instructors.has(user)) return Promise.resolve(user);
  else {
    return RedisClient.SADD(this.getInstructorKey(), user.id)
      .then(() => {
        this.instructors.add(user);
        return user;
      });
  }
};

/**
 * Adds student if and only if it is not already a (blocked or active) student in the course; returns the student
 * @memberOf Course
 * @param {User} user - the student to add
 * @returns {Promise.<User>}
 */
Course.prototype.addStudent = function(user) {
  if(this.blocked_students.has(user) || this.active_students.has(user)) return Promise.resolve(user);
  else {
    return RedisClient.SADD(this.getBlockedStudentKey(), user.id)
      .then(() => {
        this.blocked_students.add(user);
        return user;
      });
  }
};

/**
 * Get a list of instructors of course
 * @return {Array.<User>}
 */
Course.prototype.getInstructors = function() {
  return Array.from(this.instructors);
};

/**
 * Get a list of course students by blocked and active categories
 * @return {Promise.<{ blocked: User[], active: User[]}>}
 */
Course.prototype.getStudents = function () {
  return {
    blocked: Array.from(this.blocked_students),
    active:  Array.from(this.active_students)
  }
};

Course.prototype.isUser = function(user) { return this.instructors.has(user) || this.blocked_students.has(user) || this.active_students.has(user); };
Course.prototype.isInstructor = function(user) { return this.instructors.has(user) };
Course.prototype.isStudent = function(user) { return this.blocked_students.has(user) || this.active_students.has(user); };
Course.prototype.isActiveStudent = function(user) { return this.active_students.has(user); };
Course.prototype.isBlockedStudent = function(user) { return this.blocked_students.has(user); };

{/*******************************************/
  const activateStudentInternal = function(user) {
    if(!this.blocked_students.has(user)) return Promise.resolve(null);
    const that = this;
    return RedisClient.SREM(that.getBlockedStudentKey(), user.id)
      .then(() => {
        that.blocked_students.delete(user);
        return RedisClient.SADD(that.getActiveStudentKey(), user.id);
      })
      .then(() => { that.active_students.add(user); });
  };

  /**
   * Make a blocked student active if the student is blocked in the course
   * @param {User} user
   * @returns {Promise}
   * NOTE: this function is atomic so it's possible to activate/block users concurrently
   */
  Course.prototype.activateStudent = function(user) {
    return redis_utils.makeAtomic(this, activateStudentInternal)(user);
  };
}/*******************************************/

{/*******************************************/
  const blockStudentInternal = function(user) {
    if(!this.active_students.has(user)) return Promise.resolve(null);
    const that = this;
    return RedisClient.SREM(that.getActiveStudentKey(), user.id)
      .then(() => {
        that.active_students.delete(user);
        return RedisClient.SADD(that.getBlockedStudentKey(), user.id);
      })
      .then(() => { that.blocked_students.add(user); });
  };

  /**
   * Block an active student if the student is active in the course
   * @param {User} user
   * @returns {Promise}
   * NOTE: this function is atomic so it's possible to activate/block users concurrently
   */
  Course.prototype.blockStudent = function(user) {
    return redis_utils.makeAtomic(this, blockStudentInternal)(user);
  };
}/*******************************************/

/**
 *
 * @param {User} user - the user to remove
 * @returns {boolean} true if there is a user removed; false otherwise
 */
Course.prototype.removeUser = function(user) {
  const that = this;
  return Promise.all([
    RedisClient.SREM(that.getBlockedStudentKey(), user.id),
    RedisClient.SREM(that.getActiveStudentKey(),  user.id),
    RedisClient.SREM(that.getInstructorKey(),     user.id)
  ]).then(() => {
    return that.active_students.delete(user) ||
           that.blocked_students.delete(user) ||
           that.instructors.delete(user);
  });
};

/**
 *
 * @param {User} user - the user to remove
 * @returns {boolean} true if there is a user removed; false otherwise
 */
Course.prototype.removeStudent = function(user) {
  const that = this;
  return Promise.all([
    RedisClient.SREM(that.getBlockedStudentKey(), user.id),
    RedisClient.SREM(that.getActiveStudentKey(),  user.id)
  ]).then(() => { return that.active_students.delete(user) || that.blocked_students.delete(user); });
};

/**
 *
 * @param {User} user - the user to remove
 * @returns {boolean} true if there is a user removed; false otherwise
 */
Course.prototype.removeInstructor = function(user) {
  const that = this;
  return Promise.all([
    RedisClient.SREM(that.getInstructorKey(), user.id)
  ]).then(() => { return that.instructors.delete(user); });
};

/**
 * Used for controller to pass (non-user) information to client.
 * @returns {Object}
 */
Course.prototype.send = function() {
  const result = {
    institution: this.institution, is_active: this.is_active, course_group: this.course_group,
    /*active_students: [...this.active_students].map((user) => user.id),
    blocked_students: [...this.blocked_students].map((user) => user.id),
    instructors: [...this.instructors].map((user) => user.id)*/
  };
  if(this.dept) {
    result.dept = this.dept;
    result.number = this.number;
    result.section = this.section;
    result.year = this.year
  }
  if(this.title) result.title = this.title;
  return result;
};

/**
 * Used for controller to pass user information to client
 */
Course.prototype.sendUsers = function() {
  const instructorAttributes = this.getInstructors().map(instrutor => instrutor.send());
  const students = this.getStudents();
  const studentAttributes = { };
  studentAttributes.blocked = students.blocked.map(student => student.send());
  studentAttributes.active = students.active.map(student => student.send());
  return { instructors: instructorAttributes, students: studentAttributes };
};

{/*******************************************/

  /**
   * Return the keyword in the group attribute (lower case'd) that follows the 'cn=' if it exists; null otherwise.
   * @param {string} ss - the group attribute to search
   * @returns {string|null}
   */
  const getAttribute = (ss) => {
    const regex = /cn=[a-zA-Z0-9_]+/i;
    const result = regex.exec(ss);
    if(result) {
      return (result[0]).substring(3).toLocaleLowerCase();
    } else {
      return null;
    }
  };

  /**
   * Get a list of all keywords in the group attributes
   * @param profile
   * @returns {string[]}
   */
  const getCourseGroupIDs = (profile) => {
    if(!profile.hasOwnProperty(env.UBC.CWL.ATTRIBUTE.groupMembership)) return [ ];
    let groupMembership = null;
    if(util.isString(profile[env.UBC.CWL.ATTRIBUTE.groupMembership]))
      groupMembership = [profile[env.UBC.CWL.ATTRIBUTE.groupMembership]];
    else groupMembership = profile[env.UBC.CWL.ATTRIBUTE.groupMembership];
    // assert.instanceOf(profile[env.UBC.CWL.ATTRIBUTE.groupMembership], Array, "profile[groupMembership] is an array");
    let courseGroupIDs = groupMembership.map((group_str) => {
      return getAttribute(group_str);
    });
    return courseGroupIDs.filter((courseGroupID) => { return !!courseGroupID });
  };

  /**
   * If user is not enrolled then enroll the user to the course
   * @param {User} user
   * @param {string} institution
   * @param {string} course_group
   * @param {boolean} [isInstructor]
   * @returns {Promise}
   */
  const enrollUser = (user, institution, course_group, isInstructor) => {
    assert(
      Course.cache.exists(institution, course_group),
      `enrollUser: course ${institution} ${course_group} does not exist (did you remember to run the creation script?)`
    );
    const course = Course.cache.get(institution, course_group);
    if(isInstructor) return course.addInstructor(user);
    else return course.addStudent(user);
  };

  /**
   * For all group attributes in profile that corr. to RichReview courses, enroll the user to the course.
   * @param {User} user
   * @param {CWLProfile} profile
   * @returns {Promise}
   */
  const enrollUserHandler = (user, profile) => {
    const courseGroupIDs = getCourseGroupIDs(profile);
    const promises = courseGroupIDs.map((courseGroupID) => {
      switch(courseGroupID) {
        case env.UBC.CWL.ATTRIBUTE.GROUP.CHIN_141_002_2018W:
        case env.UBC.CWL.ATTRIBUTE.GROUP.KORN_102_001_2018W:
          return enrollUser(user, env.INSTITUTION.UBC, courseGroupID);
        case env.UBC.CWL.ATTRIBUTE.GROUP.CHIN_141_002_2018W_INSTRUCTOR:
          return enrollUser(user, env.INSTITUTION.UBC, env.UBC.CWL.ATTRIBUTE.GROUP.CHIN_141_002_2018W, true);
        case env.UBC.CWL.ATTRIBUTE.GROUP.KORN_102_001_2018W_INSTRUCTOR:
          return enrollUser(user, env.INSTITUTION.UBC, env.UBC.CWL.ATTRIBUTE.GROUP.KORN_102_001_2018W, true);
        default:
          return null;
      }
    });
    return Promise.all(promises);
  };

  /**
   * Add user's ID to courses in Redis, update course cache, and add courses to user.
   * @param {User} user
   * @param {CWLProfile} profile
   * @returns {Promise.<User|null>}
   */
  Course.plugCourse = (user, profile) => {

    // if there is no user then return
    if(!user) return Promise.resolve(null);

    return enrollUserHandler(user, profile)
      .then(() => { return user; });
  };
}

module.exports = Course;
