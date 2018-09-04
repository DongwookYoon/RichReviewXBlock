/**
 * Generates UBC Courses. To read more about courses please read the file richreview_core/node_server/db_schema.md
 * This file is temporary and is to be replaced by an admin UI that can create courses.
 * 
 * by Colin
 */

// npm modules
const assert      = require('chai').assert;

// import library
const RedisClient = require('../lib/redis_client').RedisClient;
const redis_utils = require('../lib/redis_client').util;
const env         = require('../lib/env');
const util        = require('../util');

const course_group_prop_keys = [ ];
const course_groups = [ ];

// TODO: update env variables here


env.COURSE_GROUPS.forEach(course_group => {
  course_groups.push(course_group);
  course_group_prop_keys.push(`crs:ubc:${course_group}:prop`);
});

RedisClient.KEYS("crs:ubc:*:prop")
  .then((keys) => {
    const promises = course_group_prop_keys.map((course_group_prop_key, index) => {
      if(!keys.includes(course_group_prop_key)) {
        return RedisClient.HMSET(course_group_prop_key, "course_group", course_groups[index], "is_active", true, "institution", "UBC");
      }
      else return null;
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