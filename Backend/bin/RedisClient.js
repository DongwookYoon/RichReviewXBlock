var redis = require('redis');

class RedisClient {

    constructor(){
        this.client = redis.createClient(6379, '127.0.0.1');

        this.client.on('connect', function() {
            console.log('Redis client connected');
        });

        this.client.on('error', function (err) {
            console.log('Something went wrong ' + err);
        });
    }



    static async get_instance() {
        if (this.instance) {
            console.log('Database handler instance found');
            return this.instance;
        }

        this.instance = await new RedisClient();
        return this.instance;
    }
}

module.exports = RedisClient;