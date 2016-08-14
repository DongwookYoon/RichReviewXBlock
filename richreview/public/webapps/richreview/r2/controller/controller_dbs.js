/**
 * Created by yoon on 12/21/14.
 */

var r2Sync = (function(){
    "use strict";

    var pub = {};

    var my_cmds = {}; // my own commands will be tracked and ignored on download.

    pub.loop = function(){
        pub.uploader.loop();
        pub.downloader.loop();
    };

    pub.downloader = (function(){
        var pub_dn = {};
        var n_cmds = 0;
        var timestamp = 0;

        var busy = false;

        pub_dn.loop = function(){
            if(r2App.cur_time - timestamp > r2Const.DB_SYNC_POLLING_INTERVAL){
                download();
                timestamp = r2App.cur_time;
            }
        };

        var download = function(){
            if(busy){return;}
            busy = true;
            r2.util.postToDbsServer(
                "DownloadCmds",
                {
                    groupid_n : r2.ctx["groupid"],
                    groupid : "grp:"+r2.ctx["groupid"],
                    cmds_downloaded_n : n_cmds,
                    cur_members_n : r2.userGroup.GetCurMemberUsersNum()
                })
                .then(function(resp){
                    if(resp.group_update){
                        r2.userGroup.Set(resp.group_update);
                    }
                    if(resp.cmds && resp.cmds.length !== 0){
                        return processDownloadedCmds(resp.cmds);
                    }
                    return Promise.resolve(null);
                })
                .then(function(){
                    busy = false;
                })
                .catch(function(err){
                    busy = false;
                    r2App.asyncErr.throw(err);
                });
        };

        var processDownloadedCmds = function(cmd_strs){
            return new Promise(function(resolve, reject){
                n_cmds += cmd_strs.length;
                var cmds = [];
                for(var i = 0; i < cmd_strs.length; ++i){
                    cmds.push(JSON.parse(cmd_strs[i]));
                }
                cmds.sort(r2.util.chronologicalSort);
                var job = function(i){
                    setTimeout(function(){
                        if(i !== cmds.length){
                            if(!((cmds[i].user+"_"+cmds[i].time) in my_cmds)){
                                if(r2.cmd.executeCmd(r2App.doc, cmds[i], false)){
                                    r2.commentHistory.consumeCmd(cmds[i]);
                                }
                                else{
                                    console.error('Skipped a cmd, as we cannot understood it : ' + JSON.stringify(cmds[i]));
                                }
                                $( "#main_progress_bar" ).progressbar({
                                    value: parseInt(100*(i)/(cmds.length-1))
                                });
                            }
                            job(i+1);
                        }
                        else{
                            resolve();
                        }
                    }, r2Const.TIMEOUT_MINIMAL);
                };
                job(0);

            });
        };

        return pub_dn;
    })();

    pub.uploader = (function (){
        var pub_up = {};
        var q = [];
        var busy = false;
        var cmd_to_upload = null;

        pub_up.loop = function(){
            if(q.length > 0 && !busy){
                if(r2.userGroup.cur_user.isguest){ // the guest user doesn't upload anything
                    q = [];
                }
                else{
                    uploadAndConsumeCmds();
                }
            }
        };

        pub_up.busy = function(){
            return busy || q.length != 0
        };

        pub_up.pushCmd = function(cmd){
            q.push(cmd);
            r2.commentHistory.consumeCmd(cmd);
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
            busy = true;
            cmd_to_upload = q.shift();

            uploadAudioBlobIfNeeded(cmd_to_upload).then(
                function(){
                    return uploadCmd(cmd_to_upload);
                }
            ).then(
                function(){
                    my_cmds[cmd_to_upload.user+"_"+cmd_to_upload.time] = true;
                    $("#uploading_indicator").toggleClass("show", false);
                    busy = false;
                    cmd_to_upload = null;
                }
            ).catch(
                function(){
                    window.setTimeout(
                        function(){
                            q.unshift(cmd_to_upload);
                            busy = false;
                            cmd_to_upload = null;
                        },
                        r2Const.DELAY_UPLOADCMDS_RETRY
                    );
                }
            );
        };

        return pub_up;
    })();

    return pub;
})();