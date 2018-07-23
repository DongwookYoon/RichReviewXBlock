

const child_process = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');

const mkdirp = require('mkdirp');
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

  function downloadBlob(container, blobName, localFilename) {
    const localPath = path.dirname(localFilename);
    return makePath(localPath)
      .then((b) => {
        return BlobService.getBlobToLocalFile(container, blobName, localFilename);
      });
  }

  function handleLocalFileExist(container, blobName, localFilename) {
    const localTempFilename = DOWNLOAD_DIR + container + '/' + blobName + '.tttemp';

    const handleFilesAreInSync = () => {
      return deleteLocalFile(localTempFilename);
    };
    const handleFilesAreNotInSync = () => {
      return deleteLocalFile(localFilename)
        .then(b => {
          renameFile(localTempFilename, localFilename);
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
            //return null;
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
      promise = BlobService.listContainersSegmented(currentToken, { maxResults: MAX_CONTAINER_RESULTS });
    } else {
      promise = BlobService.listContainersSegmented(null, { maxResults: MAX_CONTAINER_RESULTS });
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
          //return null;
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