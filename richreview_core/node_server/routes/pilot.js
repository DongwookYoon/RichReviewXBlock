/**
 * Login page to handle login requests
 *
 * Created by Colin
 */

const RedisClient = require('../lib/redis_client').RedisClient;
const pilotStudy  = require('../lib/pilot_study');

exports.pilot_login_page = (req, res) => {

    req.session.latestUrl = req.originalUrl;
    res.render('login_pilot', {cur_page: 'Support', user: req.user });
};

exports.pilot_admin = (req, res) => {
    // await RedisClient.KEYS();

    res.render('pilot_admin');

}
