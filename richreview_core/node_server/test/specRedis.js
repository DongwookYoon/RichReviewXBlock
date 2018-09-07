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

describe("spec Redis", function() {

  const graph = "TestGraph";

  before(function () {
    js_utils     = require('../lib/js_utils');
    RedisClient  = require('../lib/redis_client').RedisClient;
    R2D          = require('../lib/r2d');
    redis_utils  = require('../lib/redis_client').util;
  });

  beforeEach(function () { });

  after(function () {
    return RedisClient.quit();
  });

  afterEach(function () {
    return RedisClient.DEL(graph);
  });

  it("test simple graph", function() {

    const a = "a"; const b = "b"; const c = "c";

    return redis_utils.GraphSet(graph, a, b)
      .then(() => {
        return Promise.all([
          redis_utils.GraphGet(graph, a),
          redis_utils.GraphGet(graph, b)
        ]);
      })
      .then(([aArr, bArr]) => {
        expect(aArr).to.deep.equal(["b"]);
        expect(bArr).to.deep.equal(["a"]);
        return redis_utils.GraphSet(graph, a, c);
      })
      .then(() => {
        return Promise.all([
          redis_utils.GraphGet(graph, a),
          redis_utils.GraphGet(graph, c),
          redis_utils.GraphGet(graph, b)
        ]);
      })
      .then(([aArr, cArr, bArr]) => {
        expect(aArr).to.deep.equal(["b","c"]);
        expect(cArr).to.deep.equal(["a"]);
        expect(bArr).to.deep.equal(["a"]);
        return redis_utils.GraphSet(graph, a, b);
      })
      .then(() => {
        return Promise.all([
          redis_utils.GraphGet(graph, a),
          redis_utils.GraphGet(graph, c),
          redis_utils.GraphGet(graph, b)
        ]);
      })
      .then(([aArr, cArr, bArr]) => {
        expect(aArr).to.deep.equal(["b","c"]);
        expect(cArr).to.deep.equal(["a"]);
        expect(bArr).to.deep.equal(["a"]);
        return redis_utils.GraphDel(graph, a);
      })
      .then(() => {
        return RedisClient.HKEYS(graph);
      })
      .then((ll) => {
        expect(ll).to.deep.equal([]);
      })
      .catch(err => {
        util.error(err); assert.fail(err);
      });
  });

  it("test graph w/ multiple connections", function() {
    const graph = "TestGraph";
    const a = "a"; const b = "b"; const c = "c"; const d = "d";

    return redis_utils.GraphSet(graph, a, b)
      .then(() => {return redis_utils.GraphSet(graph, a, c); })
      .then(() => {return redis_utils.GraphSet(graph, a, d); })
      .then(() => {return redis_utils.GraphSet(graph, b, c); })
      .then(() => {return redis_utils.GraphSet(graph, b, d); })
      .then(() => {return redis_utils.GraphSet(graph, c, d); })
      .then(() => {
        return Promise.all([
          redis_utils.GraphGet(graph, a),
          redis_utils.GraphGet(graph, b),
          redis_utils.GraphGet(graph, c),
          redis_utils.GraphGet(graph, d)
        ]);
      })
      .then(([aArr, bArr, cArr, dArr]) => {
        expect(aArr).to.have.members(["b", "c", "d"]);
        expect(bArr).to.have.members(["a", "c", "d"]);
        expect(cArr).to.have.members(["a", "b", "d"]);
        expect(dArr).to.have.members(["a", "b", "c"]);
        return redis_utils.GraphDel(graph, a);
      })
      .then(() => {
        return RedisClient.HKEYS(graph);
      })
      .then((keys) => {
        expect(keys).to.have.members(["b", "c", "d"]);
        return Promise.all([
          redis_utils.GraphGet(graph, b),
          redis_utils.GraphGet(graph, c),
          redis_utils.GraphGet(graph, d)
        ]);
      })
      .then(([bArr, cArr, dArr]) => {
        expect(bArr).to.have.members(["c", "d"]);
        expect(cArr).to.have.members(["b", "d"]);
        expect(dArr).to.have.members(["b", "c"]);
        return redis_utils.GraphDel(graph, b);
      })
      .then(() => {
        return RedisClient.HKEYS(graph);
      })
      .then((keys) => {
        expect(keys).to.have.members(["c", "d"]);
        return Promise.all([
          redis_utils.GraphGet(graph, c),
          redis_utils.GraphGet(graph, d)
        ]);
      })
      .then(([cArr, dArr]) => {
        expect(cArr).to.have.members(["d"]);
        expect(dArr).to.have.members(["c"]);
      })
      .catch((err) => {
        util.error(err);
        assert.fail(err);
      });

  });

  it("test graph functionality is atomic", function() {
    const a = "a"; const b = "b"; const c = "c";
    const d = "d"; const e = "e"; const f = "f";

    return Promise.all([
      redis_utils.GraphSet(graph, a, b),
      redis_utils.GraphSet(graph, a, c),
      redis_utils.GraphSet(graph, a, d),
      redis_utils.GraphSet(graph, a, e),
      redis_utils.GraphSet(graph, b, c),
      redis_utils.GraphSet(graph, b, d),
      redis_utils.GraphSet(graph, b, e),
      redis_utils.GraphSet(graph, c, d),
      redis_utils.GraphSet(graph, c, e),
      redis_utils.GraphSet(graph, f, a),
      redis_utils.GraphSet(graph, f, b),
      redis_utils.GraphSet(graph, f, c),
      redis_utils.GraphSet(graph, f, d),
      redis_utils.GraphSet(graph, f, e)

    ])
      .then(() => {
        return Promise.all([
          RedisClient.HKEYS(graph),
          redis_utils.GraphGet(graph, a),
          redis_utils.GraphGet(graph, b),
          redis_utils.GraphGet(graph, c),
          redis_utils.GraphGet(graph, d),
          redis_utils.GraphGet(graph, e),
          redis_utils.GraphGet(graph, f)
        ]);
      })
      .then(([keys, aArr, bArr, cArr, dArr, eArr, fArr]) => {
        expect(keys).to.have.members(["a", "b", "c", "d", "e", "f"]);
        expect(aArr).to.have.members(["b", "c", "d", "e", "f"]);
        expect(bArr).to.have.members(["a", "c", "d", "e", "f"]);
        expect(cArr).to.have.members(["a", "b", "d", "e", "f"]);
        expect(dArr).to.have.members(["a", "b", "c", "f"]);
        expect(eArr).to.have.members(["a", "b", "c", "f"]);
        expect(fArr).to.have.members(["a", "b", "c", "d", "e"]);
        return Promise.all([
          redis_utils.GraphDel(graph, a),
          redis_utils.GraphDel(graph, c),
          redis_utils.GraphDel(graph, e)
        ]);
      })
      .then(() => {
        return Promise.all([
          RedisClient.HKEYS(graph),
          redis_utils.GraphGet(graph, b),
          redis_utils.GraphGet(graph, d),
          redis_utils.GraphGet(graph, f)
        ]);
      })
      .then(([keys, bArr, dArr, fArr]) => {
        expect(keys).to.have.members(["b", "d", "f"]);
        expect(bArr).to.have.members(["d", "f"]);
        expect(dArr).to.have.members(["b", "f"]);
        expect(fArr).to.have.members(["b", "d"]);
      })
      .catch((err) => {
        util.error(err);
        assert.fail(err);
      });
  });

  it("test graph add identical; GraphExists", function() {
    const a = "a"; const b = "b"; const c = "c";
    return redis_utils.GraphSet(graph, a, a)
      .then(() => {
        return Promise.all([
          redis_utils.GraphExists(graph, a),
          redis_utils.GraphGet(graph, a)
        ]);
      })
      .then(([exists, aArr]) => {
        expect(exists).to.be.false;
        expect(aArr).to.deep.equal([]);
        return Promise.all([
          redis_utils.GraphSet(graph, a, b),
          redis_utils.GraphSet(graph, a, c),
          redis_utils.GraphSet(graph, b, c),
        ]);
      })
      .then(() => {
        return Promise.all([
          redis_utils.GraphExists(graph, a),
          redis_utils.GraphExists(graph, b),
          redis_utils.GraphExists(graph, c)
        ]);
      })
      .then((exArr) =>{
        expect(exArr).to.deep.equal([true, true, true]);
      })
      .catch((err) => {
        util.error(err);
        assert.fail(err);
      });
  });
  
  /*it("test GraphSet is commutative", function() {
    const a = "a"; const b = "b"; const c = "c";
    const graph1 = "TestGraph1"; const graph2 = "TestGraph2";
    return redis_utils.GraphSet(graph1, a, b)
      .then(() => {
        return Promise.all([
          redis_utils.GraphExists(graph, a),
          redis_utils.GraphGet(graph, a)
        ]);
      })
      .then(([exists, aArr]) => {
        expect(exists).to.be.true;
        expect(aArr).to.deep.equal([b]);
        return 
      })
      .catch((err) => {
        util.error(err);
        assert.fail(err);
      });
  });*/
  
  it("test makeAtomic", () => {
    const key = "test";
    const compare = [
      0,3,9,21,45,93,189,381,765,1533,3069,6141,12285,24573,49149,98301,
      196605,393213,786429,1572861,3145725,6291453,12582909,25165821,50331645
    ];
    function MyClass(a) { this.a = a; }
    MyClass.prototype.dd = function(b) {
      const that = this;
      return RedisClient.GET(key)
        .then(str => {
          const arr = JSON.parse(str);
          const val = (arr[arr.length - 1] * b) + that.a;
          arr.push(val);
          str = JSON.stringify(arr);
          return RedisClient.SET(key, str);
        });
    };
    const myClass = new MyClass(3);
    const cc = redis_utils.makeAtomic(myClass, myClass.dd);
    return RedisClient.SET(key, JSON.stringify([0]))
      .then(() => {
        return Promise.all([
          cc(2), cc(2), cc(2), cc(2), cc(2), cc(2),
          cc(2), cc(2), cc(2), cc(2), cc(2), cc(2),
          cc(2), cc(2), cc(2), cc(2), cc(2), cc(2),
          cc(2), cc(2), cc(2), cc(2), cc(2), cc(2)
        ]);
      })
      .then(() => {
        return RedisClient.GET(key);
      })
      .then((str) => {
        const arr = JSON.parse(str);
        expect(arr).to.deep.equal(compare);
        return RedisClient.DEL(key);
      })
      .catch((err) => {
        util.error(err);
        assert.fail(err);
      });
    
  });

});