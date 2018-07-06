/**
 * The node_server app
 *
 */

const util = require('./util');

util.start("Starting app.js");

// import built-in modules
const path = require('path');

// import npm modules
util.start("importing npm modules");
const bodyParser = require('body-parser');
const logger = require('morgan');
const mkdirp = require('mkdirp');
const compression = require('compression');
const passport = require('passport');
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');

// set up redis store
util.start("setting up redis store");
const RedisStore = require('connect-redis')(session);

// import libraries
util.start("importing libraries");
const env = require('./lib/env.js');
const LtiEngine = require('./lib/lti_engine.js');
const redis_client = require('./lib/redis_client.js');

util.start("importing controllers");
const routes    = require('./routes/index');
const apiRoutes = require('./routes/api');

util.start("setting up passport");
require('./lib/passport');

// util.start("importing test userids");
// require('./data/import_pilot_study_users');

util.start("making temp and cache files");
mkdirp('../_temp');
mkdirp('../cache');
mkdirp('../cache/audio');
mkdirp(env.path.temp_pdfs);

const app = express();

util.start("setup view engine");
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

util.start("using middleware");
app.use(compression());
app.use(logger('tiny'));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true }));
app.use(session({
    store: new RedisStore({
        client: redis_client.redisClient
    }),
    secret: env.redis_config.auth,
    saveUninitialized: false,
    resave: false,
    cookie: { maxAge: 3*60*60*1000 }
}));

util.start("initialize passport");
app.use(passport.initialize());
app.use(passport.session());

util.start("set static pages");
setupStaticPages();

app.use(flash());

app.use((req, res, next) => {
    // req.session.latestUrl = req.originalUrl; // TODO: ask Dongwook about this
    res.locals.cdn_endpoint = env.azure_config.cdn.endpoint;
    res.locals.host_url     = env.node_config.HOST_URL;
    res.locals.flashes = req.flash();
    res.locals.user = req.user || null;
    next();
});

util.start("switch lti for user if needed(?)");
app.use((req, res, next) => {
    if(req.user instanceof LtiEngine.User) {
        if( (req.url !== '/bluemix_stt_auth' && req.url.substring(0, 5) !== '/lti_') && req.method !== 'POST'){
            req.logout();
        }
    }
    next();
});

util.start("setting up routes");
app.use('/', routes);
app.use('/api', apiRoutes);

util.start("setting up error log");
setErrLog();

util.start("using redirect http middleware");
let app_http = redirectHttp();

/******************************************/
/******************************************/

function setupStaticPages(){
    app.use(
        express.static(path.join(__dirname, 'public'))
    );

    app.use(
        '/static_viewer',
        express.static(path.resolve(__dirname, '..', env.path.webapp_richreview), { maxAge: 30*1000 })
    );

    app.use(
        '/static_react',
        express.static(path.resolve(__dirname, 'dist'), { maxAge: 30*1000 })
    );

    app.use(
        '/static_multicolumn',
        express.static(path.resolve(__dirname, '..', env.path.webapp_multicolumn), { maxAge: 30*1000 })
    );

    app.use(
        '/mupla_pdfs',
        express.static(path.resolve(__dirname, env.path.temp_pdfs), { maxAge: 30*1000 })
    );

    app.use(
        '/rrr',
        express.static('/home/rrr/', { maxAge: 30*1000 })
    );
}

// render error logs
function setErrLog() {
    // if (app.get('env') === 'development') {
    if (process.env.NODE_ENV === 'development') {
        app.use(function(err, req, res, next) {
            console.error('setErrLog:', err);
            console.error(err.stack);
            res.status(err.status || 500);
            if(req.method === 'POST'){
                res.redirect('/lti_failure');
            }
            else if(req.method === 'GET'){
                res.render('_error', {
                    msg: err.name,
                    error: err
                });
            }
            next();
        });
    }
    else{
        app.use(function(err, req, res, next) {
            console.error('setErrLog:', err);
            if(err.stack){
                console.error(err.stack);
            }
            if(next){
                next();
            }
        });
    }
}

// all http request will be redirected to https
function redirectHttp(){
    /** redirect all http requests to https */
    let app_http = express();
    app_http.get("*", function (req, res) {
        res.redirect("https://" + req.headers.host + req.path);
    });
    return app_http;
}

/******************************************/
/******************************************/

// exports http and https apps to www
module.exports.https = app;
module.exports.http = app_http;

