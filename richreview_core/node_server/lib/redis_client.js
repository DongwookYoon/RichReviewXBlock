/**
 * Initialize the redis client
 *
 *
 */

// import npm modules
const node_util = require('util');
const redis = require('redis');
const assert     = require('chai').assert;

// import libraries
const env = require('./env');
const util = require('../util');

/**
 * switch redis client dependent on host
 */
let redisClient = null;

if(process.env.NODE_ENV === 'production') {
  if(process.env.HOSTNAME === env.node_config.RICHREVIEW_CA_VM) {
    util.start("using redis cache for RichReview CA VM");
    redisClient = redis.createClient(
      env.redis_config.redis_cache.port,
      env.redis_config.redis_cache.hostname,
      {
        auth_pass: env.redis_config.redis_cache.access_key,
        tls: {
            servername: env.redis_config.redis_cache.hostname
        }
      }
    );
  } else if(process.env.HOSTNAME === env.node_config.RICHREVIEW_VM) {
    util.start("using remote redis server for RichReview VM");
    redisClient = redis.createClient(env.redis_config.port, env.redis_config.url);
    redisClient.auth(env.redis_config.auth);
  } else {
      util.error("cannot create redis client: unknown production environment");
  }
} else {
  util.start("using local redis server");
  redisClient = redis.createClient(env.redis_config.port);
}

/**
 * Set error handler
 */
redisClient.on('error', function(err) {
    util.error(err);
});

/**
 * Ping server periodically
 */
let ping_timeout = null;
(function PingRedisServer() {
    redisClient.ping(redis.print);
    ping_timeout = setTimeout(PingRedisServer, 3*60*1000);
} ( ));

/**
 * Promisify all redis prototype functions including Redis commands
 */
const promisifyRedisClient = function(client) {
  const pub = { };

  Object.keys(redis.RedisClient.prototype).forEach((command) => {
    pub[command] = node_util.promisify(client[command]).bind(client);
  });

  pub.end = function(flush) {
    clearTimeout(ping_timeout);
    redisClient.end(flush);
  };

  pub.quit = function() {
    clearTimeout(ping_timeout);
    redisClient.quit();
  };

  return pub;
};

const RedisClient = promisifyRedisClient(redisClient);


exports.util = (function () {
  const pub = { };

  pub.keyExists = function(key) {
    return RedisClient.EXISTS(key)
      .then((b) => { return b === 1; });
  };

    pub.isMember  = function(key, value) {
      return RedisClient.SISMEMBER(key, value)
        .then((b) => { return b === 1; });
    };

    /**
     * Graph is a bidirectional data structure implemented using hashes and stringified lists
     * Each node in a graph can be queried (GraphGet) to find the nodes the node is adjacent to
     */
  const isStringArr = (str) => {
    return /]$/.test(str) && /^\[/.test(str);
  };

  /**
   *
   * @param graph
   * @param val1
   * @param val2
   * @returns {Promise}
   * WARNING: GraphSet is NOT atomic and should only be called one at time
   * TODO: make GraphSet atomic
   * (https://www.npmjs.com/package/redlock)
   */
    pub.GraphSet = function(graph, val1, val2) {

      /**
       * @param {string|null} o - either a string, stringified array or null
       * @param {string} p - the value to put in o
       * @returns {string} - a string or stringified array containing p
       */
      const mmk = (o, p) => {
        if(o) {
          if(isStringArr(o)) {
            let oo = JSON.parse(o);
            if(!oo.includes(p)) { oo.push(p); o = JSON.stringify(oo); }
          } else {
            if(o !== p) { let oo = [o]; oo.push(p); o = JSON.stringify(oo); }
          }
        } else {
          o = p;
        }
        return o;
      };

      return Promise.all([
        RedisClient.HGET(graph, val1),
        RedisClient.HGET(graph, val2)
      ])
        .then(([val1s, val2s]) => {
          val1s = mmk(val1s, val2);
          val2s = mmk(val2s, val1);
          return Promise.all([
            RedisClient.HSET(graph, val1, val1s),
            RedisClient.HSET(graph, val2, val2s)
          ]);
        });
    };

  /**
   *
   * @param {string} graph
   * @param {string} val
   * @returns {string[]} the members associated with val
   */
    pub.GraphGet = function(graph, val) {
      return RedisClient.HGET(graph, val)
        .then((members) => {
          if(members) {
            if(isStringArr(members)) {
              return JSON.parse(members);
            } else {
              return [members];
            }
          } else {
            return [ ];
          }
        });
    };

  /**
   *
   */
  pub.GraphExists = function(graph, val) {
    return RedisClient.HGET(graph, val)
      .then((members) => {
        if(members) { return true; }
        else { return false; }
      });
  };

  /**
   *
   * @param graph
   * @param val
   * @returns {Promise}
   * WARNING: GraphDel is NOT atomic and should only be called one at time
   * TODO: make GraphDel atomic
   * (https://www.npmjs.com/package/redlock)
   */
    pub.GraphDel = function(graph, val) {
      const exceptionMsg = `GraphDel: graph ${graph} is not consistent`;
      const remove_from_list = (member, val) => {
        return RedisClient.HGET(graph, member)
          .then((o) => {
            assert.isOk(o, exceptionMsg);
            if(isStringArr(o)) {
              o = JSON.parse(o);
              assert.isAbove(o.length, 1, exceptionMsg);
              const i = o.indexOf(val);
              assert.notStrictEqual(i,-1, exceptionMsg);
              if(o === 2) { o = o[1-i]; } else { o.splice(i, 1); o = JSON.stringify(o); }
              return RedisClient.HSET(graph, member, o);
            } else {
              assert.strictEqual(o, val, exceptionMsg);
              return RedisClient.HDEL(graph, member);
            }
          });
      };

      return RedisClient.HGET(graph, val)
        .then(members => {
          if(!members) { return Promise.resolve(0); }
          if(isStringArr(members)) { members = JSON.parse(members); }
          else { members = [members]; }
          const promises = members.map(member => { return remove_from_list(member, val); });
          promises.push(RedisClient.HDEL(graph, val));
          return Promise.all(promises);
        });
    };

    return pub;
} ( ));

exports.redisClient = redisClient;
exports.RedisClient = RedisClient;
