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
    azure_keys:       path.join(__dirname, '..', 'ssl/azure_keys.json'),
    bluemix_stt_auth: path.join(__dirname, '..', 'ssl/bluemix_stt_auth.json')
};

exports.google_oauth = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'ssl/google_open_id.json'), 'utf-8')
)["web"];

exports.cornell_wsfed = (function() {
    var cornel_wsfed_text = null;
    if(process.env.NODE_ENV === 'development') {
        cornel_wsfed_text = fs.readFileSync(
            path.join(__dirname, '..', 'ssl/cornell_wsfed_development.json')
        );
    } else {
        cornel_wsfed_text = fs.readFileSync(
            path.join(__dirname, '..', 'ssl/cornell_wsfed.json')
        );
    }
    return JSON.parse(cornel_wsfed_text, 'utf-8');
})();

exports.sha1_salt = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'ssl/sha1_salt.json'), 'utf-8')
);

exports.redis_config = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'ssl/redis_config.json'), 'utf-8')
);

exports.ssl_key = fs.readFileSync(path.join(__dirname, '..', 'ssl/richreview_net.key'));
exports.ssl_cert = fs.readFileSync(path.join(__dirname, '..', 'ssl/richreview_net.crt'));
exports.ssl_ca = fs.readFileSync(path.join(__dirname, '..', 'ssl/root.crt'));