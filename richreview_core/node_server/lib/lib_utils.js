/**
 * Data specific utilities
 *
 * by Colin
 */

const pilotHandler = require("./pilot_handler");
const R2D          = require("./r2d");
const env          = require("./env");

/**
 *
 *
 * TODO: `email_user_lookup`
 */

exports.findCornellUser = (profile) => {
    var idToSearch = js_utils.generateSaltedSha1(profile.upn, env.sha1_salt.netid).substring(0, 21);
    try {
        return R2D.User.cache.get(idToSearch);
    } catch(err) {
        return null;
    }
};

//exports.findGoogleUser

/**
 * findUserByID() and findUserByEmail() extend R2D.User.prototype.findByEmail() and R2D.User.prototype.findById() by adding plugins to the user object. This allows RichReview to easily be portable to other institutions.
 *
 */

/**
 * @param {string} id
 */
exports.findUserByID = (id) => {
  return R2D.User.prototype.findById(id)
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
exports.findUserByEmail = (email) => {
  return R2D.User.prototype.findByEmail(email)
  /*******add project specific pluggins******/
    .then((user) => {
      return pilotHandler.plugPilot(user);
    });
  /******************************************/
};