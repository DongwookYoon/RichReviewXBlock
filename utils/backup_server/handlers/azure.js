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
const azure = require('azure-storage');

// import library
const helpers = require('../helpers');
const { log, log_error } = require('../helpers').makeLogs("BKUP AZURE");
const env = require('../env');

const MAX_CONTAINER_RESULTS = 3;
const MAX_BLOB_RESULTS = 5;

const blobService = azure.createBlobService(env.azure_config.storage.connection_string).withFilter(new azure.ExponentialRetryPolicyFilter());

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
 * Runs the service it has been passed as argument.
 *
 * @param {ServiceManager} serviceManager - manager for the service to run
 * @return {*}
 */
exports.run_service = function (serviceManager) {

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
        // log("closed container: "+container);
        serviceManager.COUNT.containers.imported++;
      })
      .catch((err) => {
        log_error(err);
        const errorMessage = err instanceof Error ? `${err.code}: ${err.message}` : err;
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
          .then(serviceManager.persistLastModified.bind(serviceManager))
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
};

exports.BlobService = BlobService;