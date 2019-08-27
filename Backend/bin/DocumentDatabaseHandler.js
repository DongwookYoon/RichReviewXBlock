class DocumentDatabaseHandler {

    constructor(){
        RedisClient.get_instance().then((db_handler) => {
            this.db_handler = db_handler;
        });
    }



    static async get_instance() {
        if (this.instance)
            return this.instance;

        this.instance = await new DocumentDatabaseHandler();
        return this.instance;
    }


    async create_doc (user_id, pdf_id) {
        let creation_time = Date.now();
        let doc_key = `${KeyDictionary.key_dictionary['document']}${user_id}_${creation_time}`;

        await this.set_document_data(doc_key, 'userid_n', user_id);
        await this.set_document_data(doc_key, 'creationTime', creation_time);
        await this.set_document_data(doc_key, 'pdfid', pdf_id);
        await this.set_document_data(doc_key, 'name', `Document uploaded at ${new Date()}`);
        await this.set_document_data(doc_key, 'groups', '[]');

        return doc_key;
    }



    async add_group_to_doc (doc_key, group_key) {
        let doc_data = await this.get_doc_data(doc_key);
        let groups = doc_data['groups'];

        if (!groups.includes(group_key)) {
            groups.push(group_key);
            await this.set_document_data(doc_key, 'groups', JSON.stringify(groups));
        }
    }



    get_doc_data (doc_key) {
        return new Promise((resolve, reject) => {
            this.db_handler.client.HGETALL(doc_key, function (error, result) {
                if (error) {
                    console.log(error);
                    reject(error);
                }

                let parsed_data = RedisToJSONParser.parse_data_to_JSON(result);
                resolve(parsed_data);
            });
        })
    }



    set_document_data(doc_key, field, value) {

        return new Promise((resolve, reject) => {
            this.db_handler.client.hset(doc_key, field, value, (error, result) => {
                if (error) {
                    console.log(error);
                    reject(error);
                }
                resolve();
            });
        })
    }
}

module.exports = DocumentDatabaseHandler;

const RedisClient = require("./RedisClient");
const RedisToJSONParser = require('./RedisToJSONParser');
const KeyDictionary = require('./KeyDictionary');

