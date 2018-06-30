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
const RedisClient = require('./redis_client').RedisClient;
const lib_utils   = require('./lib_utils');
const util        = require('../util');

/**
 * Structure of pilot:[userid]
 *
 * userid is a pseudo-email of the form [id]@pilot.study
 *
 * password   {string} required -
 * user       {string} required - has the form `usr:[js_utils.generateSaltedSha1(email, env.sha1_salt.netid)]`
 * category   {string} - the section user belongs to for view logic e.g. KOR, CHN, ADMIN, etc
 * first_name {string} optional - the first name of user
 * last_name  {string} optional - the last name of user
 * sid        {string} optional - the student id of user
 * isActive   {string} required - is pilot user active?
 * isAdmin    {string} required - is pilot user an admin?
 *
 * userid is also added to email_user_lookup as a hash field
 *
 * CHANGES: 20180520 - We are not allowed to record student details
 */

/**
 * create a pilot:[userid] entry in redis
 * user details are set to the empty string
 *
 */
const createRedisEntry = function(userid, user, password, category, isAdmin) {
    const u = "usr:"+user.id;
    return RedisClient.HMSET(
        "pilot:"+userid,
        "user", u,
        "password", password,
        "category", category,
        "first_name", "",
        "last_name", "",
        "sid", "",
        "is_active", true,
        "is_admin", isAdmin
    );
};

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
    //return RedisClient.HEXISTS("pilot_study_lookup", userid);
    return RedisClient.EXISTS("pilot:"+userid);
};

/**
 * creates a PilotUser
 * PilotUser.create should only be admissible by admin; create script an run with node
 * @return Promise resolves with [string message] or rejects with error
 *
 */
const createPilotUser = function(id_str, password, category, isAdmin) {
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
                /*.then(function (user) {
                    // 3) set pilot_study_lookup
                    // util.logger("IMPORT_PILOT_STUDY","set pilot_study_lookup");
                    return RedisClient.HSET("pilot_study_lookup", userid, password);
                })*/
                    .then(function (user) {
                        // 3) create redis entry
                        util.logger("IMPORT_PILOT_STUDY","create pilot: entry");
                        return createRedisEntry(userid, user, password, category, isAdmin);
                    })
                    .then(function (b) {
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
                //return RedisClient.HGET("pilot_study_lookup", userid);
                return RedisClient.HGET("pilot:"+userid, "password");
            } else {
                throw "user does not exist";
            }
        });
};

const createStudentPilotUser = function(id_str, password, category) {
    return createPilotUser(id_str, password, category, false);
};

const createAdminPilotUser = function(id_str, password) {
    return createPilotUser(id_str, password, "ADMIN", true);
};

/**
 * Check that user is active. If not, then throw
 */
const confirmUserIsActive = (userid) => {
    return RedisClient.HGET("pilot:"+userid, "is_active")
        .then((b) => {
            if(b === "true") {
                return userid;
            } else {
                throw "user is not active or does not exist";
            }
        });
};

const confirmAdminStatus = (userid) => {
    return RedisClient.HGET("pilot:"+userid, "is_admin")
        .then((b) => {
            if(b === "true") {
                return userid;
            } else {
                throw "user is not an admin";
            }
        });
};

/**
 * Retrieve pilot study user details
 * @returns {Promise|Promise.<object[]>} - a promise to object of user data
 */
const retrieveUserDetails = () => {
    /**
     * retrieve the pilot details from a pilot_key
     * @param {string} pilot_key - of form pilot:[id]@pilot.study to get details
     * @returns {Promise.<object>}
     */
    const rUserDetail = (pilot_key) => {
        const email = pilot_key.substring(6);
        return RedisClient.HMGET(
            pilot_key,
            "first_name",
            "last_name",
            "sid",
            "password",
            "is_active",
            "is_admin"
        ).then((d) => {
            return {
                email: email,
                first_name: d[0],
                last_name: d[1],
                sid: d[2],
                password: d[3],
                is_active: d[4],
                is_admin: d[5]
            };
        });
    };

    return RedisClient.KEYS("pilot:*")
        .then((keys) => {
            const promises = keys.map((key) => {
                return rUserDetail(key);
            });
            return Promise.all(promises);
        });
};

