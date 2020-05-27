const formidable = require("formidable");

var express = require('express');
var router = express.Router({mergeParams: true});
const KeyDictionary = require('../bin/KeyDictionary');
let ImportHandler = require('../bin/ImportHandler');
const NotAuthorizedError = require('../errors/NotAuthorizedError');


router.get('/:group_id/:is_instructor', async function(req, res, next) {
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];
    let group_key = KeyDictionary.key_dictionary['group'] + req.params['group_id'];

    let group_db_handler = await ImportHandler.group_db_handler;
    let isInstructor = ((req.params['is_instructor'].toLowerCase()) === 'true')
    try {
        let viewer_data = await group_db_handler.get_data_for_viewer_lti(ImportHandler, group_key, isInstructor);
        viewer_data['r2_ctx']['serve_dbs_url'] = `https://${req.headers.host}/`;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(viewer_data));
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