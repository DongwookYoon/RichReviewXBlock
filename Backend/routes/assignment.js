const formidable = require("formidable");

var express = require('express');
var router = express.Router({mergeParams: true});
const AssignmentDatabaseHandler = require('../bin/AssignmentDatabaseHandler');
const UserDatabaseHandler = require('../bin/UserDatabaseHandler');
const DocumentUploadHandler = require('../bin/DocumentUploadHandler');
const DocumentDatabaseHandler = require('../bin/DocumentDatabaseHandler');
const GroupDatabaseHandler = require('../bin/GroupDatabaseHandler');
const SubmissionDatabaseHandler = require('../bin/SubmissionDatabaseHandler');
const CourseDatabaseHandler = require('../bin/CourseDatabaseHandler');
const KeyDictionary = require('../bin/KeyDictionary');

/*
 ** GET all course assignments
 */
router.get('/', function(req, res, next) {
    console.log("Get request for all assignments in course with id: " + req.params.course_id);
    res.sendStatus(501);
});


router.get('/comment_submissions/:groupid', async function(req, res, next) {
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let group_key = KeyDictionary.key_dictionary['group'] + req.params.groupid;

    let group_db_handler = await GroupDatabaseHandler.get_instance();
    let assignment_db_handler = await AssignmentDatabaseHandler.get_instance();
    let submission_db_handler = await SubmissionDatabaseHandler.get_instance();

    try {
        let group_data = await group_db_handler.get_group_data(group_key);
        let submission_key = group_data['submission'];

        let submission_data = await submission_db_handler.get_submission_data(submission_key);

        let assignment_key = submission_data['assignment'];

        let assignment_data = await assignment_db_handler.get_assignment_data(user_key, assignment_key);

        let data = {
            assignment: assignment_data,
            submission: submission_data
        };

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));

    } catch (e) {
        console.warn(e);
        res.sendStatus(500);
    }
});



/*
 ** GET a course assignments
 */
router.get('/:assignment_id', async function(req, res, next) {

    console.log("Get request for assignment with id: " + req.params.assignment_id);
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let assignment_key = KeyDictionary.key_dictionary['assignment'] + req.params['assignment_id'];
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];

    let assignment_db_handler = await AssignmentDatabaseHandler.get_instance();
    let user_db_handler = await UserDatabaseHandler.get_instance();
    let submission_db_handler = await SubmissionDatabaseHandler.get_instance();
    let group_db_handler = await GroupDatabaseHandler.get_instance();
    let doc_db_handler = await DocumentDatabaseHandler.get_instance();

    try {
        let assignment_data = await assignment_db_handler.get_assignment_data(user_key, assignment_key);

        let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);

        let data = {};

        if (permissions === 'instructor' || permissions === 'ta') {
            let submission_data = await assignment_db_handler.get_first_assignment_submission_link_and_id(user_key, assignment_key);
            data = {
                permissions: permissions,
                assignment: assignment_data,
                grader_link: submission_data.link,
                grader_submission_id: submission_data.id,
                link: ''
            };

        } else if (permissions === 'student') {
            // TODO this link is for students, should split into student / instructor specific functions
            let submission_key = await assignment_db_handler.get_users_submission_key(user_key, assignment_key);

            let link = '';

            if (submission_key) {
                let submission_data = await submission_db_handler.get_submission_data(submission_key);

                if (submission_data['group'] && submission_data['group'] !== '') {
                    let group_id = submission_data['group'].replace(KeyDictionary.key_dictionary['group'], '');
                    let group_data = await group_db_handler.get_group_data(submission_data['group']);

                    let doc_id = group_data['docid'].replace(KeyDictionary.key_dictionary['document'], '');
                    let doc_data = await doc_db_handler.get_doc_data(group_data['docid']);

                    let access_code = doc_data['pdfid'];

                    link = `access_code=${access_code}&docid=${doc_id}&groupid=${group_id}`;
                }
            }

            data = {
                permissions: permissions,
                assignment: assignment_data,
                grader_link: '',
                link: link
            };

        }

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



router.get('/:assignment_id/grader/:submission_id', async function(req, res, next) {

    console.log("Get request for assignment with id: " + req.params.assignment_id);
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];
    let assignment_key = KeyDictionary.key_dictionary['assignment'] + req.params['assignment_id'];
    let submission_id = req.params['submission_id'];
    let submission_key = KeyDictionary.key_dictionary['submission'] + req.params['submission_id'];

    let assignment_db_handler = await AssignmentDatabaseHandler.get_instance();
    let submission_db_handler = await SubmissionDatabaseHandler.get_instance();

    try {

        let previous_submission_link_and_id = await assignment_db_handler.get_previous_assignment_submission_link(user_key, assignment_key, submission_id);
        let name_and_key = await submission_db_handler.get_submission_owner(submission_key);
        let next_submission_link_and_id = await assignment_db_handler.get_next_assignment_submission_link(user_key, assignment_key, submission_id);
        let submission_data = await submission_db_handler.get_submission_data(submission_key);

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            previous_submission_link_and_id,
            name: name_and_key.name,
            student_key: name_and_key.key,
            next_submission_link_and_id,
            submission_data }));
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
 */
