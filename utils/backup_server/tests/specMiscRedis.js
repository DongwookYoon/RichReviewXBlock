
const child_process  = require('child_process');
const util    = require('util');
const fs    = require('fs');
const path    = require('path');
const redis   = require('redis');
const expect  = require('chai').expect;
const assert  = require('chai').assert;
const env     = require('../env');
const helpers = require('../helpers');

let RedisLocalClient = null;
const localRedisClose = require('../handlers/redis').localRedisClose;

describe("test redis operations", function() {
  before(function () {
    require('../handlers/redis').spawnLocalRedis();
    RedisLocalClient = require('../handlers/redis').createRedisLocalClient();
  });

  after(function (done) {
    RedisLocalClient.quit()
      .then(localRedisClose)
      .finally(done);
  });

  it("create client then spawn server", function () {
    key = "test";
    return RedisLocalClient.SADD(key, "value1", "value2", "value3", "value4")
      .then(() => {
        return RedisLocalClient.SMEMBERS(key);
      })
      .then((members /* @param {string[]} members */) => {
        expect(members).to.have.members(["value1", "value2", "value3", "value4"]);
        return RedisLocalClient.DEL(key);
      })
      .then(b => {
        expect(b).to.equal(1);
      })
      .catch(err => {
        helpers.log_error(err);
        assert.fail(err);
      });
  });

});