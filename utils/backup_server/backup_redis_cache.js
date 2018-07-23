/**
 * Node worker that:
 * 1) spawns a child shell process running portable redis server
 * 2) migrates keys from the Azure Redis Cache to this redis server
 * 3) saves data in redis server as a backup .rdb file
 * 4) backup is `redis_backup.[TIMESTAMP].rdb`
 *
 * To launch the managing redis server independently call
 *
 * ./redis-4.0.10/src/redis-server ./redis.conf
 * ./redis-4.0.10/src/redis-cli -p 8555
 *
 * To check backup set the db file name to the the backup file you want to check
 *
 * ./redis-4.0.10/src/redis-server --port 8555 --dir ./ --dbfilename redis_backup.20180720130767.rdb
 *
 * TODO: getting message "6760:M 20 Jul 13:44:53.709 # There is a child saving an .rdb. Killing it!" so I disabled autosave. Double check.
 *
 * Created by Colin
 */

const child_process = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');

const moment = require('moment');
const redis = require('redis');

const redis_config = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../..', 'richreview_core/node_server/ssl/redis_config.json'), 'utf-8')
);

const REDIS_CACHE_KEY = redis_config.redis_cache.access_key;
const REDIS_CACHE_HOSTNAME = redis_config.redis_cache.hostname;
const REDIS_CACHE_PORT = redis_config.redis_cache.port;
const LOCAL_REDIS_PORT = 8555;
const REDIS_PATH = __dirname + '/redis-4.0.10/';

const log = function(stmt) {
  console.log("<BACKUP REDIS CACHE>: "+stmt);
};

const log_error = function(stmt) {
  console.error("<ERR>: "+stmt);
};

/**
 * spawn the redis server to to handle the downloading of redis keys.
 *
 * To launch this server independently call
 *
 * ./redis-4.0.10/src/redis-server ./redis-4.0.10/redis.conf
 * ./redis-4.0.10/src/redis-cli -p 8555
 *
 */
log("DEBUG: spawning from "+REDIS_PATH);
const redisSpawn = child_process.spawn(
    REDIS_PATH + 'src/redis-server',
    [__dirname + '/' + 'redis.conf']
);

const redisLocalClient = redis.createClient(LOCAL_REDIS_PORT);
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
/*******************************************************/
const promisifyRedisClient = function(client) {
    const pub = { };
    Object.keys(redis.RedisClient.prototype).forEach((command) => {
        pub[command] = util.promisify(client[command]).bind(client);
    });
    return pub;
};
/*******************************************************/
const RedisLocalClient = promisifyRedisClient(redisLocalClient);
const RedisCacheClient = promisifyRedisClient(redisCacheClient);

/**
 * Unit test to test redis hash operations
 */
const testHash = () => {
  log("starting test_backup_hash");
  return RedisLocalClient.HMSET("test", "key1", "val1", "key2", "val2", "key3", "val3")
    .then((b) => {
      log(b);
      return RedisLocalClient.HGETALL("test");
    })
    .then((data) => {
      console.log(JSON.stringify(data, null, '\t'));
      return null;
    })
    .then((b) => {
      return RedisLocalClient.DEL("test");
    })
    .then((b) => {
      log("done");
      return true;
    })
    .catch((err) => {
      log(err);
    });
};

/**
 * Unit test to test redis list operations
 */
const testList = () => {
  util.debug("starting test_migration_list");
  return RedisCacheClient.RPUSH("test", "val1", "val2", "val3", "val4")
    .then((b) => {
      return RedisCacheClient.LRANGE("test", 0, -1);
    })
    .then((arr) => {
      log("in cache redis: "+JSON.stringify(arr));
      return RedisLocalClient.RPUSH.bind(null, "test").apply(null, arr);
    })
    .then((b) => {
      return RedisLocalClient.LRANGE("test", 0, -1);
    })
    .then((arr) => {
      log("in local redis: "+JSON.stringify(arr));
      return RedisLocalClient.DEL("test");
    })
    .then((b) => {
      return RedisCacheClient.DEL("test");
    })
    .then((b) => {
      return true;
    })
    .catch((err) => {
      util.error(err);
    });
};

/**
 * Unit test to test redis string operations
 */
