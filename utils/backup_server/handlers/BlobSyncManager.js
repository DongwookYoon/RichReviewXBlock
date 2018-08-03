
// import node modules
const util = require('util');
const fs = require('fs');
const path = require('path');

// import npm modules
const mkdirp = require('mkdirp');
const moment = require('moment');

const BlobService    = require("./azure").BlobService;
const ServiceManager = require("./ServiceManager");
const helpers = require('../helpers');
const { log, log_error } = require('../helpers').makeLogs("BLOB SYNC MGR");

const readFileAsync  = util.promisify(fs.readFile);

const DOWNLOAD_DIR = path.join(__dirname, '..', 'azure_str_backup');

/**
 *
 * @constructor
 * @extends ServiceManager
 */
function BlobSyncManager() {
  ServiceManager.call(this);
}
BlobSyncManager.prototype = Object.create(ServiceManager.prototype);
BlobSyncManager.prototype.constructor = BlobSyncManager;

/**
 * Notify admin by email after blob sync
 */
BlobSyncManager.prototype.notify = function() {
  log("done exec_blob_sync:");
  console.log(JSON.stringify(this.COUNT, null, '\t'));

  let message = "I did a backup of Azure Storage. ";

  message += this.FILE_DNE ? "(WARNING) Last Modified Record cannot be found. Starting from new record.": "";

  message += `\n\n\ncontainers:\n${this.COUNT.containers.imported} updated`;

  if(this.COUNT.containers.failed > 0) {
    message += `,\n${this.COUNT.containers.failed} failed to update\n\n\n`;

  } else { message += `\n\n\n`; }

  message += `blobs:\n${this.COUNT.blobs.downloaded} downloaded,\n${this.COUNT.blobs.updated} updated,\n${this.COUNT.blobs.skipped} skipped`;

  if(this.COUNT.blobs.failed > 0) {
    message += `,\n${this.COUNT.blobs.failed} failed to import\n\n\n`;
    message += "These keys did not back up:\n";
    const iterLength = Math.min(FAIL_ACC.length, 30);
    for(let i = 0; i < iterLength; i++) {
      message += `${this.FAIL_ACC[i]}\n`
    }

  } else { message += `\n` }

  return helpers.sendMail(
    "COMPLETE | Backup Azure Storage", message
  );
};

/**
 * Sync blob with backup directory
 * @param {string} container - the container to check
 * @param {string} blobName - the prefixed(?) name of the blob to check
 * @param {*} dryRun - if not undefined then just print a msg and don't sync
 * TODO: WARNING! The function is not atomic.
 */
BlobSyncManager.prototype.exec = function(container, blobName, dryRun) {
  const completePath  = container+'/'+blobName;
  const localFilename = DOWNLOAD_DIR+'/'+completePath;
  const that = this;

  function makePath(localPath) {
    return new Promise((resolve, reject) => {
      mkdirp(localPath, (err) => {
        if(err) { reject(err); }
        else    { resolve(); }
      });
    });
  }

  function doesLocalFileExist(localFilename) {
    return new Promise((resolve) => {
      fs.access(localFilename, fs.constants.F_OK, (err) => {
        if (err) { resolve(false); }
        else     { resolve(true);  }
      });
    });
  }

  function deleteLocalFile(localFileName) {
    return new Promise((resolve, reject) => {
      fs.unlink(localFileName, (err) => {
        if(err) { reject(err);   }
        else    { resolve(true); }
      });
    });
  }

  function renameFile(oldName, newName) {
    return new Promise((resolve, reject) => {
      fs.rename(oldName, newName, (err) => {
        if(err) { reject(err);   }
        else    { resolve(null); }
      });
    });
  }

  /**
   * Method to download a blob that does not exist locally, and then add the blob's lastModified date to the last modified date record.
   */
  function downloadBlob() {
    const localPath = path.dirname(localFilename);
    return makePath(localPath)
      .then((b) => {
        return BlobService.getBlobToLocalFile(container, blobName, localFilename);
      })
      .then((result) => {
        return BlobService.getBlobProperties(container, blobName);
      })
      .then((result) => {
        if(result.hasOwnProperty('lastModified')) {
          that.lastModified[completePath] = Number.parseInt(moment(result.lastModified).format('YYYYMMDDHHMMSS'));
        } else {
          // do nothing
        }
        that.COUNT.blobs.downloaded++;
      });
  }

  /**
   * If updatedTimeStamp is a number, the
   * @param {number} updatedTimeStamp
   */
  function downloadIfBinaryDistinctFile(updatedTimeStamp) {
    const localTempFilename = DOWNLOAD_DIR +'/'+completePath+'.tttemp';

    const handleFilesAreInSync = () => {
      return deleteLocalFile(localTempFilename)
        .then(b => {
          if(updatedTimeStamp) {
            that.lastModified[completePath] = updatedTimeStamp;
            that.COUNT.blobs.updated++;
          }
          else { that.COUNT.blobs.skipped++; }
          return null;
        });
    };

    const handleFilesAreNotInSync = () => {
      return deleteLocalFile(localFilename)
        .then(b => {
          return renameFile(localTempFilename, localFilename);
        })
        .then(b => {
          if(updatedTimeStamp) {
            that.lastModified[completePath] = updatedTimeStamp;
          }
          that.COUNT.blobs.updated++;
          return null;
        });
    };

    return BlobService.getBlobToLocalFile(container, blobName, localTempFilename)
      .then((response) => {
        return Promise.all([
          readFileAsync(localTempFilename),
          readFileAsync(localFilename)
        ]);
      })
      .then(([tempFile, localFile]) => {
        if(tempFile.toString() === localFile.toString()) {
          //if(Buffer.compare(tempFile, localFile)) {
          log(`File in sync: ${localFilename}`);
          return handleFilesAreInSync();
        } else {
          log(`File not in sync: ${localFilename}`);
          return handleFilesAreNotInSync();
        }
      });
  }

  function handleLastModifiedFile(updatedTimeStamp) {
    if(updatedTimeStamp && updatedTimeStamp > that.lastModified[container+'/'+blobName]) {
      log("the last modified date has been updated");
      return downloadIfBinaryDistinctFile(updatedTimeStamp);
    } else {
      // log("the last modified date is unchanged");
      that.COUNT.blobs.skipped++;
      return Promise.resolve(null);
    }
  }

  function handleLocalFileExist() {
    return BlobService.getBlobProperties(container, blobName)
      .then((result) => {
        let updatedTimeStamp = null;

        if(result.hasOwnProperty('lastModified')) {
          updatedTimeStamp = Number.parseInt(
            moment(result.lastModified).format('YYYYMMDDHHMMSS')
          );
        }

        if(that.lastModified.hasOwnProperty(completePath)) {
          return handleLastModifiedFile(updatedTimeStamp);
        } else {
          return downloadIfBinaryDistinctFile(updatedTimeStamp);
        }
      });
  }

  if(dryRun) {
    log(`sync_blob dryrun: ${container}: ${blobName}`);
    return;
  }

  return doesLocalFileExist(localFilename)
    .then(fileExists => {
      if(fileExists) {
        // log(`File exists: ${localFilename}`);
        return handleLocalFileExist();
      } else {
        log(`File not exist: ${localFilename}`);
        return downloadBlob();
      }
    })
    .catch((err) => {
      log_error(err);
      const errorMessage = err instanceof Error ? `${err.code}: ${err.message}` : err;
      that.COUNT.blobs.failed++;
      that.FAIL_ACC.push(`${container}: ${blobName}: ${errorMessage}`);
      return null;
    });
};

module.exports = BlobSyncManager;