/**
 * controller for login and log out
 *
 * created by Colin
 */
const js_utils        = require('../lib/js_utils');
const passport        = require('passport');
const UBCsamlStrategy = require('../lib/passport').UBCsamlStrategy;
const util            = require("../util");

/**
 * Check if user is logged in and redirects user if not.
 */
exports.isLoggedIn = (req, res, next) => {
  if(req.isAuthenticated()) {
    return next();
  }
  req.flash('error', 'You are not logged in');
  res.redirect('/');
};

exports.testMe = (req, res, next) => {
  util.debug(Object.keys(req));
  if(req.user) util.debug(Object.keys(req.user));
  if(req.session) util.debug(Object.keys(req.session));
  //req.flash('info', `${}`);

  return next();
};

/**
 * TODO: delete the session upon logout
 */
exports.samlLogout = (req, res, next) => {
  js_utils.logUserAction(req, 'logging out of SAML...');
  try {
    req.user.nameID = req.user.saml.nameID;
    req.user.nameIDFormat = req.user.saml.nameIDFormat;
    const strategy = passport._strategy('saml');
    strategy.logout(req, (error, requestUrl) => {
      if(error) util.error(`Can't generate log out url: ${error}`);
      util.debug(requestUrl);
    });
  } catch(err) {
    if(err) util.error(`Exception on URL: ${err}`);
  }
  req.logout();
  req.session.destroy(function (err) {
      if(err) util.error(`Session cannot be destroyed: ${err}`);
      res.redirect('/');
  });
  res.redirect('/');
};

exports.logout = function(req, res) {
  js_utils.logUserAction(req, 'logging out...');
  req.logout();
  req.flash('success', 'You are now logged out');
  /*res.redirect(
    'https://www.google.com/accounts/Logout?continue=https://appengine.google.com/_ah/logout?continue='+process.env.HOST_URL
  );*/
  res.redirect('/');
};