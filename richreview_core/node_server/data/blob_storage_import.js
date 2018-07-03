
const fs = require('fs');
const path = require('path');
const node_util = require('util');

const azure = require('azure-storage');

const util = require('../util');

const azure_config = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'ssl/azure_keys.json'), 'utf-8')
);

const blobService = azure.createBlobService(azure_config.storage.connection_string).withFilter(new azure.ExponentialRetryPolicyFilter());
const blobCAService = azure.createBlobService(azure_config.storage_ca.connection_string).withFilter(new azure.ExponentialRetryPolicyFilter());

/*
There are 3 containers: cdn, course, math2220-fall2015
There is 1 special blob: , data
and many other blobs
*/

const promisifyBlobService = function(service) {
  const pub = { };
  Object.keys(azure.BlobService.prototype).forEach((command) => {
    pub[command] = node_util.promisify(service[command]).bind(service);
  });
  return pub;
};

const BlobService = promisifyBlobService(blobService);
const BlobCAService = promisifyBlobService(blobCAService);

function listContainers() {
  const COUNT = {};
  const incr = (a) => {
    if(COUNT[a]) { COUNT[a]++; } else { COUNT[a] = 1; }
  };

  return BlobService.listContainersSegmented(null)
    .then((results) => {
      results.entries.forEach((entry) => {
        //console.log(entry);
        incr(entry.publicAccessLevel);
      });
      console.log(JSON.stringify(COUNT, null, '\t'));
      return;
    })
    .catch((err) => {
      util.error(err);
    });
}

//listContainers();

function listBlobs(container) {
  const COUNT = {};
  const incr = (a) => {
    if(COUNT[a]) { COUNT[a]++; } else { COUNT[a] = 1; }
  };

  BlobService.listBlobsSegmented(container, null)
    .then((results) => {
      results.entries.forEach((entry) => {
        //console.log(entry);
        incr(entry.blobType); // there are all blobType: 'BlockBlob'
      });
      console.log(JSON.stringify(COUNT, null, '\t'));
      return;
    })
    .catch((err) => {
      util.error(err);
    });
}

//listBlobs("cdn");
//listBlobs("data");
//listBlobs("course");
//listBlobs("math2220-fall2015");


function test_relocate() {
  const container = "cdn";
  // go to azure to regenerate the SAS token
  const SASToken = "?sv=2017-11-09&ss=bfqt&srt=sco&sp=rwdlacup&se=2018-07-03T20:03:14Z&st=2018-07-03T12:03:14Z&spr=https&sig=rACFKZoROsWEYH30JhY%2Bnr34K5FNJANjRLKVp%2BQgnmA%3D";

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

test_relocate();

function relocate_exec(container) {
  const relocate_block_blobs = (container_name) => {
    return BlobService.listBlobsSegmented(container_name)
      .then((results) => {

      });
  };

  const relocate_container = (name, publicAccessLevel) => {
    return BlobCAService.createContainerIfNotExists( name, { publicAccessLevel } )
      .then((resp) => {
        return relocate_block_blobs(name);
      });
  };

  return BlobService.listContainersSegmented(null)
    .then((results) => {
      const promises = results.entries.map((entry) => {
        return relocate_container(entry.name, entry.publicAccessLevel);
      });
      return Promise.all(promises);
    })
    .catch((err) => {
      util.error(err);
    });
}

