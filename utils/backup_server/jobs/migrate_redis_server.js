/**
 * TODO: not run yet, find time to run
 */

const helpers = require('../helpers');
const { log, log_error } = require('../helpers').makeLogs("MIGR REDIS");

const spawnLocalRedis  = require('../handlers/redis').spawnLocalRedis;
const RedisLocalClient = require('../handlers/redis').createRedisLocalClient();
const RedisCacheClient = require('../handlers/redis').createRedisCacheClient();
const localRedisClose  = require('../handlers/redis').localRedisClose;

const exec_migrate = () => {
  const FAILS = {
    hash: 0,
    list: 0,
    set: 0,
    string: 0,
    zset: 0,
    unknown: 0
  };
  const IMPORTED  = {
    hash: 0,
    list: 0,
    set: 0,
    string: 0,
    zset: 0,
  };
  const FAIL_ACC = [ ];

  /**
   * Recursive function to SCAN and run callback on all redis key entries.
   */
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
              //log(nextCursor);
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

  const setTTL = (entry) => {
    return RedisLocalClient.TTL(entry)
      .then((time /* @param {number} time */) => {
        if(time === -2) {
          throw "setting TTL but "+entry+" does not exist";
        } else if(time === -1) {
          return 1;
        } else {
          return RedisCacheClient.EXPIRE(entry, time);
        }
      });
  };

  const treatHash = (entry) => {
    return RedisLocalClient.HGETALL(entry)
      .then((data) => {
        const arr = [];
        Object.keys(data).forEach((key) => { arr.push(key, data[key]); });
        return RedisCacheClient.HMSET(entry, ...arr);
      })
      .then(setTTL.bind(null, entry))
      .then(b => {
        IMPORTED.hash++; // SUCCESS
        return 1;
      })
      .catch((err) => {
        log_error(entry+" "+err);
        FAILS.hash++; // FAIL
        FAIL_ACC.push(`${type}: ${entry}`);
        return 0;
      });
  };

  const treatList = (entry) => {
    return RedisLocalClient.LRANGE(entry, 0, -1)
      .then((arr /* @param {string[]} arr */) => {
        return RedisCacheClient.RPUSH.bind(null, entry).apply(null, arr);
        //return RedisLocalClient.RPUSH(entry, ...arr);
      })
      .then(setTTL.bind(null, entry))
      .then(b => {
        IMPORTED.list++; // SUCCESS
        return 1;
      })
      .catch((err) => {
        log_error(entry+" "+err);
        FAILS.list++; // FAIL
        FAIL_ACC.push(`${type}: ${entry}`);
        return 0;
      });
  };

  const treatSet = (entry) => {
    return RedisLocalClient.SMEMBERS(entry)
      .then((members /* @param {string[]} members */) => {
        return RedisCacheClient.SADD(entry, ...members);
      })
      .then(setTTL.bind(null, entry))
      .then(b => {
        IMPORTED.set++; // SUCCESS
        return 1;
      })
      .catch((err) => {
        log_error(entry+" "+err);
        FAILS.set++; // FAIL
        FAIL_ACC.push(`${type}: ${entry}`);
        return 0;
      });
  };

  const treatString = (entry) => {
    return RedisLocalClient.GET(entry)
      .then((value /* @param {string} value */) => {
        return RedisCacheClient.SET(entry, value);
      })
      .then(setTTL.bind(null, entry))
      .then(b => {
        IMPORTED.string++; // SUCCESS
        return 1;
      })
      .catch((err) => {
        log_error(entry+" "+err);
        FAILS.string++; // FAIL
        FAIL_ACC.push(`${type}: ${entry}`);
        return 0;
      });
  };

  const treatSortedSet = (entry) => {
    return RedisLocalClient.ZRANGE(entry, 0, -1, "WITHSCORES")
      .then((arr /* @param {string[]} arr */) => {
        let tmp = null;
        for(let i = 0; i < arr.length; i += 2) {
          tmp = arr[i + 1];
          arr[i + 1] = arr[i];
          arr[i] = tmp;
        }
        return RedisCacheClient.ZADD.bind(null,entry).apply(null, arr);
      })
      .then(setTTL.bind(null, entry))
      .then(b => {
        IMPORTED.zset++; // SUCCESS
        return 1;
      })
      .catch((err) => {
        log_error(entry+" "+err);
        FAILS.zset++; // FAIL
        FAIL_ACC.push(`${type}: ${entry}`);
        return 0;
      });
  };

  const cb_set = (entry, type) => {
    log(type+" "+entry);
    switch(type) {
      case "hash":
        return treatHash(entry);
      case "list":
        return treatList(entry);
      case "set":
        return treatSet(entry);
      case "string":
        return treatString(entry);
      case "zset":
        return treatSortedSet(entry);
      default:
        FAILS.unknown++; // FAIL
        FAIL_ACC.push(`${type}: ${entry}`);
        return Promise.resolve(0);
    }
  };

  const notify = () => {
    log("done exec_migrate");
  };

  log("starting exec_migrate");
  return exec(cb_set)
    .then(notify)
    .catch((err) => {
      log_error(err);
      return helpers.sendMail(
        "FAILED | Migrate Redis Cache", err
      );
    });
};

// ./redis-4.0.10/src/redis-server --port 8555 --dir ./redis_backup --dbfilename redis_backup.20180720130767.rdb
spawnLocalRedis({
  port: 8555,
  dir:  "./",
  dbfilename: "redis_migrate.rdb"
});

exec_migrate()
  .then(() => {
    return RedisCacheClient.quit();
  })
  .then(() => {
    return RedisLocalClient.quit();
  })
  .then(() => {
    return localRedisClose();
  });