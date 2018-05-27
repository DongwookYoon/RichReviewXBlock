/**
 * Initialize the redis client
 *
 *
 */

// import built-in modules
const os = require("os");

// import npm modules
const Promise = require("promise"); // jshint ignore:line
const redis = require('redis');

// import libraries
const env = require('../lib/env');
const util = require('../util');

/**
 * If os hostname is spire then use the local redis server, otherwise use the server on richreview.net
 */
let redisClient = null;

if(os.hostname() !== "richreview") {
    util.start("using local redis server");
    redisClient = redis.createClient(6379);
} else {
    util.start("using remove redis server");
    redisClient = redis.createClient(6379, "richreview.net");
    redisClient.auth(env.redis_config.auth);
}

redisClient.on('error', function(err) {
    // "Redis connection to <hostname>:6379 failed - read ETIMEDOUT";
    util.error("Redis: "+err);
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
        'GET',
        'KEYS',
        'EXISTS',
        'DEL',
        'HGET',
        'HDEL',
        'HGETALL',
        'HEXISTS',
        'HKEYS', // added by Colin
        'EXISTS', // added by Colin
        'HMSET',
        'HSET',
        'LPUSH',
        'RPUSH',
        'LREM',
        'LRANGE',
        'SET',
        'HMGET' // added by Colin
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
