/**
 * Copyright (c) Microsoft Corporation
 *  All Rights Reserved
 *  MIT License
 *
* Permission is hereby granted, free of charge, to any person obtaining a copy of this 
* software and associated documentation files (the "Software"), to deal in the Software 
* without restriction, including without limitation the rights to use, copy, modify, 
* merge, publish, distribute, sublicense, and/or sell copies of the Software, and to 
* permit persons to whom the Software is furnished to do so, subject to the following 
* conditions:
*
* The above copyright notice and this permission notice shall be 
* included in all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, 
* EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS 
* OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, 
* WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT 
* OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

'use strict';

var jwt = require('jsonwebtoken');
var jws = require('jws');
var aadutils = require('./aadutils');
var Log = require('./logging').getLogger;
var PEMkey;

// Logging
var log = new Log("AzureAD: Token Validation");

var TokenValidator = function(metadata, options) {
    if (!metadata) {
        throw new Error("Metadata: metadata object is a required argument");
    }
    if (!options) {
        throw new Error('options is required argument');
    }
    this.metadata = metadata;
    this.options = options;

    // if logging level specified, switch to it.
    if (options.loggingLevel) { log.levels("console", options.loggingLevel); }
};



TokenValidator.prototype.generateOidcPEM = function(kid) {

    if (!this.metadata.oidc.keys) {
        return null;
    }
    for (var i = 0; i < this.metadata.oidc.keys.length; i++) {
        if (this.metadata.oidc.keys[i].kid === kid) {
            log.info('Working on key: ', this.metadata.oidc.keys[i]);
            if (!this.metadata.oidc.keys[i].n) {
                log.warn('modulus was empty. Key was corrupt');
                return null;
            } else if (!this.metadata.oidc.keys[i].e) {
                log.warn('exponent was empty. Key was corrupt');
                return null;
            } else {
                var modulus = new Buffer(this.metadata.oidc.keys[i].n, 'base64');
                var exponent = new Buffer(this.metadata.oidc.keys[i].e, 'base64');

                var pubKey = aadutils.rsaPublicKeyPem(modulus, exponent);

                log.info("Received public key of: ", pubKey);

                return pubKey;
            }
        }
    }

    return null;
};

TokenValidator.prototype.jwtVerify = function(token, done) {

       var decoded = jws.decode(token);
        if (decoded == null) {
            log.warn("Invalid JWT token.");
        }

        log.info('token decoded:  ', decoded);

        if (decoded.header.x5t) {
            PEMkey = this.generateOidcPEM(decoded.header.x5t);
        } else if (decoded.header.kid) {
            PEMkey = this.generateOidcPEM(decoded.header.kid);
        } else {
            throw new TypeError('We did not receive a token we know how to validate');
        }



       // if (!options.issuer) {
        //    options.issuer = metadata.oidc.issuer;
        //}
        this.options.algorithms = this.metadata.oidc.algorithms;

        jwt.verify(token, PEMkey, this.options, function(err, token) {
            if (err) {
                if (err instanceof jwt.TokenExpiredError) {
                    log.warn("Access token expired");
                    done(err);
                } else if (err instanceof jwt.JsonWebTokenError) {
                    log.warn("An error was received validating the token", err.message);
                    done(err);
                } else {
                    done(err);
                }
            } else {
                log.info(token, 'was token going out of verification');
                    done(token);
                }
        });
    };

    exports.TokenValidator = TokenValidator;