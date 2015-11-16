/**
 * Created by Dongwook on 11/18/2014.
 */
var js_error = require('../lib/js_error');
var azure = require('../lib/azure');
var js_utils = require('../lib/js_utils');
var request = require('request');
var archiver = require('archiver');
var fs = require('fs');

function Downloader_SendZip(res, c_id){
    archive = archiver('zip');
    var zipfile = fs.createWriteStream('../_temp/'+c_id+'.zip');
    zipfile.on('close', function(){
        res.download('../_temp/'+c_id+'.zip', 'richreview_data.zip', function(error){
            if (error) {
                js_error.HandleError('Internal Server-side Error', error, res);
            }
        });
    });

    archive.on('error', function(err){
        js_error.HandleError('Internal Server-side Error', error, res);
    });

    archive.pipe(zipfile);
    archive.bulk([
        { expand: true, cwd: '../_temp', src: [c_id, c_id+'/*']}
    ]);
    archive.finalize();
}

function Downloader_DownloadFiles(res, c_id, blobs){
    var error_result = null;
    var done = 0;
    function AfterDownload(){
        ++done;
        if(done == blobs.entries.length){
            if(error_result){
                js_error.HandleError('Internal Server-side Error', error_result, res);
            }
            else{
                Downloader_SendZip(res, c_id);
            }
        }
    }
    for (var i = 0; i < blobs.entries.length; ++i) {
        (function(){
            var blob_path = c_id + '/' + blobs.entries[i].name;
            var blob_url = azure.BLOB_HOST + blob_path;
            var fs_path = '../_temp/' + blob_path;
            var file = fs.createWriteStream(fs_path);
            file.on('finish', function(error){
                if(error){error_result = error;}
                file.close(AfterDownload);
            });
            file.on('error', function(error){
                error_result = error;
                file.close(AfterDownload);
            });
            request
                .get(blob_url, function (error) {
                    if(error){
                        error_result = error;
                        file.close(AfterDownload);
                    }
                })
                .on('error', function(error){
                    if(error){error_result = error;}
                })
                .pipe(file);
        })();
    }
}

function Downloader_SetDownloadFolder(res, c_id){
    azure.svc.listBlobsSegmented(c_id, null, function (error, blobs) {
        if (error) {
            if(error.code == 'ContainerNotFound'){
                js_error.HandleError('Invalid Access to Downloader', 'ContainerNotFound', res);
            }
            else{
                js_error.HandleError('Invalid Access to Downloader', 'No Query Data', res);
            }
        }
        else {
            try{
                fs.unlinkSync('../_temp/'+c_id+'.zip');
            }
            catch(error){
                x=0
            }

            js_utils.CreateCleanFolderAsync('../_temp/'+c_id, function(error){
                if(error){
                    js_error.HandleError('Internal Server-side Error', error, res);
                }
                else{

                    Downloader_DownloadFiles(res, c_id, blobs);
                }
            });
        }

    });
}


exports.dn = function (req, res) {
    if (req.query['c']) {
        Downloader_SetDownloadFolder(res, req.query['c']);
    }
    else {
        js_error.HandleError('Invalid Access to Downloader', 'No Query Data', res);
    }

};