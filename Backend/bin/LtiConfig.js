var fs = require('fs');
var path = require('path');


var lti_config;

try {
    lti_config = JSON.parse(
     fs.readFileSync(path.join(__dirname, '..', 'ssl/lti.json'), 'utf-8'));
    console.log(`Successfully loaded lti.json config.`);
  } catch(ex) {
   console.warn('Failed to read lti.json config file. Reason: ' + ex);
  }
  

module.exports = lti_config;