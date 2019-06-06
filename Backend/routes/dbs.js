var express = require('express');
var router = express.Router();
const CourseDatabaseHandler = require("../bin/CourseDatabaseHandler");
const UserDatabaseHandler = require("../bin/UserDatabaseHandler");
const GradesDatabaseHandler = require("../bin/GradesDatabaseHandler");
const DocumentDatabaseHandler = require("../bin/DocumentDatabaseHandler");
const GroupDatabaseHandler = require("../bin/GroupDatabaseHandler");
const CmdDatabaseHandler = require("../bin/CmdDatabaseHandler");
const LogDatabaseHandler = require("../bin/LogDatabaseHandler");
const KeyDictionary = require("../bin/KeyDictionary");
const AzureHandler = require("../bin/AzureHandler");

/*
 ** GET all courses
 */
router.get('/getmyself', async function(req, res, next) {
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;

    let user_db_handler = await UserDatabaseHandler.get_instance();

    try {
        let user_data = await user_db_handler.get_user_data(user_key);

        if (user_data) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(user_data));
        }
        else
            res.sendStatus(401);

    } catch (e) {
        console.warn(e);
        if (e.name === 'NotAuthorizedError')
            res.sendStatus(401);
        else
            res.sendStatus(500);
    }
});



router.get('/getgroupdata/:group_id', async function(req, res, next) {
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let group_key = KeyDictionary.key_dictionary['group'] + req.params['group_id'];

    let group_db_handler = await GroupDatabaseHandler.get_instance();
    let user_db_handler = await UserDatabaseHandler.get_instance();

    try {
        let group_data = await group_db_handler.get_group_data(group_key);

        let invited = group_data['users']['invited'];
        let users = group_data['users']['participating'];

        invited = await Promise.all(invited.map(async (user) => {
            return await user_db_handler.get_user_data(KeyDictionary.key_dictionary['user'] + user);
        }));

        users = await Promise.all(users.map(async (user) => {
            return await user_db_handler.get_user_data(KeyDictionary.key_dictionary['user'] + user);
        }));

        let data = {
            group: group_data,
            invited: invited,
            users: users
        };
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));

    } catch (e) {
        console.warn(e);
        if (e.name === 'NotAuthorizedError')
            res.sendStatus(401);
        else
            res.sendStatus(500);
    }
});



router.get('/getuploadsas', async function (req, res, next) {

    let azure_handler = await AzureHandler.get_instance();
    let file_name = `audio/${req.query.fname}.wav`;
    file_name = file_name.replace(':', '_');

    let sas = azure_handler.get_sas('data', file_name, 300);

    let data = {
        sas: sas,
        url: `${azure_handler.BLOB_HOST}data/${file_name}`
    };
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
});



router.put('/', function(req, res, next) {
    res.sendStatus(403);
});



router.post('/downloadcmds', async function(req, res, next) {
    let cmd_db_handler = await CmdDatabaseHandler.get_instance();
    let group_db_handler = await GroupDatabaseHandler.get_instance();

    let cmd_key = KeyDictionary.key_dictionary['command'] + req.body.groupid_n;
    let group_key = req.body.groupid;

    try {
        let resp = {};

        let cmd_data = await cmd_db_handler.get_cmd_data(cmd_key, req.body.cmds_downloaded_n);

        cmd_data = cmd_db_handler.filter_deleted_cmds(cmd_data);
        cmd_data = cmd_db_handler.filter_edited_cmds(cmd_data);

        resp.cmds = cmd_data;

        let group_user_count = await group_db_handler.get_number_of_users(group_key);
        let group_update = null;

        if (group_user_count.toString() !== req.body.cur_members_n)
            group_update = await group_db_handler.get_group_data(group_key);

        resp.group_update = group_update;

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(resp));

    } catch (e) {
        console.warn(e);
        if (e.name === 'NotAuthorizedError')
            res.sendStatus(401);
        else
            res.sendStatus(500);
    }
});


router.post('/webapplogs', async function(req, res, next) {

    let log_db_handler = await LogDatabaseHandler.get_instance();
    let log_key = 'log:' + req.body.group_n;
    let logs = JSON.parse(req.body.logs);

    try {

        if (Array.isArray(logs))
            await log_db_handler.update_logs(log_key, logs);
        else
            await log_db_handler.update_log(log_key, JSON.stringify(logs));

        res.sendStatus(200);

    } catch (e) {
        console.warn(e);
        if (e.name === 'NotAuthorizedError')
            res.sendStatus(401);
        else
            res.sendStatus(500);
    }
});


router.post('/uploadcmd', async function(req, res, next) {

    let cmd_key = KeyDictionary.key_dictionary['command'] + req.body.groupid_n;

    let cmd_db_handler = await CmdDatabaseHandler.get_instance();

    try {

        await cmd_db_handler.update_cmd(cmd_key, req.body.cmd);
        res.sendStatus(200);

    } catch (e) {
        console.warn(e);
        if (e.name === 'NotAuthorizedError')
            res.sendStatus(401);
        else
            res.sendStatus(500);
    }
});



router.delete('/', function(req, res, next) {
    res.sendStatus(403);
});



module.exports = router;
