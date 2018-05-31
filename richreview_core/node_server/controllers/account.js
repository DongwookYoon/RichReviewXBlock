/**
 * Created by yoon on 2/1/15.
 */

var js_utils = require("../lib/js_utils.js");
var R2D = require('../lib/r2d.js');

exports.get = function (req, res) {
    req.session.latestUrl = req.originalUrl;
    res.render('_pages_account', {cur_page: 'Account', user: req.user });
    /*
    // TODO: test and del comment
    if(js_utils.redirectUnknownUser(req, res)){
        res.render('_pages_account', {cur_page: 'Account', user: req.user });
    }*/
};

exports.post = function(req, res){
    if(js_utils.identifyUser(req, res)){
        R2D.User.prototype.updateNick(req.user.id, req.body.nick, '').then(
            function(user){
                res.render('_pages_account', {cur_page: 'Account', user: user });
            }
        ).catch(
            function(err){
                js_utils.PostResp(res, req, 400, err);
            }
        );
    }
};