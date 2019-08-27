const asyncRedis = require('async-redis');
const env = require('../env');


class AsyncRedisClient {

    constructor(){

        if(env.node_config.ENV === 'production') {
            console.log('using redis cache for RichReview CA VM');
            this.client = asyncRedis.createClient(
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
            console.log('using local redis server');
            this.client = asyncRedis.createClient(env.redis_config.port);
        }

        this.client.on('connect', function() {
            console.log('AsyncRedis client connected');
        });

        this.client.on('error', function (err) {
            console.log('AsyncRedis: Something went wrong ' + err);
        });
    }



    static async get_instance() {
        if (this.instance) {
            console.log('AsyncDatabase handler instance found');
            return this.instance;
        }

        this.instance = await new AsyncRedisClient();
        return this.instance;
    }
}

module.exports = AsyncRedisClient;
