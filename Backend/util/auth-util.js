const axios = require('axios');
const https = require('https');
const jwtUtil = require('./jwt-util');
var lti_config = require('../bin/LtiConfig');




verifyRRApiKey = function(target) {
  return (target === lti_config.rr_api_key);
};


const assertAuthorizedClient = function (req, res, next) {
  if (!req.header('x-api-key')) {
    console.warn('No API key in request! Required header X-API-KEY is missing!');
    res.sendStatus(400);
    return;
  }
  if (verifyRRApiKey(req.header('x-api-key')) === false) {
    console.warn('Invalid RichReview API key received in X-API-KEY header');
    res.sendStatus(403);
    return;
  }
  
  next();
};


const getClientCredentialToken = async function(authTokenUrl) {
    const assertionJWT = jwtUtil.createClientAssertion();

    if (assertionJWT === null) {
      throw new Error('Error. Could not create client assertion during client credential grant.');
    }
    const requestData = {
      grant_type: 'client_credentials',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: assertionJWT,
      scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem https://purl.imsglobal.org/spec/lti-ags/scope/score'
    };

    // Get JSON response with token 
    const tokenResp = await axios.post(authTokenUrl, requestData, {
      headers: {
        'Content-Type': 'application/json'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    });

    if (tokenResp.status > 203) {
      throw new Error(`Getting client credentials token failed. Response code was: ${
        tokenResp} with payload: ${JSON.stringify(tokenResp.data || {})} `);
    }

    console.log('Got OAuth Client Credentials Token: ' + tokenResp.data.access_token);

    return tokenResp.data.access_token;
};



module.exports = {
  getClientCredentialToken,
  assertAuthorizedClient,
  verifyRRApiKey
};

