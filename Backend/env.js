const fs = require('fs');
const path = require('path');


try {
    exports.azure_config = JSON.parse(
        fs.readFileSync(path.join(__dirname, '..', '/Backend/ssl/azure_config.json'), 'utf-8')
    );
} catch (err)
  {
      console.warn('No azure_config.json was loaded.');
  }

try {
    exports.bluemix_config = JSON.parse(
        fs.readFileSync(path.join(__dirname, '..', '/Backend/ssl/bluemix_stt_auth.json'), 'utf-8')
    );
} catch (err)
  {
      console.warn('No bluemix_stt_auth.json was loaded');
  }

try {
    exports.node_config = JSON.parse(
        fs.readFileSync(path.join(__dirname, '..', '/Backend/ssl/node_config.json'), 'utf-8')
    );
} catch (err) 
  {
      console.warn('No node_config.json was loaded');
  }

try {
    exports.redis_config = JSON.parse(
        fs.readFileSync(path.join(__dirname, '..', '/Backend/ssl/redis_config.json'), 'utf-8')
    );
} catch (err)
  {
      console.warn('No redis_config.json was loaded');
  }