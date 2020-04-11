class DocumentUploadHandler {

    constructor(){
        this.path0 = `${path.sep}tmp${path.sep}richreview`;
        this.path = `${path.sep}tmp${path.sep}richreview${path.sep}pdfs${path.sep}`;
    }



    static async get_instance() {
        if (this.instance)
            return this.instance;

        if (!fs.existsSync(`${path.sep}tmp`))
            fs.mkdirSync(`${path.sep}tmp`);
        if (!fs.existsSync(`${path.sep}tmp${path.sep}richreview`))
            fs.mkdirSync(`${path.sep}tmp${path.sep}richreview`);
        if (!fs.existsSync(`${path.sep}tmp${path.sep}richreview${path.sep}pdfs`))
            fs.mkdirSync(`${path.sep}tmp${path.sep}richreview${path.sep}pdfs`);

        this.instance = await new DocumentUploadHandler();
        return this.instance;
    }


    async upload_documents (files, upload) {

        if (!this.files_are_pdfs(files))
            throw new RichReviewError('Files must be pdfs');
        if(!this.files_are_valid_size(files))
            throw new RichReviewError('Files must be less than 7.5mb');


        let uuid = this.get_uuid();
                
        for (let key in files) {
            let file = files[key];
            await this.upload_document(uuid, file);
        }

        try {
            await this.merge_pdfs({url: 'http://127.0.0.1:5000/mupla_serve/', form: {mode: "MergePdfs", uuid: uuid}});
        } catch(e) {
            console.warn(e);
            throw new RichReviewError('Unable to connect to MUPLA server');
        }


        /*Check if a merge succeeded  */
        try {
             await this.check_merge_success(uuid);
        } catch (e)
        {
            console.warn(`PDF merge failed for ${uuid}`);
            console.warn(e);
            throw new PDFFormatError();
        } 
        
        
        let context = await this.upload_pdf_to_azure(uuid);

        let mupla_handler = await MuplaHandler.get_instance();
        let analyzed_vs_doc = await mupla_handler.analyze_vs_doc(context);

        this.update_vs_doc(uuid, analyzed_vs_doc);

        await this.upload_vs_doc_to_azure(context);

        return context;
    }


    async check_merge_success (uuid) {
        return new Promise((resolve, reject) => {

        fs.access(`${this.path}${uuid}${path.sep}merged.js`, fs.constants.F_OK, (err)=> {
                if (err)
                     reject(err);
                else
                    resolve(true);
           });
        });
    }


    upload_document (uuid, file) {
        let data = fs.readFileSync(file.path);
        this.cache_document(uuid, data);
    }



    merge_pdfs (params) {
        return new Promise((resolve, reject)=> {
            request.post(
                params,
                function(err, httpResponse, body){
                    if(err){
                        reject(err);
                    }
                    else{
                        resolve({httpResponse: httpResponse, body: body});
                    }
                }
            );
        });
    }



    async upload_pdf_to_azure (uuid) {
        let pdf_path = `${this.path}${uuid}${path.sep}merged.pdf`;

        let pdf = await fs.readFileSync(pdf_path, {encoding: 'binary'});

        let sha = crypto.createHash('sha1');

        // Old algorithm only salted hash with pdf data
        // Need to add a variation to the salt so that
        // Duplicate documents can be uploaded
        // This is for comment type assignments
        // Where an identical group is created for each student
        sha.update(pdf + Date.now());

        let context = {
            container: sha.digest('hex').toLowerCase(),
            blob: 'doc.pdf',
            blob_localfile_path: pdf_path,
            uuid: uuid
        };

        let azure_handler = await AzureHandler.get_instance();
        await azure_handler.create_container_if_not_exists(context);
        await azure_handler.create_blob_from_local_file(context);

        return context;
    }



    async upload_vs_doc_to_azure (context) {
        let vs_doc = JSON.parse(fs.readFileSync(`${this.path}${context['uuid']}${path.sep}doc.vs_doc`, 'utf8'));
        let azure_handler = await AzureHandler.get_instance();
        await azure_handler.create_block_blob_from_text(context, vs_doc);
    }



    files_are_pdfs (files) {
        for (let key in files) {
            let file = files[key];
            if (file.type !== 'application/pdf')
                return false;
        }

        return true;
    }



    files_are_valid_size (files) {
        for (let key in files) {
            let file = files[key];
            if (file.size > 8700000)
                return false
        }
        return true;
    }



    get_uuid () {
        let uuid = uuidv1();
        while (fs.existsSync(`.${path.sep}cache${path.sep}${uuid}`)) {
            uuid = uuidv1();
        }
        console.log(`Generated uuid: ${uuid}`);
        return uuid;
    }



    cache_document (uuid, data) {
        try {
            if (!fs.existsSync(this.path0)) {
                fs.mkdirSync(this.path0);
            }
            if (!fs.existsSync(this.path)) {
                fs.mkdirSync(this.path);
            }

            let dir = this.path + uuid;
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }

            let file_count = fs.readdirSync(dir).length;

            fs.writeFileSync(`${dir}${path.sep}${file_count}.pdf`, data, 'binary');
        } catch(e) {
            console.warn('Failure while caching document');
            console.warn(e);
        }
    }



    update_vs_doc (uuid, updated_vs_doc) {
        try {
            let dir = this.path + uuid;

            fs.writeFileSync(`${dir}${path.sep}doc.vs_doc`, JSON.stringify(updated_vs_doc), 'utf8');
        } catch(e) {
            console.warn('Failure while updating vs document');
            console.warn(e);
        }
    }
}

module.exports = DocumentUploadHandler;

const fs = require('fs');
const uuidv1 = require('uuid/v1');
const request = require('request');
const crypto = require('crypto');
const AzureHandler = require('./AzureHandler');
const RichReviewError = require('../errors/RichReviewError');
const PDFFormatError = require ('../errors/PDFFormatError');
const MuplaHandler = require('./MuplaHandler');
const path = require('path');