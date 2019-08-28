var express = require('express');
var router = express.Router({mergeParams: true});

const KeyDictionary = require('../bin/KeyDictionary');
const ImportHandler = require("../bin/ImportHandler");

/*
 ** GET all course users
 */
router.get('/', async function(req, res, next) {
    console.log("Get request for all people in course with id: " + req.params.course_id);
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params.course_id;

    let user_db_handler = await ImportHandler.user_db_handler;
    let course_group_db_handler = await ImportHandler.course_group_db_handler;
    let course_db_handler = await ImportHandler.course_db_handler;

    try {
        let users = await user_db_handler.get_all_course_users(
            ImportHandler,
            course_key);
        users['students'] = users['students'].map(user => { return { name: user.name }});
        users['tas'] = users['tas'].map(user => { return { name: user.name }});
        users['instructors'] = users['instructors'].map(user => { return { name: user.name }});

        let groups = (await course_group_db_handler.get_all_course_groups(ImportHandler, course_key)).active_course_groups;
        let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);

        let course_data = await course_db_handler.get_course_data(course_key);

        let data = { users: users, groups: groups, permissions: permissions, course_title: course_data['title'] };
        data.user_name = await user_db_handler.get_user_name(user_key);

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
    } catch (e) {
        console.log(e);
        res.status(500).send({
            message: e.message
        });
    }
});


/*
 ** GET all unassigned course users
 */
router.get('/unassigned', async function(req, res, next) {
    console.log("Get request for all people in course with id: " + req.params.course_id);
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params.course_id;

    let user_db_handler = await ImportHandler.user_db_handler;
    let course_group_db_handler = await ImportHandler.course_group_db_handler;
    let course_db_handler = await ImportHandler.course_db_handler;

    try {
        const course_group_sets = await course_group_db_handler.get_all_course_group_sets(ImportHandler, course_key);

        let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);

        let course_data = await course_db_handler.get_course_data(course_key);

        const all_students = await Promise.all(course_data['active_students'].map(async (student) => {
            let user_data = await user_db_handler.get_user_data(student);
            return { key: student, name: user_data['display_name'] || user_data.id }
        }));

        let data = {
            course_group_sets: course_group_sets,
            permissions: permissions,
            course_title: course_data['title'],
            all_students: all_students,
            user_name: await user_db_handler.get_user_name(user_key)
        };

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
    } catch (e) {
        console.log(e);
        res.status(500).send({
            message: e.message
        });
    }
});


router.get('/permissions', async function(req, res, next) {
    console.log("Get request for user with id: " + req.params.user_id);

    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];

    let user_db_handler = await ImportHandler.user_db_handler;

    try {
        let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ permissions: permissions }));
    } catch (e) {
        console.warn(e);
        res.status(500).send({
            message: e.message
        });
    }
});



/*
 ** GET a user
 */
router.get('/:user_id', function(req, res, next) {
    console.log("Get request for user with id: " + req.params.user_id);
    res.sendStatus(501);
});



/*
 ** PUT to all course users, do not need this
 */
router.put('/', function(req, res, next) {
    res.sendStatus(403);
});


/*
 ** PUT to a user, replaces the user
 */
router.put('/:user_id', function(req, res, next) {
    console.log("Put request for course with id: " + req.params.user_id);
    res.sendStatus(501);
});



/*
 ** POST to all course users
 */
router.post('/', function(req, res, next) {
    res.sendStatus(501);
});


/*
 ** POST to a user, do not need this
 */
router.post('/:user_id', function(req, res, next) {
    res.sendStatus(403);
});



/*
 ** DELETE all course users
 */
router.delete('/', function(req, res, next) {
    res.sendStatus(403);
});


/*
 ** DELETE a user
 */
router.delete('/:user_id', function(req, res, next) {
    console.log("Delete request for course with id: " + req.params.user_id);
    res.sendStatus(501);
});


module.exports = router;
