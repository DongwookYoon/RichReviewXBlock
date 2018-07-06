/**
 * Course
 *
 * The file for the Course class
 *
 * created by Colin
 */

// import npm modules
const Promise = require("promise"); // jshint ignore:line

// import libraries
const js_utils = require('./js_utils.js');
const RedisClient = require('./redis_client').RedisClient;
const util = require('../util');

const Course = {};

exports.Course = Course;