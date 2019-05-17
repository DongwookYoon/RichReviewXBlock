var express = require('express');
var router = express.Router({mergeParams: true});

const UserDatabaseHandler = require('../bin/UserDatabaseHandler');
const KeyDictionary = require('../bin/KeyDictionary');

/*
 ** GET all course users
 * TODO: permission level to view all course users
 */
router.get('/', async function(req, res, next) {
    console.log("Get request for all people in course with id: " + req.params.course_id);

    let user_database_handler = await UserDatabaseHandler.get_instance();

    try {
        let users = await user_database_handler.get_all_course_users(KeyDictionary.key_dictionary['course'] +
            req.params.course_id);

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(users));
    } catch (e) {
        console.log(e);
        res.send(500);
    }
});


router.get('/permissions', async function(req, res, next) {
    console.log("Get request for user with id: " + req.params.user_id);

    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];

    let user_db_handler = await UserDatabaseHandler.get_instance();

    try {
        let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ permissions: permissions }));
    } catch (e) {
        console.warn(e);
        res.sendStatus(500);
    }
});



/*
 ** GET a user
 * TODO: view user
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
 * TODO: replaces a user
 */
router.put('/:user_id', function(req, res, next) {
    console.log("Put request for course with id: " + req.params.user_id);
    res.sendStatus(501);
});



/*
 ** POST to all course users
 * TODO: permission level to add a user
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
 * TODO: delete a user from db, or from course?
 */
router.delete('/:user_id', function(req, res, next) {
    console.log("Delete request for course with id: " + req.params.user_id);
    res.sendStatus(501);
});


module.exports = router;
