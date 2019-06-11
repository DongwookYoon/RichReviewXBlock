var express = require('express');
var router = express.Router();
const CourseDatabaseHandler = require("../bin/CourseDatabaseHandler");
const UserDatabaseHandler = require("../bin/UserDatabaseHandler");
const KeyDictionary = require("../bin/KeyDictionary");

/*
 ** GET all courses
 */
router.get('/', async function(req, res, next) {
    console.log("Get request for all courses");

    let user_id = KeyDictionary.key_dictionary['user'] + req.headers.authorization;

    let course_database_handler = await CourseDatabaseHandler.get_instance();

    try {
        let user_courses = await course_database_handler.get_user_courses(user_id);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(user_courses));
    } catch (e) {
        console.warn(e);
        res.sendStatus(500);
    }
});


/*
 ** GET a course
 */
router.get('/:course_id', async function(req, res, next) {
    console.log("Get request for course with id: " + req.params.course_id);

    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params.course_id;

    let course_database_handler = await CourseDatabaseHandler.get_instance();
    let user_db_handler = await UserDatabaseHandler.get_instance();

    try {
        let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);
        let data = await course_database_handler.get_course(user_key, course_key);

        data['permissions'] = permissions;

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
    } catch (e) {
        console.warn(e);
        res.sendStatus(500);
    }
});

router.get('/:course_id/deleted-assignments', async function(req, res, next) {
    console.log("Get request for course with id: " + req.params.course_id);

    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params.course_id;

    let course_database_handler = await CourseDatabaseHandler.get_instance();
    let user_db_handler = await UserDatabaseHandler.get_instance();

    try {
        let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);

        if (permissions !== 'instructor' && permissions !== 'ta')
            res.sendStatus(401);

        let data = await course_database_handler.get_deleted_course_assignments(user_key, course_key);

        data['permissions'] = permissions;

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
    } catch (e) {
        console.warn(e);
        res.sendStatus(500);
    }
});


/*
 ** PUT all courses, do not need this
 */
router.put('/', function(req, res, next) {
    res.sendStatus(403);
});


/*
 ** PUT to course, replaces the course
 */
router.put('/:course_id', function(req, res, next) {
    console.log("Put request for course with id: " + req.params.course_id);
    res.sendStatus(501);
});



/*
 ** POST to all courses
 */
router.post('/', function(req, res, next) {
    res.sendStatus(501);
});


/*
 ** POST to a course, do not need this
 */
router.post('/:course_id', function(req, res, next) {
    res.sendStatus(403);
});


router.post('/:course_id/deleted-assignments/restore', async function(req, res, next) {
    console.log("Get request for course with id: " + req.params.course_id);

    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params.course_id;
    let assignment_key = KeyDictionary.key_dictionary['assignment'] + req.body.id;

    let course_database_handler = await CourseDatabaseHandler.get_instance();
    let user_db_handler = await UserDatabaseHandler.get_instance();

    try {
        let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);

        if (permissions !== 'instructor' && permissions !== 'ta')
            res.sendStatus(401);

        await course_database_handler.restore_deleted_course_assignment(course_key, assignment_key);

        res.sendStatus(200);
    } catch (e) {
        console.warn(e);
        res.sendStatus(500);
    }
});


/*
 ** DELETE all courses
 */
router.delete('/', function(req, res, next) {
    res.sendStatus(403);
});


/*
 ** DELETE a course
 */
router.delete('/:course_id', function(req, res, next) {
    console.log("Delete request for course with id: " + req.params.course_id);
    res.sendStatus(501);
});


module.exports = router;
