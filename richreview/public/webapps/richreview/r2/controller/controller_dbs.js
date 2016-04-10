/**
 * Created by yoon on 12/21/14.
 */

var r2Sync = (function(){
    "use strict";

    var pub = {};

    var cmd_upload_q = [];
    var cmds_downloaded_n = 0;
    var last_downloaded_time = 0;

    var now_uploading_cmd = false;
    var now_downloading_cmd = false;
    var cmd_to_upload = null;
    var cmds_my_own = {};

    pub.loop = function(){
        if(cmd_upload_q.length > 0 && !now_uploading_cmd){
            if(r2.userGroup.cur_user.isguest){
                cmd_upload_q = []; // refresh
            }
            else{
                uploadAndConsumeCmds();
            }
        }
        if(r2App.cur_time - last_downloaded_time > r2Const.DB_SYNC_POLLING_INTERVAL){ // 5sec
            pub.DownloadCmds();
            last_downloaded_time = r2App.cur_time;
        }
    };

    /**
     * @returns {boolean}
     */
    pub.NowUploading = function(){
        return now_uploading_cmd || cmd_upload_q.length != 0
    };

    pub.PushToUploadCmd = function(cmd){
        cmd_upload_q.push(cmd);
        r2.commentHistory.consumeCmd(cmd);
    };

    pub.DownloadCmds = function(){
        if(now_downloading_cmd){return;}
        now_downloading_cmd = true;
        r2.util.postToDbsServer(
            "DownloadCmds",
            {
                groupid_n : r2.ctx["groupid"],
                groupid : "grp:"+r2.ctx["groupid"],
                cmds_downloaded_n : cmds_downloaded_n,
                cur_members_n : r2.userGroup.GetCurMemberUsersNum()
            }
        ).then(
            function(resp){
                if(resp.group_update){
                    r2.userGroup.Set(resp.group_update);
                }
                if(resp.cmds && resp.cmds.length !== 0){
                    return processDownloadedCmds(resp.cmds);
                }
                return null;
            }
        ).then(
            function(){
                now_downloading_cmd = false;
            }
        ).catch(
            function(err){
                r2App.asyncErr.throw(err);
            }
        );
    };

    var uploadCmd = function(cmdObj){
        return r2.util.postToDbsServer(
            "UploadCmd",
            {
                groupid_n: r2.ctx["groupid"],
                cmd: JSON.stringify(cmdObj)
            }
        );
    };

    var uploadAudioBlob = function(annot){
        return new Promise(function(resolve, reject){
            var blob = annot.GetRecordingAudioBlob();
            var reader = new FileReader();
            reader.onload = function(event){
                var data = {};
                data["fname"] = annot.GetUsername()+"_"+annot.GetId();
                data["data"] = event.target.result;
                var progressCb = function (event) {
                    if (event.lengthComputable) {
                        $( "#main_progress_bar" ).progressbar({
                            value: 100.0*event.loaded/event.total
                        });
                    }
                };
                r2.util.ajaxPostTextData(
                    data,
                    progressCb
                ).then(
                    function(blob_url){
                        resolve(r2App.file_storage_url+"data/"+blob_url);
                    }
                ).catch(reject);
            };
            reader.readAsDataURL(blob);
        });
    };

    var uploadAudioBlobIfNeeded = function(){
        return new Promise(function(resolve, reject){
                if(cmd_to_upload.op === 'CreateComment' && cmd_to_upload.type === "CommentAudio"){
                    uploadAudioBlob(r2App.annots[cmd_to_upload.data.aid]).then(
                        function(url){
                            cmd_to_upload.data.audiofileurl = url;
                            resolve();
                        }
                    ).catch(
                        function(err){
                            reject(err);
                        }
                    );
                }
                else{
                    resolve();
                }
            });
    };

    var uploadAndConsumeCmds = function(){
        $("#uploading_indicator").toggleClass("show", true);
        now_uploading_cmd = true;
        cmd_to_upload = cmd_upload_q.shift();

        uploadAudioBlobIfNeeded(cmd_to_upload).then(
            function(){
                return uploadCmd(cmd_to_upload);
            }
        ).then(
            function(){
                cmds_my_own[cmd_to_upload.user+"_"+cmd_to_upload.time] = true;
                $("#uploading_indicator").toggleClass("show", false);
                now_uploading_cmd = false;
                cmd_to_upload = null;
            }
        ).catch(
            function(){
                cmd_upload_q.unshift(cmd_to_upload);
                now_uploading_cmd = false;
                cmd_to_upload = null;
            }
        );
    };

    var processDownloadedCmds = function(cmds){
        cmds_downloaded_n += cmds.length;
        var cmdObjs = [];
        for(var i = 0; i < cmds.length; ++i){
            cmdObjs.push(JSON.parse(cmds[i]));
        }
        cmdObjs.sort(r2.util.chronologicalSort);
        var job = function(i){
            setTimeout(function(){
                if(i != cmdObjs.length){
                    if(!((cmdObjs[i].user+"_"+cmdObjs[i].time) in cmds_my_own)){
                        if(r2.cmd.executeCmd(r2App.doc, cmdObjs[i], false)){
                            r2.commentHistory.consumeCmd(cmdObjs[i]);
                        }
                        else{
                            //console.error('error from cmd: ', JSON.stringify(cmdObjs[i]));
                        }
                        $( "#main_progress_bar" ).progressbar({
                            value: parseInt(100*(i)/(cmdObjs.length-1))
                        });
                    }
                    job(i+1);
                }
                else{
                    now_downloading_cmd = false;
                }
            }, r2Const.TIMEOUT_MINIMAL);
        };
        job(0);
    };

    return pub;
})();