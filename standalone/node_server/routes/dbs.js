/**
 * Created by Dongwook on 2/3/2015.
 */


var js_utils = require("../lib/js_utils.js");
var R2D = require("../lib/r2d.js");
var azure = require('../lib/azure');

var GetCurUserData = function(req, res, cb){
    if(req.user) {
        R2D.User.prototype.findById(req.user.id).then(
            function(user_obj){
                cb(null, user_obj);
            }
        ).catch(
            cb
        );
    }
    else{
        cb(null, null);
    }
};

var GetUserData_ReUse = function(req, res, cb){
    var groupid = req.body.groupid;

    GetCurUserData(req, res, function(err, curUserObj){
        if(err){cb(err, null);}
        else{
            R2D.Group.GetById(groupid, function(err, groupObj){
                if(groupObj){
                    var groupUsers = [];
                    var job_getUserData = function(i){
                        if(i!=groupObj.users.participating.length){
                            R2D.User.prototype.findById(groupObj.users.participating[i], function(err, userObj){
                                if(err){cb(err, null);}
                                else{
                                    groupUsers.push(userObj);
                                    job_getUserData(i+1);
                                }
                            });
                        }
                        else{
                            var resp = {self:curUserObj, users:groupUsers, group:groupObj};
                            cb(null, resp);
                        }
                    };
                    job_getUserData(0);
                }
                else{
                    var resp = {self:curUserObj, users:null, group:null};
                    cb(null, resp);
                }
            });
        }

    });
};


var GetUserData = function(req, res){
    GetUserData_ReUse(req, res, function(err, resp){
        if(err){
            js_utils.PostResp(res, req, 500);
        }
        else{
            js_utils.PostResp(res, req, 200, resp);
        }
    });
};


var MyDoc_AddNewGroup = function(req, res){
    R2D.Doc.AddNewGroup(req.user.id, req.body.docid).then(
        function(groupid){
            js_utils.PostResp(res, req, 200, groupid);
        }
    ).catch(
        function(err){
            js_utils.PostResp(res, req, 500, err);
        }
    );
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
    if( typeof req.user == "undefined" ||
        typeof req.body.docid_n == "undefined" ||
        typeof req.body.groupid_n == "undefined"){
        js_utils.PostResp(res, req, 500);
    }
    else{
        R2D.Group.DeleteGroup(req.body.groupid_n, req.body.docid_n).then(
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

var DeleteDocument = function(req, res){
    if( typeof req.user == "undefined" ||
        typeof req.body.docid_n == "undefined"){

        js_utils.PostResp(res, req, 500);
    }
    else{
        var job = function(group_id){
            return R2D.Group.DeleteGroup(group_id.substring(4), req.body.docid_n);
        };

        R2D.Doc.GetDocGroups(req.body.docid_n).then(
            function(groups){
                return js_utils.PromiseLoop(job, groups.map(function(group){return [group];}));
            }
        ).then(
            function(){
                return R2D.Doc.DeleteDocFromRedis(req.body.docid_n);
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

var AddMyselfToGroup = function(req, res){
    if( typeof req.user == "undefined" ||
        typeof req.body.groupcode == "undefined"){
        js_utils.PostResp(res, req, 500);
    }
    else{
        R2D.Group.AddUserToGroup(req.body.groupcode, req.user.id).then(
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
    if( typeof req.body.userid_n == "undefined" ||
        typeof req.body.groupid == "undefined"){
        js_utils.PostResp(res, req, 500);
    }
    else{
        var groupid_n = req.body.groupid.substring(4);
        var userid_n = req.body.userid_n;

        R2D.User.prototype.RemoveGroupFromUser(userid_n, groupid_n).then(
            function(){
                return R2D.Group.RemoveUserFromGroup(groupid_n, userid_n);
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

var DownloadCmds_GroupMemberUpdate = function(req, res, groupid_n, cur_members_n, cb){
    if(cur_members_n == -1){
        cb(null, null); // waiting for initialization
    }
    else{
        R2D.Group.GetNumUsers("grp:"+groupid_n, function(err, users_n){
            if(err){cb(err);}
            else{
                if(cur_members_n == users_n){
                    cb(null, null);
                }
                else{
                    GetUserData_ReUse(req, res, function(err, resp){
                        if(err){cb(err, null);}
                        else{
                            cb(err, resp);
                        }
                    });
                }
            }
        });
    }
};

var DownloadCmds = function(req, res){
    var cmds_downloaded_n = req.body.cmds_downloaded_n;
    R2D.Cmd.GetCmds(req.body.groupid_n, cmds_downloaded_n).then(
        function(cmds){
            DownloadCmds_GroupMemberUpdate(req, res, req.body.groupid_n, req.body.cur_members_n, function(err, resp){
                if(err){
                    js_utils.PostResp(res, req, 500, {"cmds":cmds, "users":resp});
                }
                else{
                    js_utils.PostResp(res, req, 200, {"cmds":cmds, "users":resp});
                }
            });
        }
    ).catch(
        function(err){
            js_utils.PostResp(res, req, 500, err);
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
    if(req.user){
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
    else{
        var err = new Error("Please Login");
        err.push_msg = true;
        js_utils.PostResp(res, req, 500, err);
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
        case "GetUserData":
            GetUserData(req, res);
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
