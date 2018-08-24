/**
 * Handler for UBC study
 *
 * Created by Colin
 */

// import npm modules
const Promise     = require("promise"); // jshint ignore:line

// import libraries
const js_utils    = require('./js_utils');
const env         = require('./env');
const R2D         = require('./r2d');
const RedisClient = require('./redis_client').RedisClient;
const lib_utils   = require('./lib_utils');
const util        = require('../util');


const UBCsamlStrategyCB = (profile, done) => {
  console.log(JSON.stringify(profile));

  // using ubcEduPersistentID; urn:oid:1.3.6.1.4.1.60.1.7.1

  lib_utils.findUserByID(profile["urn:oid:1.3.6.1.4.1.60.1.7.1"])
    .then(function(user) {
      if(user) {
        return user;
      } else {
        const email  = profile.email;
        const new_id = profile["urn:oid:1.3.6.1.4.1.60.1.7.1"];
        return R2D.User.create(new_id, email);
      }
    })
    .then(user => {
      done(null, user);
    })
    .catch(done);
};

exports.UBCsamlStrategyCB = UBCsamlStrategyCB;