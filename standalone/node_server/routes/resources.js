/**
 * Created by dongwook on 9/15/15.
 */

var env = require('../lib/env.js');
var js_utils = require('../lib/js_utils');
var azure = require('../lib/azure');

/*
 response to get requests
 */
exports.get = function(req, res){
    if(! ('op' in req.query) ){
        res.status(400).send({ error: 'you didn\'t specify the operator.' });
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
                res.status(400).send({'error': req.query['op'] + ' is an undefined operation'});
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


/*
 response to post requests
 */
exports.post = function(req, res){
    try{
        if( typeof req.body === 'undefined' ||
            typeof req.body.op === 'undefined' ){
            throw 'you didn\'t specify the operator.'
        }

        switch(req.body.op){
            default:
                throw '\'' + req.body.op + '\''+ ' is an undefined operation';
                break;
        }
    }
    catch(err){
        if(typeof err === 'string'){
            res.status(400).send({'error': err});
        }
        else if(err instanceof Error){
            res.status(400).send({'error': err.message});
        }
        else{
            res.status(400).send({'error': 'unidentified internal server error'});
        }
    }
};
