

exports.mockUsers = {
  // usr:4bb6974cd5
  // usr:38ac76f47b
  "usr:7d97e98f8a": {
    admin: false,
    password: "pass1234",
    auth_level: "student",
    email: "jflask@ubc.alumni.ca",
    first_name: "Jonathan",
    last_name: "Flask",
    sid: "01234567",
    nick: "jflask",
    groupNs: []
  },
  "usr:f710c7e7fe": {
    admin: false,
    password: "pass1234",
    auth_level: "student",
    email: "jbayer@ubc.alumni.ca",
    first_name: "Jordan",
    last_name: "Bayer",
    sid: "01234567",
    nick: "jbayer",
    groupNs: []
  },
  "usr:703abc8f63": {
    admin: false,
    password: "pass1234",
    auth_level: "student",
    email: "fwake@ubc.alumni.ca",
    first_name: "Finn",
    last_name: "Wake",
    sid: "01234567",
    nick: "fwake",
    groupNs: []
  },
  "usr:4bb6974cd5": {
    admin: false,
    password: "pass1234",
    auth_level: "student",
    email: "jsj@alumni.ubc.ca",
    first_name: "jack",
    last_name: "SJ",
    sid: "01234567",
    nick: "amoore",
    groupNs: []
  },
  "usr:c90a80ff67": {
    admin: false,
    password: "pass1234",
    auth_level: "instructor",
    email: "amoore@ubc.ca",
    first_name: "Alex",
    last_name: "Moore",
    nick: "amoore",
    groupNs: []
  },
  "usr:e9973dcd22": {
    admin: false,
    password: "pass1234",
    auth_level: "instructor",
    email: "mwester@ubc.ca",
    first_name: "Max",
    last_name: "Wester",
    nick: "mwester",
    groupNs: []
  }
};

exports.mockCourses = {
  "course:korn:100": {
    name: "Introduction to Korean",
    course_is_active: true,
    instructors: [
      "usr:c90a80ff67"
    ],
    active_students: [
      "usr:7d97e98f8a",
      "usr:f710c7e7fe"
    ],
    blocked_students: [
      "usr:4bb6974cd5"
    ],
    asgmt_slugs: ["hw1", "hw2"]
  },
  "course:korn:200": {
    name: "Intermediate Korean",
    course_is_active: true,
    instructors: [
      "usr:c90a80ff67"
    ],
    active_students: [
      "usr:4bb6974cd5"
    ],
    blocked_students: [],
    asgmt_slugs: ["hw1", "hw2"]
  },
  "course:japn:100": {
    name: "Introduction to Japanese",
    course_is_active: true,
    instructors: [
      "usr:e9973dcd22"
    ],
    active_students: [
      "usr:f710c7e7fe",
      "usr:703abc8f63"
    ],
    blocked_students: [
      "usr:4bb6974cd5"
    ],
    asgmt_slugs: ["a"]
  }
};

exports.mockAssignments = {
  "asgmt:7d97e98f8a:korn:100:hw1": {
    title: "HW1",
    group: [ "grp:989266" ],
    out_of:    10,
    stat_date: "2018-06-16T20:02:48.302Z",
    due_date:  "2018-06-17T01:52:02.625Z",
    status:    "active"
  },
  "asgmt:7d97e98f8a:korn:100:hw2": {
    title: "HW2",
    group: [ "grp:887406" ],
    out_of:    20,
    stat_date: "2018-06-16T20:02:48.302Z",
    due_date:  "2018-06-17T01:52:02.625Z",
    status:    "active"
  },
  "asgmt:f710c7e7fe:korn:100:hw1": {
    title: "HW1",
    group: [ "grp:529140" ],
    out_of:    10,
    stat_date: "2018-06-16T20:02:48.302Z",
    due_date:  "2018-06-17T01:52:02.625Z",
    status:    "active"

  },
  "asgmt:f710c7e7fe:korn:100:hw2": {
    title: "HW2",
    group: [ "grp:159245" ],
    out_of:    20,
    stat_date: "2018-06-16T20:02:48.302Z",
    due_date:  "2018-06-17T01:52:02.625Z",
    status:    "active"
  },
  "asgmt:4bb6974cd5:korn:200:korn-200-hw1": {
    title: "Korean 200 HW1",
    group: [ "grp:324251" ],
    out_of:    1,
    stat_date: "2018-06-16T20:02:48.302Z",
    due_date:  "2018-06-17T01:52:02.625Z",
    status:    "active"
  },
  "asgmt:4bb6974cd5:korn:200:korn-200-hw2": {
    title: "Korean 200 HW2",
    group: [ "grp:321610" ],
    out_of:    1,
    stat_date: "2018-06-16T20:02:48.302Z",
    due_date:  "2018-06-17T01:52:02.625Z",
    status:    "active"
  },
  "asgmt:4bb6974cd5:korn:200:korn-200-hw3": {
    title: "Korean 200 HW3",
    group: [ "grp:138743" ],
    out_of:    1,
    stat_date: "2018-06-16T20:02:48.302Z",
    due_date:  "2018-06-17T01:52:02.625Z",
    status:    "active"
  },
  "asgmt:f710c7e7fe:japn:100:a": {
    title: "A",
    group: [ "grp:159245" ],
    out_of:    20,
    stat_date: "2018-06-16T20:02:48.302Z",
    due_date:  "2018-06-17T01:52:02.625Z",
    status:    "active"
  },
  "asgmt:703abc8f63:japn:100:a": {
    title: "A",
    group: [ "grp:159245" ],
    out_of:    20,
    stat_date: "2018-06-16T20:02:48.302Z",
    due_date:  "2018-06-17T01:52:02.625Z",
    status:    "active"
  }

};