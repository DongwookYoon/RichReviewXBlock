/**
 * Server side API routes
 *
 * Created by Colin
 */

const express = require('express');
const router   = express.Router();

const classController = require('../controllers/classController');

// TODO: make an auth to prevent unauthorized access!!!
router.get('/class/fetch_courses', classController.getCourses);
/*router.get('/class/fetch_course_users/:course_key',
  classController.getUsersFromCourse);
router.get('/class/fetch_course_assignments/:course_key',
  classController.getAssignmentsFromCourse);*/

module.exports = router;