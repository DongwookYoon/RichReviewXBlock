/**
 * Created by yoon on 8/5/16.
 */
var path = require('path');
var Promise = require("promise");
var R2D = require('../lib/r2d.js');
var LtiEngine = require('../lib/lti_engine.js');
var js_utils = require('../lib/js_utils.js');
var azure  = require('../lib/azure.js');

const DISCUSS_DOC_ID = '116730002901619859123_1470324240262';
const DISCUSS_PDF_ID = '34811a7b62e4461316fc5aab8f655041fc3b01bc';


function handleLtiError(req, res, err){
    var stack_str = null;
    var msg_str = null;
    if(typeof err === 'string'){
        msg_str = err;
    }
    else{
        stack_str = err.stack;
    }

    console.error('LtiError Stack:');
    if(stack_str)
        console.error(stack_str);
    if(msg_str)
        console.error(msg_str);

    if(req.method === 'POST'){
        js_utils.PostResp(res, req, 400, stack_str || msg_str);
    }
    else if(req.method === 'GET'){
        res.render(
            'lti_error',
            {
                stack_str: stack_str,
                msg_str: msg_str
            }
        );
    }
}

function assertManager(req, res){
    if(req.user instanceof R2D.User && req.user.email === 'dy252@cornell.edu'){
        return true;
    }
    else {
        handleLtiError(req, res, 'Unauthorized access. This page is available only to the system manager.');
    }
}

function assertLtiUser(req, res){
    if(req.user instanceof LtiEngine.User){
        return true;
    }
    else{
        handleLtiError(req, res, 'Unauthorized access. Please go back to the edX.org and retry.');
    }
}

exports.get_entry = function(req, res){
    if(assertLtiUser(req, res)){
        var status = req.user.status;
        if(status === 'init'){ // ask the first-time users to answer the screening survey
            res.redirect('/lti_survey');
        }
        else if(status === 'rr'){
            res.redirect('/lti_discuss_rr');
        }
        else if(status === 'bb'){
            res.redirect('/lti_discuss_bb');
        }
        else{
            handleLtiError(req, res, 'undefined status:'+status);
        }
    }
};

exports.get_failure = function(req, res){
    handleLtiError(req, res, 'Unauthorized access. Please go back to the edX.org and retry.');
};

exports.get_admin = function(req, res){
    req.session.latestUrl = req.originalUrl;
    if(req.user instanceof LtiEngine.User){
        req.logout();
    }
    if(js_utils.redirectUnknownUser(req, res) && assertManager(req, res)){
        var data = {};
        LtiEngine.UserMgr.loadAllFromDb()
            .then(function(users) {
                data.users = users;
                return LtiEngine.GroupMgrRR.loadAllFromDb();
            })
            .then(function(grps_rr){
                data.grps_rr = grps_rr;
                return LtiEngine.GroupMgrBB.loadAllFromDb();
            })
            .then(function(grps_bb){
                data.grps_bb = grps_bb;
                return null;
            })
            .then(function(){
                res.render(
                    'lti_admin',
                    {
                        data_str: encodeURIComponent(JSON.stringify(data))
                    }
                )
            })
            .catch(function(err){
                handleLtiError(req, res, err);
            });
    }
};

exports.get_survey = function(req, res){
    if(assertLtiUser(req, res)){
        var status = req.user.status;
        if (status === 'init') { // ask the first-time users to answer the screening survey
            res.sendFile('lti_survey.html', {root: path.join(__dirname, '../views')});
        }
        else{
            handleLtiError(req, res, 'Invalid user status:'+status);
        }
    }
};

exports.post_survey = function(req, res){
    if(assertLtiUser(req, res)){
        if(req.body.survey_resp)
        {
            LtiEngine.UserMgr.setAttr(
                req.user.id,
                'survey_resp',
                req.body.survey_resp,
                true // json_type
            )
                .then(function(){
                    return LtiEngine.UserMgr.setAttr(
                        req.user.id,
                        'status',
                        req.body.survey_resp.consent === 'yes' ? 'rr' : 'bb'
                    ).then(
                        function(){
                            js_utils.PostResp(res, req, 200);
                        }
                    );
                })
                .catch(
                    function(err){
                        handleLtiError(req, res, err);
                    });
        }
        else{
            handleLtiError(req, res, 'Invalid access to the survey POST service.');
        }
    }
};

