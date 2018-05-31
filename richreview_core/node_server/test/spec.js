/**
 *
 *
 * created by Colin
 */

const util      = require('../util');
const expect    = require('chai').expect;
let R2D         = null;
let js_utils    = null;
let RedisClient = null;
let PilotStudy  = null;

describe("spec", function() {

    before(function () {
        // require('../www/www');
        R2D = require('../lib/r2d');
        js_utils = require('../lib/js_utils');
        RedisClient = require('../lib/redis_client').RedisClient;
        PilotStudy = require('../lib/pilot_handler');
    });

    beforeEach(function () {

    });

    after(function () {

    });

    afterEach(function() {

    });

    it("test redis 1", () => {
        return RedisClient.SET("mykey", "v")
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
            })
            .catch((err) => {
                expect.fail();
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
        expect(b).to.deep.equal(false);
        return;
    });



    /*it("", () => {
        return R2D.User.prototype.findByEmail("cchen795@gmail.com")
    });*/

    /*it("test create users", () => {
        return PilotStudy.createStudentPilotUser("test05", "wind")
            .then(util.debug)
            .catch(util.error);
    });*/

    /*it("test delete users", () => {
        return R2D.User.prototype.deleteUserByEmail("korn102.01@pilot.study")
            .then((b) => {
                util.debug("finished test");
                expect(1).to.deep.equal(1);
            })
            .catch((err) => {
                util.error(err);
                expect.fail();
            });
    });*/

    // TODO: write some tests
});