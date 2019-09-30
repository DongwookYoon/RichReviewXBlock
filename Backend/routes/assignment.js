const formidable = require("formidable");

var express = require('express');
var router = express.Router({mergeParams: true});
const KeyDictionary = require('../bin/KeyDictionary');
let ImportHandler = require('../bin/ImportHandler');
const NotAuthorizedError = require('../errors/NotAuthorizedError');
const AssignmentDatabaseHandler = require('../bin/AssignmentDatabaseHandler');

/*
 ** GET all course assignments
 */
router.get('/', function(req, res, next) {
    console.log("Get request for all assignments in course with id: " + req.params.course_id);
    res.sendStatus(501);
});



router.get('/all_user_assignments', async function(req, res, next) {
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;

    let assignment_db_handler = await ImportHandler.assignment_db_handler;
    let course_db_handler = await ImportHandler.course_db_handler;
    let user_db_handler = await ImportHandler.user_db_handler;

    try {
        let enrolments = await course_db_handler.get_user_courses(ImportHandler, user_key);
        let all_assignments = {};

        all_assignments.assignments = await assignment_db_handler.get_all_assignments_visible_to_user(
            ImportHandler,
            user_key,
            enrolments);

        all_assignments['user_name'] = await user_db_handler.get_user_name(user_key);

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(all_assignments))
    } catch (e) {
        console.warn(e);
        res.status(500).send({
            message: e.message
        });
    }
});



router.get('/:assignment_id/comment_submissions/:group_id', async function(req, res, next) {
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let group_key = KeyDictionary.key_dictionary['group'] + req.params.group_id;
    let assignment_key = KeyDictionary.key_dictionary['assignment'] + req.params.assignment_id;

    let group_db_handler = await ImportHandler.group_db_handler;
    let assignment_db_handler = await ImportHandler.assignment_db_handler;
    let submission_db_handler = await ImportHandler.submission_db_handler;

    try {
        let group_data = await group_db_handler.get_group_data(group_key);
        let submission_key = group_data['submission'];

        let submission_data;
        if (submission_key && submission_key !== '')
            submission_data = await submission_db_handler.get_submission_data(submission_key);
        else submission_data = {};

        let assignment_data = await assignment_db_handler.get_assignment_data(user_key, assignment_key);

        let data = {
            assignment: assignment_data,
            submission: submission_data
        };

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));

    } catch (e) {
        console.warn(e);
        res.status(500).send({
            message: e.message
        });
    }
});



/*
 ** GET a course assignment
 */
router.get('/:assignment_id', async function(req, res, next) {

    console.log("Get request for assignment with id: " + req.params.assignment_id);
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let assignment_key = KeyDictionary.key_dictionary['assignment'] + req.params['assignment_id'];
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];

    let assignment_db_handler = await ImportHandler.assignment_db_handler;
    let course_db_handler = await ImportHandler.course_db_handler;
    let user_db_handler = await ImportHandler.user_db_handler;

    try {
        // await course_db_handler.verify_course_submitters(ImportHandler, user_key, course_key);

        let data = await assignment_db_handler.get_assignment(ImportHandler, user_key, course_key, assignment_key);
        data['user_name'] = await user_db_handler.get_user_name(user_key);

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));

    } catch (e) {
        if (e instanceof NotAuthorizedError) {
            res.status(401).send({
                message: e.message
            });
        } else {
            res.status(500).send({
                message: e.message
            });
        }
    }
});


router.get('/:assignment_id/edit', async function(req, res, next) {

    console.log("Get request for assignment with id: " + req.params.assignment_id);
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let assignment_key = KeyDictionary.key_dictionary['assignment'] + req.params['assignment_id'];
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];

    let assignment_db_handler = await ImportHandler.assignment_db_handler;
    let course_db_handler = await ImportHandler.course_db_handler;

    try {
        // await course_db_handler.verify_course_submitters(ImportHandler, user_key, course_key);

        let assignment_data = await assignment_db_handler.get_assignment_data(user_key, assignment_key);
        let course_data = await course_db_handler.get_course_data(course_key);

        let user_db_handler = await ImportHandler.user_db_handler;
        let user_data = await user_db_handler.get_user_data(user_key);

        if (!user_data['teaching'].includes(assignment_data['course']) &&
            !user_data['taing'].includes(assignment_data['course']))
                return res.status(401).send({
                    message: 'You do not have permission to edit this assignment'
                });

        assignment_data['permissions'] = await user_db_handler.get_user_course_permissions(user_key, course_key);
        assignment_data['course_title'] = course_data['title'];
        assignment_data['user_name'] = await user_db_handler.get_user_name(user_key);

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(assignment_data));
    } catch (e) {
        console.warn(e);
        res.status(500).send({
            message: e.message
        });
    }
});


