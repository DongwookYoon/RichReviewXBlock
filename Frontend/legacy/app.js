/* eslint-disable camelcase,no-unused-vars,no-console,import/order */
const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')

// import npm modules
const Promise = require('promise') // jshint ignore:line

// set env variables
const env = require('./lib/env')
process.env.HOSTNAME = env.node_config.HOSTNAME || os.hostname()
process.env.NODE_ENV = env.node_config.ENV
process.env.HOST_URL = env.node_config.HOST_URL

// import libraries
const util = require('./util')
const file_utils = require('./lib/file_utils')
const azure = require('./lib/azure')

// declare constants

const HOSTNAME =
  process.env.NODE_ENV === 'production' ? 'richreview' : 'localhost'
const HASHFILE = HOSTNAME + '/richreview_webapp_hash.txt'
const WEBAPP_PATH = path.resolve(__dirname, '../webapps/richreview/')

util.start('App NODE_ENV:' + process.env.NODE_ENV)

const webAppSync = (function() {
  let files = null

  const pub = {}
  pub.run = function() {
    util.start('doing web-app sync')
    return getBlobStorageHash()
      .then(function(storage_hash) {
        const local_hash = getLocalFileHash(getLocalFileList())
        if (local_hash === storage_hash) {
        } else {
          console.log(
            'WebApp Updated:',
            storage_hash,
            ' (storage), ',
            local_hash,
            ' (local)'
          )
          return uploadLocalFile(getLocalFileList()).then(function(resp) {
            console.log(resp)
            return setBlobStorageHash(local_hash)
          })
        }
      })
      .then(function() {
        console.log('WebAppSync successfully finished.')
      })
      .catch(function(err) {
        console.error(err, err.stack)
      })
  }

  function getBlobStorageHash() {
    return azure
      .DoesBlobExist({ container: 'cdn', blob: HASHFILE })
      .then(function(ctx) {
        if (ctx.is_blob_exist) {
          return azure.GetBlobToText(ctx).then(function(ctx) {
            return ctx.text
          })
        } else {
          return null
        }
      })
  }

  function setBlobStorageHash(text) {
    return azure.SetBlobFromText({
      container: 'cdn',
      blob: HASHFILE,
      text: text
    })
  }

  function getLocalFileList() {
    if (files) {
      return files
    }
    files = []
    const all_files = []
    file_utils.walkSync(WEBAPP_PATH, all_files)
    const valid_exts = ['.js', '.css', '.html']
    for (const i in all_files) {
      const path = all_files[i]
      for (const j in valid_exts) {
        const valid_ext = valid_exts[j]
        if (
          path.slice(path.length - valid_ext.length, path.length) === valid_ext
        ) {
          files.push(path)
          break
        }
      }
    }
    return files
  }

  function getLocalFileHash(files) {
    files.sort()
    const shasum = crypto.createHash('sha1')
    for (const i in files) {
      shasum.update(files[i])
      shasum.update(fs.readFileSync(files[i]).toString())
    }
    return shasum.digest('hex').toLowerCase()
  }

  function uploadLocalFile(files) {
    const promises = files.map(function(file) {
      return azure.CreateBlobFromLocalFile({
        container: 'cdn',
        blob: HOSTNAME + file.slice(WEBAPP_PATH.length, file.length),
        blob_localfile_path: file
      })
    })
    return Promise.all(promises)
  }

  return pub
})()

util.start('Running web app sync')
webAppSync.run()

// const util = require('./util')

util.start('Starting app.js')

// import built-in modules
// const path = require('path')

// import npm modules
util.start('importing npm modules')
const bodyParser = require('body-parser')
const logger = require('morgan')
const mkdirp = require('mkdirp')
const compression = require('compression')
const passport = require('passport')
const express = require('express')
const session = require('express-session')
const flash = require('connect-flash')

// set up redis store
util.start('setting up redis store')
const RedisStore = require('connect-redis')(session)

// import libraries
util.start('importing libraries')
// const env = require('./lib/env')
const redis_client = require('./lib/redis_client')

util.start('importing controllers')
const routes = require('./routes/index')

util.start('setting up passport')
require('./lib/passport')

util.start('making temp and cache files')
mkdirp('../_temp')
mkdirp('../cache')
mkdirp('../cache/audio')
mkdirp(env.path.temp_pdfs)

const app = express()

util.start('setup view engine')
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

util.start('using middleware')
app.use(compression())
app.use(logger('tiny'))
app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))
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

util.start('initialize passport')
app.use(passport.initialize())
app.use(passport.session())

util.start('set static pages')
setupStaticPages()

app.use(flash())

app.use((req, res, next) => {
  res.locals.cdn_endpoint = env.azure_config.cdn.endpoint
  res.locals.host_url = env.node_config.HOST_URL
  res.locals.flashes = req.flash()
  res.locals.helper = {
    AUTH_TYPE: env.AUTH_TYPE
  }
  res.locals.user = req.user || null
  console.log(req.session)
  next()
})

util.start('setting up routes')
app.use('/', routes)

util.start('setting up error log')
setErrLog()

util.start('using redirect http middleware')
// all http request will be redirected to https
function redirectHttp() {
  /** redirect all http requests to https */
  const app_http = express()
  app_http.get('*', function(req, res) {
    res.redirect('https://' + req.headers.host + req.path)
  })
  return app_http
}
const app_http = redirectHttp()

/******************************************/
/******************************************/

function setupStaticPages() {
  app.use(express.static(path.join(__dirname, 'public')))

  app.use(
    '/static_viewer',
    express.static(path.resolve(__dirname, '..', env.path.webapp_richreview), {
      maxAge: 30 * 1000
    })
  )

  app.use(
    '/static_react',
    express.static(path.resolve(__dirname, 'dist'), { maxAge: 30 * 1000 })
  )

  app.use(
    '/static_multicolumn',
    express.static(path.resolve(__dirname, '..', env.path.webapp_multicolumn), {
      maxAge: 30 * 1000
    })
  )

  app.use(
    '/mupla_pdfs',
    express.static(path.resolve(__dirname, env.path.temp_pdfs), {
      maxAge: 30 * 1000
    })
  )

  app.use(
    '/CDN',
    express.static(path.resolve(__dirname, 'cdn'), { maxAge: 30 * 1000 })
  )
}

// render error logs
function setErrLog() {
  // if (app.get('env') === 'development') {
  if (process.env.NODE_ENV === 'development') {
    app.use(function(err, req, res, next) {
      console.error('setErrLog:', err)
      console.error(err.stack)
      res.status(err.status || 500)
      if (req.method === 'POST') {
        res.redirect('/lti_failure')
      } else if (req.method === 'GET') {
        res.render('_error', {
          msg: err.name,
          error: err
        })
      }
      next()
    })
  } else {
    app.use(function(err, req, res, next) {
      console.error('setErrLog:', err)
      if (err.stack) {
        console.error(err.stack)
      }
      if (next) {
        next()
      }
    })
  }
}

/******************************************/
/******************************************/

// export the legacy middleware

module.exports = {
  path: '/',
  handler: app,
  https: app,
  http: app_http
}
