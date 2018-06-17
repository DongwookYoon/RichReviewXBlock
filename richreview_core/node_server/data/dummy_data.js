

exports.mockUsers = {
  // ubc_user:4bb6974cd5
  // ubc_user:38ac76f47b
  "ubc_user:7d97e98f8a": {
    password: "pass1234",
    auth_level: "student",
    email: "jflask@ubc.alumni.ca",
    first_name: "Jonathan",
    last_name: "Flask",
    sid: "01234567"
  },
  "ubc_user:f710c7e7fe": {
    password: "pass1234",
    auth_level: "student",
    email: "jbayer@ubc.alumni.ca",
    first_name: "Jordan",
    last_name: "Bayer",
    sid: "01234567"
  },
  "ubc_user:703abc8f63": {
    password: "pass1234",
    auth_level: "student",
    email: "fwake@ubc.alumni.ca",
    first_name: "Finn",
    last_name: "Wake",
    sid: "01234567"
  },
  "ubc_user:c90a80ff67": {
    password: "pass1234",
    auth_level: "instructor",
    email: "amoore@ubc.ca",
    first_name: "Alex",
    last_name: "Moore"
  },
  "ubc_user:e9973dcd22": {
    password: "pass1234",
    auth_level: "instructor",
    email: "mwester@ubc.ca",
    first_name: "Max",
    last_name: "Wester"
  }
};

exports.mockCourses = {
  "ubc_course:korn:100": {
    name: "Introduction to Korean",
    course_is_active: true,
    instructors: [
      "ubc_user:c90a80ff67"
    ],
    active_students: [
      "ubc_user:7d97e98f8a",
      "ubc_user:f710c7e7fe"
    ],
    blocked_students: [ ],
    asgmt_slugs: ["hw1", "hw2"]
  },
  "ubc_course:japn:100": {
    name: "Introduction to Japanese",
    course_is_active: true,
    instructors: [
      "ubc_user:e9973dcd22"
    ],
    active_students: [
      "ubc_user:f710c7e7fe",
      "ubc_user:703abc8f63"
    ],
    blocked_students: [ ],
    asgmt_slugs: ["a"]
  }
};

exports.mockAssignments = {
  "ubc_asgmt:7d97e98f8a:korn:100:hw1": {
    title: "HW1",
    group: [ "grp:989266" ],
    out_of:    10,
    stat_date: "2018-06-16T20:02:48.302Z",
    due_date:  "2018-06-17T01:52:02.625Z",
    status:    "active"
  },
  "ubc_asgmt:7d97e98f8a:korn:100:hw2": {
    title: "HW2",
    group: [ "grp:887406" ],
    out_of:    20,
    stat_date: "2018-06-16T20:02:48.302Z",
    due_date:  "2018-06-17T01:52:02.625Z",
    status:    "active"
  },
  "ubc_asgmt:f710c7e7fe:korn:100:hw1": {
    title: "HW1",
    group: [ "grp:529140" ],
    out_of:    10,
    stat_date: "2018-06-16T20:02:48.302Z",
    due_date:  "2018-06-17T01:52:02.625Z",
    status:    "active"

  },
  "ubc_asgmt:f710c7e7fe:korn:100:hw2": {
    title: "HW2",
    group: [ "grp:159245" ],
    out_of:    20,
    stat_date: "2018-06-16T20:02:48.302Z",
    due_date:  "2018-06-17T01:52:02.625Z",
    status:    "active"
  },
  "ubc_asgmt:f710c7e7fe:japn:100:a": {
    title: "A",
    group: [ "grp:159245" ],
    out_of:    20,
    stat_date: "2018-06-16T20:02:48.302Z",
    due_date:  "2018-06-17T01:52:02.625Z",
    status:    "active"
  },
  "ubc_asgmt:703abc8f63:japn:100:a": {
    title: "A",
    group: [ "grp:159245" ],
    out_of:    20,
    stat_date: "2018-06-16T20:02:48.302Z",
    due_date:  "2018-06-17T01:52:02.625Z",
    status:    "active"
  }

};