const testString = () => {
  log("starting test_backup_hash");
  return RedisCacheClient.SET("test", "1", "EX", 9999)
    .then(b => {
      return RedisCacheClient.INCRBY("test", 10);
    })
    .then(b => {
      return Promise.all([
        RedisCacheClient.GET("test"),
        RedisCacheClient.TTL("test")
      ]);
    })
    .then(([val, time]) => {
      log("val: "+typeof val+" "+val);
      log("time: "+typeof time+" "+time);
      return RedisCacheClient.DEL("test");
    })
    .then(val => {
      log("del val: "+typeof val+" "+val);
      return true;
    })
    .catch(err => {
      log_error(err);
    });
};

/**
 * Unit test to test redis set operations
 */
const testSet = () => {
  log("starting test_backup_set");
  return RedisCacheClient.SADD("test", "value1", "value2", "value3", "value4")
    .then(b => {
      return RedisCacheClient.SMEMBERS("test");
    })
    .then((members /* @param {string[]} members */) => {
      log(typeof members);
      console.log(JSON.stringify(members, null, '\t'));
      return RedisLocalClient.SADD("test", ...members);
    })
    .then(b => {
      return RedisLocalClient.SMEMBERS("test");
    })
    .then((members /* @param {string[]} members */) => {
      log(typeof members);
      console.log(JSON.stringify(members, null, '\t'));
      return RedisCacheClient.DEL("test");
    })
    .then(b => {
      log("del val: "+typeof b+" "+b);
      return RedisLocalClient.DEL("test");
    })
    .then(b => {
      log("del val: "+typeof b+" "+b);
      return true;
    })
    .catch(err => {
      log_error(err);
    });
};

/**
 * Unit test to test redis sorted set operations
 */
const testSortedSet = () => {
  return RedisCacheClient.ZADD("test", 1, "val1", 2, "val2", 3, "val3", 4, "val4")
    .then(b => {
      return RedisCacheClient.ZRANGE("test", 0, -1, "WITHSCORES");
    })
    .then(arr => {
      let tmp = null;
      for(let i = 0; i < arr.length; i += 2) {
         tmp = arr[i + 1];
         arr[i + 1] = arr[i];
         arr[i] = tmp;
      }
      log("in cache redis: "+JSON.stringify(arr));
      return RedisLocalClient.ZADD.bind(null,"test").apply(null, arr);
    })
    .then(b => {
      return RedisLocalClient.ZRANGE("test", 0, -1, "WITHSCORES");
    })

    .then(arr => {
      log("in local redis: "+JSON.stringify(arr));
      return RedisLocalClient.TYPE("test");
    })
    .then(type => {
      log(type);
      return RedisCacheClient.DEL("test");
    })
    .then(b => {
      return RedisLocalClient.DEL("test");
    })
    .then(b => {
      return true;
    })
    .catch(err => {
      log_error(err);
    });
};

/**
 * Handler that copies up all keys in Azure Redis Cache to the local redis server booted by redisSpawn child process; please check that there are no FAILS after exec_backup is complete.
 * MUTATION: Local redis server in redisSpawn gets populated by by keys in Azure Redis Cache
 * ASYNCHRONOUS
 * TODO: a race condition can theoretically happen if exec_backup happens before redisSpawn is initialized
 */
