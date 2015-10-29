/**
 * Created by Dongwook on 2/3/2015.
 */


var js_utils = require("../lib/js_utils.js");
var R2D = require("../lib/r2d.js");
var azure = require('../lib/azure');
var Promise = require("promise");

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
        js_utils.PostResp(res, req, 200, null);
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
            Promise.all(promises).then(
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


var MyDoc_AddNewGroup = function(req, res){
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

var MyDoc_RenameDoc = function(req, res){
    if(typeof req.body.name == "undefined" || typeof req.body.value == "undefined"){
        js_utils.PostResp(res, req, 500);
    }
    else{
        R2D.Doc.Rename("doc:"+req.body.name.substring(9), req.body.value, function(err){
            if(err){js_utils.PostResp(res, req, 500);}
            else {
                js_utils.PostResp(res, req, 200);
            }
        });
    }
};

var MyDoc_RenameGroup = function(req, res){
    if(typeof req.body.name == "undefined" || typeof req.body.value == "undefined"){
        js_utils.PostResp(res, req, 500);
    }
    else{
        R2D.Group.Rename("grp:"+req.body.name.substring(11), req.body.value, function(err){
            if(err){js_utils.PostResp(res, req, 500);}
            else {
                js_utils.PostResp(res, req, 200);
            }
        });
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
                    emails = emails.replace(/[\,\;]/g, ' ');
                    emails = emails.replace(/\s+/g, " ");
                    emails = emails.split(' ');

                    emails.forEach(function(email){
                        if(js_utils.validateEmail(email) === false){
                            js_utils.PostResp(res, req, 400, '\'' + email + '\' is an invalid email address. please use either of @gmail.com or @cornell.edu.');
                            return;
                        }
                    });

                    return Promise.all(
                        emails.map(function(email){
                            return R2D.Group.InviteUser(req.body.groupid_n, email);
                        })
                    ).then(
                        function(){
                            js_utils.PostResp(res, req, 200);
                        }
                    );
                }
                else{
                    js_utils.PostResp(res, req, 400, 'you are not authorized to invite a user to this group.');
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

var AddMyselfToGroup = function(req, res){
    if( typeof req.user == "undefined" ||
        typeof req.body.groupcode == "undefined"){
        js_utils.PostResp(res, req, 500);
    }
    else{
        R2D.Group.AddUserToParticipating(req.body.groupcode, req.user.id).then(
            function(){
                return R2D.User.prototype.AddGroupToUser(req.user.id, req.body.groupcode);
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

var AddNewDoc = function(req, res){
    if(js_utils.identifyUser(req, res)){
        if(req.body.pdf_id){
            var ctx = {
                container: req.body.pdf_id,
                blob: "doc.pdf"
            };

            azure.DoesBlobExist(ctx).then(
                function(ctx){
                    if(ctx.is_blob_exist){
                        return ctx;
                    }
                    else{
                        var err = new Error("Invalid Pdf Code");
                        err.push_msg = true;
                        throw err;
                    }
                }
            ).then(
                function(){
                    return R2D.Doc.CreateNew(
                        req.user.id,
                        (new Date()).getTime(),
                        req.body.pdf_id
                    )
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
        else{
            var err = new Error("Invalid Pdf Code");
            err.push_msg = true;
            js_utils.PostResp(res, req, 500, err);
        }
    }
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

exports.post = function(req, res){
    switch(req.query['op']){
        case "GetMyself":
            GetMyself(req, res);
            break;
        case "GetGroupData":
            GetGroupData(req, res);
            break;
        case "GetDocsOwned":
            GetDocsOwned(req, res);
            break;
        case "GetDocById":
            GetDocById(req, res);
            break;
        case "GetDocsParticipated":
            GetDocsParticipated(req, res);
            break;
        case "MyDoc_AddNewGroup":
            MyDoc_AddNewGroup(req, res);
            break;
        case "RenameDoc":
            MyDoc_RenameDoc(req, res);
            break;
        case "RenameGroup":
            MyDoc_RenameGroup(req, res);
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
        case "AddMyselfToGroup":
            AddMyselfToGroup(req, res);
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
        case "AddNewDoc":
            AddNewDoc(req, res);
            break;
        case "WebAppLog":
            WebAppLog(req, res);
            break;
        default:
            js_utils.PostResp(res, req, 500, "Unidentified request: "+req.query['op']);
            break;
    }
    console.log("Query DBS Post : ", req.query['op']);
};
