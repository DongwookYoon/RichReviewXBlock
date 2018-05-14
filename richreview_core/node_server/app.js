/**
 *
 * The App
 */

console.log("START: Starting app.js");

console.log("START: importing built-in modules");
var http = require('http');
var path = require('path');
var fs = require('fs');

console.log("START: importing express");
var express = require('express');
var expressSession = require('express-session');

console.log("START: importing npm modules");
var bodyParser = require('body-parser');
var logger = require('morgan');
var mkdirp = require('mkdirp');
var compression = require('compression');

console.log("START: importing env.js");
var env = require('./lib/env.js');

console.log("START: importing passport");
var passport = require('passport');

console.log("       importing passport-google-oauth20");
var GoogleStrategy = require('passport-google-oauth20').Strategy;

console.log("       importing passport-azure-ad");
const wsfedsaml2 = require('./passport-azure-ad').WsfedStrategy;

console.log("       importing passport-lti");
var LtiStrategy = require('passport-lti');

console.log("START: importing libraries");
var js_utils = require('./lib/js_utils.js');
var R2D = require('./lib/r2d.js');
var LtiEngine = require('./lib/lti_engine.js');
var redis_client = require('./lib/redis_client.js');

console.log("START: connecting to redis");
var RedisStore = require('connect-redis')(expressSession);

console.log("START: importing routes");
var _downloader = require('./routes/_downloader');
var _pages = require('./routes/_pages');
var support = require('./routes/support');
var mygroups = require('./routes/mygroups');
var account = require('./routes/account');
var doc = require('./routes/doc');
var upload = require('./routes/upload');
var viewer = require('./routes/viewer');
var dataviewer = require('./routes/dataviewer');
var dbs = require('./routes/dbs');
var resources = require('./routes/resources');
var course = require('./routes/course');
var bluemix_stt_auth = require('./routes/bluemix_stt_auth');
var lti = require('./routes/lti');

mkdirp('../_temp');
mkdirp('../cache');
mkdirp('../cache/audio');
mkdirp(env.path.temp_pdfs);

const app = express();

console.log("START: setup view engine");
// todo: convert to pug
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

console.log("START: use middleware");
app.use(compression());
app.use(logger('tiny'));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true }));

app.use(
    expressSession(
        {
            store: new RedisStore(
                {
                    client: redis_client.redisClient
                }),
            secret: env.redis_config.auth,
            saveUninitialized: true,
            resave: false,
            cookie: { maxAge: 3*60*60*1000 }
        }
    )
);

console.log("START: set up passport");
passportSetup();

console.log("START: set static pages");
setupStaticPages();

console.log("START: switch lti for user if needed");
app.use(function(req, res, next){
    if(req.user instanceof LtiEngine.User){
        if( (req.url !== '/bluemix_stt_auth' && req.url.substring(0, 5) !== '/lti_') && req.method !== 'POST'){
            req.logout();
        }
    }
    next();
});


setupServices();

setRedirections();

setErrLog();

app_http = redirectHttp();