/**
 * Update user password and make active / unactive
 * @param {String} email
 * @param {String} password
 * @param {Boolean} is_active
 * @return {Promise|Promise.<number>}
 *
 * Note: this function is deprecated
 * TODO: delete
 */
const manageAccount = (email, password, is_active, req_user_email) => {
    const changeAdminPassword = () => {
        if(req_user_email === email) {
            return RedisClient.HSET("pilot:"+email, "password", password);
        } else {
            throw "an admin cannot change the password of other admins";
        }
    };

    return RedisClient.HGET("pilot:"+email,"is_admin")
        .then((is_admin) => {
            if(is_admin === "true") {
                // if is admin then is_active does not change
                return changeAdminPassword();
            } else {
                return RedisClient.HMSET("pilot:"+email, "password", password, "is_active", is_active);
            }
        });

};

const managePassword = (email, password, req_user_email) => {
    const changeAdminPassword = () => {
        if(req_user_email === email) {
            return RedisClient.HSET("pilot:"+email, "password", password);
        } else {
            throw "an admin cannot change the password of other admins";
        }
    };

    return RedisClient.HGET("pilot:"+email,"is_admin")
        .then((is_admin) => {
            if(is_admin === "true") {
                // if is admin then is_active does not change
                return changeAdminPassword();
            } else {
                return RedisClient.HSET("pilot:"+email, "password", password);
            }
        });
};

const manageIsActive = (email, is_active) => {
    //util.debug("manageIsActive: " + is_active);
    return RedisClient.HGET("pilot:"+email,"is_admin")
        .then((is_admin) => {
            if(is_admin === "true") {
                throw "admins cannot be blocked";
            } else {
                return RedisClient.HSET("pilot:"+email, "is_active", is_active);
            }
        });
};

/**
 * Update user info
 * @param {String} email
 * @param {String} first_name
 * @param {String} last_name
 * @param {String} sid
 * @return {Promise|Promise.<number>}
 *
 * Note: this is currently disabled because we cannot record user info
 */
const manageUserInfo = (email, first_name, last_name, sid) => {
    util.debug("managing user info");
    return RedisClient.HMSET("pilot:"+email, "first_name", first_name, "last_name", last_name, "sid", sid);
};

const retrieveUserDetail = (pilot_key) => {
    const email = pilot_key.substring(6);
    return RedisClient.HMGET(
        "pilot:"+pilot_key,
        "first_name",
        "last_name",
        "sid",
        "is_active",
        "is_admin"
    ).then((d) => {
        return {
            email: email,
            first_name: d[0],
            last_name: d[1],
            sid: d[2],
            is_active: d[3],
            is_admin: d[4]
        };
    });
};

/**
 *
 * Note: function always fulfill with user
 *
 */
const plugPilot = (user) => {
    return new Promise((fulfill) => {
        RedisClient.EXISTS("pilot:"+user.email)
            .then((b) => {
                if(b === 1) {
                    return retrieveUserDetail(user.email)
                        .then((pilot_user) => {
                            user.pilot = pilot_user;
                            fulfill(user);
                        });
                } else {
                    fulfill(user);
                }
            })
            .catch((err) => {
                fulfill(user);
            });
    });

};

/**
 * callback for Passport Local Strategy
 *
 *
 */
const localStrategyCB = (id_str, password, done) => {
    let userid = makeUserID(id_str);

    util.logger("localStrategyCB", "logging in "+userid+"...");

    util.logger("localStrategyCB", "get user Password");
    confirmUserIsActive(userid)
        .then(getUserPassword)
        .then(function(user_password) {
            if(password === user_password) {
                util.logger("localStrategyCB", "makeR2DUser");
                return lib_utils.findUserByEmail(userid);
            } else {
                throw "password does not match";
            }
        })
        .then(function(user) {
            util.logger("localStrategyCB", "success");
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
exports.retrieveUserDetails = retrieveUserDetails;
//exports.manageAccount = manageAccount;
exports.managePassword = managePassword;
exports.manageIsActive = manageIsActive;
exports.manageUserInfo = manageUserInfo;
exports.confirmAdminStatus = confirmAdminStatus;
exports.localStrategyCB = localStrategyCB;
exports.plugPilot = plugPilot;
