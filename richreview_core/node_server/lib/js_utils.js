/**
 * Created by ukka123 on 11/16/14.
 */

// import built-in modules
const fs = require('fs');

// import npm modules
const request    = require('request');
const mkdirp     = require('mkdirp');
const unzip      = require('unzip');
const moment     = require('moment');
const Promise    = require("promise"); // jshint ignore:line
const nodemailer = require('nodemailer');

const util = require('../util');

exports.CreateCleanFolderAsync = function(_path, callback){
    try {
        var deleteFolderRecursive = function (path) {
            if (fs.existsSync(path)) {
                fs.readdirSync(path).forEach(function (file, index) {
                    var curPath = path + "/" + file;
                    if (fs.lstatSync(curPath).isDirectory()) { // recurse
                        deleteFolderRecursive(curPath);
                    } else { // delete file
                        fs.unlinkSync(curPath);
                    }
                });
                fs.rmdirSync(path);
            }
        };
        deleteFolderRecursive(_path);
    }
    catch(error){
        callback(error);
    }
    mkdirp(_path, callback);
};

exports.LoadFileAsync = function (path, callback){
    request.get(path, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            callback(null, body);
        }
        else{
            callback("LoadFileAsync" + error, null);
        }
    });
};

exports.escapeQuotes = function(string) {
    return string.replace(/'/g, "''");
};

exports.unescapeQuotes = function(string) {
    return string.replace(/'/g, "'");
};

exports.PostResp = function(res, req, code, err){
    var s;
    if(typeof err === "undefined"){
        s = "";
    }
    else if(typeof err === "string"){
        s = err;
    }
    else if(err instanceof Error){

        if(err.push_msg){
            s = err.message;
        }
        else{
            s = "Internal Server Error";
        }

        var s_internal = "";
        if(err.message){
            s_internal = "Error: " + err.message;
        }
        if(err.stack){
            s_internal += "\n\nStack: "+err.stack;
        }
        console.log(s_internal);
    }
    else if(err instanceof Object){
        s = err;
    }

    res.statusCode = code;
    if(req.headers.origin === 'https://localhost:8000' || req.headers.origin === 'https://localhost:8001' ){
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    }
    res.send(s);
};

exports.JSDateStrToExcelDateStr = function(date){
    var d = new Date(date);
    var returnDateTime = 25569.0 + ((d.getTime() - (d.getTimezoneOffset() * 60 * 1000)) / (1000 * 60 * 60 * 24));
    return returnDateTime.toString().substr(0,20);
};

exports.CopyFile = function(source, target, cb) {
    var cbCalled = false;

    var rd = fs.createReadStream(source);
    rd.on("error", done);
    var wr = fs.createWriteStream(target);
    wr.on("error", done);
    wr.on("close", function() {
        done();
    });
    rd.pipe(wr);

    function done(err) {
        if (!cbCalled) {
            cbCalled = true;
            cb(err);
        }
    }
};

exports.Unzip = function(zipfile_path, output_path, cb){
    var cbCalled = false;

    var rd = fs.createReadStream(zipfile_path);
    var wr = unzip.Extract({ path: output_path });

    rd.on("error", function(err) {
        done(err);
    });
    wr.on("error", function(err) {
        done(err);
    });
    wr.on("close", function(ex) {
        done();
    });

    rd.pipe(wr);

    function done(err) {
        if (!cbCalled) {
            cbCalled = true;
            cb(err);
        }
    }
};

exports.LogError = function(where, why){
    console.log('Error from', where, ':', why);
};

exports.listFolder = function(path){
    return new Promise(function(resolve, reject){
        try {
            resolve(exports.listFolderSync(path));
        }
        catch(err){
            reject(err);
        }
    });
};

exports.listFolderSync = function(path){
    var l = fs.readdirSync(path);
    var rtn = {files:[], dirs:[]};
    l.forEach(function (item) {
        var stats = fs.statSync(path + '/' + item);
        if(stats.isFile()){
            rtn.files.push(item);
        }
        else if(stats.isDirectory()){
            rtn.dirs.push(item);
        }
    });
    return rtn;
};

exports.FormatDateTime = function(t){ // t is millisecond from the EPOCH time
    return moment(new Date(parseInt(t))).format("ddd, M/D/YYYY h:mm A");
};

exports.FormatDateTimeMilisec = function(t){ // t is millisecond from the EPOCH time
    return moment(new Date(parseInt(t))).format("M/D/YYYY h:mm A (s") + " sec)";
};

exports.RespMessagePage = function(req, res, msg){
    req.session.latestUrl = req.originalUrl;
    res.render('_pages_msg', {cur_page: 'Message', message: msg });
};

var stream = require("stream");
var ReadableStreamBuffer =  function(fileBuffer) {
    var that = this;
    stream.Stream.call(this);
    this.readable = true;
    this.writable = false;

    var frequency = 50;
    var chunkSize = 1024;
    var size = fileBuffer.length;
    var position = 0;

    var buffer = new Buffer(fileBuffer.length);
    fileBuffer.copy(buffer);

    var sendData = function() {
        if(size === 0) {
            that.emit("end");
            return;
        }

        var amount = Math.min(chunkSize, size);
        var chunk = null;
        chunk = new Buffer(amount);
        buffer.copy(chunk, 0, position, position + amount);
        position += amount;
        size -= amount;

        that.emit("data", chunk);
    };

    this.size = function() {
        return size;
    };

    this.maxSize = function() {
        return buffer.length;
    };

    this.pause = function() {
        if(sendData) {
            clearInterval(sendData.interval);
            delete sendData.interval;
        }
    };

    this.resume = function() {
        if(sendData && !sendData.interval) {
            sendData.interval = setInterval(sendData, frequency);
        }
    };

    this.destroy = function() {
        that.emit("end");
        clearTimeout(sendData.interval);
        sendData = null;
        that.readable = false;
        that.emit("close");
    };

    this.setEncoding = function(_encoding) {
    };

    this.resume();
};
require('util').inherits(ReadableStreamBuffer, stream.Stream);

exports.ReadableStreamBuffer = ReadableStreamBuffer;

exports.serialPromiseFuncs = function(promiseFuncs, rtns){
    if(typeof rtns === 'undefined'){
        rtns = [];
    }
    var run = promiseFuncs.shift();
    if(run){
        return run().then(
            function(rtn){
                rtns.push(rtn);
                return exports.serialPromiseFuncs(promiseFuncs, rtns);
            }
        ).catch(
            function(err){
                console.error(err);
                rtns.push(err);
                return exports.serialPromiseFuncs(promiseFuncs, rtns);
            }
        );
    }
    else{
        return new Promise(function(resolve){
            resolve(rtns);
        });
    }
};

/**
 * Calls async function over an array of array arguments using apply
 * @param {function(...*): Promise} func - the function
 * @param {Array.<*[]>} argl
 * @return {Promise[]} - the array of results from the async function
 */
exports.promiseLoopApply = function(func, argl){
  const rtnl = new Array(argl.length);
  return new Promise(function(resolve, reject) {
    /********/
    function job(n) {
      if(n !== argl.length) {
        /********/
        //func.apply(this, argl[n]) // `this` is misleading
        func.apply(null, argl[n])
          .then(function(rtn) {
            try {
              rtnl[n] = rtn;
              job(n+1);
            } catch(err){
              throw err;
            }
          })
          .catch(reject);
          /********/
      } else {
          resolve(rtnl);
      }
    }
    /********/
    try {
        job(0);
    } catch(err){
        reject(err);
    }
    /********/
  });
};

/**
 * Calls async function over an array arguments
 * @param {function(...*): Promise} func - the function
 * @param {Array.<*>} args
 * @return {Promise[]} - the array of results from the async function
 */
exports.promiseLoop = function(func, args){
  const rtnl = new Array(args.length);
  return new Promise(function(resolve, reject) {
    /********/
    function job(n) {
      if(n !== args.length) {
        /********/
        func(args[n])
          .then(function(rtn) {
            try {
              rtnl[n] = rtn;
              job(n+1);
            } catch(err){
              throw err;
            }
          })
          .catch(reject);
        /********/
      } else {
        resolve(rtnl);
      }
    }
    /********/
    try {
      job(0);
    } catch(err){
      reject(err);
    }
    /********/
  });
};

exports.Email = function(frommail, tomail, subject, textbody, htmlbody){
    return new Promise(
        function(resolve, reject){
            var transporter = nodemailer.createTransport();
            var mailOptions = {
                from: frommail, // sender address
                to: tomail, // list of receivers
                subject: subject, // Subject line
                text: textbody, // plaintext body
                html: htmlbody // html body
            };
            transporter.sendMail(mailOptions, function(err, info){
                if(err){
                    reject(err);
                }
                else{
                    resolve(info);
                }
            });
        }
    );
};

exports.identifyUser = function(req, res){
    if(req.user){
        return true;
    }
    else{
        exports.PostResp(res, req, 400, 'you are an unidentified user. please sign in and try again.');
        return false;
    }
};

/**
 * CHANGES: 20180530
 * refactored
 *
 * @param {string} email - the email to validate
 * @return {boolean} - true if email is valid
 */
exports.validateEmail = (email) => {
    const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    const matchesDomain = (email) => /(@(([a-zA-Z0-9])*\.)?ubc.ca$)|(@pilot.study$)|(@gmail.com$)|(@cornell.edu$)|(@edx.org$)|(@test.com$)/g.test(email);

    return re.test(email) && matchesDomain(email);
};

/**
 * CHANGES: 20180530
 * refactored
 * renamed from logTimeAndUser()
 */
exports.logUserAction = function(req, msg){
    util.logger("LOG", (req.user ? req.user.email : "an unknown user") + " " + msg);
};