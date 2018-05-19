/**
 * Handler for pilot study
 *
 * Created by Colin
 */

// import npm modules
const Promise     = require("promise"); // jshint ignore:line

// import libraries
const js_utils    = require('./js_utils');
const env         = require('./env');
const R2D         = require('./r2d');
// const redisClient = require('./redis_client').redisClient;
const RedisClient = require('./redis_client').RedisClient;

/*
For the pilot study we have
in redis `pilot_study_lookup`, a list consisting of hash of key is id; value is password

For each student we will give them an id and password

A PilotUser will have
userid:   string of form `[id]@pilot.study`
password: string
user:     R2D.User
    user corr. to redis entry `usr:[js_utils.generateSaltedSha1(email, env.sha1_salt.netid).substring(0, 21)]`
    we can look up user of email_user_lookup
 */

/**
 * Container for PilotUser
 *
 */
const PilotUser = function() {
    /*
    this.userid
    this.user
    this.password
     */
};

/**
 * normalize user id string.
 * userid should be [id_str]@pilot.study
 * @return
 */
PilotUser.prototype.makeUserID = function(id_str) {
    if(id_str.match("@pilot.study$")) {
        return id_str;
    } else {
        return id_str + "@pilot.study";
    }
};

/**
 * find whether user exists
 * @return promise to true if user exists, false otherwise
 */
PilotUser.prototype.userExists = function(userid) {
    console.log("DEBUG: PilotUser.prototype.userExists");
    return RedisClient.HEXISTS("pilot_study_lookup", userid);
};

/**
 * creates a PilotUser
 * PilotUser.create should only be admissible by admin; create script an run with node
 * @return Promise resolves with nothing or rejects with error
 */
PilotUser.prototype.create = function(id_str, password) {
    const userid = PilotUser.prototype.makeUserID(id_str);

    // 1) checks if user already exists
    console.log("DEBUG: check if user already exists");
    PilotUser.prototype.userExists(userid)
        .then(function(user_exists) {
            if(user_exists) {
                throw "user "+userid+" already exists!";
            } else {
                // 2) create a new R2D.User
                console.log("DEBUG: create a new R2D.User");
                const hashed_userid =js_utils.generateSaltedSha1(userid, env.sha1_salt.netid).substring(0, 21);
                return R2D.User.prototype.create(hashed_userid, userid);
            }

        }).then(function(user) {
            // 3) set pilot_study_lookup
            console.log("DEBUG: set pilot_study_lookup");
            return RedisClient.HSET("pilot_study_lookup", userid, password);

        });
};

/**
 * get user password
 * @return promise to password
 */
PilotUser.prototype.getUserPassword = function(userid) {
    return PilotUser.prototype.userExists(userid)
        .then(function(has_userid) {
            if(has_userid) {
                return RedisClient.HGET("pilot_study_lookup", userid);
            } else {
                throw "user does not exist";
            }
        });
};

/**
 * callback for Passport Local Strategy
 *
 *
 */
const localStrategyCB = function(id_str, password, done) {
    let userid = PilotUser.prototype.makeUserID(id_str);

    console.log("DEBUG: logging in...");

    console.log("DEBUG: get user Password");
    PilotUser.prototype.getUserPassword(userid)
        .then(function(user_password) {
            if(password === user_password) {
                console.log("DEBUG: find by email");
                return R2D.User.prototype.findByEmail(userid);
            } else {
                throw "password does not match";
            }

        }).then(function(user) {
            console.log("DEBUG: login success");
            console.log(JSON.stringify(user));
            done(null, user);

        }).catch(function(err) {
        console.log("ERR: "+ err);
            done(null, false);

        });

};

exports.PilotUser = PilotUser;
exports.localStrategyCB = localStrategyCB;
