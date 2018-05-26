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
const util = require('../util');

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
function PilotUser(userid, password, user, first_name, last_name, sid, isActive, isAdmin) {

    // Add object properties like this
    // this.userid     = userid;     // string; required; pseudo-email of form [id]@pilot.study
    // this.password   = password;   // string; required;
    // this.user       = user;       // User; required;
    this.first_name = first_name; // string
    this.last_name  = last_name;  // string
    this.sid        = sid;        // string
    this.isActive   = isActive;   // boolean; required; is active
    this.isAdmin    = isAdmin;    // boolean; required; is admin
}

/**
 * normalize user id string.
 * userid should be [id_str]@pilot.study
 * @return
 */
const makeUserID = function(id_str) {
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
const userExists = function(userid) {
    return RedisClient.HEXISTS("pilot_study_lookup", userid);
    //return RedisClient.EXISTS("pilot:"+userid);
};

/**
 * create a pilot:[userid] entry in redis to track user details and permissions
 * user details are set to the empty string
 *
 */
const createRedisEntry = function(userid, user, password, isAdmin) {
    const u = "usr:"+user.id;
    return RedisClient.HMSET(
        "pilot:"+userid,
        "user", u,
        "password", password,
        "first_name", "",
        "last_name", "",
        "sid", "",
        "is_active", true,
        "is_admin", isAdmin
    );
};

/**
 * creates a PilotUser
 * PilotUser.create should only be admissible by admin; create script an run with node
 * @return Promise resolves with [string message] or rejects with error
 *
 * TODO: still does not fulfill completely(?)
 * TODO: test changes
 */
const createPilotUser = function(id_str, password, isAdmin) {
    // userid has form [id]@pilot.study
    const userid = makeUserID(id_str);

    // 1) checks if user already exists
    util.logger("IMPORT_PILOT_STUDY","check if user already exists");
    return userExists(userid)
        .then(function(user_exists) {
            if (user_exists) {
                // throw "user "+userid+" already exists!";
                return userid + " already exists";
            } else {
                // 2) create a new R2D.User
                util.logger("IMPORT_PILOT_STUDY", "create a new R2D.User");
                const hashed_userid = js_utils.generateSaltedSha1(userid, env.sha1_salt.netid).substring(0, 21);
                return R2D.User.prototype.create(hashed_userid, userid)
                    .then(function (user) {
                        // 3) set pilot_study_lookup
                        // util.logger("IMPORT_PILOT_STUDY","set pilot_study_lookup");
                        return RedisClient.HSET("pilot_study_lookup", userid, password);
                    })
                    /*.then(function (user) {
                        // 3) create redis entry
                        return createRedisEntry(userid, user, password, isAdmin);
                    })*/.then(function (b) {
                        return userid + " added";
                    });
            }
        });
};

/**
 * get user password
 * @return promise to password
 */
const getUserPassword = function(userid) {
    return userExists(userid)
        .then(function(has_userid) {
            if(has_userid) {
                return RedisClient.HGET("pilot_study_lookup", userid);
                //return RedisClient.HGET("pilot:"+userid, "password");
            } else {
                throw "user does not exist";
            }
        });
};

const createStudentPilotUser = function(id_str, password) {
    return createPilotUser(id_str, password, false);
};

const createAdminPilotUser = function(id_str, password) {
    return createPilotUser(id_str, password, true);
};

/**
 * Check that user is active. If not, then throw
 */
const confirmUserIsActive = (userid) => {
    return RedisClient.HGET("pilot:"+userid, "is_active")
        .then((b) => {
            if(b) {
                return userid;
            } else {
                throw "user is not active";
            }
        });
};

/*const getUserDetails = () => {
    return RedisClient.KEYS("pilot:*")
        .then((users) => {
            // return user information
        });
};*/

/**
 * callback for Passport Local Strategy
 *
 *
 */
const localStrategyCB = function(id_str, password, done) {
    let userid = makeUserID(id_str);

    util.debug("logging in...");

    util.debug("get user Password");
    getUserPassword(userid)
    /*confirmUserIsActive(userid)
        .then(getUserPassword)*/
        .then(function(user_password) {
            if(password === user_password) {
                util.debug("find by email");
                return R2D.User.prototype.findByEmail(userid);
            } else {
                throw "password does not match";
            }
        })
        .then(function(user) {
            util.debug("login success");
            done(null, user);

        })
        .catch(function(err) {
            util.error(err);
            done(null, false);

        });

};

/*const sanityCheckPilot = () => {
    RedisClient.HKEYS("pilot_study_lookup")
        .then((emails) => {
            const nEmails = emails.length();
            const promises = emails.map((email) => {
                return RedisClient.EXISTS("pilot:"+email);
            });
            Promise.all(promises)
                .then((list) => {
                });
        });
}*/

exports.createStudentPilotUser = createStudentPilotUser;
exports.createAdminPilotUser = createAdminPilotUser;
exports.localStrategyCB = localStrategyCB;
