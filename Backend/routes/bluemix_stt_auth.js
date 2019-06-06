var express = require('express');
var router = express.Router({mergeParams: true});
var request = require('request');

const env = require('../env');
var auth = env.bluemix_config;
var credentials = auth['speech_to_text'][0]['credentials'];


router.get('/', async function(req, res, next) {

    // if (!req.user)
    //     res.sendStatus(401);

    let url = 'https://stream.watsonplatform.net/authorization/api/v1/token?url=https://stream.watsonplatform.net/speech-to-text/api';
    request(
        {
            url : url,
            headers : {
                "Authorization" : 'Basic ' + new Buffer(credentials.username + ':' + credentials.password).toString('base64')
            }
        },
        function (error, response, body) {
            if (error)
                res.sendStatus(501);

            //res.setHeader('Access-Control-Allow-Origin', 'https://'+req.headers.host);
            // res.setHeader('Access-Control-Allow-Credentials', 'true');
            res.send(body);
        }
    );
});



router.put('/', function(req, res, next) {
    res.sendStatus(403);
});

router.post('/', function(req, res, next) {
    res.sendStatus(403);
});

router.delete('/', function(req, res, next) {
    res.sendStatus(403);
});



module.exports = router;
