/**
 * Created by Dongwook on 1/31/2015.
 */

/*
* R2D
*/

var redis = require('redis');
var redisClient = redis.createClient(6379, "richreview.net");
var js_utils = require('../lib/js_utils.js');
var Promise = require("promise");
redisClient.auth('rich.reviewer@cornell');
redisClient.on('error', function(err) {
    // "Redis connection to <hostname>:6379 failed - read ETIMEDOUT";
    console.log('Redis error: ' + err);
});


/*
<<<<<<< HEAD
 * Ping regularly in order to maintain the connection
 */
function PingRedisServer()
{
    redisClient.ping(redis.print);
    setTimeout(PingRedisServer, 3*60*1000);
}
PingRedisServer();


/*
 * User
 */
var user_cache = {};
var User = function(id, nickname, email){
    this.id = id;
    this.nick = nickname;
    this.email = email;
};
(function PopulateUserCache(){
    redisClient.KEYS("usr:*", function(err, userids){
        userids.forEach(function(userid){
            User.prototype.findOrCreate(userid.substring(4), function(err){
                if(err){
                    console.log("Error Loading User Id");
                }
            })
        });
    })
})();
User.prototype.Update = function(id, newnick, newemail, cb){
    this.findById(id).then(
        function(user){
            if(newnick == ''){newnick = user.nick;}
            if(newemail == ''){newemail = user.email;}
            return RedisClient.HMSET(
                'usr:' + id,
                'nick', newnick,
                'email', newemail
            );
        }
    ).then(
        function(){
            user_cache[id].nick = newnick;
            user_cache[id].email = newemail;
            cb(null, null);
            return null;
        }
    ).catch(
        function(err){
            cb(err, null);
        }
    );

    /*
    this.findById(id, function(err, result){
        if(err){cb(err, null);}
        else{
            if(newnick == ""){newnick = user_cache[id].nick;}
            if(newemail == ""){newemail = user_cache[id].email;}
            redisClient.HMSET(
                "usr:"+id,
                'nick', newnick,
                'email', newemail,
                function(err, result){
                    if(err){cb(err, null);}
                    else {
                        user_cache[id].nick = newnick;
                        user_cache[id].email = newemail;
                        cb(null, null);
                    }
                }
            );

        }
    });*/
};
User.prototype.findById = function(id, cb){
    return new Promise(function(resolve, reject){
        if(user_cache.hasOwnProperty(id)) {
            resolve(user_cache[id]);
        }
        else{
            reject('cannot find the user with the given id'+id);
        }
    });
};
User.prototype.findOrCreate = function(id, cb){
    if(user_cache.hasOwnProperty(id)){
        cb(null, user_cache[id]);
    }
    else{
        redisClient.HGETALL("usr:"+id,
            function(err, result)
            {
                if(err){cb(err, null);}
                else if(err == null && result == null){// no entry
                    var default_nick = 'user'+id.substr(3, 1)+id.substr(6, 2);
                    var defailt_mail = 'default@email.com';
                    redisClient.HMSET(
                        "usr:"+id,
                        'nick', default_nick,
                        'email', defailt_mail,
                        'groupNs', '[]',
                        function(err, result){
                            if(err != null){cb(err, null);}
                            else{
                                var newuser = new User(id, default_nick, defailt_mail);
                                user_cache[id] = (newuser);
                                cb(null, newuser);
                            }
                        }
                    );
                }
                else{
                    var newuser = new User(
                        id,
                        result.nick,
                        result.email
                    );
                    user_cache[id] = (newuser);
                    cb(null, newuser);
                }

            }
        );
    }
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
                var err = new Error("You are already a member of the group");
                err.push_msg = true;
                throw err;
            }
        }
    );
};


