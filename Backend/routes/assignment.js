const formidable = require("formidable");

var express = require('express');
var router = express.Router({mergeParams: true});
const AssignmentDatabaseHandler = require('../bin/AssignmentDatabaseHandler');
const UserDatabaseHandler = require('../bin/UserDatabaseHandler');
const DocumentUploadHandler = require('../bin/DocumentUploadHandler');
const DocumentDatabaseHandler = require('../bin/DocumentDatabaseHandler');
const GroupDatabaseHandler = require('../bin/GroupDatabaseHandler');
const SubmissionDatabaseHandler = require('../bin/SubmissionDatabaseHandler');
const KeyDictionary = require('../bin/KeyDictionary');

/*
 ** GET all course assignments
 * TODO: permission level to view all course assignments
 */
router.get('/', function(req, res, next) {
    console.log("Get request for all assignments in course with id: " + req.params.course_id);
    res.sendStatus(501);
});


/*
 ** GET a course assignments
 * TODO: view a course assignment
 */
router.get('/:assignment_id', async function(req, res, next) {

    console.log("Get request for assignment with id: " + req.params.assignment_id);
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let assignment_key = KeyDictionary.key_dictionary['assignment'] + req.params['assignment_id'];

    let assignment_db_handler = await AssignmentDatabaseHandler.get_instance();

    try {
        let assignment_data = await assignment_db_handler.get_assignment_data(user_key, assignment_key);

        let user_db_handler = await UserDatabaseHandler.get_instance();
        let user_data = await user_db_handler.get_user_data(user_key);

        let data = {};

        if (user_data['teaching'].includes(assignment_data['course']))
            data = { permissions: 'instructor', assignment: assignment_data };

        if (user_data['taing'].includes(assignment_data['course']))
            data = { permissions: 'ta', assignment: assignment_data };

        if (user_data['enrolments'].includes(assignment_data['course']))
            data = { permissions: 'student', assignment: assignment_data };

        if (data === {})
            res.sendStatus(401);

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));

    } catch (e) {
        console.warn(e);
        res.sendStatus(500);
    }
});


router.get('/:assignment_id/edit', async function(req, res, next) {

    console.log("Get request for assignment with id: " + req.params.assignment_id);
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let assignment_key = KeyDictionary.key_dictionary['assignment'] + req.params['assignment_id'];
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];

    let assignment_db_handler = await AssignmentDatabaseHandler.get_instance();

    try {
        let assignment_data = await assignment_db_handler.get_assignment_data(user_key, assignment_key);

        let user_db_handler = await UserDatabaseHandler.get_instance();
        let user_data = await user_db_handler.get_user_data(user_key);

        if (!user_data['teaching'].includes(assignment_data['course']) &&
            !user_data['taing'].includes(assignment_data['course']))
            res.sendStatus(401);

        let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);
        assignment_data['permissions'] = permissions;

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(assignment_data));
    } catch (e) {
        console.warn(e);
        res.sendStatus(500);
    }
});


router.get('/:assignment_id/submissions', async function(req, res, next) {

    console.log("Get request for assignment with id: " + req.params.assignment_id);
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];
    let assignment_key = KeyDictionary.key_dictionary['assignment'] + req.params['assignment_id'];

    let assignment_db_handler = await AssignmentDatabaseHandler.get_instance();

    try {

        let submissions = await assignment_db_handler.get_assignment_submisions(user_key, course_key, assignment_key);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ submissions }));
    } catch (e) {
        console.warn(e);
        if (e.name === 'NotAuthorizedError')
            res.sendStatus(401);
        else
            res.sendStatus(500);
    }
});



/*
 ** PUT to all course assignments, do not need this
 */
router.put('/', function(req, res, next) {
    res.sendStatus(403);
});


/*
 ** PUT to a course assignment, replaces the assignment
 * TODO: replaces a course assignment
 */
router.put('/:assignment_id', async function(req, res, next) {
    console.log("Put request for assignment with id: " + req.params.assignment_id);

    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let assignment_key = KeyDictionary.key_dictionary['assignment'] + req.params['assignment_id'];

    let assignment_db_handler = await AssignmentDatabaseHandler.get_instance();

    try {
        await assignment_db_handler.edit_assignment(user_key, assignment_key, req.body.edits);
        res.sendStatus(200);
    } catch (e) {
        console.warn(e);
        if (e.name === 'NotAuthorizedError')
            res.sendStatus(401);
        else
            res.sendStatus(500);
    }
});



/*
 ** POST to all course assignments
 * TODO: permission level to add a course assignment
 */
router.post('/', async function(req, res, next) {

    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];

    let assignment_db_handler = await AssignmentDatabaseHandler.get_instance();

    try {
        await assignment_db_handler.create_assignment(user_key, course_key, req.body.assignment_data);
        res.sendStatus(200);
    } catch (e) {
        console.warn(e);
        if (e.name === 'NotAuthorizedError')
            res.sendStatus(401);
        else
            res.sendStatus(500);
    }
});


/*
 ** POST to a course assignment, do not need this
 */
router.post('/:assignment_id', function(req, res, next) {
    res.sendStatus(403);
});


/*
 ** POST to a course assignment submissions
 */
router.post('/:assignment_id/submissions', async function(req, res, next) {
    console.log('Assignment submission!');

    let user_id = req.headers.authorization;
    let assignment_key = KeyDictionary.key_dictionary['assignment'] + req.params['assignment_id'];

    let form = new formidable.IncomingForm();
    await form.parse(req, async function(err, fields, files) {
        if (err) {
            console.war(err);
            res.sendStatus(400);
        }

        let document_upload_handler = await DocumentUploadHandler.get_instance();
        let document_db_handler = await DocumentDatabaseHandler.get_instance();
        let group_db_handler = await GroupDatabaseHandler.get_instance();
        let user_db_handler = await UserDatabaseHandler.get_instance();
        let assignment_db_handler = await AssignmentDatabaseHandler.get_instance();
        let submission_db_handler = await SubmissionDatabaseHandler.get_instance();

        try {
            // Upload pdf to azure
            let context = await document_upload_handler.upload_documents(files);

            // Add doc and grp to redis
            let doc_key = await document_db_handler.create_doc(user_id, context.container);
            let group_key = await group_db_handler.create_group(user_id, doc_key);
            await document_db_handler.add_group_to_doc(doc_key, group_key);
            let user_key = KeyDictionary.key_dictionary['user'] + user_id;
            await user_db_handler.add_group_to_user(user_key, group_key);

            // Associate group with submission
            let submission_key = await assignment_db_handler.get_users_submission_key(user_key, assignment_key);

            if (submission_key === undefined)
                res.sendStatus(400);

            await submission_db_handler.add_group_to_submission(submission_key, group_key);

            res.sendStatus(200);
        } catch (e) {
            console.warn(e);
            res.sendStatus(400);
        }
    });
});


/*
 ** DELETE all course assignments
 */
router.delete('/', function(req, res, next) {
    res.sendStatus(403);
});


/*
 ** DELETE a course assignment
 * TODO: delete a course assignment
 */
router.delete('/:assignment_id', async function(req, res, next) {
    console.log("Delete request for assignment with id: " + req.params.assignment_id);
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];
    let assignment_key = KeyDictionary.key_dictionary['assignment'] + req.params['assignment_id'];

    let assignment_db_handler = await AssignmentDatabaseHandler.get_instance();

    try {
        await assignment_db_handler.delete_assignment(user_key, course_key, assignment_key);
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
