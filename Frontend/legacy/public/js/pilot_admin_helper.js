/**
 * set the password as editable using cdn
 * (https://vitalets.github.io/x-editable/)
 * @param div_id
 * @param email
 * @param password
 */
/* eslint-disable camelcase,no-unused-vars,no-var,no-undef,no-console,no-redeclare,no-lone-blocks */
function makePasswordEditable(div_id, email, password) {
  const $pswdEntry = $('#' + div_id)
    .find('.pswd_input')
    .find('a')
  $pswdEntry.editable({
    type: 'text',
    pk: 1,
    url: `/pilot_admin/mgmt_acct/${email}?op=ChangePassword`,
    title: 'Change password'
  })
}

/**
 * set user is_active as editable using cdn
 * (https://vitalets.github.io/x-editable/)
 * @param div_id
 * @param email
 * @param is_it_blocked
 */
function makeBlockedSelector(div_id, email, is_it_blocked) {
  const $isBlockedEntry = $('#' + div_id)
    .find('.is_active_input')
    .find('a')
  const value = is_it_blocked ? 'yes' : 'no'
  console.log('DEBUG: ', email, value)
  $isBlockedEntry.editable({
    type: 'select',
    pk: 1,
    url: `/pilot_admin/mgmt_acct/${email}?op=ChangeIsActive`,
    title: 'block user?',
    value: value,
    source: [{ value: 'no', text: 'no' }, { value: 'yes', text: 'yes' }]
  })
}