User.prototype.RemoveGroupFromUser = function(userid_n, groupid_n){
    return RedisClient.HGET("usr:"+userid_n, "groupNs").then( // get user's group list
        function(groupNsStr){
            var groupNsObj = JSON.parse(groupNsStr);
            var i = groupNsObj.indexOf(groupid_n);
            if(i < 0){
                var err = new Error("RemoveGroupMemeber failed: No such user found in the group");
                err.push_msg = true;
                throw err;
            }
            groupNsObj.splice(i, 1);
            return RedisClient.HSET("usr:"+userid_n, "groupNs", JSON.stringify(groupNsObj)); // save to user's group list
        }
    );
};

User.prototype.GetGroupNs = function(userid_n, cb){
    redisClient.HGET("usr:"+userid_n, "groupNs", function(err, groupNsStr){
        if(err){cb(err, null);}
        else {
            var groupNsObj = JSON.parse(groupNsStr);
            cb(null, groupNsObj);
        }
    });
};




/*
=======
>>>>>>> refs/remotes/DongwookYoon/master
 *  RedisWrapper for Promise
 */

var RedisClient = {
    HGET: function(key, field){
        return new Promise(function(resolve, reject){
            redisClient.HGET(key, field, function(err, rtn){
                if(err){
                    reject(err);
                }
                else{
                    resolve(rtn);
                }
            });
        });
    },

    HGETALL: function(key) {
        return new Promise(function (resolve, reject) {
            redisClient.HGETALL(key, function (err, rtn) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rtn);
                }
            });
        })
    },

    KEYS: function(exp) {
        return new Promise(function (resolve, reject) {
            redisClient.KEYS(exp, function (err, rtn) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rtn);
                }
            });
        })
    },

    EXISTS: function(key){
        return new Promise(function (resolve, reject) {
            redisClient.EXISTS(key, function(err, rtn){
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rtn);
                }
            });
        })
    },

    HMSET: function(){
        var a = [];
        for(var i = 0; i < arguments.length; ++i){
            a.push(arguments[i]);
        }
        return new Promise(function (resolve, reject) {
            var f = function(err, rtn){
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rtn);
                }
            };
            a.push(f);
            redisClient.HMSET.apply(redisClient, a);

        });
    },

    HSET: function(key, field, value) {
        return new Promise(function (resolve, reject) {
            redisClient.HSET(key, field, value, function(err, rtn){
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rtn);
                }
            });
        });
    },

    DEL: function(key) {
        return new Promise(function (resolve, reject) {
            redisClient.DEL(key, function(err, rtn){
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rtn);
                }
            });
        });
    },

    LRANGE: function(key, start, stop){
        return new Promise(function (resolve, reject) {
            redisClient.LRANGE(key, start, stop, function(err, rtn){
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rtn);
                }
            });
        });
    }
};

/*
 * Ping regularly in order to maintain the connection
 */
function PingRedisServer()
{
    redisClient.ping(redis.print);
    setTimeout(PingRedisServer, 3*60*1000);
}
PingRedisServer();


/*
 * User
 */
