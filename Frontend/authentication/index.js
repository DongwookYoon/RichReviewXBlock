/* eslint-disable no-console */
const express = require('express')

// Create express instance
const app = express()

app.post('/', function(req, res) {
  console.log(req.body)
  res.sendStatus(200)
})

// todo hook this up to legayc routes
app.post('/api/logout', function(req, res) {
  delete req.session.authUser
  res.json(200)
})

// Export the server middleware
module.exports = {
  path: '/education/login-ubc',
  handler: app
}
