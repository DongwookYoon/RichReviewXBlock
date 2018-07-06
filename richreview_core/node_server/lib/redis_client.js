/**
 * Initialize the redis client
 *
 *
 */

// import npm modules
const Promise = require("promise"); // jshint ignore:line
const redis = require('redis');

// import libraries
const env = require('./env');
const util = require('../util');

/**
 * switch redis client dependent on host
 */
let redisClient = null;

if(process.env.NODE_ENV === 'production') {
  if(process.env.HOSTNAME === env.node_config.RICHREVIEW_CA_VM) {
    util.start("using redis cache for RichReview CA VM");
    redisClient = redis.createClient(
      env.redis_config.redis_cache.port,
      env.redis_config.redis_cache.hostname,
      {
        auth_pass: env.redis_config.redis_cache.access_key,
        tls: {
            servername: env.redis_config.redis_cache.hostname
        }
      }
    );
  } else if(process.env.HOSTNAME === env.node_config.RICHREVIEW_VM) {
    util.start("using remote redis server for RichReview VM");
    redisClient = redis.createClient(env.redis_config.port, env.redis_config.url);
    redisClient.auth(env.redis_config.auth);
  } else {
      util.error("cannot create redis client: unknown production environment");
  }
} else {
  util.start("using local redis server");
  redisClient = redis.createClient(env.redis_config.port);
}

redisClient.on('error', function(err) {
    util.error(err);
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
        'HKEYS',
        'EXISTS',
        'HMSET',
        'HSET',
        'LPUSH',
        'RPUSH',
        'LREM',
        'LRANGE',
        'SET',
        'SMOVE',
        'SMEMBERS',
        'SADD',
        'HMGET'
    ];

    commands.forEach(function(fstr){
        pub[fstr] = function(/*arguments*/) {
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
