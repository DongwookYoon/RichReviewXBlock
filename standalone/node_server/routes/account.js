/**
 * Created by yoon on 2/1/15.
 */

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
        R2D.User.prototype.Update(req.user.id, req.body.nick, req.body.email, function(err, result){
            if(err){
                res.send("error while account update");
            }
            else{
                res.render('_pages_account', {cur_page: 'Account', user: req.user });
            }
        });
    }
};