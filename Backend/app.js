var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

/*
 ** Routers
 */
var indexRouter = require('./routes/index');
var courseRouter = require('./routes/course');
var assignmentRouter = require('./routes/assignment');
var userRouter = require('./routes/user');
var loginRouter = require('./routes/login');
var groupRouter = require('./routes/group');
var gradesRouter = require('./routes/grades');


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
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
app.use('/login', loginRouter);
app.use('/courses', courseRouter);
app.use('/courses/:course_id/assignments', assignmentRouter);
app.use('/courses/:course_id/users', userRouter);
app.use('/courses/:course_id/groups', groupRouter);
app.use('/courses/:course_id/grades', gradesRouter);



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