router.get('/:assignment_id/submissions', async function(req, res, next) {

    console.log("Get request for assignment with id: " + req.params.assignment_id);
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];
    let assignment_key = KeyDictionary.key_dictionary['assignment'] + req.params['assignment_id'];

    let assignment_db_handler = await ImportHandler.assignment_db_handler;
    let course_db_handler = await ImportHandler.course_db_handler;
    let user_db_handler = await ImportHandler.user_db_handler;

    try {
        // await course_db_handler.verify_course_submitters(ImportHandler, user_key, course_key);

        let submissions = await assignment_db_handler.get_assignment_submissions(
            ImportHandler,
            user_key,
            course_key,
            assignment_key);

        let assignment_data = await assignment_db_handler.get_assignment_data(user_key, assignment_key);
        let course_data = await course_db_handler.get_course_data(course_key);

        let data = {
            submissions: submissions,
            assignment_title: assignment_data['title'],
            course_title: course_data['title'],
            user_name: await user_db_handler.get_user_name(user_key)
        };

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
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


router.get('/:assignment_id/grader', async function(req, res, next) {

    console.log("Get request for assignment with id: " + req.params.assignment_id);
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let assignment_key = KeyDictionary.key_dictionary['assignment'] + req.params['assignment_id'];
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];

    let submission_db_handler = await ImportHandler.submission_db_handler;
    let assignment_db_handler = await ImportHandler.assignment_db_handler;
    let course_db_handler = await ImportHandler.course_db_handler;

    try {
        // await course_db_handler.verify_course_submitters(ImportHandler, user_key, course_key);

        let submission_links_and_id = await assignment_db_handler.get_assignment_submissions_for_grader(
            ImportHandler,
            user_key,
            assignment_key);

        submission_links_and_id = await Promise.all(submission_links_and_id.map(async (submission_link_and_id) => {
            let submission_key = KeyDictionary.key_dictionary['submission'] + submission_link_and_id['id'];
            let submission_owner = await submission_db_handler.get_submission_owner(ImportHandler, submission_key);
            let submission_data = await submission_db_handler.get_submission_data(submission_key);

            submission_link_and_id['name'] = submission_owner['name'];
            submission_link_and_id['key'] = submission_owner['key'];
            submission_link_and_id['submission_status'] = submission_data['submission_status'];
            submission_link_and_id['mark'] = submission_data['mark'];

            return submission_link_and_id;
        }));

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ submission_links_and_id }));
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

router.get('/:assignment_id/grader/:submission_id', async function(req, res, next) {

    console.log("Get request for assignment with id: " + req.params.assignment_id);
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let assignment_key = KeyDictionary.key_dictionary['assignment'] + req.params['assignment_id'];
    let submission_id = req.params['submission_id'];
    let submission_key = KeyDictionary.key_dictionary['submission'] + req.params['submission_id'];
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];

    let assignment_db_handler = await ImportHandler.assignment_db_handler;
    let submission_db_handler = await ImportHandler.submission_db_handler;
    let course_db_handler = await ImportHandler.course_db_handler;
    try {
        // await course_db_handler.verify_course_submitters(ImportHandler, user_key, course_key);

        let previous_submission_link_and_id = await assignment_db_handler.get_previous_assignment_submission_link(
            ImportHandler,
            user_key,
            assignment_key,
            submission_id);

        let name_and_key = await submission_db_handler.get_submission_owner(ImportHandler, submission_key);

        let next_submission_link_and_id = await assignment_db_handler.get_next_assignment_submission_link(
            ImportHandler,
            user_key,
            assignment_key,
            submission_id);

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
            res.status(401).send({
                message: e.message
            });
        else
            res.status(500).send({
                message: e.message
            });
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
    let course_key = KeyDictionary.key_dictionary['course'] + req.params.course_id;

    let assignment_db_handler = await ImportHandler.assignment_db_handler;
    let course_db_handler = await ImportHandler.course_db_handler;

    try {
        // await course_db_handler.verify_course_submitters(ImportHandler, user_key, course_key);
        await assignment_db_handler.edit_assignment(ImportHandler, user_key, assignment_key, req.body.edits);
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



/*
 ** POST to all course assignments
 */
router.post('/document_submission_assignment', async function(req, res, next) {

    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];

    let assignment_db_handler = await ImportHandler.assignment_db_handler;
    let user_db_handler = await ImportHandler.user_db_handler;

    let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);
    if (permissions !== 'instructor' && permissions !== 'ta')
        return res.status(401).send({
            message: 'You are not authorized to create an assignment'
        });

    try {
        await assignment_db_handler.create_document_submission_assignment(
            ImportHandler,
            course_key,
            req.body.assignment_data);
        res.sendStatus(200);
    } catch (e) {
        console.warn(e);
        if (e.name === 'NotAuthorizedError')
            res.status(401).send({
                message: 'You are not authorized to create an assignment'
            });
        else
            res.status(500).send({
                message: e.message
            });
    }
});


/*
 ** POST to all course assignments
 */
router.post('/comment_submission_assignment', async function(req, res, next) {

    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];

    let assignment_db_handler = await ImportHandler.assignment_db_handler;
    let user_db_handler = await ImportHandler.user_db_handler;

    let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);
    if (permissions !== 'instructor' && permissions !== 'ta')
        return res.status(401).send({
            message: 'You are not authorized to create an assignment'
        });

    let form = new formidable.IncomingForm();
    await form.parse(req, async function(err, fields, files) {
        if (err || (Object.entries(files).length === 0 && files.constructor === Object)) {
            console.warn(err);
            res.sendStatus(400);
            return;
        }

        try {
            let assignment_data = JSON.parse(fields['assignment_data']);
            await assignment_db_handler.create_comment_submission_assignment(
                ImportHandler,
                user_key,
                course_key,
                assignment_data,
                files);
            res.sendStatus(200);
        } catch (e) {
            console.warn(e);
            if (e.name === 'NotAuthorizedError')
                res.status(401).send({
                    message: 'You are not authorized to create an assignment'
                });
            else
                res.status(500).send({
                    message: e.message
                });
        }
    });
});


