var express = require('express');
var router = express.Router({mergeParams: true});
const CourseDatabaseHandler = require("../bin/CourseDatabaseHandler");
const UserDatabaseHandler = require("../bin/UserDatabaseHandler");
const GradesDatabaseHandler = require("../bin/GradesDatabaseHandler");
const KeyDictionary = require("../bin/KeyDictionary");


router.get('/', async function(req, res, next) {
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];

    let grades_db_handler = await GradesDatabaseHandler.get_instance();
    let user_db_handler = await UserDatabaseHandler.get_instance();

    try {
        let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);

        let grades = {};

        if (permissions === 'instructor' || permissions === 'ta')
            grades = await grades_db_handler.get_all_course_grades(user_key, course_key);
        else if (permissions === 'student')
            grades = await grades_db_handler.get_student_grades(user_key, course_key);

        grades['permissions'] = permissions;

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



router.get('/all_user_grades', async function(req, res, next) {
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;

    let grades_db_handler = await GradesDatabaseHandler.get_instance();

    try {

        let grades = await grades_db_handler.get_all_user_grades(user_key);

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



router.get('/csv', async function(req, res, next) {
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];

    let grades_db_handler = await GradesDatabaseHandler.get_instance();

    try {
        let csv = await grades_db_handler.get_grades_csv(user_key, course_key);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(csv));
    } catch (e) {
        console.warn(e);
        if (e.name === 'NotAuthorizedError')
            res.sendStatus(401);
        else
            res.sendStatus(500);
    }
});



router.put('/', function(req, res, next) {
    res.sendStatus(403);
});


router.put('/:assignment_id', async function(req, res, next) {
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;

    let student_key = '';
    let course_group_key = '';

    if (req.body['student_key'].includes(KeyDictionary.key_dictionary['user']))
        student_key = req.body['student_key'];
    else
        course_group_key = req.body['student_key'];

    let assignment_key = KeyDictionary.key_dictionary['assignment'] + req.params['assignment_id'];
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];

    let mark = req.body['mark'];

    let grades_db_handler = await GradesDatabaseHandler.get_instance();

    try {
        if (student_key !== "")
            await grades_db_handler.update_student_grade_for_assignment(user_key, student_key, assignment_key, course_key, mark);
        else
            await grades_db_handler.update_course_group_grade_for_assignment(user_key, course_group_key, assignment_key, course_key, mark);
        res.sendStatus(200);
    } catch (e) {
        console.warn(e);
        if (e.name === 'NotAuthorizedError')
            res.sendStatus(401);
        else
            res.sendStatus(500);
    }
});



router.post('/', function(req, res, next) {
    res.sendStatus(501);
});

router.delete('/', function(req, res, next) {
    res.sendStatus(403);
});



module.exports = router;
