const moment = require('moment');

const d = () => { return moment().format('YY-MM-DD HH:mm:ss'); };

exports.debug = function(stmt) {
    console.log("["+d()+"]<DEBUG>: "+stmt);
};

exports.start = function(stmt) {
    console.log("["+d()+"] "+stmt);
};

exports.error = function(stmt) {
    console.error("["+d()+"]<ERR>: "+stmt);
};

exports.logger = function(type, stmt) {
    console.log("["+d()+"]<"+type+">: "+stmt);
};

exports.testl = function(stmt) {
    console.log("["+d()+"]<TEST>: "+stmt);
};