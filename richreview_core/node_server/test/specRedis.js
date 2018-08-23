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

describe("spec", function() {

  before(function () {
    js_utils     = require('../lib/js_utils');
    RedisClient  = require('../lib/redis_client').RedisClient;
    R2D          = require('../lib/r2d');
    redis_utils  = require('../lib/redis_client').util;
  });

  beforeEach(function () { });

  after(function () {
    RedisClient.quit();

  });

  afterEach(function () { });

  it("test array", function() {
    const a = "a"; const b = "b";
    [a].push(b);
  });

  it("test simple graph", function() {
    const graph = "TestGraph";
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
        console.log("asdf");
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
        return RedisClient.DEL(graph);
      })
      .catch(err => {
        util.error(err); assert.fail(err);
      });
  });

  it("test graph w/ multiple connections", function() {
    const graph = "TestGraph";
    const a = "a"; const b = "b"; const c = "c"; const d = "d";

    /*return Promise.all([
      redis_utils.GraphSet(graph, a, b),
      redis_utils.GraphSet(graph, a, c),
      redis_utils.GraphSet(graph, a, d),
      redis_utils.GraphSet(graph, b, c),
      redis_utils.GraphSet(graph, b, d),
      redis_utils.GraphSet(graph, c, d)
    ])*/
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
        return RedisClient.DEL(graph);
      })
      .catch((err) => {
        util.error(err);
        assert.fail(err);
      })

  });


});