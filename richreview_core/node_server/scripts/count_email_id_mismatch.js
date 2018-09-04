/**
 * Count special accounts.
 * 
 * In email_user_lookup, the set of emails and IDs are one-to-one correspondent pairs. A special account is:
 *  - has an email that is not @gmail.com, @pilot.study, or @cornell.edu
 *  - has a @cornell.edu email with ID that is not a hash of the email
 * 
 * by Colin
 * 
 * NOTE: this script should be run on the VM
 */

// node modules
const crypto      = require('crypto');

// npm modules
const assert      = require('chai').assert;
const writeFileAsync = require('util').promisify(require('fs').writeFile);  /*(file, data[, options], callback)*/

// import library
const RedisClient = require('../lib/redis_client').RedisClient;
const redis_utils = require('../lib/redis_client').util;
const env         = require('../lib/env');
const util        = require('../util');

const LOOKUP            = "email_user_lookup";
// const TABLE = "userid_email_table";
const CornellEmailRegex = /@cornell.edu$/;
const GoogleEmailRegex  = /@gmail.com$/;
const PilotStudyRegex   = /@pilot.study$/;

/** { [id]: string[] } **/
const docHash = { };

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

const makeDocHash = () => {
  return RedisClient.KEYS("doc:*")
    .then((docids) => {
      const promises = docids.map((docid) => {
        return RedisClient.HGET(docid, "userid_n")
          .then((id) => {
            if(docHash[id]) docHash[id].push(docid);
            else docHash[id] = [docid];
          });
        return Promise.all(promises);
      });
    });
};

const handleSpecialEmail = (email, id, userid) => {
  return RedisClient.HGET(userid, "groupNs")
    .then((groups_str) => {
      const groups = JSON.parse(groups_str);
      assert.isArray(groups, "groups is an array");
      const documents = docHash[id];
      const result = { email, id };
      if( groups.length > 0 ) result.groups = groups;
      if( documents && documents.length > 0 ) result.documents = documents;
      return result;
    });
};

/**
 * 
 * @param {string} email - 
 * @param {string} userid - of form usr:<id> 
 */
const getEmailStatus = (email, userid) => {
  const id = userid.substring(4);
  if( CornellEmailRegex.test(email) ) {
    if(makeOldID(email) !== id) return handleSpecialEmail(email, id, userid);
    else return Promise.resolve(null);
  } else if( GoogleEmailRegex.test(email) ) {
    return Promise.resolve(null);
  } else if( PilotStudyRegex.test(email) ) {
    return Promise.resolve(null);
  } else {
    return handleSpecialEmail(email, id, userid);
  }
};

redis_utils.keyExists(LOOKUP)
  .then(exists => {
    if (!exists) throw new Error(`${LOOKUP} does not exists`);
    return makeDocHash();
  })
  .then(() => {
    return RedisClient.HGETALL(LOOKUP);
  })
  .then(o => {
    if(!(o instanceof Object) || Object.keys(o) === 0) throw new Error(`Something is wrong with ${LOOKUP}`);
    
    const promises = Object.keys(o).map((email) => {
      return getEmailStatus(email, o[email]);
    });
    return Promise.all(promises);
  })
  .then((specialAccounts) => {
    specialAccounts = specialAccounts.filter((specialAccount) => {
      return !!specialAccount
    });
    let feed = "";
    specialAccounts.forEach((specialAccount) => {
      feed += `${JSON.stringify(specialAccount, null, '\t')}\n\n`;
    });

    return writeFileAsync(__dirname+"/count_email_id_mismatch.txt", feed, { encoding: "utf8" });
  })
  .then(() => {
    util.printer("COUNT", "Done.");
    return RedisClient.quit();
  })
  .catch(err => {
    util.error(err);
  });
