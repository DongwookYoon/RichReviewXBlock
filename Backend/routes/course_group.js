var express = require('express');
var router = express.Router({mergeParams: true});
const KeyDictionary = require('../bin/KeyDictionary');
const ImportHandler = require('../bin/ImportHandler');

router.get('/', async function(req, res, next) {
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params.course_id;

    let course_group_db_handler = await ImportHandler.course_group_db_handler;
    let user_db_handler = await ImportHandler.user_db_handler;

    try {
        let groups = await course_group_db_handler.get_all_course_groups(ImportHandler, course_key);
        let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ groups: groups, permissions: permissions} ));
    } catch (e) {
        console.log(e);
        res.status(500).send({
            message: e.message
        });
    }
});



router.get('/all_user_course_groups', async function(req, res, next) {
    console.log("Get request for all groups in course with id: " + req.params.course_id);

    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_group_db_handler = await ImportHandler.course_group_db_handler;
    let user_db_handler = await ImportHandler.user_db_handler;

    try {
        let course_groups = {};
        course_groups.groups = await course_group_db_handler.get_all_user_course_groups(ImportHandler, user_key);
        course_groups['user_name'] = await user_db_handler.get_user_name(user_key);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(course_groups));
    } catch (e) {
        console.log(e);
        res.status(500).send({
            message: e.message
        });
    }
});



router.get("/:group_id", async function (req, res, next){

    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_group_key = KeyDictionary.key_dictionary['course_group'] + req.params.group_id;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params.course_id;

    let course_group_db_handler = await ImportHandler.course_group_db_handler;
    let user_db_handler = await ImportHandler.user_db_handler;
    let course_db_handler = await ImportHandler.course_db_handler;

    try {
        let groups = await course_group_db_handler.get_course_group(ImportHandler, user_key, course_group_key, course_key);
        groups.permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);
        groups.course = (await course_db_handler.get_course_data(course_key))['title'];
        groups['user_name'] = await user_db_handler.get_user_name(user_key);

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(groups));
    } catch (e) {
        console.log(e);
        res.status(500).send({
            message: e.message
        });
    }
});

router.put("/", function (req, res, next){
    res.sendStatus(403);
});

router.put("/:group_id", function (req, res, next){
    res.sendStatus(501);
});

router.post("/", async function (req, res, next){
    let course_group_db_handler = await ImportHandler.course_group_db_handler;

    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];
    let course_group_sets = req.body;

    try {
        await course_group_db_handler.update_course_group_sets(ImportHandler, user_key, course_key, course_group_sets);

        res.sendStatus(200);
    } catch (e) {
        console.warn(e);
        if (e.name === 'NotAuthorizedError')
            res.status(401).send({
                message: e.message
            });
        else
            res.status(500).send({
                message: e.message
            });
    }
});

router.post("/:group_id", function (req, res, next){
    res.sendStatus(403);
});

router.delete("/", function (req, res, next){
    res.sendStatus(403);
});

router.delete("/:group_id", async function (req, res, next){
    let course_group_db_handler = await ImportHandler.course_group_db_handler;

    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];
    let course_group_key = KeyDictionary.key_dictionary['course_group'] + req.params['group_id'];

    try {
        await course_group_db_handler.delete_course_group(ImportHandler, user_key, course_key, course_group_key);
        res.sendStatus(200);
    } catch (e) {
        console.warn(e);
        if (e.name === 'NotAuthorizedError')
            res.status(401).send({
                message: e.message
            });
        else
            res.status(500).send({
                message: e.message
            });
    }
});


router.delete("/:group_id/permanently", async function (req, res, next){
    let course_group_db_handler = await ImportHandler.course_group_db_handler;

    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];
    let course_group_key = KeyDictionary.key_dictionary['course_group'] + req.params['group_id'];

    try {
        if(!course_group_key.includes('placeholder'))
        await course_group_db_handler.delete_course_group_permanently(ImportHandler, user_key, course_key, course_group_key);
        res.sendStatus(200);
    } catch (e) {
        console.warn(e);
        if (e.name === 'NotAuthorizedError')
            res.status(401).send({
                message: e.message
            });
        else
            res.status(500).send({
                message: e.message
            });
    }
});

module.exports = router;