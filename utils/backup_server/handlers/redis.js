/**
 *
 * Redis server header
 *
 * To launch the managing redis server independently call
 *
 * ./redis-4.0.10/src/redis-server ./redis.conf
 * ./redis-4.0.10/src/redis-cli -p 8555
 *
 * To check backup set the db file name to the the backup file you want to copy the rdb file from redis_backup to backup_server root and then call
 *
 * ./redis-4.0.10/src/redis-server --port 8555 --dir ./ --dbfilename redis_migrate.rdb
 *
 * Created by Colin
 */

const child_process = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');

const redis = require('redis');

const { log, log_error } = require('../helpers').makeLogs("REDIS");
const env = require('../env');

/**
 * Get a redis server directory
 */
const redis_directories = fs.readdirSync(path.join(__dirname, '..'))
  .filter((bbb) => {
    return fs.statSync(path.join(__dirname, '..', bbb)).isDirectory() && /^redis-[a-zA-z0-9\-\.]+$/.test(bbb); });
const REDIS_PATH = path.join(__dirname, '..', redis_directories[0]);

/**
 * spawn the redis server to to handle the downloading of redis keys. The default settings uses the configuration file redis.conf which set the port to 8555 and the working directory to backup_server.
 *
 * @param {Object} [options] - the optional arguments for redis-server
 */
exports.spawnLocalRedis = (options) => {
  log("spawning from "+REDIS_PATH);
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
  const redisSpawn = child_process.spawn(
    path.join(REDIS_PATH, 'src/redis-server'),
    arguments
  );

  redisSpawn.stdout.on('data', (data) => {
    log(`stdout: ${data}`);

  });

  redisSpawn.stderr.on('data', (data) => {
    log(`stderr: ${data}`);
  });

  redisSpawn.on('close', (code) => {
    log(`child process exited with code ${code}`);
  });

  redisSpawn.on('error', (err) => {
    log_error(`child process has error ${err}`);
  });

  return redisSpawn;
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
/*******************************************************/
/**
 * resets a redis server
 * WARNING: remember to backup and export (no script yet) the cache before resetting!
 * WARNING: you should not run this function on a local redis server.
 *
 * There are no script to reset the redis server. You should run it directly in terminal:
 *
 * node <<< "const RCClient = require('./handlers/redis').createRedisCacheClient(); require('./handlers/redis').resetRedisCache(RCClient).then(() => { return RCClient.quit(); });"
 */
exports.resetRedisCache = (redisClient) => {
  return redisClient.FLUSHALL()
    .then((s) => {
      log(s);
      log("WARNING: redis server is reset");
    });
};