var express = require('express');
var router = express.Router({mergeParams: true});
const CourseDatabaseHandler = require("../bin/CourseDatabaseHandler");
const UserDatabaseHandler = require("../bin/UserDatabaseHandler");
const GradesDatabaseHandler = require("../bin/GradesDatabaseHandler");
const KeyDictionary = require("../bin/KeyDictionary");

/*
 ** GET all courses
 */
router.get('/', async function(req, res, next) {
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];

    let grades_db_handler = await GradesDatabaseHandler.get_instance();

    try {
        let grades = await grades_db_handler.get_course_grades(user_key, course_key);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(grades));
    } catch (e) {
        console.warn(e);
        if (e.name === 'NotAuthorizedError')
            res.sendStatus(401);
        else
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
 ** POST to all courses
 * TODO: permission level to add a course
 */
router.post('/', function(req, res, next) {
    res.sendStatus(501);
});



/*
 ** DELETE all courses
 */
router.delete('/', function(req, res, next) {
    res.sendStatus(403);
});



module.exports = router;
