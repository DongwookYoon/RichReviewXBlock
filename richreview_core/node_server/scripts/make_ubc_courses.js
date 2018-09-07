/**
 * Generates UBC Courses. To read more about courses please read the file richreview_core/node_server/db_schema.md
 * This file is temporary and is to be replaced by an admin UI that can create courses.
 * 
 * by Colin
 */

// npm modules
const assert      = require('chai').assert;

// import library
const env         = require('../lib/env');
const RedisClient = require('../lib/redis_client').RedisClient;
const redis_utils = require('../lib/redis_client').util;
const Course      = require("../lib/Course");

const util        = require('../util');

Course.cache.populate()
  .then(() => {
    return RedisClient.KEYS("crs:ubc:*:prop");
  })
  .then((keys) => {
    const promises = Object.keys(env.COURSE_GROUP_DETAIL).map(key => {
      const o = env.COURSE_GROUP_DETAIL[key];
      return Course.create(o.institution, o.course_group, o);
    });
    return Promise.all(promises);
  })
  .then(() => {
    util.printer("MARK", "Done.");
    return RedisClient.quit();
  })
  .catch(err => {
    util.error(err);
  });