/**
 * Created by Dongwook on 2/3/2015.
 */


var js_utils = require("../lib/js_utils.js");
var R2D = require("../lib/r2d.js");
var azure = require('../lib/azure');
var Promise = require("promise");
var RedisClient = require('../lib/redis_client').RedisClient;

var GetMyself = function(req, res){
    if(req.user) {
        R2D.User.prototype.findById(req.user.id).then(
            function(user_obj){
                return js_utils.PostResp(res, req, 200, user_obj);
            }
        ).catch(
            function(err){
                js_utils.PostResp(res, req, 400, err);
            }
        );
    }
    else{
        js_utils.PostResp(res, req, 200, 'User authentication failed.');
    }
};

var GetGroupData = function(req, res){
    var groupid = req.body.groupid;

    R2D.Group.GetGroupObj_Promise(groupid).then(
        function(groupObj){
            var promises = [];
            groupObj.users.participating.forEach(function(group_member){
                promises.push(R2D.User.prototype.findById(group_member));
            });
            return Promise.all(promises).then(
                function(groupMembers){
                    var resp = {users:groupMembers, invited: groupObj.users.invited ,group:groupObj};
                    js_utils.PostResp(res, req, 200, resp);
                }
            ).catch(
                function(err){
                    js_utils.PostResp(res, req, 400, err);
                }
            );
        }
    ).catch(
        function(err){
            if(groupid == 'grp:'){ // anonymous group
                var resp = {users:null, group:null};
                js_utils.PostResp(res, req, 200, resp);
            }
            else{
                js_utils.PostResp(res, req, 400, err);
            }
        }
    );
};

var GetGroupsData = function(req, res){
    var groupids = req.body.groupids;
    if(typeof groupids === 'undefined'){
        var x = 0;
    }
    var promises_grp = groupids.map(function(groupid){
        return R2D.Group.GetGroupObj_Promise(groupid).then(
            function(groupObj){
                var promises = [];
                groupObj.users.participating.forEach(function(group_member){
                    promises.push(R2D.User.prototype.findById(group_member));
                });
                return Promise.all(promises).then(
                    function(groupMembers){
                        return {users:groupMembers, invited: groupObj.users.invited ,group:groupObj};
                    }
                )
            }
        )
    });
    Promise.all(promises_grp).then(
        function(resp){
            js_utils.PostResp(res, req, 200, resp);
        }
    ).catch(
        function(err){
            js_utils.PostResp(res, req, 400, err);
        }
    );
};

var GetDocsOwned = function(req, res){
    if(js_utils.identifyUser(req, res)){
        R2D.Doc.GetDocIdsByUser(req.user.id).then(
            function(docids){
                js_utils.PostResp(res, req, 200, docids);
            }
        ).catch(
            function(err){
                js_utils.PostResp(res, req, 400, err);
            }
        )
    }
};

var GetDocsParticipated = function(req, res){
    if(js_utils.identifyUser(req, res)){
        R2D.User.prototype.GetGroupNs(req.user.id).then(
            function(groupNs){
                var promises = [];
                groupNs.forEach(
                    function(group_id){
                        promises.push(R2D.Group.GetDocIdByGroupId(group_id));
                    }
                );
                return Promise.all(promises).then(
                    function(docids){
                        var docids_unique = []; // list to remove potential duplicates
                        docids.forEach(function(docid){
                            if(docids_unique.indexOf(docid)===-1){
                                docids_unique.push(docid);
                            }
                        });
                        js_utils.PostResp(res, req, 200, docids_unique);
                        return docids_unique;
                    }
                )
            }
        ).catch(
            function(err){
                js_utils.PostResp(res, req, 400, err);
            }
        );
    }
};

