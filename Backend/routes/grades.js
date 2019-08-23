var express = require('express');
var router = express.Router({mergeParams: true});
const KeyDictionary = require("../bin/KeyDictionary");
const ImportHandler = require("../bin/ImportHandler");


router.get('/', async function(req, res, next) {
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];

    let grades_db_handler = await ImportHandler.grades_db_handler;
    let user_db_handler = await ImportHandler.user_db_handler;
    let course_db_handler = await ImportHandler.course_db_handler;

    try {
        await course_db_handler.verify_submitters_for_all_students(ImportHandler, course_key);
        let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);
        let course_data = await course_db_handler.get_course_data(course_key);

        let grades = {};

        if (permissions === 'instructor' || permissions === 'ta')
            grades = await grades_db_handler.get_all_course_grades(ImportHandler, user_key, course_key);
        else if (permissions === 'student')
            grades = await grades_db_handler.get_student_grades(ImportHandler, user_key, course_key);

        grades['permissions'] = permissions;
        grades['course_title'] = course_data['title'];
        grades['user_name'] = await user_db_handler.get_user_name(user_key);

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(grades));
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



router.get('/all_user_grades', async function(req, res, next) {
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;

    let grades_db_handler = await ImportHandler.grades_db_handler;
    let user_db_handler = await ImportHandler.user_db_handler;

    try {

        let grades = {};
        grades.grades = await grades_db_handler.get_all_user_grades(ImportHandler, user_key);

        grades['user_name'] = await user_db_handler.get_user_name(user_key);

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(grades));
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



router.get('/csv', async function(req, res, next) {
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];

    let grades_db_handler = await ImportHandler.grades_db_handler;

    try {
        let csv = await grades_db_handler.get_grades_csv(ImportHandler, user_key, course_key);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(csv));
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

    let grades_db_handler = await ImportHandler.grades_db_handler;

    try {
        if (student_key !== "")
            await grades_db_handler.update_student_grade_for_assignment(
                ImportHandler,
                user_key,
                student_key,
                assignment_key,
                course_key,
                mark);
        else
            await grades_db_handler.update_course_group_grade_for_assignment(
                ImportHandler,
                user_key,
                course_group_key,
                assignment_key,
                course_key,
                mark);
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



router.post('/', function(req, res, next) {
    res.sendStatus(501);
});

router.delete('/', function(req, res, next) {
    res.sendStatus(403);
});



module.exports = router;
