/* eslint-disable camelcase,no-unused-vars,no-console */
const path = require('path')
const express = require('express')
const session = require('express-session')
const flash = require('connect-flash')
const RedisStore = require('connect-redis')(session)
const env = require('./lib/env')

const redis_client = require('./lib/redis_client')

const app = express()

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

app.use(
  session({
    store: new RedisStore({
      client: redis_client.redisClient
    }),
    secret: env.redis_config.auth,
    saveUninitialized: false,
    resave: false,
    cookie: { maxAge: 3 * 60 * 60 * 1000 }
  })
)

app.use(flash())

app.use((req, res, next) => {
  res.locals.cdn_endpoint = env.azure_config.cdn.endpoint
  res.locals.host_url = env.node_config.HOST_URL
  res.locals.flashes = req.flash()
  res.locals.helper = {
    AUTH_TYPE: env.AUTH_TYPE
  }
  res.locals.user = req.user || null
  // console.log(env)
  next()
})

app.get('/', (req, res, next) => {
  // res.render('test', {})
  // req.session.latestUrl = req.originalUrl
  // debugger
  res.render('_pages_about', { cur_page: 'About', user: req.user })
})
// export the legacy middleware
module.exports = {
  path: '/',
  handler: app
}