var GetDocByIds = function(req, res){
    if(js_utils.identifyUser(req, res)){
        var promise = req.body.docids.map(
            function(docid){
                return R2D.Doc.GetDocById_Promise(docid);
            }
        );
        Promise.all(promise).then(
            function(resp){
                js_utils.PostResp(res, req, 200, resp);
            }
        ).catch(
            function(err){
                js_utils.PostResp(res, req, 400, err);
            }
        )
    }
};

var GetDocById = function(req, res){
    if(js_utils.identifyUser(req, res)){
        R2D.Doc.GetDocById_Promise(req.body.docid).then(
            function(doc_obj){
                js_utils.PostResp(res, req, 200, doc_obj);
            }
        ).catch(
            function(err){
                js_utils.PostResp(res, req, 400, err);
            }
        )
    }
};

/**
 *
 * TODO: automatically add user to group he created
 */
var AddNewGroup = function(req, res){
    if(js_utils.identifyUser(req, res)){
        R2D.Doc.GetDocById_Promise(req.body.docid).then(
            function(doc){
                if(doc.userid_n === req.user.id){
                    return R2D.Doc.AddNewGroup(req.user.id, req.body.docid).then(
                        function(groupid){
                            js_utils.PostResp(res, req, 200, groupid);
                        }
                    );
                }
                else{
                    js_utils.PostResp(res, req, 400, 'you are not authorized to add a new group to this document.');
                }
            }
        ).catch(
            function(err){
                js_utils.PostResp(res, req, 400, err);
            }
        )
    }
};

var AddNewGroupAdvanced = function(req, res){
    if(js_utils.identifyUser(req, res)){
        let d;
        let user_students = [];
        let user_instructors = [];
        new Promise(function(resolve, reject){ // check if all id exists
            d = JSON.parse(req.body.d_str);
            if(!(Array.isArray(d.instructors) && Array.isArray(d.students))) {
                throw "invalid format";
            }
            Promise.all(
                d.instructors.concat(d.students).map((item)=>{
                    return R2D.User.prototype.findByEmail(item);
                })
            ).then((results) => {
                if(results.every(function(item){return item !== null;})){
                    results.forEach((result) => {
                        if(d.instructors.includes(result.email)){
                            user_instructors.push(result.id);
                        }
                        else{
                            user_students.push(result.id);
                        }                         
                    });
                    resolve();
                }
                else{
                    reject("Invalid format");
                }
            }).catch(() => {
                reject("Invalid format");
            })
        }).then(function(){
            return R2D.Doc.GetDocById_Promise(req.body.docid);
        }).then(function(doc){
            if(doc.userid_n !== req.user.id) {
                throw 'you are not authorized to add a new group to this document.';
            }
            return (function loop(i){
                if(i < user_students.length){
                    return R2D.Doc.AddNewGroup(req.user.id, req.body.docid).then(
                        function(groupid){
                            return R2D.Group.connectGroupAndMultipleUsers(
                                groupid.substring(4),
                                user_instructors.concat(user_students[i])
                            );
                        }
                    ).then(function(){
                        return loop(i+1);
                    });
                }
                else{
                    js_utils.PostResp(res, req, 200);
                }
            })(0);
        }).catch(function(err){
            js_utils.PostResp(res, req, 400, err);
        })
    }
    
};

var RenameDoc = function(req, res){
    if(typeof req.body.name == "undefined" || typeof req.body.value == "undefined"){
        js_utils.PostResp(res, req, 500);
    }
    else{
        R2D.Doc.Rename('doc:'+req.body.name.substring(9), req.body.value).then(
            function(){
                return js_utils.PostResp(res, req, 200);
            }
        ).catch(
            function(){
                js_utils.PostResp(res, req, 500);
            }
        );
    }
};

var RenameGroup = function(req, res){
    if(typeof req.body.name == "undefined" || typeof req.body.value == "undefined"){
        js_utils.PostResp(res, req, 500);
    }
    else{
        R2D.Group.Rename('grp:'+req.body.name.substring(11), req.body.value).then(
            function(){
                return js_utils.PostResp(res, req, 200);
            }
        ).catch(
            function(){
                js_utils.PostResp(res, req, 500);
            }
        );
    }
};

