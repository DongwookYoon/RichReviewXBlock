/**
 * controller for login and log out
 *
 * created by Colin
 */
const js_utils        = require('../lib/js_utils');
const passport        = require('passport');
//const UBCsamlStrategy = require('../lib/passport').UBCsamlStrategy;
const util            = require("../util");

/**
 * Check if user is logged in and redirects user if not.
 */
exports.isLoggedIn = (req, res, next) => {
  if(req.isAuthenticated()) {
    return next();
  }
  req.flash('error', 'You are not logged in');
  delete req.session.authUser
  res.redirect('/');
};

/**
 * Check if no user is logged in and redirects user if otherwise.
 */
exports.isNotLoggedIn = (req, res, next) => {
  if(!req.isAuthenticated()) {
    return next();
  }
  req.flash('error', "You cannot be logged in to perform this action");
  res.redirect('/');
};

exports.testMe = (req, res, next) => {
  /* test request user and sessions
  util.debug(Object.keys(req));
  if(req.user) util.debug(`user keys: ${JSON.stringify(Object.keys(req.user))}`);
  if(req.session) util.debug(`session keys: ${JSON.stringify(Object.keys(req.session))}`);*/
  /* // test flash messages
  req.flash("error", "test error");
  req.flash("error", "test another error");
  req.flash("warning", "test warning");
  req.flash("success", "test success");
  req.flash("success", "test more success");
  req.flash("info", "test info");*/
  return next();
};

/**
 * Send request to (UBC's) IDP to log out of CWL. If user did not login using SAML, then redirect to default logout.
 */
exports.samlLogout = (req, res) => {
  js_utils.logUserAction(req, 'logging out of SAML...');
  delete req.session.authUser
  try {
    req.user.nameID = req.user.saml.nameID;
    req.user.nameIDFormat = req.user.saml.nameIDFormat;
    const strategy = passport._strategy('saml');
    strategy.logout(req, (error, requestUrl) => {
      if(error) {
        util.error(`Can't generate log out url: ${error}`);
        res.redirect('/logout');
      }
      util.debug(requestUrl);
      req.logout();
      res.redirect(requestUrl);
    });
  } catch(err) {
    if(err) util.error(`Exception on URL: ${err}`);
    res.redirect('/logout');
  }
  //req.logout();
  /*req.session.destroy(function (err) {
      if(err) util.error(`Session cannot be destroyed: ${err}`);
      res.redirect('/');
  });*/
};

/**
 * Log out the user
 */
exports.logout = function(req, res) {
  js_utils.logUserAction(req, 'logging out...');
  req.logout();
  req.flash('success', 'You are now logged out');
  /*
  // NOTE: that since logging out of Google will affect the account sessions of all other Google apps. It is better for users to disconnect from Google through an actual Google app instead of RichReview.
  res.redirect(
    'https://www.google.com/accounts/Logout?continue=https://appengine.google.com/_ah/logout?continue='+process.env.HOST_URL
  );*/
  res.redirect('/');
};
