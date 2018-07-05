
const fs = require('fs');
const path = require('path');
const node_util = require('util');

const azure = require('azure-storage');

const env  = require('../lib/env');
const util = require('../util');

const azure_config = env.azure_config;

/**
 * SAS Token to get access to blobs from non-CA Azure Storage
 *
 * go to azure to regenerate the SAS token
 */
const SASToken = "";

const blobService = azure.createBlobService(azure_config.storage.connection_string).withFilter(new azure.ExponentialRetryPolicyFilter());
const blobCAService = azure.createBlobService(azure_config.storage_ca.connection_string).withFilter(new azure.ExponentialRetryPolicyFilter());

const promisifyBlobService = function(service) {
  const pub = { };
  Object.keys(azure.BlobService.prototype).forEach((command) => {
    pub[command] = node_util.promisify(service[command]).bind(service);
  });
  return pub;
};

const BlobService = promisifyBlobService(blobService);
const BlobCAService = promisifyBlobService(blobCAService);

/**
 * List all containers from Azure Storage (non CA)
 */
function listContainers(service) {
  const maxResults = 10;
  const COUNT = {};
  const incr = (a) => {
    if(COUNT[a]) { COUNT[a]++; } else { COUNT[a] = 1; }
  };

  const scanContainers = (currentToken) => {
    let promise = null;
    if(currentToken) {
      promise = service.listContainersSegmented(currentToken, { maxResults });
    } else {
      promise = service.listContainersSegmented(null, { maxResults });
    }
    return promise
      .then((results) => {
        //console.log(results);
        results.entries.forEach((entry) => {
          //console.log(entry.name);
          incr(entry.publicAccessLevel);
        });
        if(results.continuationToken) {
          return scanContainers(results.continuationToken);
        } else {
          return null;
        }
      });
  };

  return scanContainers()
    .then((b) => {
      console.log(JSON.stringify(COUNT, null, '\t'));
    })
    .catch((err) => {
      util.error(err);
    });
}

//listContainers(BlobService);
//listContainers(BlobCAService);

/**
 * List all blobs from given container from Azure Storage (non CA)
 *
 * @param service
 * @param container
 * @param prefix?
 */
function listBlobs(service, container, prefix) {
  const COUNT = {};
  const incr = (a) => {
    if(COUNT[a]) { COUNT[a]++; } else { COUNT[a] = 1; }
  };

  const scanBlobs = (currentToken) => {
    let promise = null;
    if (currentToken && prefix) {
      promise = service.listBlobsSegmentedWithPrefix(container, prefix, currentToken);
    } else if (!currentToken && prefix) {
      promise = service.listBlobsSegmentedWithPrefix(container, prefix, null);
    } else if (currentToken && !prefix) {
      promise = service.listBlobsSegmented(container, currentToken);
    } else { // (!currentToken && !prefix)
      promise = service.listBlobsSegmented(container, null);
    }
    return promise
      .then((results) => {
        results.entries.forEach((entry) => {
          //console.log(entry.name);
          incr(entry.blobType); // there are all blobType: 'BlockBlob'
        });
        if (results.continuationToken) {
          return scanBlobs(results.continuationToken);
        } else {
          return null;
        }
      });
  };

  return scanBlobs()
    .then((b) => {
      console.log(JSON.stringify(COUNT, null, '\t'));
    })
    .catch((err) => {
      util.error(err);
    });
}

/**
 * In azure blob (not CA),
 *
 * There are 3 containers: cdn, course, math2220-fall2015
 * There is 1 special blob: , data
 */

/**
 * Test migration of cdn container from non-CA Azure Storage to CA Azure Storage
 */
function test_migration() {
  const container = "cdn";

  const relocate_block_blob = (blob_name) => {
    const URI = azure_config.storage.host+container+"/"+blob_name+SASToken;
    console.log(URI);
    return BlobCAService.startCopyBlob(URI, container, blob_name);
  };

  util.debug("starting test_relocate");
  return BlobCAService.createContainerIfNotExists( container, { publicAccessLevel: "container" } )
    .then((resp) => {
      return BlobService.listBlobsSegmented(container, null);
    })
    .then((results) => {
      const promises = results.entries.map((entry) => {
        return relocate_block_blob(entry.name);
      });
      return Promise.all(promises);
    })
    .then((b) => {
      util.debug("done test_relocate");
    })
    .catch((err) => {
      util.error(err);
    });
}

/**
 * This function deals with migrating specific blobs in case migrate_exec() fails.
 *
 */
