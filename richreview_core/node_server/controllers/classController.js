/**
 * Controller for /class route (MyClass app)
 *
 * created by Colin
 */

const util = require('../util');
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
 * TODO: get data from redis server
 * @param userid {string}
 * @returns {Promise<User>}
 */
const getUserFromRedis = (user_key) => {
  const user = dummyData.mockUsers[user_key];
  user.id = user_key;
  user.password = undefined;
  return Promise.resolve(user);
};

const getCourseProperties = (course_key) => {
  // corr. with cmd `keys course:*`
  return Promise.resolve({
    id: course_key,
    name: dummyData.mockCourses[course_key].name,
    course_is_active: dummyData.mockCourses[course_key].course_is_active,
  });
};

const getCourseKeysFromRedis = () => {
  // corr. with cmd `keys course:*`
  const keys = Object.keys(dummyData.mockCourses);
  return Promise.resolve(keys);
};

const getCourseInstructorList = (course_key) => {
  // corr. with cmd `smembers course:<..>:<..>:instructors`
  const instructors = dummyData.mockCourses[course_key].instructors;
  return Promise.resolve(instructors);
};

const getCourseActiveStudentsList = (course_key) => {
  // corr. with cmd `smembers course:<..>:<..>:students:active`
  const actives = dummyData.mockCourses[course_key].active_students;
  return Promise.resolve(actives);
};

const getCourseBlockedStudentsList = (course_key) => {
  // corr. with cmd `smembers course:<..>:<..>:students:blocked`
  const blockeds = dummyData.mockCourses[course_key].blocked_students;
  return Promise.resolve(blockeds);
};

const getAssignmentProperties = (asgmt_key) => {
  const asgmt = dummyData.mockAssignments[asgmt_key];
  asgmt.id = asgmt_key;
  return Promise.resolve(asgmt);
};

const getAssignmentKeysOfCourseAndUser = (course_key, user_key) => {
  const course_frag = course_key.substring(7);
  const user_frag = user_key.substring(4);
  let asgmt_keys = Object.keys(dummyData.mockAssignments);
  asgmt_keys = asgmt_keys.filter((asgmt_key) => {
    return asgmt_key.indexOf(user_frag+":"+course_frag) !== -1;
  });
  return Promise.resolve(asgmt_keys);
};

const getAssignmentKeysOfCourse = (course_key) => {
  // corr. with cmd `keys asgmt:*:<course_frag>:*`
  const course_frag = course_key.substring(7);
  let asgmt_keys = Object.keys(dummyData.mockAssignments);
  asgmt_keys = asgmt_keys.filter((asgmt_key) => {
    return asgmt_key.indexOf(course_frag) !== -1;
  });
  return Promise.resolve(asgmt_keys);
};

/*const getAssignmentsOfUser = (user_key) => {
  // corr. with cmd `keys asgmt:*:*:*:*`
  const userid = user_key.substring(4);
  let asgmt_keys = Object.keys(dummyData.mockAssignments);
  asgmt_keys = asgmt_keys.filter((asgmt_key) => {
    return asgmt_key.indexOf("asgmt:"+userid) !== -1;
  });
  const asgmts = asgmt_keys.map((asgmt_key) => {
    const asgmt = dummyData.mockAssignments[asgmt_key];
    asgmt.id = asgmt_key;
    return asgmt;
  });
  return Promise.resolve(asgmts);
};*/

/**
 * send a response to all the courses user has access to
 * TODO: auth_level is deprecated; make one general routing for all users
 */
exports.getCourses = (req, res) => {

  const getCoursesAsStudent = (userid, user) => {
    return []; // stub
  };

  /**
   * Get all course keys, then get each list of instructor from course key, then, pick out which course key has user_key in list.
   */
  const getCoursesAsInstructor = (user_key, user) => {
    /**
     * cb1 and cb2 corr to redis commands
     * sismember course:<course-dept>:<course-nbr>:instructors <course_key>
     * TODO: remove instructors
     */
    const cb1 = (course_key) => {
      return getCourseInstructorList(course_key)
        .then((instructors) => {
          return { id: course_key, instructors };
        });
    };

    const cb2 = (course_obj) => {
      util.debug(user_key);
      return course_obj.instructors.includes(user_key);
    };

    const cb3 = (course_obj_init) => {
      return getCourseProperties(course_obj_init.id)
        .then((course_obj) => {
          course_obj.id = course_obj_init.id;
          return course_obj;
        });
    };

    return getCourseKeysFromRedis()
      .then((course_keys) => {
        const promises = course_keys.map(cb1);
        return Promise.all(promises);
      })
      .then((course_objs) => {
        return course_objs.filter(cb2);
      })
      .then((course_objs) => {
        const promises = course_objs.map(cb3);
        return Promise.all(promises);
      });
  };

  const getCoursesAsAdmin = (user_key, user) => {
    return []; // stub
  };

  // TODO: properly get user
  // const userid = req.user.id;
  const userid = "e9973dcd22"; // to test instructor

  const user_key = "usr:"+userid;
  getUserFromRedis(user_key).then((user) => {
      // TODO: case for user.auth_level == undefined
      switch(user.auth_level) {
        case "admin":
          return getCoursesAsAdmin(user_key, user);
        case "instructor":
          return getCoursesAsInstructor(user_key, user);
        case "student":
          return getCoursesAsStudent(user_key, user);
        default:
          // TODO: do something about this case
          throw "in getUBCUserFromRedis; invalid auth_level";
      }
    }).then((course_objs) => {
      res.send(course_objs);
    });
};

exports.getUsersFromCourse = (req, res) => {
  const course_key = req.params.course_key;

  Promise.all([
    getCourseInstructorList(course_key),
    getCourseActiveStudentsList(course_key),
    getCourseBlockedStudentsList(course_key)
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
    return getAssignmentKeysOfCourseAndUser(course_key, student_key)
      .then((asgmt_keys) => {
        return [student_key, asgmt_keys];
      });
  };
  const cb2 = (arr_depth_2) => {
    const promise_student = getUserFromRedis(arr_depth_2[0]);
    const promises_assignments = arr_depth_2[1].map(getAssignmentProperties);
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

  getCourseActiveStudentsList(course_key)
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

/**
 * TODO: not correct impl
 */
/*exports.getAssignmentsFromUser = (req, res) => {
  const course_key = req.params.course_key;

  getCourseActiveStudentsList(course_key)
    .then((active_student_keys) => {
      const promises = active_student_keys.map(getAssignmentsOfUser);
      return Promise.all(promises);
    })
    .then((asgmts) => {
      res.send(asgmts);
    });
};*/
