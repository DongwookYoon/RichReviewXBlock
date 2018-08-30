
// import npm modules
const moment = require('moment');

const BlobService    = require("./azure").BlobService;
const ServiceManager = require("./ServiceManager");
const helpers = require('../helpers');
const { log, log_error } = require('../helpers').makeLogs("WR LM MGR");

/**
 * WriteLastModifiedManager manages the . A list of last modified dates should be run first when the backup server is set up, in order for blob backup job to work.
 *
 * @constructor
 * @extends ServiceManager
 */
function WriteLastModifiedManager() {
  ServiceManager.call(this);
}
WriteLastModifiedManager.prototype = Object.create(ServiceManager.prototype);
WriteLastModifiedManager.prototype.constructor = WriteLastModifiedManager;

/**
 * notify admin after last modified dates are updated
 */
WriteLastModifiedManager.prototype.notify = function() {
  log("done exec_write_lastModified:");
  console.log(JSON.stringify(this.COUNT, null, '\t'));

  let message = this.FILE_DNE ? "I'm starting a new record of Azure Storage blob's lastModified dates." : "(WARNING) I refreshed an existing record of Azure Storage blob's lastModified dates.";

  message += `\n\n\ncontainers:\n${this.COUNT.containers.imported} updated`;

  if(this.COUNT.containers.failed > 0) {
    message += `,\n${this.COUNT.containers.failed} failed to update\n\n\n`;

  } else { message += `\n\n\n`; }

  message += `blobs:\n${this.COUNT.blobs.updated} date updated,\n${this.COUNT.blobs.skipped} date is already updated`;

  if(this.COUNT.blobs.failed > 0) {
    message += `,\n${this.COUNT.blobs.failed} failed to update\n\n\n`;
    message += "These keys did not back up:\n";
    const iterLength = Math.min(FAIL_ACC.length, 30);
    for(let i = 0; i < iterLength; i++) {
      message += `${this.FAIL_ACC[i]}\n`;
    }

  } else { message += `\n`; }

  return helpers.sendMail(
    "COMPLETE | Backup Azure Storage", message
  );
};

/**
 *
 * Records the last modified date in the format YYYYMMDDHHMMSS
 * @param {string} container
 * @param {string} blobName
 */
WriteLastModifiedManager.prototype.exec = function(container, blobName) {
  const that = this;

  return BlobService.getBlobProperties(container, blobName)
    .then((result) => {
      if(result.hasOwnProperty('lastModified')) {
        log(`got lastModified of ${container}/${blobName}`);
        that.lastModified[container+'/'+blobName] = Number.parseInt(moment(result.lastModified).format('YYYYMMDDHHMMSS'));
        that.COUNT.blobs.updated++;
      } else {
        throw "there is no property lastModified";
      }
    })
    .catch((err) => {
      log_error(err);
      const errorMessage = err instanceof Error ? `${err.code}: ${err.message}` : err;
      that.COUNT.blobs.failed++;
      that.FAIL_ACC.push(`${container}: ${blobName}: ${errorMessage }`);
    });
};