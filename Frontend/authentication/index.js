/* eslint-disable no-console */
const express = require('express')

// Create express instance
const app = express()

app.post('/', function(req, res) {
  console.log(req.body)
  req.session.authUser = { user_name: req.body.urnOid0923421920030010011 }
  res.sendStatus(200)
})

// Export the server middleware
module.exports = {
  path: '/education/login-ubc',
  handler: app
}
