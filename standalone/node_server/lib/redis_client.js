var Promise = require("promise");
var redis = require('redis');
var redisClient = redis.createClient(6379, "richreview.net");
redisClient.auth('rich.reviewer@cornell');
redisClient.on('error', function(err) {
    // "Redis connection to <hostname>:6379 failed - read ETIMEDOUT";
    console.log('Redis error: ' + err);
});


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

    HDEL: function(key, field){
        return new Promise(function(resolve, reject){
            redisClient.HDEL(key, field, function(err, rtn){
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

exports.redisClient = redisClient;
exports.RedisClient = RedisClient;