/**
 * This module contains the following:
 *
 * a class called BlobSyncManager to sync the storage blobs in Azure Storage with the local backup files.
 * a class called WriteLastModifiedManager to generates a last modified record for storage blobs
 * a function called run_service which takes in either WriteLastModifiedManager or BlobSyncManager
 *
 * The backup of the Azure Storage Blobs are in the folder azure_str_backup/
 * The record of last modified dates to compare are stored in azure_str_last_modified_record.json
 * The connection properties for azure-storage are located in richreview_core/node_server/ssl/azure_config.json
 */

// import node modules
const util = require('util');
const fs = require('fs');
const path = require('path');

// import npm modules
const mkdirp = require('mkdirp');
const azure = require('azure-storage');
const moment = require('moment');

const helpers = require('../helpers');

const log = function(stmt) {
  console.log("<BACKUP AZURE STR>: "+stmt);
};

const log_error = function(err) {
  if(err instanceof Error) { err = `${err.code}: ${err.message}`; }
  console.error("<BKUP AZURE STR ERR>: "+err);
};

const MAX_CONTAINER_RESULTS = 3;
const MAX_BLOB_RESULTS = 5;
const DOWNLOAD_DIR = path.join(__dirname, '..', 'azure_str_backup');
const LAST_MODIFIED_RECORD_DIR = path.join(__dirname, '..', 'azure_str_last_modified_record.json');
const azure_config = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../..', 'richreview_core/node_server/ssl/azure_config.json'), 'utf-8')
);
const readFileAsync  = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);
const blobService = azure.createBlobService(azure_config.storage.connection_string).withFilter(new azure.ExponentialRetryPolicyFilter());

const promisifyBlobService = function(service) {
  const pub = { };
  Object.keys(azure.BlobService.prototype).forEach((command) => {
    pub[command] = util.promisify(service[command]).bind(service);
  });
  return pub;
};
/*******************************************************/
const BlobService = promisifyBlobService(blobService);

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

  let message = "I did a backup of Azure Storage.";
  
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
  const localFilename = DOWNLOAD_DIR + container + '/' + blobName;
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
          that.lastModified[container+'/'+blobName] = Number.parseInt(moment(result.lastModified).format('YYYYMMDDHHMMSS'));
        } else {
          // do nothing
        }
        that.COUNT.blobs.downloaded++;
      });
  }

  function downloadIfBinaryDistinctFile(updatedTimeStamp) {
    const localTempFilename = DOWNLOAD_DIR +'/'+container+'/'+blobName+'.tttemp';

    const handleFilesAreInSync = () => {
      return deleteLocalFile(localTempFilename)
        .then(b => {
          if(updatedTimeStamp) {
            that.lastModified[container+'/'+blobName] = updatedTimeStamp;
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
            that.lastModified[container+'/'+blobName] = updatedTimeStamp;
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
      log("the last modified date is unchanged");
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

        if(that.lastModified.hasOwnProperty(container+'/'+blobName)) {
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
        log(`File exists: ${localFilename}`);
        return handleLocalFileExist();
      } else {
        log(`File not exist: ${localFilename}`);
        return downloadBlob();
      }
    })
    .catch((err) => {
      log_error(err);
      const errorMessage = err instanceof Error ? err.message : err;
      that.COUNT.blobs.failed++;
      that.FAIL_ACC.push(`${container}: ${blobName}: ${errorMessage}`);
      return null;
    });
};

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

  let message = this.FILE_DNE ? "I'm starting a new record of Azure Storage blob's lastModified dates" : "(WARNING) I refreshed an existing record of Azure Storage blob's lastModified dates";

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
 * @return {*}
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
      const errorMessage = err instanceof Error ? err.message : err;
      log_error(errorMessage);
      that.COUNT.blobs.failed++;
      that.FAIL_ACC.push(`${container}: ${blobName}: ${errorMessage }`);
    });
};

/**
 * Runs the service it has been passed as argument.
 *
 * @param {ServiceManager} serviceManager - manager for the service to run
 * @return {*}
 */
function run_service(serviceManager) {

  /**
   * Backup a single container
   * @param {string} container - the container name we want to backup
   */
  function backup_container(container) {
    // go to azure to regenerate the SAS token

    const scanBlobs = (currentToken) => {
      let promise = null;
      if (currentToken) {
        promise = BlobService.listBlobsSegmented(container, currentToken, { maxResults: MAX_BLOB_RESULTS });
      } else {
        promise = BlobService.listBlobsSegmented(container, null, { maxResults: MAX_BLOB_RESULTS });
      }
      return promise
        .then((results) => {
          const promises = results.entries.map((entry) => {
            return serviceManager.exec(container, entry.name);
          });
          return Promise.all(promises)
            .then((b) => { return results.continuationToken; });
        })
        .then((cToken) => {
          if (cToken) {
            return scanBlobs(cToken);
          } else {
            return null;
          }
        });
    };

    log("opening container: "+container);
    return scanBlobs()
      .then((b) => {
        log("closed container: "+container);
        serviceManager.COUNT.containers.imported++;
      })
      .catch((err) => {
        const errorMessage = err instanceof Error ? err.message : err;
        log_error(errorMessage);
        serviceManager.COUNT.containers.failed++;
        serviceManager.FAIL_ACC.push(`${container}: (all): ${errorMessage}`);
      });
  }

  /**
   * Scans containers and calls backup_container for each container
   * @param currentToken
   */
  const scanContainers = (currentToken) => {
    let promise = null;
    if(currentToken) {
      promise = BlobService.listContainersSegmented(currentToken, { maxResults: MAX_CONTAINER_RESULTS });
    } else {
      promise = BlobService.listContainersSegmented(null, { maxResults: MAX_CONTAINER_RESULTS });
    }
    return promise
      .then((results) => {
        const promises = results.entries.map((entry) => {
          return backup_container(entry.name);
        });
        return Promise.all(promises)
          .then((b) => { return results.continuationToken; });
      })
      .then((cToken) => {
        if(cToken) {
          return scanContainers(cToken);
        } else {
          return null;
        }
      });
  };

  log("starting run_service");
  return serviceManager.uploadLastModified()
    .then(scanContainers.bind(null, null))
    .then(serviceManager.persistLastModified.bind(serviceManager))
    .then(serviceManager.notify.bind(serviceManager))
    .catch((err) => {
      log_error(err);
      return helpers.sendMail(
        "FAILED | Backup Azure Storage", err
      );
    });
}

exports.BlobSyncManager          = BlobSyncManager;
exports.WriteLastModifiedManager = WriteLastModifiedManager;
exports.run_service              = run_service;