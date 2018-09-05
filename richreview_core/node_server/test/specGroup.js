/**
 * tests for R2D.User, Course, Course enrollment, GoogleStrategy callback, UBC SAML Strategy callback
 *
 * created by Colin
 */

const expect     = require('chai').expect;
const assert     = require('chai').assert;

const env        = require('../lib/env');
const util       = require('../util');
let js_utils     = null;
let RedisClient  = null;
let R2D          = null;
let redis_utils  = null;
let Course       = null;

describe("RichReview", function() {

  before(function () {
    js_utils = require('../lib/js_utils');
    RedisClient = require('../lib/redis_client').RedisClient;
    redis_utils = require('../lib/redis_client').util;
    R2D = require('../lib/r2d');
    Course = require('../lib/Course');
    require("../lib/Model");
    return R2D.User.cache.populate()
      .then(() => { return Course.cache.populate(); });
  });

  beforeEach(function () {
  });

  after(function () {
    return RedisClient.quit();
  });

  afterEach(function () { });
  
  describe("#Group")
});
