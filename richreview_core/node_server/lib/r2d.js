/**
 * R2D
 *
 * Created by Dongwook on 1/31/2015.
 */

// import npm modules
const Promise = require("promise"); // jshint ignore:line
const assert  = require("chai").assert;

// import libraries
const js_utils = require('./js_utils');
const redisClient = require('./redis_client').redisClient;
const RedisClient = require('./redis_client').RedisClient;
const redis_utils = require('./redis_client').util;
const util = require('../util');

// constants
const USERID_EMAIL_TABLE = "userid_email_table";
// TODO: put this in a global location like env.js
const AUTH_TYPES = ["UBC_CWL", "Internal", "Pilot", "Cornell", "Google"];
const AUTH_TYPES_OTHER = "other";
const AUTH_TYPES_UNKN  = "unknown";

/*
 * User
 */

/**
 * User ( `usr:<userid>` )
 * userid is a sha1 hash with salt from netid
 *
 * @class User
 * @typeof Object
 * @member {string} nick             - nickname
 * @member {string} email            - email of user
 * @member {string|string[]} groupNs - array of groupid user is in
 * @member {string} [auth_type]      - is one of "UBC_CWL", "Pilot", "Cornell", "Google", etc representing the auth strategy and user affiliation. The complete list is in AUTH_TYPES. Please update when there is a new auth strategy.
 * @member {string} [password_hash]  - made from irreversible sha1 hash with salt from netid
 * @member {string} [salt]           -
 * @member {boolean} [is_admin]      - is user admin; used for superuser actions
 * @member {string} [auth_level]     - Deprecated. Is one of "student", "instructor", or "admin"; refers to security level in terms of access to functionality (delete, doc creation, etc); also affects routing.
 * @member {string} [display_name]   - the preferred name of the user
 * @member {string} [first_name]     - the first name of user
 * @member {string} [last_name]      - the last name of user
 * @member {string} [sid]            - the student id of user
 *
 * userid is also added to email_user_lookup as a hash field (deprecated)
 * user ID and email will be linked in the userid_email_table
 * TODO: currently userid_email_table stores IDs with the part `usr:`; it is best if we remove the `usr:`.
 * Please see db_schema.md for for details
 */

/**
 * Options
 *
 * @class UserOptions
 * @member {string} [auth_type]  - is
 * @member {{ password_hash: string, salt: string }} [auth]
 * @member {boolean} [is_admin]  -
 * @member {string} [display_name] -
 * @member {string} [first_name] -
 * @member {string} [last_name]  -
 * @member {string} [sid]        - student ID
 */

/**
 *
 * @param {string} id
 * @param {string} nickname
 * @param {string} email
 * @param {UserOptions|null} [options]
 * @constructor
 */
const User = function(id, nickname, email,
                      /** new fields **/
                      options
                      /****************/) {
  this.id = id;
  this.nick = nickname;
  this.email = email;
  if(options) {
    // auth_type, password_hash, salt, sid, first_name, last_name
    if(options.auth_type && (AUTH_TYPES.includes(options.auth_type)))
      this.auth_type = options.auth_type;
    // As of now, internal passwords are not entirely supported.
    if(options.auth) {
      this.password_hash = options.auth.password_hash;
      this.salt = options.auth.salt;
    }
    if(options.is_admin) this.is_admin = options.is_admin;
    if(options.sid) this.sid = options.sid;
    if(options.display_name) this.display_name = options.display_name;
    if(options.first_name) this.first_name = options.first_name;
    if(options.last_name) this.last_name = options.last_name;
  }
};

/**
 * methods:
 *
 * cache
 * isExist
 * findById
 * findByEmail
 * create
 * deleteUserByEmail
 * updateNick
 * syncEmail - change email of user
 * AddGroupToUser - add a group with groupid_n to user with userid_n
 * RemoveGroupFromUser - remove a group groupid_n from user with userid_n
 * GetGroupNs - get group ids from user with userid_n
 *
 * TODO: User should not use prototype if it doesn't need to access internal data, or called from User object instance
 */

/**
 * Update user's SID, first name and last name
 * @param {string} sid
 * @param {string} display_name
 * @param {string} first_name
 * @param {string} last_name
 * @return {Promise.<User>}
 */
User.prototype.updateDetails = function(sid, display_name, first_name, last_name) {
  const sss = [ ];
  if(sid)          sss.push("sid", sid);
  if(display_name) sss.push("display_name", display_name);
  if(first_name)   sss.push("first_name", first_name);
  if(last_name)    sss.push("last_name", last_name);
  /* // TODO: test and delete code
  return RedisClient.HMSET(
    user_key,
    "sid", sid,
    "first_name", first_name,
    "last_name", last_name
  )*/
  return RedisClient.HMSET.bind(null, `usr:${this.id}`).apply(null, sss)
    .then((b) => {
      return User.cache.loadFromDb(this.id);
    });
};

/**
 * get an array of all the users that signed up in the redis server
 * usrs is Array<usr>
 * usr is of form { email, groupNs, nick, id }
 * @return {Array.<User>}
 */
User.prototype.getSignedUp = function() {
  return RedisClient.KEYS('usr:*')
    .then(function(keys) {
      return Promise.all(
        keys.map(function(key) {
          return RedisClient.HGETALL(key);
        })
      )
        .then(function(usrs) {
          for(var i = 0, l = usrs.length; i < l; ++i){
            usrs[i].id = keys[i];
          }
          return usrs;
        });
    });
};

/**
 * Cache contains in dynamic memory User objects for all RichReview users.
 * @function populate
 * @function loadFromDb
 * @function get
 * @function exists
 * // WARNING: populate causes a race condition because it does not wait until.
 * // TODO: instead have one call of User.cache.populate() in App.js instead of during initiation of User.cache
 */
