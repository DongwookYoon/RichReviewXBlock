/**
 * Created by Dongwook on 12/13/2014.
 */

// import built-in modules
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require("os");

// import npm modules
const formidable = require('formidable');
const uuid = require('node-uuid');
const mkdirp = require('mkdirp');
const Promise = require("promise"); // jshint ignore:line
const request = require("request");

// import libraries
const js_utils = require('../lib/js_utils');
const env = require('../lib/env.js');
const azure = require("../lib/azure");
const R2D = require("../lib/r2d.js");

/**
 * CHANGES: 20180505
 *
 * If os hostname is spire then use own django server (localhost)
 */
let MUPLA_SERVER_LOCAL_URL = null;
if(process.env.NODE_ENV === 'production') {
    MUPLA_SERVER_LOCAL_URL = "http://127.0.0.1:5000/mupla_serve/";
} else {
    MUPLA_SERVER_LOCAL_URL = "http://localhost:5000/mupla_serve/";
}

/**
 * Response to GET upload page. renders upload.pug
 * @param req
 * @param res
 */
exports.page = function (req, res) {
    req.session.latestUrl = req.originalUrl;
    res.render('upload', { cur_page: "upload", user: req.user });
};

/**
 * Response to the POST requests.
 * @param req
 * @param res
 */
exports.post = function (req, res) {
    if(req.query.hasOwnProperty("mode")){
        // requests from the upload page. (see ./public/js/upload_helper.js)
        if(req.query["mode"] === "GetUuid") {
            postRespServeUuid(req, res);
        }
        else if(req.query["mode"] === "UploadFile" && req.query.hasOwnProperty("uuid") && req.query.hasOwnProperty("fileidx")) {
            postRespUploadFile(req, res, req.query["uuid"], req.query["fileidx"]);
        }
        else if(req.query["mode"]=== "MergePdfs"){
            postRespMergePdfs(req, res, req.query["uuid"]);
        }
        // request from the upload web app (see ./apps/MultiColumnAnalyzer).
        else if(req.query["mode"]=== "UploadDocLayout" && req.query.hasOwnProperty("uuid") ){
            postRespUploadDocLayout(req, res, req.query["uuid"]);
        }
    }
    else{
        js_utils.PostResp(res, req, 500, "Invalid Post Mode");
    }
};

/**
 * upload intro.mp4 video
 *
 * TODO: update directory to intro.mp4; test and refactor
 */
exports.upload_intro_video = function() {
    console.log("DEBUG: upload intro video");
    return new Promise(
        function(resolve, reject){
            azure.svc.createBlockBlobFromLocalFile(
                'data',
                'video/intro.mp4',
                path.join(__dirname, 'cache') + '/intro.mp4',
                function(err, result){
                    if(err){
                        reject(err);
                    }
                    else{
                        resolve(result);
                    }
                }
            );
        }
    );
};

/**
 * The first action of the upload handshake. Create a pdfs/{uuid} folder for this upload transaction.
 * @param req
 * @param res
 */
function postRespServeUuid(req, res) {
    console.log("DEBUG: upload.js postRespServeUuid");
    var myuuid = uuid.v1();
    console.log("DEBUG: myuuid="+myuuid);
    Promise.denodeify(mkdirp)(env.path.temp_pdfs + '/' + myuuid).then(
        function(){
            js_utils.PostResp(res, req, 200, myuuid);
        }
    ).catch(
        function(err) {
            js_utils.PostResp(res, req, 500, err);
        }
    );
}

var requestPostPromise = function(params){
    return new Promise(function(resolve, reject){
        request.post(
            params,
            function(err,httpResponse,body){
                if(err){
                    reject(err);
                }
                else{
                    resolve({httpResponse: httpResponse, body: body});
                }
            }
        );
    });
};

/**
 * Save the pdf files under the /pdfs/{myuuid} directory, with the filename {fileidx}.PDF
 * @param req
 * @param res
 * @param myuuid
 * @param fileidx
 * @constructor
 */
