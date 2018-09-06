/**
 * tests for R2D.User, Course, Course enrollment, GoogleStrategy callback, UBC SAML Strategy callback
 *
 * created by Colin
 */

const expect     = require("chai").expect;
const assert     = require("chai").assert;
const node_util  = require("util");

const env        = require("../lib/env");
const util       = require("../util");
let js_utils     = null;
let lib_utils    = null;
let RedisClient  = null;
let R2D          = null;
let redis_utils  = null;
let PilotHandler = null;
let ClassHandler = null;
let Course       = null;
let User         = null;
let Group        = null;

/**
 * Outdated functions
 */
function gggo() {
  it("Course: make CPSC 437D", (done) => {
    const course_dept = "cpsc";
    const course_nbr  = "437d";
    const course_key  = "course:"+course_dept+":"+course_nbr+":prop";
    const course_name = "Video game design";
    Course.createCourse(course_dept, course_nbr, course_name)
      .then((course) => {
        util.testl(course.dept+" "+course.number+": "+course.name);
        util.testl(course.is_active ? "is active" : "is blocked");
        expect(course.dept).to.equal(course_dept);
        expect(course.number).to.equal(course_nbr);
        expect(course.name).to.equal(course_name);
        expect(course.is_active).to.equal(false);
        util.testl("course has been added to cache");
        return RedisClient.HGETALL(course_key);
      })
      .then((course_obj) => {
        expect(course_obj).to.deep.equals({name:course_name,course_is_active:"false"});
        util.testl("course has been added to redis");
        return null;
      })
      .catch((err) => {
        util.error(err);
        assert.fail();
        return null;
      })
      .finally(done);
  });

  it("ClassHandler: create userBatch1", (done) => {
    const nicks = ["amoore", "gfleming", "jdoe", "btorrace"];
    const emails = nicks.map(nick => { return nick+"@ubc.ca"; });
    const ids = emails.map(ClassHandler.makeID);
    const user_keys = ids.map(id => { return "usr:"+id; });
    const password = "test_password_123";
    console.log(JSON.stringify(user_keys,null,"\t"));
    const argl = emails.map((email) => { return [email, password]; });
    js_utils.promiseLoopApply(ClassHandler.createUser, argl)
      .then(bArr => {
        return emails.map(User.findByEmail);
      })
      .then(users => {
        users.forEach((user, index) => {
          expect(user.email).to.equal(emails[index]);
        });
        return user_keys.map(redis_utils.keyExists);
      })
      .then(bArr => {
        expect(bArr).to.deep.equal([true,true,true,true]);
        return user_keys.map(RedisClient.HGETALL);
      })
      .then(user_objs => {
        console.log(JSON.stringify(user_objs,null,"\t"));
        user_objs.forEach((user_obj, index) => {
          expect(user_obj.email).to.equal(emails[index]);
          expect(user_obj.nick).to.equal(nicks[index]);
        });
      })
      .finally(done);
  });

  it("ClassHandler, add jflask as instructor of CPSC 437D", (done) => {
    const course_dept  = "cpsc";
    const course_nbr   = "437d";
    const jflask_email = "jflask@ubc.ca";
    const jflask__id   = ClassHandler.makeID(jflask_email);
    let course = null;
    let jflask = null;
    try {
      course = Course.cache.get(course_dept, course_nbr);
      jflask = R2D.User.cache.get(jflask__id)
    } catch(err) {
      util.error(err);
      assert.fail(err);
      done();
    }
    course.addInstructor(jflask)
      .then((b) => {
        return course.getInstructors();
      })
      .then((instrs)=> {
        assert.isArray(instrs);
        expect(instrs).to.have.lengthOf(1);
        const jflaskQ = instrs[0];
        expect(jflaskQ.email).to.equal(jflask_email);
        return null;
      })
      .catch((err) => {
        util.error(err);
        assert.fail();
        return null;
      })
      .finally(done);
  });

  it("Course: add userBatch1 to students", (done) => {
    const nicks = ["amoore", "gfleming", "jdoe", "btorrace"];
    const emails = nicks.map(nick => { return nick+"@ubc.ca"; });
    const ids = emails.map(ClassHandler.makeID);
    const course_dept = "cpsc";
    const course_nbr  = "437d";
    const _key = "course:"+course_dept+":"+course_nbr;
    let course = null;
    let students = null;
    try {
      course = Course.cache.get(course_dept, course_nbr);
      students = ids.map(User.cache.get);
    } catch(err) { assert.fail(err); } // TODO: fail?
    const promises = students.map(course.addStudent); // add to blocked students
    Promise.all(promises)
      .then(bArr => {
        return course.getStudents();
      })
      .then(students => {
        students.to.have.property("blocked");
        students.to.not.have.property("active");
        console.log(JSON.stringify(students.blocked));
      })
      .catch(err => {
        assert.fail(err);
      })
      .finally(done);
  });

  it("Course: delete CPSC 437D", (done) => {
    const course_dept = "cpsc";
    const course_nbr  = "437d";
    const _key = "course:"+course_dept+":"+course_nbr;
    const course_key                  = _key+":prop";
    const course_instructors_key      = _key+":instructors";
    const course_active_students_key  = _key+":students:active";
    const course_blocked_students_key = _key+":students:blocked";
    let course = null;
    try {
      course = Course.cache.get(course_dept, course_nbr);
    } catch(err) {
      util.error(err);
      assert.fail();
      done();
    }
    course.delete()
      .then((bArr) => {
        const b = Course.cache.exists(course_dept, course_nbr);
        expect(b).to.be.false;
        util.testl("CPSC 437D removed from cache");
        const promises = [
          redis_utils.keyExists(course_key),
          redis_utils.keyExists(course_instructors_key),
          redis_utils.keyExists(course_active_students_key),
          redis_utils.keyExists(course_blocked_students_key)
        ];
        return Promise.all(promises);
      })
      .then((bArr) => {
        expect(bArr).to.deep.equal([false,false,false,false]);
        util.testl("CPSC 437D removed from redis");
        return null;
      })
      .catch((err) => {
        util.error(err);
        assert.fail();
        return null;
      })
      .finally(done);
  });

  it("ClassHandler: delete userBatch1", (done) => {
    const nicks = ["amoore", "gfleming", "jdoe", "btorrace"];
    const emails = nicks.map(nick => { return nick+"@ubc.ca"; });
    const ids = emails.map(ClassHandler.makeID);
    const user_keys = ids.map(id => { return "usr:"+id; });
    //console.log(JSON.stringify(user_keys,null,"\t"));
    /*****************************/
    js_utils.promiseLoop(R2D.User.deleteUser, user_keys)
      .then(bArr => {
        return emails.map(User.findByEmail);
      })
      .then(bArr => {
        expect(bArr).to.deep.equal([null,null,null,null]);
        return user_keys.map(redis_utils.keyExists);
      })
      .then(bArr => {
        expect(bArr).to.deep.equal([false,false,false,false]);
      })
      .catch(err => {
        assert.fail(err);
      })
      .finally(done);
  });
}

