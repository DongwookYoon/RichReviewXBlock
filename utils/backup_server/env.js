
const fs = require('fs');
const path = require('path');

try {
  exports.redis_config = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../..', 'richreview_core/node_server/ssl/redis_config.json'), 'utf-8')
  );
  exports.azure_config = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../..', 'richreview_core/node_server/ssl/azure_config.json'), 'utf-8')
  );
  exports.node_config = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../..', 'richreview_core/node_server/ssl/node_config.json'), 'utf-8')
  );
  exports.nodemailer_config = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '../..', 'richreview_core/node_server/ssl/nodemailer_config.json')
      , 'utf-8'
    )
  );
  console.log("Load ssl from node server");
} catch(err) {
  console.log("Load ssl from backend server");
  exports.redis_config = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'ssl/redis_config.json'), 'utf-8')
  );
  exports.azure_config = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'ssl/azure_config.json'), 'utf-8')
  );
  exports.node_config = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'ssl/node_config.json'), 'utf-8')
  );
  exports.nodemailer_config = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, 'ssl/nodemailer_config.json')
      , 'utf-8'
    )
  );
}
