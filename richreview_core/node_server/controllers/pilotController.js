/**
 * Pilot controller to handle pilot related requests
 *
 * Created by Colin
 */

const pilotHandler  = require('../lib/pilot_handler');
const util        = require('../util');
const path        = require('path');
const js_utils    = require("../lib/js_utils");

/***********/
/** Login **/
/***********/

exports.pilot_login_page = (req, res) => {
    res.render('login_pilot', {cur_page: 'login', user: req.user });
};

exports.auth_pilot_admin = (req, res, next) => {
    util.debug("auth_pilot_admin");
    req.session.latestUrl = req.originalUrl;
    const email = req.user.email;
    pilotHandler.confirmAdminStatus(email)
        .then((userid) => {
            return next();
        })
        .catch((err) => {
            util.error(err);
            res.redirect("/");
        });
};

/*********************************/
/** Controllers for Pilot Admin **/
/*********************************/

exports.pilot_admin = (req, res) => {
    pilotHandler.retrieveUserDetails()
        .then((pilot_users) => {
            res.render("pilot_admin", { cur_page: "pilot_admin", user: req.user, pilot_users });
        }).catch((err) => {
            util.error(err);
            res.redirect("/");
        });
};


exports.mgmt_acct = (req, res) => {
    const email    = req.params.email;
    const req_user_email = req.user.email;
    const op       = req.query.op;
    //util.debug(op);
    util.debug(JSON.stringify(req.body));
    let promise = null;
    switch(op) {
        case "ChangePassword":
            const password = req.body.value;
            promise = pilotHandler.managePassword(email, password, req_user_email);
            break;
        case "ChangeIsActive":
            const is_active = req.body.value === "no";
            util.debug(is_active);
            promise = pilotHandler.manageIsActive(email, is_active);
            break;
        default:
            promise = Promise.reject("incorrect operation");
    }
    promise.then((b) => {
            res.redirect("/pilot_admin");
        }).catch((err) => {
            util.error(err);
            req.flash('error', err);
            res.redirect("/pilot_admin");
        });

    // const password = req.body.password;
    // const is_active = req.body.is_blocked ? false : true;
    // const req_user_email = req.user.email;
    // pilotHandler.manageAccount(email, password, is_active, req_user_email)
    //     .then((b) => {
    //         res.redirect("/pilot_admin");
    //     }).catch((err) => {
    //         util.error(err);
    //         res.redirect("/");
    //     });
};

/**
 *
 * this is disabled in app.js
 */
exports.mgmt_info = (req, res) => {
    const email = req.params.email;
    const first_name = req.body.first_name;
    const last_name = req.body.last_name;
    const sid = req.body.sid;
    pilotHandler.manageUserInfo(email, first_name, last_name, sid)
        .then((b) => {
            res.redirect("/pilot_admin");
        }).catch((err) => {
        util.error(err);
        res.redirect("/");
    });
};

/******************************/
/** Controllers for Backdoor **/
/******************************/

exports.pilot_backdoor = (req, res) => {
    pilotHandler.retrieveUserDetails()
        .then((pilot_users) => {
            res.render("pilot_backdoor", { cur_page: "pilot_backdoor", user: req.user, pilot_users });
        }).catch((err) => {
        util.error(err);
        res.redirect("/");
    });
};

exports.auth_pilot_superuser = (req, res, next) => {
    util.debug("auth_pilot_superuser");
    /*const email = req.user.email;
    pilotHandler.confirmIsSuperuser(email)
        .then((userid) => {
            return next();
        })
        .catch((err) => {
            util.error(err);
            res.redirect("/");
        });*/
    return next();
};

/********************/
/** Test React App **/
/********************/

exports.class_page = (req, res) => {
    res.render("class", { cur_page: "class", user: req.user });
};