User.cache = (function() {
  let pub = { };
  let cache = { };

  /**
   * create an array of User from the users in the redis server
   * @returns {Array.<User>}
   */
  pub.populate = function() {
    cache = { };
    return RedisClient.KEYS("usr:*")
      .then(function(userids) {
        const promises = userids.map(function(userid) {
          return pub.loadFromDb(userid.substring(4));
        });
        return Promise.all(promises);
      })
      .then((users) => {
        util.start(`${Object.keys(cache).length} users populated in cache`);
        return users;
      })
      .catch(util.error);
  };

  /**
   * create a User from redis server's user with the same id, and save it in the cache as value with id as the key
   * @arg    id - the user's id on redis
   * @returns {Promise.<User>}
   */
  pub.loadFromDb = function(id) {
    return RedisClient.HGETALL("usr:"+id)
      .then(result => {

        // As of now, internal passwords are not entirely supported.
        if(result.password_hash) {
          assert.property(result, "salt", "result has password_hash but no salt");
          result.auth = {
            password_hash: result.password_hash,
            salt: result.salt
          };
        }

        cache[id] = new User(
          id,
          result.nick,
          result.email,
          result
        );
        return cache[id];
        }
      );
  };

  /**
   * return a user in the cache
   * @param {string} id - ID of user to get
   * @return {User} - user with the ID
   * @throws when there are no users with ID
   */
  pub.get = function(id) {
    if(pub.exists(id)) {
      return cache[id];
    }
    else {
      throw new Error(`there are no users with ID ${id}`);
    }
  };

  /**
   * Return true if user exists, false otherwise
   * @param id
   * @return {boolean}
   */
  pub.exists = function(id) {
    return cache.hasOwnProperty(id);
  };

  // WARNING: populate causes a race condition because it does not wait until.
  // TODO: instead have one call of User.cache.populate() in App.js instead of during initiation of User.cache
  pub.populate();

  return pub;
} ( ));

/**
 * Legacy verions of User.findById() instance function. Kept for compatibility.
 * @param {string} id - the ID of the user to search
 * @returns {Promise.<User|null>}
 */
User.prototype.findById = function(id) {
  return new Promise((resolve, reject) => {
    try {
      const user = User.cache.get(id);
      resolve(user);
    } catch(err) {
      reject(err);
    }
  });
};

/**
 * Find a user by their ID
 * @param {string} id - the ID of the user to search
 * @returns {Promise.<User|null>}
 */
User.findByID = function(id) {
  try {
    const user = User.cache.get(id);
    return Promise.resolve(user);
  } catch(err) {
    return Promise.resolve(null);
  }
};

{/***********************************/
  const getAuthType = (user) => {
    if(user.auth_type) {
      if(AUTH_TYPES.includes(user.auth_type)) return user.auth_type;
      else return AUTH_TYPES_OTHER;
    } else return AUTH_TYPES_UNKN;
  };

  const getID = (usr_str) => {
    return usr_str.substring(4);
  };

  const makeUsers = (usr_strs) => {
    if(usr_strs.length === 0) return Promise.resolve({ });
    else if(usr_strs.length === 1) {
      const user  = User.cache.get(getID(usr_strs[0]));
      return { [getAuthType(user)]: [user] }
    } // else
    const users = { };
    usr_strs.forEach((usr_str) => {
      const user = User.cache.get(getID(usr_str));
      const authType = getAuthType(user);
      if(users.hasOwnProperty(authType)) users[authType].push(user);
      else users[authType] = [user];
    });
    return users;
  };

  /**
   * Gets all users associated with given email, categorized by auth_type.
   * @param email
   * @returns {Promise.<Object.<string,string[]>>} A promise to an object with auth_type as keys, and a array of User as values
   */
  User.getWithEmailByAuthType = (email) => {
    if(js_utils.validateEmail(email)) {
      return redis_utils.GraphGet(USERID_EMAIL_TABLE, email)
        .then(makeUsers);
    } else {
      return Promise.resolve({ });
    }
  };
}/***********************************/

{/***********************************/
  const selectUser = (users) => {
    const auth_types = Object.keys(users);
    if (auth_types.length === 0) return null;
    else if (auth_types.length === 1) return (users[auth_types[0]])[0];
    else {
      for(let i = 0; i < AUTH_TYPES.length; i++)
        if(auth_types.includes(AUTH_TYPES[i]))
          return (users[AUTH_TYPES[i]])[0];
      if(auth_types.includes(AUTH_TYPES_OTHER)) return (users[AUTH_TYPES_OTHER])[0];
      return (users[AUTH_TYPES_UNKN])[0];
    }
  };

  /**
   * Get a promise to the User object from given email. Priority to Users that are CWL, then Cornell, then Google, etc...
   * @param  {string} email - email of user to find
   * @return {Promise.<User|null>} - promise for the user of that email
   * NOTE: This function originally got only one user with email instead of searching for the 'right' one. This function is provided to interface with older code.
   * TODO: now updated to use use redis_utils.GraphGet test method; test method
   */
  User.findByEmail = function(email) {

    return User.getWithEmailByAuthType(email)
      .then(selectUser);
  };
}/***********************************/

/**
 * Creates a new user in redis and caches user to User.cache
 * Additionally it consumes invites to add new user to groups it is invited to
 * @param {string} id
 * @param {string} email
 * @param {UserOptions|null} [options]
 * @return {Promise.<User>}
 */
