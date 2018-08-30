/**
 *
 *
 * created by Colin
 */

const node_util  = require('util');

const util       = require('../util');
const expect     = require('chai').expect;
const assert     = require('chai').assert;

let js_utils     = require('../lib/js_utils');

describe("miscellaneous tests", function() {

  before(function () { });

  beforeEach(function () { });

  after(function () { });

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

  it("test promisify", (done) => {
    function test(a, b, cb) {
      if(a === -1 || b === -1) {
        cb(new Error("failure"), null, null);
      } else {
        cb(null, a + b, a * b);
      }
    }

    test(2, 3, (err, c, d) => {
      if(err) {
        console.log(err.message);
        return;
      }
      console.log(c, d);
    });

    const testAsync = node_util.promisify(test);
    testAsync(2, 3)
      .then((c, d) => {
        console.log(c, d);
      })
      .catch((err) => {
        console.log(err.message);
      })
      .finally(done);
  });

  it("assertions", () => {
    const test = { prop: 0 };
    assert.property(test, 'prop');

  });
});