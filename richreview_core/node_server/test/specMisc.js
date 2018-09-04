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
    const val = 0;
    assert.isAtLeast(val, 1, "is at least 1");

  });
  
  it("function wrapper", () => {
    const flag = {
      begin: false,
      checkpoint: false,
      end: false
    };
    
    const makeWrapper = (thisArg, fn) => {
      return function() {
        flag.begin = true;
        const result = fn.apply(thisArg, arguments);
        flag.end = true;
        return result;
      };
    };
    
    function MyClass(a, b) {
      this.a = a; this.b = b;
    }
    
    MyClass.prototype.myFunction = function(c, d) {
      flag.checkpoint = true;
      return this.a * this.b * c * d;
    };
    
    expect(flag.begin).to.be.false;
    expect(flag.checkpoint).to.be.false;
    expect(flag.end).to.be.false;
    
    const myClass = new MyClass(2, 3);
    const myWrapperFunction = makeWrapper(myClass, myClass.myFunction);

    expect(flag.begin).to.be.false;
    expect(flag.checkpoint).to.be.false;
    expect(flag.end).to.be.false;
    
    expect(myWrapperFunction(4, 5)).to.equal(120);

    expect(flag.begin).to.be.true;
    expect(flag.checkpoint).to.be.true;
    expect(flag.end).to.be.true;
  });
  
  it("async function wrapper", () => {
    const flag = {
      begin: false,
      checkpoint: false,
      end: false
    };

    const makeAsyncWrapper = (thisArg, fn) => {
      const endCall = (res) => {
        return new Promise(resolve => {
          flag.end = true;
          resolve(res);
        });
      };
      
      
      const beginCall = () => {
        return new Promise(resolve => {
          flag.begin = true;
          resolve(endCall); 
        });
      };
      
      return function() {
        const myArguments = arguments;
        return beginCall()
          .then(endCall => {
            return fn.apply(thisArg, myArguments)
              .then(endCall);
          });
      }; // END function
    };

    function MyClass(a, b) {
      this.a = a; this.b = b;
    }

    MyClass.prototype.myFunction = function(c, d) {
      flag.checkpoint = true;
      return Promise.resolve(this.a * this.b * c * d);
    };

    expect(flag.begin).to.be.false;
    expect(flag.checkpoint).to.be.false;
    expect(flag.end).to.be.false;

    const myClass = new MyClass(2, 3);
    const myWrapperFunction = makeAsyncWrapper(myClass, myClass.myFunction);

    expect(flag.begin).to.be.false;
    expect(flag.checkpoint).to.be.false;
    expect(flag.end).to.be.false;

    return myWrapperFunction(4, 5)
      .then(res => {
        expect(res).to.equal(120);
        expect(flag.begin).to.be.true;
        expect(flag.checkpoint).to.be.true;
        expect(flag.end).to.be.true;
      });
  });
});