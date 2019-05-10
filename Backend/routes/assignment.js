var express = require('express');
var router = express.Router({mergeParams: true});


/*
 ** GET all course assignments
 * TODO: permission level to view all course assignments
 */
router.get('/', function(req, res, next) {
    console.log("Get request for all assignments in course with id: " + req.params.course_id);
    res.sendStatus(501);
});


/*
 ** GET a course assignments
 * TODO: view a course assignment
 */
router.get('/:assignment_id', function(req, res, next) {
    console.log("Get request for assignment with id: " + req.params.assignment_id);
    res.sendStatus(501);
});



/*
 ** PUT to all course assignments, do not need this
 */
router.put('/', function(req, res, next) {
    res.sendStatus(403);
});


/*
 ** PUT to a course assignment, replaces the assignment
 * TODO: replaces a course assignment
 */
router.put('/:assignment_id', function(req, res, next) {
    console.log("Put request for assignment with id: " + req.params.assignment_id);
    res.sendStatus(501);
});



/*
 ** POST to all course assignments
 * TODO: permission level to add a course assignment
 */
router.post('/', function(req, res, next) {
    res.sendStatus(501);
});


/*
 ** POST to a course assignment, do not need this
 */
router.post('/:assignment_id', function(req, res, next) {
    res.sendStatus(403);
});



/*
 ** DELETE all course assignments
 */
router.delete('/', function(req, res, next) {
    res.sendStatus(403);
});


/*
 ** DELETE a course assignment
 * TODO: delete a course assignment
 */
router.delete('/:assignment_id', function(req, res, next) {
    console.log("Delete request for assignment with id: " + req.params.assignment_id);
    res.sendStatus(501);
});


module.exports = router;
