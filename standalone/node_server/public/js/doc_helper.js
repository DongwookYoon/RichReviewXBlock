/**
 * Created by dongwook on 9/22/15.
 */
(function(r2Doc){
    'use strict';

    var $doc_container = null;
    var user_id = null;
    var host = null;

    var getDocList = function(){
        cleanDocDom();
        loadingIcon.appendTo($doc_container);
        return postDbs('GetDocsOwned').then(
            function(resp){
                loadingIcon.removeFrom($doc_container);

                resp.sort(function(a, b){
                    if (a.creationTime > b.creationTime)
                        return -1;
                    if (a.creationTime < b.creationTime)
                        return 1;
                    return 0;
                });

                resp.forEach(function(doc){
                    setDocDom(doc);
                })

                return null;
            }
        );
    };

    var getGroupData = function(group_id){
        return postDbs('GetGroupData', {groupid: group_id});
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

    var setDocDom = function(doc){
        var $panel = createNewDomElement('div', ['panel']);

        var $panel_heading = createNewDomElement('div', ['panel-heading'], $panel);
        {
            var $title = createNewDomElement('p', [], $panel_heading);
            $title.text(doc.name);

            var $t_created = createNewDomElement('p', [], $panel_heading);
            $t_created.text(doc.creationTimeStr);
            {
                $t_created.prepend(getIcon('fa-clock-o'));
            }

            var $btn_add_group = createNewDomElement('a', ['btn', 'btn-primary', 'btn-sm'], $panel_heading);
            {
                $btn_add_group.append(getIcon('fa-plus-square'));
                $btn_add_group.append(getIcon('fa-users'));
            }

            var $btn_delete_all = createNewDomElement('a', ['btn', 'btn-danger', 'btn-sm'], $panel_heading);
            {
                $btn_delete_all.append(getIcon('fa-trash'));
            }
        }


        Promise.all(doc.groups.map(function(group_id){return getGroupData(group_id);})).then(
            function(resp){
                var x = 0;

            }
        ).catch(
            function(err){
                var x = 0;
            }
        );

        $doc_container.append($panel);
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
        getDocList().catch(
            function(err){
                alert(err);
            }
        );
    }
}(window.r2Doc = window.r2Doc || {}));