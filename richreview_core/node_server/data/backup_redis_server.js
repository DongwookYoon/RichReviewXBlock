
const path = require('path');
const fs = require('fs');

const redis = require('redis');

const util = require('../util');
const node_util = require('util');

const redis_config = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'ssl/redis_config.json'), 'utf-8')
);

const LOCAL_REDIS_PORT = 6379;

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

const test_migration_hash = () => {
  util.debug("starting test_migration_hash");
  return RedisLocalClient.HMSET("test", "key1", "val1", "key2", "val2", "key3", "val3")
    .then((b) => {
      util.debug(b);
      // does not work
      //return RedisLocalClient.MIGRATE(redis_config.redis_cache.hostname, 6379, "test", 0, 1000, "COPY");
      return RedisLocalClient.HGETALL("test");
    })
    .then((data) => {
      const arr = [];
      Object.keys(data).forEach((key) => { arr.push(key, data[key]); });
      util.debug(JSON.stringify(arr));
      return RedisCacheClient.HMSET("test", ...arr);
    })
    .then((b) => {
      util.debug(b);
      return RedisCacheClient.HGETALL("test");
    })
    .then((data) => {
      util.debug(JSON.stringify(data));
      return RedisLocalClient.DEL("test");
    })
    .then((b) => {
      util.debug(b);
      return RedisCacheClient.DEL("test");
    })
    .then((b) => {
      util.debug(b);
      util.debug("done");
    })
    .catch((err) => {
      util.error(err);
    });
};

//test_migration_hash();

const test_migration_list = () => {
  util.debug("starting test_migration_list");
  return RedisLocalClient.RPUSH("test", "val1", "val2", "val3", "val4")
    .then((b) => {
      util.debug(b);
      return RedisLocalClient.LRANGE("test", 0, -1);
    })
    .then((data) => {
      util.debug(JSON.stringify(data));
      return RedisCacheClient.RPUSH("test", ...data);
    })
    .then((b) => {
      util.debug(b);
      return RedisCacheClient.LRANGE("test", 0, -1);
    })
    .then((data) => {
      util.debug(JSON.stringify(data));
      return RedisLocalClient.DEL("test");
    })
    .then((b) => {
      util.debug(b);
      return RedisCacheClient.DEL("test");
    })
    .then((b) => {
      util.debug(b);
      util.debug("done");
    })
    .catch((err) => {
      util.error(err);
    });
};

const exec = (cb) => {
  const treat_entry = (entry) => {
    return RedisLocalClient.TYPE(entry).then(cb.bind(null, entry));
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
            //console.log(nextCursor);
            if(nextCursor === 0) {
              return null;
            } else {
              return scan_loop(nextCursor);
            }
          });
      });
  };

  return scan_loop();
};

/**
 * Count the number of keys in your Redis server by datatype
 */
const exec_count = () => {
  const TYPES = {
    hash: 0,
    list: 0,
    set: 0,
    string: 0,
    unknown: 0
  };

  const cb_count = (entry, type) => {
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

    return null;
  };

  exec(cb_count)
    .then((b) => {
      util.logger("in local redis", JSON.stringify(TYPES, null, '\t'));
    })
    .catch((err) => {
      util.error(err);
    });
};

/**
 * Migrate the keys from your Redis server to the Azure Redis Cache
 * NOTE: only migrates hash and list datatypes
 */
const exec_import = () => {
  const FAILS = {
    hash: 0,
    list: 0,
    set: 0,
    string: 0,
    unknown: 0
  };

  const treatHash = (entry) => {
    return RedisLocalClient.HGETALL(entry)
      .then((data) => {
        const arr = [];
        Object.keys(data).forEach((key) => { arr.push(key, data[key]); });
        return RedisCacheClient.HMSET(entry, ...arr);
      })
      .catch((err) => {
        util.error(entry+" "+err);
      });
  };

  const treatList = (entry) => {
    return RedisLocalClient.LRANGE(entry, 0, -1)
      .then((data) => {
        return RedisCacheClient.RPUSH(entry, ...data);
      })
      .catch((err) => {
        util.error(entry+" "+err);
      });
  };

  const cb_set = (entry, type) => {
    switch(type) {
      case "hash":
        return treatHash(entry);
      case "list":
        return treatList(entry);
      case "set":
        FAILS.set++; // FAIL
        return Promise.resolve(0);
      case "string":
        FAILS.string++; // FAIL
        return Promise.resolve(0);
      default:
        FAILS.unknown++; // FAIL
        return Promise.resolve(0);
    }
  };

  exec(cb_set)
    .then((b) => {
      util.debug("missing these...");
      util.debug(JSON.stringify(FAILS, null, '\t'));
    })
    .catch((err) => {
      util.error(err);
    });
};

/**
 * Count the number of keys in the Azure Redis Cache by datatype
 */
const exec_cache_count = () => {
  const TYPES = {
    hash: 0,
    list: 0,
    set: 0,
    string: 0,
    unknown: 0
  };

  const cb_count = (entry, type) => {
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

    return null;
  };

  const treat_entry = (entry) => {
    return RedisCacheClient.TYPE(entry).then(cb_count.bind(null, entry));
  };

  const scan_loop = (cursor) => {
    let promise = null;
    if(cursor) {
      promise = RedisCacheClient.SCAN(cursor);
    } else {
      promise = RedisCacheClient.SCAN(0);
    }
    return promise
      .then((result) => {
        const nextCursor = Number.parseInt(result[0]);
        const promises = result[1].map(treat_entry);
        return Promise.all(promises)
          .then((a) => {
            //console.log(nextCursor);
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
      util.logger("in cache redis", JSON.stringify(TYPES, null, '\t'));
    })
    .catch((err) => {
      util.error(err);
    });
};

/**********************/

//testCache();
//test_migration_hash();
//test_migration_list();

/**
 * Count the number of keys in your Redis server by datatype
 */
//exec_count();

/**
 * Count the number of keys in the Azure Redis Cache by datatype
 */
//exec_cache_count();

/**
 * Migrate the keys from your Redis server to the Azure Redis Cache
 * NOTE: only migrates hash and list datatypes
 */
//exec_import();

/**********************/

/**
 * resets the Azure Redis Cache
 * WARNING: remember to backup and export (no script yet) the cache before resetting!
 */
// clear_redis_cache();

/**********************/