/**
 * Copyright 2014 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
//Depends on the utils object in misc_utils.js

// Mini WS callback API, so we can initialize
// with model and token in URI, plus
// start message
'use strict';

var bluemix_stt = (function(bluemix_stt) {
    // Initialize closure, which holds maximum getAuthInfo call count
    bluemix_stt.socket = {};

    bluemix_stt.socket.initSocket = function(options, onopen, onlistening, onmessage, onerror, onclose) {
        var listening;
        var sock;
        var token = options.token;
        var model = options.model;
        var message = options.message || {'action': 'start'};
        var requestLogging = options.requestLogging || 'false';
        var url = options.serviceURI || 'wss://stream.watsonplatform.net/speech-to-text/api/v1/recognize?watson-token='
            + token
            + '&X-WDC-PL-OPT-OUT=' + requestLogging // Opt out the Request logging
            + '&model=' + model;
        try {
            sock = new WebSocket(url);
        } catch(err) {
            throw Error('WS connection error: ', err);
        }
        sock.onopen = function(evt) {
            listening = false;
            $.subscribe('hardsocketstop', function(data) {
                if (!listening) {
                    return;
                }
                //console.log('Bluemix STT socket close requested');
                sock.send(JSON.stringify({action:'stop'}));
            });
            $.subscribe('socketstop', function(data) {
                if (!listening) {
                    return;
                }
                //console.log('Bluemix STT socket closed');
                sock.close();
            });
            sock.send(JSON.stringify(message));
            onopen(sock);
        };
        sock.onmessage = function(evt) {
            var msg = JSON.parse(evt.data);
            if (msg.error) {
                console.log(msg.error);
                return;
            }
            if (msg.state === 'listening') {
                // Early cut off, without notification
                if (!listening) {
                    onlistening(sock);
                    listening = true;
                } else {
                    console.log('Bluemix STT socket closed');
                    sock.close();
                }
            }
            onmessage(msg, sock);
        };

        sock.onerror = function(evt) {
            onerror(evt);
        };

        sock.onclose = function(evt) {
            if (evt.code === 1006) {
                // Authentication error
                $.publish('hardsocketstop');
                throw new Error("No authorization token is currently available");
            }
            if (evt.code === 1011) {
                console.error('Server error ' + evt.code + ': please refresh your browser and try again');
                onclose(evt);
                return false;
            }
            if (evt.code > 1000) {
                console.error('Server error ' + evt.code + ': please refresh your browser and try again');
                // showError('Server error ' + evt.code + ': please refresh your browser and try again');
                onclose(evt);
                return false;
            }
            // Made it through, normal close
            $.unsubscribe('hardsocketstop');
            $.unsubscribe('socketstop');
            onclose(evt);
        };

    };

    return bluemix_stt;

}(window.bluemix_stt = window.bluemix_stt || {}));
