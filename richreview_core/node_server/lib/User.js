/**
 * User
 *
 * The file for the User class
 *
 * imported from r2d.js
 * created by Colin
 */

// import npm modules
const Promise = require("promise"); // jshint ignore:line

// import libraries
const js_utils = require('./js_utils.js');
const RedisClient = require('./redis_client').RedisClient;
const util = require('../util');

const Group = require('./Group').Group;
const Doc = require('./Doc').Doc;

/*
 * User
 */

/**
 * User ( `usr:<userid>` )
 * userid is a sha1 hash with salt from netid
 *
 * @type    hash / class
 * @member id       {string} the userid (sha1 hash with salt from netid)
 * @member nick     {string} - nickname
 * @member email    {string} required - email of user
 * @member groupNs  {string|Array<string>} required - array of groupid user is in
 *
 * UBC study has additional fields
 * @member password_hash {string} - made from irreversible sha1 hash with salt from netid
 * @member salt          {string} - random generated string for password salt
 * @member is_admin      {boolean} - if admin then can access experimental/super functionality (delete users, view password hashes, etc); also affects routing.
 * @member sid           {string} optional - the student id of user
 * @member first_name    {string} optional - the first name of user
 * @member last_name     {string} optional - the last name of user
 *
 * userid is also added to email_user_lookup as a hash field
 */
