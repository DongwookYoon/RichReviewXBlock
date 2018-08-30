/**
 * Created by ukka123 on 12/6/14.
 */
var js_utils = require("../lib/js_utils");
var js_error = require('../lib/js_error');


exports.get = function (req, res) {
    req.session.latestUrl = req.originalUrl;
    res.render('support', {cur_page: 'Support', user: req.user });
};

exports.post = function(req, res){
    if(req.body.subject !== '' || req.body.mailbody !== '' || req.body.reply !== ''){
        var userdata = "";
        if(req.user){
            userdata = JSON.stringify(req.user);
        }

        js_utils.Email(
            "RichReviewReporter ✔ <azureuser@richreview.net>",
            "dy252@cornell.edu",
            req.body.subject,
            req.body.reply + '\n\n' + req.body.mailbody + "\n\n" + userdata,
            ""
        ).then(
            function(info){
                console.log('Support Email Sent: ' + JSON.stringify(info));
                res.render('support', {cur_page: 'About', user: req.user, after_submitted:true });
                //js_utils.PostResp(res, req, 200);
                return null;
            }
        ).catch(
            function(err){
                console.log('Support Email Sending Error: ' + JSON.stringify(err));
                js_utils.PostResp(res, req, 500);
            }
        );
    }
    else{
        js_error.HandleError('Invalid Report',
            'Please fill the subject, contact, and body of the report.',
            res);
    }
};