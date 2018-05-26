/**
 * Login page to handle login requests
 *
 * Created by Colin
 */

const RedisClient = require('../lib/redis_client').RedisClient;
const pilotStudy  = require('../lib/pilot_study');
const util        = require('../util');

exports.pilot_login_page = (req, res) => {
    req.session.latestUrl = req.originalUrl;
    res.render('login_pilot', {cur_page: 'Support', user: req.user });
};

exports.auth_pilot_admin = (req, res, next) => {
    util.debug("auth_pilot_admin");
    const email = req.user.email;
    pilotStudy.confirmAdminStatus(email)
        .then((userid) => {
            return next();
        })
        .catch((err) => {
            util.error(err);
            res.redirect("/");
        });
};

exports.pilot_admin = (req, res) => {
    pilotStudy.retrieveUserDetails()
        .then((pilot_users) => {
            res.render("pilot_admin", { cur_page: 'Pilot Admin', user: req.user, pilot_users });
        }).catch((err) => {
            util.error(err);
            res.redirect("/");
        });
};

exports.mgmt_acct = (req, res) => {
    const email = req.params.email;
    const password = req.body.password;
    const is_active = req.body.is_active ? true : false;
    pilotStudy.manageAccount(email, password, is_active)
        .then((b) => {
            res.redirect("/pilot_admin");
        }).catch((err) => {
        util.error(err);
            res.redirect("/");
        });
};

exports.mgmt_info = (req, res) => {
    const email = req.params.email;
    const first_name = req.body.first_name;
    const last_name = req.body.last_name;
    const sid = req.body.sid;
    pilotStudy.manageUserInfo(email, first_name, last_name, sid)
        .then((b) => {
            res.redirect("/pilot_admin");
        }).catch((err) => {
        util.error(err);
        res.redirect("/");
    });
};