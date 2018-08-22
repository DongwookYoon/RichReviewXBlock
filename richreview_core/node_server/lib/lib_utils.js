/**
 * Authentication specific utilities
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
 * findUserByID() and findUserByEmail() extend R2D.User.prototype.findByEmail() and R2D.User.prototype.findById() by adding plugins to the user object. This allows RichReview to easily be portable to other institutions.
 *
 */

/**
 * @param {string} id
 */
const findUserByID = (id) => {
  return R2D.User.prototype.findById(id)
  /*********cannot find user with id*********/
    .catch((err) => {
      util.debug(`in findById(): ID ${id} not found`);
      return null;
    })
  /*******add project specific pluggins******/
    .then((user) => {
      return pilotHandler.plugPilot(user);
    });
  /******************************************/
};

/**
 * Extends R2D.User.prototype.findByEmail by adding
 *
 * @param {string} email - of form [id]@pilot.study
 *
 * TODO: findUserByEmail is deprecated; use will result in program breaking changes
 */
const findUserByEmail = (email) => {
  return R2D.User.prototype.findByEmail(email)
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
        return R2D.User.prototype.create(
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
        return R2D.User.prototype.create(profile.id, email);
      }
    })
    .then((user) => {
      done(null, user);
    })
    .catch(done);
};

exports.genSHA1Salt     = genSHA1Salt;
exports.makeOldID       = makeOldID;
exports.findUserByID    = findUserByID;
exports.findUserByEmail = findUserByEmail;