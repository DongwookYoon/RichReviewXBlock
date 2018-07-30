/**
 * Node worker that generates a last modified record for storage blobs.
 *
 * Note: as of 20 July, 2018, there are 726 containers, and 9365 blobs
 */
const azure = require('../handlers/azure');

azure.run_service(new azure.WriteLastModifiedManager());