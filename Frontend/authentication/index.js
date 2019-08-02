// /* eslint-disable no-console */
// const express = require('express')
// const passport = require('passport')
// require('./passport')
//
// // Create express instance
// const app = express()
//
// app.use(passport.initialize())
// app.use(passport.session())
//
// app.get(
//   '/',
//   passport.authenticate('saml', {
//     failureRedirect: '/',
//     failureFlash: true
//   }),
//   function(req, res) {
//     console.log('here')
//     window.open('www.google.ca')
//     const fs = require('fs')
//     fs.writeFileSync('test.txt', 'test')
//     // res.redirect(req.session.latestUrl || '/')
//   }
// )
//
// // app.post(
// //   '/',
// //   passport.authenticate('saml', {
// //     failureRedirect: '/',
// //     failureFlash: true
// //   }),
// //   function(req, res) {
// //     console.log('here')
// //     window.open('www.google.ca')
// //     // res.redirect(req.session.latestUrl || '/')
// //   }
// // )
//
// // Export the server middleware
// module.exports = {
//   path: '/education/login-ubc',
//   handler: app
// }
