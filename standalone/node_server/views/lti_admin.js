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
                        'show object',
                        function(){
                            alert(JSON.stringify(user));
                        }
                    )
                );
                $div_btn.find('ul').append(
                    createLiButton(
                        'delete',
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
            }
            $tr.children().eq(0).append($div_btn);
            $tbody.append($tr);
        })(user);
    }
}

function setGroupsRR(grps){
    var i, j, $tr, $td, grp;
    var row_items = ['id', 'users', 'creationTime'];
    var $thead_tr = $('#thead_tr_rr');
    var $tbody = $('#tbody_rr');

    for(i = 0, row_item = null; i < row_items.length; i++){
        row_item = row_items[i];
        $td = $('<td>');
        $td.text(row_item);
        $thead_tr.append($td);
    }

    for(i = 0, grp = null; i < grps.length; i++) {
        grp = grps[i];
        (function(grp){
            $tr = $('<tr>');
            for(j = 0, row_item = null; j < row_items.length; j++) {
                row_item = row_items[j];
                $td = $('<td>');
                var item = grp[row_item];
                $td.text(typeof item === 'object' ? JSON.stringify(item) : item);
                $tr.append($td);
            }
            $tr.children().eq(0).text('');
            var $div_btn = createDropdownBtn(grp.id);
            {
                $div_btn.find('ul').append(
                    createLiButton(
                        'show object',
                        function(){
                            alert(JSON.stringify(grp));
                        }
                    )
                );
                $div_btn.find('ul').append(
                    createLiButton(
                        'delete',
                        function(){
                            if(confirm('Delete a group?')){
                                $.post("/lti_dbs?op=del_grp", {type: 'rr', grp_id: grp.id})
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
            }
            $tr.children().eq(0).append($div_btn);
            $tbody.append($tr);

        })(grp);
    }
}

function run(data_str){
    var data = JSON.parse(decodeURIComponent(data_str));
    setUsers(data.users);
    setGroupsRR(data.grps_rr);


    var $table = $('.table');
    $table.css('font-size', 'small');
}