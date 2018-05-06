/**
 * Created by Dongwook on 11/18/2014.
 */

var StringifyError = function(err, filter, space) {
    var plainObject = {};
    Object.getOwnPropertyNames(err).forEach(function(key) {
        plainObject[key] = err[key];
    });
    return JSON.stringify(plainObject, filter, space);
};

exports.HandleError = function (msg, error, res){
    var err_string;
    var type = Object.prototype.toString.call(error);
    if(type == '[object Error]'){
        err_string = StringifyError(error);
    }
    else{
        err_string = JSON.stringify(error);
    }
    console.log('HandleError : '+ msg , ' : \n', err_string);
    if(res){
        res.render('_error',
            {msg : msg, error : err_string});
    }
};
