const redis = require('redis');

const util = require('../util');
const node_util = require('util');

// util.debug(Object.keys(redis.RedisClient.prototype).sort());

const COMMANDS = [
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
  'HMGET',
  'client'
];

util.debug(Object.keys(COMMANDS).sort());

const LOCAL_REDIS_PORT = 6379;

const REDIS_CACHE_KEY = "j+DzNp9nrLP1FzboDd4FJSHTj1tfc4c6FHecDWZthIo=";
const REDIS_CACHE_HOSTNAME = "richreview-redis-ca.redis.cache.windows.net";
const REDIS_CACHE_PORT = 6380;

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
  COMMANDS.forEach((command) => {
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

testCache();