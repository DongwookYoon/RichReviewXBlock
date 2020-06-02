var express = require('express');
var router = express.Router({mergeParams: true});
var signAndEncode = require('../util/util');
var axios = require('axios');

const lti_config = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'ssl/lti.json'), 'utf-8')
);


/*
 ** Get a signed client assertion
 */
router.get('/client_assertion', function(req, res, next) {
  const options = {
    algorithm: lti_config.jwk_alg,
    expiresIn: 300,                       // Number of seconds for 5 minutes expiration time
    audience: lti_config.platform_path + '/login/oauth2/auth',
    issuer: lti_config.tool_path,
    subject: lti_config.canvas_client_id,
    jwtid: `${Date.now()}_${Math.floor((Math.random() * 100000) + 1)}`
  };

  const signed = signAndEncode({}, options);
  res.json({jwt: signed});
});



router.get('/oauth_token', async function(req, res, next) {
  const code = req.body.code;
  
  const reqMsg = {
    grant_type: 'authorization_code',
    code,
    client_id: lti_config.canvas_client_id,
    client_secret: lti_config.canvas_client_secret
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
}


/*
 ** Create a signed jwt
 */
router.post('/lti_jwt/:nonce', function(req, res, next) {
  const options = {
    algorithm: lti_config.jwk_alg,
    expiresIn: 900,                       // Number of seconds for 15 minutes expiration time
    audience: lti_config.platform_path,
    issuer: lti_config.tool_path,
    nonce: req.params.nonce
  };

  const signed = signAndEncode(JSON.parse(req.body), options);

  res.json({jwt: signed});
});



