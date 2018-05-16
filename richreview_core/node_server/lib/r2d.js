/**
 * R2D
 *
 * Created by Dongwook on 1/31/2015.
 */

// import npm modules
var Promise = require("promise");

// import libraries
var js_utils = require('../lib/js_utils.js');
var redisClient = require('../lib/redis_client').redisClient;
var RedisClient = require('../lib/redis_client').RedisClient;

/*
 * User
 */
var User = function(id, nickname, email){
    this.id = id;
    this.nick = nickname;
    this.email = email;
};

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
                    return RedisClient.HGETALL(key)
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
    )
};

/**
 * create a cache in the User. Say if we had `var sally = new User(...)` then `sally.cache.get(some_id)` gives us Promise<User> corr to some_id
 * TODO: see if doc is valid
 */
User.prototype.cache = (function(){
    var pub = {};

    var cache = {}; // for Google ID and Cornell NetID users

    /**
     * create an array of User from the users in the redis server
     * @return Array<User>
     */
    pub.populate = function(){
        return RedisClient.KEYS("usr:*").then(
            function(userids){
                return Promise.all(
                    userids.map(function(userid) { 
                        return pub.loadFromDb(userid.substring(4));
                    })
                );
            }
        ).then(
            function(users){
                console.log('ConellID: users populated: ' + Object.keys(cache).length + ' users');
                return users;
            }
        ).catch(
            function(err){
                console.error(err);
            }
        )
    };

    /**
     * create a User from redis server's user with the same id, and save it in the cache as value with id as the key
     * @arg    id - the user's id on redis
     * @return User
     */
    pub.loadFromDb = function(id){
        return RedisClient.HGETALL("usr:"+id).then(
            function(result){
                 var new_user = new User(
                    id,
                    result.nick,
                    result.email
                );
                cache[id] = new_user;
                return new_user;
            }
        )
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
 * Get a promise to the user_id from given email
 * @arg    email   - string of email
 * @return user_id - string of form 'usr':'id'
 */
User.prototype.findByEmail = function(email){
    if(js_utils.validateEmail(email)){
        return RedisClient.HGET('email_user_lookup', email).then(
            function(id){
                if(id){
                    return User.prototype.cache.get(id.substring(4));
                }
                else{
                    return new Promise(function(resolve){resolve(null);});
                }
            }
        );
    }
    else{
        return new Promise(function(resolve){resolve(null);});
    }
};

User.prototype.create = function(id, email){

    var groupids = [];

    return RedisClient.HMSET(
        'usr:'+id,
        'nick', email.substring(0, email.indexOf('@')),
        'email', email,
        'groupNs', '[]'
    ).then(
        function(){
            return RedisClient.HMSET(
                'email_user_lookup',
                email,
                'usr:'+id
            )
        }
    ).then(
        function(){
            return RedisClient.LRANGE('inv:'+email, 0, -1).then(
                function(_groupids){
                    groupids = _groupids;
                    return null;
                }
            );
        }
    ).then(
        function(){
            var argl = groupids.map(
                function(groupid){
                    return [groupid.substring(4), id];
                }
            );
            return js_utils.PromiseLoop(Group.connectUserAndGroup, argl);
        }
    ).then(
        function(){
            var argl = groupids.map(
                function(groupid){
                    return [groupid.substring(4), email];
                }
            );
            return js_utils.PromiseLoop(Group.CancelInvited, argl);
        }
    ).then(
        function(){
            return User.prototype.cache.loadFromDb(id);
        }
    );
};

User.prototype.deleteByEmail = function(email){
    return RedisClient.HGET('email_user_lookup', email).then(
        RedisClient.DEL
    ).then(
        function(){
            return RedisClient.HDEL('email_user_lookup', email);
        }
    );
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
                    )
                }
            ).then(
                function(){
                    return RedisClient.HDEL(
                        'email_user_lookup',
                        user.email
                    )
                }
            ).then(
                function(){
                    return User.prototype.cache.loadFromDb(user.id)
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
    return RedisClient.HGET("usr:"+userid_n, "groupNs").then(
        function(groupNsStr){
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
    var pub_grp = {};

    pub_grp.CreateNewGroup = function(userid_n, docid, creationTime){
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

    pub_grp.GetById = function(groupid, cb){
        redisClient.HGETALL(groupid, function(err, groupObj){
            if(err != null || groupObj == null){cb(err);}
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
                        return RedisClient.HGETALL(key)
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
        console.log("DEBUG: inviting " + email + " to " + groupid_n);
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
                            console.log("DEBUG: adding " + email + " to invited");
                            return RedisClient.RPUSH('inv:'+email, 'grp:'+groupid_n);
                        }
                    );
                }
            }
        )
    };

    pub_grp.connectUserAndGroup = function(groupid_n, userid_n){
        return pub_grp.AddUserToParticipating(groupid_n, userid_n).then(
            function(){
                return User.prototype.AddGroupToUser(userid_n, groupid_n);
            }
        );
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
                    groupObj.users.participating[i] = {'id':groupObj.users.participating[i], "nick":nicknames[i]}
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
    pub_grp.DeleteGroup = function(groupid_n, docid_n){

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
            console.log("DEBUG: LREM inv:"+ email + " 0 grp:" + groupid_n);
            return RedisClient.LREM("inv:"+email, 0, "grp:"+groupid_n);
        }

        console.log("DEBUG: starting method Group.DeleteGroup("+ groupid_n + ", " + docid_n+")");
        console.log("DEBUG: starting promiseToRemoveGroupFromInvitee");
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

        console.log("DEBUG: starting promiseToDetachUserAndGroup");
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
            ]).then(function() {
                console.log("DEBUG: finished removing from invitee and detach");
                return Group.DeleteGroupFromDoc(groupid_n, docid_n);
            });
    };

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
        )
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
            else if(usersStr == null){
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
                if(users == null){throw 'invalid group id';}

                var i = users.participating.indexOf(userid_n);
                if(users.participating.length == 5){
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
                        cb(null, url)
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
var Doc = (function(){
    var pub_doc = {};

    //redis doc hash structure
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
                )
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
                return js_utils.PromiseLoop(pub_doc.GetDocById_Promise, docids.map(function(docid){return [docid];})).then(
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
        ).then(
            function(){
                return groupid;
            }
        );
    };

    pub_doc.GetDocGroups = function(docid_n){
        return RedisClient.HGET("doc:"+docid_n, "groups").then(
            function(groupsStr){
                return groupsObj = JSON.parse(groupsStr);
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
(function dataSanityCheckup(){

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
                                if(i === -1)
                                    console.log('# incongruent user-group assignment: ' + group.id, userid_n);
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

    /*
    User.prototype.deleteByEmail('richreviewer0@gmail.com').catch(
        function(err){
            console.log(err);
        }
    );
    */

}());



exports.User = User;
exports.Doc = Doc;
exports.Group = Group;
exports.Cmd = Cmd;
exports.Log = Log;
exports.Logs = Logs;
exports.redisClient = redisClient;