User.create = function(id, email, /* new field */ options) {
  let sss = null;
  if(options) { // auth_type, password_hash, salt, sid, first_name, last_name
    sss = [ ];
    if(options.auth_type && (AUTH_TYPES.includes(options.auth_type)))
      sss.push("auth_type", options.auth_type);
    // As of now, internal passwords are not entirely supported.
    if(options.auth)
      sss.push(
        "password_hash", options.auth.password_hash,
        "salt", options.auth.salt
      );
    if(options.is_admin)   sss.push("is_admin", options.is_admin);
    if(options.sid)        sss.push("sid", options.sid);
    if(options.display_name) sss.push("display_name", options.display_name);
    if(options.first_name) sss.push("first_name", options.first_name);
    if(options.last_name)  sss.push("last_name", options.last_name);
  }

  var groupids = [];

  return RedisClient.HMSET(
    'usr:'+id,
    'nick', email.substring(0, email.indexOf('@')),
    'email', email,
    'groupNs', '[]'
  )
    .then((b) => {
      if(sss) return RedisClient.HMSET.bind(null, "usr:"+id).apply(null, sss);
    })
    .then(() => {
      return redis_utils.GraphSet(USERID_EMAIL_TABLE, "usr:"+id, email);
    })
    /** Manage invitations to this user **/
    .then(function() {
      return RedisClient.LRANGE('inv:'+email, 0, -1)
        .then(function(_groupids) {
          groupids = _groupids;
          return null;
        });
    })
    .then(function() {
      var argl = groupids.map(function(groupid) {
        return [groupid.substring(4), id];
      });
      return js_utils.promiseLoopApply(Group.connectUserAndGroup, argl);
    })
    .then(function() {
      var argl = groupids.map(function(groupid){
        return [groupid.substring(4), email];
      });
      return js_utils.promiseLoopApply(Group.CancelInvited, argl);
    })
    /*************************************/
    .then(function() {
      return User.cache.loadFromDb(id);
    });
};

/**
 * Completely delete the user corresponding to the email including all groups and documents that user made.
 * !!! This function should not to be used by client !!!
 * @param usr_str {string} - the redis key rep. user to delete; can be user id or form usr:[id]
 * @returns {Promise}
 * TODO: test thoroughly
 * TODO: should delete user from course (active/blocked/instructor)
 * TODO: should delete user's assignments
 */
