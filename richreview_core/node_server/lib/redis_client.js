/**
 * Initialize the redis client
 *
 *
 */

// import npm modules
const node_util = require('util');
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

/**
 * Set error handler
 */
redisClient.on('error', function(err) {
    util.error(err);
});

/**
 * Ping server periodically
 */
let ping_timeout = null;
(function PingRedisServer() {
    redisClient.ping(redis.print);
    ping_timeout = setTimeout(PingRedisServer, 3*60*1000);
} ( ));

/**
 * Promisify all redis prototype functions including Redis commands
 */
const promisifyRedisClient = function(client) {
  const pub = { };
  Object.keys(redis.RedisClient.prototype).forEach((command) => {
    pub[command] = node_util.promisify(client[command]).bind(client);
  });

  pub.end = function() {
    clearTimeout(ping_timeout);
    redisClient.end();
  };

  pub.quit = function() {
    clearTimeout(ping_timeout);
    redisClient.quit();
  };

  return pub;
};

const RedisClient = promisifyRedisClient(redisClient);

exports.util = (function () {
    const pub = { };

    pub.keyExists = function(key) {
        return RedisClient.EXISTS(key)
          .then((b) => { return b === 1; });
    };

    pub.isMember  = function(key, value) {
      return RedisClient.SMEMBER(key, value)
        .then((b) => { return b === 1; });
    };

    return pub;
} ( ));

/*
 *  Promisified RedisWrapper
 */
/*var RedisClient = (function(){
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
        pub[fstr] = function(/!*arguments*!/) {
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
}());*/

exports.redisClient = redisClient;
exports.RedisClient = RedisClient;
