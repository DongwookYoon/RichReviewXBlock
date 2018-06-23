/**
 * Server side API routes
 *
 * Created by Colin
 */

const express = require('express');
const router   = express.Router();

const classController = require('../controllers/classController');

router.get('/class/fetch_courses', classController.getCourses);
router.get('/class/fetch_users/:course_key', classController.getUsers);
router.get('/class/fetch_assignments', classController.getAssignments);

module.exports = router;