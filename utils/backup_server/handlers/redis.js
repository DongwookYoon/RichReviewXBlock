/**
 *
 * Redis server header
 *
 */

const child_process = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');

const moment = require('moment');
const redis = require('redis');

const helpers = require('../helpers');
const env = require('../env');

/**
 * Get a redis server directory
 */
const redis_directories = fs.readdirSync(path.join(__dirname, '..'))
  .filter((bbb) => {
    return fs.statSync(path.join(__dirname, '..', bbb)).isDirectory() && /^redis-[a-zA-z0-9\-\.]+$/.test(bbb); });
const REDIS_PATH = path.join(__dirname, '..', redis_directories[0]);

/**
 * spawn the redis server to to handle the downloading of redis keys.
 *
 * To launch this server independently call
 * ./redis-4.0.10/src/redis-server ./redis-4.0.10/redis.conf
 * ./redis-4.0.10/src/redis-cli -p 8555
 * ./redis-4.0.10/src/redis-server --port 8555 --dir ./redis_backup --dbfilename redis_backup.20180720130767.rdb
 *
 * @param {Object} [options] - the optional arguments for redis-server
 */
exports.spawnLocalRedis = (options) => {
  helpers.log("DEBUG: spawning from "+REDIS_PATH);
  let arguments = null;
  if(!options) { // using default arguments
    arguments = [path.join(__dirname, '..', 'redis.conf')];
  } else {
    arguments = [ ];
    if(options.hasOwnProperty("port")) {
      arguments.push("--port", options.port);
    } else {
      arguments.push("--port", 8555);
    }
    if(options.hasOwnProperty("dir")) {
      arguments.push("--dir", options.dir);
    } else {
      arguments.push("--dir", "./");
    }
    if(options.hasOwnProperty("dbfilename")) {
      arguments.push("--dbfilename", options.dbfilename);
    }
  }
  return child_process.spawn(
    path.join(REDIS_PATH, 'src/redis-server'),
    arguments
  );
};
/*******************************************************/
/**
 * turns redisc callback functions into functions that return promises
 */
const promisifyRedisClient = function(client) {
  const pub = { };
  Object.keys(redis.RedisClient.prototype).forEach((command) => {
    pub[command] = util.promisify(client[command]).bind(client);
  });
  return pub;
};
/*******************************************************/
exports.createRedisLocalClient = () => {
  const redisLocalClient = redis.createClient(
    env.redis_config.backup_port
  );
  return promisifyRedisClient(redisLocalClient);
};
exports.createRedisCacheClient = () => {
  const redisCacheClient = redis.createClient(
    env.redis_config.redis_cache.port,
    env.redis_config.redis_cache.hostname,
    {
      auth_pass: env.redis_config.redis_cache.access_key,
      tls: {
        servername: env.redis_config.redis_cache.hostname
      }
    }
  );
  return promisifyRedisClient(redisCacheClient);
};
/*******************************************************/
exports.promisifyRedisClient = promisifyRedisClient;
exports.localRedisClose = () => {
  return new Promise((resolve, reject) => {
    child_process.execFile(
      REDIS_PATH + '/src/redis-cli',
      ['-p', '8555', 'shutdown'],
      (error, stdout, stderr) => {
        if(error) { reject(error); }
        if(stdout) { log(stdout); }
        resolve(true);
      }
    );
  });
};
exports.REDIS_PATH = REDIS_PATH;