function postRespUploadFile(req, res, myuuid, fileidx) {
    new Promise(function(resolve, reject){
        formidable.IncomingForm().parse(req, function(err, fields, files){
            if(err){reject(err);}
            else{
                if(files.file.type != 'application/pdf'){
                    reject("File type should be PDF");
                }
                else{
                    resolve(files);
                }
            }
        });
    }).then(
        function (files) {
            var filepath = myuuid + '/' + fileidx+".pdf";
            console.log("DEBUG: upload.js postRespUploadFile");
            console.log("DEBUG: filepath="+filepath);
            return Promise.denodeify(js_utils.CopyFile)(files.file.path, env.path.temp_pdfs + '/' + filepath).then(
                function(){
                    return filepath;
                }
            );
        }
    ).then(
        function(data){
            js_utils.PostResp(res, req, 200, data);
        }
    ).catch(
        function(err){
            js_utils.PostResp(res, req, 500, err);
        }
    );
}

/**
 * Let MuPla server know that there's no more PDF file to send.
 * The MuPla server merges all the uploaded .PDF files into '/{myuuid}/merged.pdf', and
 * extracts bounding boxes from the merged.pdf into merged.js.
 * @param req
 * @param res
 * @param myuuid
 * @constructor
 */
function postRespMergePdfs(req, res, myuuid) {
    requestPostPromise(
        {url:MUPLA_SERVER_LOCAL_URL, form:{mode:"MergePdfs",uuid:myuuid}}
    ).then(
        function(resp){
            if(resp.body === "succeed"){
                return resp.body;
            }
            else{
                throw new Error(resp.body);
            }
        }
    ).catch(
        function(){
            muPlaServerDownEmailAlert(myuuid);
            var err = new Error("Internal Server Error: MuPla-Server Connection Failed");
            err.push_msg = true;
            throw err;
        }
    ).then(
        function(){
            js_utils.PostResp(res, req, 200);
        }
    ).catch(
        function(err){
            js_utils.PostResp(res, req, 500, err);
        }
    );
}

/**
 * When MuPla server is down, send an alert mail to the system manager.
 * @param filepath
 * @returns {*}
 */
var muPlaServerDownEmailAlert = function(myuuid){
    return js_utils.Email(
        "RichReviewAlert ✔ <azureuser@richreview.net>",
        "dy252@cornell.edu",
        "RichReviewWebApp MuPlaServer Down Alert",
        "myuuid: "+myuuid,
        ""
    ).catch(
        function(err){
            console.log("MuPlaServerDown Alert failed: " + JSON.stringify(err));
        }
    );
};

/**
 * Response to POST - receive the TextTearing layout data of merged.pdf, and upload them to Azure Blob DB
 * @param req
 * @param res
 * @param myuuid
 *
 * TODO: new uploads are not being uploaded to Azure Blob storage
 */
function postRespUploadDocLayout(req, res, myuuid) {

    var ctx = {
        myuuid: myuuid,
        user: req.user
    };
    return Post_UploadDocLayout_ReceiveVsDoc(req, ctx)
        .then(Post_UploadDocLayout_CreateAzureBlob_PDF)
        .then(Post_UploadDocLayout_CreateAzureBlob_VsDoc)
        .then(Post_UploadDocLayout_CreateDocAndGroupDb)
        .then(function(_ctx) {
            var redirect_url = process.env.HOST_URL +
                "/viewer?access_code="+_ctx.pdf_hash +
                "&docid=" + _ctx.docid.substring(4) +
                "&groupid=" + _ctx.groupid.substring(4);
            js_utils.PostResp(res, req, 200, redirect_url);
        }).catch(function(err) {
            js_utils.PostResp(res, req, 500, err);
        });
}

