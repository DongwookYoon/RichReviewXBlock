const formidable = require("formidable");

var express = require('express');
var router = express.Router({mergeParams: true});
const KeyDictionary = require('../bin/KeyDictionary');
let ImportHandler = require('../bin/ImportHandler');
const NotAuthorizedError = require('../errors/NotAuthorizedError');


/**
 * 
 * No need to get ALL assignments 
 */
router.get('/', function(req, res, next) {
    res.sendStatus(501);
});


/**
 * Get a submitted comment submission assignment
 */
router.get('/:assignment_id/comment_submissions/:group_id', async function(req, res, next) {
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let group_key = KeyDictionary.key_dictionary['group'] + req.params.group_id;
    let assignment_key = KeyDictionary.key_dictionary['assignment'] + req.params.assignment_id;

    let group_db_handler = await ImportHandler.group_db_handler;
    let assignment_db_handler = await ImportHandler.assignment_db_handler;
    let submission_db_handler = await ImportHandler.submission_db_handler;

    try {
        await submission_db_handler.ensure_submission_initialized(ImportHandler, user_key, assignment_key);
        let group_data = await group_db_handler.get_group_data(group_key);
        let submission_key = group_data['submission'];

        let submission_data;
        if (submission_key && submission_key !== '')
            submission_data = await submission_db_handler.get_submission_data(submission_key);
        else submission_data = {};

        let muted = '';
        if (Object.keys(submission_data).length !== 0) {
            if (submission_data['current_submission'] && submission_data['current_submission'] !== '') {
                let cur_group_data = await group_db_handler.get_group_data(submission_data['current_submission']);
            }
        }
        let assignment_data = await assignment_db_handler.get_assignment_data(user_key, assignment_key);

        let data = {
            assignment: assignment_data,
            submission: submission_data,
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
 ** GET an assignment
 */
router.get('/:assignment_id', async function(req, res, next) {

    console.log("Get request for assignment with id: " + req.params.assignment_id);
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let assignment_key = KeyDictionary.key_dictionary['assignment'] + req.params['assignment_id'];
    
    let assignment_db_handler = await ImportHandler.assignment_db_handler;
    let submission_db_handler = await ImportHandler.submission_db_handler

    try {
        await submission_db_handler.ensure_submission_initialized(ImportHandler, user_key, assignment_key);
        let data = await assignment_db_handler.get_assignment(ImportHandler, user_key, course_key, assignment_key);
        
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


router.get('/:assignment_id/submissions', async function(req, res, next) {

    console.log("Get request for assignment with id: " + req.params.assignment_id);
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let assignment_key = KeyDictionary.key_dictionary['assignment'] + req.params['assignment_id'];

    let assignment_db_handler = await ImportHandler.assignment_db_handler;
    let user_db_handler = await ImportHandler.user_db_handler;

    try {
        
        let submissions = await assignment_db_handler.get_assignment_submissions(
            ImportHandler,
            user_key,
            course_key,
            assignment_key);

        let assignment_data = await assignment_db_handler.get_assignment_data(user_key, assignment_key);
        
        let data = {
            submissions: submissions,
            assignment_title: assignment_data['title'],
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
    
    let submission_db_handler = await ImportHandler.submission_db_handler;
    let assignment_db_handler = await ImportHandler.assignment_db_handler;
    
    try {
        
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
    
    let assignment_db_handler = await ImportHandler.assignment_db_handler;
    let submission_db_handler = await ImportHandler.submission_db_handler;
    
    try {
        
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
 ** PUT to all assignments, do not need this
 */
router.put('/', function(req, res, next) {
    res.sendStatus(403);
});

/*
 ** POST to all assignments
 */
router.post('/document_submission_assignment', async function(req, res, next) {

    let assignment_db_handler = await ImportHandler.assignment_db_handler;
    
    try {
        await assignment_db_handler.create_document_submission_assignment_lti(
            ImportHandler,
            req.body.assignment_data,
            req.body.assignment_data.assignment_key);
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
 ** POST to all assignments
 */
router.post('/comment_submission_assignment', async function(req, res, next) {

    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    
    let assignment_db_handler = await ImportHandler.assignment_db_handler;
    let user_db_handler = await ImportHandler.user_db_handler;
   
    let form = new formidable.IncomingForm();
    await form.parse(req, async function(err, fields, files) {
        if (err || (Object.entries(files).length === 0 && files.constructor === Object)) {
            console.warn(err);
            res.sendStatus(400);
            return;
        }

        try {
            let assignment_data = JSON.parse(fields['assignment_data']);
            await assignment_db_handler.create_comment_submission_assignment_lti(
                ImportHandler,
                user_key,
                assignment_data,
                assignment_data.assignment_key,
                files);
            res.sendStatus(200);
        } catch (e) {
            console.warn(e);
            let code = 1;
            let message = '';
            if (e.name === 'NotAuthorizedError') {
                code = 401;
                message = 'You are not authorized to create an assignment';
            }
            else if (e.name === "PDFFormatError") {
               code = 533;
               message = e.message;
            }
            else {
                code = 500;
                message = e.message;
            }
            res.status(code).send({message : message});
        }
    });
});


/*
 ** POST to assignment submissions
 */
router.post('/:assignment_id/document_submissions', async function(req, res, next) {

    let user_id = req.headers.authorization;
    let user_key = KeyDictionary.key_dictionary['user'] + user_id;
    let assignment_key = KeyDictionary.key_dictionary['assignment'] + req.params['assignment_id'];
    
    let assignment_db_handler = await ImportHandler.assignment_db_handler;

    let form = new formidable.IncomingForm();
    await form.parse(req, async function(err, fields, files) {
        if (err || (Object.entries(files).length === 0 && files.constructor === Object)) {
            console.warn(err);
            res.sendStatus(400);
            return;
        }

        try {
            await assignment_db_handler.submit_document_assignment_lti(
                ImportHandler,
                user_id,
                assignment_key,
                files);

            res.sendStatus(200);
        } catch (e) {
            console.warn(e);

            if (e.name === "PDFFormatError") {
                res.status(533).send({
                    message: e.message
                });
            }
            else {
                res.status(400).send({
                    message: e.message
                });
            }
        }
    });
});



router.post('/:assignment_id/comment_submissions', async function(req, res, next) {
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let group_key = KeyDictionary.key_dictionary['group'] + req.body.groupid;

    let group_db_handler = await ImportHandler.group_db_handler;
    let assignment_db_handler = await ImportHandler.assignment_db_handler;
    let submission_db_handler = await ImportHandler.submission_db_handler;
 
    try {
        
        let group_data = await group_db_handler.get_group_data(group_key);
        let submission_key = group_data['submission'];

        let submission_data = await submission_db_handler.get_submission_data(submission_key);
        let assignment_key = submission_data['assignment'];
        let assignment_data = await assignment_db_handler.get_assignment_data(user_key, assignment_key);
               
        let has_extension = await assignment_db_handler.has_extension(assignment_key, user_key);

       await submission_db_handler.submit_comment_submission_lti(
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

/*
 ** DELETE all assignments
 */
router.delete('/', function(req, res, next) {
    res.sendStatus(403);
});


module.exports = router;