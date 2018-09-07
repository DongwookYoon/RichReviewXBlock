const RedisClient = require('../lib/redis_client').RedisClient;

RedisClient.KEYS("crs:*")
  .then(keys => {
    console.log(JSON.stringify(keys));
  });