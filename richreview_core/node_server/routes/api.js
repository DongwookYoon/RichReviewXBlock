/**
 * Server side API routes
 *
 * Created by Colin
 */

const express = require('express');
const router   = express.Router();

const classController = require('../controllers/classController');

router.get('/class/fetch', classController.fetch);

module.exports = router;