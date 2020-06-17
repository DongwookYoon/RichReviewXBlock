var express = require('express');
var fs = require('fs');
var path = require('path');
var router = express.Router({mergeParams: true});
var jwtUtil = require('../util/jwt-util');
var axios = require('axios');

var lti_config;

try {
  lti_config = JSON.parse(
   fs.readFileSync(path.join(__dirname, '..', 'ssl/lti.json'), 'utf-8'));
  console.log(`Successfully read lti.json config file`);
} catch(ex) {
 console.warn('Failed to read lti.json config file. Reason: ' + ex);
}

/*
 ** Get a signed client assertion
 */
router.get('/client_assertion', function(req, res, next) {
  
  const signed = jwtUtil.createClientAssertion();
  res.json({jwt: signed});
});



/* Get an oauth access token from the lti endpoint using a 
   code provided by the client. Note that the approach
   used here is to sign the*/
router.post('/oauth_code_token', async function(req, res, next) {
  const code = req.body.code;
  const client_id = req.body.clientId;
  const redirect_uri = req.body.redirectUri;
  
  const assertionJWT = jwtUtil.createClientAssertion();
  
  const reqMsg = {
    grant_type: 'authorization_code',
    code,
    client_id,
    redirect_uri,
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: assertionJWT
  };

  const resp = await axios.post(
    `${lti_config.platform_path}/login/oauth2/token`,
    reqMsg, {
      headers: {
        'Content-Type': 'application/json'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    });

  if (!resp.data)
    res.sendStatus(501);
  
  res.json({auth_info: resp.data});
});




/*
 ** Create a signed jwt
 */
router.post('/lti_jwt/:nonce', function(req, res, next) {
  
 try {
    let options = {
      algorithm: lti_config.jwk_alg,
      expiresIn: 900,                       // Number of seconds for 15 minutes expiration time
      issuer: lti_config.canvas_client_id
    };

    const signed = jwtUtil.signAndEncode(req.body, req.params.nonce, options);

    res.json({jwt: signed});
    console.log('Signed JWT response: ' + signed);
  } catch (ex) {
    console.warn('Signing JWT failed. Reason: ' + ex);
  }
});


module.exports = router;



