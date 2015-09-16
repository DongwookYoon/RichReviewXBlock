/**
 * Created by dongwook on 9/15/15.
 */

var env = require('../lib/env.js');
var js_utils = require('../lib/js_utils');

exports.get = function(req, res){
    if(! ('op' in req.query) ){
        res.status(406).send({ error: 'you didn\'t specify the operator.' });
    }
    else{
        switch(req.query['op']){
            case 'get_richreview_webapp_urls':
                getMulticolumnWebappUrls(req, res);
                break;
            case 'get_multicolumn_webapp_urls':
                getRichReviewWebappUrls(req, res);
                break;
            default:
                res.status(405).send({'error': req.query['op'] + ' is an undefined operation'});
                break;
        }
    }
};

var getRichReviewWebappUrls = function(req, res){
    res.send(env.webapp_urls.richreview);
};

var getMulticolumnWebappUrls = function(req, res){
    res.send(env.webapp_urls.multicolumn);
};