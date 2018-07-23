/**
 * Node worker that:
 * 1) iterates through every container in the Azure Storage specified by azure_config using a scanning method
 * 2) iterates through every blob in each container
 * 3.1) Downloads blob if local file does not exist
 * 3.2) Compares and updates blob is if files have changed
 * 3.3) Skip the blob if already downloaded and unchanged
 *
 * Note backup script does not delete local files if blob has been deleted.
 */

// import node modules
const util = require('util');
const fs = require('fs');
const path = require('path');

// import npm modules
const mkdirp = require('mkdirp');
const azure = require('azure-storage');

// import libraries
const helpers = require('./helpers');

const log = function(stmt) {
  console.log("<BACKUP AZURE STR>: "+stmt);
};

const log_error = function(stmt) {
  console.error("<BKUP AZURE STR ERR>: "+stmt);
};

const MAX_CONTAINER_RESULTS = 3;
const MAX_BLOB_RESULTS = 5;
const DOWNLOAD_DIR = __dirname + '/azure_str_backup/';
const readFileAsync = util.promisify(fs.readFile);

const azure_config = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../..', 'richreview_core/node_server/ssl/azure_config.json'), 'utf-8')
);

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

function exec_backup() {
  const COUNT = {
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
  const FAIL_ACC = [ ];

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
   * Method to download a blob that does not exist locally
   * @param container
   * @param blobName
   * @param localFilename
   * @return {*}
   */
  function downloadBlob(container, blobName, localFilename) {
    const localPath = path.dirname(localFilename);
    return makePath(localPath)
      .then((b) => {
        return BlobService.getBlobToLocalFile(container, blobName, localFilename);
      })
      .then((result) => {
        COUNT.blobs.downloaded++;
        return null;
      });
  }

  function handleLocalFileExist(container, blobName, localFilename) {
    const localTempFilename = DOWNLOAD_DIR + container + '/' + blobName + '.tttemp';

    const handleFilesAreInSync = () => {
      return deleteLocalFile(localTempFilename)
        .then(b => {
          COUNT.blobs.skipped++;
          return null;
        });
    };
    const handleFilesAreNotInSync = () => {
      return deleteLocalFile(localFilename)
        .then(b => {
          return renameFile(localTempFilename, localFilename);
        })
        .then(b => {
          COUNT.blobs.updated++;
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

  /**
   * Sync blob with backup directory
   * @param {string} container - the container to check
   * @param {string} blobName - the prefixed(?) name of the blob to check
   */
  function sync_blob(container, blobName) {
    const localFilename = DOWNLOAD_DIR + container + '/' + blobName;
    //log(`${container} : ${blobName}`)

    return doesLocalFileExist(localFilename)
      .then(fileExists => {
        if(fileExists) {
          log(`File exists: ${localFilename}`);
          return handleLocalFileExist(container, blobName, localFilename);
        } else {
          log(`File not exist: ${localFilename}`);
          return downloadBlob(container, blobName, localFilename);
        }
      })
      .catch((err) => {
        log_error(err);
        COUNT.blobs.failed++;
        FAIL_ACC.push(`${container}: ${blobName}`);
        return null;
      });
  }

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
            return sync_blob(container, entry.name);
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

    log("backing up: "+container);
    return scanBlobs()
      .then((b) => {
        log("backed up: "+container);
        COUNT.containers.imported++;
        return null;
      })
      .catch((err) => {
        log_error(err);
        COUNT.containers.failed++;
        FAIL_ACC.push(`${container}: (all)`);
        return null;
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

  const notify = () => {
    log("done exec_backup:");
    console.log(JSON.stringify(COUNT, null, '\t'));
    let message = `containers:\n${COUNT.containers.imported} imported`;
    if(COUNT.containers.failed > 0) {
      message += `,\n${COUNT.containers.failed} failed to import\n\n\n`;
    } else { message += `\n\n\n`; }
    message += `blobs:\n${COUNT.blobs.downloaded} downloaded,\n${COUNT.blobs.updated} updated,\n${COUNT.blobs.skipped} skipped`;
    if(COUNT.blobs.failed > 0) {
      message += `,\n${COUNT.blobs.failed} failed to import`
    } else { message += `\n\n\n` }
    message += "These keys did not back up:\n";
    const iterLength = Math.min(FAIL_ACC.length, 30);
    for(let i = 0; i < iterLength; i++) {
      message += `${FAIL_ACC[i]}\n`
    }
    return helpers.sendMail(
      "COMPLETE | Backup Azure Storage", message
    );
  };

  log("starting exec_backup");
  return scanContainers()
    .then(notify)
    .catch((err) => {
      log_error(err);
      return helpers.sendMail(
        "FAILED | Backup Azure Storage", err
      );
    });
}

exec_backup();