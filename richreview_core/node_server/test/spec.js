/**
 *
 *
 * created by Colin
 */

const util       = require('../util');
const expect     = require('chai').expect;
const assert     = require('chai').assert;
let R2D          = null;
let js_utils     = null;
let RedisClient  = null;
let PilotHandler = null;
let ClassHandler = null;

describe("spec", function() {

  before(function () {
    RedisClient = require('../lib/redis_client').RedisClient;
    R2D = require('../lib/r2d');
    js_utils = require('../lib/js_utils');
    PilotHandler = require('../lib/pilot_handler');
    ClassHandler = require('../lib/class_handler');
  });

  beforeEach(function () { });

  after(function () { });

  afterEach(function() { });

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

    // TODO: write some tests
    it("ClassHandler: create user test@ubc.ca", (done) => {
      const email = "test@ubc.ca";
      const password = "test_password_123";
      util.testl("user's id is " + ClassHandler.makeID(email));
      ClassHandler.createUser("test@ubc.ca", password)
        .then((user) => {
          util.testl(JSON.stringify(user));
          expect(user.email).to.equal("test@ubc.ca");
          const id = ClassHandler.makeID(email);
          return RedisClient.HGETALL("usr:"+id);
        })
        .then((user_obj) => {
          util.testl(JSON.stringify(user_obj));
          expect(user_obj.email).to.equal("test@ubc.ca");
        })
        .catch((err) => {
          util.error(err);
          assert.fail();
        })
        .finally(done);
    });

  it("ClassHandler: validate ", (done) => {
    const email = "test@ubc.ca";
    const password = "test_password_123";
    R2D.User.prototype.findByEmail(email)
      .then((user) => {
        try {
          const b = ClassHandler.validatePassword(user, password);
          expect(b).to.equal(true);
        } catch(err) {
          assert.fail();
        }
        done();
      })
      .catch((err) => {
        assert.fail();
      });

  });

    it("ClassHandler, R2D: delete user test@ubc.ca", (done) => {
        const email = "test@ubc.ca";
        R2D.User.prototype.deleteUserByEmail(email)
          .then((b) => {
              return R2D.User.prototype.findByEmail(email);
          })
          .then((u) => {
              expect(u).to.equal(null);
              const id = ClassHandler.makeID(email);
              return RedisClient.HGETALL("usr:"+id);
          })
          .then((u) => {
            util.testl(u);
            return Promise.resolve();
          })
          .catch((err) => {
            util.error(err);
          })
          .finally(done);
    });

    //it("ClassHandler, ")

});