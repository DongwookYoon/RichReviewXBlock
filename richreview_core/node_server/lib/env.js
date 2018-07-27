/**
 * Created by dongwookyoon on 6/16/15.
 */

// import built-in modules
const fs = require('fs');
const path = require('path');

// import libraries
const util     = require('../util');
const file_utils = require('../lib/file_utils');



exports.admin_list = [
    '116730002901619859123'
];

/**
 * path of the webapps
 */
exports.path = {
    'temp_pdfs': '/tmp/richreview/pdfs',
    'webapp_richreview': 'webapps/richreview',
    'webapp_multicolumn': 'webapps/multicolumn'
};

/**
 * make webapp urls
 */
exports.webapp_urls = {
    'multicolumn': file_utils.getWebAppUrls(
        'webapps/multicolumn',
        '/static_multicolumn/',
        /((\/|^)\..*)/
    ),
    'richreview': file_utils.getWebAppUrls(
        'webapps/richreview',
        '/static_viewer/',
        /((\/|^)\..*)|(^test\/.*)/
    )
};

exports.config_files = {
    bluemix_stt_auth: path.join(__dirname, '..', 'ssl/bluemix_stt_auth.json')
};

exports.node_config = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'ssl/node_config.json'), 'utf-8')
);

exports.azure_config = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'ssl/azure_config.json'), 'utf-8')
);

exports.google_oauth = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'ssl/google_open_id.json'), 'utf-8')
);

exports.cornell_wsfed = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'ssl/cornell_wsfed.json'), 'utf-8')
);

exports.sha1_salt = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'ssl/sha1_salt.json'), 'utf-8')
);

exports.redis_config = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'ssl/redis_config.json'), 'utf-8')
);

exports.ssl_key = fs.readFileSync(path.join(__dirname, '..', 'ssl/richreview_net.key'));
exports.ssl_cert = fs.readFileSync(path.join(__dirname, '..', 'ssl/richreview_net.crt'));
exports.ssl_ca = fs.readFileSync(path.join(__dirname, '..', 'ssl/root.crt'));

exports.ubc = {
    idp_config: JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'ssl/ubc_idp_config.json'), 'utf-8')
    ),
    privateCert: fs.readFileSync(path.join(__dirname, '..', 'ssl/sp_richreview_ubc.cert'), 'utf-8'),
    decryptionPvk: fs.readFileSync(path.join(__dirname, '..', 'ssl/sp_richreview_ubc.key'), 'utf-8')
};