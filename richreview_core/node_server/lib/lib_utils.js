/**
 * A script to store general authentication utilities
 *
 * TODO: change file name to something more suitable
 *
 * by Colin
 */

const crypto = require("crypto");

const pilotHandler = require("./pilot_handler");
const R2D          = require("./r2d");
const env          = require("./env");

const util = require("../util");

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
 * findUserByID() and findUserByEmail() extend R2D.User.findByEmail() and R2D.User.prototype.findById() by adding plugins to the user object. This allows RichReview to easily be portable to other institutions.
 *
 */

/**
 * @param {string} id
 */
const findUserByID = (id) => {
  return R2D.User.findByID(id)
  /*******add project specific pluggins******/
    .then((user) => {
      return pilotHandler.plugPilot(user);
    });
  /******************************************/
};

/**
 * Extends R2D.User.findByEmail by adding
 *
 * @param {string} email - of form [id]@pilot.study
 */
const findUserByEmail = (email) => {
  return R2D.User.findByEmail(email)
  /*******add project specific pluggins******/
    .then((user) => {
      return pilotHandler.plugPilot(user);
    });
  /******************************************/
};


/**
 * Method to find Cornell user
 * @param {Object} profile
 * @returns {User|null}
 */
const findCornellUser = (profile) => {
  const ID = makeOldID(profile.upn);
  return findUserByID(ID);
};

const makeCornellUserID = (profile) => {
  return makeOldID(profile.upn);
};

/**
 * @class CornellProfile
 * @member {string} name - name of the ADFS profile
 * @member {string} upn - the email ID
 * @member {string[]} role - profile attributes
 * @member {string} displayName - this display name
 */

/**
 * Callback for use with wsfed SAML 2.0 to login using Cornell NetID
 * @param {CornellProfile} profile
 * @param done
 *
 * TODO: if cannot find then create new user
 */
exports.CornellStrategyCB = function(profile, done) {
  util.debug(JSON.stringify(profile, null, '\t'));
  findCornellUser(profile)
    .then(function(user) {
      if(user) {
        return user;
      } else {
        return R2D.User.create(
          makeCornellUserID(profile),
          profile.upn
        );
      }
    })
    .then(function(user) {
      done(null, user);
    })
    .catch(done);
};

exports.findPilotUser = (userid) => {
  const hashed_id = makeOldID(userid);
  return findUserByID(hashed_id);
};

exports.makePilotUserID = (profile) => {
  return makeOldID(profile.upn);
};

exports.googleStrategyCB = (accessToken, refreshToken, profile, done) => {
  console.log(JSON.stringify(profile, null, '\t'));
  const email = profile.emails.length !== 0 ? profile.emails[0].value : '';
  const b = R2D.User.cache.exists(profile.id);
  new Promise.resolve(b)
  //R2D.User.prototype.isExist(profile.id)
    .then((is_exist) => {
      if(is_exist) {
        return findUserByID(profile.id)
          .then((user) => {
            return R2D.User.prototype.syncEmail(user, email);
          });
      } else {
        return R2D.User.create(profile.id, email);
      }
    })
    .then((user) => {
      done(null, user);
    })
    .catch(done);
};

{/**************************************/
  // uid - CWL login name of the account holder authenticating.
  const uid = "urn:oid:0.9.2342.19200300.100.1.1";
  // mail - email address of account holder. The value is derived from following sources (in order of precedence): HR business email address, SIS email address, Email address entered when registering for CWL account
  const mail = "urn:oid:0.9.2342.19200300.100.1.3";
  // displayName is the preferred name of the CWL user
  const displayName = "urn:oid:2.16.840.1.113730.3.1.241";
  // givenName - first name of UBC Student, UBC Faculty, UBC Staff, Guest, Basic CWL account holders.
  const givenName = "urn:oid:2.5.4.42";
  // sn - the last name, aka surname, of UBC Student, UBC Faculty, UBC Staff, Guest, Basic CWL account holders.
  const sn = "urn:oid:2.5.4.4";
  // user's student number
  const ubcEduStudentNumber = "urn:mace:dir:attribute-def:ubcEduStudentNumber";
  // ubcEduPersistentID - the UBC Persistent Identifier; unique per User, per Service. Deactivation available if Security incidence arises for generation of new value.
  const ubcEduPersistentID = "urn:oid:1.3.6.1.4.1.60.1.7.1";
  // groupMembership - ELDAP group memberships for groupOfUniqueName groups.
  const groupMembership = "urn:oid:2.16.840.1.113719.1.1.4.1.25";
  exports.UBCsamlStrategyCB = (profile, done) => {
    util.debug(JSON.stringify(profile));

    findUserByID(profile[ubcEduPersistentID])
      .then(function(user) {
        if(user) {
          return user;
        } else {
          const email  = profile[mail];
          const id = profile[ubcEduPersistentID];
          const options = {
            sid: profile[ubcEduStudentNumber],
            display_name: profile[displayName],
            first_name: profile[givenName],
            last_name: profile[sn],
            auth_type: "UBC_CWL"
          };
          return R2D.User.create(id, email, options);
        }
      })
      .then(user => {
        done(null, user);
      })
      .catch(done);
  };
}/**************************************/

exports.genSHA1Salt     = genSHA1Salt;
exports.makeOldID       = makeOldID;
exports.findUserByID    = findUserByID;
exports.findUserByEmail = findUserByEmail;