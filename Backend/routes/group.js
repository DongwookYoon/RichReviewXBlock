var express = require('express');
var router = express.Router();
const KeyDictionary = require("../bin/KeyDictionary");
const ImportHandler = require("../bin/ImportHandler");

/*
 ** GET
 */
router.get('/', function(req, res, next) {
    res.sendStatus(403);
});


router.get('/:group_id', async function(req, res, next) {
    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params['course_id'];
    let group_key = KeyDictionary.key_dictionary['group'] + req.params['group_id'];

    let group_db_handler = await ImportHandler.group_db_handler;

    try {
        let viewer_data = await group_db_handler.get_data_for_viewer(user_key, course_key, group_key);
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
    res.sendStatus(403);
});



/*
 ** DELETE all courses
 */
router.delete('/', function(req, res, next) {
    res.sendStatus(403);
});



module.exports = router;
