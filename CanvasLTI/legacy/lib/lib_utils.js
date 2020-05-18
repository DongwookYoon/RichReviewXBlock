/**
 * A script to store general authentication utilities.
 * TODO: change file name to something more suitable like auth.js
 *
 * by Colin
 */

// import npm modules
const crypto = require("crypto");
const assert = require("chai").assert;

// import libraries
const env          = require("./env");
const PilotHandler = require("./pilot_handler");
const R2D          = require("./r2d");
const Course       = require("./Course");

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
 * findUserByID() and findUserByEmail() extend R2D.User.findByEmail() and R2D.User.findById() by adding plugins to the User object. This allows RichReview to open to extension when ported to other institutions.
 */

/**
 * Adds specific pluggins.
 * Current plugins are:
 *  - PilotHandler.plugPilot - attaches pilot specific metadata for Pilot users
 *  - Course.plugCourses     - attaches courses the user is registered to
 * @param {User|null} user
 * @returns {Promise.<User|null>}
 * TODO: phase out
 */
const findUserCallback = (user) => {
  return PilotHandler.plugPilot(user);
};

/**
 * Extends R2D.User.findByID by adding plugins if available
 * @param {string} id
 * @returns {Promise.<User|null>}
 * TODO: phase out
 */
const findUserByID = (id) => {
  return R2D.User.findByID(id).then(findUserCallback);
};

/**
 * Extends R2D.User.findByEmail by adding plugins if available. See comments for R2D.User.findByEmail() for more details.
 * @param {string} email
 * @returns {Promise.<User|null>}
 * TODO: phase out
 */
const findUserByEmail = (email) => {
  return R2D.User.findByEmail(email).then(findUserCallback);
};

/**
 * @class CornellProfile
 * @member {string} name - name of the ADFS profile
 * @member {string} upn - the email ID
 * @member {string[]} role - profile attributes
 * @member {string} displayName - this display name
 */

/**
 * Find Cornell user given Cornell profile
 * @param {CornellProfile} profile
 * @returns {Promise.<User|null>}
 */
const findCornellUser = (profile) => {
  const ID = makeOldID(profile.upn);
  return findUserByID(ID);
};

/**
 * Create an ID from a Cornell user
 * @param {CornellProfile} profile
 * @returns {string} the ID
 */
const makeCornellUserID = (profile) => {
  return makeOldID(profile.upn);
};

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

{/**************************************/
  /**
   * @typedef {Object} GoogleProfile
   * @member {string} id
   * @member {string} displayName
   * @member {{familyName: string, givenName: string}} name
   * @member {{value: string, type: string}[]}  emails
   * @member {{value: string}[]} photos
   * @member {string} gender
   * @member {string} provider
   * @member {string} _raw
   * @member {Object} _json
   */

  /**
   * Helper for googleStrategyCB and wrapper for R2D User.create()
   * @param {GoogleProfile} profile
   * @returns {Promise<User>}
   */
  const makeGoogleUser = (profile) => {
    const id      = profile.id;
    const email   = profile.emails[0].value;
    const options = {
      /*
      display_name: profile.displayName,
      first_name: profile.name.givenName,
      last_name: profile.name.familyName,*/
      auth_type: "Google"
    };
    return R2D.User.create(id, email, options);
  };

  /**
   * Callback for Google OAth2.0 Authentication strategy. Strategy will either find a user corr. to the ID in the profile if it exists, or create a new user if it does not. If email is different from ID, then syncs the email in the user model and userid_email_table.
   * @param accessToken
   * @param refreshToken
   * @param {GoogleProfile} profile - the Google account holder's profile returned after successful login.
   * @param {function} done - callback for passport
   */
  exports.googleStrategyCB = (accessToken, refreshToken, profile, done) => {
    console.log(JSON.stringify(profile, null, '\t'));
    assert.isAtLeast(profile.emails.length, 1, "googleStrategyCB profile has at least one gmail");
    const email = profile.emails[0].value;
    R2D.User.findByID(profile.id)
      .then((user) => {
        if(user) {
          // since WARNING: user_email_lookup is deprecated, syncEmail() does not work.
          // TODO: fix syncEmail
          return user.syncEmail(email);
        } else {
          util.debug(`user with email ${email} does not exist; making new user`);
          return makeGoogleUser(profile);
        }
      })
      .then((user) => {
        console.log(`USER! ${JSON.stringify(user)}`);
        if (!user['id'].includes('google'))
          user['id'] = `google_${user.id}`;
        done(null, user); })
      .catch(done);
  };
}/**************************************/

{/**************************************/
  /**
   * @typedef {Object} CWLProfile
   * @member {string} issuer - should be "https://authentication.ubc.ca"
   * @member {string} sessionIndex
   * @member {string} nameID - the SAML nameID
   * @member {string} nameIDFormat - the SAML nameID format
   * @member {string} nameQualifier
   * @member {string} spNameQualifier - should be "https://authentication.ubc.ca"
   * @member {string} sessionIndex - should be sp_***_ubc
   * @member {string} urn:oid:1.3.6.1.4.1.60.1.7.1 - ubcEduPersistentID
   * @member {string} urn:oid:0.9.2342.19200300.100.1.1 - uid; the CWL login name
   * @member {string} urn:oid:0.9.2342.19200300.100.1.3 - mail
   * @member {string} urn:oid:2.5.4.42 - givenName
   * @member {string} urn:mace:dir:attribute-def:ubcEduStudentNumber - ubcEduStudentNumber
   * @member {string} urn:oid:2.5.4.4 - sn
   * @member {string} urn:oid:2.16.840.1.113719.1.1.4.1.25 - groupMembership
   * @member {string} mail
   * @member {string} email
   */

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

  /**
   * Helper for UBCsamlStrategyCB and wrapper for R2D User.create()
   * @param {CWLProfile} profile
   * @returns {Promise.<User>}
   */
  const makeUBCUser = (profile) => {
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
  };

  /**
   * Callback strategy for UBC IDPv3 SAML Authentication. Strategy will either find a user corr. to the ID in the profile if it exists, or create a new user if it does not. Additionally:
   *      - If email is different from ID, then syncs the email in the user model and userid_email_table.
   *      - Sets up SAML properties to use by UBC SLO.
   *      - Adds user to courses in RichReview that the user is enrolled in.
   * @param {Object} profile - the CWL account holder's profile returned after successful CWL login.
   * @param {function} done - callback for passport
   */
  exports.UBCsamlStrategyCB = (profile, done) => {
    console.log('At UBCsamlStrategyCB')
    util.debug(JSON.stringify(profile, null, '\t'));
    findUserByID(profile[ubcEduPersistentID])
      .then((user) => {
        if(user) { return user; }
        else { return makeUBCUser(profile); }
      })
      .then((user) => {
        assert.instanceOf(user, R2D.User, "UBCsamlStrategyCB: user is an R2D.User");
        user.saml = {};
        user.saml.nameID = profile.nameID;
        user.saml.nameIDFormat = profile.nameIDFormat;
        return user;
        // return Course.plugCourse(user, profile);
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
