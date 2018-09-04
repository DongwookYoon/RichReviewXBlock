/**
 * Retroactively mark users by authentication type by setting auth_type key for all users in Redis that has:
 * - no auth_type
 *      + a @cornell.edu email and ID that is a hash of the email => "Cornell"
 *      + @gmail.com => "Google"
 *      + @pilot.study => "Pilot"
 * 
 * 
 * by Colin
 */

// node modules
const crypto      = require('crypto');

// npm modules
const assert      = require('chai').assert;

// import library
const RedisClient = require('../lib/redis_client').RedisClient;
const redis_utils = require('../lib/redis_client').util;
const env         = require('../lib/env');
const util        = require('../util');

//const LOOKUP            = env.EMAIL_USER_LOOKUP;
const TABLE             = env.USERID_EMAIL_TABLE;
const CornellEmailRegex = /@cornell.edu$/;
const GoogleEmailRegex  = /@gmail.com$/;
const PilotStudyRegex   = /@pilot.study$/;

// set DRY_RUN to false or comment to set user's by auth_type
const DRY_RUN = true;

/**
 * The old ID generator
 * @param {string} raw_key
 * @param {string} salt
 * @returns {string}
 */
const genSHA1Salt = function(raw_key, salt){
  const shasum = crypto.createHash('sha1');
  shasum.update(raw_key+salt);
  return shasum.digest('hex').toLowerCase();
};

/**
 * The (old) ID generator used for the Cornell and Pilot users
 * @param {string} key
 * @returns {string} the ID
 */
const makeOldID = function(key) {
  return genSHA1Salt(key, env.sha1_salt.netid).substring(0, 21);
};

/**
 * Set the auth type in Redis
 * @param {string} id
 * @param {string} email
 * @param {string} auth_type
 * @returns {Promise|null}
 */
const setAuthType = ({id, email, auth_type}) => {
  if(auth_type) return null; // if auth type is already set then do nothing
  
  if( CornellEmailRegex.test(email) && makeOldID(email) === id ) {
    // auth_type is Cornell 
    return RedisClient.HSET(`usr:${id}`, "auth_type", env.AUTH_TYPE.CORNELL);
    
  } else if( GoogleEmailRegex.test(email) ) {
    // auth_type is Google
    return RedisClient.HSET(`usr:${id}`, "auth_type", env.AUTH_TYPE.GOOGLE);
    
  } else if( PilotStudyRegex.test(email) ) {
    // auth_type is Pilot
    return RedisClient.HSET(`usr:${id}`, "auth_type", env.AUTH_TYPE.PILOT);
  }
  return null;
};

/**
 * @param {string} id
 * @param {string} email
 * @param {string} auth_type
 * @returns {Promise|null}
 */
const dryRun = ({id, email, auth_type}) => {
  if(auth_type) {
    util.printer("MARK", `id=${id} email=${email} auth_type=${auth_type}`);
  }
};

RedisClient.KEYS("usr:*")
  .then(userids => {
    const promises = userids.map((userid) => {
      return RedisClient.HMGET(userid, "email", "auth_type")
        .then(([email, auth_type]) => {
          assert.isNotNull(email, "email is not null");
          const result = { id: userid.substring(4), email }; 
          if(auth_type)  result.auth_type = auth_type;
          return result;
        });
    });
    return Promise.all(promises);
  })
  .then((oArr /** {{id: string, email: string, [auth_type]: string}[]} **/) => {
    const promises = oArr.map(o => {
      if(DRY_RUN) return dryRun(o);
      else return setAuthType(o);
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
