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

var socket = (function() {
  // Initialize closure, which holds maximum getAuthInfo call count
  var tokenGenerator = utils.createTokenGenerator();
  var pub = {};
  var initSocket = pub.initSocket = function(options, onopen, onlistening, onmessage, onerror, onclose) {
    var listening;
    function withDefault(val, defaultVal) {
      return typeof val === 'undefined' ? defaultVal : val;
    }
    var sock;
    var token = options.token;
    var model = options.model || localStorage.getItem('currentModel');
    var message = options.message || {'action': 'start'};
    var sessionPermissions = withDefault(options.sessionPermissions, JSON.parse(localStorage.getItem('sessionPermissions')));
    var sessionPermissionsQueryParam = sessionPermissions ? '0' : '1';
    var url = options.serviceURI || 'wss://stream.watsonplatform.net/speech-to-text/api/v1/recognize?watson-token='
        + token
        + '&X-WDC-PL-OPT-OUT=' + sessionPermissionsQueryParam
        + '&model=' + model;
    console.log('URL model', model);
    try {
      sock = new WebSocket(url);
    } catch(err) {
      console.error('WS connection error: ', err);
    }
    sock.onopen = function(evt) {
      listening = false;
      $.subscribe('hardsocketstop', function(data) {
        if (!listening) {
          return;
        }
        console.log('MICROPHONE: close.');
        sock.send(JSON.stringify({action:'stop'}));
      });
      $.subscribe('socketstop', function(data) {
        if (!listening) {
          return;
        }
        console.log('MICROPHONE: close.');
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
          console.log('MICROPHONE: Closing socket.');
          sock.close();
        }
      }
      onmessage(msg, sock);
    };

    sock.onerror = function(evt) {
      console.log('WS onerror: ', evt);
      onerror(evt);
    };

    sock.onclose = function(evt) {
      console.log('WS onclose: ', evt);
      if (evt.code === 1006) {
        // Authentication error, try to reconnect
        console.log('generator count', tokenGenerator.getCount());
        if (tokenGenerator.getCount() > 1) {
          $.publish('hardsocketstop');
          throw new Error("No authorization token is currently available");
        }
        utils.getAuthInfo(function(authInfo) {
          console.log('Fetching additional token...');
          options.token = token;
          initSocket(options, onopen, onlistening, onmessage, onerror, onclose);
        }, function (err) {
          $.publish('hardsocketstop');
        });
        return false;
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
  return pub;
}());
