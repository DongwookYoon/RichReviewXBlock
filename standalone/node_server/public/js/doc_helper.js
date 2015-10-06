/**
 * Created by dongwook on 9/22/15.
 */
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
            function(doc_lists){
                return mergeAndSortDocs(doc_lists[0], doc_lists[1]);
            }
        ).then(
            function(docs){
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

    var mergeAndSortDocs = function(a, b){
        var rtn = [];
        var is_in = function(docid){
            for(var i = 0, l = rtn.length; i < l; ++i){
                if(rtn[i].id === docid){
                    return true;
                }
            }
            return false;
        };
        a.concat(b).forEach(function(doc){
            if(!is_in(doc.id)){
                rtn.push(doc);
            }
        });

        rtn.sort(function(a, b){
            if (a.creationTime > b.creationTime)
                return -1;
            if (a.creationTime < b.creationTime)
                return 1;
            return 0;
        });

        return rtn;
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

        pub.setGroupTitle = function($group_title, group_id){
            $group_title.attr('id', 'grouptitle_'+group_id.substring(4));
            $group_title.attr('data-type', 'text');
            $group_title.attr('data-pk', '1');
            $group_title.attr('data-url', '/dbs?op=RenameGroup');
            $group_title.attr('data-title', 'Rename group');
            $group_title.editable({
                tpl: "<input type='text' style='font-family: inherit;font-weight: 400;line-height: 1.1;font-size:16px;width:400px;'>",
                placement: 'bottom'
            });
        };

        pub.setGroupBtns = function($btn_open, $btn_share, $btn_delete){

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
                }

                var $btn_group = createNewDomElement('div', ['btn-group'], $doc_ui);
                var $btn_delete_all = createNewDomElement('a', ['btn', 'btn-danger', 'btn-sm'], $btn_group);
                {
                    $btn_delete_all.append(getIcon('fa-trash'));
                }
                doms.setDropDownBtn($btn_group, 'Delete this document', function(){alert('hi');});
            }
        }

        var $panel_body = createNewDomElement('div', ['panel-body'], $panel);
        loadingIcon.appendTo($panel_body);

        var promises = doc.groups.map(function(group_id){
            return postDbs('GetGroupData', {groupid: group_id});
        });

        return Promise.all(promises).then(
            function(resp){
                loadingIcon.removeFrom($panel_body);
                resp.forEach(function(group_data){
                    setGroupDom(group_data, $panel_body);
                });
            }
        );
    };

    var setGroupDom = function(group_data, $panel_body){
        var $group_row = createNewDomElement('div', ['group_row'], $panel_body);
        {

            var $title = createNewDomElement('a', ['group_title'], $group_row);
            $title.text(group_data.group.name);
            doms.setGroupTitle($title, group_data.group.id);

            var $group_ui = createNewDomElement('div', ['group_ui'], $group_row);
            {
                var $btn_open = createNewDomElement('btn', ['btn', 'btn-primary', 'btn-sm'], $group_ui);
                $btn_open.text('Open');

                var $btn_share = createNewDomElement('btn', ['btn', 'btn-info', 'btn-sm'], $group_ui);
                $btn_share.text('Share');

                var $btn_group = createNewDomElement('div', ['btn-group'], $group_ui);
                var $btn_delete_all = createNewDomElement('a', ['btn', 'btn-danger', 'btn-sm'], $btn_group);
                {
                    $btn_delete_all.append(getIcon('fa-trash'));
                }
                doms.setDropDownBtn($btn_group, 'Delete this group', function(){alert('hi');});

            }

            var $member_row = createNewDomElement('div', ['member_row'], $group_row);
            {
                var $text = createNewDomElement('p', ['member_text'], $member_row);
                $text.append(getIcon('fa-users'));
                if(group_data.users.length){
                    group_data.users.forEach(function(user){
                        var $btn_group = createNewDomElement('div', ['btn-group'], $member_row);
                        var $btn_user = createNewDomElement('a', ['btn', 'btn-default', 'btn-sm'], $btn_group);
                        $btn_user.text(user.nick);
                        doms.setDropDownBtn($btn_group, 'Remove', function(){alert('hi');});

                    });
                }
                else{
                    var $no_user = createNewDomElement('a', ['member_empty_text'], $member_row);
                    $no_user.text('This group is empty');
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

    r2Doc.init = function(blob_host, _host, user){
        $doc_container = $('#doc_container');
        host = _host;
        user_id = JSON.parse(decodeURIComponent(user)).id;
        refreshDocList();

        var $btn_refresh = $('#btn-refresh');
        $btn_refresh.click(function(){
            refreshDocList();
        });
    }
}(window.r2Doc = window.r2Doc || {}));