var user_cache = {};
var User = function(id, nickname, email){
    this.id = id;
    this.nick = nickname;
    this.email = email;
};
(function populateUserCache(){
    RedisClient.KEYS("usr:*").then(
        function(userids){
            Promise.all(
                userids.map(function(userid){
                    return User.prototype.findOrCreate(userid.substring(4))
                })
            ).then(
                function(users){
                    users.forEach(function(user){user_cache[user.id] = user;})
                }
            ).catch(
                function(err){
                    console.log(err);
                }
            );
        }
    );
})();
User.prototype.updateNick = function(id, newnick){
    if(user_cache.hasOwnProperty(id)){
        return RedisClient.HMSET(
            'usr:' + id,
            'nick', newnick
        ).then(
            function(){
                user_cache[id].nick = newnick;
                return user_cache[id];
            }
        );
    }
    else{
        throw 'internal server error: user not cached';
    }
};
User.prototype.updateEmail = function(id, newemail){
    if(user_cache.hasOwnProperty(id)){
        return RedisClient.HMSET(
            'usr:' + id,
            'email', newemail
        ).then(
            function(){
                user_cache[id].email = newemail;
                return user_cache[id];
            }
        );
    }
    else{
        throw 'internal server error: user not cached';
    }
};
User.prototype.findById = function(id){
    return new Promise(function(resolve, reject){
        if(user_cache.hasOwnProperty(id)) {
            resolve(user_cache[id]);
        }
        else{
            reject('cannot find the user with the given id: '+id);
        }
    });
};
User.prototype.findOrCreate = function(id, email){
    return new Promise(function(resolve, reject){
        var done = function(user){
            if(typeof email !== 'undefined' && user.email !== email){
                return User.prototype.updateEmail(id, email).then(
                    function(){
                        resolve(user);
                    }
                )
            }
            else{
                resolve(user);
            }
        };

        if(user_cache.hasOwnProperty(id)){ // cached
            done(user_cache[id]);
        }
        else{
            var nick = '';
            var mail = '';
            RedisClient.HGETALL("usr:"+id).then(
                function(result){
                    if(result === null){
                        nick = 'user'+id.substr(3, 1)+id.substr(6, 2); // default nick
                        mail = 'default@email.com'; // default mail
                        return RedisClient.HMSET(
                            "usr:"+id,
                            'nick', nick,
                            'email', mail,
                            'groupNs', '[]'
                        );
                    }
                    else{
                        nick = result.nick;
                        mail = result.email;
                        return null;
                    }
                }
            ).then(
                function(){
                    var newuser = new User(
                        id,
                        nick,
                        mail
                    );
                    user_cache[id] = (newuser);
                    done(newuser);
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
                var err = new Error("You are already a member of the group");
                err.push_msg = true;
                throw err;
            }
        }
    );
};
User.prototype.RemoveGroupFromUser = function(userid_n, groupid_n){
    return RedisClient.HGET("usr:"+userid_n, "groupNs").then( // get user's group list
        function(groupNsStr){
            var groupNsObj = JSON.parse(groupNsStr);
            var i = groupNsObj.indexOf(groupid_n);
            if(i < 0){
                var err = new Error("RemoveGroupMemeber failed: No such user found in the group");
                err.push_msg = true;
                throw err;
            }
            groupNsObj.splice(i, 1);
            return RedisClient.HSET("usr:"+userid_n, "groupNs", JSON.stringify(groupNsObj)); // save to user's group list
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

/*
 * Group
 */
var Group = (function(manager, name, creationDate){

    /*
     userid
     docid
     creationTime
     name
     users {"invited":[noname@gmail.com], "participating":[user:1902839014]}
     */
    var public = {};
    public.CreateNewGroup = function(userid_n, docid, creationTime){
        return new Promise(function(resolve, reject){
            var groupid = "grp:"+userid_n+"_"+creationTime;
            redisClient.EXISTS(groupid, function(err, resp){
                if(err){reject(err);}
                else if(resp == 1) {reject('grp already exist');}
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

    public.GetById = function(groupid, cb){
        redisClient.HGETALL(groupid, function(err, groupObj){
            if(err != null || groupObj == null){cb(err);}
            else{
                groupObj.id = groupid;
                groupObj.users = JSON.parse(groupObj.users);
                for(var i = 0; i < groupObj.users.invited.length; ++i) {
                    groupObj.users.invited[i] = JSON.parse(groupObj.users.invited[i]);
                }
                cb(err, groupObj);
            }
        });
    };


    public.GetGroupObj_Promise = function(groupid){
        return RedisClient.HGETALL(groupid).then(
            function(groupObj){
                groupObj.id = groupid;
                groupObj.users = JSON.parse(groupObj.users);
                for(var i = 0; i < groupObj.users.invited.length; ++i) {
                    groupObj.users.invited[i] = JSON.parse(groupObj.users.invited[i]);
                }
                return groupObj;
            }
        );
    };

    public.GetDocIdByGroupId = function(groupid_n, cb){
        redisClient.HGET("grp:"+groupid_n, "docid", function(err, docid){
            cb(err, docid);
        });
    };

    public.PopulateParticipantObjs = function(groupObj){
        return new Promise(function (resolve, reject) {
            var argl = [];
            for(var i = 0; i < groupObj.users.participating.length; ++i){
                argl.push(["usr:"+groupObj.users.participating[i], "nick"]);
            }
            js_utils.PromiseLoop(RedisClient.HGET, argl).then(resolve).catch(reject);
        }).then(
            function(nicknames){
                for(var i = 0; i < nicknames.length; ++i){
                    groupObj.users.participating[i] = {'id':groupObj.users.participating[i], "nick":nicknames[i]}
                }
                return groupObj;
            }
        );
    };

    public.DeleteGroup = function(groupid_n, docid_n){
        function job(userid_n){
            return User.prototype.RemoveGroupFromUser(userid_n, groupid_n).then(
                function(){
                    return Group.RemoveUserFromGroup(groupid_n, userid_n);
                }
            )
        }

        return Group.GetUsersFromGroup(groupid_n).then(
            function(users){
                return js_utils.PromiseLoop(job, users.participating.map(function(userid_n){return [userid_n];}));
            }
        ).then(
            function(){
                return Group.DeleteGroupFromDoc(groupid_n, docid_n);
            }
        )
    };

    public.DeleteGroupFromDoc = function(groupid_n, docid_n){
        return RedisClient.HGET("doc:"+docid_n, 'groups').then( // get group list of doc
            function(groupsStr){
                var groupsObj = JSON.parse(groupsStr);
                var idx = groupsObj.indexOf("grp:"+groupid_n);
                if (idx < 0) {
                    var err = new Error("The group does not exist in the document's group list.");
                    err.push_msg = true;
                    throw err;
                }
                else{
                    groupsObj.splice(idx, 1);
                    return RedisClient.HSET("doc:"+docid_n, "groups", JSON.stringify(groupsObj));  // save modified group list of doc
                }
            }
        ).then(
            function(){
                return RedisClient.DEL("grp:"+groupid_n);  // delete group
            }
        )
    };

    public.Delete = function(userid_n, docid, groupid, cb){
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

    public.Rename = function(groupid, newname, cb){
        redisClient.HSET(groupid, 'name', newname, function(err){
            cb(err);
        });
    };

    public.SetUsersByObj = function(groupid, usersobj, cb){
        redisClient.HSET(groupid, "users", JSON.stringify(usersobj), function(err, resp){
            cb(err, resp);
        });
    };

    public.GetNumUsers = function(groupid, cb){
        redisClient.HGET(groupid, "users", function(err, usersStr){
            if(err){
                cb(err, null);
            }
            else if(usersStr == null){
                cb(null, 0);
            }
            else{
                cb(err, JSON.parse(usersStr).participating.length);
            }
        });
    };

    public.GetUsersFromGroup = function(groupid_n){
        return RedisClient.HGET("grp:"+groupid_n, "users").then(
            function(usersStr){
                return JSON.parse(usersStr);
            }
        );
    };

    public.AddUserToGroup = function(groupid_n, userid_n){
        return RedisClient.HGET("grp:"+groupid_n, "users").then(
            function(usersStr) {
                var usersObj = JSON.parse(usersStr);
                if(usersObj == null){
                    var err = new Error("That's and invalid GroupCode.");
                    err.push_msg = true;
                    throw err;
                }
                var i = usersObj.participating.indexOf(userid_n);
                if(usersObj.participating.length == 5){
                    var err = new Error("There are already maximum number (5) of users in this group.");
                    err.push_msg = true;
                    throw err;
                }
                else if (i >= 0) {
                    var err = new Error("You are already a member of the group");
                    err.push_msg = true;
                    throw err;
                }
                else{
                    usersObj.participating.push(userid_n);
                    return RedisClient.HSET("grp:"+groupid_n, 'users', JSON.stringify(usersObj));
                }
            }
        );
    };

    public.RemoveUserFromGroup = function(groupid_n, userid_n){
        return RedisClient.HGET("grp:"+groupid_n, "users").then( // get group's user list
            function(usersStr){
                var usersObj = JSON.parse(usersStr);
                var i = usersObj.participating.indexOf(userid_n);
                if(i < 0){
                    var err = new Error("RemoveGroupMemeber failed: No such group found in the group");
                    err.push_msg = true;
                    throw err;
                }
                usersObj.participating.splice(i, 1);
                return RedisClient.HSET("grp:"+groupid_n, 'users', JSON.stringify(usersObj)); // save to group's user list
            }
        );
    };

    public.GetViewerUrl = function(groupid_n, cb){
        redisClient.HGET("grp:"+groupid_n, 'docid', function(err, docid){
            if(err){cb(err);}
            else{
                redisClient.HGET(docid, "pdfid", function(err, pdfid){
                    if(err){cb(err);}
                    else{
                        var url = "viewer?access_code="+pdfid+"&docid="+docid.substring(4)+"&groupid="+groupid_n;
                        cb(null, url)
                    }
                });
            }
        });
    };

    return public;
})();



/*
 * Doc
 */
var Doc = (function(){
    var public = {};

    //redis doc hash structure
    // userid, creationDate, pdfid, name, groups(list)

    public.CreateNew = function(userid_n, creationTime, pdfid){
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
                return RedisClient.HMSET(
                    docid,
                    'userid_n', userid_n,
                    'creationTime', creationTime,
                    'pdfid', pdfid,
                    'name', 'Document uploaded at ' + js_utils.FormatDateTimeMilisec(creationTime),
                    'groups', '[]'
                )
            }
        ).then(
            function(){
                return docid;
            }
        );
    };

    public.GetDocById_Promise = function(docid){
        return RedisClient.HGETALL(docid).then(
            function(doc_obj){
                doc_obj.id = docid;
                doc_obj.creationTimeStr = js_utils.FormatDateTime(doc_obj.creationTime);
                doc_obj.groups = JSON.parse(doc_obj.groups);
                return doc_obj;
            }
        );
    };

    public.GetDocIdsByUser = function(userid_n){
        return RedisClient.KEYS('doc:'+userid_n+'_*');
    };

    public.GetDocByUser_Promise = function(userid_n){
        return RedisClient.KEYS('doc:'+userid_n+'_*').then(
            function(docids){
                return js_utils.PromiseLoop(public.GetDocById_Promise, docids.map(function(docid){return [docid];})).then(
                    function(doc_objs){
                        return doc_objs;
                    }
                );
            }
        );
    };

    public.AddNewGroup = function(userid_n, docid){
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
        ).then(
            function(){
                return groupid;
            }
        );
    };

    public.GetDocGroups = function(docid_n){
        return RedisClient.HGET("doc:"+docid_n, "groups").then(
            function(groupsStr){
                return groupsObj = JSON.parse(groupsStr);
            }
        );
    };

    public.Rename = function(docid, newname, cb){
        redisClient.HSET(docid, "name", newname, function(err, resp){
            cb(err, resp);
        });
    };

    public.DeleteDocFromRedis = function(docid_n){
        return RedisClient.DEL("doc:"+docid_n);
    };

    return public;
}());

var Cmd = (function(){
    var public = {};

    public.AppendCmd = function(group_id_n, cmdStr, cb){
        redisClient.RPUSH("cmd:"+group_id_n, cmdStr, function(err){
            cb(err);
        });
    };
    public.GetCmds = function(groupid_n, cmds_downloaded_n){
        return RedisClient.LRANGE("cmd:"+groupid_n, cmds_downloaded_n, -1);
    };

    return public;
})();

var Log = function(group_n, logStr, cb){
    redisClient.RPUSH("log:"+group_n, logStr, function(err){
        cb(err);
    });
};

exports.User = User;
exports.Doc = Doc;
exports.Group = Group;
exports.Cmd = Cmd;
exports.Log = Log;
exports.redisClient = redisClient;