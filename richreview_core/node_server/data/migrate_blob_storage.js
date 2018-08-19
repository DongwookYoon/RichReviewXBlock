/**
 * Migrate blob storage
 *
 * Created by Colin
 */

const node_util = require('util');

const azure = require('azure-storage');

const util = require('../util');

/**
 * 'FROM' Azure Storage (migrate)=> 'TO' Azure Storage
 *
 * TODO: replace to not expose...
 */
const azure_config = {
  storage_FROM: {
    account_name: "richreview",
    host: "https://richreview.blob.core.windows.net/",
    access_key: "",
    connection_string: "",
    SAS_TOKEN: ""
  },
  storage_TO: {
    account_name: "richreview2ca",
    host: "https://richreview2ca.blob.core.windows.net/",
    access_key: "",
    connection_string: ""
  }
};

/**
 * SAS Token to get access to blobs from your 'FROM' Azure Storage
 *
 * go to Azure Portal to regenerate the SAS token
 */
const SASToken = azure_config.SAS_TOKEN;

/**
 * Client of 'FROM' Azure Storage
 */
const blobService = azure.createBlobService(azure_config.storage.connection_string).withFilter(new azure.ExponentialRetryPolicyFilter());

/**
 * Client of 'FROM' Azure Storage
 */
const blobCAService = azure.createBlobService(azure_config.storage_ca.connection_string).withFilter(new azure.ExponentialRetryPolicyFilter());

/**
 * Script to promisify client commands
 */
const promisifyBlobService = function(service) {
  const pub = { };
  Object.keys(azure.BlobService.prototype).forEach((command) => {
    pub[command] = node_util.promisify(service[command]).bind(service);
  });
  return pub;
};
/*******************************************************/
const BlobService = promisifyBlobService(blobService);
const BlobCAService = promisifyBlobService(blobCAService);

/**
 * List all containers from an Azure Storage
 * @param service {BlobService} - the client of storage to list
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

/**
 * List all blobs from given container from an Azure Storage
 *
 * @param {BlobService} service   - the client of storage to list
 * @param {string}      container - the name of the container to list
 * @param {string}      [prefix]  - the subdirectory to list
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
 * Test migration of a container
 *
 * @param {string} [container="cdn"] - container to migrate
 */
function test_migration(container) {
  if(!container) {
    container = "cdn";
  }

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
 * @param {string} container - the container to migrate
 * @param {string} publicAccessLevel - the access level of the container: 'container', 'blob', etc
 * @param {string} [prefix] - the subdirectory to migrate
 */
function migrate_container_special(container, publicAccessLevel, prefix) {
  const maxResults = 5;
  const fails = [];
  // go to azure to regenerate the SAS token

  const migrate_block_blob = (blob_name) => {
    const URI = azure_config.storage.host+container+"/"+blob_name+SASToken;
    //util.printer("BLOB MIGRATE","migrating: "+URI);
    return new Promise(function(resolve, reject) {
      BlobCAService.startCopyBlob(URI, container, blob_name)
        .then((res) => { resolve(res); })
        .catch((err) => {
          util.printer("BLOB MIGRATE","FALIURE, URI= "+URI+"\nERR="+err);
          fails.push(URI);
          resolve(err);
        });
    });
  };

  const scanBlobs = (currentToken) => {
    let promise = null;
    if (currentToken && prefix) {
      promise = BlobService.listBlobsSegmentedWithPrefix(container, prefix, currentToken);
    } else if (!currentToken && prefix) {
      promise = BlobService.listBlobsSegmentedWithPrefix(container, prefix, null);
    } else if (currentToken && !prefix) {
      promise = BlobService.listBlobsSegmented(container, currentToken);
    } else { // (!currentToken && !prefix)
      promise = BlobService.listBlobsSegmented(container, null);
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
 * Download container blobs to your directory
 *
 * @param {BlobService} service - the client of storage to download
 * @param {string} container - the container to download
 * @param {Array.<string>} dl_arr - list of blobs and their prefix to download
 * @param {string} [dl_to_path=__dirname + "/TEMP"] the directory to download to
 */
function download_files_misc (service, container, dl_arr, dl_to_path) {
  if(!dl_arr) {
    dl_arr = [ ];
  }
  if(!container) {
    container = "data";
  }
  if(!dl_to_path) {
    dl_to_path = __dirname + "/TEMP";
  }
  if(!/\/$/.test(dl_to_path)) {
    dl_to_path = dl_to_path + "/";
  }
  const promises = dl_arr.map((blob_name) => {
    return service.getBlobToLocalFile(container, blob_name, dl_to_path+blob_name);
  });
  return Promise.all(promises).then((b) => { util.printer("BLOB MIGRATE", "done"); });
}

/**
 * We use this to search for the files that weren't migrated properly
 * HOTFIX
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

/*****************/

/**
 * In Azure Storage
 *
 * There are 3 containers: cdn, course, math2220-fall2015
 * There is 1 special blob: data
 */

/**
 * List all containers from an Azure Storage
 * @param service {BlobService} - the client of storage to list
 */
//listContainers(service)

/**
 * List all blobs from given container from an Azure Storage
 *
 * @param {BlobService} service   - the client of storage to list
 * @param {string}      container - the name of the container to list
 * @param {string}      [prefix]  - the subdirectory to list
 */
//listBlobs(service, container, prefix)

/**
 * Test migration of a container
 *
 * @param {string} [container="cdn"] - container to migrate
 * @return {*}
 */
//test_migration(container)

/**
 * This function deals with migrating specific blobs in case migrate_exec() fails.
 *
 * @param {BlobService} container - the container to migrate
 * @param {string} publicAccessLevel - the access level of the container: 'container', 'blob', etc
 * @param {string} [prefix] - the subdirectory to migrate
 */
//migrate_container_special(container, publicAccessLevel, prefix)

/**
 * Download container blobs to your directory
 *
 * @param {BlobService} service - the client of storage to download
 * @param {string} container - the container to download
 * @param {Array.<string>} dl_arr - list of blobs and their prefix to download
 * @param {string} [dl_to_path=__dirname + "/TEMP"] the directory to download to
 */
//download_files_misc (service, container, dl_arr, dl_to_path)

/**
 * We use this to search for the files that weren't migrated properly
 * HOTFIX
 */
//check_consistency_misc ()

/**
 *
 * Migrate all containers and the blobs inside of the containers
 */
//migrate_exec();