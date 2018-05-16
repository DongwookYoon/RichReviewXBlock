/**
 * Created by dongwookyoon on 6/16/15.
 */

// import built-in modules
const fs = require('fs');
const path = require('path');

// import libraries
const js_utils = require('../lib/js_utils.js');

exports.admin_list = [
    '116730002901619859123'
];

/**
 * path of the webapps
 */
/*
// TODO: confirm this is OK and delete
exports.path = {
    'temp_pdfs': '/tmp/richreview/pdfs',
    'webapp_richreview': '../../richreview/public/webapps/richreview',
    'webapp_multicolumn': '../../richreview/public/webapps/multicolumn'
};*/
/*exports.path = {
    'temp_pdfs': '/tmp/richreview/pdfs',
    'webapp_richreview': '../webapps/richreview',
    'webapp_multicolumn': '../webapps/multicolumn'
};*/
exports.path = {
    'temp_pdfs': '/tmp/richreview/pdfs',
    'webapp_richreview': 'webapps/richreview',
    'webapp_multicolumn': 'webapps/multicolumn'
};

/**
 * CHANGES: 20180504
 *
 * make webapp urls
 */
/*
// TODO: confirm this is OK and delete
exports.webapp_urls = {
    'multicolumn': js_utils.getWebAppUrls(
        '../../../richreview/public/webapps/multicolumn',
        '/static_multicolumn/',
        /((\/|^)\..*)/
    ),
    'richreview': js_utils.getWebAppUrls(
        '../../../richreview/public/webapps/richreview',
        '/static_viewer/',
        /((\/|^)\..*)|(^test\/.*)/
    )
};
*/
exports.webapp_urls = {
    'multicolumn': js_utils.getWebAppUrls(
        'webapps/multicolumn',
        '/static_multicolumn/',
        /((\/|^)\..*)/
    ),
    'richreview': js_utils.getWebAppUrls(
        'webapps/richreview',
        '/static_viewer/',
        /((\/|^)\..*)|(^test\/.*)/
    )
};

/*
exports.config_files = {
    azure_keys:     '../ssl/azure_keys.json',
    bluemix_stt_auth: '../ssl/bluemix_stt_auth.json',
    google_open_id: '../ssl/google_open_id.json',
    ssl_key:        '../ssl/richreview_net.key',
    ssl_cert:       '../ssl/richreview_net.crt',
    ssl_ca:         '../ssl/root.crt'
};*/
exports.config_files = {
    azure_keys:       path.join(__dirname, '..', 'ssl/azure_keys.json'),
    bluemix_stt_auth: path.join(__dirname, '..', 'ssl/bluemix_stt_auth.json')//,
    // TODO: these are not being used(?) test and delete commented
    // google_open_id:   path.join(__dirname, '..', 'ssl/google_open_id.json'),
    //ssl_key:          path.join(__dirname, '..', 'ssl/richreview_net.key'),
    //ssl_cert:         path.join(__dirname, '..', 'ssl/richreview_net.crt'),
    //ssl_ca:           path.join(__dirname, '..', 'ssl/root.crt')
};

exports.google_oauth = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'ssl/google_open_id.json'), 'utf-8')
)["web"];

exports.cornell_wsfed = (function() {
    var cornel_wsfed_text = null;
    if(process.env.NODE_ENV = 'development') {
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