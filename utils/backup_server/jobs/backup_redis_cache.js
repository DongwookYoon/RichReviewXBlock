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
 * ./redis-4.0.10/src/redis-server --port 8555 --dir ./redis_backup --dbfilename redis_backup.20180720130767.rdb
 *
 * Created by Colin
 */

/**
 * TODO: delete header, import redis handler, and retest
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

const log = function(stmt) {
  console.log("<BACKUP REDIS CACHE>: "+stmt);
};

const log_error = function(err) {
  if(err instanceof Error) { err = `${err.code}: ${err.message}`; }
  console.error("<BACKUP REDIS ERR>: "+err);
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
    path.join(REDIS_PATH, 'src/redis-server'),
    [path.join(__dirname, '..', 'redis.conf')]
);

const redisLocalClient = redis.createClient(
  env.redis_config.backup_port
);
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
  const FAIL_ACC = [ ];

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
        FAIL_ACC.push(`${type}: ${entry}`);
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
        FAIL_ACC.push(`${type}: ${entry}`);
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
        FAIL_ACC.push(`${type}: ${entry}`);
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
        FAIL_ACC.push(`${type}: ${entry}`);
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
    log("backup keys:");
    console.log(JSON.stringify(IMPORTED, null, '\t'));
    log("missing keys:");
    console.log(JSON.stringify(FAILS, null, '\t'));
    log("Sending email update...");
    let message = `Redis backup imported:\n${IMPORTED.set} sets,\n${IMPORTED.list} lists,\n${IMPORTED.hash} hashes,\n${IMPORTED.string} strings,\n${IMPORTED.zset} sorted sets\n\n`;
    if(FAIL_ACC.length > 0) {
      message += `some keys failed! Fail count:\n${FAILS.set} sets,\n${FAILS.list} lists,\n${FAILS.hash} hashes,\n${FAILS.string} strings,\n${FAILS.zset} sorted sets\n\nThese keys did not back up:\n`;
      const iterLength = Math.min(FAIL_ACC.length, 30);
      for(let i = 0; i < iterLength; i++) {
        message += `${FAIL_ACC[i]}\n`
      }
    }
    return helpers.sendMail(
      "COMPLETE | Backup Redis Cache", message
    );
  };

  log("starting exec_backup");
  return exec(cb_set)
    .then(notify)
    .catch((err) => {
      log_error(err);
      return helpers.sendMail(
        "FAILED | Backup Redis Cache", err
      );
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

/**
 * Handler calls manage.sh to name dump.rdb as unique DB snapshot with timestamp
 * ASYNCHRONOUS
 */
const manageDumpScript = () => {
  const DATE_LINE = moment().format('YYYYMMDDHHMMSS');
  return new Promise((resolve, reject) => {
    child_process.execFile(
      path.join(__dirname, '..', 'scripts/manage_redis.sh'),
      [DATE_LINE],
      {
        cwd: path.join(__dirname, '..')
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
    return helpers.sendMail(
      "System error | Backup Redis Cache", err
    );
  });
