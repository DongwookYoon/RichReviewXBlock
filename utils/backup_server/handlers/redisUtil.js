/**
 *
 */

const helpers = require('../helpers');
const { log, log_error } = require('../helpers').makeLogs("REDIS UTIL");

/**
 * Count the number of keys in a given type by datatype
 * @param {RedisClient} redisClient - the promisified redis client to count from; only works if redis client is promisified.
 */
exports.countDatatypes = (redisClient) => {
  const TYPES = {
    hash: 0,
    list: 0,
    set: 0,
    string: 0,
    unknown: 0
  };
  const EXPIRATIONS = { };

  const count = (entry, type) => {
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

  const queryExpiration = (entry) => {
    return redisClient.TTL(entry)
      .then((time) => {
        // log(`${entry} ${time}`);
        if(time >= 0) { EXPIRATIONS[entry] = time; }
      });
  };

  const treat_entry = (entry) => {
    return redisClient.TYPE(entry)
      .then(count.bind(null, entry))
      .then(queryExpiration.bind(null, entry));
  };

  const scan_loop = (cursor) => {
    let promise = null;
    if(cursor) {
      promise = redisClient.SCAN(cursor);
    } else {
      promise = redisClient.SCAN(0);
    }
    return promise
      .then((result) => {
        const nextCursor = Number.parseInt(result[0]);
        const promises = result[1].map(treat_entry);
        return Promise.all(promises)
          .then((a) => {
            log("next cursor "+nextCursor);
            if(nextCursor === 0) {
              return null;
            } else {
              return scan_loop(nextCursor);
            }
          });
      });
  };

  return scan_loop()
    .then((b) => {
      log(JSON.stringify(TYPES, null, '\t'));
      Object.keys(EXPIRATIONS).forEach(key => {
        log(`${key} expires in `+EXPIRATIONS[key]);
      });
    })
    .catch(log_error);
};

/** Add misc. Redis methods here **/