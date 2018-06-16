/**
 * Server side API routes
 *
 * Created by Colin
 */

const express = require('express');
const router   = express.Router();

const classController = require('../controllers/classController');

router.get('/class/fetch_students', classController.fetchStudents);
router.get('/class/fetch_assignments', classController.fetchAssignments);
router.get('/class/fetch_courses', classController.fetchCourses);

module.exports = router;