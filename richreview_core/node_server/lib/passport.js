/**
 * passport
 *
 * created by Colin
 */
const fs = require('fs');
const path = require('path');

const util = require('../util');
const passport  = require('passport');

const env = require('./env.js');
const js_utils = require('./js_utils');
const lib_utils = require('./lib_utils');
const R2D = require('./r2d.js');
const LtiEngine = require('./lti_engine.js');
const pilotHandler = require('./pilot_handler.js');

util.start("          passport SAML Strategy");
const SAMLStrategy = require('passport-saml').Strategy;

util.start("          google oauth 2.0 strategy");
const GoogleStrategy = require('passport-google-oauth20').Strategy;

util.start("          passport-azure-ad");
const wsfedsaml2 = require('../passport-azure-ad').WsfedStrategy;

util.start("          passport-local strategy");
const LocalStrategy = require('passport-local').Strategy;

util.start("          passport-lti");
const LtiStrategy = require('passport-lti');

passport.serializeUser(function(user, done){
    done(null, user.id);
});

passport.deserializeUser(function(id, done){
    LtiEngine.UserMgr.getById(id)
        .catch(function(err) {
            return lib_utils.findUserByID(id);
        }
    ).then(
        function(user){
            done(null, user);
            return null;
        }
    ).catch(
        function(err){
            console.error(err);
            done(null, null);
        }
    );
});

const callbackURL = 'https://40.85.241.164/login_ubc_return';

const entryPoint = 'https://authentication.stg.id.ubc.ca/idp/profile/SAML2/Unsolicited/SSO?providerId=richreview';

const issuer = 'richreview';

const cert = fs.readFileSync(
  path.join(__dirname, '..', 'ssl/idp_cert.cert')
);

const privateCert = fs.readFileSync(
  path.join(__dirname, '..', 'ssl/sp_richreview_ubc.cert')
);

const decryptionPvk = fs.readFileSync(
  path.join(__dirname, '..', 'ssl/sp_richreview_ubc.key')
);

const samlStrategy = new SAMLStrategy(
  {
    callbackUrl: callbackURL,
    entryPoint: entryPoint,
    issuer: issuer,
    cert,
    privateCert,
    decryptionPvk
  },
  function(profile, done) {
    console.log(JSON.stringify(profile));

    findByEmail(profile.email, function(err, user) {
      if (err) {
        return done(err);
      }
      return done(null, user);
    });
  });

util.logger("PASSPORT", "use SAML2 auth for UBC");
passport.use(samlStrategy);

/**
 * Use wsfed SAML 2.0 to login with Cornell NetID
 */
util.logger("PASSPORT", "use wsfed SAML2 auth with Cornell NetID");
passport.use(
    new wsfedsaml2(
        env.cornell_wsfed,
        function(profile, done) {
            lib_utils.findUserByEmail(profile.upn)
            //R2D.User.prototype.findByEmail(profile.upn)
                .then(function(user) {
                    if(user) {
                        return user;
                    }
                    else{
                        var email = profile.upn;
                        var newid = js_utils.generateSaltedSha1(email, env.sha1_salt.netid).substring(0, 21);
                        return R2D.User.prototype.create(
                            newid,
                            email
                        );
                    }
                }
            ).then(
                function(user){
                    done(null, user);
                }
            ).catch(done);
        }
    )
);

/**
 * use strategy OAuth2.0 with Google ID
 */
const googleStrategyCB = (accessToken, refreshToken, profile, done) => {
    const email = profile.emails.length !== 0 ? profile.emails[0].value : '';
    const b = R2D.User.cache.exists(profile.id);
    new Promise.resolve(b)
    //R2D.User.prototype.isExist(profile.id)
        .then((is_exist) => {
            if(is_exist) {
                return lib_utils.findUserByID(profile.id)
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

util.logger("PASSPORT", "use Google Strategy / 0Auth2.0 with Google+ API");
const redirect_uri = process.env.NODE_ENV === "development" ?
    env.google_oauth.redirect_uris[1] : env.google_oauth.redirect_uris[0];
passport.use(
    new GoogleStrategy(
        {
            clientID: env.google_oauth.client_id,
            clientSecret: env.google_oauth.client_secret,
            callbackURL: redirect_uri,
        },
        googleStrategyCB
    )
);

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
 */
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
);