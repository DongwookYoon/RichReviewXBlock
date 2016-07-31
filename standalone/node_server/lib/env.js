/**
 * Created by dongwookyoon on 6/16/15.
 */

var js_utils = require('../lib/js_utils.js');
var fs = require('fs');

exports.admin_list = [
    '116730002901619859123'
];

exports.path = {
    'temp_pdfs': '/tmp/richreview/pdfs',
    'webapp_richreview': '../../richreview/public/webapps/richreview',
    'webapp_multicolumn': '../../richreview/public/webapps/multicolumn'
};

exports.webapp_urls = {
    'richreview': js_utils.getWebAppUrls(
        '../../../richreview/public/webapps/multicolumn',
        '/static_multicolumn/',
        /((\/|^)\..*)/
    ),
    'multicolumn': js_utils.getWebAppUrls(
        '../../../richreview/public/webapps/richreview',
        '/static_viewer/',
        /((\/|^)\..*)|(^test\/.*)/
    )
};

exports.config_files = {
    azure_keys:     '../ssl/azure_keys.json',
    bluemix_stt_auth: '../ssl/bluemix_stt_auth.json',
    google_open_id: '../ssl/google_open_id.json',
    ssl_key:        '../ssl/richreview_net.key',
    ssl_cert:       '../ssl/richreview_net.crt',
    ssl_ca:         '../ssl/root.crt'
};

exports.cornell_wsfed = JSON.parse(fs.readFileSync('../ssl/cornell_wsfed.json', 'utf-8'));

exports.sha1_salt = JSON.parse(fs.readFileSync('../ssl/sha1_salt.json', 'utf-8'));

exports.redis_config = JSON.parse(fs.readFileSync('../ssl/redis_config.json', 'utf-8'));