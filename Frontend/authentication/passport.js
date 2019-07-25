/* eslint-disable no-console */
const passport = require('passport')
const SAMLStrategy = require('passport-saml').Strategy
const env = require('../ssl/env.js')

passport.serializeUser(function(user, done) {
  done(null, user.id)
})

passport.deserializeUser(function(id, done) {
  done(null, null)
})

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
  function(profile, done) {
    console.log(profile)
    done(null, null)
  }
)

passport.use(UBCsamlStrategy)

exports.UBCsamlStrategy = UBCsamlStrategy
