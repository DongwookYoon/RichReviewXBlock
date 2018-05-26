
const util = require('../util');
const expect = require('chai').expect;
let R2D = null;
let RedisClient = null;
let PilotStudy = null;

describe("spec", function() {

    before(function () {
        // require('../www/www');
        R2D = require('../lib/r2d');
        RedisClient = require('../lib/redis_client').RedisClient;
        PilotStudy = require('../lib/pilot_study');
    });

    beforeEach(function () {

    });

    after(function () {

    });

    afterEach(function() {

    });

    it("1 + 1 = 2", function () {
        expect( 1 + 1 ).to.equal(2);
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

    it("test create users", () => {
        return PilotStudy.createStudentPilotUser("test05", "wind")
            .then(util.debug)
            .catch(util.error);
    });

    it("test delete users", () => {
        return R2D.User.prototype.deleteUserByEmail("korn102.01@pilot.study")
            .then((b) => {
                util.debug("finished test");
                expect(1).to.deep.equal(1);
            })
            .catch((err) => {
                util.error(err);
                expect.fail();
            });
    });

    // TODO: write some tests
});