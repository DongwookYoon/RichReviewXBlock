const fs = require('fs');
const jwt = require('jsonwebtoken');
const path = require('path');
const lti_config = require('../bin/LtiConfig');

let rs256_private_key;


try {
  rs256_private_key  = fs.readFileSync(
    path.join(__dirname, '..', 'ssl/lti_private.key'), 'utf-8');
  console.log('Successfully read lti private key. ');
} catch (fsEx) {
  console.warn('Reading lti private key failed. Reason: ' + fsEx);
}




const signAndEncode = function (jwtData, options=undefined)  {
  let signOptions;
  if (options) {
    signOptions = options;
  }
  else {
    signOptions = {
      algorithm: lti_config.jwk_alg,
      expiresIn: 900,                       // Number of seconds for 15 minutes expiration time
      audience: lti_config.platform_path,
      issuer: lti_config.canvas_client_id
    };
  }

  
  try {
    return jwt.sign(jwtData, rs256_private_key, signOptions);
  } catch (ex) {
    console.warn('Signing JWT failed. Reason' + ex);
    return null;
  }
};


const createClientAssertion = function (options = null){
  if (options === null) {
    options = {
      algorithm: lti_config.jwk_alg,
      expiresIn: 300,                       // Number of seconds for 5 minutes expiration time
      audience: lti_config.auth_token_url,
      issuer: lti_config.tool_path,
      subject: lti_config.canvas_client_id,
      jwtid: `${Date.now()}_${Math.floor((Math.random() * 100000) + 1)}`
    };
  }

  const signed = signAndEncode({}, options);

  return signed;
};



module.exports = {
  signAndEncode,
  createClientAssertion
};