function migrate_container_special(container, publicAccessLevel, prefix) {
  const maxResults = 5;
  const fails = [];
  // go to azure to regenerate the SAS token

  const migrate_block_blob = (blob_name) => {
    const URI = azure_config.storage.host+container+"/"+blob_name+SASToken;
    util.printer("BLOB MIGRATE","migrating: "+URI);
    return new Promise(function(resolve, reject) {
      BlobCAService.startCopyBlob(URI, container, blob_name)
        .then((res) => { resolve(res); })
        .catch((err) => {
          util.printer("BLOB MIGRATE","MASSIVE FALIURE :: MASSIVE FALIURE :: MASSIVE FALIURE\nURI= "+URI+"\nERR="+err);
          fails.push(URI);
          resolve(err);
        });
    });
  };

  const scanBlobs = (currentToken) => {
    let promise = null;
    if (currentToken) {
      promise = BlobService.listBlobsSegmentedWithPrefix(container, prefix, currentToken, {maxResults});
    } else {
      promise = BlobService.listBlobsSegmentedWithPrefix(container, prefix, null, {maxResults});
    }
    return promise
      .then((results) => {
        const promises = results.entries.map((entry) => {
          return migrate_block_blob(entry.name);
        });
        return Promise.all(promises)
          .then((b) => {
            return results.continuationToken;
          });
      })
      .then((cToken) => {
        if (cToken) {
          return scanBlobs(cToken);
        } else {
          return null;
        }
      });
  };

  util.printer("BLOB MIGRATE","migrating: "+container);
  return BlobCAService.createContainerIfNotExists( container, { publicAccessLevel } )
    .then((b) => {
      return scanBlobs();
    })
    .then((b) => {
      util.printer("BLOB MIGRATE", "done migrating: "+container);
      fails.forEach((fail) => { console.log(fail); });
      return;
    })
    .catch((err) => {
      util.error(err);
    });
}

/**
 * For the files that weren't migrated properly, we want to download them and manually upload them again
 */
function download_files_misc () {
  const dl_arr = [ ];
  const container = "data";
  const path_to = "/home/fireofearth/Machines/richreview/TMP/";
  const promises = dl_arr.map((blob_name) => {
    return BlobService.getBlobToLocalFile(container, "audio/"+blob_name, path_to+blob_name);
  });
  return Promise.all(promises).then((b) => { util.printer("BLOB MIGRATE", "done"); });
}

//download_files_misc();

/**
 * We use this to search for the files that weren't migrated properly
 */
function check_consistency_misc () {
  const container = "data";
  const prefix = "audio";
  const maxResults = 30;
  const misMatch = [ ];
  let acc = 0;

  const check_block_blob = (entry) => {
    return BlobCAService.doesBlobExist(container, entry)
      .then((result) => {
        //console.log(result);
        if(!result.exists) {
          misMatch.push(entry);
        }
      })
      .catch((err) => {
        util.error(err);
      });
  };

  const scanBlobs = (currentToken) => {
    let promise = null;
    if (currentToken) {
      promise = BlobService.listBlobsSegmentedWithPrefix(container, prefix, currentToken, {maxResults});
    } else {
      promise = BlobService.listBlobsSegmentedWithPrefix(container, prefix, null, {maxResults});
    }
    return promise
      .then((results) => {
        const promises = results.entries.map((entry) => {
          return check_block_blob(entry.name);
        });
        return Promise.all(promises)
          .then((b) => {
            acc += 30;
            console.log(acc);
            return results.continuationToken;
          });
      })
      .then((cToken) => {
        if (cToken) {
          return scanBlobs(cToken);
        } else {
          return null;
        }
      });
  };

  return scanBlobs()
    .then((b) => {
      misMatch.forEach((m) => { console.log(m); });
      return;
    })
    .catch((err) => {
      util.error(err);
    });
}

//check_consistency_misc();

//migrate_container_special("data", "Blob", "audio");

/**
 * Migrate a single container
 *
 * is used by migrate_exec()
 *
 * @param container - the container we want to migrate
 * @param publicAccessLevel - the public access level of the container we are migrating
 * @return {*}
 */
function migrate_container(container, publicAccessLevel) {
  const maxResults = 5;
  // go to azure to regenerate the SAS token

  const migrate_block_blob = (blob_name) => {
    const URI = azure_config.storage.host+container+"/"+blob_name+SASToken;
    util.logger("BLOB MIGRATE","migrating: "+URI);
    return BlobCAService.startCopyBlob(URI, container, blob_name);
  };

  const scanBlobs = (currentToken) => {
    let promise = null;
    if (currentToken) {
      promise = BlobService.listBlobsSegmented(container, currentToken, { maxResults });
    } else {
      promise = BlobService.listBlobsSegmented(container, null, { maxResults });
    }
    return promise
      .then((results) => {
        const promises = results.entries.map((entry) => {
          return migrate_block_blob(entry.name);
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

  util.logger("BLOB MIGRATE","migrating: "+container);
  return BlobCAService.createContainerIfNotExists( container, { publicAccessLevel } )
    .then((b) => {
      return scanBlobs();
    })
    .then((b) => {
      util.logger("BLOB MIGRATE", "done migrating: "+container);
    })
    .catch((err) => {
      util.error(err);
    });
}

//migrate_container("data", "Blob");

/**
 *
 * Migrate all containers and blobs inside of them
 */
function migrate_exec() {
  const maxResults = 3;

  const scanContainers = (currentToken) => {
    let promise = null;
    if(currentToken) {
      promise = BlobService.listContainersSegmented(currentToken, { maxResults });
    } else {
      promise = BlobService.listContainersSegmented(null, { maxResults });
    }
    return promise
      .then((results) => {
        const promises = results.entries.map((entry) => {
          return migrate_container(entry.name, entry.publicAccessLevel );
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

  util.logger("BLOB MIGRATE","starting migrate_exec");
  return scanContainers()
    .then((b) => {
      util.logger("BLOB MIGRATE","done migrate_exec");
    })
    .catch((err) => {
      util.error(err);
    });
}

//migrate_exec();