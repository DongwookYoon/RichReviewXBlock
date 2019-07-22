/* eslint-disable camelcase,no-unused-vars,no-var,no-undef,no-console,no-redeclare,no-lone-blocks */
;(function(r2Doc) {
  'use strict'

  let $doc_container = null
  let user_id = null
  let host = null

  const refreshDocList = function() {
    cleanDocDom()
    loadingIcon.appendTo($doc_container)

    Promise.all([postDbs('GetDocsOwned'), postDbs('GetDocsParticipated')])
      .then(function(docids_list) {
        const docids = merge(docids_list[0], docids_list[1])
        if (docids.length !== 0) {
          return postDbs('GetDocByIds', { docids: docids }).then(function(
            docs
          ) {
            docs = sortDocs(docs)

            loadingIcon.removeFrom($doc_container)
            const promises = docs.map(function(doc) {
              return setDocDom(doc)
            })
            return Promise.all(promises)
          })
        } else {
          loadingIcon.removeFrom($doc_container)
          $doc_container.text('You are yet to have any document.')
        }
      })
      .catch(function(err) {
        Helper.Util.HandleError(err)
      })
  }

  var merge = function(a, b) {
    const rtn = []
    const is_in = function(docid) {
      for (let i = 0, l = rtn.length; i < l; ++i) {
        if (rtn[i] === docid) {
          return true
        }
      }
      return false
    }
    a.concat(b).forEach(function(doc) {
      if (!is_in(doc)) {
        rtn.push(doc)
      }
    })
    return rtn
  }

  var sortDocs = function(l) {
    l.sort(function(a, b) {
      if (a.creationTime > b.creationTime) return -1
      if (a.creationTime < b.creationTime) return 1
      return 0
    })
    return l
  }

  var loadingIcon = (function() {
    const pub = {}

    const loading_icon_cls = 'r2Doc-loading'

    pub.appendTo = function($target) {
      const $icon = getIcon('fa-refresh')
      $icon.toggleClass('fa-spin', true) // make it spin
      $icon.toggleClass(loading_icon_cls, true)
      $target.append($icon)
    }

    pub.removeFrom = function($target) {
      const $icon = $target.find('> .' + loading_icon_cls)
      $icon.remove()
    }

    return pub
  })()

  var getIcon = function(icon) {
    const $icon = $(document.createElement('i'))
    $icon.toggleClass('fa')
    $icon.toggleClass(icon)
    return $icon
  }

  const createNewDomElement = function(type, classes, parent) {
    const $dom = $(document.createElement(type))
    classes.forEach(function(cls) {
      $dom.toggleClass(cls, true)
    })
    if (parent) parent.append($dom)
    return $dom
  }

  var cleanDocDom = function() {
    $doc_container.find('> .panel').remove()
  }

  const doms = (function() {
    const pub = {}
    pub.setDocTitle = function($doc_title, doc_id) {
      $doc_title.attr('id', 'doctitle_' + doc_id.substring(4))
      $doc_title.attr('data-type', 'text')
      $doc_title.attr('data-pk', '1')
      $doc_title.attr('data-url', '/dbs?op=RenameDoc')
      $doc_title.attr('data-title', 'Rename document')
      $doc_title.editable({
        tpl:
          "<input type='text' style='font-family: inherit;font-weight: 400;line-height: 1.1;font-size:16px;width:400px;'>",
        placement: 'bottom'
      })
    }

    pub.setGroupTitle = function($group_title, group_id, doc) {
      $group_title.attr('id', 'grouptitle_' + group_id.substring(4))
      $group_title.attr('data-type', 'text')
      $group_title.attr('data-pk', '1')
      $group_title.attr('data-url', '/dbs?op=RenameGroup')
      $group_title.attr('data-title', 'Rename group')
      $group_title.editable({
        tpl:
          "<input type='text' style='font-family: inherit;font-weight: 400;line-height: 1.1;font-size:16px;width:400px;'>",
        placement: 'bottom'
      })
    }

    pub.setGroupOpenClick = function($btn_open, group_data, doc) {
      $btn_open.click(function() {
        window.open(
          host +
            'viewer?access_code=' +
            doc.pdfid +
            '&docid=' +
            doc.id.substring(4) +
            '&groupid=' +
            group_data.group.id.substring(4)
        )
      })
    }

    pub.setDocDeleteClick = function($btn_delete, doc) {
      $btn_delete.click(function() {
        postDbs('DeleteDocument', { docid_n: doc.id.substring(4) })
          .then(function() {
            return deleteDoc(doc, $btn_delete.closest('.panel'))
          })
          .catch(function(err) {
            Helper.Util.HandleError(err)
          })
      })
    }

    pub.setGroupDeleteClick = function($btn_delete, group_data, doc) {
      $btn_delete.click(function() {
        postDbs('DeleteGroup', {
          groupid_n: group_data.group.id.substring(4),
          docid_n: doc.id.substring(4)
        })
          .then(function() {
            return postDbs('GetDocById', { docid: doc.id })
          })
          .then(function(doc) {
            return refreshGroupList(doc, $btn_delete.closest('.panel'))
          })
          .catch(function(err) {
            Helper.Util.HandleError(err)
          })
      })
    }

    pub.setInviteClick = function($input_group, group_data, doc) {
      const $btn_invite = $input_group.find('button')
      const $input = $input_group.find('input')
      $btn_invite.click(function() {
        postDbs('InviteUser', {
          groupid_n: group_data.group.id.substring(4),
          docid_n: doc.id.substring(4),
          emails: $input[0].value
        })
          .then(function() {
            return postDbs('GetDocById', { docid: doc.id })
          })
          .then(function(doc) {
            refreshGroupList(doc, $btn_invite.closest('.panel'))
          })
          .catch(function(err) {
            Helper.Util.HandleError(err)
          })
      })
    }

    pub.setCancelInvitedClick = function(
      $btn_cancel_invited,
      group_data,
      doc,
      email
    ) {
      $btn_cancel_invited.click(function() {
        postDbs('CancelInvited', {
          groupid_n: group_data.group.id.substring(4),
          email: email
        })
          .then(function(resp) {
            return postDbs('GetDocById', { docid: doc.id })
          })
          .then(function(resp) {
            refreshGroupList(resp, $btn_cancel_invited.closest('.panel'))
          })
          .catch(function(err) {
            Helper.Util.HandleError(err)
          })
      })
    }

    pub.setAddGroupClick = function($btn_add_group, doc) {
      $btn_add_group.click(function(event) {
        if (event.shiftKey) {
          const input_str = prompt(
            "Please enter inputs for advanced 'Add Group'."
          )
          if (input_str) {
            postDbs('AddNewGroupAdvanced', { docid: doc.id, d_str: input_str })
              .then(function() {
                return postDbs('GetDocById', { docid: doc.id })
              })
              .then(function(resp) {
                refreshGroupList(resp, $btn_add_group.closest('.panel'))
              })
              .catch(function(err) {
                console.log(err)
                Helper.Util.HandleError(err)
              })
          }
        } else {
          postDbs('AddNewGroup', { docid: doc.id })
            .then(function(resp) {
              return postDbs('GetDocById', { docid: doc.id })
            })
            .then(function(resp) {
              refreshGroupList(resp, $btn_add_group.closest('.panel'))
            })
            .catch(function(err) {
              Helper.Util.HandleError(err)
            })
        }
      })
    }

    pub.setUserRemoveClick = function(
      $btn_user_remove,
      group_data,
      doc,
      user_id
    ) {
      $btn_user_remove.click(function() {
        postDbs('RemoveGroupMember', {
          groupid: group_data.group.id,
          userid_n: user_id
        })
          .then(function(resp) {
            return postDbs('GetDocById', { docid: doc.id })
          })
          .then(function(resp) {
            refreshGroupList(resp, $btn_user_remove.closest('.panel'))
          })
          .catch(function(err) {
            Helper.Util.HandleError(err)
          })
      })
    }

    pub.setDropDownBtn = function($btn_group, dropdn_msg, cb) {
      $btn_group.attr('role', 'group')

      const $btn = $btn_group.find('.btn')
      $btn.attr('data-toggle', 'dropdown')
      $btn.toggleClass('dropdown-toggle', true)

      const $ul = createNewDomElement('ul', ['dropdown-menu'], $btn_group)
      $ul.attr('role', 'menu')
      const $li = createNewDomElement('li', [], $ul)

      const $btn_confirm = createNewDomElement(
        'a',
        ['btn', 'btn-default', 'btn-sm'],
        $li
      )
      $btn_confirm.text(dropdn_msg)
      $btn_confirm.click(cb)
      return $btn_confirm
    }

    return pub
  })()

  var setDocDom = function(doc) {
    const $panel = createNewDomElement('div', ['panel'], $doc_container)

    const $panel_heading = createNewDomElement('div', ['panel-heading'], $panel)
    {
      const $title = createNewDomElement('a', ['doc_title'], $panel_heading)
      $title.text(doc.name)
      doms.setDocTitle($title, doc.id)

      const $doc_ui = createNewDomElement('div', ['doc_ui'], $panel_heading)
      {
        const $time_created = createNewDomElement(
          'p',
          ['doc_time_created'],
          $doc_ui
        )
        $time_created.text(' ' + doc.creationTimeStr)
        {
          $time_created.prepend(getIcon('fa-clock-o'))
        }

        if (user_id === doc.userid_n) {
          const $btn_add_group = createNewDomElement(
            'a',
            ['btn', 'btn-primary', 'btn-sm'],
            $doc_ui
          )
          {
            $btn_add_group.append(getIcon('fa-plus-square'))
            doms.setAddGroupClick($btn_add_group, doc)
          }

          const $btn_group = createNewDomElement('div', ['btn-group'], $doc_ui)
          const $btn_delete_all = createNewDomElement(
            'a',
            ['btn', 'btn-danger', 'btn-sm'],
            $btn_group
          )
          {
            $btn_delete_all.append(getIcon('fa-trash'))
          }
          const $btn_delete_doc_confirm = doms.setDropDownBtn(
            $btn_group,
            'Delete this document'
          )
          doms.setDocDeleteClick($btn_delete_doc_confirm, doc)
        }
      }
    }

    return refreshGroupList(doc, $panel)
  }

  var refreshGroupList = function(doc, $panel) {
    $panel.find('.panel-body').remove()

    const $panel_body = createNewDomElement('div', ['panel-body'], $panel)
    loadingIcon.appendTo($panel_body)
    if (doc.groups.length !== 0) {
      return postDbs('GetGroupsData', { groupids: doc.groups }).then(function(
        resp
      ) {
        loadingIcon.removeFrom($panel_body)
        resp.forEach(function(group_data) {
          if (
            user_id === doc.userid_n ||
            group_data.group.users.participating.includes(user_id)
          ) {
            setGroupDom(group_data, doc, $panel_body)
          }
        })
      })
    } else {
      loadingIcon.removeFrom($panel_body)
    }

    //        console.log(doc.groups);
    //        var promises = doc.groups.map(function(group_id){
    //            return postDbs('GetGroupData', {groupid: group_id});
    //        });
    //
    //        return Promise.all(promises).then(
    //            function(resp){
    //                loadingIcon.removeFrom($panel_body);
    //                resp.forEach(function(group_data){
    //                    setGroupDom(group_data, doc, $panel_body);
    //                });
    //            }
    //        );
  }

  var deleteDoc = function(doc, $panel) {
    $panel.remove()
  }

  var setGroupDom = function(group_data, doc, $panel_body) {
    const $group_row = createNewDomElement('div', ['group_row'], $panel_body)
    {
      const $btn_open = createNewDomElement(
        'btn',
        ['btn', 'btn-default', 'btn-sm', 'btn-open'],
        $group_row
      )
      $btn_open.text('Open')
      doms.setGroupOpenClick($btn_open, group_data, doc)

      const $title = createNewDomElement('a', ['group_title'], $group_row)
      $title.text(group_data.group.name)
      doms.setGroupTitle($title, group_data.group.id, doc)

      if (user_id === doc.userid_n) {
        const $group_ui = createNewDomElement('div', ['group_ui'], $group_row)
        {
          const $btn_group = createNewDomElement(
            'div',
            ['btn-group'],
            $group_ui
          )
          const $btn_delete = createNewDomElement(
            'a',
            ['btn', 'btn-danger', 'btn-sm'],
            $btn_group
          )
          {
            $btn_delete.append(getIcon('fa-trash'))
          }
          const $btn_delete_confirm = doms.setDropDownBtn(
            $btn_group,
            'Delete this group'
          )
          doms.setGroupDeleteClick($btn_delete_confirm, group_data, doc)
        }
      }

      const $member_row = createNewDomElement('div', ['member_row'], $group_row)
      {
        const $text = createNewDomElement('p', ['member_text'], $member_row)
        $text.append(getIcon('fa-users'))
        if (group_data.users.length + group_data.invited.length !== 0) {
          group_data.users.forEach(function(user) {
            const $btn_group = createNewDomElement(
              'div',
              ['btn-group'],
              $member_row
            )
            const $btn_user = createNewDomElement(
              'a',
              ['btn', 'btn-sm'],
              $btn_group
            )
            $btn_user.toggleClass(
              user_id === user.id ? 'btn-info' : 'btn-default',
              true
            )
            $btn_user.text(user.nick)
            const $btn_user_remove = doms.setDropDownBtn($btn_group, 'Remove')
            doms.setUserRemoveClick($btn_user_remove, group_data, doc, user.id)
          })

          group_data.invited.forEach(function(email) {
            const $btn_group = createNewDomElement(
              'div',
              ['btn-group'],
              $member_row
            )
            const $btn_user = createNewDomElement(
              'a',
              ['btn', 'btn-sm', 'btn-invited'],
              $btn_group
            )
            $btn_user.text(email)
            const $btn_cancel_invited = doms.setDropDownBtn(
              $btn_group,
              'Cancel invitation'
            )
            doms.setCancelInvitedClick(
              $btn_cancel_invited,
              group_data,
              doc,
              email
            )
          })
        } else {
          const $no_user = createNewDomElement(
            'a',
            ['member_empty_text'],
            $member_row
          )
          $no_user.text('This group is empty')
        }
        const $form_group = createNewDomElement(
          'div',
          ['form-group', 'invite_input'],
          $member_row
        )
        {
          const $input_group = createNewDomElement(
            'span',
            ['input-group'],
            $form_group
          )
          {
            const $input = createNewDomElement(
              'input',
              ['form-control', 'input-sm'],
              $input_group
            )
            $input.attr('placeholder', 'invite by email')

            const $button = createNewDomElement(
              'button',
              ['btn', 'btn-default', 'btn-sm'],
              $input_group
            )
            $button.append(getIcon('fa-plus'))
          }
          doms.setInviteClick($input_group, group_data, doc)
        }
      }
    }
  }

  var postDbs = function(op, msg) {
    return new Promise(function(resolve, reject) {
      const url = host + 'dbs?op=' + op
      const posting = $.post(url, msg)
      posting.success(function(resp) {
        resolve(resp)
      })
      posting.fail(function(resp) {
        reject(resp)
      })
    })
  }

  r2Doc.init = function(blob_host, _host, user_data) {
    $doc_container = $('#doc_container')
    host = _host
    user_id = JSON.parse(decodeURIComponent(user_data)).id
    refreshDocList()

    const $btn_refresh = $('#btn-refresh')
    $btn_refresh.click(function() {
      refreshDocList()
    })
  }
})((window.r2Doc = window.r2Doc || {}))
