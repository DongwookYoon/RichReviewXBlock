
const util = require('util');
const fs = require('fs');
const path = require('path');

const { log, log_error } = require('../helpers').makeLogs("SERV MGR");

const readFileAsync  = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);

const LAST_MODIFIED_RECORD_DIR = path.join(__dirname, '..', 'azure_str_last_modified_record.json');

/**
 *
 * @constructor
 * @abstract
 */
function ServiceManager() {
  if(this.constructor === ServiceManager) {
    throw new Error("trying to constuct an abstract class");
  }
  this.COUNT = {
    containers: {
      imported: 0,
      failed: 0
    },
    blobs: {
      updated: 0,
      skipped: 0,
      downloaded: 0,
      failed: 0
    }
  };
  this.FAIL_ACC = [ ];
  this.lastModified = null;
  this.FILE_DNE = false;
  this.super_name = "ServiceManager";
}

/**
 * Asynchronously uploaded lastModified data from persisted file into instance of WriteLastModifiedManager
 */
ServiceManager.prototype.uploadLastModified = function () {
  const that = this;

  log("getting last modified records");
  return readFileAsync(LAST_MODIFIED_RECORD_DIR, 'utf-8')
    .catch((err) => {
      log_error(err);
      if(err instanceof Error && err.code === "ENOENT") {
        log("WARNING: last modified record cannot be found");
        that.FILE_DNE = true;
        return "{}";
      }
      throw err;
    })
    .then((jsonString) => {
      that.lastModified = JSON.parse(jsonString);
    })
};

ServiceManager.prototype.persistLastModified = function () {
  const lastModified = JSON.stringify(this.lastModified);
  return writeFileAsync(LAST_MODIFIED_RECORD_DIR, lastModified);
};

module.exports = ServiceManager;