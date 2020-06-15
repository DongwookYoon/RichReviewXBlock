var express = require('express');
var router = express.Router({mergeParams: true});
const ImportHandler = require("../bin/ImportHandler");


/*
 ** POST will add an lti user to redis
 */
router.post('/', async (req, res, next) => {
    let user_db_handler = await ImportHandler.user_db_handler;
    let submitter_db_handler = await ImportHandler.submitter_db_handler;
    let submission_db_handler = await ImportHandler.submission_db_handler;
    let course_db_handler = await ImportHandler.course_db_handler;

    try {
        let user_login_data = req.body;
        let auth_type = 'LTI_OIDC';

        if ( (await user_db_handler.user_exists(user_login_data.id)) === true) {
            res.sendStatus(200);
            console.log(`User ${user_login_data.id} already exists`);
            return;
        }
        

        let user_key = await user_db_handler.add_user_to_db(ImportHandler, user_login_data, auth_type);
        let user_data = await user_db_handler.get_user_data(user_key);

        let user_assignments = await Promise.all(user_data['submitters'].map(async (submitter) => {
            let submitter_data = await submitter_db_handler.get_submitter_data(submitter);
            let submission_data = await submission_db_handler.get_submission_data(submitter_data['submission']);
            return submission_data['assignment'];
        }));

        for (const course of user_data['enrolments'])
            await course_db_handler.create_submitters_for_student(ImportHandler, user_key, course, user_assignments);

        
        res.sendStatus(201);
    } catch (e) {
        console.warn(e);
        res.status(500).send({
            message: e.message
        });
    }
});




/*
 ** DELETE all lti users
 */
router.delete('/', function(req, res, next) {
    res.sendStatus(403);
});



module.exports = router;
