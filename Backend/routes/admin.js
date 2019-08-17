const formidable = require("formidable");

var express = require('express');
var router = express.Router({mergeParams: true});
const KeyDictionary = require('../bin/KeyDictionary');
let ImportHandler = require('../bin/ImportHandler');


/*
 ** GET if a user is admin
 */
router.get('/is_admin', async function(req, res, next){

    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;

    console.log("Get if a user is admin: " + user_key);

    let user_db_handler = await ImportHandler.user_db_handler;

    try {
        var is_admin = await user_db_handler.is_admin(user_key)
        res.send(is_admin);
    } catch (e) {
        console.log(e);
        res.status(500).send({message: e.message});
    }
});

/*
 ** GET all ubc and google users in the system
 */
router.get('/all_user_data', async function(req, res){
    console.log("Get request for all user data in the system");
    let user_db_handler = await ImportHandler.user_db_handler;
    let user_data = await user_db_handler.get_all_user_data();
    try {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({user_data: user_data}));
    } catch (e) {
        console.log(e);
        res.status(500).send({
            message: e.message
        });
    }
});

/*
 ** GET all courses in the system
 */
router.get('/all_course_data', async function(req, res){
    console.log("Get request for all course data in the system");
    let course_db_handler = await ImportHandler.course_db_handler;
    let course_data = await course_db_handler.get_all_course_data();
    try {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({course_data: course_data}));
    } catch (e) {
        console.log(e);
        res.status(500).send({
            message: e.message
        });
    }
});

module.exports = router;