const exec_backup = () => {
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

  /**
   * Recursive function to SCAN and run callback on all redis key entries.
   */
  const exec = (cb) => {
    const treat_entry = (entry) => {
      return RedisCacheClient.TYPE(entry).then(cb.bind(null, entry));
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
    return RedisCacheClient.TTL(entry)
      .then((time /* @param {number} time */) => {
        if(time === -2) {
          throw "setting TTL but "+entry+" does not exist";
        } else if(time === -1) {
          return 1;
        } else {
          return RedisLocalClient.EXPIRE(entry, time);
        }
      });
  };

  const treatHash = (entry) => {
    return RedisCacheClient.HGETALL(entry)
      .then((data) => {
        const arr = [];
        Object.keys(data).forEach((key) => { arr.push(key, data[key]); });
        return RedisLocalClient.HMSET(entry, ...arr);
      })
      .then(setTTL.bind(null, entry))
      .then(b => {
        IMPORTED.hash++; // SUCCESS
        return 1;
      })
      .catch((err) => {
        log_error(entry+" "+err);
        FAILS.hash++; // FAIL
        return 0;
      });
  };

  const treatList = (entry) => {
    return RedisCacheClient.LRANGE(entry, 0, -1)
      .then((arr /* @param {string[]} arr */) => {
        return RedisLocalClient.RPUSH.bind(null, entry).apply(null, arr);
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
        return 0;
      });
  };

  const treatSet = (entry) => {
    return RedisCacheClient.SMEMBERS(entry)
      .then((members /* @param {string[]} members */) => {
        return RedisLocalClient.SADD(entry, ...members);
      })
      .then(setTTL.bind(null, entry))
      .then(b => {
        IMPORTED.set++; // SUCCESS
        return 1;
      })
      .catch((err) => {
        log_error(entry+" "+err);
        FAILS.set++; // FAIL
        return 0;
      });
  };

  const treatString = (entry) => {
    return RedisCacheClient.GET(entry)
      .then((value /* @param {string} value */) => {
        return RedisLocalClient.SET(entry, value);
      })
      .then(setTTL.bind(null, entry))
      .then(b => {
        IMPORTED.string++; // SUCCESS
        return 1;
      })
      .catch((err) => {
        log_error(entry+" "+err);
        FAILS.string++; // FAIL
        return 0;
      });
  };

  const treatSortedSet = (entry) => {
    return RedisCacheClient.ZRANGE(entry, 0, -1, "WITHSCORES")
      .then((arr /* @param {string[]} arr */) => {
        let tmp = null;
        for(let i = 0; i < arr.length; i += 2) {
          tmp = arr[i + 1];
          arr[i + 1] = arr[i];
          arr[i] = tmp;
        }
        return RedisLocalClient.ZADD.bind(null,entry).apply(null, arr);
      })
      .then(setTTL.bind(null, entry))
      .then(b => {
        IMPORTED.zset++; // SUCCESS
        return 1;
      })
      .catch((err) => {
        log_error(entry+" "+err);
        FAILS.zset++; // FAIL
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
        return Promise.resolve(0);
    }
  };

  return exec(cb_set)
    .then((b) => {
      log("imported keys:");
      console.log(JSON.stringify(IMPORTED, null, '\t'));
      log("missing keys:");
      console.log(JSON.stringify(FAILS, null, '\t'));
      return null;
    })
    .catch((err) => {
      log_error(err);
    });
};

/**
 * Handler calls asynchronous save on local redis server (redisSpawn) and waits until save is complete.
 * MUTATION: dump.rdb stores all redis keys from Azure Redis Cache
 * ASYNCHRONOUS
 */
const saveLocalServer = () => {
  let lastSave = null;

  const waitUntilSave = (resolve, reject) => {
    log("waiting");
    if(resolve) { // check at 500ms intervals
      RedisLocalClient.LASTSAVE()
        .then((ls) => {
          if(lastSave === ls) {
            log("saved backup data");
            resolve(true);
          } else {
            setTimeout(waitUntilSave, 500, resolve, reject);
          }
        });
    } else { // first time call
      return new Promise((resolve2, reject2) => {
        waitUntilSave(resolve2, reject2);
      });
    }
  };

  log("saving backup data asynchronously");
  return RedisLocalClient.LASTSAVE()
    .then((ls) => {
      lastSave = ls;
      return RedisLocalClient.BGSAVE();
    })
    .then(waitUntilSave.bind(null, null, null));
};

/**
 * Handler tells local redis server (redisSpawn) to shut down.
 * ASYNCHRONOUS
 */
const redisClose = () => {
    return new Promise((resolve, reject) => {
        child_process.execFile(
            REDIS_PATH + 'src/redis-cli',
            ['-p', '8555', 'shutdown'],
            (error, stdout, stderr) => {
                if(error) { reject(error); }
                if(stdout) { log(stdout); }
                resolve(true);
            }
        );
    });
};

/**
 * Handler calls manage.sh to name dump.rdb as unique DB snapshot with timestamp
 * ASYNCHRONOUS
 */
const manageDumpScript = () => {
  const DATE_LINE = moment().format('YYYYMMDDHHMMSS');
  return new Promise((resolve, reject) => {
    child_process.execFile(
      __dirname + '/' + 'manage.sh',
      [DATE_LINE],
      {
        cwd: __dirname
      },
      (error, stdout, stderr) => {
        if(error) { reject(error); }
        if(stdout) { log(stdout); }
        resolve(true);
      }
    )
  });
};

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

exec_backup()
  .then(b => {
    return RedisCacheClient.quit();
  })
  .then(b => {
    return saveLocalServer();
  })
  .then(b => {
    return new Promise((resolve) => {
      setTimeout(resolve, 1000, true);
    });
  })
  .then(b => {
    return RedisLocalClient.quit();
  })
  .then(b => {
    return redisClose();
  })
  .then(b => {
    return manageDumpScript();
  })
  .catch(err => {
    log_error(err);
  });
