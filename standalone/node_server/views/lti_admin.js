/**
 * Created by yoon on 8/11/16.
 */

function createLiButton(text, func){
    var $li = $('<li>');
    var $button = $('<button>');
    $button.addClass('btn-xs');
    $button.text(text);
    $button.click(func);
    $li.append($button);
    return $li;
}

function createDropdownBtn(btn_str){
    var $div = $('<div>');
    $div.addClass('dropdown');

    var $button = $('<button>');
    $button.addClass('btn dropdown-toggle btn-xs');
    $button.attr('type', 'button');
    $button.attr('data-toggle', 'dropdown');
    $button.text(btn_str);
    $div.append($button);

    var $ul = $('<ul>');
    $ul.addClass('dropdown-menu');
    $div.append($ul);

    return $div
}

function setUsers(users){
    var i, j, $tr, $td, user;
    var row_items = ['id', 'nick', 'email', 'group', 'status'];
    var $thead_tr = $('#thead_tr_users');
    var $tbody = $('#tbody_users');

    for(i = 0, row_item = null; i < row_items.length; i++){
        row_item = row_items[i];
        $td = $('<td>');
        $td.text(row_item);
        $thead_tr.append($td);
    }

    users.sort(function(a, b) {
        if(a.status !== b.status)
            return a.status > b.status ? 1 : -1;
        if(a.group !== b.group)
            return a.group > b.group ? 1 : -1;
        return 0;
    });

    for(i = 0, user = null; i < users.length; i++) {
        user = users[i];
        (function(user){
            $tr = $('<tr>');
            for(j = 0, row_item = null; j < row_items.length; j++) {
                row_item = row_items[j];
                $td = $('<td>');
                $td.text(user[row_item]);
                $tr.append($td);
            }
            $tr.children().eq(0).text('');
            var $div_btn = createDropdownBtn(user.id);
            {
                $div_btn.find('ul').append(
                    createLiButton(
                        'Show object',
                        function(){
                            alert(JSON.stringify(user));
                        }
                    )
                );
                $div_btn.find('ul').append(
                    createLiButton(
                        'Delete user',
                        function(){
                            if(confirm('Delete a user?')){
                                $.post("/lti_dbs?op=del_user", {user_id:user.id})
                                    .done(function() {
                                        window.location.reload();
                                    })
                                    .fail(function() {
                                        alert("Oops. Server error.");
                                    });
                            }
                        }
                    )
                );
                $div_btn.find('ul').append(
                    createLiButton(
                        'Delete user and group data',
                        function(){
                            if(confirm('Delete a user and group data?')){
                                $.post("/lti_dbs?op=del_user_and_group_data", {user_id:user.id})
                                    .done(function() {
                                        window.location.reload();
                                    })
                                    .fail(function() {
                                        alert("Oops. Server error.");
                                    });
                            }
                        }
                    )
                );
                $div_btn.find('ul').append(
                    createLiButton(
                        'Give credit',
                        function(){
                            $.post("/lti_dbs?op=give_credit", {user_id:user.id})
                                .done(function(resp) {
                                    console.log('Give credit resp: resp');
                                    alert('Credit updated.');
                                })
                                .fail(function() {
                                    alert("Oops. Server error.");
                                });
                        }
                    )
                );
            }
            $tr.children().eq(0).append($div_btn);
            $tbody.append($tr);
        })(user);
    }

    var n = 0;
    $thead_tr.append($('<td>N-status</td>'));
    $thead_tr.append($('<td>N</td>'));
    var $tds = $tbody.children();
    for(var i = 0; i < $tds.length; ++i, ++n){
        if(users[i-1] && users[i-1].status !== users[i].status){
            n = 0;
        }
        $tds.eq(i).append($('<td>'+(n+1)+'</td>'));
        $tds.eq(i).append($('<td>'+(i+1)+'</td>'));
    }
}

function setGroups(user_map, grps, $thead_tr, $tbody, type_str){
    var i, j, $row, $td, grp;
    var row_items = ['id', 'N', 'users', 'creationTime'];

    var n_total_users = 0;
    for(i = 0, grp = null; i < grps.length; i++) {
        n_total_users += grps[i].users.length;
    }
    $('#'+type_str+'_groups_text').text(grps.length + ' group(s) / ' + n_total_users + ' user(s)');

    grps.sort(function(a, b) {
        if(a.creationTime !== b.creationTime)
            return a.creationTime > b.creationTime ? 1 : -1;
        return 0;
    });

    for(i = 0, row_item = null; i < row_items.length; i++){
        row_item = row_items[i];
        $td = $('<td>');
        $td.text(row_item);
        $thead_tr.append($td);
    }

    for(i = 0, grp = null; i < grps.length; i++) {
        grp = grps[i];
        (function(grp){ // closure
            $row = $('<tr>');

            {// id and buttons
                var $td = $('<td>');
                var $btn = createDropdownBtn(grp.id);
                $btn.find('ul').append(
                    createLiButton(
                        'show object',
                        function(){
                            alert(JSON.stringify(grp));
                        }
                    )
                );
                $btn.find('ul').append(
                    createLiButton(
                        'delete',
                        function(){
                            if(confirm('Delete a group?')){
                                $.post("/lti_dbs?op=del_grp", {type: type_str, grp_id: grp.id})
                                    .done(function() {
                                        window.location.reload();
                                    })
                                    .fail(function() {
                                        alert("Oops. Server error.");
                                    });
                            }
                        }
                    )
                );
                $td.append($btn);
                $row.append($td);
            }

            {// N
                var $td = $('<td>');
                $td.text(grp.users.length);
                $row.append($td);
            }

            {// users
                var $td = $('<td>');
                var s = '';
                for(var i = 0; i < grp.users.length; ++i){
                    user = user_map[grp.users[i]];
                    s += user.email + ' (' + user.id.slice(0, 6) + ')';
                    s += ', ';
                }
                $td.text(s.slice(0, s.length-2));
                $row.append($td);
            }

            {// creationTime
                var $td = $('<td>');
                $td.text(grp.creationTime);
                $row.append($td);
            }

            $tbody.append($row);
        })(grp);
    }
}

function run(data_str){
    var data = JSON.parse(decodeURIComponent(data_str));
    var user_map = {};
    for(var i = 0; i < data.users.length; ++i){
        user_map[data.users[i].id] = data.users[i];
    }
    setUsers(data.users);
    setGroups(user_map, data.grps_rr, $('#thead_tr_rr'), $('#tbody_rr'), 'rr');
    setGroups(user_map, data.grps_bb, $('#thead_tr_bb'), $('#tbody_bb'), 'bb');

    var $table = $('.table');
    $table.css('font-size', 'small');
}