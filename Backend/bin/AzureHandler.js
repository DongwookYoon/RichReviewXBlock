const storage = require('azure-storage');
const env = require('../env');

class AzureHandler {

    constructor(){
        this.BLOB_HOST = env.azure_config.storage.host;
        const ACCOUNT = env.azure_config.storage.account_name;
        const STORAGE_KEY = env.azure_config.storage.access_key;
        this.blobService = storage.createBlobService(ACCOUNT, STORAGE_KEY, this.BLOB_HOST).withFilter(new storage.ExponentialRetryPolicyFilter());
    }



    static async get_instance() {
        if (this.instance) {
            console.log('Database handler instance found');
            return this.instance;
        }

        this.instance = await new AzureHandler();
        return this.instance;
    }



    create_container_if_not_exists (context) {
        return new Promise((resolve, reject) => {
            this.blobService.createContainerIfNotExists(
                context.container,
                { publicAccessLevel : 'blob' },
                err => {
                    if(err){
                        reject(err);
                    }

                    console.log('Created container');
                    resolve(context);
                }
            );
        });
    }



    create_blob_from_local_file (context) {
        return new Promise((resolve, reject) => {
            this.blobService.createBlockBlobFromLocalFile(
                context.container,
                context.blob,
                context.blob_localfile_path,
                err => {
                    if (err) {
                        reject(err);
                    }

                    console.log('Created blob from local file');
                    resolve(context);
                }
            );
        });
    }


    create_block_blob_from_text (context, doc_layout) {
        return new Promise((resolve, reject) => {
            this.blobService.createBlockBlobFromText(
                context['container'],
                'doc.vs_doc',
                JSON.stringify(doc_layout),
                err => {
                    if (err) {
                        reject(err);
                    }

                    resolve(context);
                }
            )
        })
    }


    async listContainers () {
        return new Promise((resolve, reject) => {
            this.blobService.listContainersSegmented(null, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ message: `${data.entries.length} containers`, containers: data.entries });
                }
            });
        });
    };


    get_sas (container, blob, expiry) {
        let t_start = new Date();
        let t_expiry = new Date(t_start);
        t_expiry.setSeconds(t_start.getSeconds() + expiry);
        t_start.setSeconds(t_start.getSeconds() - expiry);

        let policy = {
            AccessPolicy:{
                Permissions: storage.BlobUtilities.SharedAccessPermissions.WRITE,
                Expiry: t_expiry
            }
        };

        return this.blobService.generateSharedAccessSignature(container, blob, policy);
    }
}


module.exports = AzureHandler;
