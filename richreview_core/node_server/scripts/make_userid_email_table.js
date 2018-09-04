/**
 * Create the userid_email_table using emails and IDs from the email_user_lookup.
 * 
 * by Colin
 */

const RedisClient  = require('../lib/redis_client').RedisClient;
const redis_utils  = require('../lib/redis_client').util;
const util        = require('../util');

const TABLE = "userid_email_table";
const LOOKUP = "email_user_lookup";

redis_utils.keyExists(TABLE)
  .then(exists => {
    if(exists) throw new Error(`${TABLE} already exists`);
    return RedisClient.HGETALL(LOOKUP);
  })
  .then(o => {
    if(!(o instanceof Object) || Object.keys(o) === 0) throw new Error(`Something is wrong with ${LOOKUP}`);
    const promises = Object.keys(o).map((k) => {
      util.printer(`MAKE ${TABLE}`, `setting ${k} ${o[k]}`);
      return redis_utils.GraphSet(TABLE, k, o[k]);
    });
    return Promise.all(promises);
  })
  .then(() => {
    util.printer(`MAKE ${TABLE}`, `Done.`);
    return RedisClient.quit();
  })
  .catch(err => {
    util.error(err);
  });