var DeleteGroup = function(req, res){
    if(js_utils.identifyUser(req, res)){
        R2D.Doc.GetDocById_Promise('doc:'+req.body.docid_n).then(
            function(doc){
                if(doc.userid_n === req.user.id){
                    return R2D.Group.DeleteGroup(req.body.groupid_n, req.body.docid_n).then(
                        function(){
                            js_utils.PostResp(res, req, 200);
                        }
                    )
                }
                else{
                    js_utils.PostResp(res, req, 400, 'you are not authorized to add a new group to this document.');
                }
            }
        ).catch(
            function(err){
                js_utils.PostResp(res, req, 400, err);
            }
        )
    }
};

var DeleteDocument = function(req, res){
    if(js_utils.identifyUser(req, res)){
        R2D.Doc.GetDocById_Promise('doc:'+req.body.docid_n).then(
            function(doc){
                if(doc.userid_n === req.user.id){
                    return R2D.Doc.GetDocGroups(req.body.docid_n).then(
                        function(groups){
                            return groups.map(function(group){
                                return R2D.Group.DeleteGroup(group.substring(4), req.body.docid_n);
                            });
                        }
                    ).then(
                        function(group_delete_promises){
                            return Promise.all(group_delete_promises);
                        }
                    ).then(
                        function(){
                            return R2D.Doc.DeleteDocFromRedis(req.body.docid_n);
                        }
                    ).then(
                        function(){
                            js_utils.PostResp(res, req, 200);
                        }
                    );
                }
                else{
                    js_utils.PostResp(res, req, 400, 'you are not authorized to delete this document.');
                }
            }
        ).catch(
            function(err){
                js_utils.PostResp(res, req, 400, err);
            }
        )
    }
};

var InviteUser = function(req, res){
    if(js_utils.identifyUser(req, res)){
        R2D.Doc.GetDocById_Promise('doc:'+req.body.docid_n).then(
            function(doc){
                if(doc.userid_n === req.user.id){
                    var emails = req.body.emails;
                    emails = emails.split(/[\s,]+/).map(function(x){return x.trim();});
                    var emails2 = [];
                    emails.forEach(function(email){
                        if(email !== ''){
                            emails2.push(email);
                        }
                    });

                    emails2.forEach(function(email){
                        if(!js_utils.validateEmail(email)){
                            throw '\'' + email + '\' is an invalid email address. please use either of @gmail.com or @cornell.edu.';
                        }
                    });

                    return js_utils.serialPromiseFuncs(
                        emails2.map(function(email){
                            return function() {
                                return R2D.Group.InviteUser(req.body.groupid_n, email);
                            };
                        })
                    ).then(
                        function(){
                            js_utils.PostResp(res, req, 200);
                        }
                    );
                }
                else{
                    throw 'you are not authorized to invite a user to this group.';
                }
            }
        ).catch(
            function(err){
                js_utils.PostResp(res, req, 400, err);
            }
        )
    }
};

var CancelInvited = function(req, res){
    if(js_utils.identifyUser(req, res)){
        R2D.Group.GetDocObjByGroupId(req.body.groupid_n).then(
            function(doc){
                if(doc.userid_n === req.user.id){
                    return R2D.Group.CancelInvited(req.body.groupid_n, req.body.email).then(
                        function(){
                            js_utils.PostResp(res, req, 200);
                        }
                    );
                }
                else{
                    js_utils.PostResp(res, req, 400, 'you are not authorized to un-invite the user in this group.');
                }
            }
        ).catch(
            function(err){
                js_utils.PostResp(res, req, 400, err);
            }
        )
    }
};

