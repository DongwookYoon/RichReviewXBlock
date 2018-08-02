/**
 *
 *
 * created by Colin
 */

const util       = require('../util');
const expect     = require('chai').expect;
const assert     = require('chai').assert;

let js_utils     = null;
let RedisClient  = null;
let R2D          = null;
let redis_utils  = null;
let PilotHandler = null;
let ClassHandler = null;
let Course       = null;

function someTests() {
  it("test redis 1", (done) => {
    RedisClient.SET("mykey", "v")
      .then((b) => {
        util.debug("after set");
        util.debug(b);
        util.debug(typeof b);
        return RedisClient.GET("mykey");
      })
      .then((a) => {
        util.debug("after get");
        util.debug(a);
        util.debug(typeof a);
        return RedisClient.DEL("mykey");
      })
      .then((b) => {
        util.debug("after delete");
        util.debug(b);
        util.debug(typeof b);
        expect(1).to.equal(1);
        done();
      })
      .catch((err) => {
        assert.fail();
      });
  });

  it("test redis 2", () => {
    return RedisClient.KEYS("doc:*") // this is array
      .then((keys) => {
        const promises =keys.map((key) => {
          return RedisClient.HGET(key,"userid_n")
            .then((userid_n) => {
              if(userid_n === "1534dbb7f370135c7df06") {
                util.debug("hit");
              }
              return 0;
            });
        });
        return Promise.all(promises);
      });
  });

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
}

function specModel() {
  it("ClassHandler: User: create user jflask", (done) => {
    const email = "jflask@ubc.ca";
    const password = "test_password_123";
    util.testl("user's id is " + ClassHandler.makeID(email));
    ClassHandler.createUser("jflask@ubc.ca", password)
      .then((user) => {
        expect(user.email).to.equal("jflask@ubc.ca");
        const id = ClassHandler.makeID(email);
        return RedisClient.HGETALL("usr:"+id);
      })
      .then((user_obj) => {
        expect(user_obj.email).to.equal("jflask@ubc.ca");
        expect(user_obj.nick).to.equal("jflask");
        return null;
      })
      .catch((err) => {
        util.error(err);
        assert.fail();
        return null;
      })
      .finally(done);
  });

  it("ClassHandler: User: validate jflask", (done) => {
    const email = "jflask@ubc.ca";
    const password = "test_password_123";
    R2D.User.prototype.findByEmail(email)
      .then((user) => {
        try {
          const b = ClassHandler.validatePassword(user, password);
          expect(b).to.equal(true);
          util.testl("validation successful");
        } catch(err) {
          assert.fail();
        }
        return null;
      })
      .catch((err) => {
        util.error(err);
        assert.fail();
        return null;
      })
      .finally(done);
  });

  it("User: update jflask", (done) => {
    const email = "jflask@ubc.ca";
    R2D.User.prototype.findByEmail(email)
      .then((user) => {
        return user.updateDetails("1234567890","Jonathan","Flask");
      })
      .then((user) => {
        util.testl(user.sid+" "+user.first_name+" "+user.last_name);
        expect(user.sid).to.equal("1234567890");
        expect(user.first_name).to.equal("Jonathan");
        expect(user.last_name).to.equal("Flask");
        util.testl("details are updated in cache");
        const user_key = "usr:"+user.id;
        return RedisClient.HGETALL(user_key);
      })
      .then((usr_obj) => {
        expect(usr_obj.sid).to.equal("1234567890");
        expect(usr_obj.first_name).to.equal("Jonathan");
        expect(usr_obj.last_name).to.equal("Flask");
        util.testl("details are updated in redis");
        return null;
      })
      .catch((err) => {
        util.error(err);
        assert.fail();
        return null;
      })
      .finally(done);
  });

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
        return emails.map(User.prototype.findByEmail);
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
    console.log(JSON.stringify(user_keys,null,"\t"));
    /*****************************/
    js_utils.promiseLoop(R2D.User.deleteUserByEmail, emails)
      .then(bArr => {
        return emails.map(User.prototype.findByEmail);
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

  it("ClassHandler: User: delete jflask", (done) => {
    const email = "jflask@ubc.ca";
    R2D.User.deleteUserByEmail(email)
      .then((b) => {

        return R2D.User.prototype.findByEmail(email);
      })
      .then((u) => {
        expect(u).to.equal(null);
        const id = ClassHandler.makeID(email);
        return redis_utils.keyExists("usr:"+id);
      })
      .then((b) => {
        expect(b).to.be.false;
        return null;
      })
      .catch((err) => {
        util.error(err);
        assert.fail();
        return null;
      })
      .finally(done);
  });
}

describe("spec", function() {

  before(function () {
    js_utils     = require('../lib/js_utils');
    RedisClient  = require('../lib/redis_client').RedisClient;
    R2D          = require('../lib/r2d');
    redis_utils  = require('../lib/redis_client').util;
    PilotHandler = require('../lib/pilot_handler');
    ClassHandler = require('../lib/class_handler');
    Course       = require('../lib/Course');
  });

  beforeEach(function () { });

  after(function (done) {
    RedisClient.quit().finally(done);

  });

  afterEach(function () { });

  // someTests();

  specModel();

});