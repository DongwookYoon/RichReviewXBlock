const RedisClient = require("./RedisClient");

class DatabaseHandler {

    constructor(){
        RedisClient.get_instance().then((db_handler) => {
            this.db_handler = db_handler;
        });
    }



    static async get_instance() {
        if (this.instance)
            return this.instance;

        this.instance = await new DatabaseHandler();
        return this.instance;
    }
}

module.exports = DatabaseHandler;