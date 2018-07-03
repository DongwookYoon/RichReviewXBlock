
const path = require('path');
const fs = require('fs');

const redis = require('redis');

const util = require('../util');
const node_util = require('util');

const redis_config = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'ssl/redis_config.json'), 'utf-8')
);


const LOCAL_REDIS_PORT = redis_config.port;

const REDIS_CACHE_KEY = redis_config.redis_cache.access_key;
const REDIS_CACHE_HOSTNAME = redis_config.redis_cache.hostname;
const REDIS_CACHE_PORT = redis_config.redis_cache.port;

const redisCacheClient = redis.createClient(
  REDIS_CACHE_PORT,
  REDIS_CACHE_HOSTNAME,
  {
    auth_pass: REDIS_CACHE_KEY,
    tls: {
      servername: REDIS_CACHE_HOSTNAME
    }
  }
);

const redisLocalClient = redis.createClient(LOCAL_REDIS_PORT);

const promisifyRedisClient = function(client) {
  const pub = { };
  Object.keys(redis.RedisClient.prototype).forEach((command) => {
    pub[command] = node_util.promisify(client[command]).bind(client);
  });
  return pub;
};

const RedisCacheClient = promisifyRedisClient(redisCacheClient);
const RedisLocalClient = promisifyRedisClient(redisLocalClient);

async function testCache() {

  // Perform cache operations using the cache connection object...

  // Simple PING command


  // Simple get and put of integral data types into the cache
  console.log("\nCache command: GET Message");
  console.log("Cache response : " + await RedisCacheClient.GET("Message"));

  console.log("\nCache command: SET Message");
  console.log("Cache response : " + await RedisCacheClient.SET("Message",
    "Hello! The cache is working from Node.js!"));

  // Demostrate "SET Message" executed as expected...
  console.log("\nCache command: GET Message");
  console.log("Cache response : " + await RedisCacheClient.GET("Message"));

  // Get the client list, useful to see if connection list is growing...
  console.log("\nCache command: CLIENT LIST");
  console.log("Cache response : " + await RedisCacheClient.client("LIST"));
}

// testCache();

const test_migration = () => {
  return RedisLocalClient.SET("test", "success")
    .then((b) => {
      return RedisLocalClient.MIGRATE(redis_config.redis_cache.hostname, redis_config.redis_cache.port, "test", 0, 1000, "COPY");
    })
    .then((outcome) => {
      util.debug(outcome);
      return RedisCacheClient.GET("test");
    })
    .then((test) => {
      util.debug(test);
    })
    .catch((err) => {
      util.error(err);
    });
};

test_migration();

let TYPES = {
  hash: 0,
  list: 0,
  set: 0,
  string: 0,
  unknown: 0
};

const treat_entry = (entry) => {
  const cb_count = (type) => {
    switch(type) {
      case "hash":
        TYPES.hash++;
        break;
      case "list":
        TYPES.list++;
        break;
      case "set":
        TYPES.set++;
        break;
      case "string":
        TYPES.string++;
        break;
      default:
        TYPES.unknown++;
    }
  };

  return RedisLocalClient.TYPE(entry).then(cb_count);
};

const scan_loop = (cursor) => {
  let promise = null;
  if(cursor) {
    promise = RedisLocalClient.SCAN(cursor);
  } else {
    promise = RedisLocalClient.SCAN(0);
  }
  return promise
    .then((result) => {
      const nextCursor = Number.parseInt(result[0]);
      const promises = result[1].map(treat_entry);
      return Promise.all(promises)
        .then((a) => {
          console.log(nextCursor);
          if(nextCursor === 0) {
            return null;
          } else {
            return scan_loop(nextCursor);
          }
        });
    });
};

const import_exec = () => {
  return scan_loop()
    .then((b) => {
      util.debug(JSON.stringify(TYPES, null, '\t'));
    });
};

//import_exec();