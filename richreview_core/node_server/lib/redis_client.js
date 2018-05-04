var Promise = require("promise");
var redis = require('redis');
var env = require('../lib/env');

/**
 *  CHANGES: 20180503
 *
 * If os hostname is spire then use the local redis server, otherwise use production server.
 */

/**
 * If os hostname is spire then use the local redis server, otherwise use production server.
 */
console.log("Hostname is " + os.hostname());
if(os.hostname() === spire) {
    var redisClient = redis.createClient(6379);
} else {
    var redisClient = redis.createClient(6379, "richreview.net");
    redisClient.auth(env.redis_config.auth);
}

redisClient.on('error', function(err) {
    // "Redis connection to <hostname>:6379 failed - read ETIMEDOUT";
    console.log('Redis error: ' + err);
});



var ping_timeout = null;
(function PingRedisServer(){
    redisClient.ping(redis.print);
    ping_timeout = setTimeout(PingRedisServer, 3*60*1000);
}());

/*
 *  Promisified RedisWrapper
 */
var RedisClient = (function(){
    var pub = {};

    var commands = [
        'KEYS',
        'EXISTS',
        'DEL',
        'HGET',
        'HDEL',
        'HGETALL',
        'HEXISTS',
        'HMSET',
        'HSET',
        'LPUSH',
        'RPUSH',
        'LREM',
        'LRANGE'
    ];

    commands.forEach(function(fstr){
        pub[fstr] = function(/*arguments*/){
            var args = Array.prototype.slice.call(arguments);
            return new Promise(function(resolve, reject){
                args.push(function(err,rtn){
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(rtn);
                    }
                });
                redisClient[fstr].apply(redisClient, args);
            });
        };
    });


    pub.end = function(){
        clearTimeout(ping_timeout);
        redisClient.end();
    };

    return pub;
}());

exports.redisClient = redisClient;
exports.RedisClient = RedisClient;