var RemoveGroupMember = function(req, res){
    if(js_utils.identifyUser(req, res)){
        var groupid_n = typeof req.body.groupid === 'string' ? req.body.groupid.substring(4) : '';
        var userid_n = req.body.userid_n;

        R2D.Group.GetDocObjByGroupId(groupid_n).then(
            function(doc){
                if(doc.userid_n === req.user.id){
                    return R2D.Group.RemoveUserFromGroup(groupid_n, userid_n).then(
                        function(){
                            return R2D.User.prototype.RemoveGroupFromUser(userid_n, groupid_n);
                        }
                    ).then(
                        function(){
                            js_utils.PostResp(res, req, 200);
                        }
                    )
                }
                else{
                    js_utils.PostResp(res, req, 400, 'you are not authorized to remove a member of this group.');
                }
            }
        ).catch(
            function(err){
                js_utils.PostResp(res, req, 400, err);
            }
        )
    }
};

var UploadCmd = function(req, res){
    R2D.Cmd.AppendCmd(req.body.groupid_n, req.body.cmd, function(err){
        if(err){
            js_utils.PostResp(res, req, 500);
        }
        else{
             js_utils.PostResp(res, req, 200);
        }
    });
};

var DownloadCmds_GroupMemberUpdate = function(req, res, groupid_n, cur_members_n){
    return new Promise(function(resolve, reject){
        if(cur_members_n == -1){ // not initialized yet
            resolve(null);
        }
        else{
            R2D.Group.GetNumUsers("grp:"+groupid_n, function(err, users_n){
                if(err){reject(err);}
                else{
                    if(cur_members_n == users_n){
                        resolve(null); // don't have to update
                    }
                    else{ // needs update
                        return GetGroupData(req, res);
                    }
                }
            });
        }
    });
};

var DownloadCmds = function(req, res){
    var cmds_downloaded_n = req.body.cmds_downloaded_n;
    var resp = {};
    R2D.Cmd.GetCmds(req.body.groupid_n, cmds_downloaded_n).then(
        function(cmds){
            resp.cmds = cmds;
        }
    ).then(
        function(){
            return DownloadCmds_GroupMemberUpdate(req, res, req.body.groupid_n, req.body.cur_members_n);
        }
    ).then(
        function(group_update){
            resp.group_update = group_update;
            return js_utils.PostResp(res, req, 200, resp);
        }
    ).catch(
        function(err){
            js_utils.PostResp(res, req, 400, err);
        }
    );
};

var GetDocGroups = function(req, res){
    R2D.Doc.GetDocById_Promise(req.body.docid).then(function(doc_obj){
        js_utils.PostResp(res, req, 200, doc_obj);
    }).catch(function(err){
        js_utils.PostResp(res, req, 500);
    });
};

var WebAppLogs = function(req, res){
    console.log(req.body.logs);
    R2D.Logs(req.body.group_n, req.body.logs)
        .then(function() {
            js_utils.PostResp(res, req, 200);
        })
        .catch(function(err){
            js_utils.PostResp(res, req, 500, err);

        });
};

var WebAppLog = function(req, res){
    R2D.Log(req.body.group_n, req.body.log, function(err){
        if(err){
            js_utils.PostResp(res, req, 500, err);
        }
        else{
            js_utils.PostResp(res, req, 200);
        }
    });
};

var isDocCourseSubmission = function(req, res){
    RedisClient.HGETALL('doc:'+req.body.docid).then(
        function(doc){
            if(doc !== null &&
                    doc.crs_submission &&
                doc.crs_submission !== 'undefined' &&
                JSON.parse(doc.crs_submission).course_id === req.body.course_id){
                js_utils.PostResp(res, req, 200, {resp:true});
            }
            else{
                js_utils.PostResp(res, req, 200, {resp:false});
            }
        }
    ).catch(
        function(err){
            js_utils.PostResp(res, req, 400, err);
        }
    )
};

