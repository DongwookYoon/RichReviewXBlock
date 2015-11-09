'use strict';
// Change this URL to match the back end coordinating the authentication and speech-to-text services.
var SERVER_URL = 'http://127.0.0.1:5000/';

var utils = (function() {
    var pub = {};

    /**
     * Initialize the publish/subscribe system utils is going to use.
     */
    (function() {
        var o         = $({});
        $.subscribe   = o.on.bind(o);
        $.unsubscribe = o.off.bind(o);
        $.publish     = o.trigger.bind(o);
    })();

    var fileBlock = function(_offset, length, _file, readChunk) {
        var r = new FileReader();
        var blob = _file.slice(_offset, length + _offset);
        r.onload = readChunk;
        r.readAsArrayBuffer(blob);
    };

    // Based on alediaferia's SO response
    // http://stackoverflow.com/questions/14438187/javascript-filereader-parsing-long-file-in-chunks
    pub.onFileProgress = function(options, ondata, onerror, onend) {
        var file       = options.file;
        var fileSize   = file.size;
        var chunkSize  = options.bufferSize || 8192;
        var offset     = 44;
        var readChunk = function(evt) {
            if (offset >= fileSize) {
                console.log("Done reading file");
                onend();
                return;
            }
            if (evt.target.error == null) {
                var buffer = evt.target.result;
                offset += buffer.byteLength;
                ondata(buffer); // callback for handling read chunk
            } else {
                var errorMessage = evt.target.error;
                console.log("Read error: " + errorMessage);
                onerror(errorMessage);
                return;
            }
            fileBlock(offset, chunkSize, file, readChunk);
        };
        fileBlock(offset, chunkSize, file, readChunk);
    };

    pub.createTokenGenerator = function() {
        // Make call to API to try and get token
        var hasBeenRunTimes = 0;
        return {
            getAuthInfo: function(callback) {
                ++hasBeenRunTimes;
                if (hasBeenRunTimes > 5) {
                    var err = new Error('Cannot reach server');
                    callback(null, err);
                    return;
                }
                var url = '/token';
                var tokenRequest = new XMLHttpRequest();
                tokenRequest.open("GET", url, true);
                tokenRequest.onload = function(evt) {
                    var token = tokenRequest.responseText;
                    callback(token);
                };
                tokenRequest.send();
            },
            getCount: function() { return hasBeenRunTimes; }
        }
    };

    /**
     * Requests the username, password, and token for the Bluemix authentication process.
     * Callback should accept a dictionary `authInfo` containing the username, password, and token.
     */
    var alreadyAlerted = false;
    pub.getAuthInfo = (function() {
        // Make call to API to try and get token
        var hasBeenRunTimes = 0;
        return function(callback, errcallback) {
            hasBeenRunTimes++;
            if (hasBeenRunTimes > 5) {
                var err = new Error('Cannot reach server');
                callback(null, err);
                return;
            }
            var url = SERVER_URL + 'bluemix_auth/token/';
            var tokenRequest = new XMLHttpRequest();
            tokenRequest.open("GET", url, true);
            tokenRequest.onreadystatechange = function()
            {
                if (tokenRequest.readyState == 4 && tokenRequest.status == 200) {
                    var res = JSON.parse(tokenRequest.responseText);
                    callback({
                        username: res.username,
                        password: res.password,
                        token: res.token
                    });
                } else if (tokenRequest.status == 500) {
                    if (!alreadyAlerted)
                        alert("Could not connect to the speech-to-text server. We apologize for the inconvenience.");
                    alreadyAlerted = true;
                }
            };
            tokenRequest.onerror = function(err) {
                alert("Could not connect to the speech-to-text server. We apologize for the inconvenience.");
                console.log("An error occurred while trying to authenticate:", err);
                errcallback(err);
            };
            tokenRequest.send();
        }
    })();

    return pub;
}());

$.fn.startLoadingBlink = function () {
    this.attr('_nw_blinking', true);
    var _this = this;
    var animateBlink = function() {
        _this.animate({opacity:'1'}, 600);
        _this.animate({opacity:'0.7'}, 600, animateBlink);
    };
    animateBlink();
    return this;
};

$.fn.stopLoadingBlink = function () {
    this.stop(true);
    this.css('opacity', 1);
    this.attr('_nw_blinking', false);
    return this;
};

$.fn.implicitDisable = function () {
    this.css('pointer-events', 'none');
    return this;
};

$.fn.implicitEnable = function () {
    this.css('pointer-events', 'auto');
    return this;
};