// setup static page services
function setupStaticPages(){
    app.use(
        express.static(path.join(__dirname, 'public'))
    );
    app.use(
        '/static_viewer',
        express.static(path.resolve(__dirname, '..', env.path.webapp_richreview), { maxAge: 30*1000 })
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

// passport-based login layer
function passportSetup(){
    // passport

    console.log("PASSPORT: use initialize and session");
    app.use(passport.initialize());
    app.use(passport.session());

    passport.serializeUser(function(user, done){
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done){
        LtiEngine.UserMgr.getById(id).catch(
            function(err){
                return R2D.User.prototype.findById(id).then(
                    function(user){
                        return user;
                    }
                );
            }
        ).then(
            function(user){
                done(null, user);
                return null;
            }
        ).catch(
            function(err){
                console.error(err);
                done(null, null);
            }
        );
    });

    // Cornell NetID
    // TODO: make passport work with wsfedsaml2
    console.log("PASSPORT: use wsfedsaml2 auth with cornell wsfed");
    passport.use(
        new wsfedsaml2(
            env.cornell_wsfed,
            function(profile, done){
                R2D.User.prototype.findByEmail(profile.upn).then(
                    function(user){
                        if(user){
                            return user;
                        }
                        else{
                            var email = profile.upn;
                            var newid = js_utils.generateSaltedSha1(email, env.sha1_salt.netid).substring(0, 21);
                            return R2D.User.prototype.create(
                                newid,
                                email
                            );
                        }
                    }
                ).then(
                    function(user){
                        done(null, user);
                    }
                ).catch(done);
            }
        )
    );

    console.log("PASSPORT: set up login_cornell routing");
    app.get(
        '/login_cornell',
        passport.authenticate('wsfed-saml2', { failureRedirect: '/login_cornell', failureFlash: true }),
        function(req, res){
            res.redirect(req.session.latestUrl || '/');
        }
    );
    app.post('/login_cornell_return',
        passport.authenticate('wsfed-saml2', { failureRedirect: '/login_cornell', failureFlash: true }),
        function(req, res) {
            js_utils.logTimeAndUser(req, 'Login');
            res.redirect(req.session.latestUrl || '/');
        }
    );

    /**
     * use strategy OAuth2.0 with Google ID
     *
     * TODO: test strategy
     */
    //
    console.log("PASSPORT: set up Google auth");
    const redirect_uri = process.env.NODE_ENV === "development" ?
        env.google_oauth.redirect_uris[1] : env.google_oauth.redirect_uris[0];
    passport.use(
        new GoogleStrategy(
            {
                clientID: env.google_oauth.client_id,
                clientSecret: env.google_oauth.client_secret,
                callbackURL: redirect_uri,
            },
            function (accessToken, refreshToken, profile, done){
                var email = profile.emails.length !== 0 ? profile.emails[0].value : '';
                R2D.User.prototype.isExist(profile.id).then(
                    function(is_exist){
                        if(is_exist){
                            return R2D.User.prototype.findById(profile.id).then(
                                function(user){
                                    return R2D.User.prototype.syncEmail(user, email);
                                }
                            );
                        }
                        else{
                            return R2D.User.prototype.create(profile.id, email);
                        }
                    }
                ).then(
                    function(user){
                        done(null, user);
                    }
                ).catch(done);
            }
        )
    );
    app.get(
        '/login_google',
        passport.authenticate( 'google', { scope:['email'] } )
    );
    app.get(
        '/login-oauth2-return',
        passport.authenticate( 'google', { failureRedirect: '/login_google' } ),
        function(req, res) { res.redirect(req.session.latestUrl || '/'); }
    );

    var EDX_LTI_CONSUMER_OAUTH = {
        key: 'xh0rSz5O03-richreview.cornellx.edu',
        secret: 'sel0Luv73Q'
    };

    // LTI ID
    passport.use(
        new LtiStrategy(
            {
                consumerKey: EDX_LTI_CONSUMER_OAUTH.key,
                consumerSecret: EDX_LTI_CONSUMER_OAUTH.secret
                // pass the req object to callback
                // passReqToCallback: true,
                // https://github.com/omsmith/ims-lti#nonce-stores
                // nonceStore: new RedisNonceStore('testconsumerkey', redisClient)
            },
            function(profile, done) {
                LtiEngine.UserMgr.logIn(profile).then(
                    function(user){
                        console.log('LTI_LOGIN:', user);
                        return done(null, user);
                    }
                ).catch(
                    function(err){
                        console.error('LtiStrategy:', err);
                        return done(err, null);
                    }
                );
            }
        )
    );
    app.post(
        '/login_lti',
        passport.authenticate(
            'lti',
            {
                scope:['email'],
                successRedirect: '/lti_entry',
                failureRedirect: '/lti_failure',
                failureFlash: true
            }
        )
    );
}


// setup services for GET and POST requests
function setupServices(){
    // get requests
    app.get('/',            _pages.about);
    app.get('/about',       _pages.about);
    app.get('/logout',      _pages.logout);
    app.get('/input_test',  _pages.input_test);
    app.get('/admin',       _pages.admin);
    app.get('/downloader',  _downloader.dn);
    app.get('/support',     support.get);
    app.get('/mydocs',      doc.get);
    app.get('/mygroups',    mygroups.get);
    app.get('/upload',      upload.page);
    app.get('/viewer',      viewer.page);
    app.get('/dataviewer',  dataviewer.get);
    app.get('/account',     account.get);
    app.get('/resources',   resources.get);
    app.get('/math2220_sp2016',    course.get);
    app.get('/bluemix_stt_auth', bluemix_stt_auth.get);
    app.get('/lti_entry',       lti.get_entry);
    app.get('/lti_failure',     lti.get_failure);
    app.get('/lti_admin',       lti.get_admin);
    app.get('/lti_survey',      lti.get_survey);
    app.get('/lti_observe',     lti.get_observe);
    app.get('/lti_discuss_rr',  lti.get_discuss_rr);
    app.get('/lti_discuss_bb',  lti.get_discuss_bb);
    app.get('/synclog',     _pages.getSyncLog);

    // post requests
    app.post('/dbs',        dbs.post);
    app.post('/account',    account.post);
    app.post('/dataviewer', dataviewer.post);
    app.post('/upload',     upload.post);
    app.post('/support',    support.post);
    app.post('/resources',  resources.post);
    app.post('/course',     course.post);
    app.post('/lti_dbs',    lti.post_dbs);
    app.post('/lti_survey', lti.post_survey);
    app.post('/lti_discuss_bb', lti.post_bb);
}

// redirections
function setRedirections(){
    app.get(
        '/math2220',
        function(req, res) {
            res.redirect("/math2220_sp2016");
        }
    );

    app.get(
        '/demo',
        function(req, res) {
            res.redirect("/demo0");
        }
    );

    app.get(
        '/demo0',
        function(req, res) {
            res.redirect("/viewer?access_code=7bf0f0add24f13dda0c0a64da0f45a0a6909809e&docid=116730002901619859123_1416501969000&groupid=116730002901619859123_1424986924617");
        }
    );

    app.get(
        '/demo1',
        function(req, res) {
            res.redirect("/viewer?access_code=dd6372ae2e677aa6a0bb7a9ff239094fd48ac6c7");
        }
    );

    app.get(
        '/demo2',
        function(req, res) {
            res.redirect("/viewer?access_code=ecff389d8486935ae7f3835c8420377c015a43b8");
        }
    );
}

// render error logs
function setErrLog(){
    if (app.get('env') === 'development') {
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
    var app_http = express();
    app_http.get("*", function (req, res) {
        res.redirect("https://" + req.headers.host + req.path);
    });
    return app_http;
}


// exports http and https apps to www
module.exports.https = app;
module.exports.http = app_http;