exports.get_discuss_rr = function(req, res){
    if(assertLtiUser(req, res)){
        if(req.user.status === 'rr'){
            var r2_ctx = {
                pdfid: DISCUSS_PDF_ID,
                docid: DISCUSS_DOC_ID,
                groupid: "",
                pdf_url: azure.BLOB_HOST + DISCUSS_PDF_ID + "/doc.pdf",
                pdfjs_url: azure.BLOB_HOST + DISCUSS_PDF_ID + "/doc.vs_doc",
                serve_dbs_url: js_utils.getHostname() + '/lti_dbs?',
                lti: true,
                lti_data: {}
            };
            return LtiEngine.GroupMgrRR.assignUserIfNotSet(req.user)
                .then(function(grp_data) {
                    r2_ctx.lti_data.user = req.user;
                    r2_ctx.lti_data.group = grp_data;
                    r2_ctx.groupid = grp_data.id;
                    var promises = r2_ctx.lti_data.group.users.map(function (user_id) {
                        return LtiEngine.UserMgr.getById(user_id);
                    });
                    return Promise.all(promises);
                })
                .then(function(grp_users){
                    r2_ctx.lti_data.grp_users = grp_users;
                    res.render(
                        'lti_discuss_rr',
                        {
                            user: req.user,
                            r2_ctx: encodeURIComponent(JSON.stringify(r2_ctx))
                        }
                    );
                    return null;
                })
                .catch(function(err){
                    handleLtiError(req, res, err);
                });

        }
        else{
            handleLtiError(req, res, 'Invalid status :' + req.user.status);
        }
    }
};

exports.get_discuss_bb = function(req, res){
    if(assertLtiUser(req, res)){
        if(req.user.status === 'bb'){
            return LtiEngine.GroupMgrBB.assignUserIfNotSet(req.user)
                .then(function(grp_data){
                    var users = [];
                    for(var i = 0; i < grp_data.users.length; i++){
                        users.push(LtiEngine.UserMgr.getByIdSync(grp_data.users[i]));
                    }
                    var bb_ctx = {
                        user: req.user,
                        users: users,
                        group: grp_data
                    };
                    res.render(
                        'lti_discuss_bb',
                        {
                            bb_ctx: encodeURIComponent(JSON.stringify(bb_ctx))
                        }
                    );
                    return null;
                })
                .catch(function(err){
                    handleLtiError(req, res, err);
                });
        }
        else{
            handleLtiError(req, res, 'Invalid status :' + req.user.status);
        }
    }
};

function delUser(req, res){
    if(assertManager(req, res)){
        LtiEngine.UserMgr.delById(req.body.user_id).then(
            function(resp){
                js_utils.PostResp(res, req, 200);
            }
        ).catch(
            function(err){
                handleLtiError(req, res, err);
            }
        )
    }
}
function delUserAndGroupData(req, res){
    if(assertManager(req, res)){
        var LtiGroupMgr;
        LtiEngine.UserMgr.getById(req.body.user_id)
            .then(function(user){
                if(user.status === 'rr'){
                    LtiGroupMgr = LtiEngine.GroupMgrRR;
                }
                else if(user.status === 'bb'){
                    LtiGroupMgr = LtiEngine.GroupMgrBB;
                }
                else{
                    throw new Error('The user hasn\'t assigned to a group.');
                }
                return LtiGroupMgr.delUserById(req.body.user_id, user.group); // delete from the group
            })
            .then(function(user){
                return LtiEngine.UserMgr.delById(req.body.user_id).then( // delete the user
                    function(resp){
                        js_utils.PostResp(res, req, 200);
                    }
                )
            })
            .catch(function(err){
                handleLtiError(req, res, err);
            });
    }
}
function delGrp(req, res){
    if(assertManager(req, res)){
        var GrpEngine;
        if(req.body.type === 'rr'){
            GrpEngine = LtiEngine.GroupMgrRR;
        }
        else{
            GrpEngine = LtiEngine.GroupMgrBB;
        }
        GrpEngine.delById(req.body.grp_id).then(
            function(resp){
                js_utils.PostResp(res, req, 200);
            }
        ).catch(
            function(err){
                handleLtiError(req, res, err);
            }
        )
    }
}

