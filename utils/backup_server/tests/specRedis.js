
const expect     = require('chai').expect;
const assert     = require('chai').assert;
const helpers    = require('../helpers');
const localRedisClose = require('../handlers/redis').localRedisClose;

let RedisLocalClient = null;
let RedisCacheClient = null;

/**
 * Test redis operations that are being used for redis cache backup and restore
 */
describe("test redis operations", function() {
  before(function() {
    require('../handlers/redis').spawnLocalRedis();
    RedisLocalClient = require('../handlers/redis').createRedisLocalClient();
    RedisCacheClient = require('../handlers/redis').createRedisCacheClient();
  });

  after(function(done) {
    RedisCacheClient.quit()
      .then(() => { return RedisLocalClient.quit(); })
      .then(localRedisClose)
      .finally(done);
  });

  it("send hash from cache to local", () => {
    helpers.log("starting test_backup_hash");
    return RedisLocalClient.HMSET("test", "key1", "val1", "key2", "val2", "key3", "val3")
      .then(() => {
        return RedisLocalClient.HGETALL("test");
      })
      .then((data) => {
        expect(data).to.deep.equal({ key1: "val1", key2: "val2", key3: "val3" });
        const arr = [];
        Object.keys(data).forEach((key) => { arr.push(key, data[key]); });
        expect(arr).to.deep.equal(["key1", "val1", "key2", "val2", "key3", "val3"]);
        return RedisCacheClient.HMSET.bind(null, "test").apply(null, arr);
      })
      .then(() => {
        return RedisCacheClient.HGETALL("test");
      })
      .then((data) => {
        expect(data).to.deep.equal({ key1: "val1", key2: "val2", key3: "val3" });
        return Promise.all([RedisLocalClient.DEL("test"), RedisCacheClient.DEL("test")]);
      })
      .then((bArr) => {
        expect(bArr).to.deep.equal([1,1]);
      })
      .catch((err) => {
        helpers.log_error(err);
        assert.fail(err);
      });
  });

  it("send list from cache to local", () => {
    helpers.log("starting test_migration_list");
    return RedisCacheClient.RPUSH("test", "val1", "val2", "val3", "val4")
      .then((b) => {
        return RedisCacheClient.LRANGE("test", 0, -1);
      })
      .then((arr) => {
        expect(arr).to.deep.equal(["val1","val2","val3","val4"]);
        return RedisLocalClient.RPUSH.bind(null, "test").apply(null, arr);
      })
      .then((b) => {
        return RedisLocalClient.LRANGE("test", 0, -1);
      })
      .then((arr) => {
        expect(arr).to.deep.equal(["val1","val2","val3","val4"]);
        return Promise.all([RedisLocalClient.DEL("test"), RedisCacheClient.DEL("test")]);
      })
      .then((bArr) => {
        expect(bArr).to.deep.equal([1,1]);
      })
      .catch((err) => {
        helpers.log_error(err);
        assert.fail(err);
      });
  });

  it("send string+expiration from cache to local", function () {
    this.timeout(10000);
    const key = "test";
    helpers.log("starting test_backup_string");
    return RedisCacheClient.SET(key, 1, "EX", 1)
      .then(() => {
        return new Promise(resolve => {setTimeout(resolve, 2000) });
      })
      .then(() => {
        return RedisCacheClient.EXISTS(key);
      })
      .then((b) => {
        expect(b).to.equal(0);
        return RedisCacheClient.SET(key, 1, "EX", 3);
      })
      .then(() => {
        return Promise.all([RedisCacheClient.GET(key), RedisCacheClient.TTL(key)]);
      })
      .then(([val, time]) => {
        expect(time).to.be.at.least(0);
        console.log(time);
        expect(val).to.deep.equal("1");
        return Promise.all([RedisLocalClient.SET(key, val), RedisCacheClient.TTL(key)]);
      })
      .then(([b, time]) => {
        if(time !== -1 && time !== -2) {
          return RedisLocalClient.EXPIRE(key, time);
        }
      })
      .then(() => {
        return Promise.all([RedisLocalClient.GET(key), RedisLocalClient.TTL(key)]);
      })
      .then(([val, time]) => {
        expect(time).to.be.at.least(0);
        console.log(time);
        expect(val).to.deep.equal("1");
        return new Promise(resolve => {setTimeout(resolve, 3000) });
      })
      .then(() => {
        return Promise.all([RedisCacheClient.EXISTS(key), RedisLocalClient.EXISTS(key)]);
      })
      .then(bArr => {
        expect(bArr).to.deep.equal([0,0]);
      })
      .catch(err => {
        helpers.log_error(err);
        assert.fail(err);
      });
  });

  it("send set from cache to local", function () {
    const key = "test";
    helpers.log("starting test_backup_set");
    return RedisCacheClient.SADD(key, "value1", "value2", "value3", "value4")
      .then(() => {
        return RedisCacheClient.SMEMBERS(key);
      })
      .then((members /* @param {string[]} members */) => {
        expect(members).to.have.members(["value1", "value2", "value3", "value4"]);
        return RedisLocalClient.SADD.bind(null, key).apply(null, members);
      })
      .then(() => {
        return RedisLocalClient.SMEMBERS(key);
      })
      .then((members /* @param {string[]} members */) => {
        expect(members).to.have.members(["value1", "value2", "value3", "value4"]);
        return Promise.all([RedisCacheClient.DEL(key), RedisLocalClient.DEL(key)]);
      })
      .then(bArr => {
        expect(bArr).to.deep.equal([1,1]);
      })
      .catch(err => {
        helpers.log_error(err);
        assert.fail(err);
      });
  });

  it("send sorted-set from cache to local", function () {
    return RedisCacheClient.ZADD("test", 2, "val1", 4, "val2", 8, "val3", 16, "val4")
      .then(b => {
        return RedisCacheClient.ZRANGE("test", 0, -1, "WITHSCORES");
      })
      .then(arr => {
        expect(arr).to.deep.equal(["val1","2","val2","4","val3","8","val4","16"]);
        let tmp = null;
        for(let i = 0; i < arr.length; i += 2) {
          tmp = arr[i + 1];
          arr[i + 1] = arr[i];
          arr[i] = tmp;
        }
        expect(arr).to.deep.equal(["2","val1","4","val2","8","val3","16","val4"]);
        return RedisLocalClient.ZADD.bind(null,"test").apply(null, arr);
      })
      .then(b => {
        return RedisLocalClient.ZRANGE("test", 0, -1, "WITHSCORES");
      })
      .then(arr => {
        expect(arr).to.deep.equal(["val1","2","val2","4","val3","8","val4","16"]);
        return Promise.all([RedisCacheClient.DEL("test"), RedisLocalClient.DEL("test")]);
      })
      .then(bArr => {
        expect(bArr).to.deep.equal([1,1]);
      })
      .catch(err => {
        helpers.log_error(err);
        assert.fail(err);
      });
  });
});