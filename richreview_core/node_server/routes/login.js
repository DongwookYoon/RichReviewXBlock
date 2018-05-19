/**
 * Login page to handle login requests
 *
 * Created by Colin
 */

exports.pilot_login_page = function(req, res) {

    req.session.latestUrl = req.originalUrl;
    res.render('login_pilot', {cur_page: 'Support', user: req.user });
};