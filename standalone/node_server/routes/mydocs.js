/**
 * Created by yoon on 2/1/15.
 */

var js_error = require("../lib/js_error");
var R2D = require("../lib/r2d.js");
var azure = require("../lib/azure");
var js_utils = require("../lib/js_utils");
var Promise = require("promise");

var PopulateDocGroupObjs = function(docObj){
    function job(groupid) {
        return R2D.Group.GetGroupObj_Promise(groupid).then(
            R2D.Group.PopulateParticipantObjs
        ).then(
            function(groupObj){
                return groupObj;
            }
        );
    }

    return js_utils.PromiseLoop(job, docObj.groups.map(function(groupid){return [groupid]})).then(
        function(groupObjs){
            docObj.groupsObj = groupObjs;
            return docObj;
        }
    );
};

var GetDocs = function(userid){
    return R2D.Doc.GetDocByUser_Promise(userid).then(
        function(docObjs){
            return js_utils.PromiseLoop(PopulateDocGroupObjs, docObjs.map(function(doc_obj){return [doc_obj];})).then(
                function(docObjs){
                    return docObjs;
                }
            );
        }
    )
};

var IsDocExist = function(docObjs, docid){
    for(var i = 0; i < docObjs.length; ++i){
        if(docid == docObjs[i].id){
            return true;
        }
    }
    return false;
};

var GetDocsParticipating = function(req, res, docObjs, cb){
    if(req.user){
        var docsParticipating = [];
        R2D.User.prototype.GetGroupNs(req.user.id, function(err, groupNs){
            var job = function(i){
                if(i == groupNs.length){
                    cb(null, docsParticipating);
                }
                else{
                    R2D.Group.GetDocIdByGroupId(groupNs[i], function(err, docid){
                        if(err){cb(err)}
                        else{
                            if(!IsDocExist(docsParticipating, docid) && !IsDocExist(docObjs, docid)){
                                R2D.Doc.GetDocById_Promise(docid).then(
                                    PopulateDocGroupObjs
                                ).then(
                                    function(doc_obj){
                                        docsParticipating.push(doc_obj);
                                        job(i+1);
                                        }
                                ).catch(cb);
                            }
                            else{
                                job(i+1);
                            }
                        }
                    });
                }
            };
            job(0);

        })
    }
    else{
        cb(null, []);
    }
};

exports.get = function (req, res) {
    req.session.latestUrl = req.originalUrl;
    if(req.user){
        GetDocs(req.user.id).then(
            function(docObjs) {
                return new Promise(function(resolve, reject){
                    GetDocsParticipating(req, res, docObjs, function (err, docsParticipating) {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve({docObjs:docObjs, docsParticipating:docsParticipating});
                        }
                    });
                });
            }
        ).then(
            function(result){
                var docObjs = result.docObjs;
                var docsParticipating = result.docsParticipating;
                docObjs.sort(function(a, b){
                    var keyA = a.creationTime,
                        keyB = b.creationTime;
                    if(keyA < keyB) return 1;
                    if(keyA > keyB) return -1;
                    return 0;
                });
                docObjs.forEach(function(docObj){
                    docObj.groupsObj.forEach(function(group){
                        group.mygroup = false;
                        group.users.participating.forEach(function(user){
                            if(user.id == req.user.id){
                                group.mygroup = true;
                            }
                        });
                    });
                });

                docsParticipating.sort(function(a, b){
                    var keyA = a.creationTime,
                        keyB = b.creationTime;
                    if(keyA < keyB) return 1;
                    if(keyA > keyB) return -1;
                    return 0;
                });
                docsParticipating.forEach(function(docObj){
                    docObj.groupsObj.forEach(function(group){
                        group.mygroup = false;
                        group.users.participating.forEach(function(user){
                            if(user.id == req.user.id){
                                group.mygroup = true;
                            }
                        });
                    });
                });

                res.render('mydocs_doc', {
                    cur_page: 'MyDocs',
                    BLOB_HOST: azure.BLOB_HOST,
                    HOST: js_utils.getHostname() + "/",
                    user: req.user,
                    docs: docObjs,
                    docsp: docsParticipating});
            }
        ).catch(
            function(err){
                js_error.HandleError('MyDocs', err, res);
            }
        );
    }
    else{
        res.redirect('/login');
    }
};