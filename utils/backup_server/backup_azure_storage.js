

const child_process = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');

const azure = require('azure-storage');

const log = function(stmt) {
  console.log("<BACKUP AZURE STR>: "+stmt);
};

const log_error = function(stmt) {
  console.error("<ERR>: "+stmt);
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

  function downloadBlob(container, blobName, localFilename) {
    return BlobService.getBlobToLocalFile(container, blobName, localFilename);
  }

  function handleLocalFileExist(container, blobName, localFilename) {
    const localTempFilename = DOWNLOAD_DIR + container + '/' + blobName + '.tttemp';

    return BlobService.getBlobToLocalFile(container, blobName, localTempFilename)
      .then((response) => {
        return Promise.all([
          readFileAsync(localTempFilename),
          readFileAsync(localFilename)
        ]);
      })
      .then(([tempFile, localFile]) => {
        if(tempFile.toString() === localFile.toString()) {
          log(`File in sync: ${localFilename}`);
          return false;
        } else {
          log(`File not in sync: ${localFilename}`);
          return deleteLocalFile(localFilename);
        }
      })
      .then((deleted) => {
        if(deleted) {
          return renameFile(localTempFilename, localFilename);
        } else {
          return null;
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

    return doesLocalFileExist(localFilename)
      .then(fileExists => {
        if(fileExists) {
          log(`File exists: ${localFilename}`);
          return handleLocalFileExist(container, blobName, localFilename);
        } else {
          log(`File not exist: ${localFilename}`);
          return downloadBlob(container, blobName, localFilename);
        }
      });
  }

  /**
   * Backup a single container
   * @param container - the container we want to backup
   */
  function backup_container(container) {
    // go to azure to regenerate the SAS token

    const scanBlobs = (currentToken) => {
      let promise = null;
      if (currentToken) {
        promise = BlobService.listBlobsSegmented(container, currentToken, { MAX_BLOB_RESULTS });
      } else {
        promise = BlobService.listBlobsSegmented(container, null, { MAX_BLOB_RESULTS });
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

    log("migrating: "+container);
    return scanBlobs()
      .then((b) => {
        log("done migrating: "+container);
      })
      .catch((err) => {
        log_error(err);
      });
  }

  /**
   * Scans containers and calls backup_container for each container
   * @param currentToken
   */
  const scanContainers = (currentToken) => {
    let promise = null;
    if(currentToken) {
      promise = BlobService.listContainersSegmented(currentToken, { MAX_CONTAINER_RESULTS });
    } else {
      promise = BlobService.listContainersSegmented(null, { MAX_CONTAINER_RESULTS });
    }
    return promise
      .then((results) => {
        const promises = results.entries.map((entry) => {
          return backup_container(entry.name, entry.publicAccessLevel );
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

  log("starting migrate_exec");
  return scanContainers()
    .then((b) => {
      log("done migrate_exec");
    })
    .catch((err) => {
      log_error(err);
    });
}

exec_backup();