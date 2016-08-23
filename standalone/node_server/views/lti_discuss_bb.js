/**
 * Created by yoon on 8/12/16.
 */
var groupid = null;
var userid = null;
var username = null;

function postFail(err){
    console.error(err);
    alert("Oops. Server error. Please get back to the edX.org and retry. If it\'s the same after 10 min, please report this to dy252@cornell.edu.");
}

function refreshPage(){
    window.location.replace('lti_discuss_bb');
}

function getPosts(){
    $('#spinner').css('display', 'block');
    $.post('/lti_discuss_bb?op=get', {groupid_n: groupid})
        .done(function(cmds_str) {
            $('#spinner').css('display', 'none');
            if(cmds_str.length === 0){
                postNone();
            }
            else{
                var cmds = [];
                for(var i = 0; i < cmds_str.length; i++){
                    cmds.push(JSON.parse(cmds_str[i]));
                }
                cmds.sort(function(a,b) {
                    if (new Date(a.time) < new Date(b.time))
                        return -1;
                    if (new Date(a.time) > new Date(b.time))
                        return 1;
                    return 0;
                });
                for(var i = 0; i < cmds.length; i++){
                    runCmd(cmds[i])
                }
            }
        })
        .fail(function(err) {
            $('#spinner').css('display', 'none');
            postFail(err);
        });
}

function createDeleteBtn(){
    var $btn = $('<button>Delete this post</button>');
    $btn.addClass('btn btn-sm btn-danger posts_btn');
    $btn.on(
        'click',
        function(e){
            if(confirm('Do you really want to delete this comment?')){
                var cmd = {
                    op: 'deleteComment',
                    comment_id: $btn.parent().attr('id')
                };
                $.post('/lti_discuss_bb?op=cmd', {groupid_n: groupid, cmd:cmd})
                    .done(refreshPage)
                    .fail(postFail);
            }
            return false;
        }
    );
    return $btn;
}

function createRepliesH3andUlIfNotExist($li_parent){
    var $h3_replies = $li_parent.children('h3');
    var $ul = $li_parent.children('.replies_ul');
    if($h3_replies.length === 0 && $ul.length === 0){
        $h3_replies = $('<h3>Replies:</h3>');
        $h3_replies.addClass('replies_indent');
        $li_parent.append($h3_replies);

        $ul = $('<ul></ul>');
        $ul.addClass('list-group replies_indent replies_ul');
        $li_parent.append($ul);
    }
    return [$h3_replies, $ul]
}

function createReplyBtn(){
    var $btn = $('<button>Reply to this post</button>');
    $btn.addClass('btn btn-sm btn-primary posts_btn');
    $btn.on(
        'click',
        function(e){
            var $li_parent = $btn.parent();
            var h3_and_ul = createRepliesH3andUlIfNotExist($li_parent);
            var $h3_replies = h3_and_ul[0];
            var $ul = h3_and_ul[1];
            {
                var $li_reply = $ul.children('.reply_form_li');
                if($li_reply.length === 0){
                    $li_reply = $('<li></li>');
                    $li_reply.addClass('list-group-item reply_form_li');
                    $ul.prepend($li_reply);
                    {
                        var $form = $('<form></form>');
                        $li_reply.append($form);
                        {
                            var $h3 = $('<h3>Write a Reply</h3>');
                            $form.append($h3);

                            var $textarea = $('<textarea></textarea>');
                            $textarea.addClass('form-control');
                            $textarea.attr('rows', '5');
                            $textarea.attr('name', 'texts');
                            $textarea.attr('placeholder', 'Enter text here...');
                            $form.append($textarea);

                            var $btn_save = $('<button>Save</button>');
                            $btn_save.addClass('btn btn-sm btn-primary posts_btn reply_save_btn');
                            $form.append($btn_save);
                            $btn_save.on(
                                'click',
                                function(e){
                                    var form_data = getFormData($form);
                                    var cmd =  {
                                        op: 'createReply',
                                        groupid_n: groupid,
                                        texts: form_data.texts,
                                        anchor: $li_parent.attr('id'),
                                        id: userid,
                                        name: username
                                    };
                                    $.post('/lti_discuss_bb?op=cmd', {groupid_n: groupid, cmd: cmd})
                                        .done(refreshPage)
                                        .fail(postFail);
                                    return false;
                                }
                            );

                            var $btn_cancel = $('<button>Cancel</button>');
                            $btn_cancel.addClass('btn btn-sm btn-default posts_btn reply_save_btn');
                            $form.append($btn_cancel);
                            $btn_cancel.on(
                                'click',
                                function(e){
                                    $li_reply.remove();
                                    if($ul.children('li').length === 0){
                                        $h3_replies.remove();
                                        $ul.remove();
                                    }
                                    return false;
                                }
                            )
                        }
                    }
                }
            }
            $li_parent.find('textarea').focus();
            /*
             ul.replies_indent.replies_ul.list-group(name='replies')
             li.list-group-item
             form#bb_form2
                 h3 Write a Reply:
                 button.btn.btn-sm.btn-primary.posts_btn.reply_save_btn Save
                 button.btn.btn-sm.btn-default.posts_btn.reply_cancel_btn Cancel
             */
            return false;
        }
    );
    return $btn;
}

