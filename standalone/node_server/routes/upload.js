/**
 * Created by Dongwook on 12/13/2014.
 */
var formidable = require('formidable');
var uuid = require('node-uuid');
var mkdirp = require('mkdirp');
var Promise = require("promise");
var js_utils = require('../lib/js_utils');
var env = require('../lib/env.js');
var azure = require("../lib/azure");
var request = require("request");
var crypto = require('crypto');
var fs = require('fs');
var R2D = require("../lib/r2d.js");

var MUPLA_SERVER_LOCAL_URL = "http://127.0.0.1:5000/mupla_serve/";

/**
 * Response to GET upload page. renders upload.jade.
 * @param req
 * @param res
 */
exports.page = function (req, res) {
    req.session.latestUrl = req.originalUrl;

    if(js_utils.redirectUnknownUser(req, res)){
        res.render(
            'upload',
            {
                cur_page: 'Upload',
                user: req.user,
            }
        );
    }
};

/**
 * Response to the POST requests.
 * @param req
 * @param res
 */
exports.post = function (req, res) {
    if(req.query.hasOwnProperty("mode")){
        // requests from the upload page. (see ./public/js/upload_helper.js)
        if(req.query["mode"] == "GetUuid") {
            postRespServeUuid(req, res);
        }
        else if(req.query["mode"] == "UploadFile" && req.query.hasOwnProperty("uuid") && req.query.hasOwnProperty("fileidx")) {
            postRespUploadFile(req, res, req.query["uuid"], req.query["fileidx"]);
        }
        else if(req.query["mode"]=="MergePdfs"){
            postRespMergePdfs(req, res, req.query["uuid"]);
        }
        // request from the upload web app (see ./apps/MultiColumnAnalyzer).
        else if(req.query["mode"]=="UploadDocLayout" && req.query.hasOwnProperty("uuid") ){
            postRespUploadDocLayout(req, res, req.query["uuid"]);
        }
    }
    else{
        js_utils.PostResp(res, req, 500, "Invalid Post Mode");
    }
};

/*
 upload intro.mp4 video
 */

exports.upload_intro_video = function(){
    return new Promise(
        function(resolve, reject){
            azure.svc.createBlockBlobFromLocalFile(
                'data',
                'video/intro.mp4',
                '../cache/intro.mp4',
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
    var myuuid = uuid.v1();
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
 */
function postRespUploadDocLayout(req, res, myuuid) {

    var ctx = {
        myuuid: myuuid,
        user: req.user
    };
    return Post_UploadDocLayout_ReceiveVsDoc(req, ctx).then(
        Post_UploadDocLayout_CreateAzureBlob_PDF
    ).then(
        Post_UploadDocLayout_CreateAzureBlob_VsDoc
    ).then(
        Post_UploadDocLayout_CreateDocAndGroupDb
    ).then(
        function(_ctx){
            return R2D.Group.connectUserAndGroup(_ctx.groupid.substring(4), _ctx.user.id).then(
                function(){return _ctx;}
            );
        }
    ).then(
        function(_ctx){
            var redirect_url = js_utils.getHostname() +
                "/viewer?access_code="+_ctx.pdf_hash +
                "&docid=" + _ctx.docid.substring(4) +
                "&groupid=" + _ctx.groupid.substring(4) ;
            js_utils.PostResp(res, req, 200, redirect_url);
        }
    ).catch(
        function(err){
            js_utils.PostResp(res, req, 500, err);
        }
    );
}

function Post_UploadDocLayout_ReceiveVsDoc(req, ctx){
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
    return Promise.denodeify(fs.readFile)(pdf_path, "binary").then(
        function(pdf_str){
            var shasum = crypto.createHash('sha1');
            shasum.update(pdf_str);
            _ctx.pdf_hash = shasum.digest('hex').toLowerCase();

            var ctx = {
                container: _ctx.pdf_hash,
                blob: "doc.pdf",
                blob_localfile_path:pdf_path
            };

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
}

function Post_UploadDocLayout_CreateAzureBlob_VsDoc(_ctx){
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

/*
 *  response to upload audio POST - receive the vs_doc.js of merged.pdf, and upload them to Azure Blob DB
 */

exports.post_audioblob = function(req, res){
    var data = req.body.data;
    var filename = "audio/"+req.body.fname+".wav";
    var database64 = data.substring(data.indexOf(',')+1);

    filename = filename.replace(":", "_");
    console.log("GotAudio: "+filename);


    require("fs").writeFile("../cache/"+filename, database64, 'base64', function(err) {
        if(err){
            console.log("Error1: "+filename);
            js_utils.PostResp(res, req, 500);
        }
        else{
            function job(i){
                azure.svc.createBlockBlobFromLocalFile('data', filename, "../cache/"+filename, function(err){
                    if(err){
                        if(i != 0){
                            job(i-1);
                        }
                        else{
                            console.log("Error2: "+filename);
                            js_utils.PostResp(res, req, 500);
                        }
                    }
                    else{
                        console.log("DoneAudio: "+filename);
                        js_utils.PostResp(res, req, 200, filename);
                    }
                });
            }
            job(5);
        }
    });
};