const User = function(id, nickname, email,
              /** new fields **/
              password_hash, salt, is_admin, sid, first_name, last_name
              /****************/) {
  this.id = id;
  this.nick = nickname;
  this.email = email;
  if(password_hash) {
    this.password_hash = password_hash;
    this.salt          = salt;
    this.is_admin      = is_admin;
    this.sid           = sid;
    this.first_name    = first_name;
    this.last_name     = last_name;
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
 */

/**
 * get an array of all the users that signed up in the redis server
 * usrs is Array<usr>
 * usr is of form { email, groupNs, nick, id }
 * return usrs
 */
User.prototype.getSignedUp = function(){
  return RedisClient.KEYS('usr:*').then(
    function(keys){
      return Promise.all(
        keys.map(function(key){
          return RedisClient.HGETALL(key);
        })
      ).then(
        function(usrs){
          for(var i = 0, l = usrs.length; i < l; ++i){
            usrs[i].id = keys[i];
          }
          return usrs;
        }
      );
    }
  );
};

/**
 * the cache in the User. Say if we had `var sally = new User(...)` then `sally.cache.get(some_id)` gives us Promise<User> corr to some_id
 *
 * @function populate
 * @function loadFromDb
 * @function get
 */
User.prototype.cache = (function(){
  let pub = {};

  let cache = {};

  /**
   * create an array of User from the users in the redis server
   * @return Array<User>
   */
  pub.populate = function() {
    return RedisClient.KEYS("usr:*").then(
      function(userids){
        return Promise.all(
          userids.map(function(userid) {
            return pub.loadFromDb(userid.substring(4));
          })
        );
      }
    ).then(
      (users) => {
        util.logger('ConellID', 'users populated: ' + Object.keys(cache).length + ' users');
        return users;
      }
    ).catch(
      function(err){
        util.error(err);
      }
    );
  };

  /**
   * create a User from redis server's user with the same id, and save it in the cache as value with id as the key
   * @arg    id - the user's id on redis
   * @return User
   */
  pub.loadFromDb = function(id) {
    return RedisClient.HGETALL("usr:"+id)
      .then(function(result) {
        let new_user = null;
        if (result.password_hash) {
          new_user = new User(
            id,
            result.nick,
            result.email,
            result.password_hash,
            result.salt,
            result.is_admin,
            result.sid,
            result.first_name,
            result.last_name
          );
        } else {
          new_user = new User(
            id,
            result.nick,
            result.email
          );
        }
        cache[id] = new_user;
        return new_user;
      }
    );
  };

  /**
   * return a promise to a User in the cache
   * @arg    id
   * @return Promise<User>
   */
  pub.get = function(id){
    return new Promise(function(resolve, reject) {
      if(cache.hasOwnProperty(id)){
        resolve(cache[id]);
      }
      else{
        reject('the user with id:' + id + ' does not exist.');
      }
    });
  };

  pub.populate();

  return pub;
}());

User.prototype.isExist = function(id){
  return RedisClient.EXISTS('usr:'+id);
};

User.prototype.findById = function(id){
  return User.prototype.cache.get(id);
};

/**
 * Get a promise to the User object from given email
 * @param  email  - string of email
 * @return {User} - the user that corr. to the email
 */
User.prototype.findByEmail = function(email){
  if(js_utils.validateEmail(email)){
    return RedisClient.HGET('email_user_lookup', email)
      .then((id) => {
          if(id) {
            return User.prototype.cache.get(id.substring(4));
          } else {
            return Promise.resolve(null);
          }
        }
      );
  } else {
    return Promise.resolve(null);
  }
};

/**
 * Creates a new user in redis and caches user to User.prototype.cache
 * Additionally it consumes invites to add new user to groups it is invited to
 *
 * TODO: should prevent create() from creating user if user already exists(?)
 *
 * @param id
 * @param email
 * @param password_hash
 * @param salt            // TODO: enforce
 * @param is_admin
 * @param sid
 * @param first_name
 * @param last_name
 * @return {Promise<User>}
 */
User.prototype.create = function(id, email,
  /** new fields **/
  password_hash, salt, is_admin, sid, first_name, last_name
  /****************/) {

  var groupids = [];

  return RedisClient.HMSET(
    'usr:'+id,
    'nick', email.substring(0, email.indexOf('@')),
    'email', email,
    'groupNs', '[]'
  )
    .then((b) => {
      if(!password_hash) {
        util.logger("USER CREATE", "is not UBC study");
        return null;
      } // else
      util.logger("USER CREATE", "is UBC study; setting password, etc");
      return RedisClient.HMSET(
        'usr:'+id,
        'password_hash', password_hash,
        'salt',          salt,
        'is_admin',      is_admin,
        'sid',           sid,
        'first_name',    first_name,
        'last_name',     last_name
      );
    })
    .then(function() {
      return RedisClient.HMSET(
        'email_user_lookup',
        email,
        'usr:'+id
      );
    })
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
      return js_utils.PromiseLoop(Group.connectUserAndGroup, argl);
    })
    .then(function(){
      var argl = groupids.map(function(groupid){
          return [groupid.substring(4), email];
        });
      return js_utils.PromiseLoop(Group.CancelInvited, argl);
    })
    .then(function(){
      return User.prototype.cache.loadFromDb(id);
    });
};

/**
 * Completely delete the user corresponding to the email including all groups and documents that user made.
 * !!! This function should not to be used by client !!!
 * @param email {string} - the email of user to delete
 *
 * TODO: test thoroughly
 * TODO: should delete user from course (active/blocked/instructor)
 * TODO: should delete user's assignments
 * TODO: should remove user from cache
 */
