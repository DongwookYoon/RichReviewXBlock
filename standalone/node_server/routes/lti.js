/**
 * Created by yoon on 8/5/16.
 */
var path = require('path');
var R2D = require('../lib/r2d.js');

function checkLtiUser(req, res){
    if(req.user instanceof R2D.LtiUser){
        return true;
    }
    else{
        res.send('Unauthorized access. Please make sure that you access this webpage through edX.org.');
    }
}

exports.get_welcome = function(req, res){
    if(checkLtiUser(req, res)){
        res.sendFile('lti_welcome/index.html', {root: path.join(__dirname, '../public')});
    }
};

exports.post_scrning = function(req, res){
    if(checkLtiUser(req, res)){
        if(typeof req.body.age_legal === 'string' &&
            typeof req.body.scr_rdr === 'string' &&
            typeof req.body.scr_rdr_type === 'string'){
            res.send(JSON.stringify(req.user));
        }
        else{
            res.send('Please ');
        }
    }
};