
const fs         = require('fs');
const path       = require('path');
const node_util  = require('util');

const expect     = require('chai').expect;
const assert     = require('chai').assert;
const azure      = require('azure-storage');
const moment     = require('moment');

const util       = require('../util');

let blobService = null;
let BlobService = null;

const log = function(stmt) {
  console.log("<BACKUP AZURE STR>: "+stmt);
};

const log_error = function(stmt) {
  console.error("<BKUP AZURE STR ERR>: "+stmt);
};

const azure_config = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'ssl/azure_config.json'), 'utf-8')
);

function testBlobs(container, callback) {
  const MAX_BLOB_RESULTS = 5;

  log("starting testBlobs");
  return BlobService.listBlobsSegmented(container, null, {maxResults: MAX_BLOB_RESULTS})
    .then((results) => {
      const promises = results.entries.map((entry) => {
        return callback(container, entry.name);
      });
      return Promise.all(promises);
    })
    .then((bArr) => {
      log("done testBlobs");
    });
}

function testContainers(callback) {
  const MAX_CONTAINER_RESULTS = 1;

  log("starting testContainers");
  return BlobService.listContainersSegmented(null, { maxResults: MAX_CONTAINER_RESULTS })
    .then((results) => {
      const promises = results.entries.map((entry) => {
        return testBlobs(entry.name, callback);
      });
      return Promise.all(promises);
    })
    .then((bArr) => {
      log("done testContainers");
    });
}

const promisifyBlobService = function(service) {
  const pub = { };
  Object.keys(azure.BlobService.prototype).forEach((command) => {
    pub[command] = node_util.promisify(service[command]).bind(service);
  });
  return pub;
};

describe("specAzureStorage", function () {

  before(function () {
    blobService = azure.createBlobService(azure_config.storage.connection_string).withFilter(new azure.ExponentialRetryPolicyFilter());
    BlobService = promisifyBlobService(blobService);
  });

  after(function () {
    //
  });

  it("can get blob properties", function (done) {
    const DATE_LINE = moment().format('YYYYMMDDHHMMSS');
    this.timeout(10000);

    const getBlobProperties = (container, blob) => {
      return new Promise((resolve, reject) => {
        return blobService.getBlobProperties(container, blob, (error, result, response) => {
          if(error) {
            reject(error);
          } else {
            expect(result).to.have.property('lastModified');
            //util.testl(JSON.stringify(result, null, '\t'));
            //util.testl(JSON.stringify(response, null, '\t'));
            // example:
            // "lastModified": "Wed, 04 Jul 2018 02:03:23 GMT"
            if(result.hasOwnProperty('lastModified')) {
              util.testl(moment(result.lastModified).format('YYYYMMDDHHMMSS'));
            }
            util.testl("done getBlobProperties");
            resolve(null);
          }
        });
      });
    };

    testContainers(getBlobProperties)
      .catch(assert.fail)
      .finally((b) => {
        util.testl("calling done");
        done();
      });
  }); // END


});