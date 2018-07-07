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

describe("miscellaneous tests", function() {

  before(function () {
    js_utils     = require('../lib/js_utils');
    // RedisClient  = require('../lib/redis_client').RedisClient;
    // R2D          = require('../lib/r2d');
    // redis_utils  = require('../lib/redis_client').util;
    // PilotHandler = require('../lib/pilot_handler');
    // ClassHandler = require('../lib/class_handler');
    // Course       = require('../lib/Course');
  });

  beforeEach(function () { });

  after(function () {
    // RedisClient.quit();

  });

  afterEach(function () { });

  it("test promise loop apply", (done) => {
    const testFn = (a) => {
      return Promise.resolve(a * 2);
    };
    const testArgs = [[1],[2],[3],[4]];

    js_utils.promiseLoopApply(testFn, testArgs)
      .then(arr => {
        expect(arr).to.deep.equal([2,4,6,8]);
      })
      .catch(err => {
        util.error(err);
        assert.fail(err);
        return null;
      })
      .finally(done);
  });

  it("test promise loop", (done) => {
    const testFn = (a) => {
      return Promise.resolve(a * 2);
    };
    const testArgs = [1,2,3,4];

    js_utils.promiseLoop(testFn, testArgs)
      .then(arr => {
        expect(arr).to.deep.equal([2,4,6,8]);
      })
      .catch(err => {
        util.error(err);
        assert.fail(err);
        return null;
      })
      .finally(done);
  });
});