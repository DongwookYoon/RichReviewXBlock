const fs = require('fs');
const jwt = require('jsonwebtoken');
const path = require('path');
let rs256_private_key

try {
  rs256_private_key  = fs.readFileSync(
    path.join(__dirname, '..', 'ssl/lti_private.key'), 'utf-8');
  console.log('Successfully read lti private key. ');
} catch (fsEx) {
  console.warn('Reading lti private key failed. Reason: ' + fsEx)
}


const signAndEncode = function (jwtData, options)  {
  try {
    return jwt.sign(jwtData, rs256_private_key, options);
  } catch (ex) {
    console.warn('Signing JWT failed. Reason' + ex);
    return null;
  }
};


module.exports = {
  signAndEncode
};
