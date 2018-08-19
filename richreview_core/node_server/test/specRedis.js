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

function run_tests() {

}

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

  run_tests();

});