router.post('/document_submission_assignment', async function(req, res, next) {

    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];

    let assignment_db_handler = await AssignmentDatabaseHandler.get_instance();
    let user_db_handler = await UserDatabaseHandler.get_instance();

    let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);
    if (permissions !== 'instructor' && permissions !== 'ta')
        res.sendStatus(401);

    try {
        await assignment_db_handler.create_document_submission_assignment(course_key, req.body.assignment_data);

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
 */
router.post('/comment_submission_assignment', async function(req, res, next) {

    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];

    let assignment_db_handler = await AssignmentDatabaseHandler.get_instance();
    let user_db_handler = await UserDatabaseHandler.get_instance();

    let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);
    if (permissions !== 'instructor' && permissions !== 'ta')
        res.sendStatus(401);

    let form = new formidable.IncomingForm();
    await form.parse(req, async function(err, fields, files) {
        if (err) {
            console.war(err);
            res.sendStatus(400);
        }

        try {

            let assignment_data = JSON.parse(fields['assignment_data']);
            await assignment_db_handler.create_comment_submission_assignment(user_key, course_key, assignment_data, files);

            res.sendStatus(200);
        } catch (e) {
            console.warn(e);
            if (e.name === 'NotAuthorizedError')
                res.sendStatus(401);
            else
                res.sendStatus(500);
        }
    });
});


/*
 ** POST to a course assignment submissions
 */
router.post('/:assignment_id/document_submissions', async function(req, res, next) {

    let user_id = req.headers.authorization;
    let assignment_key = KeyDictionary.key_dictionary['assignment'] + req.params['assignment_id'];
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];

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
        let course_db_handler = await CourseDatabaseHandler.get_instance();

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

            await group_db_handler.add_submission_to_group(group_key, submission_key);
            await submission_db_handler.add_group_to_document_submission(submission_key, group_key);

            // Add tas and instructors to the group
            let tas_and_instructors = await course_db_handler.get_course_tas_and_instructors(course_key);

            for (let ta of tas_and_instructors['tas']) {
                let ta_id = ta.replace(KeyDictionary.key_dictionary['user'], '');
                await group_db_handler.add_user_to_group(ta_id, group_key);
            }

            for (let instructor of tas_and_instructors['instructors']) {
                let instructor_id = instructor.replace(KeyDictionary.key_dictionary['user'], '');
                await group_db_handler.add_user_to_group(instructor_id, group_key);
            }

            res.sendStatus(200);
        } catch (e) {
            console.warn(e);
            res.sendStatus(400);
        }
    });
});



router.post('/:assignment_id/comment_submissions', async function(req, res, next) {
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let group_key = KeyDictionary.key_dictionary['group'] + req.body.groupid;
    let assignment_key = KeyDictionary.key_dictionary['assignment'] + req.params['assignment_id'];

    let group_db_handler = await GroupDatabaseHandler.get_instance();
    let assignment_db_handler = await AssignmentDatabaseHandler.get_instance();
    let submission_db_handler = await SubmissionDatabaseHandler.get_instance();

    try {
        let group_data = await group_db_handler.get_group_data(group_key);
        let submission_key = group_data['submission'];

        let submission_data = await submission_db_handler.get_submission_data(submission_key);

        let assignment_key = submission_data['assignment'];

        let assignment_data = await assignment_db_handler.get_assignment_data(user_key, assignment_key);

        if (!assignment_data['allow_multiple_submissions'] && submission_data['submission_time'] !== '') {
            res.sendStatus(401);
            return;
        }

        // await submission_db_handler.set_submission_status_to_submitted(submission_key);
        await submission_db_handler.submit_comment_submission(submission_key, group_key);

        res.sendStatus(200);

    } catch (e) {
        console.warn(e);
        res.sendStatus(500);
    }
});



/*
 ** DELETE all course assignments
 */
router.delete('/', function(req, res, next) {
    res.sendStatus(403);
});


/*
 ** DELETE a course assignment
 */
router.delete('/:assignment_id', async function(req, res, next) {
    console.log("Delete request for assignment with id: " + req.params.assignment_id);
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];
    let assignment_key = KeyDictionary.key_dictionary['assignment'] + req.params['assignment_id'];

    let user_db_handler = await UserDatabaseHandler.get_instance();
    let course_db_handler = await CourseDatabaseHandler.get_instance();

    try {
        let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);

        if (permissions !== 'instructor' && permissions !== 'ta')
            res.sendStatus(401);

        await course_db_handler.move_assignment_to_deleted_assignments(course_key, assignment_key);

        res.sendStatus(200);
    } catch (e) {
        console.warn(e);
        if (e.name === 'NotAuthorizedError')
            res.sendStatus(401);
        else
            res.sendStatus(500);
    }
    // let assignment_db_handler = await AssignmentDatabaseHandler.get_instance();
    //
    // try {
    //     await assignment_db_handler.delete_assignment(user_key, course_key, assignment_key);
    //     res.sendStatus(200);
    //
    // } catch (e) {
    //     console.warn(e);
    //     if (e.name === 'NotAuthorizedError')
    //         res.sendStatus(401);
    //     else
    //         res.sendStatus(500);
    // }
});


/*
 ** DELETE a course assignment
 */
router.delete('/:assignment_id/permanently', async function(req, res, next) {
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