User.deleteUser = (usr_str) => {

  /**
   * delete the group in redis
   * @param {String} grp_str - of form grp:[groupID_n]; the group to delete
   * @returns {Promise<Number>} - 1 if Group.DeleteGroup() succeeds, 0 otherwise
   */
  const deleteGroup = (grp_str) => {
    util.logger("deleteUser", `deleteGroup grp_str=${grp_str}`);
    let groupID_n = null;
    try {
      groupID_n = grp_str.substring(4);
    } catch(err) {
      util.error("in deleteGroup "+err);
    }

    return RedisClient.HGET(grp_str, "docid")
      .then((docid) => {
        const docID_n = docid.substring(4);
        util.debug("Group.DeleteGroup("+groupID_n+","+docID_n+")");
        return Group.DeleteGroup(groupID_n, docID_n);
        // return true;
      });
  };

  /**
   * Remove the user from the group
   * @param {String} usr_str   - of form usr:[userID_n]; the user to remove
   * @param {String} groupID_n - the group to remove
   * @returns {Promise<Number>} - 1 if Group.RemoveUserFromGroup() succeeds, 0 otherwise
   */
  const removeUser = (usr_str, groupID_n) => {
    let userID_n = null;
    try {
      userID_n = usr_str.substring(4);
    } catch(err) {
      util.error("in removeUser " + err);
    }
    util.debug("Group.RemoveUserFromGroup("+groupID_n+", "+userID_n+")");
    return Group.RemoveUserFromGroup(groupID_n, userID_n);
    //return true;
  };

  /**
   * Delete the group if user created the group, otherwise remove user from the group
   * 1) remove user from all groups made by other people
   * 2) delete group made by user
   * @param {String} usr_str   - of form usr:[userID_n]; user to detach
   * @param {String} groupID_n - group to consider
   * @returns {Promise<Number>} - 1 if successful, 0 otherwise
   */
  const deleteOrRemoveGroup = (usr_str, groupID_n) => {
    const grp_str = "grp:"+groupID_n;
    util.logger("deleteUser", `deleteOrRemoveGroup grp_str=${grp_str}`);
    return RedisClient.HGET(grp_str, "userid_n")
      .then((userid_n) => {
        const usr_of_grp = "usr:"+userid_n;
        //util.debug("usr_str="+usr_str+"; usr_of_grp="+usr_of_grp);
        if (usr_str === usr_of_grp) {
          util.debug("user owns this group");
          return deleteGroup(grp_str);
        } else {
          util.debug("group is owned by someone else");
          return removeUser(usr_str, groupID_n);
        }
      });
  };

  const deleteOrRemoveGroups = (usr_str, groupID_n_arr_str) => {
    util.logger("deleteUser", "delete or remove groups");
    if(groupID_n_arr_str) {
      const groupID_n_arr = JSON.parse(groupID_n_arr_str);
      const promises = groupID_n_arr.map(deleteOrRemoveGroup.bind(null, usr_str));
      return Promise.all(promises);
    } else {
      return null;
    }
  };

  /**
   * removes the group in the document and then delete the document
   * Base this on DeleteDocument function in dbs.js; first delete doc groups, then delete the doc.
   * @param {String} doc_str - has form doc:[docID_n]
   * @returns {Promise<Number>} - 1 if Doc.DeleteDocFromRedis(docID_n) succeeds, 0 otherwise
   */
  const deleteDoc = (doc_str) => {
    util.logger("deleteUser", `deleteDoc doc_str=${doc_str}`);
    let docID_n = null;
    try {
      docID_n = doc_str.substring(4);
    } catch(err) {
      util.error("in deleteDoc "+err);
    }
    return Doc.GetDocGroups(docID_n)
      .then((groups) => {
        const promises = groups.map(deleteGroup);
        return Promise.all(promises);
      })
      .then((bArr) => {
        util.debug("Doc.DeleteDocFromRedis("+docID_n+")");
        return Doc.DeleteDocFromRedis(docID_n);
        //return true;
      });
  };

  /**
   * If the document has a userid_n that corresponds with usr_str (i.e. document is created by user), then delete it
   * @param {String} usr_str - has form usr:[userID_n]
   * @param {String} doc_str - has form doc:[docID_n]
   * @returns {Promise<Number>} - 1 if successful, 0 otherwise
   */
  const deleteDocIfUsers = (usr_str, doc_str) => {
    // util.debug("deleteDocIfUsers " +usr_str+" "+doc_str);
    if(!doc_str) console.log("!doc_str");
    return RedisClient.HGET(doc_str,"userid_n")
      .then((userid_n) => {
        const usr_of_doc = "usr:"+userid_n;
        if(usr_str === usr_of_doc) {
          util.debug("deleting "+doc_str);
          return deleteDoc(doc_str);
        } else {
          return 0;
        }
      });
  };

  /**
   * Delete all the documents user created
   * @param {String} usr_str - has form usr:[userID_n]
   * @returns {Promise.<number[]>} - array of numbers {0,1} for successful or not
   */
  const deleteDocs = (usr_str) => {
    return RedisClient.KEYS("doc:*")
    // checked that RedisClient.KEYS() returns an array
      .then((doc_str_arr) => {
        const promises = doc_str_arr.map(deleteDocIfUsers.bind(null, usr_str));
        return Promise.all(promises);
      });
  };

  /**
   * Delete pilot user plugin
   * @param {string} usr_str - has form usr:[userID_n]
   * @returns {Promise.<number>} - {0,1} for successful or not
   */
  const deletePilot = (usr_str) => {
    return RedisClient.HGET(usr_str, "email")
      .then((email) => {
        if(/@pilot.study$/.test(email)) {
          return RedisClient.DEL("pilot:"+email);
        }
      })
  };

  /**
   * Performs all steps of deleting user given a usr:[userID_n]
   * 1) remove user from all groups; and delete groups created by user
   * 2) remove docs user created
   * 3) delete the user entry pilot:[email]
   * 4) delete user in userid_email_table
   * 5) delete the user in redis

   * @param {String} usr_str - string of form usr:[userID_n]; user to delete
   * @return {Promise}
   *
   * TODO: after creating MyClass...
   * TODO: should delete user from course (active/blocked/instructor)
   * TODO: should delete user's assignments
   */
  if(!/^usr:/.test(usr_str)) usr_str = "usr:"+usr_str;
  return RedisClient.HGET(usr_str, "groupNs")
    // 1) remove user from any groups; and delete groups created by user
    .then(deleteOrRemoveGroups.bind(null, usr_str))
    // 2) remove docs user created
    .then(deleteDocs.bind(null, usr_str))
    // 3) delete the user in redis
    .then(deletePilot.bind(null, usr_str))
    // 4) delete user in userid_email_table
    .then(redis_utils.GraphDel.bind(null, USERID_EMAIL_TABLE, usr_str))
    // 5) delete the user entry pilot:[email]
    .then(() => {
      util.logger("deleteUser", `deleting ${usr_str}`);
      return RedisClient.DEL(usr_str);
    })
    // TODO: should delete user from course (active/blocked/instructor)
    // TODO: should delete user's assignments
    .then((b) => {
      util.logger("deleteUser", `repopulating cache`);
      return User.cache.populate();
    })
    .catch((err) => {
      util.error(err);
    });
};

User.prototype.updateNick = function(id, newnick){
  return RedisClient.HMSET(
    'usr:' + id,
    'nick', newnick
  ).then(
    function(){
      return User.cache.loadFromDb(id);
    }
  );
};

/**
 * @param user
 * @param newEmail
 * @returns {Promise}
 *
 * WARNING: this function is broken
 * TODO: update to use with userid_email_table
 */
User.prototype.syncEmail = function(user, newEmail){
  return new Promise(function(resolve, reject){
    if(user.email === newEmail){
      return resolve(user);
    }
    else{
      return RedisClient.HMSET(
        'usr:' + user.id,
        'email',
        newEmail
      ).then(
        function(){
          return RedisClient.HMSET(
            'email_user_lookup',
            newEmail,
            'usr:'+user.id
          );
        }
      ).then(
        function(){
          return RedisClient.HDEL(
            'email_user_lookup',
            user.email
          );
        }
      ).then(
        function(){
          return User.cache.loadFromDb(user.id);
        }
      ).then(
        function(user){
          resolve(user);
        }
      ).catch(reject);
    }
  });
};

User.prototype.AddGroupToUser = function(userid_n, groupid_n){
  return RedisClient.HGET("usr:"+userid_n, "groupNs")
    // get group of the user
    .then(function(groupNsStr) {
      var groupNsObj = JSON.parse(groupNsStr);
      var idx = groupNsObj.indexOf(groupid_n);
      if(idx < 0) {
        groupNsObj.push(groupid_n);
        return RedisClient.HSET("usr:"+userid_n, "groupNs", JSON.stringify(groupNsObj));
      } else {
        throw 'this user is already a member of the group';
      }
    }
  );
};

