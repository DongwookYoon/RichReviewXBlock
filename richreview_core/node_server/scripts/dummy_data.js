
exports.mockCWLUsers = {
  cchen795: {
    "issuer": "https://authentication.ubc.ca",
    "sessionIndex":"_72ed488569357c8fb6ae0c69c36ba008",
    "nameID":"AAdzZWNyZXQxw00LRH1/YXBn+t/C0UJd7708ljmwU2WMyigk9LcQNS+JGPTPX1wCTkgYoETu5UqrPfsDZfV2x6QBJVwCw3YmTT2vulYLclmocdH2PNKiY2UDfgn55g5WDw==",
    "nameIDFormat":"urn:oasis:names:tc:SAML:2.0:nameid-format:transient",
    "nameQualifier":"https://authentication.ubc.ca",
    "spNameQualifier":"sp_richreview_ubc",
    "urn:oid:1.3.6.1.4.1.60.1.7.1":"cdcb9536-6005-4e93-853f-b17d564d9ecc",
    "urn:oid:0.9.2342.19200300.100.1.1":"cchen795",
    "urn:oid:0.9.2342.19200300.100.1.3":"cchen795@gmail.com",
    "urn:oid:2.16.840.1.113730.3.1.241":"Chi-Wei Chen",
    "urn:oid:2.5.4.42":"Chi-Wei",
    "urn:mace:dir:attribute-def:ubcEduStudentNumber":"54573167",
    "urn:oid:2.5.4.4":"Chen",
    "urn:oid:2.16.840.1.113719.1.1.4.1.25": [
    "cn=admins,ou=richreview.net,ou=applications,ou=cpsc-ubcv,ou=clients,dc=id,dc=ubc,dc=ca",
    "cn=coursetest,ou=richreview.net,ou=applications,ou=cpsc-ubcv,ou=clients,dc=id,dc=ubc,dc=ca",
    "cn=KORN_102_001_2018W,ou=KORN,ou=UBC,ou=ACADEMIC,dc=id,dc=ubc,dc=ca"
    ],
    "mail": "cchen795@gmail.com",
    "email": "cchen795@gmail.com"
  },
  bwiser: {
    "issuer": "https://authentication.ubc.ca",
    "nameQualifier":"https://authentication.ubc.ca",
    "spNameQualifier":"sp_richreview_ubc",
    "urn:oid:1.3.6.1.4.1.60.1.7.1":"cdcb9536-6005-4e93-853f-b17d564d9ecc",
    "urn:oid:0.9.2342.19200300.100.1.1":"bwiser", // nickname
    "urn:oid:0.9.2342.19200300.100.1.3":"bwiser@cs.ubc.ca", // email
    "urn:oid:2.16.840.1.113730.3.1.241":"Bill Wiser", // full name
    "urn:oid:2.5.4.42":"Bill", // first name
    "urn:oid:2.5.4.4":"Wiser", // last name
    "urn:oid:2.16.840.1.113719.1.1.4.1.25": [
      "cn=coursetest,ou=richreview.net,ou=applications,ou=cpsc-ubcv,ou=clients,dc=id,dc=ubc,dc=ca",
      "cn=KORN_102_001_2018W,ou=KORN,ou=UBC,ou=​INSTRUCTOR,dc=id,dc=ubc,dc=ca"
    ],
    "email":"bwiser@cs.ubc.ca", // email
  }
};

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