
const pilotHandler = require("./pilot_handler");
const R2D          = require("./r2d");

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
 */
exports.findUserByEmail = (email) => {
  return R2D.User.prototype.findByEmail(email)
  /*******add project specific pluggins******/
    .then((user) => {
      return pilotHandler.plugPilot(user);
    });
  /******************************************/
};