User.prototype.RemoveGroupFromUser = function(userid_n, groupid_n){
  return RedisClient.HGET("usr:"+userid_n, "groupNs")
    .then(function(groupNsStr) {
        var groupNsObj = JSON.parse(groupNsStr);
        var i = groupNsObj.indexOf(groupid_n);
        if(i < 0){
          throw 'the user is not a member of the group. please refresh the page.';
        }
        groupNsObj.splice(i, 1);
        return RedisClient.HSET("usr:"+userid_n, "groupNs", JSON.stringify(groupNsObj));
      }
    );
};

User.prototype.GetGroupNs = function(userid_n, cb){
  return RedisClient.HGET("usr:"+userid_n, "groupNs")
    .then(function(groupNsStr) {
      return JSON.parse(groupNsStr);
    });
};

/*
 * Group
 */
const Group = (function(manager, name, creationDate) {

  /*
   userid
   docid
   creationTime
   name
   users {"invited":[noname@gmail.com], "participating":[user:1902839014]}
   */
  var pub_grp = {};

  pub_grp.CreateNewGroup = function(userid_n, docid, creationTime){
    return new Promise(function(resolve, reject){
      var groupid = "grp:"+userid_n+"_"+creationTime;
      redisClient.EXISTS(groupid, function(err, resp){
        if(err){reject(err);}
        else if(resp === 1) {reject('grp already exist');}
        else{
          redisClient.HMSET(
            groupid,
            'userid_n', userid_n,
            'docid', docid,
            'creationTime', creationTime,
            'name', 'Group created at ' + js_utils.FormatDateTimeMilisec(creationTime),
            'users', '{"invited":[],"participating":[]}',
            function(err, resp) {
              if(err) { reject(err); }
              else { resolve(groupid); }
            }
          );
        }
      });
    });
  };

  pub_grp.GetById = function(groupid, cb){
    redisClient.HGETALL(groupid, function(err, groupObj){
      if(err !== null || groupObj === null){cb(err);}
      else{
        groupObj.id = groupid;
        groupObj.users = JSON.parse(groupObj.users);
        cb(err, groupObj);
      }
    });
  };

  pub_grp.GetGroupObj_Promise = function(groupid){
    return RedisClient.HGETALL(groupid).then(
      function(groupObj){
        groupObj.id = groupid;
        groupObj.users = JSON.parse(groupObj.users);
        return groupObj;
      }
    );
  };

  /**
   * get all groups in redis server array of JS objects with group information
   * grps - Array<grp>
   * grp is of form { users, docid, userid_n, creationTime, name }
   * users is of form { invited, participating }
   * invited, participating are ids of users
   * @return grps
   */
  pub_grp.getAll = function(){
    return RedisClient.KEYS('grp:*').then(
      function(keys){
        return Promise.all(
          keys.map(function(key){
            return RedisClient.HGETALL(key);
          })
        ).then(
          function(grps){
            for(var i = 0, l = grps.length; i < l; ++i){
              grps[i].id = keys[i];
            }
            return grps;
          }
        );
      }
    );
  };

  /**
   * Invite a user to a group by user's email. If user already exists in RichReview then add user to the group, otherwise create an invite.
   * @param {string} groupid_n - group to invite
   * @param {string} email
   * @returns {Promise}
   *
   * NOTE: when using User.findByEmail(), we prioritize by user AUTH_TYPE
   * For example, if a @gmail.com email is associated with a UBC_CWL and Google account, then we only invite the user of the UBC_CWL account.
   * TODO: now using GraphGet() and USERID_EMAIL_TABLE; test method
   */
  pub_grp.InviteUser = function(groupid_n, email){
    const userExists = (user) => {
      return pub_grp.connectUserAndGroup(groupid_n, user.id.substring(4));
    };
    const userDoesNotExist = (user) => {
      return pub_grp.AddEmailToInvited(groupid_n, email)
        .then(() => {
          util.debug(`creating invitation for ${email}`);
          return RedisClient.RPUSH(`inv:${email}`, `grp:${groupid_n}`);
        });
    };
    util.debug(`inviting a user of email ${email} to group ${groupid_n}`);
    return User.findByEmail(email)
      .then((user) => {
        if(user) {
          return userExists(user);
        } else {
          return userDoesNotExist();
        }
      });
    /*
    // TODO: email_user_lookup is deprecated. Test function then delete
    return RedisClient.HEXISTS('email_user_lookup', email)
      .then((is_exist) => {
        // when the user already signed up and can be found on the system
        if(is_exist) {
          return RedisClient.HGET('email_user_lookup', email)
            .then(function(userid) {
              return pub_grp.connectUserAndGroup(groupid_n, userid.substring(4));
            });
        // when the user is not on the system yet
        } else {
          return pub_grp.AddEmailToInvited(groupid_n, email)
            .then(() => {
              util.debug("adding " + email + " to invited");
              return RedisClient.RPUSH('inv:'+email, 'grp:'+groupid_n);
            });
        }
      });*/
  };

  pub_grp.connectUserAndGroup = function(groupid_n, userid_n){
    return pub_grp.AddUserToParticipating(groupid_n, userid_n)
      .then(function() {
        return User.prototype.AddGroupToUser(userid_n, groupid_n);
      });
  };

  pub_grp.connectGroupAndMultipleUsers = function(groupid_n, l_userid_n){
    return (function loop(i){
      if(i < l_userid_n.length) {
        return pub_grp.AddUserToParticipating(groupid_n, l_userid_n[i]).then(
          function () {
            return User.prototype.AddGroupToUser(l_userid_n[i], groupid_n);
          }
        ).then(
          function () {
            return loop(i + 1);
          }
        );
      }
      else{
        return Promise.resolve();
      }
    })(0);
  };

  pub_grp.GetDocIdByGroupId = function(groupid_n){
    return RedisClient.HGET("grp:"+groupid_n, "docid");
  };

  pub_grp.GetDocObjByGroupId = function(groupid_n){
    return RedisClient.HGET("grp:"+groupid_n, "docid")
      .then(RedisClient.HGETALL);
  };

  pub_grp.PopulateParticipantObjs = function(groupObj){
    return new Promise(function (resolve, reject) {
      var argl = [];
      for(var i = 0; i < groupObj.users.participating.length; ++i){
        argl.push(["usr:"+groupObj.users.participating[i], "nick"]);
      }
      js_utils.promiseLoopApply(RedisClient.HGET, argl).then(resolve).catch(reject);
    }).then(
      function(nicknames){
        for(var i = 0; i < nicknames.length; ++i){
          groupObj.users.participating[i] = {
            'id':groupObj.users.participating[i],
            "nick":nicknames[i]
          };
        }
        return groupObj;
      }
    );
  };

  /**
   * delete the group
   *
   * this method will detach mutual reference between user and group for deleted group, and remove group from inv:[email] object in redis server. It will the delete grp:[groupid_n] from doc:[docid_n].
   * @param groupid_n - the id of the group to delete
   * @param docid_n   - the id of the document containing the group
   */
  pub_grp.DeleteGroup = function(groupid_n, docid_n) {

    /**
     * remove user from group and group from user
     */
    function detachUserAndGroup(userid_n) {
      return User.prototype.RemoveGroupFromUser(userid_n, groupid_n)
        .then(function() {
          return Group.RemoveUserFromGroup(groupid_n, userid_n);
        });
    }

    /**
     * remove group from inv:[email] object
     */
    function removeGroupFromInvitee(email) {
      util.debug("LREM inv:"+ email + " 0 grp:" + groupid_n);
      return RedisClient.LREM("inv:"+email, 0, "grp:"+groupid_n);
    }

    util.debug("starting method Group.DeleteGroup("+ groupid_n + ", " + docid_n+")");
    util.debug("starting promiseToRemoveGroupFromInvitee");
    const promiseToRemoveGroupFromInvitee = Group.GetUsersFromGroup(groupid_n)
      .then(function(users) {
        return js_utils.promiseLoopApply(
          removeGroupFromInvitee,
          users.invited.map(function(email) {
              return [email];
            }
          )
        );
      });

    util.debug("starting promiseToDetachUserAndGroup");
    const promiseToDetachUserAndGroup = Group.GetUsersFromGroup(groupid_n)
      .then(function(users) {
        return js_utils.promiseLoopApply(
          detachUserAndGroup,
          users.participating.map(function(userid_n) {
              return [userid_n];
            }
          )
        );
      });

    return Promise.all([
      promiseToRemoveGroupFromInvitee,
      promiseToDetachUserAndGroup
    ]).then(function(bArry) {
      util.debug("finished removing from invitee and detach");
      return Group.DeleteGroupFromDoc(groupid_n, docid_n);
    });
  }; // end DeleteGroup

  pub_grp.DeleteGroupFromDoc = function(groupid_n, docid_n){
    return RedisClient.HGET("doc:"+docid_n, 'groups')
      // get group list of doc
      .then(function(groupsStr) {
        var groupsObj = JSON.parse(groupsStr);
        var idx = groupsObj.indexOf("grp:"+groupid_n);
        if (idx < 0) {
          var err = new Error("The group does not exist in the document's group list.");
          err.push_msg = true;
          throw err;
        }
        else {
          groupsObj.splice(idx, 1);
          return RedisClient.HSET("doc:"+docid_n, "groups", JSON.stringify(groupsObj));  // save modified group list of doc
        }
      }
    ).then(
      function() {
        return RedisClient.DEL("grp:"+groupid_n);  // delete group
      }
    );
  };

  pub_grp.Delete = function(userid_n, docid, groupid, cb){
    redisClient.HGET(docid, 'groups', function(err, groupsStr) {
      var groupsObj = JSON.parse(groupsStr);
      var index = groupsObj.indexOf(groupid);
      if (index < 0) {
        cb("group not exist in doc",null);
      } else {
        groupsObj.splice(index, 1);
        redisClient.HSET(docid, "groups", JSON.stringify(groupsObj), function(err) {
          if(err){ cb(err); }
          else {
            redisClient.DEL(groupid, function(err, resp) {
              cb(err, resp);
            });
          }
        });
      }
    });
  };

  pub_grp.Rename = function(group_id, new_name){
    return RedisClient.HSET(group_id, 'name', new_name);
  };

  pub_grp.SetUsersByObj = function(groupid, usersobj, cb){
    redisClient.HSET(groupid, "users", JSON.stringify(usersobj), function(err, resp){
      cb(err, resp);
    });
  };

  pub_grp.GetNumUsers = function(groupid, cb){
    redisClient.HGET(groupid, "users", function(err, usersStr){
      if(err){
        cb(err, null);
      }
      else if(usersStr === null){
        cb(null, 0);
      }
      else{
        cb(err, JSON.parse(usersStr).participating.length);
      }
    });
  };

  pub_grp.GetUsersFromGroup = function(groupid_n){
    return RedisClient.HGET("grp:"+groupid_n, "users").then(
      function(usersStr){
        return JSON.parse(usersStr);
      }
    );
  };

  pub_grp.AddEmailToInvited = function(groupid_n, email){
    return RedisClient.HGET('grp:' + groupid_n, 'users')
      .then(function(usersStr) {
        let users = JSON.parse(usersStr);
        if( users.invited.indexOf(email) === -1 ){
          users.invited.push(email);
          return RedisClient.HSET('grp:' + groupid_n, 'users', JSON.stringify(users));
        }
        else { throw `user of ${email} is already in the invitation list`; }
      });
  };

  pub_grp.CancelInvited = function(groupid_n, email){
    return RedisClient.HGET('grp:' + groupid_n, 'users').then(
      function(usersStr){
        var users = JSON.parse(usersStr);
        var i = users.invited.indexOf(email);
        if( i !== -1 ){
          users.invited.splice(i, 1);
          return RedisClient.HSET('grp:' + groupid_n, 'users', JSON.stringify(users));
        }
        else{
          return null;
        }
      }
    ).then(
      function(){
        return RedisClient.LREM('inv:'+email, 1,'grp:' + groupid_n);
      }
    );
  };

  pub_grp.AddUserToParticipating = function(groupid_n, userid_n){
    return RedisClient.HGET("grp:"+groupid_n, "users").then(
      function(usersStr) {
        var users = JSON.parse(usersStr);
        if(users === null){throw 'invalid group id';}

        var i = users.participating.indexOf(userid_n);
        if(users.participating.length === 5){
          throw 'there are already maximum number (5) of users in this group.';
        }
        else if(i === -1){
          users.participating.push(userid_n);
          return RedisClient.HSET("grp:"+groupid_n, 'users', JSON.stringify(users));
        }
        return null;
      }
    );
  };

  pub_grp.RemoveUserFromGroup = function(groupid_n, userid_n){
    return RedisClient.HGET("grp:"+groupid_n, "users").then( // get group's user list
      function(usersStr){
        var usersObj = JSON.parse(usersStr);
        var i = usersObj.participating.indexOf(userid_n);
        if(i < 0){
          throw 'no such group found in the group';
        }
        usersObj.participating.splice(i, 1);
        return RedisClient.HSET("grp:"+groupid_n, 'users', JSON.stringify(usersObj)); // save to group's user list
      }
    );
  };

  pub_grp.GetViewerUrl = function(groupid_n, cb){
    redisClient.HGET("grp:"+groupid_n, 'docid', function(err, docid){
      if(err){cb(err);}
      else{
        redisClient.HGET(docid, "pdfid", function(err, pdfid){
          if(err){cb(err);}
          else{
            var url = "viewer?access_code="+pdfid+"&docid="+docid.substring(4)+"&groupid="+groupid_n;
            cb(null, url);
          }
        });
      }
    });
  };

  return pub_grp;
})();

