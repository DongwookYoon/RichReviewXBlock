/**
 * controller for login and log out
 *
 * created by Colin
 */
const js_utils = require('../lib/js_utils');
const UBCsamlStrategy = require('../lib/passport').UBCsamlStrategy;

const util = require("../util");

/**
 * Check if user is logged in and redirects user if not.
 */
exports.isLoggedIn = (req, res, next) => {
  if(req.isAuthenticated()) {
    return next();
  }
  util.debug("user is not logged in!");
  req.flash('error', 'You are not logged in');
  // TODO: change login redirect
  res.redirect('/login_pilot');
};

exports.logOutSAML = (req, res, next) => {
  js_utils.logUserAction(req, 'logging out of SAML...');
  if(req.user) {
    return UBCsamlStrategy.logout(req, (err, uri) => {
      //res.redirect(uri);
      return next();
    });
  } else {
    res.redirect('/');
  }
};

exports.logout = function(req, res) {
  if(req.user) {
    js_utils.logUserAction(req, 'logging out...');

    /******************/
    //if(req.user.auth_type) console.log(req.user.auth_type);
    /******************/
    // https://authentication.ubc.ca/idp/profile/Logout
    req.logout();
    req.flash('success', 'You are now logged out');
    /*res.redirect(
      'https://www.google.com/accounts/Logout?continue=https://appengine.google.com/_ah/logout?continue='+process.env.HOST_URL
    );*/

  } else {
    res.redirect('/');
  }
};