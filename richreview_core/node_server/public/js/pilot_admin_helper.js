

/**
 * set the password as editable using cdn
 * (https://vitalets.github.io/x-editable/)
 * @param div_id
 * @param email
 * @param password
 */
function makePasswordEditable(div_id, email, password) {
    console.log(email);

    var $pswdEntry = $('#' + div_id).find('.pswd_input').find('a');
    $pswdEntry.editable({
        type: 'text',
        pk: 1,
        url: `/pilot_admin/mgmt_acct/${email}?op=ChangePassword`,
        title: 'Change password'
    });
}