/**
 * controller for login and log out
 *
 * created by Colin
 */
const js_utils = require('../lib/js_utils');
const UBCsamlStrategy = require('../lib/passport').UBCsamlStrategy;

const util = require("../util");

exports.isLoggedIn = (req, res, next) => {
  // check if the user is authenticated
  if(req.isAuthenticated()) {
    return next();
  }

  util.debug("user is not logged in!");
  // to-do make a flash message
  req.flash('error', 'You are not logged in');
  res.redirect('/login_pilot');
};

exports.logOutSAML = (req, res) => {
  if(req.user) {
    UBCsamlStrategy.logout(req, (err, uri) => {
      res.redirect(uri);
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