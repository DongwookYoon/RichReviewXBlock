/**
 * Created by yoon on 2/1/15.
 */

var js_utils = require("../lib/js_utils.js");
var R2D = require('../lib/r2d.js');

exports.get = function (req, res) {
    req.session.latestUrl = req.originalUrl;
    if(req.user){
        res.render('_pages_account', {cur_page: 'Account', user: req.user });
    }
    else{
        res.redirect('/login');
    }
};

exports.post = function(req, res){
    if(req.user){
        R2D.User.prototype.updateNick(req.user.id, req.body.nick, '').then(
            function(user){
                res.render('_pages_account', {cur_page: 'Account', user: req.user });
            }
        ).catch(
            function(err){
                js_utils.PostResp(res, req, 400, err);
            }
        );
    }
    else{
        js_utils.PostResp(res, req, 400, 'you are an unidentified user. please sign in and try again.');
    }
};