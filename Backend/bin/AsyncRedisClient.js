const asyncRedis = require('async-redis');
const env = require('../env');


class AsyncRedisClient {

    constructor() {}

    async init(){

        if(env.node_config && env.node_config.ENV === 'production') {
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
            let port = env.redis_config ? env.redis_config.port : 6379;
            this.client = asyncRedis.createClient(port);
        }

        this.client.on('connect', function() {
            console.log('AsyncRedis client connected');
        });

        this.client.on('error', function (err) {
            console.log('AsyncRedis: Something went wrong ' + err);
        });
    }



    static async get_instance() {
        if (this.instance)
            return this.instance;

        this.instance = new AsyncRedisClient();
        await this.instance.init();
        return this.instance;
    }
}

module.exports = AsyncRedisClient;