function giveCredit(req, res){
    if(assertManager(req, res)){
        LtiEngine.UserMgr.getById(req.body.user_id)
            .then(function(user) {
                return LtiEngine.Grade.giveCredit(user);
            })
            .then(function(resp){
                js_utils.PostResp(res, req, 200);
            })
            .catch(function(err){
                handleLtiError(req, res, err);
            })
    }
}

function downloadCmds(req, res){
    if(assertLtiUser(req, res)){
        LtiEngine.CmdRR.getAfter(
            req.body.groupid_n,
            req.body.cmds_downloaded_n)
            .then(function(cmds){
                return js_utils.PostResp(res, req, 200,
                    {
                        group_update: false,
                        cmds: cmds
                    }
                );
            })
            .catch(function(err){
                js_utils.PostResp(res, req, 400, err);
            });
    }
}

function uploadCmd(req, res){
    if(assertLtiUser(req, res)){
        LtiEngine.CmdRR.pushBack(req.body.groupid_n, req.body.cmd)
            .then(function(){
                js_utils.PostResp(res, req, 200);
            })
            .catch(function(err){
                js_utils.PostResp(res, req, 500, err);
            });
    }
}

var WebAppLogs = function(req, res){
    if(assertLtiUser(req, res)) {
        LtiEngine.logs(req.body.group_n, req.body.logs)
            .then(function () {
                js_utils.PostResp(res, req, 200);
            })
            .catch(function (err) {
                js_utils.PostResp(res, req, 500, err);

            });
    }
};

exports.post_dbs = function(req, res){
    switch(req.query['op']){
        case 'del_user':
            delUser(req, res);
            break;
        case 'del_user_and_group_data':
            delUserAndGroupData(req, res);
            break;
        case 'del_grp':
            delGrp(req, res);
            break;
        case 'give_credit':
            giveCredit(req, res);
            break;
        case 'WebAppLogs':
            WebAppLogs(req, res);
            break;
        case 'DownloadCmds':
            downloadCmds(req, res);
            break;
        case 'UploadCmd':
            uploadCmd(req, res);
            break;
        default:
            handleLtiError(req, res, 'Invalid post operation : '+ req.query['op']);
            break;
    }
};

function postBbGet(req, res){
    if(assertLtiUser(req, res)) {
        var resp = {};
        LtiEngine.CmdBB.getAfter(
            req.body.groupid_n,
            0) // get all
            .then(function(cmds) {
                return js_utils.PostResp(res, req, 200, cmds);
            })
            .catch(function(err){
                js_utils.PostResp(res, req, 400, err);
            });
    }
}

function postBbCmd(req, res){
    if(assertLtiUser(req, res)) {
        req.body.cmd.time = (new Date()).getTime();
        LtiEngine.CmdBB.pushBack(req.body.groupid_n, JSON.stringify(req.body.cmd))
            .then(function(){
                js_utils.PostResp(res, req, 200);
            })
            .catch(function(err){
                js_utils.PostResp(res, req, 500, err);
            });
    }
}

// services for bbs
exports.post_bb = function(req, res){
    switch(req.query['op']){
        case 'get':
            postBbGet(req, res);
            break;
        case 'cmd':
            postBbCmd(req, res);
            break;
        default:
            handleLtiError(req, res, 'Invalid post operation : '+ req.query['op']);
            break;
    }
};
