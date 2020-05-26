const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

/*
 ** Routers
 */
const indexRouter = require('./routes/index');
const courseRouter = require('./routes/course');
const assignmentRouter = require('./routes/assignment');
const ltiAssignmentRouter = require('./routes/lti_assignment');
const userRouter = require('./routes/user');
const loginRouter = require('./routes/login');
const course_groupRouter = require('./routes/course_group');
const gradesRouter = require('./routes/grades');
const groupRouter = require('./routes/group');
const dbsRouter = require('./routes/dbs');
const bluemixRouter = require('./routes/bluemix_stt_auth');
const adminRouter = require('./routes/admin');
//require('./lib/ELDAPSync');

const app = express();


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({extended: false, limit: '50mb'}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


/*
 ** Set headers to deal with cors
 */
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "*");
    res.header('Access-Control-Allow-Methods', 'POST, PUT, GET, OPTIONS, DELETE');
    next();
});



/*
 ** Set routers
 */
app.use('/', indexRouter);
app.use('/dbs', dbsRouter);
app.use('/login', loginRouter);
app.use('/bluemix_stt_auth', bluemixRouter);
app.use('/admin', adminRouter);
app.use('/', ltiAssignmentRouter)
app.use('/courses', courseRouter);
app.use('/courses/:course_id/assignments', assignmentRouter);
app.use('/courses/:course_id/users', userRouter);
app.use('/courses/:course_id/course_groups', course_groupRouter);
app.use('/courses/:course_id/grades', gradesRouter);
app.use('/courses/:course_id/groups', groupRouter);



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
