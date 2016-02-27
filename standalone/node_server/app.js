var express = require('express');
var expressSession = require('express-session');
var path = require('path');
var http = require('http');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mkdirp = require('mkdirp');
var fs = require('fs');

var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var wsfedsaml2 = require('passport-azure-ad').WsfedStrategy;
var R2D = require('./lib/r2d.js');
var redis_client = require('./lib/redis_client.js');
var env = require('./lib/env.js');
var RedisStore = require('connect-redis')(expressSession);

var _downloader = require('./routes/_downloader');
var _pages = require('./routes/_pages');
var support = require('./routes/support');
var mygroups = require('./routes/mygroups');
var account = require('./routes/account');
var docs = require('./routes/docs');
var doc = require('./routes/doc');
var upload = require('./routes/upload');
var viewer = require('./routes/viewer');
var dataviewer = require('./routes/dataviewer');
var dbs = require('./routes/dbs');
var resources = require('./routes/resources');
var course = require('./routes/course');
var bluemix_stt_auth = require('./routes/bluemix_stt_auth');

mkdirp('../_temp');
mkdirp('../cache');
mkdirp('../cache/audio');
mkdirp(env.path.temp_pdfs);

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

//app.use(favicon('/public/favicon.ico'));
app.use(logger('dev'));

//app.use(bodyParser({limit: '5mb'}));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true }));

app.use(cookieParser('rich.reviewer@cornell'));
app.use(
    express.static(path.join(__dirname, 'public'))
);
app.use(
    '/static_viewer',
    express.static(path.resolve(__dirname, env.path.webapp_richreview), { maxAge: 30*1000 })
);
app.use(
    '/static_multicolumn',
    express.static(path.resolve(__dirname, env.path.webapp_multicolumn), { maxAge: 30*1000 })
);
app.use(
    '/mupla_pdfs',
    express.static(path.resolve(__dirname, env.path.temp_pdfs), { maxAge: 30*1000 })
);
app.use(
    expressSession(
        {
            store: new RedisStore(
                {
                    client: redis_client.redisClient
                }),
            secret: 'rich.reviewer@cornell',
            saveUninitialized: true,
            resave: false,
            cookie: { maxAge: 3*60*60*1000 }
        }
    )
);
app.use(passport.initialize());
app.use(passport.session());

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

var google_oauth = JSON.parse(fs.readFileSync(env.config_files.google_open_id, 'utf-8'));
passport.use(
    new GoogleStrategy(
        {
            clientID: google_oauth.web.client_id,
            clientSecret: google_oauth.web.client_secret,
            callbackURL: google_oauth.web.redirect_uris[0]
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
passport.serializeUser(function(user, done){
    done(null, user.id);
});
passport.deserializeUser(function(id, done){
    R2D.User.prototype.findById(id).then(
        function(user){
            done(null, user);
        }
    ).catch(
        function(err){
            done(null, null);
        }
    );
});

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
//app.get('/docs',        docs.page);

app.post('/dbs',        dbs.post);
app.post('/account',    account.post);
app.post('/dataviewer', dataviewer.post);
app.post('/docs',       docs.page);
app.post('/upload',     upload.post);
app.post('/support',    support.post);
app.post('/uploadaudioblob', upload.post_audioblob);
app.post('/resources',  resources.post);
app.post('/course',     course.post);


/*
 Google ID logins
 */
app.get(
    '/login_google',
    passport.authenticate(
        'google', {scope:['email']}
    )
);
app.get(
    '/login-oauth2-return',
    passport.authenticate('google', { failureRedirect: '/login_google' }),
    function(req, res) {
        res.redirect(req.session.latestUrl || '/');
    }
);

/*
 Cornell ID logins
 */
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
        res.redirect(req.session.latestUrl || '/');
    }
);


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

if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        console.log(err);
        console.log(err.stack);
        res.status(err.status || 500);
        res.render('_error', {
            msg: err.name,
            error: err
        });
        next();
    });
}

module.exports.https = app;

/** redirect all http requests to https */
var appHttp = express();
appHttp.get("*", function (req, res, next) {
    res.redirect("https://" + req.headers.host + req.path);
});
module.exports.http = appHttp;


/** testcode. TODO: remove */
var azure = require('./lib/azure');

var to_upload_video = false;
if(to_upload_video){
    upload.upload_intro_video().then(
        function(rtn){
            console.log(rtn);
        }
    ).catch(
        function(err){
            console.error(err);
        }
    );
}

