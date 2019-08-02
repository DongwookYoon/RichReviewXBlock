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
    if (req.body.auth_type === 'Google') {
        let user_db_handler = await ImportHandler.user_db_handler;

        try {
            await user_db_handler.add_user_to_db(req.body.auth, 'Google');
            res.sendStatus(200);
        } catch (e) {
            console.warn(e);
            res.status(500).send({
                message: e.message
            });
        }

    } else if (req.body.auth_type === 'UBC_CWL') {
        console.log('UBC user');
        res.sendStatus(501);
    }
});



/*
 ** DELETE all courses
 */
router.delete('/', function(req, res, next) {
    res.sendStatus(403);
});



module.exports = router;