/*
 ** POST to a course assignment submissions
 */
router.post('/:assignment_id/document_submissions', async function(req, res, next) {

    let user_id = req.headers.authorization;
    let user_key = KeyDictionary.key_dictionary['user'] + user_id;
    let assignment_key = KeyDictionary.key_dictionary['assignment'] + req.params['assignment_id'];
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];

    let assignment_db_handler = await ImportHandler.assignment_db_handler;

    let course_db_handler = await ImportHandler.course_db_handler;
    // await course_db_handler.verify_course_submitters(ImportHandler, user_key, course_key);


    let form = new formidable.IncomingForm();
    await form.parse(req, async function(err, fields, files) {
        if (err || (Object.entries(files).length === 0 && files.constructor === Object)) {
            console.warn(err);
            res.sendStatus(400);
            return;
        }

        try {
            await assignment_db_handler.submit_document_assignment(
                ImportHandler,
                user_id,
                course_key,
                assignment_key,
                files);

            res.sendStatus(200);
        } catch (e) {
            console.warn(e);
            res.status(400).send({
                message: e.message
            });
        }
    });
});



router.post('/:assignment_id/comment_submissions', async function(req, res, next) {
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let group_key = KeyDictionary.key_dictionary['group'] + req.body.groupid;

    let group_db_handler = await ImportHandler.group_db_handler;
    let assignment_db_handler = await ImportHandler.assignment_db_handler;
    let submission_db_handler = await ImportHandler.submission_db_handler;
    let course_db_handler = await ImportHandler.course_db_handler;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];

    try {
        // await course_db_handler.verify_course_submitters(ImportHandler, user_key, course_key);

        let group_data = await group_db_handler.get_group_data(group_key);
        let submission_key = group_data['submission'];

        let submission_data = await submission_db_handler.get_submission_data(submission_key);
        let assignment_key = submission_data['assignment'];
        let assignment_data = await assignment_db_handler.get_assignment_data(user_key, assignment_key);

        if(!(await AssignmentDatabaseHandler.user_has_permission_to_view(ImportHandler, user_key, assignment_data)))
            throw new NotAuthorizedError('You are not authorized to submit this assignment');

        if (!assignment_data['allow_multiple_submissions'] && submission_data['submission_time'] !== '') {
            return res.status(401).send({
                message: 'You do not have permission to submit this assignment'
            });
        }

        // await submission_db_handler.set_submission_status_to_submitted(submission_key);
        await submission_db_handler.submit_comment_submission(
            ImportHandler,
            submission_key,
            group_key);

        res.sendStatus(200);

    } catch (e) {
        console.warn(e);
        res.status(500).send({
            message: e.message
        });
    }
});


router.post('/:assignment_id/extensions', async function(req, res, next) {
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let assignment_key = KeyDictionary.key_dictionary['assignment'] + req.params['assignment_id'];
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];

    let extensions = req.body;

    let assignment_db_handler = await ImportHandler.assignment_db_handler;
    let course_db_handler = await ImportHandler.course_db_handler;

    try {
        // await course_db_handler.verify_course_submitters(ImportHandler, user_key, course_key);
        await assignment_db_handler.set_assignment_extensions(ImportHandler, user_key, course_key, assignment_key, extensions);
        res.sendStatus(200);

    } catch (e) {
        console.warn(e);
        res.status(500).send({
            message: e.message
        });
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

    let user_db_handler = await ImportHandler.user_db_handler;
    let course_db_handler = await ImportHandler.course_db_handler;

    try {
        let permissions = await user_db_handler.get_user_course_permissions(user_key, course_key);

        if (permissions !== 'instructor' && permissions !== 'ta')
            res.status(401).send({
                message: 'You do not have permission to delete an assignment'
            });

        await course_db_handler.move_assignment_to_deleted_assignments(course_key, assignment_key);

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


/*
 ** DELETE a course assignment
 */
router.delete('/:assignment_id/permanently', async function(req, res, next) {
    console.log("Delete request for assignment with id: " + req.params.assignment_id);
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];
    let assignment_key = KeyDictionary.key_dictionary['assignment'] + req.params['assignment_id'];

    let assignment_db_handler = await ImportHandler.assignment_db_handler;

    try {
        await assignment_db_handler.delete_assignment(
            ImportHandler,
            user_key,
            course_key,
            assignment_key);
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
