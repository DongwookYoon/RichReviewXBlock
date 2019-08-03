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

    try {
        let user_data;
        let auth_type = req.body.auth_type;

        if (auth_type === 'Google')
            user_data = req.body.auth;
        else if (auth_type === 'UBC_CWL')
            user_data = req.body.user_data;

        await user_db_handler.add_user_to_db(ImportHandler, user_data, auth_type);
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
