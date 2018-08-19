/**
 *
 *
 * created by Colin
 */

const util       = require('../util');
const expect     = require('chai').expect;
const assert     = require('chai').assert;

let js_utils     = null;
let RedisClient  = null;
let R2D          = null;
let redis_utils  = null;
let PilotHandler = null;
let ClassHandler = null;
let Course       = null;

const testUser = {
  "issuer": "https://authentication.ubc.ca",
  "sessionIndex": "_c98a80bc526723f25ff47438cf601e44",
  "nameID": "AAdzZWNyZXQx8mtuVkyqyATy6s/Fe7vZ0U3bI6lVf6bllXdWfrPfZLNkwneWryRG4KRBeUQM5WIs2GUTsNoZl+MhBa4kgkpY5JGA7xTJz/KwnaeVv0arw3AebjtqxwxgHA==",
  "nameIDFormat": "urn:oasis:names:tc:SAML:2.0:nameid-format:transient",
  "nameQualifier": "https://authentication.ubc.ca",
  "spNameQualifier": "sp_richreview_ubc",
  "urn:oid:1.3.6.1.4.1.60.1.7.1": "91429aad-53ca-4a87-91ac-6a9ca309480b",
  "urn:oid:0.9.2342.19200300.100.1.1": "es334567",
  "urn:oid:0.9.2342.19200300.100.1.3": "test@ubc.ca",
  "urn:oid:2.16.840.1.113730.3.1.241": "IAM Application Test Test Student",
  "urn:oid:2.5.4.42": "IAM Application Test",
  "urn:mace:dir:attribute-def:ubcEduStudentNumber": "33456781",
  "urn:oid:2.5.4.4": "Test Student",
  "urn:oid:2.16.840.1.113719.1.1.4.1.25": [
  "cn=chin_141_002_2018w_instructor,ou=richreview.net,ou=applications,ou=cpsc-ubcv,ou=clients,dc=id,dc=ubc,dc=ca",
  "cn=korn_102_001_2018w,ou=richreview.net,ou=applications,ou=cpsc-ubcv,ou=clients,dc=id,dc=ubc,dc=ca"
],
  "mail": "test@ubc.ca",
  "email": "test@ubc.ca"
};

function run() {
  it("create test UBC CWL user", (done) => {


  });
}

describe("spec", function() {

  before(function () {
    // js_utils     = require('../lib/js_utils');
    RedisClient  = require('../lib/redis_client').RedisClient;
    // R2D          = require('../lib/r2d');
    // redis_utils  = require('../lib/redis_client').util;
    // PilotHandler = require('../lib/pilot_handler');
    // ClassHandler = require('../lib/class_handler');
    // Course       = require('../lib/Course');
  });

  beforeEach(function () {

  });

  after(function (done) {
    RedisClient.quit().finally(done);
  });

  afterEach(function () { });

  run();

});