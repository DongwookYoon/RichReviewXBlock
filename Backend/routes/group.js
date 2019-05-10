var express = require('express');
var router = express.Router({mergeParams: true});
const GroupDatabaseHandler = require('../bin/GroupDatabaseHandler');
const KeyDictionary = require('../bin/KeyDictionary');


router.get('/', async function(req, res, next) {
    console.log("Get request for all groups in course with id: " + req.params.course_id);

    let group_db_handler = await GroupDatabaseHandler.get_instance();

    try {
        let groups = await group_db_handler.get_course_groups(KeyDictionary.key_dictionary['course'] + req.params.course_id);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(groups));
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
});

router.get("/:group_id", async function (req, res, next){

    let user_key = KeyDictionary.key_dictionary['user'] + req.headers.authorization;
    let group_key = KeyDictionary.key_dictionary['group'] + req.params.group_id;
    let course_key = KeyDictionary.key_dictionary['course'] + req.params.course_id;

    let group_db_handler = await GroupDatabaseHandler.get_instance();

    try {
        let groups = await group_db_handler.get_course_group(user_key, group_key, course_key);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(groups));
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
});

router.put("/", function (req, res, next){
    res.sendStatus(403);
});

router.put("/:group_id", function (req, res, next){
    res.sendStatus(501);
});

router.post("/", function (req, res, next){
    res.sendStatus(501);
});

router.post("/:group_id", function (req, res, next){
    res.sendStatus(403);
});

router.delete("/", function (req, res, next){
    res.sendStatus(403);
});

router.delete("/:group_id", function (req, res, next){
    res.sendStatus(501);
});

module.exports = router;