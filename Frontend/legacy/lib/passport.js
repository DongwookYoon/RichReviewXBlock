/* eslint-disable prettier/prettier,spaced-comment,import/order,camelcase,new-cap,no-unused-vars */
/**
 * passport
 *
 * created by Colin
 */

const util = require('../util');
const passport  = require('passport');

const env = require('./env.js');
const lib_utils = require('./lib_utils');
const R2D = require('./r2d.js');
//const LtiEngine = require('./lti_engine.js');
const pilotHandler = require('./pilot_handler.js');

util.start("          passport SAML Strategy");
const SAMLStrategy = require('passport-saml').Strategy;

util.start("          google oauth 2.0 strategy");
const GoogleStrategy = require('passport-google-oauth20').Strategy;

util.start("          passport-azure-ad");
const wsfedsaml2 = require('../passport-azure-ad').WsfedStrategy;

util.start("          passport-local strategy");
const LocalStrategy = require('passport-local').Strategy;

//util.start("          passport-lti");
//const LtiStrategy = require('passport-lti');

passport.serializeUser(function(user, done){
  console.log(`Serialize user ${user}`)
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  /*
  // TODO: LtiEngine is deprecated
  LtiEngine.UserMgr.getById(id)
    .catch(function(err) {
      return lib_utils.findUserByID(id);
    })*/
  console.log(`deserialize id: ${id}`)
  return lib_utils.findUserByID(id)
    .then((user) => {
      done(null, user);
      return null;
    })
    .catch((err) => {
      util.error(err);
      done(null, null);
    });
});

/**
 * Use SAML 2.0 to login using UBC CWL
 */
const UBCsamlStrategy = new SAMLStrategy(
  {
    callbackUrl: env.ubc.idp_config.callbackUrl,
    entryPoint: env.ubc.idp_config.entryPoint,
    issuer: env.ubc.idp_config.entityID,
    cert: env.ubc.idp_config.cert,
    logoutUrl: env.ubc.idp_config.logoutUrl,
    logoutCallbackUrl: env.ubc.idp_config.logoutCallbackUrl
  },
  lib_utils.UBCsamlStrategyCB
);

util.logger("PASSPORT", "use SAML2 auth for UBC");
passport.use(UBCsamlStrategy);

/**
 * Use wsfed SAML 2.0 to login with Cornell NetID
 */
const CornellStrategy = new wsfedsaml2(
  env.cornell_wsfed,
  lib_utils.CornellStrategyCB
);

util.logger("PASSPORT", "use wsfed SAML2 auth with Cornell NetID");
passport.use(CornellStrategy);

/**
 * use strategy OAuth2.0 with Google ID
 */
util.logger("PASSPORT", "use Google Strategy / 0Auth2.0 with Google+ API");
const redirect_uri = process.env.NODE_ENV === "development" ?
    env.google_oauth.redirect_uris[1] : env.google_oauth.redirect_uris[0];
const googleStrategy = new GoogleStrategy({
    clientID: env.google_oauth.client_id,
    clientSecret: env.google_oauth.client_secret,
    callbackURL: redirect_uri,
  },
  lib_utils.googleStrategyCB
);
passport.use(googleStrategy);

/**
 * use Local Strategy as a passport strategy in app.js
 */
util.logger("PASSPORT", "use Local Strategy");
passport.use(new LocalStrategy(
    {
        usernameField: 'id_str',
        passwordField: 'password'
    },
    pilotHandler.localStrategyCB
));

/**
 * use LTI Strategy
 *
 * TODO: LTI is deprecated
 */
/*
const EDX_LTI_CONSUMER_OAUTH = {
    key: 'xh0rSz5O03-richreview.cornellx.edu',
    secret: 'sel0Luv73Q'
};

util.logger("PASSPORT", "use LTI Strategy");
passport.use(
    new LtiStrategy(
        {
            consumerKey: EDX_LTI_CONSUMER_OAUTH.key,
            consumerSecret: EDX_LTI_CONSUMER_OAUTH.secret
            // pass the req object to callback
            // passReqToCallback: true,
            // https://github.com/omsmith/ims-lti#nonce-stores
            // nonceStore: new RedisNonceStore('testconsumerkey', redisClient)
        },
        function(profile, done) {
            LtiEngine.UserMgr.logIn(profile).then(
                function(user){
                    console.log('LTI_LOGIN:', user);
                    return done(null, user);
                }
            ).catch(
                function(err){
                    console.error('LtiStrategy:', err);
                    return done(err, null);
                }
            );
        }
    )
);*/

exports.UBCsamlStrategy = UBCsamlStrategy;