var GetUploadSas = function(req, res){
    if(req.user){
        var filename = "audio/"+req.body.fname+".wav";
        filename = filename.replace(":", "_");
        var sas = azure.getSas('data', filename, 300);// 5 minutes
        js_utils.PostResp(res, req, 200, {sas: sas, url: azure.BLOB_HOST+'data/'+filename});
        return null;
    }
    else{
        js_utils.PostResp(res, req, 400, 'Invalid user identity');
    }
};

var GetRrrUploadSas = function(req, res){
    var filename = "audio/"+req.body.fname+".wav";
    filename = filename.replace(":", "_");
    var sas = azure.getSas('data', filename, 300);// 5 minutes
    js_utils.PostResp(res, req, 200, {sas: sas, url: azure.BLOB_HOST+'data/'+filename});
    return null;
};

var GetRrrDatabase = function(req, res){
    azure.ListBlobsWithPrefix('data', 'audio/rrr_')
        .then(function(resp){
            js_utils.PostResp(res, req, 200, resp);
        })
        .catch(function(err){
            js_utils.PostResp(res, req, 400, err);
        })
};

var UploadRrrJson = function(req, res){
    RedisClient.RPUSH('rrr_json', typeof req.body.json === 'string' ? req.body.json : JSON.stringify(req.body.json))
        .then(function(){
            js_utils.PostResp(res, req, 200);
        })
        .catch(function(err){
            js_utils.PostResp(res.req, 400, err);
        })
};

var GetRrrJson = function(req, res){
    "use strict";
    RedisClient.LRANGE('rrr_json', 0, -1)
        .then(function(resp){
            js_utils.PostResp(res, req, 200, resp);
        })
        .catch(function(err){
            js_utils.PostResp(res.req, 400, err);
        });
};

exports.post = function(req, res){
    switch(req.query['op']){
        case "GetMyself":
            GetMyself(req, res);
            break;
        case "GetGroupData":
            GetGroupData(req, res);
            break;
        case "GetGroupsData":
            GetGroupsData(req, res);
            break;
        case "GetDocsOwned":
            GetDocsOwned(req, res);
            break;
        case "GetDocByIds":
            GetDocByIds(req, res);
            break;
        case "GetDocById":
            GetDocById(req, res);
            break;
        case "GetDocsParticipated":
            GetDocsParticipated(req, res);
            break;
        case "AddNewGroup":
            AddNewGroup(req, res);
            break;
        case "AddNewGroupAdvanced":
            AddNewGroupAdvanced(req, res);
            break;
        case "RenameDoc":
            RenameDoc(req, res);
            break;
        case "RenameGroup":
            RenameGroup(req, res);
            break;
        case "DeleteGroup":
            DeleteGroup(req, res);
            break;
        case "DeleteDocument":
            DeleteDocument(req, res);
            break;
        case "InviteUser":
            InviteUser(req, res);
            break;
        case 'CancelInvited':
            CancelInvited(req, res);
            break;
        case "RemoveGroupMember":
            RemoveGroupMember(req, res);
            break;
        case "UploadCmd":
            UploadCmd(req, res);
            break;
        case "DownloadCmds":
            DownloadCmds(req, res);
            break;
        case "GetDocGroups":
            GetDocGroups(req, res);
            break;
        case "WebAppLogs":
            WebAppLogs(req, res);
            break;
        case "WebAppLog":
            WebAppLog(req, res);
            break;
        case "isDocCourseSubmission":
            isDocCourseSubmission(req, res);
            break;
        case "GetUploadSas":
            GetUploadSas(req, res);
            break;
        case "GetRrrUploadSas":
            GetRrrUploadSas(req, res);
            break;
        case "GetRrrDatabase":
            GetRrrDatabase(req, res);
            break;
        case "UploadRrrJson":
            UploadRrrJson(req, res);
            break;
        case "GetRrrJson":
            GetRrrJson(req, res);
            break;
        default:
            js_utils.PostResp(res, req, 500, "Unidentified request: "+req.query['op']);
            break;
    }
};