/*
 * Doc
 */
var Doc = (function() {

  var pub_doc = {};

  // redis doc hash structure
  // userid, creationDate, pdfid, name, groups(list)

  /**
   *
   *
   * getting error ode_redis: Deprecated: The HMSET command contains a "undefined" argument.
   This is converted to a "undefined" string now and will return an error from v.3.0 on.
   Please handle this in your code to make sure everything works as you intended it to.
   * TODO: change crs_submission variable
   */
  pub_doc.CreateNew = function(userid_n, creationTime, pdfid, crs_submission){
    var docid = "doc:"+userid_n+"_"+creationTime;
    return RedisClient.EXISTS(docid).then(
      function(isexist){
        if(isexist){
          var err = new Error("Doc Already Exist: " + docid);
          err.push_msg = true;
          throw err;
        }
        else{
          return null;
        }
      }
    ).then(
      function(){
        crs_submission = crs_submission === 'undefined' ? null : crs_submission;
        return RedisClient.HMSET(
          docid,
          'userid_n', userid_n,
          'creationTime', creationTime,
          'pdfid', pdfid,
          'name', 'Document uploaded at ' + js_utils.FormatDateTimeMilisec(creationTime),
          'groups', '[]',
          'crs_submission', JSON.stringify(crs_submission)
        );
      }
    ).then(
      function(){
        return docid;
      }
    );
  };

  pub_doc.GetDocById_Promise = function(docid){
    return RedisClient.HGETALL(docid).then(
      function(doc_obj){
        doc_obj.id = docid;
        doc_obj.creationTimeStr = js_utils.FormatDateTime(doc_obj.creationTime);
        doc_obj.groups = JSON.parse(doc_obj.groups);
        return doc_obj;
      }
    );
  };

  pub_doc.GetDocIdsByUser = function(userid_n){
    return RedisClient.KEYS('doc:'+userid_n+'_*');
  };

  pub_doc.GetDocByUser_Promise = function(userid_n){
    return RedisClient.KEYS('doc:'+userid_n+'_*').then(
      function(docids){
        return js_utils.promiseLoopApply(pub_doc.GetDocById_Promise, docids.map(function(docid){return [docid];})).then(
          function(doc_objs){
            return doc_objs;
          }
        );
      }
    );
  };

  pub_doc.AddNewGroup = function(userid_n, docid){
    var groupsObj;
    var groupid;

    return RedisClient.HGET(docid, "groups").then(
      function(groupsStr){
        groupsObj = JSON.parse(groupsStr);
        return Group.CreateNewGroup(
          userid_n,
          docid,
          new Date().getTime()
        );
      }
    ).then(
      function(_groupid){
        groupid = _groupid;
        groupsObj.push(groupid);
        return RedisClient.HSET(docid, "groups", JSON.stringify(groupsObj));
      }
    ).then(function() {
      return Group.connectUserAndGroup(groupid.substring(4), userid_n);
    }).then(
      function(){
        return groupid;
      }
    );
  };

  pub_doc.GetDocGroups = function(docid_n){
    return RedisClient.HGET("doc:"+docid_n, "groups").then(
      function(groupsStr){
        // return groupsObj = JSON.parse(groupsStr);
        return JSON.parse(groupsStr);
      }
    );
  };

  pub_doc.Rename = function(doc_id, new_name){
    return RedisClient.HSET(doc_id, 'name', new_name);
  };

  pub_doc.DeleteDocFromRedis = function(docid_n){
    return RedisClient.DEL("doc:"+docid_n);
  };

  return pub_doc;
}());

