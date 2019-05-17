const fs = require('fs');
const path = require('path');

exports.azure_config = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', '/Backend/ssl/azure_config.json'), 'utf-8')
);