var js_utils = require('../lib/js_utils');
var js_error = require('../lib/js_error');
var azure = require('../lib/azure');


function RenderDocumentsPage_GetNickAndTime(res, doc_containers, error){
    var i_done = 0;
    for( var i in doc_containers){
        (function(i_closure){
            var blob_entries = doc_containers[i_closure].blobs;
            var last_uploaded = new Date(blob_entries[0].properties['last-modified']);
            doc_containers[i].last_uploaded = last_uploaded.toLocaleString();
            doc_containers[i].last_uploaded_t = last_uploaded.getTime();
            js_utils.LoadFileAsync(azure.BLOB_HOST+doc_containers[i_closure].c_id+'/nickname.txt',function(error, result){
                ++i_done;
                if(error){
                    doc_containers[i_closure].nick = 'noname';
                }
                else{
                    doc_containers[i_closure].nick = result;
                }
                if(i_done == doc_containers.length){
                    doc_containers.sort(function(a, b){
                        var keyA = new Date(a.last_uploaded),
                            keyB = new Date(b.last_uploaded);
                        if(keyA < keyB) return -1;
                        if(keyA > keyB) return 1;
                        return 0;
                    });

                    res.render('docs',
                        {
                            cur_page: 'Documents',
                            doc_containers: doc_containers,
                            BLOB_HOST: azure.BLOB_HOST,
                            HOST: js_utils.getHostname() + "/"
                    });
                }
            });
        })(i);
    }
}

function RenderDocumentsPage_GetDocContainers(res, _containers){
    var doc_containers = [];
    var containers = _containers.entries.slice(0); // copy

    var n_done = 0;
    for(var i = 0; i < containers.length; ++i){
        try {
            (function(i_closure){
                azure.svc.listBlobsSegmented(containers[i_closure].name, null,
                    function (error, result, response){
                        ++n_done;
                        if(error)
                        {
                            js_error.HandleError('listBlobsSegmented - ' + containers[i_closure].name, error);
                        }
                        else
                        {
                            doc_containers.push({c_id: containers[i_closure].name, blobs: result.entries});
                        }
                        if (n_done == containers.length) {
                            if(doc_containers.length != containers.length){
                                js_error.HandleError('listBlobsSegmented', 'missing items in listBlobsSegmented', res);
                            }
                            else
                            {
                                RenderDocumentsPage_GetNickAndTime(res, doc_containers, null);
                            }
                        }
                    }
                );
            })(i);
        }
        catch (error) {
            js_error.HandleError('RenderDocumentsPage_GetDocContainers', error, res);
        }
    }
}

function RenderDocumentsPage(res){
    azure.svc.listContainersSegmentedWithPrefix("", null, function (error, result, response) {
        if(error){js_error.HandleError('listContainersSegmentedWithPrefix', error, res);}else
        {
            RenderDocumentsPage_GetDocContainers(res, result, function (doc_containers, error) {
                if(error){js_error.HandleError('RenderDocumentsPage_GetDocContainers', error, res);}else
                {
                    RenderDocumentsPage_GetNickAndTime(res, doc_containers);
                }
            });

        }
    });
}

function CleanUpContainer(c_name, callback){
    azure.svc.listBlobsSegmented(c_name, null, function (error, blobs) {
        if (error) {
            if(error.code === 'ContainerNotFound'){
                azure.svc.createContainerIfNotExists(c_name, { publicAccessLevel : 'blob' }, function (error) {
                    if (error) {
                        console.log('CleanUpContainer - creating container failed :', c_name, error);
                        callback(error);
                    }
                    else {
                        callback(null);
                    }
                });
            }
            else{
                console.log('CleanUpContainer - listing blob failed :', error);
                callback(error);
            }
        }
        else {
            var deleted = 0;
            if(blobs.entries === 0){
                callback(null);
            }
            else{
                for (var i in blobs.entries) {
                    azure.svc.deleteBlobIfExists(c_name, blobs.entries[i].name,
                        function (error) {
                            if (error) {
                                console.log('CleanUpContainer - deleting blob failed :',  blobs.entries[i].name, error);
                                callback(error);
                            } else {
                                if (++deleted == blobs.entries.length) {
                                    callback(null);
                                }
                            }
                        }
                    );
                }
            }
        }
    });
}

function HandleUploadFromApp_DeleteContAndRespond(res, c_name){
    azure.svc.deleteContainerIfExists('temp-' + c_name, function (error) {
        if (error) {
            res.send("error while deleteContainerIfExists");
        }
        else{
            res.send("recieved");
        }
    });
}

function HandleUploadFromApp_CopyBlobs(res, c_name, blobs){
    var sent = 0;
    for (var i in blobs.entries) {
        azure.svc.startCopyBlob(azure.BLOB_HOST + 'temp-' + c_name + '/' + blobs.entries[i].name,
            c_name, blobs.entries[i].name, function (error) {
                if (error != null) {
                    console.log('copying blob failed :', error);
                    res.send("error while startCopyBlob");
                } else {
                    if (++sent == blobs.entries.length) {
                        HandleUploadFromApp_DeleteContAndRespond(res, c_name);
                    }
                    else {
                        console.log(blobs.entries[i].name);
                    }
                }
            }
        );
    }
}

