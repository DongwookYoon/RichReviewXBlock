/**
 * Set azure storage setting
 *
 */

// import built-in modules
const fs = require('fs');

// import npm modules
const Promise = require("promise"); // jshint ignore:line
const storage = require('azure-storage');
const request = require('request');

// import libraries
const env = require('../lib/env');
const util = require('../util');

const BLOB_HOST = env.azure_config.storage.host;
const ACCOUNT = env.azure_config.storage.account_name;
const STORAGE_KEY = env.azure_config.storage.access_key;

const blobService = storage.createBlobService(ACCOUNT, STORAGE_KEY, BLOB_HOST).withFilter(new storage.ExponentialRetryPolicyFilter());

exports.getSas = function(container, blob, expiry){ // expires in seconds
    // helpful links:
    // http://www.contentmaster.com/azure/windows-azure-storage-cors/
    // https://azure.microsoft.com/en-us/documentation/articles/storage-nodejs-how-to-use-blob-storage/#work-with-shared-access-signatures
    var t_start = new Date();
    var t_expiry = new Date(t_start);
    t_expiry.setSeconds(t_start.getSeconds() + expiry);
    t_start.setSeconds(t_start.getSeconds() - expiry);

    var policy = {
        AccessPolicy:{
            Permissions: storage.BlobUtilities.SharedAccessPermissions.WRITE,
            Expiry: t_expiry
        }
    };

    var sas = blobService.generateSharedAccessSignature(container, blob, policy);
    return sas;
};

exports.BlobFileDownload = function(c, b, f, cb){
    var wr = fs.createWriteStream(f);
    wr.on('finish', function(error){
        if(error){error_result = error;}
        wr.close(cb);
    });
    wr.on('error', function(error){
        error_result = error;
        wr.close(cb);
    });

    var rd = request.get(BLOB_HOST + c + '/' + b, function (error) {
        if(error){
            error_result = error;
            wr.close(cb);
        }
    });
    rd.on('error', function(error){
            if(error){error_result = error;}
        });
    rd.pipe(wr);
};

exports.CreateContainerIfNotExist = function(ctx){
    return new Promise(function(resolve, reject){
        blobService.createContainerIfNotExists(
            ctx.container,
            { publicAccessLevel : 'blob' },
            function(err, result){
                if(err){
                    reject(err);
                }
                else{
                    resolve(ctx);
                }
            }
        );
    });
};

exports.DoesBlobExist = function(ctx){
    return new Promise(function(resolve, reject){
        blobService.doesBlobExist(ctx.container, ctx.blob, function(err, resp){
            if(err){
                reject(err);
            }
            else{
                ctx.is_blob_exist = resp;
                resolve(ctx);
            }
        });
    });
};

exports.GetBlobToText = function(ctx){
    return new Promise(function(resolve, reject){
        blobService.getBlobToText(ctx.container, ctx.blob, function(err, resp){
            if(err){
                reject(err);
            }
            else{
                ctx.text = resp;
                resolve(ctx);
            }
        });
    });
};

exports.SetBlobFromText = function(ctx){
    return new Promise(function(resolve, reject){
        blobService.createBlockBlobFromText(ctx.container, ctx.blob, ctx.text, function(err, resp){
            if(err){
                reject(err);
            }
            else{
                ctx.resp = resp;
                resolve(ctx);
            }
        });
    });
};

exports.CreateBlobFromLocalFile = function(ctx) {
    return new Promise(function(resolve, reject) {
            blobService.createBlockBlobFromLocalFile(
                ctx.container,
                ctx.blob,
                ctx.blob_localfile_path,
                function (err) {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(ctx);
                    }
                }
            );
        });
};


exports.ListBlobsWithPrefix = function(container, prefix){
    return new Promise(function(resolve, reject){
        blobService.listBlobsSegmentedWithPrefix(container, prefix, undefined, function(err, resp){
            if(err){
                reject(err);
            }
            else{
                resolve(resp.entries.map(function(entity){return BLOB_HOST+'data/'+entity.name;}));
            }
        });

    });
};

exports.svc = blobService;
exports.BLOB_HOST = BLOB_HOST;