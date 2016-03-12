/**
 * Created by yoon on 1/16/16.
 */


var request = require('request');
var fs = require('fs');
var env = require('../lib/env.js');
var auth = JSON.parse(fs.readFileSync(env.config_files.bluemix_stt_auth, 'utf-8'));
var credentials = auth['speech_to_text'][0]['credentials'];
var js_utils = require("../lib/js_utils.js");

exports.get = function(req, res) {
    if(js_utils.identifyUser(req, res)){
        var url = 'https://stream.watsonplatform.net/authorization/api/v1/token?url=https://stream.watsonplatform.net/speech-to-text/api';
        request(
            {
                url : url,
                headers : {
                    "Authorization" : 'Basic ' + new Buffer(credentials.username + ':' + credentials.password).toString('base64')
                }
            },
            function (error, response, body) {
                res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
                res.setHeader('Access-Control-Allow-Credentials', 'true');
                res.send(body);
            }
        );
    }
};
