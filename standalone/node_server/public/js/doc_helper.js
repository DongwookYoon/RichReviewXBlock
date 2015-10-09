(function(r2Doc){
    'use strict';

    var $doc_container = null;
    var user_id = null;
    var host = null;

    var refreshDocList = function(){
        cleanDocDom();
        loadingIcon.appendTo($doc_container);

        Promise.all([
            postDbs('GetDocsOwned'),
            postDbs('GetDocsParticipated')]
        ).then(
            function(docids_list){
                var docids = merge(docids_list[0], docids_list[1]);
                var promises = docids.map(function(docid){return postDbs('GetDocById', {docid:docid});});
                return Promise.all(promises);
            }
        ).then(
            function(docs){
                docs = sortDocs(docs);

                loadingIcon.removeFrom($doc_container);
                var promises = docs.map(function(doc){return setDocDom(doc);});
                return Promise.all(promises);
            }
        ).catch(
            function(err){
                Helper.Util.HandleError(err);
            }
        );
    };

    var merge = function(a, b){
        var rtn = [];
        var is_in = function(docid){
            for(var i = 0, l = rtn.length; i < l; ++i){
                if(rtn[i] === docid){
                    return true;
                }
            }
            return false;
        };
        a.concat(b).forEach(function(doc){
            if(!is_in(doc)){
                rtn.push(doc);
            }
        });
        return rtn;
    };

    var sortDocs = function(l){
        l.sort(function(a, b){
            if (a.creationTime > b.creationTime)
                return -1;
            if (a.creationTime < b.creationTime)
                return 1;
            return 0;
        });
        return l;
    };

    var loadingIcon = (function(){
        var pub = {};

        var loading_icon_cls = 'r2Doc-loading';

        pub.appendTo = function($target){
            var $icon = getIcon('fa-refresh');
            $icon.toggleClass('fa-spin', true); // make it spin
            $icon.toggleClass(loading_icon_cls, true);
            $target.append($icon);
        };

        pub.removeFrom = function($target){
            var $icon = $target.find('> .'+loading_icon_cls);
            $icon.remove();
        };

        return pub;
    }());

    var getIcon = function(icon){
        var $icon = $(document.createElement('i'));
        $icon.toggleClass('fa');
        $icon.toggleClass(icon);
        return $icon;
    };

    var createNewDomElement = function(type, classes, parent){
        var $dom = $(document.createElement(type));
        classes.forEach(function(cls){
            $dom.toggleClass(cls, true);
        });
        if(parent)
            parent.append($dom);
        return $dom;
    };

    var cleanDocDom = function(){
        $doc_container.find('> .panel').remove();
    };

    var doms = (function(){
        var pub = {};
        pub.setDocTitle = function($doc_title, doc_id){
            $doc_title.attr('id', 'doctitle_'+doc_id.substring(4));
            $doc_title.attr('data-type', 'text');
            $doc_title.attr('data-pk', '1');
            $doc_title.attr('data-url', '/dbs?op=RenameDoc');
            $doc_title.attr('data-title', 'Rename document');
            $doc_title.editable({
                tpl: "<input type='text' style='font-family: inherit;font-weight: 400;line-height: 1.1;font-size:16px;width:400px;'>",
                placement: 'bottom'
            });
        };

        pub.setGroupTitle = function($group_title, group_id, doc){
            $group_title.attr('id', 'grouptitle_'+group_id.substring(4));
            $group_title.attr('data-type', 'text');
            $group_title.attr('data-pk', '1');
            $group_title.attr('data-url', '/dbs?op=RenameGroup');
            $group_title.attr('data-title', 'Rename group');
            $group_title.editable({
                tpl: "<input type='text' style='font-family: inherit;font-weight: 400;line-height: 1.1;font-size:16px;width:400px;'>",
                placement: 'bottom'
            });

            $group_title.attr('title', group_id + '\n' + doc.id + '\npdf:' + doc.pdfid);
        };

        pub.setGroupOpenClick = function($btn_open, group_data, doc){
            $btn_open.click(function(){
                window.open(host + "viewer?access_code=" + doc.pdfid + "&docid=" + doc.id.substring(4) + "&groupid=" + group_data.group.id.substring(4));
            });
        };

        pub.setGroupDeleteClick = function($btn_delete, group_data, doc){
            $btn_delete.click(function(){
                postDbs('DeleteGroup', {groupid_n: group_data.group.id.substring(4), docid_n:doc.id.substring(4)}).then(
                    function(){

                        return postDbs('GetDocById', {docid:doc.id});;
                    }
                ).then(
                    function(doc){
                        refreshGroupList(doc, $btn_delete.closest('.panel'));
                    }
                ).catch(
                    function(err){
                        Helper.Util.HandleError(err);
                    }
                );
            });
        };

        pub.setInviteClick = function($input_group, group_data, doc){
            var $btn_invite = $input_group.find('button');
            var $input = $input_group.find('input');
            $btn_invite.click(function(){
                postDbs(
                    'InviteUser',
                    {
                        groupid_n: group_data.group.id.substring(4),
                        docid_n:doc.id.substring(4),
                        emails:$input[0].value
                    }
                ).then(
                    function(){
                        return postDbs('GetDocById', {docid:doc.id});;
                    }
                ).then(
                    function(doc){
                        refreshGroupList(doc, $btn_invite.closest('.panel'));
                    }
                ).catch(
                    function(err){
                        Helper.Util.HandleError(err);
                    }
                );
            });
        };

        pub.setAddGroupClick = function($btn_add_group, doc){
            $btn_add_group.click(function(){
                postDbs('MyDoc_AddNewGroup', {docid: doc.id}).then(
                    function(resp){
                        return postDbs('GetDocById', {docid:doc.id});
                    }
                ).then(
                    function(resp) {
                        refreshGroupList(resp, $btn_add_group.closest('.panel'));
                    }
                ).catch(
                    function(err){
                        Helper.Util.HandleError(err);
                    }
                );
            });
        };

        pub.setDropDownBtn = function($btn_group, dropdn_msg, cb){
            $btn_group.attr('role', 'group');

            var $btn = $btn_group.find('.btn');
            $btn.attr('data-toggle', 'dropdown');
            $btn.toggleClass('dropdown-toggle', true);

            var $ul = createNewDomElement('ul', ['dropdown-menu'], $btn_group);
            $ul.attr('role', 'menu');
            var $li = createNewDomElement('li', [], $ul);

            var $btn_confirm = createNewDomElement('a', ['btn', 'btn-default','btn-sm'], $li);
            $btn_confirm.text(dropdn_msg);
            $btn_confirm.click(cb);
            return $btn_confirm;
        };

        return pub;
    }());

    var setDocDom = function(doc){
        var $panel = createNewDomElement('div', ['panel'], $doc_container);

        var $panel_heading = createNewDomElement('div', ['panel-heading'], $panel);
        {
            var $title = createNewDomElement('a', ['doc_title'], $panel_heading);
            $title.text(doc.name);
            doms.setDocTitle($title, doc.id);


            var $doc_ui = createNewDomElement('div', ['doc_ui'], $panel_heading);
            {
                var $time_created = createNewDomElement('p', ['doc_time_created'], $doc_ui);
                $time_created.text(' '+doc.creationTimeStr);
                {
                    $time_created.prepend(getIcon('fa-clock-o'));
                }

                var $btn_add_group = createNewDomElement('a', ['btn', 'btn-primary', 'btn-sm'], $doc_ui);
                {
                    $btn_add_group.append(getIcon('fa-plus-square'));
                    doms.setAddGroupClick($btn_add_group, doc);
                }

                var $btn_group = createNewDomElement('div', ['btn-group'], $doc_ui);
                var $btn_delete_all = createNewDomElement('a', ['btn', 'btn-danger', 'btn-sm'], $btn_group);
                {
                    $btn_delete_all.append(getIcon('fa-trash'));
                }
                doms.setDropDownBtn($btn_group, 'Delete this document', function(){alert('hi');});
            }
        }

        return refreshGroupList(doc, $panel);
    };

    var refreshGroupList = function(doc, $panel){
        $panel.find('.panel-body').remove();

        var $panel_body = createNewDomElement('div', ['panel-body'], $panel);
        loadingIcon.appendTo($panel_body);

        var promises = doc.groups.map(function(group_id){
            return postDbs('GetGroupData', {groupid: group_id});
        });

        return Promise.all(promises).then(
            function(resp){
                loadingIcon.removeFrom($panel_body);
                resp.forEach(function(group_data){
                    setGroupDom(group_data, doc, $panel_body);
                });
            }
        );
    };

    var setGroupDom = function(group_data, doc, $panel_body){
        var $group_row = createNewDomElement('div', ['group_row'], $panel_body);
        {

            var $title = createNewDomElement('a', ['group_title'], $group_row);
            $title.text(group_data.group.name);
            doms.setGroupTitle($title, group_data.group.id, doc);

            var $group_ui = createNewDomElement('div', ['group_ui'], $group_row);
            {
                var $btn_open = createNewDomElement('btn', ['btn', 'btn-primary', 'btn-sm'], $group_ui);
                $btn_open.text('Open');
                doms.setGroupOpenClick($btn_open, group_data, doc);

                var $btn_share = createNewDomElement('btn', ['btn', 'btn-info', 'btn-sm'], $group_ui);
                $btn_share.text('Share');

                var $btn_group = createNewDomElement('div', ['btn-group'], $group_ui);
                var $btn_delete = createNewDomElement('a', ['btn', 'btn-danger', 'btn-sm'], $btn_group);
                {
                    $btn_delete.append(getIcon('fa-trash'));
                }
                var $btn_delete_confirm = doms.setDropDownBtn($btn_group, 'Delete this group');
                doms.setGroupDeleteClick($btn_delete_confirm, group_data, doc);
            }

            var $member_row = createNewDomElement('div', ['member_row'], $group_row);
            {
                var $text = createNewDomElement('p', ['member_text'], $member_row);
                $text.append(getIcon('fa-users'));
                if(group_data.users.length){
                    group_data.users.forEach(function(user){
                        var $btn_group = createNewDomElement('div', ['btn-group'], $member_row);
                        var $btn_user = createNewDomElement('a', ['btn', 'btn-sm'], $btn_group);
                        $btn_user.toggleClass(user_id === user.id ? 'btn-primary' : 'btn-default', true);
                        $btn_user.text(user.nick);
                        doms.setDropDownBtn($btn_group, 'Remove', function(){alert('hi');});
                    });
                }
                else{
                    var $no_user = createNewDomElement('a', ['member_empty_text'], $member_row);
                    $no_user.text('This group is empty');
                }
                var $form_group = createNewDomElement('div', ['form-group', 'invite_input'], $member_row);
                {
                    var $input_group = createNewDomElement('span', ['input-group'], $form_group);
                    {
                        //var $label = createNewDomElement('span', ['input-group-addon'], $input_group);
                        //$label.text('invite');

                        var $input = createNewDomElement('input', ['form-control', 'input-sm'], $input_group);
                        $input.attr('placeholder', 'invite');

                        var $button = createNewDomElement('button', ['btn', 'btn-default', 'btn-sm'], $input_group);
                        $button.append(getIcon('fa-plus'));
                    }
                    doms.setInviteClick($input_group, group_data, doc);
                }
            }
        }
    };

    var postDbs = function(op, msg){
        return new Promise(function(resolve, reject){
            var url = host+'dbs?op=' + op;
            var posting = $.post(url, msg);
            posting.success(function(resp){
                resolve(resp);
            });
            posting.fail(function(resp){
                reject(resp);
            });
        });
    };

    r2Doc.init = function(blob_host, _host, user_data){
        $doc_container = $('#doc_container');
        host = _host;
        user_id = JSON.parse(decodeURIComponent(user_data)).id;
        refreshDocList();

        var $btn_refresh = $('#btn-refresh');
        $btn_refresh.click(function(){
            refreshDocList();
        });
    }
}(window.r2Doc = window.r2Doc || {}));