function DownloadBlob(c,b,cb){
    azure.BlobFileDownload(c, b, '../cache/'+c+'/'+b, function(error){
        if(error){
            cb(error);
            console.log(error);
        }
        else{
            cb();
        }
    });
}

function DownloadContainer(c, cb){
    var success = 0;
    var failed = 0;
    var total = 0;
    var errors = null;

    mkdirp('../cache/'+c, function(){
        azure.svc.listBlobsSegmented(c, null, function (error, blobs) {
            total = blobs.entries.length;
            if (error) {
                console.log(error);
            }
            else {
                for(b in blobs.entries) {
                    (function(b){
                        b = blobs.entries[b].name;
                        DownloadBlob(c,b, function(error){
                            if(error){
                                ++failed;
                                if(errors == null){errors = [];}
                                errors.push(error);
                                Done(errors);
                            }
                            else{
                                ++success;
                                Done(errors);
                            }
                            console.log('DownloadBlob C:', c, " B:", b);
                        });
                    })(b);
                }
            }
        });
    });
    var Done = function(errors){
        console.log(' ', success+failed, '/', total);
        if(success+failed == total){
            if(errors == []){
                cb();
            }
            else{
                cb(errors);
            }

        }
    };
}

function DownloadAllContainer(){
    azure.svc.listContainersSegmented(null, function(error, result){
        if(error){
            console.log(error);
        }
        else{
            for(c in result.entries){
                c = result.entries[c];
                console.log('Container :', c.name);
                DownloadContainer(c.name, function(error){
                    if(error){
                        console.log('DownloadContainer Failed:', c.name, error);
                    }
                    else{
                        console.log('DownloadContainer Done:', c.name);
                    }
                })
            }
        }
    });

}

//DownloadAllContainer();

function ValidateDocFolder(path, l){
    var files = [];
    for(var i = 0; f = l[i]; ++i) {
        if(!fs.lstatSync(path+'/'+f).isDirectory() && f[0]!='.'){
            files.push(f);
        }
    }
    var valid = true;
    var error_msg = '';
    for(var i = 0; f = files[i]; ++i) {
        if(fs.lstatSync(path+'/'+f).size==0){
            valid = false;
            error_msg = 'Invalid file '+ path + '/' + f;
        }
        if(!/^([1-9]([0-9]{3}))-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9]).(2[0-3]|[01][0-9])-([0-5][0-9])-([0-5][0-9]).([0-9]+)Z.(wav|vs_annot)$/.test(f) &&
            (f != 'doc.pdf' && f != 'doc.vs_doc' && f != 'nickname.txt')){
            valid = false;
            error_msg = 'Invalid file '+ path + '/' + f;
        }
    }
    return files;
}


js_utils = require('./lib/js_utils');

UploadFolderToAzureBlobStorage = function(path, container, blobPrefix, cb){
    azure.svc.createContainerIfNotExists(container, { publicAccessLevel : 'blob' }, function(err, result){
        if(err){cb(err);}
        else{
            js_utils.listFolder(path).then(
                function(result_foldersearch){
                    if(result_foldersearch.files.length == 0){
                        cb(null, null);
                        return null;
                    }
                    else{
                        var job = function(i){
                            azure.svc.createBlockBlobFromLocalFile(
                                container,
                                blobPrefix+'/'+result_foldersearch.files[i],
                                path+'/'+result_foldersearch.files[i],
                                function(err, result){
                                    if(err){cb(err);}
                                    else{
                                        if(i < result_foldersearch.files.length-1){
                                            job(i+1)
                                        }
                                        else{
                                            cb(null, i+1);
                                        }

                                    }
                                }
                            );
                        };
                        job(0);
                        return null;
                    }
                }
            );
        }
    });
};

function UploadBlockBlobFromLocalFileList(container, blob_path, file_path, file_list, cb){
    var sucess = 0;
    var failed = 0;
    var saved_error = null;
    for(var i = 0; f = file_list[i]; ++i) {
        (function(f){
            azure.svc.createBlockBlobFromLocalFile(container, blob_path+'/'+f, file_path+'/'+f, function(error, result, response){
                if(error){
                    failed++;
                    Done(error);
                }
                else{
                    sucess++;
                    Done(error);
                }
            })
        })(f);
    }
    function Done(error){
        if(error){
            saved_error = error;
        }
        if(failed+sucess == file_list.length){
            if(cb)
                cb(saved_error);
        }
    }
}