User.prototype.deleteUserByEmail = (email) => {

  /**
   * delete the group in redis
   * @param {String} grp_str - of form grp:[groupID_n]; the group to delete
   * @returns {Promise<Number>} - 1 if Group.DeleteGroup() succeeds, 0 otherwise
   */
  const deleteGroup = (grp_str) => {
    util.debug("in deleteGroup "+grp_str);
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

  /**
   * removes the group in the document and then delete the document
   * Base this on DeleteDocument function in dbs.js; first delete doc groups, then delete the doc.
   * @param {String} doc_str - has form doc:[docID_n]
   * @returns {Promise<Number>} - 1 if Doc.DeleteDocFromRedis(docID_n) succeeds, 0 otherwise
   */
  const deleteDoc = (doc_str) => {
    util.debug("in deleteDoc "+doc_str);
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
   * @returns {Promise<Array<Number>>} - array of numbers {0,1} for successful or not
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
   * Performs all steps of deleting user given a usr:[userID_n]
   * 1) remove user from all groups; and delete groups created by user
   * 2) remove docs user created
   * 3) delete the user in redis
   * 4) delete the user in email_user_lookup
   * 5) delete the user in pilot_study_lookup
   * 6) delete the user entry pilot:[email]
   * @param {String} usr_str - string of form usr:[userID_n]; user to delete
   * @return {Promise<Number>} - 1 if RedisClient.DEL() succeeds, 0 otherwise
   *
   * TODO: should delete user from course (active/blocked/instructor)
   * TODO: should delete user's assignments
   */
  const deleteUser = (usr_str) => {
    return RedisClient.HGET(usr_str, "groupNs")
      .then((groupID_n_arr_str) => {
        // 1) remove user from any groups; and delete groups created by user
        const groupID_n_arr = JSON.parse(groupID_n_arr_str);
        const promises = groupID_n_arr.map(deleteOrRemoveGroup.bind(null, usr_str));
        return Promise.all(promises);
      })
      .then((bArr) => {
        // 2) remove docs user created
        return deleteDocs(usr_str);
      })
      .then((bArr) => {
        // 3) delete the user in redis
        util.debug("deleting user in redis");
        return RedisClient.DEL(usr_str);
        //return true;
      })
      .then((a) => {
        // 4) delete the user in email_user_lookup
        util.debug("deleting entry in email_user_lookup");
        return RedisClient.HDEL('email_user_lookup', email);
        //return true;
      })
      .then((a) => {
        // 5) delete the user in pilot_study_lookup
        util.debug("deleting entry in pilot_study_lookup");
        return RedisClient.HDEL('pilot_study_lookup', email);
        //return true;
      })
      .then((a) => {
        // 6) delete the user entry pilot:[email]
        util.debug("calling DEL pilot:"+email);
        return RedisClient.DEL("pilot:"+email);
        //return true;
      })
      // TODO: should delete user from course (active/blocked/instructor)
      // TODO: should delete user's assignments
      .catch((err) => {
        util.error(err);
      });
  };

  return RedisClient.HGET('email_user_lookup', email)
    .then((usr_str) => {
      util.debug("in User.prototype.deleteByEmail");
      util.debug(usr_str);
      if(usr_str) {
        return deleteUser(usr_str);
      } else {
        throw "No user has this email";
      }
    })
    .catch(function(err) {
      util.error(err);
    });
};

User.prototype.updateNick = function(id, newnick){
  return RedisClient.HMSET(
    'usr:' + id,
    'nick', newnick
  ).then(
    function(){
      return User.prototype.cache.loadFromDb(id);
    }
  );
};

// TODO: fix this for pilot study
User.prototype.syncEmail = function(user, newemail){
  return new Promise(function(resolve, reject){
    if(user.email === newemail){
      return resolve(user);
    }
    else{
      return RedisClient.HMSET(
        'usr:' + user.id,
        'email',
        newemail
      ).then(
        function(){
          return RedisClient.HMSET(
            'email_user_lookup',
            newemail,
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
          return User.prototype.cache.loadFromDb(user.id);
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
  return RedisClient.HGET("usr:"+userid_n, "groupNs").then( // get group of the user
    function(groupNsStr){
      var groupNsObj = JSON.parse(groupNsStr);
      var idx = groupNsObj.indexOf(groupid_n);
      if(idx < 0){
        groupNsObj.push(groupid_n);
        return RedisClient.HSET("usr:"+userid_n, "groupNs", JSON.stringify(groupNsObj));
      }
      else{
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
  return RedisClient.HGET("usr:"+userid_n, "groupNs").then(
    function(groupNsStr){
      return JSON.parse(groupNsStr);
    }
  );
};

exports.User = User;