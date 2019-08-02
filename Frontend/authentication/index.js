/* eslint-disable no-console */
const express = require('express')

// Create express instance
const app = express()

app.post('/', function(req, res) {
  console.log(req.body)
})

// Export the server middleware
module.exports = {
  path: '/education/login-ubc',
  handler: app
}
