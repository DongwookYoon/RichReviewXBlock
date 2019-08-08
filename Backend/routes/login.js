var express = require('express');
var router = express.Router();
const ImportHandler = require("../bin/ImportHandler");

/*
 ** GET
 */
router.get('/', function(req, res, next) {
    res.sendStatus(403);
});



/*
 ** PUT useful for editing a user?
 */
router.put('/', function(req, res, next) {
    res.sendStatus(403);
});



/*
 ** POST will add a user to redis
 */
router.post('/', async (req, res, next) => {
    let user_db_handler = await ImportHandler.user_db_handler;
    let submitter_db_handler = await ImportHandler.submitter_db_handler;
    let submission_db_handler = await ImportHandler.submission_db_handler;
    let course_db_handler = await ImportHandler.course_db_handler;

    try {
        let user_login_data;
        let auth_type = req.body.auth_type;

        if (auth_type === 'Google')
            user_login_data = req.body.auth || req.body.user_data;
        else if (auth_type === 'UBC_CWL')
            user_login_data = req.body.user_data;

        console.log(JSON.stringify(user_login_data));

        let user_key = await user_db_handler.add_user_to_db(ImportHandler, user_login_data, auth_type);

        // let user_data = await user_db_handler.get_user_data(user_key);
        //
        // let user_assignments = await Promise.all(user_data['submitters'].map(async (submitter) => {
        //     let submitter_data = await submitter_db_handler.get_submitter_data(submitter);
        //     let submission_data = await submission_db_handler.get_submission_data(submitter_data['submission']);
        //     return submission_data['assignment'];
        // }));
        //
        // for (const course of user_data['enrolments'])
        //     await course_db_handler.create_submitters_for_student(ImportHandler, user_key, course, user_assignments);

        res.sendStatus(200);
    } catch (e) {
        console.warn(e);
        res.status(500).send({
            message: e.message
        });
    }
});



/*
 ** DELETE all courses
 */
router.delete('/', function(req, res, next) {
    res.sendStatus(403);
});



module.exports = router;
