
const helpers = require('../helpers');
const { log, log_error } = require('../helpers').makeLogs("LIST REDIS CACHE");

const RedisCacheClient = require('../handlers/redis').createRedisCacheClient();
const countDatatypes = require('../handlers/redisUtil').countDatatypes;

countDatatypes(RedisCacheClient)
  .then(() => { return RedisCacheClient.quit(); })
  .catch(log_error);