var express = require('express');
var router = express.Router({mergeParams: true});
const CourseGroupDatabaseHandler = require('../bin/CourseGroupDatabaseHandler');
const UserDatabaseHandler = require('../bin/UserDatabaseHandler');
const KeyDictionary = require('../bin/KeyDictionary');


router.get('/', async function(req, res, next) {
    console.log("Get request for all groups in course with id: " + req.params.course_id);

    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params.course_id;

    let course_group_db_handler = await CourseGroupDatabaseHandler.get_instance();
    let user_db_handler = await UserDatabaseHandler.get_instance();

    try {
        let groups = await course_group_db_handler.get_all_course_groups(course_key);
        let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ groups: groups, permissions: permissions} ));
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
});



router.get('/all_user_course_groups', async function(req, res, next) {
    console.log("Get request for all groups in course with id: " + req.params.course_id);

    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_group_db_handler = await CourseGroupDatabaseHandler.get_instance();

    try {
        let course_groups = await course_group_db_handler.get_all_user_course_groups(user_key);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(course_groups));
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
});



router.get("/:group_id", async function (req, res, next){

    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_group_key = KeyDictionary.key_dictionary['course_group'] + req.params.group_id;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params.course_id;

    let course_group_db_handler = await CourseGroupDatabaseHandler.get_instance();
    let user_db_handler = await UserDatabaseHandler.get_instance();

    try {
        let groups = await course_group_db_handler.get_course_group(user_key, course_group_key, course_key);
        groups.permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(groups));
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
});

router.put("/", function (req, res, next){
    res.sendStatus(403);
});

router.put("/:group_id", function (req, res, next){
    res.sendStatus(501);
});

router.post("/", async function (req, res, next){
    let course_group_db_handler = await CourseGroupDatabaseHandler.get_instance();

    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];
    let course_group_data = req.body;

    if (course_group_data.length === 0) {
        res.sendStatus(200);
        return;
    }

    try {
        for (let course_group of course_group_data) {
            let course_group_key = KeyDictionary.key_dictionary['course_group'] + course_group['id'];

            course_group['members'] = course_group['members'].map((user) => {
               return KeyDictionary.key_dictionary['user'] + user.id;
            });

            if (course_group['id'].startsWith('placeholder') && !course_group['deleted'])
                await course_group_db_handler.create_course_group(user_key, course_key, {
                    name: course_group.group_name,
                    users: course_group['members'] });

            else if (!course_group['id'].startsWith('placeholder') && course_group['deleted'])
                await course_group_db_handler.delete_course_group(user_key,
                    course_key, course_group_key);

            else if (!course_group['id'].startsWith('placeholder')) {
                await course_group_db_handler.set_course_group_data(course_group_key, 'name', course_group['group_name']);

                let users = course_group['members'].map((user) => {
                    if (!user.includes(KeyDictionary.key_dictionary['user']))
                        return KeyDictionary.key_dictionary['user'] + user;
                    else
                        return user
                });

                await course_group_db_handler.set_course_group_data(course_group_key, 'users',
                    JSON.stringify(users));
            }
        }

        res.sendStatus(200);
    } catch (e) {
        console.warn(e);
        if (e.name === 'NotAuthorizedError')
            res.sendStatus(401);
        else
            res.sendStatus(500);
    }
});

router.post("/:group_id", function (req, res, next){
    res.sendStatus(403);
});

router.delete("/", function (req, res, next){
    res.sendStatus(403);
});

router.delete("/:group_id", async function (req, res, next){
    let course_group_db_handler = await CourseGroupDatabaseHandler.get_instance();

    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];
    let course_group_key = KeyDictionary.key_dictionary['course_group'] + req.params['group_id'];

    try {
        await course_group_db_handler.delete_course_group(user_key, course_key, course_group_key);
        res.sendStatus(200);
    } catch (e) {
        console.warn(e);
        if (e.name === 'NotAuthorizedError')
            res.sendStatus(401);
        else
            res.sendStatus(500);
    }
});


router.delete("/:group_id/permanently", async function (req, res, next){
    let course_group_db_handler = await CourseGroupDatabaseHandler.get_instance();

    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];
    let course_group_key = KeyDictionary.key_dictionary['course_group'] + req.params['group_id'];

    try {
        await course_group_db_handler.delete_course_group_permanently(user_key, course_key, course_group_key);
        res.sendStatus(200);
    } catch (e) {
        console.warn(e);
        if (e.name === 'NotAuthorizedError')
            res.sendStatus(401);
        else
            res.sendStatus(500);
    }
});

module.exports = router;