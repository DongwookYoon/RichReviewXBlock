/**
 *
 *
 * Created by Colin
 */

// import built-in modules
const crypto = require('crypto');

exports.pilot_login_page = function(req, res) {

    req.session.latestUrl = req.originalUrl;
    res.render('login_pilot', {cur_page: 'Support', user: req.user });
};

exports.login_pilot_study = function(req, res) {

    // 1) use Bearer Authentication as a passport strategy in app.js
    // https://swagger.io/docs/specification/authentication/bearer-authentication/


    // 2) passport login using Bearer Authentication
    // users will be given pilot-id and corr. password


    // 3) form email= [pilot-id]@pilot_study
    // first time login => create user entry usr:[sha1 hash of pilot-id]
    //                     (note this should consumes inv:[email] if there are any)
    //                  => add to email_user_lookup entry (email, usr:[sha1 hash of pilot-id])
    //




    console.log("DEBUG: logging in");
    res.redirect('/');
}