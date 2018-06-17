/**
 * Controller for /class route (MyClass app)
 *
 * created by Colin
 */

/**
 * User ( usr:<userid> )
 * userid is a sha1 hash with salt from netid
 *
 * type    hash / class
 *
 * nick     {string} - nickname
 * email    {string} required - email of user
 * groupNs  {string|Array<string>} required - array of groupid user is in
 *
 * userid is also added to email_user_lookup as a hash field
 */

/**
 * UBCUser ( ubc_user:<userid> )
 * userid is a sha1 hash with salt from netid
 *
 * password   {string} - made from irreversible sha1 hash with salt from netid
 * auth_level {string} - is one of "student", "instructor", or "admin"; refers to security level in terms of access to functionality (delete, doc creation, etc); also affects routing.
 *
 * is_active   {string|boolean} - can access ; instructor and admin should ALWAYS be active
 * courses    {string|Array<string>} - an array of strings for courses of form `ubc_course:<course-dept>:<course-number>`
 * portfolios {string|Array<string>} - an array of strings for portfolios of form `ubc_portfolio:<userid>:<course-dept>:<course-number>`
 *
 * first_name {string} optional - the first name of user
 * last_name  {string} optional - the last name of user
 * sid        {string} optional - the student id of user
 *
 */

/**
 * Course ( ubc_course:<course-dept>:<course-number> )
 *
 * name  {string} - name of the course; defaults to `<course-dept> <course-number>`
 * users {string|Array<string>} - array of usr:[userid] for User (students, instructors and admin)
 */

/**
 * Portfolio ( ubc_portfolio:<userid>:<course-dept>:<course-number> )
 * Search for portfolios belonging to [userid] by `keys ubc_portfolio:[userid]:*`
 * Search for portfolios belonging to [course-dept] and [course-number] by `keys ubc_portfolio:*:[course-dept]:[course-number]`
 *
 * assignments {string|Array<string>} - array of string `ubc_asgmt:<userid>:<course-dept>:<course-number>:<title>`
 *
 * TODO: this may not be necessary
 */

/**
 * Assignment ( ubc_asgmt:<userid>:<course-dept>:<course-number>:<title-slug> )
 * userid      is a sha1 hash with salt from netid
 * title-slug  is the slug of the name of the title
 * Search for assignments belonging to [userid] by `keys ubc_asgmt:[userid]:*`
 * Search for assignments belonging to [course-dept] and [course-number] by `keys ubc_asgmt:*:[course-dept]:[course-number]:*`
 *
 * type    hash / class
 *
 * member title     {string}required - defaults to `<email-hash>_<timestamp>`
 * member docs      {string|Array<string>} - an array of docid for Doc relating to this assignment
 * member out_of    {number} optional - the amount of marks the assignment is worth
 * member grade     {number} optional - the grade given to student after marking
 * member stat_date {string|Array<string>} required - the date status is updated; statuses and the dates they are instantiated
 * member due_date  {string} optional - is of form ISO 8601 Extended Format and instantiated as new Date().toISOString(); if due_date undefined then no due date.
 * member status   {string} required - is one of "hidden", "active", "blocked", "marked", "submitted"
 *      "hidden"    the student cannot see the assignment
 *      "active"    the student cannot see
 *      "submitted" indicates the student submitted
 *      "marked"    indicates the student
 *      default     the student cannot see the assignment
 */

const dummyData = require('../data/dummy_data');

/**
 * MyClass App
 *
 * If User.level=student then just fetch that student's details
 * If User.level=instructor then get instructor's courses and return all students in those courses
 * If User.level=admin then fetch all students
 * If User.level=undefined then return empty array
 */

/**
 * Get UBCUser from redis server
 *
 * currently using mock data
 * TODO: get data from redis server
 *
 * @param userid {string}
 * @returns {Promise<UBCUser>}
 */
const getUBCUserFromRedis = (userid) => {
  return Promise.resolve(dummyData.mockUsers[userid]);
};

const getCourseFromRedis = (ubc_course_key) => {
  dummyData

};

const getCourseKeysFromRedis = () => {
  const keys = Object.keys(dummyData.mockCourses);
  return Promise.resolve(keys);
};

const getCourseInstructorList = (ubc_course_key) => {
  const instructors = dummyData.mockCourses[ubc_course_key].instructors;
  return Promise.resolve(instructors);
};

/**
 *
 * @param req
 * @return {*|Promise<UBCUser>}
 */
const getCourses = (req) => {

  /**
   *
   */
  const getCoursesAsStudent = (ubc_userid, ubc_user) => {

  };

  /**
   * Get all course keys, then get each list of instructor from course key, then, pick out which course key has ubc_user_key in list.
   *
   * @param ubc_user_key {string} - has form `ubc_user:[userid]`
   * @param ubc_user
   * @return {*}
   */
  const getCoursesAsInstructor = (ubc_user_key) => {
    const cb1 = (ubc_course_key) => {
      return getCourseInstructorList(ubc_course_key)
        .then((instructors) => {
          return { ubc_course_key, instructors };
        });
    };

    return getCourseKeysFromRedis()
      .then((ubc_course_keys) => {
        const promises = ubc_course_keys.map(cb1);
        return Promise.all(promises);
      })
      .then((ubc_course_objs) => {
        const acc = [];
        ubc_course_objs.forEach((ubc_course_obj) => {
          if (ubc_course_obj.instructors.includes(ubc_user_key)) {
            acc.push(ubc_course_obj.ubc_course_key);
          }
        });
        return acc;
      })
      .then((course_keys_of_instr) => {
        const promises = course_keys_of_instr.map(getCourseFromRedis);
        return Promise.all(promises);
      });
  };

  const getCoursesAsAdmin = () => {

  };

  const userid = req.user.id;
  const ubc_user_key = "ubc_user:"+userid;
  return getUBCUserFromRedis(userid)
    .then((ubc_user) => {
      switch(ubc_user.auth_level) {
        case "instructor":
          return getCoursesAsInstructor(ubc_user_key, ubc_user);
        case "student":
          return getCoursesAsStudent(ubc_user_key, ubc_user);
        default:
          throw "in getUBCUserFromRedis; invalid auth_level";
      }

    });
};

const getStudents = () => {
  const mockRedis = () => {
    return Promise.resolve(dummyData.mockUsers);
  };

  return mockRedis()
    .then((users) => {

    })
    .catch((err) => {

    });
};

/**
 * @param req
 * @param res
 */
exports.fetch = (req, res) => {

  let promise = null;
  switch(req.query.op) {
    /**
     * get all courses
     */
    case "courses":
      promise = getCourses(req);
      break;
    default:
      // TODO: send error message
  }
  promise.then((data) => {
      res.send(data);
      //
    }).catch((err) => {
      // TODO: figure out how to throw this error
    });
};