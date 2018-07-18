"use strict";
var fs = require("fs");

var SAML = require("passport-saml").SAML;

var saml = new SAML({
  privateCert : fs.readFileSync("./ssl/sp_richreview_ubc.key")
});

var message = { SAMLResponse: "BOOM" };
saml.signRequest(message);
console.log(message.Signature);