function HandleUploadFromApp_ListAndCopyBlobs(res, c_name){
    azure.svc.listBlobsSegmented('temp-' + c_name, null, function (error, blobs) {
        if (error) {
            console.log('listing blob failed :', 'temp-' + c_name, error);
            res.send("error while listBlobsSegmented");
        }
        else {
            HandleUploadFromApp_CopyBlobs(res, c_name, blobs);
        }
    });
}

function HandleUploadFromApp_RefreshContainer(res, c_name){
    console.log('HandleUploadFromApp_RefreshContainer :', c_name);

    CleanUpContainer(c_name, function(error){
            if (error) {
                console.log('CleanUpContainer :', c_name, error);
                res.send("error while createContainerIfNotExists");
            }
            else {
                HandleUploadFromApp_ListAndCopyBlobs(res, c_name, HandleUploadFromApp_DeleteContAndRespond);
            }
    });
}

function HandleLogFromWebApp(res, req){
    var c_name = req.query['c'];

    var isExistCmd = "SELECT 1 from LOGS WHERE TIME = '" + req.body.time + "'";
    azure.sqlQuery(isExistCmd, function(error, result) {
        if(error || result.length==1){
            console.log('Error from azure.sqlQuery 0');
            console.log(error, '/', result);
            js_utils.PostResp(res, req, 500);
        }
        else{
            var insertCmd = "insert into LOGS values ";
            try{
                insertCmd += "('" + req.body.time + "', '" + c_name + "', '" + js_utils.escapeQuotes(req.body.log) + "' )";
                azure.sqlQuery(insertCmd, function(error, result) {
                    if(error){
                        console.log('Error from azure.sqlQuery 1');
                        console.log(error);
                        js_utils.PostResp(res, req, 500);
                    }
                    else{
                        js_utils.PostResp(res, req, 200);
                    }
                });
            }
            catch(error){
                console.log('Error from azure.sqlQuery 2');
                console.log(error);
                js_utils.PostResp(res, req, 500);
            }
        }
    });
}

function HandleCommitFromWebApp(res, req){
    var c_name = req.query['c'];

    var isExistCmd = "SELECT 1 from COMMITS WHERE TIME = '" + req.body.time + "'";
    azure.sqlQuery(isExistCmd, function(error, result) {
        if(error || result.length==1){
            js_utils.PostResp(res, req, 500);
        }
        else{
            var insertCmd = "insert into COMMITS values ";
            try{
                insertCmd += "('" + c_name + "', '" + js_utils.escapeQuotes(req.body.cmd) + "', '" + req.body.time + "' )";
                azure.sqlQuery(insertCmd, function(error, result) {
                    if(error){
                        js_utils.PostResp(res, req, 500);
                    }
                    else{
                        js_utils.PostResp(res, req, 200);
                    }
                });
            }
            catch(error){
                js_utils.PostResp(res, req, 500);
            }
        }
    });
}

function HandleDeleteCommits(res, req){
    var c_name = req.query['c'];
    var isExistCmd = "DELETE from COMMITS WHERE DOCID = '" + c_name + "'";
    azure.sqlQuery(isExistCmd, function (error, result) {
        if (error || result.length == 1) {
            js_utils.PostResp(res, req, 500);
        }
        else {
            js_utils.PostResp(res, req, 200);
        }
    });
}

function HandleGetCommits(res, req) {
    var c_name = req.query['c'];
    var isExistCmd = "SELECT * from COMMITS WHERE DOCID = '" + c_name + "'";
    azure.sqlQuery(isExistCmd, function (error, result) {
        if (error || result.length == 1) {
            js_utils.PostResp(res, req, 500);
        }
        else {
            js_utils.PostResp(res, req, 200, JSON.stringify(result));
        }
    });
}

exports.page = function (req, res) {
    switch(req.query['op']){
        case 'delete':
            azure.svc.deleteContainer(req.query['c'], function (error, result, response) {
                if (error) {
                    res.send("error while deleteContainer");
                }
                else{
                    RenderDocumentsPage(res);
                }
            });
            break;
        case 'uploadfromapp':
            HandleUploadFromApp_RefreshContainer(res, req.query['c']);
            break;
        case 'commitfromwebapp':
            HandleCommitFromWebApp(res, req);
            break;
        case 'logfromwebapp':
            HandleLogFromWebApp(res, req);
            break;
        case 'deleteCommits':
            HandleDeleteCommits(res, req);
            break;
        case 'getcommits':
            HandleGetCommits(res, req);
            break;
        case 'delete':
            break;
        default:
            RenderDocumentsPage(res);
            break;
    }
};