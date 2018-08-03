/**
 * Node worker that:
 * 1) iterates through every container in the Azure Storage specified by azure_config using a scanning method
 * 2) iterates through every blob in each container
 * 3.1) Downloads blob if local file does not exist
 * 3.2) Compares and updates blob is if files have changed
 * 3.3) Skip the blob if already downloaded and unchanged
 *
 * Note: backup script does not delete local files if blob has been deleted.
 * Note: as of 20 July, 2018, there are 726 containers, and 9365 blobs
 */
const run_service = require('../handlers/azure').run_service;
const BlobSyncManager = require('../handlers/BlobSyncManager');

run_service(new BlobSyncManager());