function Post_UploadDocLayout_ReceiveVsDoc(req, ctx){
    console.log("DEBUG: upload.js Post_UploadDocLayout_ReceiveVsDoc");
    return new Promise(function (resolve, reject) {
        var buf = '';
        req.on('data', function (data) {
            // Append data.
            buf += data;
        });

        req.on('end', function () {
            ctx.doclayout = JSON.parse(buf);
            resolve(ctx);
        });

        req.on('error',function(err){
            reject(err);
        });
    });
}

function Post_UploadDocLayout_CreateAzureBlob_PDF(_ctx){
    var pdf_path = env.path.temp_pdfs + "/"+_ctx.myuuid+"/merged.pdf";
    console.log("DEBUG: upload.js Post_UploadDocLayout_CreateAzureBlob_PDF");
    console.log("DEBUG: pdf_path="+pdf_path);
    /*
    // TODO: test and delete commented code
    return Promise.denodeify(fs.readFile)(pdf_path, "binary")
        .then(function(pdf_str){

            console.log("DEBUG: upload.js Post_UploadDocLayout_CreateAzureBlob_PDF CHECKPOINT");

            var shasum = crypto.createHash('sha1');
            shasum.update(pdf_str);
            _ctx.pdf_hash = shasum.digest('hex').toLowerCase();

            var ctx = {
                container: _ctx.pdf_hash,
                blob: "doc.pdf",
                blob_localfile_path:pdf_path
            };

            console.log("DEBUG: "+ JSON.stringify(ctx));

            return azure.CreateContainerIfNotExist(ctx).then(
                azure.DoesBlobExist
            ).then(
                azure.CreateBlobFromLocalFile
            ).then(
                function(){
                    return _ctx;
                }
            );
        }
    );
    */
    return Promise.denodeify(fs.readFile)(pdf_path, "binary")
        .then(function(pdf_str) {

            console.log("DEBUG: upload.js Post_UploadDocLayout_CreateAzureBlob_PDF CHECKPOINT");

            var shasum = crypto.createHash('sha1');
            shasum.update(pdf_str);
            _ctx.pdf_hash = shasum.digest('hex').toLowerCase();

            var ctx = {
                container: _ctx.pdf_hash,
                blob: "doc.pdf",
                blob_localfile_path: pdf_path
            };

            // console.log("DEBUG: " + JSON.stringify(ctx));
            return ctx;
        }).then(azure.CreateContainerIfNotExist)
        .then(azure.CreateBlobFromLocalFile)
        .then(function(ctx) {
            return _ctx; //
        }).catch(function(err) {
            console.log("ERR: in upload Post_UploadDocLayout_CreateAzureBlob_PDF");
            console.log("ERR: "+err);
            return Promise.reject(err);
        });
}

function Post_UploadDocLayout_CreateAzureBlob_VsDoc(_ctx){
    console.log("DEBUG: upload.js Post_UploadDocLayout_CreateAzureBlob_VsDoc");
    // console.log("DEBUG: " + JSON.stringify(_ctx));
    return new Promise(function (resolve, reject) {
        azure.svc.createBlockBlobFromText(_ctx.pdf_hash, "doc.vs_doc", JSON.stringify(_ctx.doclayout), function(err, resp){
            if(err){
                reject(err);
            }
            else{
                resolve(_ctx);
            }
        });
    });
}

function Post_UploadDocLayout_CreateDocAndGroupDb(_ctx){
    console.log("DEBUG: upload.js Post_UploadDocLayout_CreateDocAndGroupDb");
    return new Promise(function (resolve, reject) {
        R2D.Doc.CreateNew(
            _ctx.user.id,
            (new Date()).getTime(),
            _ctx.pdf_hash
        ).then(
            function(docid){
                _ctx.docid = docid;
                return R2D.Doc.AddNewGroup(_ctx.user.id, _ctx.docid);
            }
        ).then(
            function(groupid){
                _ctx.groupid = groupid;
                resolve(_ctx);
            }
        ).catch(reject);
    });
}