var Cmd = (function(){
    var pub_cmd = {};

    pub_cmd.AppendCmd = function(group_id_n, cmdStr, cb){
        redisClient.RPUSH("cmd:"+group_id_n, cmdStr, function(err){
            cb(err);
        });
    };
    pub_cmd.GetCmds = function(groupid_n, cmds_downloaded_n){
        return RedisClient.LRANGE("cmd:"+groupid_n, cmds_downloaded_n, -1);
    };

    return pub_cmd;
})();

var Log = function(group_n, logStr, cb){
    redisClient.RPUSH("log:"+group_n, logStr, function(err){
        cb(err);
    });
};

var Logs = function(group_n, logs){
    var promises = logs.map(function(log){
        return RedisClient.RPUSH("log:"+group_n, log);
    });
    return Promise.all(promises);
};

/* data sanity check-up*/
const dataSanityCheckup = function() {

    (function checkInvited(){
        var user_hash = {};
        var users = null;
        var group_hash = {};
        var groups = null;
        var inv_hash = {};
        var email_user_lookup = null;
        Promise.resolve().then(
            function(){
                return User.prototype.getSignedUp().then(
                    function(_users) {
                        users = _users;
                        users.forEach(function(user){
                            user.groupNs = JSON.parse(user.groupNs);
                            user_hash[user.id] = user;
                        });
                        return null;
                    }
                );
            }
        ).then(
            function(){
                return Group.getAll().then(
                    function(_groups){
                        groups = _groups;
                        groups.forEach(function(group){
                            group.users = JSON.parse(group.users);
                            group_hash[group.id] = group;
                        });
                        return null;
                    }
                );
            }
        ).then(
            // populate inv_hash by setting each inv:[email] to grp:
            function() {
                return RedisClient.KEYS('inv:*').then(
                    function(_invs){
                        // get list of groups to each inv:[email] i.e. the groups this email is invited to
                        var promises =_invs.map(function(inv){
                            return RedisClient.LRANGE(inv, 0, -1);
                        });

                        // Promise.all() fulfills a list of lists
                        return Promise.all(promises).then(
                            function(_inv_groups){
                                for(var i = 0, l = _invs.length; i < l; ++i){
                                    inv_hash[_invs[i]] = _inv_groups[i];
                                }
                            }
                        );
                    }
                );
            }
        ).then(
            function(){
                return RedisClient.HGETALL('email_user_lookup').then(
                    function(_email_user_lookup){
                        email_user_lookup = _email_user_lookup;
                    }
                );
            }
        ).then(
            function(){
                console.log('# usr:', users.length);
                console.log('# email lookups:', Object.keys(email_user_lookup).length);

                users.forEach(
                    function(usr){
                        if(!email_user_lookup.hasOwnProperty(usr.email)){
                            console.log('# dangled user: ' + usr.id, usr.email);
                        }
                        else if( email_user_lookup[usr.email] !== usr.id){
                            console.log('# incongruent user: ' + usr.id, usr.email);
                        }
                    }
                );

                groups.forEach(function(group){
                    group.users.participating.forEach(
                        function(userid_n){
                            if(user_hash.hasOwnProperty('usr:' + userid_n)) {
                                var i = user_hash['usr:' + userid_n].groupNs.indexOf(group.id.substring(4));
                                if (i === -1) {
                                    console.log('# incongruent group-user assignment: ' + group.id, userid_n);
                                }
                            } else {
                                console.log('# incongruent group-user assignment: ' + group.id, userid_n);
                            }
                        }
                    );
                });

                users.forEach(function(user){
                    user.groupNs.forEach(
                        function(group){
                            if(group_hash.hasOwnProperty('grp:'+group)){
                                var i = group_hash['grp:'+group].users.participating.indexOf(user.id.substring(4));
                                if(i === -1) {
                                    console.log('# incongruent user-group assignment: ' + group.id);
                                }
                            }
                            else{
                                console.log('# incongruent user-group assignment: ' + group.id);
                            }
                        }
                    );
                });

                groups.forEach(function(group){
                    group.users.invited.forEach(function(email){
                        if(!inv_hash.hasOwnProperty('inv:'+email) || inv_hash['inv:'+email].indexOf(group.id) === -1){
                            console.log('# dangled invitation in group invited list: ' + email + ' in ' + group.id);
                        }
                    });
                });

                Object.keys(inv_hash).forEach(
                    function(email){
                        var groups = inv_hash[email];
                        groups.forEach(function(group){
                            if(!group_hash.hasOwnProperty(group) || group_hash[group].users.invited.indexOf(email.substring(4)) === -1){
                                if(!group_hash.hasOwnProperty(group)) { 
                                    console.log("ERR: group does not exist!"); 
                                } else { 
                                    console.log("ERR: group does not contain the invitation!"); 
                                }
                                console.log('# dangled invitation in inv:<email>: ' + group + ' in ' + email);
                            }
                        });
                    }
                );
            }
        ).catch(
            function(err){
                console.log(err.stack);
            }
        );
    }());

};

// dataSanityCheckup();

exports.User = User;
exports.Doc = Doc;
exports.Group = Group;
exports.Cmd = Cmd;
exports.Log = Log;
exports.Logs = Logs;
exports.redisClient = redisClient;