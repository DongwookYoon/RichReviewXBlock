const fs = require('fs');
const path = require('path');

exports.azure_config = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', '/Backend/ssl/azure_config.json'), 'utf-8')
);

exports.bluemix_config = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', '/Backend/ssl/bluemix_stt_auth.json'), 'utf-8')
);

exports.node_config = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', '/Backend/ssl/node_config.json'), 'utf-8')
);

exports.redis_config = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', '/Backend/ssl/redis_config.json'), 'utf-8')
);