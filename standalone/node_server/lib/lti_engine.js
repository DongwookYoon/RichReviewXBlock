/**
 * Created by yoon on 8/12/16.
 */

var Promise = require("promise");
var js_utils = require('../lib/js_utils.js');
var RedisClient = require('../lib/redis_client').RedisClient;
var AsyncLock = require('async-lock');
var lock = new AsyncLock();

var User = function(id, data){
    this.id = id;
    if(data)
        for(var k in data){
            this[k] = data[k];
        }
};

var UserMgr = (function(){
    var pub = {};

    var cache = {}; // id to LtiUser obj

    // get user by id (not including 'ltiusr')
    pub.getById = function(id){
        return assertId(id);
    };

    pub.getByIdSync = function(id){
        return cache[id];
    };

    pub.delById= function(id){
        return assertId(id)
            .then(function(user){
                delete cache[id];
                return RedisClient.DEL('ltiusr:'+id);
            });
    };

    pub.setAttr = function(id, name, val, json_type){
        return lock.acquire('setAttr', function() { // lock
            return RedisClient.HSET(
                'ltiusr:'+id,
                name,
                json_type === true ? JSON.stringify(val) : val
            )
                .then(
                    function(){
                        cache[id][name] = val;
                        return cache[id];
                    }
                );
        }, {Promise:Promise});
    };

    pub.loadAllFromDb = function(){
        return RedisClient.KEYS('ltiusr:*').then(
            function(ids_str){
                return Promise.all(
                    ids_str.map(function(id_str){
                        return loadFromDb(id_str.substring(7));
                    })
                );
            }
        )
    };

    pub.logIn = function(lti){
        if(typeof lti === 'object' && typeof lti.user_id === 'string'){
            if(lti.user_id in cache){
                return Promise.resolve(cache[lti.user_id]);
            }
            else{
                return createNew(lti);
            }
        }
        else{
            return new Promise.reject(new Error('Invalid LTI authentication profile'));
        }
    };

    function assertId(id){
        if(id in cache){
            return Promise.resolve(cache[id]);
        }
        else{
            return Promise.reject(new Error('Invalid Id'));
        }
    }

    function createNew(lti){
        return RedisClient.HMSET(
            'ltiusr:'+lti.user_id,
            'nick', lti.lis_person_sourcedid,
            'email', lti.lis_person_contact_email_primary,
            'status', 'init',
            'group', '',
            'grade', 'wait_sub',
            'survey_resp', ''
        ).then(
            function(){
                return loadFromDb(lti.user_id);
            }
        )
    }

    function loadFromDb(id){
        return RedisClient.HGETALL('ltiusr:'+id).then(
            function(result){
                var usr = new User(id, result);
                cache[id] = usr;
                return usr;
            }
        )
    }

    function populateCache(){
        return pub.loadAllFromDb().then(
            function(users){
                console.log('Lti users populated : ' + Object.keys(cache).length + '');
                return users;
            }
        );
    }

    populateCache();

    return pub;
})();

var Group = function(id, data){
    this.id = id;
    if(data)
        for( var k in data ){
            this[k] = data[k];
        }
};

const GRP_SIZE = 10;

var GroupMgr = function(prefix){
    var prefix = prefix;
    var cache = {};
    var next_grp_id = null; // without prefix

    this.assignUserIfNotSet = function(user){
        if(user.group === ''){ // if not set
            return lock.acquire('assignUserIfNotSet', function(){ // lock
                return getAvailableGroup(user)
                    .then(function(grp){
                        return assignUserToGroup(user, grp);
                        });
            }, {Promise:Promise});
        }
        else{ // if set
            return new Promise.resolve(cache[user.group]);
        }
    };

    this.delById = function(id){
        if(next_grp_id === id){
            next_grp_id = null;
        }
        delete cache[id];
        return RedisClient.DEL(prefix+id);
    };

    this.setAttr = function(id, name, val, json_type){
        return lock.acquire('setAttr'+prefix, function() { // lock
            return RedisClient.HSET(
                prefix+id,
                name,
                json_type === true ? JSON.stringify(val) : val
            )
                .then(
                    function(){
                        cache[id][name] = val;
                        return cache[id];
                    }
                );
        }, {Promise:Promise});
    };

    function getAvailableGroup(user){
        if(next_grp_id === null){ // need to create a new group
            return createNewGroup(user)
                .then(function(grp){
                    next_grp_id = grp.id;
                    return Promise.resolve(grp);
                });
        }
        else{
            var grp = cache[next_grp_id];
            if(grp.users.length >= GRP_SIZE-1){
                next_grp_id = null;
            }
            return Promise.resolve(grp);
        }
    }

    function setNextGrpId(){
        for(var key in cache){
            if(cache[key].users.length < GRP_SIZE){
                next_grp_id = key;
                console.log('next group id:', key);
                break;
            }
        }
    }

    function createNewGroup(){
        var t = new Date();
        var grp_id = Object.keys(cache).length + '_' + t.getTime();
        return RedisClient.HMSET(
            prefix+grp_id,
            'creationTime', t.toISOString(),
            'users', '[]'
        ).then(
            function(){
                return loadFromDb(grp_id);
            }
        )
    }

    var assignUserToGroup = function (user, grp) {
        return UserMgr.setAttr(user.id, 'group', grp.id)
            .then(function(){
                grp.users.push(user.id);
                return this.setAttr(
                    grp.id,
                    'users',
                    grp.users,
                    true // json type
                )
            }.bind(this));
    }.bind(this);

    this.loadAllFromDb = function(){
        return RedisClient.KEYS(prefix+'*').then(
            function(ids_str){
                return Promise.all(
                    ids_str.map(function(id_str){
                        return loadFromDb(id_str.substring(prefix.length));
                    })
                );
            }
        )
    };

    var loadFromDb = function(id){
        return RedisClient.HGETALL(prefix+id).then(
            function(result){
                var grp = new Group(id, result);
                grp.users = JSON.parse(grp.users);
                cache[id] = grp;
                return grp;
            }
        )
    };

    var populateCache = function(){
        return this.loadAllFromDb().then(
            function(grps){
                console.log('Lti groups populated, '+prefix + ' ' + Object.keys(cache).length + '');
                return grps;
            }
        );
    }.bind(this);

    populateCache()
        .then(function(){
            return setNextGrpId();
        });
};

var ListDb = function(_prefix){
    var prefix = _prefix;

    this.pushBack= function(id, cmdStr){
        return RedisClient.RPUSH(prefix+id, cmdStr);
    };

    this.getAfter = function(id, n){ // get n+1 th to the last item
        return RedisClient.LRANGE(prefix+id, n, -1);
    };
};

var logs = function(group_n, logs){
    var promises = logs.map(function(log){
        return RedisClient.RPUSH('ltilog:'+group_n, log);
    });
    return Promise.all(promises);
};

exports.logs = logs;
exports.CmdRR = new ListDb('lticmd_rr:');
exports.CmdBB = new ListDb('lticmd_bb:');
exports.GroupMgrRR = new GroupMgr('ltigrp_rr:');
exports.GroupMgrBB = new GroupMgr('ltigrp_bb:');
exports.User = User;
exports.UserMgr = UserMgr;