describe("RichReview", function() {

  before(function () {
    js_utils     = require("../lib/js_utils");
    RedisClient  = require("../lib/redis_client").RedisClient;
    redis_utils  = require("../lib/redis_client").util;
    R2D          = require("../lib/r2d");
    require("../lib/Model");
    Course       = require("../lib/Course");
    User         = require("../lib/r2d").User;
    Group         = require("../lib/r2d").Group;
    lib_utils    = require("../lib/lib_utils");
    PilotHandler = require("../lib/pilot_handler");
    ClassHandler = require("../lib/class_handler");
    return R2D.User.cache.populate()
      .then(() => {
        return Course.cache.populate();
      });
  });

  beforeEach(function () { });

  after(function () {
    return RedisClient.quit();
  });

  afterEach(function () { });

  describe("#Validation", function() {
    it("js_utils.validateEmail(email)", () => {
      let b = null;
      b = js_utils.validateEmail("test@pilot.study");
      expect(b).to.deep.equal(true);
      b = js_utils.validateEmail("test@edx.org");
      expect(b).to.deep.equal(true);
      b = js_utils.validateEmail("test@cornell.edu");
      expect(b).to.deep.equal(true);
      b = js_utils.validateEmail("test@edx.org");
      expect(b).to.deep.equal(true);
      b = js_utils.validateEmail("@cornell.edutest");
      expect(b).to.deep.equal(false);
      b = js_utils.validateEmail("testcornell.edu");
      expect(b).to.deep.equal(false);
      b = js_utils.validateEmail("@cornell.edu");
      expect(b).to.deep.equal(false);
      b = js_utils.validateEmail("test@alumni.ubc.ca");
      expect(b).to.deep.equal(true);
      b = js_utils.validateEmail("test@ubc.ca");
      expect(b).to.deep.equal(true);
    });

    it("Unmutable", function() {
      const propKey = Course.getPropKey("UBC", "test_100_001_2018W");
      expect(propKey).to.equal("crs:ubc:test_100_001_2018w:prop");
      const propInstrKey = Course.getInstructorKey("UBC", "test_100_001_2018W");
      expect(propInstrKey).to.equal("crs:ubc:test_100_001_2018w:instructors");
    });
  });

  describe.only("#Model", function() {
    
    describe("Group", function() {
      const test = {
        userID: "testingAuserBbbbbbbbbb",
        email: "testing@email.com",
        user: null,
        docKey: "doc:testingAdocBbbbbbbbbbbbbbb_1337",
        creationTime: "1337"
      };
      test.groupID  = `${test.userID}_${test.creationTime}`;
      test.groupKey = `grp:${test.groupID}`;
      
      before("initialize user", function() {
        return User.create(test.userID, test.email)
          .then((user) => { test.user = user; })
      });
      
      after("destroy user", function() {
        // delete doesn't work because group does not belong to a doc
        // return User.deleteUser(test.user.id);
        return Promise.all([
          RedisClient.DEL(test.groupKey),
          RedisClient.DEL(test.user.getUserKey())
        ]);
      });
      
      it("create a one group", function () {
        return Group.CreateNewGroup(test.user.id, test.docKey, test.creationTime)
          .then(groupKey => {
            expect(groupKey).to.equal(test.groupKey);
            return RedisClient.HGETALL(groupKey);
          })
          .then(groupObj => {
            expect(groupObj).to.exist;
            expect(groupObj.userid_n).to.equal(test.user.id);
            expect(groupObj.docid).to.equal(test.docKey);
            expect(groupObj.creationTime).to.equal(test.creationTime);
            util.test.log(groupObj.creationTime);
            expect(JSON.parse(groupObj.users)).to.deep.equal({invited: [], participating: []});
          });
      });
      
      it("connectUserAndGroup", function () {
        return Group.connectUserAndGroup(test.groupID, test.user.id)
          .then(() => {
            return test.user.getGroupIDs();
          })
          .then((groupIDs) => {
            expect(groupIDs).to.deep.equal([test.groupID]);
            return Group.GetUsersFromGroup(test.groupID);
          })
          .then((users) => {
            expect(users).to.have.property("invited");
            expect(users).to.have.property("participating");
            expect(users.invited).to.deep.equal([ ]);
            expect(users.participating).to.deep.equal([test.userID]);
          });
      });
    });
    
    describe.only("Course", function() {
      /**
       * 
       * @type Object
       * @property {Course} course
       * @property {User}   user
       */
      const test = {
        user: null,
        userID: "testingAuserBbbbbbbbbb",
        email: "testing@email.com",
        course: null,
        institution: "UBC",
        institutionL: "ubc",
        course_group: "test_100_001_2018w",
        dept: "test",
        number: "100",
        section: "001",
        year: "2018w",
        title: "Test Course"
      };
      test.coursePropKey = `crs:${test.institutionL}:${test.course_group}:prop`;
      test.courseInstructorsKey = `crs:${test.institutionL}:${test.course_group}:instructors`;
      test.courseActiveStudentsKey = `crs:${test.institutionL}:${test.course_group}:students:blocked`;
      test.courseBlockedStudentsKey = `crs:${test.institutionL}:${test.course_group}:students:active`;

      before("initialize user", function() {
        return User.create(test.userID, test.email)
          .then((user) => {
            assert.instanceOf(user, User);
            test.user = user; 
          });
      });

      after("destroy user", function() {
        return User.deleteUser(test.user.id);
      });
      
      const validateCourse = (c) => {
        expect(c.institution).to.be.equal(test.institutionL);
        expect(c.course_group).to.be.equal(test.course_group);
        expect(c.dept).to.be.equal(test.dept);
        expect(c.number).to.be.equal(test.number);
        expect(c.section).to.be.equal(test.section);
        expect(c.year).to.be.equal(test.year);
        expect(c.title).to.be.equal(test.title);
      };
      
      it("create courses", function() {
        return Course.create(
          test.institution, 
          test.course_group, 
          { 
            detail: { dept: test.dept, number: test.number, section: test.section, year: test.year },
            title: test.title
          }
        )
          .then(course => {
            test.course = course;
            validateCourse(course);
            expect(course.getPropKey()).to.be.equal(test.coursePropKey);
            return RedisClient.HGETALL(course.getPropKey());
          })
          .then(courseObj => {
            validateCourse(courseObj);
          });
      });
      
      it("add+activate user to course", function() {
        return test.course.addStudent(test.user)
          .then(() => {
            // course get
            const students = test.course.getStudents();
            util.test.log(JSON.stringify(students));
            expect(students).to.have.property("blocked");
            expect(students.blocked).to.deep.equal([test.user]);
            expect(test.course.isStudent(test.user)).to.be.true;
            expect(test.course.isBlockedStudent(test.user)).to.be.true;
            expect(test.course.isActiveStudent(test.user)).to.be.false;
            // course cache
            const courses = Course.cache.getCourses.withStudent(test.user);
            expect(courses).to.deep.equal([test.course]);
            expect(Course.cache.exists(test.institution, test.course_group)).to.be.true;
            expect(Course.cache.get(test.institution, test.course_group)).to.equal(test.course);
            return Promise.all([
              RedisClient.SMEMBERS(test.course.getBlockedStudentKey()),
              redis_utils.keyExists(test.course.getActiveStudentKey())
            ])
          })
          .then(([blocked_student_IDs, exists]) => {
            expect(blocked_student_IDs).to.deep.equal([test.userID]);
            expect(exists).to.be.false;
            return test.course.activateStudent(test.user);
          })
          .then(() => {
            // course get
            const students = test.course.getStudents();
            util.test.log(JSON.stringify(students));
            expect(students).to.have.property("active");
            expect(students.active).to.deep.equal([test.user]);
            expect(test.course.isStudent(test.user)).to.be.true;
            expect(test.course.isBlockedStudent(test.user)).to.be.false;
            expect(test.course.isActiveStudent(test.user)).to.be.true;
            return Promise.all([
              RedisClient.SMEMBERS(test.course.getActiveStudentKey()),
              redis_utils.keyExists(test.course.getBlockedStudentKey())
            ])
          })
          .then(([active_student_IDs, exists]) => {
            expect(active_student_IDs).to.deep.equal([test.userID]);
            expect(exists).to.be.false;
          })
      });
      
      it("remove user from Redis", function() {
        return test.course.removeStudent(test.user);
      });
      
      it("delete course", function() {
        return test.course.delete()
          .then(() => {
            return Promise.all([
              redis_utils.keyExists(test.coursePropKey),
              redis_utils.keyExists(test.courseInstructorsKey),
              redis_utils.keyExists(test.courseBlockedStudentsKey),
              redis_utils.keyExists(test.courseActiveStudentsKey)
            ])
              .then(exArr => {
                expect(exArr).to.deep.equal([false, false, false, false]);
              })
          });
      });
    });
    
    describe("User", function() {
      it("ClassHandler: User: create user jflask", () => {
        const email = "jflask@ubc.ca";
        const password = "test_password_123";
        const auth_type = "Internal";
        // usr:a2bd1e849f82599bc97f903216ab2f000da959ef
        const id = ClassHandler.makeID(email);
        //util.testl("user's id is " + id);
        const check = (u) => {
          expect(u.email).to.equal(email);
          expect(u.auth_type).to.equal(auth_type);
          expect(u.nick).to.equal("jflask");
        };
        return ClassHandler.createUser(email, password)
          .then((user) => {
            expect(user).to.be.an.instanceOf(R2D.User);
            check(user);
            const b = ClassHandler.validatePassword(user, password);
            expect(b).to.equal(true);
            return RedisClient.HGETALL(`usr:${id}`);
          })
          // User is in redis
          .then((user_obj) => {
            check(user_obj);
            const b = ClassHandler.validatePassword(
              { password_hash: user_obj.password_hash, salt: user_obj.salt },
              password
            );
            expect(b).to.equal(true);
            return R2D.User.cache.get(id);
          })
          // User is in cache
          .then((user) => {
            expect(user).to.be.an.instanceOf(R2D.User);
            check(user);
            const b = ClassHandler.validatePassword(user, password);
            expect(b).to.equal(true);
          })
          .catch((err) => {
            util.error(err);
            assert.fail(err);
          });
      });

      it("ClassHandler: User: update jflask", () => {
        const email = "jflask@ubc.ca";
        const sid = "1234567890";
        const displayName = "Buggy Jordan";
        const firstName = "Jonathan";
        const lastName = "Flask";
        const auth_type = "Internal";
        const id = ClassHandler.makeID(email);
        const user = R2D.User.cache.get(id);
        expect(user).to.be.an.instanceOf(R2D.User);
        /*********************************************/
        const check = (u) => {
          expect(u.sid).to.equal(sid);
          expect(u.display_name).to.equal(displayName);
          expect(u.first_name).to.equal(firstName);
          expect(u.last_name).to.equal(lastName);
          expect(u.email).to.equal(email);
          expect(u.auth_type).to.equal(auth_type);
          expect(u.nick).to.equal("jflask");
        };
        /*********************************************/
        return user.updateDetails(sid, displayName, firstName, lastName)
          .then((user) => {
            expect(user).to.be.an.instanceOf(R2D.User);
            check(user);
            return RedisClient.HGETALL(`usr:${id}`);
          })
          .then((usr_obj) => {
            check(usr_obj);
            util.testl("details are updated in redis");
          })
          .catch((err) => {
            util.error(err);
            assert.fail(err);
          });
      });

      it("R2D: User: getter functions get jflask", () => {
        // console.log("HERE");
        // console.log(JSON.stringify(user, null, '\t'));
        const email = "jflask@ubc.ca";
        const sid = "1234567890";
        const displayName = "Buggy Jordan";
        const firstName = "Jonathan";
        const lastName = "Flask";
        const auth_type = "Internal";
        const id = ClassHandler.makeID(email);
        const check = (u) => {
          expect(u.id).to.equal(id);
          expect(u.sid).to.equal(sid);
          expect(u.display_name).to.equal(displayName);
          expect(u.first_name).to.equal(firstName);
          expect(u.last_name).to.equal(lastName);
          expect(u.email).to.equal(email);
          expect(u.auth_type).to.equal(auth_type);
          expect(u.nick).to.equal("jflask");
        };
        return R2D.User.getWithEmailByAuthType(email)
          .then(users => {
            expect(users).to.have.property(auth_type);
            const user = (users[auth_type])[0];
            expect(user).to.be.an.instanceOf(R2D.User);
            check(user);
            return R2D.User.findByEmail(email);
          })
          .then(user => {
            expect(user).to.be.an.instanceOf(R2D.User);
            check(user);
          })
          .catch((err) => {
            util.error(err);
            assert.fail(err);
          });
      });

      //gggo();

      it("ClassHandler: User: delete jflask", () => {
        const email = "jflask@ubc.ca";
        const id = ClassHandler.makeID(email);
        return R2D.User.deleteUser(id)
          .then((b) => {
            return R2D.User.findByID(id);
          })
          .then((u) => {
            expect(u).to.equal(null);
            return redis_utils.keyExists(`usr:${id}`);
          })
          .then((b) => {
            expect(b).to.be.false;
            return redis_utils.GraphExists("userid_email_table", `usr:${id}`);
          })
          .then((b) => {
            expect(b).to.be.false;
          })
          .catch((err) => {
            util.teste(err);
            assert.fail();
          });
      });
    });
  });
  
  describe("#Google", function() {

    const testProfileAttr = {
      display_name: "James Randi",
      first_name: "Randi",
      last_name: "Randi",
      email: "jrandi@gmail.com",
      auth_type: "Google",
      nick: "jrandi"
    };
    const testID = 100009382999999999999;
    const testProfile = {
      "id": testID,
      "displayName": testProfileAttr.display_name,
      "name": {
        "familyName": testProfileAttr.last_name,
        "givenName": testProfileAttr.first_name
      },
      "emails": [{
          "value": testProfileAttr.email,
          "type": "account"
      }],
      "photos": [{
          "value": "https://upload.wikimedia.org/wikipedia/commons/b/b4/JPEG_example_JPG_RIP_100.jpg"
      }],
      "gender": "male",
      "provider": "google",
      "_raw": "THIS INFO IS NOT RELEVANT",
      "_json": {
        "kind": "plus#person",
        "etag": "\"AAAAAAAAAAAAAAAAAAAAAAAAAAA/aaaaaaaaaaaaaaaaaaaaaaaaaaa\"",
        "gender": "male",
        "emails": [{
            "value": testProfileAttr.email,
            "type": "account"
        }],
        "objectType": "person",
        "id": testID,
        "displayName": testProfileAttr.display_name,
        "name": {
          "familyName": testProfileAttr.last_name,
          "givenName": testProfileAttr.first_name
        },
        "url": `https://plus.google.com/${testID}`,
        "image": {
          "url": "https://upload.wikimedia.org/wikipedia/commons/b/b4/JPEG_example_JPG_RIP_100.jpg",
          "isDefault": true
        },
        "isPlusUser": true,
        "circledByCount": 9,
        "verified": false
      }
    };

    const validateUserDetails = (u) => {
      // user detail autofill not done.
      // expect(u.display_name).to.equal(testProfileAttr.display_name);
      // expect(u.first_name).to.equal(testProfileAttr.first_name);
      // expect(u.last_name).to.equal(testProfileAttr.last_name);
      expect(u.id).to.equal(testID);
      expect(u.email).to.equal(testProfileAttr.email);
      expect(u.auth_type).to.equal(testProfileAttr.auth_type);
      expect(u.nick).to.equal(testProfileAttr.nick);
    };
    
    it("auth: User: create jrandi from testProfile", () => {
      return new Promise(resolve => {
        const checkPoint = (err, user) => {
          if(err) {
            util.teste(err);
            assert.fail(err);
          }
          expect(user).to.be.an.instanceOf(R2D.User);
          validateUserDetails(user);
          resolve();
        };
        lib_utils.googleStrategyCB(null, null, testProfile, checkPoint);
      });
    }); // END auth: User: create jrandi from testProfile
    
    it("auth: User: test googleStrategyCB emailSync", () => {
      testProfileAttr.email = "invisible@gmail.com";
      
    });

    it("User: delete jrandi", () => {
      return R2D.User.deleteUser(testID)
        .then((b) => {
          return R2D.User.findByID(testID);
        })
        .then((u) => {
          expect(u).to.equal(null);
          return redis_utils.keyExists(`usr:${testID}`);
        })
        .then((b) => {
          expect(b).to.be.false;
          return redis_utils.GraphExists("userid_email_table", `usr:${testID}`);
        })
        .then((b) => {
          expect(b).to.be.false;
        })
        .catch((err) => {
          util.teste(err);
          assert.fail(err);
        });
    }); // END User: delete jrandi
  }); // END #Google

  describe("#CWL", function() {

    const uid = "urn:oid:0.9.2342.19200300.100.1.1";
    const mail = "urn:oid:0.9.2342.19200300.100.1.3";
    const displayName = "urn:oid:2.16.840.1.113730.3.1.241";
    const givenName = "urn:oid:2.5.4.42";
    const sn = "urn:oid:2.5.4.4";
    const ubcEduStudentNumber = "urn:mace:dir:attribute-def:ubcEduStudentNumber";
    const ubcEduPersistentID = "urn:oid:1.3.6.1.4.1.60.1.7.1";
    const groupMembership = "urn:oid:2.16.840.1.113719.1.1.4.1.25";

    const testID = "32r9r0io4-234h23n-12342ref3-esfq33r2";
    const testAttribute = {
      id: testID,
      sid: "33456781",
      display_name: "Frank Hirst",
      first_name: "Frank",
      last_name: "Hirst",
      email: "fhirst@ubc.ca",
      auth_type: "UBC_CWL",
      nick: "fhirst"
    };
    const testProfile = {
      "issuer": "https://authentication.ubc.ca",
      "sessionIndex": "_c98a80bc526723f25ff47438cf601e44",
      "nameID": "AAdzZWNyZXQx8mtuVkyqyATy6s/Fe7vZ0U3bI6lVf6bllXdWfrPfZLNkwneWryRG4KRBeUQM5WIs2GUTsNoZl+MhBa4kgkpY5JGA7xTJz/KwnaeVv0arw3AebjtqxwxgHA==",
      "nameIDFormat": "urn:oasis:names:tc:SAML:2.0:nameid-format:transient",
      "nameQualifier": "https://authentication.ubc.ca",
      "spNameQualifier": "sp_richreview_ubc",
      "urn:oid:1.3.6.1.4.1.60.1.7.1": testID, // ubcEduPersistentID
      "urn:oid:0.9.2342.19200300.100.1.1": "es334567",    // CWL login
      "urn:oid:0.9.2342.19200300.100.1.3": testAttribute.email, // email
      "urn:oid:2.16.840.1.113730.3.1.241": testAttribute.display_name, // displayName
      "urn:oid:2.5.4.42": testAttribute.first_name, // first_name
      "urn:mace:dir:attribute-def:ubcEduStudentNumber": testAttribute.sid, // sid
      "urn:oid:2.5.4.4": testAttribute.last_name, // last name
      "urn:oid:2.16.840.1.113719.1.1.4.1.25": [
        "ou=richreview.net,ou=applications,ou=cpsc-ubcv,ou=clients,dc=id,dc=ubc,dc=ca",
        `ou=richreview.net,cn=${env.UBC.CWL.ATTRIBUTE.GROUP.CHIN_141_002_2018W_INSTRUCTOR},ou=applications,cn=korn_102_001_2018w,ou=cpsc-ubcv,ou=clients,dc=id,dc=ubc,dc=ca`,
        `ou=richreview.net,ou=applications,cn=${env.UBC.CWL.ATTRIBUTE.GROUP.KORN_102_001_2018W},ou=cpsc-ubcv,cn=chin_141_002_2018w_instructor,ou=clients,dc=id,dc=ubc,dc=ca`,
        "cn=CPSC_110_001_2018w_instructor,ou=richreview.net,ou=applications,ou=cpsc-ubcv,ou=clients,dc=id,dc=ubc,dc=ca",
        "ou=richreview.net,ou=applications,ou=cpsc-ubcv,ou=clients,dc=id,dc=ubc,dc=ca,cn=CPSC_420_001_2018w"
      ], // group_attributes
      "mail": "test@ubc.ca",
      "email": "test@ubc.ca"
    };

    // 20190831 Anthony set up 4 accounts.
    // chin_141_002_2018w
    // chin_141_002_2018w_instructor
    // korn_102_001_2018w
    // korn_102_001_2018w_instructor

    const validateUserDetails = (u) => {
      expect(u.sid).to.equal(testAttribute.sid);
      expect(u.display_name).to.equal(testAttribute.display_name);
      expect(u.first_name).to.equal(testAttribute.first_name);
      expect(u.last_name).to.equal(testAttribute.last_name);
      expect(u.email).to.equal(testAttribute.email);
      expect(u.auth_type).to.equal(testAttribute.auth_type);
      expect(u.nick).to.equal(testAttribute.nick);
    };
    
    const validateEnrollment = (user) => {
      // korn_102_001_2018w
      const c1 = Course.cache.getCourses.withStudent(user);
      // chin_141_002_2018w_instructor
      const c2 = Course.cache.getCourses.withInstructor(user);
      expect(c1).to.have.lengthOf(1);
      expect(c2).to.have.lengthOf(1);
      expect(c1[0].getInstitution()).to.equal(env.INSTITUTION.UBC.toLocaleLowerCase());
      expect(c1[0].getCourseGroup()).to.equal(env.COURSE_GROUP.KORN_102_001_2018W);
      expect(c2[0].getInstitution()).to.equal(env.INSTITUTION.UBC.toLocaleLowerCase());
      expect(c2[0].getCourseGroup()).to.equal(env.COURSE_GROUP.CHIN_141_002_2018W);
      return Promise.all([
        RedisClient.SMEMBERS(Course.getBlockedStudentKey(env.INSTITUTION.UBC, env.COURSE_GROUP.KORN_102_001_2018W)),
        RedisClient.SMEMBERS(Course.getInstructorKey(env.INSTITUTION.UBC, env.COURSE_GROUP.CHIN_141_002_2018W))
      ])
        .then(([blockedStudentIDs, instructorIDs]) => {
          expect(blockedStudentIDs).to.have.lengthOf(1);
          expect(instructorIDs).to.have.lengthOf(1);
          expect(blockedStudentIDs[0]).to.equal(user.id);
          expect(instructorIDs[0]).to.equal(user.id);
          util.testl("validateEnrollment: DONE");
          return user;
        })
        .catch(err => {
          util.teste(err);
          assert.fail(err);
        });
    };

    /**
     * Function to test that group attribute reading implementation is good.
     */
    it("Course: read group attributes", () => {
      const regex = /cn=[a-zA-Z0-9_]+/i;
      const getAttribute = (ss) => {
        const regex = /cn=[a-zA-Z0-9_]+/i;
        const result = regex.exec(ss);
        if(result) {
          return (result[0]).substring(3);
        } else {
          return null;
        }
      };
      const ss = testProfile[groupMembership];
      let result = regex.exec(ss[0]);
      expect(result).to.be.null;
      expect(getAttribute(ss[0])).to.be.null;
      result = regex.exec(ss[1]);
      expect(result).to.deep.equal(["cn=chin_141_002_2018w_instructor"]);
      expect(getAttribute(ss[1])).to.equal("chin_141_002_2018w_instructor");
      result = regex.exec(ss[2]);
      expect(result).to.deep.equal(["cn=korn_102_001_2018w"]);
      expect(getAttribute(ss[2])).to.equal("korn_102_001_2018w");

      const getCourseGroupIDs = (profile) => {
        assert.property(profile, groupMembership, "profile does not have groupMembership attribute");
        assert.instanceOf(profile[groupMembership], Array, "profile[groupMembership] is not an array");
        let courseGroupIDs = (profile[groupMembership]).map((group_str) => {
          return getAttribute(group_str);
        });
        return courseGroupIDs.filter((courseGroupID) => { return !!courseGroupID });
      };
      result = getCourseGroupIDs(testProfile);
      expect(result).to.have.members([
        'chin_141_002_2018w_instructor',
        'korn_102_001_2018w',
        'CPSC_110_001_2018w_instructor',
        'CPSC_420_001_2018w'
      ]);
    });

    /**
     * Courses exists and there are no users enrolled in the course
     */
    it("initialization", () => {
      const course_existing = [
        Course.cache.exists(env.INSTITUTION.UBC, env.COURSE_GROUP.CHIN_141_002_2018W),
        Course.cache.exists(env.INSTITUTION.UBC, env.COURSE_GROUP.KORN_102_001_2018W)
      ];
      expect(course_existing).to.deep.equal([true,true]);
      const course_users = [
        Course.cache.get(env.INSTITUTION.UBC, env.COURSE_GROUP.CHIN_141_002_2018W).instructors.size,
        Course.cache.get(env.INSTITUTION.UBC, env.COURSE_GROUP.CHIN_141_002_2018W).blocked_students.size,
        Course.cache.get(env.INSTITUTION.UBC, env.COURSE_GROUP.CHIN_141_002_2018W).active_students.size,
        Course.cache.get(env.INSTITUTION.UBC, env.COURSE_GROUP.KORN_102_001_2018W).instructors.size,
        Course.cache.get(env.INSTITUTION.UBC, env.COURSE_GROUP.KORN_102_001_2018W).blocked_students.size,
        Course.cache.get(env.INSTITUTION.UBC, env.COURSE_GROUP.KORN_102_001_2018W).active_students.size
      ];
      expect(course_users).to.deep.equal([0,0,0,0,0,0]);
      return Promise.all([
        redis_utils.keyExists(Course.getInstructorKey(env.INSTITUTION.UBC, env.COURSE_GROUP.CHIN_141_002_2018W)),
        redis_utils.keyExists(Course.getBlockedStudentKey(env.INSTITUTION.UBC, env.COURSE_GROUP.CHIN_141_002_2018W)),
        redis_utils.keyExists(Course.getActiveStudentKey(env.INSTITUTION.UBC, env.COURSE_GROUP.CHIN_141_002_2018W)),
        redis_utils.keyExists(Course.getInstructorKey(env.INSTITUTION.UBC, env.COURSE_GROUP.KORN_102_001_2018W)),
        redis_utils.keyExists(Course.getBlockedStudentKey(env.INSTITUTION.UBC, env.COURSE_GROUP.KORN_102_001_2018W)),
        redis_utils.keyExists(Course.getActiveStudentKey(env.INSTITUTION.UBC, env.COURSE_GROUP.KORN_102_001_2018W))
      ])
        .then(exArr => {
          expect(exArr).to.deep.equal([false,false,false,false,false,false]);
          return redis_utils.keyExists(R2D.User.makeUserKey(testID));
        }).then((exists) => {
          expect(exists).to.be.false;
        })
        .catch((err) => {
          util.teste(err);
          assert.fail(err);
        });
    });

    it("User: create fhirst from testProfile", () => {
      return new Promise((resolve) => {
        const checkPoint = (err, user) => {
          if(err) {
            util.teste(err);
            assert.fail(err);
          }
          expect(user).to.be.an.instanceOf(R2D.User);
          validateUserDetails(user);
          validateEnrollment(user).then(resolve);
        };
        lib_utils.UBCsamlStrategyCB(testProfile, checkPoint)
      });
    });

    it("User: getter functions get fhirst", () => {
      return R2D.User.findByID(testID)
        .then(user => {
          expect(user).to.be.an.instanceOf(R2D.User);
          validateUserDetails(user);
          return R2D.User.findByEmail(testAttribute.email);
        })
        .then(user => {
          expect(user).to.be.an.instanceOf(R2D.User);
          validateUserDetails(user);
          return RedisClient.HGETALL(`usr:${testID}`);
        })
        .then(user_obj => {
          validateUserDetails(user_obj);
        })
        .catch((err) => {
          util.teste(err);
          assert.fail(err);
        });
    });
    
    it("call UBCsamlStrategyCB twice does not overwrite user", function() {
      const testGroupID = "testingAgroupBbbbbbbbbbbbbbb";
      const UBCsamlStrategyCBAsync = node_util.promisify(lib_utils.UBCsamlStrategyCB);
      return R2D.User.prototype.AddGroupToUser(testID, testGroupID)
        .then(() => {
          return UBCsamlStrategyCBAsync(testProfile);
        })
        .then((user) => {
          expect(user).to.be.an.instanceOf(R2D.User);
          validateUserDetails(user);
          return validateEnrollment(user);
        })
        .then((user) => {
          return user.getGroupIDs();
        })
        .then(groupIDs => {
          expect(groupIDs).to.deep.equal([testGroupID]);
          return R2D.User.prototype.RemoveGroupFromUser(testID, testGroupID)
        })
        .catch((err) => {
          util.test.error(err);
          assert.fail(err);
        });
    });
    
    it("User syncEmail", function () {
      const testGroupID = "testingAgroupBbbbbbbbbbbbbbb";
      const UBCsamlStrategyCBAsync = node_util.promisify(lib_utils.UBCsamlStrategyCB);
      testProfile[env.UBC.CWL.ATTRIBUTE.ubcEduStudentNumber] = "000";
      return R2D.User.prototype.AddGroupToUser(testID, testGroupID)
        .then(() => {
          return UBCsamlStrategyCBAsync(testProfile);
        })
        .then(user => {
          expect(user).to.be.an.instanceOf(R2D.User);
          validateUserDetails(user);
          return validateEnrollment(user);
        })
        .then((user) => {
          return user.getGroupIDs();
        })
        .then(groupIDs => {
          expect(groupIDs).to.deep.equal([testGroupID]);
          return R2D.User.prototype.RemoveGroupFromUser(testID, testGroupID)
        })
        .catch((err) => {
          util.test.error(err);
          assert.fail(err);
        });
    });

    it("User: delete fhirst", () => {
      return R2D.User.deleteUser(testID)
        .then((b) => {
          return R2D.User.findByID(testID);
        })
        .then((u) => {
          expect(u).to.equal(null);
          return redis_utils.keyExists(`usr:${testID}`);
        })
        .then((b) => {
          expect(b).to.be.false;
          return redis_utils.GraphExists("userid_email_table", `usr:${testID}`);
        })
        .then((b) => {
          expect(b).to.be.false;
        })
        .catch((err) => {
          util.teste(err);
          assert.fail(err);
        });
    }); // END User: delete fhirst
  });
});