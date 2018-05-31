/**
 * controller for login and log out
 *
 * created by Colin
 */

const util = require("../util");

exports.isLoggedIn = (req, res, next) => {
    // check if the user is authenticated
    if(req.isAuthenticated()) {
        return next();
    }

    util.debug("user is not logged in!");
    // to-do make a flash message
    res.redirect('/login_pilot');
};