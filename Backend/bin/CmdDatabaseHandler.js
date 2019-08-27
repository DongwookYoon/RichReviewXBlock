class CmdDatabaseHandler {

    constructor(){
        RedisClient.get_instance().then((db_handler) => {
            this.db_handler = db_handler;
        });
    }



    static async get_instance() {
        if (this.instance)
            return this.instance;

        this.instance = await new CmdDatabaseHandler();
        return this.instance;
    }


    async does_cmd_exists (cmd_key) {
        return new Promise((resolve, reject) => {
            this.db_handler.client.exists(cmd_key, async (error, result) => {
                if (error) {
                    console.log(error);
                    reject(error);
                }

                resolve(result === 1);
            });
        })
    }


    async get_cmd_data (cmd_key, cmds_downloaded) {
        return new Promise((resolve, reject) => {
            this.db_handler.client.lrange(cmd_key, cmds_downloaded, -1, async (error, result) => {
                if (error) {
                    console.log(error);
                    reject(error);
                }

                let cmds = RedisToJSONParser.parse_data_to_JSON(result);

                resolve(cmds);
            });
        })
    }



    async update_cmd (cmd_key, cmd_str) {
        return new Promise((resolve, reject) => {
            this.db_handler.client.rpush(cmd_key, cmd_str, async (error, result) => {
                if (error) {
                    console.log(error);
                    reject(error);
                }

                resolve();
            });
        })
    }



    filter_deleted_cmds (cmds) {
        return cmds;
    }


    filter_edited_cmds (cmds) {

        let cmds_per_pid = {};

        for (let cmd of cmds) {
            let pid;

            if (cmd.data && cmd.data.pid)
                pid = cmd.data.pid;
            else if (cmd.target && cmd.target.pid)
                pid = cmd.target.pid;

            if (cmds_per_pid[pid] === undefined)
                cmds_per_pid[pid] = [];

            cmds_per_pid[pid].push(cmd);
        }

        for (let pid in cmds_per_pid) {
            cmds_per_pid[pid].sort((a, b) => {
                return new Date(b.time) - new Date(a.time);
            });
        }

        for (let pid in cmds_per_pid) {
            let cmds = cmds_per_pid[pid];

            let most_recent_change_found = false;
            for (let i = 0; i < cmds.length; i++) {
                let cmd = cmds[i];

                if (cmd.op === 'ChangeProperty' && most_recent_change_found)
                    cmds_per_pid[pid].splice(i--, 1);

                if (cmd.op === 'ChangeProperty' && !most_recent_change_found)
                    most_recent_change_found = true
            }
        }

        let new_cmds = [];

        for (let pid in cmds_per_pid) {
            new_cmds = new_cmds.concat(cmds_per_pid[pid]);
        }

        new_cmds = new_cmds.sort(function(a,b){
            return new Date(a.time) - new Date(b.time);
        });

        return new_cmds;
    }
}

module.exports = CmdDatabaseHandler;

const env = require('../env');
const AzureHandler = require('./AzureHandler');
const RedisClient = require("./RedisClient");
const KeyDictionary = require("./KeyDictionary");
const RedisToJSONParser = require("./RedisToJSONParser");
const UserDatabaseHandler = require("./UserDatabaseHandler");
const DocumentDatabaseHandler = require("./DocumentDatabaseHandler");
const NotAuthorizedError = require("../errors/NotAuthorizedError");