function runCreateTemplate(cmd, appendFunc){
    var $li = $('<li></li>');
    $li.addClass('list-group-item');
    $li.attr('id', 'comment_'+cmd.time);
    $li.attr('user', cmd.id);
    appendFunc($li);

    var $p_text = $('<p></p>');
    $p_text.text(cmd.texts);
    $li.append($p_text);

    var $p_meta = $('<p></p>');
    $p_meta.addClass('ago');
    $p_meta.text('Posted '+jQuery.timeago(new Date(cmd.time)) + ' by ' + cmd.name);
    $li.append($p_meta);

    $li.append(createReplyBtn());

    if(cmd.id === userid){
        $li.append(createDeleteBtn());
    }
}

function runCreateComment(cmd){
    runCreateTemplate(cmd, function($li){$('#new_comment_li').after($li);});
}

function runCreateReply(cmd){
    runCreateTemplate(
        cmd,
        function($li){
            var $li_parent = $('#'+cmd.anchor);
            if($li_parent.length === 1){
                var h3_and_ul = createRepliesH3andUlIfNotExist($li_parent);
                var $h3_replies = h3_and_ul[0];
                var $ul = h3_and_ul[1];
                $ul.prepend($li);
            }
        }
    )
}

function runDeleteComment(cmd){
    $('#'+cmd.comment_id).remove();
}

function runCmd(cmd) {
    if (cmd.op === 'createComment') {
        runCreateComment(cmd);
    }
    else if (cmd.op === 'deleteComment') {
        runDeleteComment(cmd);
    }
    else if (cmd.op === 'createReply') {
        runCreateReply(cmd);
    }
    else {
        console.error('invalid comment:', cmd);
    }
}

function postNone(){
    var $li = $('<li></li>');
    $li.addClass('list-group-item');
    $li.text("There's no post yet.");
    $('#posts_ul').append($li);
}

function getFormData($f){
    var val = {};
    var arr = $f.serializeArray();
    var i;
    for(i = 0; i < arr.length; ++i){
        val[arr[i].name] = arr[i].value;
    }
    return val;
}

function setOnSave(){
    $('#new_comment_btn').on(
        'click',
        function (e) {
            var form_val = getFormData($('#new_comment_form'));
            var cmd = {
                op: 'createComment',
                groupid_n: groupid,
                texts: form_val.texts,
                id: userid,
                name: username
            };
            $.post(
                '/lti_discuss_bb?op=cmd',
                {
                    groupid_n: groupid,
                    cmd: cmd
                })
                .done(refreshPage)
                .fail(postFail);
            return false;
        }
    );
}

function regUsers(users){
    if(users.length !== 1) {
        var s = '';
        if(users.length === 2) {
            s = users[0].nick + ' and ' + users[1].nick;
        }
        else{
            for(var i = 0; i < users.length-1; i++){
                s += users[i].nick + ', ';
            }
            s += 'and ';
            s += users[users.length-1].nick;
        }
        $('#users_text').text(s)
    }
}

var run = function(bb_ctx){
    bb_ctx = JSON.parse(decodeURIComponent(bb_ctx));
    groupid = bb_ctx.group.id;
    userid = bb_ctx.user.id;
    username = bb_ctx.user.nick;

    console.log(bb_ctx);

    regUsers(bb_ctx.users);
    setOnSave();
    getPosts();
};
