/**
 * Group
 *
 * The file for the Group class
 *
 * imported from r2d.js
 * created by Colin
 */

// import npm modules
const Promise = require("promise"); // jshint ignore:line

// import libraries
const js_utils = require('./js_utils.js');
const redisClient = require('./redis_client').redisClient;
const RedisClient = require('./redis_client').RedisClient;
const util = require('../util');

const User = require('./User').User;

/*
 * Group
 */
var Group = (function(manager, name, creationDate) {

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
            function(err, resp){
              if(err){if(err){reject(err);}}
              else{
                resolve(groupid);
              }
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

  pub_grp.InviteUser = function(groupid_n, email){
    util.debug("inviting " + email + " to " + groupid_n);
    return RedisClient.HEXISTS('email_user_lookup', email).then(
      function(is_exist){
        if(is_exist){ // when the user already signed up and can be found on the system
          var userid_n = '';
          return RedisClient.HGET('email_user_lookup', email).then(
            function(userid){
              return pub_grp.connectUserAndGroup(groupid_n, userid.substring(4));
            }
          );
        }
        else{ // when the user is not on the system yet
          return pub_grp.AddEmailToInvited(groupid_n, email).then(
            function(){
              util.debug("adding " + email + " to invited");
              return RedisClient.RPUSH('inv:'+email, 'grp:'+groupid_n);
            }
          );
        }
      }
    );
  };

  pub_grp.connectUserAndGroup = function(groupid_n, userid_n){
    return pub_grp.AddUserToParticipating(groupid_n, userid_n).then(
      function(){
        return User.prototype.AddGroupToUser(userid_n, groupid_n);
      }
    );
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
    return RedisClient.HGET("grp:"+groupid_n, "docid").then(
      RedisClient.HGETALL
    );
  };

  pub_grp.PopulateParticipantObjs = function(groupObj){
    return new Promise(function (resolve, reject) {
      var argl = [];
      for(var i = 0; i < groupObj.users.participating.length; ++i){
        argl.push(["usr:"+groupObj.users.participating[i], "nick"]);
      }
      js_utils.PromiseLoop(RedisClient.HGET, argl).then(resolve).catch(reject);
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
        return js_utils.PromiseLoop(
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
        return js_utils.PromiseLoop(
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
    return RedisClient.HGET("doc:"+docid_n, 'groups').then( // get group list of doc
      function(groupsStr) {
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
    redisClient.HGET(docid, 'groups', function(err, groupsStr){
      var groupsObj = JSON.parse(groupsStr);
      var index = groupsObj.indexOf(groupid);
      if (index < 0) {
        cb("group not exist in doc",null);
      }
      else{
        groupsObj.splice(index, 1);
        redisClient.HSET(docid, "groups", JSON.stringify(groupsObj), function(err){
          if(err){cb(err);}
          else{
            redisClient.DEL(groupid, function(err, resp){
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
    return RedisClient.HGET('grp:' + groupid_n, 'users').then(
      function(usersStr){
        var users = JSON.parse(usersStr);
        if( users.invited.indexOf(email) === -1 ){
          users.invited.push(email);
          return RedisClient.HSET('grp:' + groupid_n, 'users', JSON.stringify(users));
        }
        else{
          throw 'that user is already in the invitation list.';
        }
      }
    );
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

exports.Group = Group;