const fs = require('fs');
const jwt = require('jsonwebtoken');
const path = require('path');
let rs256_private_key
let lti_config

try {
  rs256_private_key  = fs.readFileSync(
    path.join(__dirname, '..', 'ssl/lti_private.key'), 'utf-8');
  console.log('Successfully read lti private key. ');
} catch (fsEx) {
  console.warn('Reading lti private key failed. Reason: ' + fsEx)
}

try {
   lti_config = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'ssl/lti.json'), 'utf-8'));
   console.log(`Successfully read lti.json config file`);
} catch(ex) {
  console.warn('Failed to read lti.json config file. Reason: ' + ex);
}


const signAndEncode = function (jwtData, nonce=undefined, options=undefined)  {
  let signOptions;
  if (options) {
    signOptions = options;
  }
  else {
    signOptions = {
      algorithm: lti_config.jwk_alg,
      expiresIn: 900,                       // Number of seconds for 15 minutes expiration time
      audience: lti_config.platform_path,
      issuer: lti_config.tool_path,
    };
  }
  if (nonce) {
    signOptions.nonce = nonce;
  }
  
  try {
    return jwt.sign(jwtData, rs256_private_key, options);
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
      audience: lti_config.platform_path + '/login/oauth2/auth',
      issuer: lti_config.tool_path,
      subject: lti_config.canvas_client_id,
      jwtid: `${Date.now()}_${Math.floor((Math.random() * 100000) + 1)}`
    };
  }

  const signed = signAndEncode({}, null, options);

  return signed;
}


module.exports = {
  signAndEncode,
  createClientAssertion
};
