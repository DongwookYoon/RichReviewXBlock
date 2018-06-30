/**
 * R2D
 *
 * Created by Dongwook on 1/31/2015.
 */

// import npm modules
const Promise = require("promise"); // jshint ignore:line

// import libraries
const js_utils = require('./js_utils.js');
const redisClient = require('./redis_client').redisClient;
const RedisClient = require('./redis_client').RedisClient;
const util = require('../util');

const Doc = require('./Doc').Doc;
const Group = require('./Group').Group;
const User = require('./User').User;

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
                        )
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
                                if (i === -1)
                                    console.log('# incongruent group-user assignment: ' + group.id, userid_n);
                            }
                            else{
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
                                    console.log('# incongruent user-group assignment: ' + group.id, userid_n);
                                }
                            }
                            else{
                                console.log('# incongruent user-group assignment: ' + group.id, userid_n);
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
        )
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