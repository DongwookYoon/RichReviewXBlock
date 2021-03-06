/**
 * Initialize the redis client
 *
 *
 */

// import npm modules
const node_util = require('util');
const redis     = require('redis');
const assert    = require('chai').assert;
var Redlock     = require('redlock');

// import libraries
const env       = require('./env');
const util      = require('../util');

util.start("importing redis_client");

/**
 * switch redis client dependent on host
 */
let redisClient = null;
if(env.node_config.ENV === "production") {
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
   * Multipurpose locking mechanism for use by redis_utils.lock()
   * @type {Redlock}
   */
  const genLock = new Redlock( [redisClient], {
    driftFactor: 0.01,
    retryCount:  10,
    retryDelay:  200,
    retryJitter:  200
  });
  const genLockResource = 'lock:gen';
  var genLockTTL = 1000;
  
  /**
   * Makes a given function atomic.
   * @param {Object} thisArg - the argument to pass as this
   * @param {function} fn - the function to wrap with a lock
   * @returns {function} the atomic version of the function
   * TODO: test this function
   */
  pub.makeAtomic = (thisArg, fn) => {
    return function() {
      const myArguments = arguments;
      return genLock.lock(genLockResource, genLockTTL)
        .then(lock => {
          return fn.apply(thisArg, myArguments)
            .then((res) => { 
              return lock.unlock().then(() => { return res });
            });
        });
    }
  };

  /**
   * Graph is a bidirectional data structure implemented using hashes and stringified lists
   * Graph contains nodes and a list of the nodes that are adjacent to each node.
   * Each node in a graph can be queried (GraphGet) to find the nodes the node is adjacent to it
   * 
   * Example: suppose these are the nodes in the graph: A, B, C. 
   * A is connected to B; B is connected to C. Then in Redis,
   * 
   * Graph
   *  - A: [ B ]
   *  - B: [ A, C ]
   *  - C: [ B ]
   *
   * Calling GraphGet gives me on B gives me [ A, C ]; calling GraphSet on A and C changes the graph into:
   * 
   * Graph
   *  - A: [ B, C ]
   *  - B: [ A, C ]
   *  - C: [ A, B ]
   *  
   *  Calling GraphDel on B changes the graph into:
   *  
   *  Graph
   *  - A: [ C ]
   *  - C: [ A ]
   * 
   * The graph is primarily used to create a table that maps emails to user IDs that can be queryable.
   */

  /**
   * Locking mechanism is to ensure that graph setting
   * @type {Redlock}
   */
  const graphLock = new Redlock( [redisClient], {
      driftFactor: 0.01,
      retryCount:  10,
      retryDelay:  200,
      retryJitter:  200
    });
  const graphLockResource = 'lock:graph';
  var graphLockTTL = 1000;

  const isStringArr = (str) => {
    return /]$/.test(str) && /^\[/.test(str);
  };

  {/** initializing GraphSet **/
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
      } else { o = p; } return o;
    };

    const cb = (lock, graph, val1, val2) => {
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
          ])
        })
        .then(() => { return lock.unlock(); });
    };

    /**
     * GraphSet adds va1 and val2 to graph and sets as val2 to the list of values of val1, and sets val1 to the list of values for val2
     * @param graph
     * @param val1
     * @param val2
     * @returns {Promise}
     */
    pub.GraphSet = function(graph, val1, val2) {
      if(val1 === val2) return Promise.resolve();
      return graphLock.lock(graphLockResource, graphLockTTL)
        .then((lock) => {
          return cb(lock, graph, val1, val2);
        });
    }
  }/*********************/

  /**
   * Gets a list of all the nodes adjacent to val
   * @param {string} graph
   * @param {string} val
   * @returns {string[]} all the nodes adjacent to val
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
   * True if a node is in the graph
   * @param {string} graph
   * @param {string} val
   * @returns {Promise.<boolean>}
   */
  pub.GraphExists = function(graph, val) {
    return RedisClient.HGET(graph, val)
      .then((members) => {
        return !!members;
      });
  };

  {/** initializing GraphDel **/
    const remove_from_list = (graph, member, val) => {
      const exceptionMsg = `GraphDel: graph ${graph} is consistent`;
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

    const cb = (lock, graph, val) => {
      return RedisClient.HGET(graph, val)
        .then(members => {
          if(!members) { return Promise.resolve(0); }
          if(isStringArr(members)) { members = JSON.parse(members); }
          else { members = [members]; }
          const promises = members.map(member => { return remove_from_list(graph, member, val); });
          promises.push(RedisClient.HDEL(graph, val));
          return Promise.all(promises);
        }).then(() => { return lock.unlock(); })
    };

    /**
     *
     * @param graph
     * @param val
     * @returns {Promise}
     */
    pub.GraphDel = function(graph, val) {
      return graphLock.lock(graphLockResource, graphLockTTL)
        .then((lock) => {
          return cb(lock, graph, val);
        });
    };
  }/*********************/

  return pub;
})( );

exports.redisClient = redisClient;
exports.RedisClient = RedisClient;
