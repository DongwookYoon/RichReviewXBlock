/**
 *
 *
 * created by Colin
 */

const crypto = require('crypto');

const util   = require('../util');
const env    = require('../lib/env');

const expect = require('chai').expect;
const assert = require('chai').assert;

let js_utils     = null;
let lib_utils    = null;
let RedisClient  = null;
let R2D          = null;
let redis_utils  = null;
let PilotHandler = null;
let ClassHandler = null;
let Course       = null;

const runCount = () => {

  /**
   * Simply counts the types of users in RichReview. Does not assert anything.
   *
   * Currently this is the count
   * {
   *   "cornell": {
   *   	"adfs": 214, // Assuming Cornell auth
   *   	"not_adfs": 21 // Cornell emails that don't seem like they were created in the Cornell Auth
   *   },
   *   "google": 24,
   *   "pilot": 58,
   *   "other": 27
   * }
   */
  it("count users", (done) => {
    const COUNT = {
      cornell: {
        adfs: 0,
        not_adfs: 0
      },
      google: 0,
      pilot: 0,
      other: 0
    };

    RedisClient.HKEYS("email_user_lookup")
      .then(emails => {
        const promises = emails.map(email => {
          return RedisClient.HGET("email_user_lookup", email);
        });
        return Promise.all([ emails, Promise.all(promises) ]);
      })
      .then(([emails, values]) => {
        emails.forEach((email, index) => { 
          if(/@cornell.edu$/.test(email)) {
            if("usr:"+lib_utils.makeOldID(email) === values[index]) {
              COUNT.cornell.adfs++;
              console.log(`${email} usr:${lib_utils.makeOldID(email)} ==? ${values[index]}`);
              //expect("usr:"+makeID(email)).to.deep.equal(values[index]);
            } else {
              COUNT.cornell.not_adfs++;
              console.log(`${email} ${values[index]}`);
            }
          } else if(/@gmail.com$/.test(email)) {
            COUNT.google++;
          } else if(/@pilot.study$/.test(email)){
            COUNT.pilot++;
          } else {
            COUNT.other++;
            //console.log(`${email} usr:${lib_utils.makeOldID(email)} ==? ${values[index]}`);
          }
          //expect("usr:"+lib_utils.makeOldID(email)).to.deep.equal(values[index]);
        });
        console.log(JSON.stringify(COUNT, null, '\t'));
      })
      .catch(assert.fail).finally(done);
  });
};

describe("", function() {

  before(function () {
    js_utils     = require('../lib/js_utils');
    lib_utils    = require('../lib/lib_utils');
    RedisClient  = require('../lib/redis_client').RedisClient;
    // R2D          = require('../lib/r2d');
    redis_utils  = require('../lib/redis_client').util;
    // PilotHandler = require('../lib/pilot_handler');
    // ClassHandler = require('../lib/class_handler');
    // Course       = require('../lib/Course');
  });

  beforeEach(function () {

  });

  after(function () {
    return RedisClient.quit();
  });

  afterEach(function () { });

  // runCount();


});