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

/**
 * TODO: call UBC SAML auth as well as logout
 */
exports.samlLogout = (req, res, next) => {
  js_utils.logUserAction(req, 'logging out of SAML...');
  /*if(req.user) {
    req.user.nameID = req.user.saml.nameID;
    req.user.nameIDFormat = req.user.saml.nameIDFormat;
    return UBCsamlStrategy.logout(req, (err, uri) => {
      //res.redirect(uri);
      return next();
    });
  } else {
    res.redirect('/');
  }*/
  try {
    const strategy = passport._strategy('saml');
    strategy.logout(req, function(error, requestUrl) {
      if(error) console.log(`Can't generate log out url: ${err}`);
    });
  } catch(err) {
    if(err) console.log(`Exception on URL: ${err}`);
  }
  req.logout();
  res.redirect('/');
};

/*function samlLogout(req, res) {
  try {
    const strategy = passport._strategy('saml');
    strategy.logout(req, function(error, requestUrl) {
      if(error) console.log(`Can't generate log out url: ${err}`);
      req.logOut();
      // passport-saml is not removing the session.
      delete req.session.passport;
      res.redirect(requestUrl);
    });
  } catch(err) {
    if(err) console.log(`Exception on URL: ${err}`);
    req.logOut();
    delete req.session.passport;
    res.redirect('/auth/saml');
  }
}*/

exports.logout = function(req, res) {
  js_utils.logUserAction(req, 'logging out...');
  req.logout();
  req.flash('success', 'You are now logged out');
  /*res.redirect(
    'https://www.google.com/accounts/Logout?continue=https://appengine.google.com/_ah/logout?continue='+process.env.HOST_URL
  );*/
  res.redirect('/');
};