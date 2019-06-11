class LogDatabaseHandler {

    constructor(){
        RedisClient.get_instance().then((db_handler) => {
            this.db_handler = db_handler;
        });
    }



    static async get_instance() {
        if (this.instance) {
            console.log('Database handler instance found');
            return this.instance;
        }

        this.instance = await new LogDatabaseHandler();
        return this.instance;
    }



    async update_logs (log_key, logs) {
        for (let log of logs) {
            await this.update_log(log_key, JSON.stringify(log));
        }
    }



    async update_log (log_key, log_str) {
        return new Promise((resolve, reject) => {
            this.db_handler.client.rpush(log_key, log_str, async (error, result) => {
                if (error) {
                    console.log(error);
                    reject(error);
                }

                resolve();
            });
        })
    }


    async get_logs (log_key) {
        return new Promise((resolve, reject) => {
            console.log('Redis request to key: ' + log_key);
            this.db_handler.client.lrange(log_key, 0, -1, async (error, result) => {
                if (error) {
                    console.log(error);
                    reject(error);
                }
                console.log('GET result -> ' + { result });

                let logs = RedisToJSONParser.parse_data_to_JSON(result);

                resolve(logs);
            });
        })
    }
}

module.exports = LogDatabaseHandler;

const env = require('../env');
const AzureHandler = require('./AzureHandler');
const RedisClient = require("./RedisClient");
const KeyDictionary = require("./KeyDictionary");
const RedisToJSONParser = require("./RedisToJSONParser");
const UserDatabaseHandler = require("./UserDatabaseHandler");
const DocumentDatabaseHandler = require("./DocumentDatabaseHandler");
const NotAuthorizedError = require("../errors/NotAuthorizedError");



