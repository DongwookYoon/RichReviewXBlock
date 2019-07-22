/* eslint-disable camelcase,no-var,no-console,prefer-const,no-unused-vars,prettier/prettier,no-undef,no-lone-blocks,no-redeclare,no-throw-literal,new-cap,standard/computed-property-even-spacing,no-use-before-define */
/**
 * Created by dongwookyoon on 8/4/15.
 */

/** @namespace r2 */
;(function(r2) {
  r2.dom_model = (function() {
    const pub = {}

    let $tc_doc = null
    const $tc_pages = []
    let $tc_cur_page = null

    pub.init = function(doc) {
      $tc_doc = $('#tc_doc')

      loader.loadDoc(doc)

      pub.setCurPage(0)
    }

    pub.resize = function(width) {
      if ($tc_cur_page)
        $tc_cur_page.css('font-size', width / r2Const.FONT_SIZE_SCALE + 'px')
    }

    pub.setCurPage = function(n) {
      if ($tc_cur_page) $tc_cur_page.css('display', 'none')
      $tc_cur_page = $tc_pages[n]
      $tc_cur_page.css('display', 'block')
    }

    pub.getCurPage = function() {
      return $tc_cur_page
    }

    pub.cbAudioPlay = function(annot_id) {
      r2.radialMenu.changeCenterIcon(
        'rm_' + r2.util.escapeDomId(annot_id),
        'fa-pause'
      )
    }

    pub.cbAudioStop = function(annot_id) {
      r2.radialMenu.changeCenterIcon(
        'rm_' + r2.util.escapeDomId(annot_id),
        'fa-play'
      )
    }

    pub.cbRecordingStop = function(annot_id) {
      r2.radialMenu.changeCenterIcon(
        'rm_' + r2.util.escapeDomId(annot_id),
        'fa-play'
      )
      r2.onScreenButtons.changeVoiceCommentBtnIcon('fa-stop', 'fa-microphone')
    }

    pub.cbRecordingBgn = function(annot_id) {
      r2.radialMenu.changeCenterIcon(
        'rm_' + r2.util.escapeDomId(annot_id),
        'fa-stop'
      )
      r2.onScreenButtons.changeVoiceCommentBtnIcon('fa-microphone', 'fa-stop')
    }

    pub.remove = function(annot_id) {
      const annot_id_esc = r2.util.escapeDomId(annot_id)
      $('#' + annot_id_esc).remove()
    }

    pub.getPieceDom = function(piece) {
      const $piece = $tc_cur_page.find('#' + piece.GetId())
      return $piece
    }

    /* submodule for data loading bgn */
    var loader = (function() {
      const pub_loader = {}

      pub_loader.loadDoc = function(doc) {
        for (let i = 0, l = doc.GetNumPages(); i < l; ++i) {
          const page = doc.GetPage(i)
          const $tc_page = loadPage(page, i)
          $tc_doc.append($tc_page)
          $tc_page.css('display', 'none')
          $tc_pages.push($tc_page)
        }
        insertCornellXinstruction($tc_pages[0])
      }

      var loadPage = function(page, npage) {
        const $tc_page = $(document.createElement('div'))
        $tc_page.toggleClass('tc_page', true)

        const appendTightRow = function($target, cls) {
          const $tight_row = $(document.createElement('div'))
          $tight_row.toggleClass(cls, true)
          $tight_row.toggleClass('tc_rows', true)
          $tight_row.toggleClass('tc_tight', true)

          $target.append($tight_row)
          return $tight_row
        }

        $head_row = appendTightRow($tc_page)
        $body_row = appendTightRow($tc_page)
        $foot_row = appendTightRow($tc_page)

        const $head = loadRegion('tc_head', page.GetRegion(0))
        $head_row.append($head)
        const $left = loadRegion('tc_left', page.GetRegion(1))
        $body_row.append($left)
        const $rght = loadRegion('tc_rght', page.GetRegion(2))
        $body_row.append($rght)
        const $foot = loadRegion('tc_foot', page.GetRegion(3))
        $foot_row.append($foot)

        $tc_page.regions = []
        $tc_page.regions.push($head)
        $tc_page.regions.push($left)
        $tc_page.regions.push($rght)
        $tc_page.regions.push($foot)

        $tc_page.append($head_row)
        $tc_page.append($body_row)
        $tc_page.append($foot_row)

        return $tc_page
      }

      var loadRegion = function(cls, region) {
        const $tight_col = $(document.createElement('div'))
        $tight_col.toggleClass(cls, true)
        $tight_col.toggleClass('tc_cols', true)
        $tight_col.toggleClass('tc_tight', true)

        for (let i = 0, l = region.child.length; i < l; i++) {
          const piece_text = region.child[i]
          if (!(piece_text instanceof r2.PieceText)) {
            throw new Error('invalid input file')
          }
          pub.createBodyText($tight_col, piece_text)
        }

        return $tight_col
      }

      var insertCornellXinstruction = function($tc_page0) {
        if (r2.ctx.lti) {
          r2.HtmlTemplate.loadOnce('cornellx_intro').then(function(resp) {
            const $div = $('<div></div>')
            $div.attr('id', 'cornellx_inst')
            $div.html(resp)
            $tc_page0.prepend($div)
            return null
          })
        }
      }

      return pub_loader
    })()

    pub.createBodyText = function($tight_col, piece_text) {
      const $comment = appendPieceGroup($tight_col, 'tc_comment_text')
      $comment.attr(
        'aria-label',
        typeof piece_text.GetPieceText() === 'string'
          ? piece_text.GetPieceText()
          : 'empty texts'
      )
      $comment.attr('role', 'document')
      const $piece = $(document.createElement('div'))
      $piece.toggleClass('tc_piece', true)
      piece_text.SetDom($piece)

      const id = piece_text.GetId()
      const creationTime = 0
      const content_size = piece_text.GetContentSize()

      const tt_size = piece_text.GetCurTtData()

      $piece.attr('id', id)
      setPieceProperties(
        $piece,
        id,
        creationTime,
        content_size.x,
        0,
        tt_size[1],
        tt_size[2]
      )

      const $content = $(document.createElement('div'))
      $content.toggleClass('tc_content', true)
      $content.width(content_size.x * r2Const.FONT_SIZE_SCALE + 'em')
      $content.height(content_size.y * r2Const.FONT_SIZE_SCALE + 'em')

      $piece.append($content)
      $comment.append($piece)
    }

    pub.createTextTearing = function(piece_teared) {
      // time: 2014-12-21T13...
      // user: 'red user'
      // op: 'CreateComment'
      // type: 'TextTearing'
      // anchorTo: {type: 'PieceText', id: pid, page: 2} or
      //           {type: 'CommentAudio', id: annotId, page: 2, time: [t0, t1]}
      // data: {pid: id, height: 0.1}

      const $anchor = $tc_pages[piece_teared.GetNumPage()].find(
        '#' + piece_teared.GetParent().GetId()
      )
      const dom_anchor = $anchor.get(0)
      if (dom_anchor) {
        const $comment = appendPieceGroup($anchor, 'tc_comment_texttearing')
        $comment.attr('aria-label', 'whitespace')
        $comment.attr('role', 'document')
        const id = piece_teared.GetId()

        const $piece = $(document.createElement('div'))
        $piece.toggleClass('tc_piece', true)
        piece_teared.SetDom($piece)

        $piece.attr('id', id)
        setPieceProperties(
          $piece,
          id,
          0,
          dom_anchor.pp.w,
          dom_anchor.pp.tt_depth + 1,
          dom_anchor.pp.tt_x,
          dom_anchor.pp.tt_w
        )

        const $content = $(document.createElement('div'))
        $content.toggleClass('tc_content', true)
        $content.toggleClass('tc_piece_text', true)
        $content.height(
          piece_teared.GetContentSize().y * r2Const.FONT_SIZE_SCALE + 'em'
        )
        $content.width(dom_anchor.pp.w * r2Const.FONT_SIZE_SCALE + 'em')
        $content[0].dom_model = piece_teared
        $piece.append($content)

        $comment.append($piece)
        $anchor
          .children()
          .first()
          .after($comment)
        return true
      }
      return false
    }

    pub.updateSizeTextTearing = function(piece_teared) {
      const $piece = $('#' + piece_teared.GetId())
      $piece
        .find('.tc_content')
        .height(
          piece_teared.GetContentSize().y * r2Const.FONT_SIZE_SCALE + 'em'
        )
    }

    pub.createCommentVoice = function(annot, pagen, live_recording) {
      const user = r2.userGroup.GetUser(annot.GetUsername())
      const annot_id = annot.GetId()
      const annot_id_esc = r2.util.escapeDomId(annot_id)

      const $anchor = $tc_pages[pagen].find('#' + annot.GetAnchorPid())
      const dom_anchor = $anchor.get(0)
      if (dom_anchor) {
        const $comment = appendPieceGroup($anchor, 'tc_comment_voice')
        $comment.attr('id', annot_id_esc)
        $comment.attr('aria-label', 'voice comment')
        $comment.attr('role', 'article')
        $anchor
          .children()
          .first()
          .after($comment)

        {
          /* add menu */
          const rm_ratio = getCommentRmRatio($comment)
          const rm_size = rm_ratio * 0.00063

          const $rm = r2.radialMenu.create(
            'rm_' + annot_id_esc,
            rm_size,
            live_recording === true ? 'fa-stop' : 'fa-play',
            'play or stop audio',
            function() {
              if (r2App.mode === r2App.AppModeEnum.RECORDING) {
                if (annot_id === r2App.cur_recording_annot.GetId()) {
                  r2.recordingCtrl.stop(true) /* to upload */
                  r2.log.Log_Simple('Recording_Stop_RadialMenu')
                  r2.radialMenu.changeCenterIcon(
                    'rm_' + annot_id_esc,
                    'fa-play'
                  )
                }
              } else if (r2App.mode === r2App.AppModeEnum.IDLE) {
                r2.rich_audio.play(annot_id, -1)
                r2.log.Log_AudioPlay(
                  'play_btn',
                  annot_id,
                  r2.audioPlayer.getPlaybackTime()
                )
              } else if (r2App.mode === r2App.AppModeEnum.REPLAYING) {
                if (r2App.cur_annot_id === annot_id) {
                  r2.log.Log_AudioStop(
                    'stop_btn',
                    r2.audioPlayer.getCurAudioFileId(),
                    r2.audioPlayer.getPlaybackTime()
                  )
                  r2.rich_audio.stop()
                } else {
                  r2.rich_audio.play(annot_id, -1)
                  r2.log.Log_AudioPlay(
                    'play_btn',
                    annot_id,
                    r2.audioPlayer.getPlaybackTime()
                  )
                }
              }
            }
          )
          /*
                    r2.radialMenu.addBtnCircular($rm, 'fa-chevron-up', 'fold layout', function(){
                        ;
                    }); */
          r2.radialMenu.addBtnCircular($rm, 'fa-link', 'share', function() {
            if (r2App.mode === r2App.AppModeEnum.RECORDING) {
              return
            }
            const lnk =
              r2App.server_url +
              'viewer?access_code=' +
              r2.ctx.pdfid +
              '&docid=' +
              r2.ctx.docid +
              '&groupid=' +
              r2.ctx.groupid +
              '&comment=' +
              encodeURIComponent(annot_id)
            window.prompt('Link to the Comment', lnk)
          })
          /*
                    r2.radialMenu.addBtnCircular($rm, 'fa-chevron-down', 'expand layout', function(){
                        ;
                    }); */
          r2.radialMenu.addBtnCircular($rm, 'fa-trash', 'erase', function() {
            if (r2App.mode === r2App.AppModeEnum.RECORDING) {
              return
            }
            if (r2App.mode === r2App.AppModeEnum.REPLAYING) {
              r2.rich_audio.stop()
            }
            if (r2.userGroup.cur_user.name === user.name) {
              const annottodelete = r2App.annots[annot_id]
              if (r2.removeAnnot(annot_id, true, false)) {
                // askuser, mute
                r2Sync.uploader.pushCmd(
                  annottodelete.ExportToCmdDeleteComment()
                )
                r2.log.Log_Simple('RemoveAnnot_Audio_RadialMenu')
              }
            } else {
              alert('You can only delete your own comments.')
            }
          })
          r2.radialMenu.finishInit(
            $rm,
            user.color_radial_menu_unselected,
            user.color_radial_menu_selected
          )

          const rm_x =
            getCommentTtIndentX($comment) -
            r2Const.RADIALMENU_OFFSET_X * rm_ratio
          $rm.css(
            'left',
            rm_x / rm_size / r2Const.RAIDALMENU_FONTSIZE_SCALE + 'em'
          )
          $comment.prepend($rm)
        }

        return true
      }
      return false
    }

    pub.appendPieceVoice = function(annot_id, order, time, pieceaudio) {
      const annot_id_esc = r2.util.escapeDomId(annot_id)

      const $comment = $('#' + annot_id_esc)
      const dom_comment = $comment.get(0)
      if (dom_comment) {
        const i = $comment.find('.tc_piece').length
        const $anchor = $comment.parent()
        const dom_anchor = $anchor.get(0)

        const id = r2.pieceHashId.voice(annot_id, order)

        const $piece = $(document.createElement('div'))
        $piece.toggleClass('tc_piece', true)
        pieceaudio.SetDom($piece)

        $piece.attr('id', id)
        setPieceProperties(
          $piece,
          id,
          new Date(time).getTime(),
          dom_anchor.pp.w,
          dom_anchor.pp.tt_depth + 1,
          dom_anchor.pp.tt_x,
          dom_anchor.pp.tt_w
        )

        const $content = $(document.createElement('div'))
        $content.toggleClass('tc_content', true)
        $content.height(
          r2Const.PIECEAUDIO_HEIGHT * r2Const.FONT_SIZE_SCALE + 'em'
        )
        $content.width($anchor.get(0).pp.w * r2Const.FONT_SIZE_SCALE + 'em')

        $piece.append($content)
        $comment.append($piece)
      }
    }

    pub.appendPieceKeyboard = function(
      username,
      annot_id,
      pid,
      anchor_id,
      creation_time,
      dom_piecekeyboard,
      doc_model_piecekeyboard
    ) {
      const user = r2.userGroup.GetUser(username)
      const annot_id_esc = r2.util.escapeDomId(annot_id)
      if ($('#' + annot_id_esc).length !== 0) {
        return true
      }
      const $anchor = $('#' + anchor_id)
      const $dom_piecekeyboard = $(dom_piecekeyboard)
      const dom_anchor = $anchor.get(0)
      if (dom_anchor) {
        const $comment = appendPieceGroup($anchor, 'tc_comment_keyboard')
        $comment.attr('id', annot_id_esc)
        const $piece = $(document.createElement('div'))
        $piece.toggleClass('tc_piece', true)
        doc_model_piecekeyboard.SetDom($piece)
        $piece.attr('id', pid)
        setPieceProperties(
          $piece,
          anchor_id,
          creation_time,
          dom_anchor.pp.w,
          dom_anchor.pp.tt_depth + 1,
          dom_anchor.pp.tt_x,
          dom_anchor.pp.tt_w
        )

        $piece.append($dom_piecekeyboard)
        $dom_piecekeyboard.toggleClass('tc_content', true)
        $dom_piecekeyboard.toggleClass('tc_piece_keyboard', true)
        $dom_piecekeyboard.css(
          'width',
          dom_anchor.pp.w * r2Const.FONT_SIZE_SCALE + 'em'
        )
        $comment.append($piece)

        {
          /* add menu */
          const rm_ratio = getPieceRmRatio($piece)
          const rm_size = rm_ratio * 0.00063
          const rm_btn_size = 30

          const $rm = r2.radialMenu.create(
            'rm_' + pid,
            rm_size,
            'fa-keyboard-o',
            'select text comment',
            function() {
              doc_model_piecekeyboard.edit()
            }
          )
          /*
                    r2.radialMenu.addBtnCircular($rm, 'fa-chevron-up', 'fold layout', function(){
                        ;
                    }); */
          r2.radialMenu.addBtnCircular($rm, 'fa-link', 'share', function() {
            if (r2App.mode === r2App.AppModeEnum.RECORDING) {
              return
            }
            const lnk =
              r2App.server_url +
              'viewer?access_code=' +
              r2.ctx.pdfid +
              '&docid=' +
              r2.ctx.docid +
              '&groupid=' +
              r2.ctx.groupid +
              '&comment=' +
              encodeURIComponent(annot_id)
            window.prompt('Link to the Comment', lnk)
          })
          /*
                    r2.radialMenu.addBtnCircular($rm, 'fa-chevron-down', 'expand layout', function(){
                        ;
                    }); */
          r2.radialMenu.addBtnCircular($rm, 'fa-trash', 'erase', function() {
            if (r2App.mode === r2App.AppModeEnum.RECORDING) {
              return
            }
            if (r2.userGroup.cur_user.name === username) {
              if (r2.removeAnnot(annot_id, true, false)) {
                // askuser, mute
                r2Sync.uploader.pushCmd(
                  doc_model_piecekeyboard.ExportToCmdDeleteComment()
                )
                r2.log.Log_Simple('RemoveAnnot_Text_OnScrBtn')
              }
            } else {
              alert('You can only delete your own comments.')
            }
          })
          r2.radialMenu.finishInit(
            $rm,
            user.color_radial_menu_unselected,
            user.color_radial_menu_selected
          )

          const rm_x =
            getPieceTtIndentX($piece) - r2Const.RADIALMENU_OFFSET_X * rm_ratio

          $rm.css(
            'left',
            rm_x / rm_size / r2Const.RAIDALMENU_FONTSIZE_SCALE + 'em'
          )
          // $rm.css('top', (rm_size*0.4*rm_btn_size)/rm_size+'em');

          $comment.prepend($rm)
        }

        $anchor
          .children()
          .first()
          .after($comment)
        return true
      }
      return false
    }

    pub.appendPieceEditableAudio = function(
      username,
      annot_id,
      pid,
      anchor_id,
      creation_time,
      dom,
      piece,
      live_recording
    ) {
      const user = r2.userGroup.GetUser(username)
      const annot_id_esc = r2.util.escapeDomId(annot_id)
      if ($('#' + annot_id_esc).length !== 0) {
        return true
      }
      const $anchor = $('#' + anchor_id)
      const $dom_piecekeyboard = $(dom)
      const dom_anchor = $anchor.get(0)
      if (dom_anchor) {
        const $comment = appendPieceGroup($anchor, 'tc_comment_editable_audio')
        $comment.attr('id', annot_id_esc)
        const $piece = $(document.createElement('div'))
        $piece.toggleClass('tc_piece', true)
        piece.SetDom($piece)
        $piece.attr('id', pid)
        setPieceProperties(
          $piece,
          anchor_id,
          creation_time,
          dom_anchor.pp.w,
          dom_anchor.pp.tt_depth + 1,
          dom_anchor.pp.tt_x,
          dom_anchor.pp.tt_w
        )

        $piece.append($dom_piecekeyboard)
        $dom_piecekeyboard.toggleClass('tc_content', true)
        $dom_piecekeyboard.toggleClass('tc_piece_editable_audio', true)
        $dom_piecekeyboard.css(
          'width',
          dom_anchor.pp.w * r2Const.FONT_SIZE_SCALE + 'em'
        )
        $comment.append($piece)

        {
          /* add menu */
          const rm_ratio = getCommentRmRatio($comment)
          const rm_size = rm_ratio * 0.00063

          const $rm = r2.radialMenu.create(
            'rm_' + annot_id_esc,
            rm_size,
            live_recording === true ? 'fa-stop' : 'fa-play',
            'play or stop audio',
            function() {
              if (r2App.mode === r2App.AppModeEnum.RECORDING) {
                if (annot_id === r2App.cur_recording_piece.GetAnnotId()) {
                  r2.recordingCtrl.stop(true) /* to upload */
                  r2.log.Log_Simple('Recording_Stop_RadialMenu')
                  r2.radialMenu.changeCenterIcon(
                    'rm_' + annot_id_esc,
                    'fa-play'
                  )
                }
              } else if (r2App.mode === r2App.AppModeEnum.IDLE) {
                var piece = r2App.pieces_cache[pid]
                if (piece.simplespeech) {
                  if (
                    typeof piece.simplespeech !== 'undefined' &&
                    piece.simplespeech.isContentChanged()
                  ) {
                    piece.simplespeech
                      .synthesizeNewAnnot(annot_id)
                      .then(function() {
                        r2.rich_audio.play(annot_id, -1)
                      })
                  } else if (typeof piece.speak_ctrl !== 'undefined') {
                    piece.renderAndPlay()
                  } else {
                    r2.rich_audio.play(
                      annot_id,
                      -1,
                      function() {
                        r2.radialMenu.bgnLoading(
                          'rm_' + r2.util.escapeDomId(annot_id)
                        )
                      },
                      function() {
                        r2.radialMenu.endLoading(
                          'rm_' + r2.util.escapeDomId(annot_id)
                        )
                      }
                    )
                  }
                } else if (piece.newspeak) {
                  r2.log.Log_Simple('NewSpeak_Play_BUTTON')
                  piece.Play(
                    function() {
                      r2.radialMenu.bgnLoading(
                        'rm_' + r2.util.escapeDomId(annot_id)
                      )
                    },
                    function() {
                      r2.radialMenu.endLoading(
                        'rm_' + r2.util.escapeDomId(annot_id)
                      )
                    }
                  )
                }
              } else if (r2App.mode === r2App.AppModeEnum.REPLAYING) {
                var piece = r2App.pieces_cache[pid]
                if (piece.simplespeech) {
                  if (r2App.cur_annot_id === annot_id) {
                    r2.log.Log_AudioStop(
                      'stop_btn',
                      r2.audioPlayer.getCurAudioFileId(),
                      r2.audioPlayer.getPlaybackTime()
                    )
                    r2.rich_audio.stop()
                  } else {
                    r2.rich_audio.play(
                      annot_id,
                      -1,
                      function() {
                        r2.radialMenu.bgnLoading(
                          'rm_' + r2.util.escapeDomId(annot_id)
                        )
                      },
                      function() {
                        r2.radialMenu.endLoading(
                          'rm_' + r2.util.escapeDomId(annot_id)
                        )
                      }
                    )
                    r2.log.Log_AudioPlay(
                      'play_btn',
                      annot_id,
                      r2.audioPlayer.getPlaybackTime()
                    )
                  }
                } else if (piece.newspeak) {
                  if (r2App.cur_annot_id === annot_id) {
                    r2.speechSynth.cancel()
                    r2.log.Log_Simple('NewSpeak_Stop_BUTTON')
                  } else {
                    r2.speechSynth.cancel().then(function() {
                      r2.log.Log_Simple('NewSpeak_Play_ANOTHERBUTTONPLAY')
                      piece.Play(
                        function() {
                          r2.radialMenu.bgnLoading(
                            'rm_' + r2.util.escapeDomId(annot_id)
                          )
                        },
                        function() {
                          r2.radialMenu.endLoading(
                            'rm_' + r2.util.escapeDomId(annot_id)
                          )
                        }
                      )
                    })
                    r2.log.Log_Simple('NewSpeak_Stop_ANOTHERBUTTONPLAY')
                  }
                }
              }
            }
          )
          /*
                    r2.radialMenu.addBtnCircular($rm, 'fa-chevron-up', 'fold layout', function(){
                        ;
                    }); */
          r2.radialMenu.addBtnCircular($rm, 'fa-link', 'share', function() {
            if (r2App.mode === r2App.AppModeEnum.RECORDING) {
              return
            }
            const lnk =
              r2App.server_url +
              'viewer?access_code=' +
              r2.ctx.pdfid +
              '&docid=' +
              r2.ctx.docid +
              '&groupid=' +
              r2.ctx.groupid +
              '&comment=' +
              encodeURIComponent(annot_id)
            window.prompt('Link to the Comment', lnk)
          })
          /*
                    r2.radialMenu.addBtnCircular($rm, 'fa-chevron-down', 'expand layout', function(){
                        ;
                    }); */
          r2.radialMenu.addBtnCircular($rm, 'fa-trash', 'erase', function() {
            if (r2App.mode === r2App.AppModeEnum.RECORDING) {
              return
            }
            if (r2.userGroup.cur_user.name === user.name) {
              if (r2.removeAnnot(annot_id, true, false)) {
                // askuser, mute
                r2Sync.uploader.pushCmd(piece.ExportToCmdDeleteComment())
                r2.log.Log_Simple('RemoveAnnot_NewSpeak_RadialMenu')
              }
            } else {
              alert('You can only delete your own comments.')
            }
          })
          r2.radialMenu.finishInit(
            $rm,
            user.color_radial_menu_unselected,
            user.color_radial_menu_selected
          )

          const rm_x =
            getCommentTtIndentX($comment) -
            r2Const.RADIALMENU_OFFSET_X * rm_ratio
          $rm.css(
            'left',
            rm_x / rm_size / r2Const.RAIDALMENU_FONTSIZE_SCALE + 'em'
          )
          $comment.prepend($rm)
        }

        $anchor
          .children()
          .first()
          .after($comment)
        return true
      }
      return false
    }

    var appendPieceGroup = function($target, cls) {
      const $comment = $(document.createElement('div'))
      $comment.toggleClass('tc_piecegroup', true)
      $comment.toggleClass(cls, true)
      $comment.mousedown(function(event) {
        // event.preventDefault(); // prevent focus
      })
      pub.focusCtrl.setFocusable($comment)

      $target.append($comment)
      return $comment
    }

    var setPieceProperties = function(
      $target,
      id,
      time,
      w,
      tt_depth,
      tt_x,
      tt_w
    ) {
      const dom = $target.get(0)
      dom.pp = {}
      dom.pp.id = id
      dom.pp.time = time
      dom.pp.w = w
      dom.pp.tt_depth = tt_depth
      dom.pp.tt_x = tt_x
      dom.pp.tt_w = tt_w
    }

    const getRmRatio = function(tt_depth) {
      return Math.pow(0.8, tt_depth)
    }

    var getCommentRmRatio = function($comment) {
      const $anchor = $comment.parent()
      const dom_anchor = $anchor.get(0)
      return getRmRatio(dom_anchor.pp.tt_depth + 1)
    }

    var getPieceRmRatio = function($piece) {
      const dom = $piece.get(0)
      return getRmRatio(dom.pp.tt_depth)
    }

    const getTtIndentX = function(tt_depth, tt_x) {
      return (
        tt_x +
        (tt_depth === 0 ? 0 : tt_depth) * r2Const.PIECE_TEXTTEARING_INDENT
      )
    }

    var getCommentTtIndentX = function($comment) {
      const $anchor = $comment.parent()
      const dom_anchor = $anchor.get(0)
      return getTtIndentX(dom_anchor.pp.tt_depth + 1, dom_anchor.pp.tt_x)
    }

    var getPieceTtIndentX = function($piece) {
      const dom = $piece.get(0)
      return getTtIndentX(dom.pp.tt_depth, dom.pp.tt_x)
    }

    pub.focusCtrl = (function() {
      const pub_fc = {}
      let last_focused_comment = null

      pub_fc.focusAnnot = function(annot_id) {
        const $dom = $tc_cur_page.find('#' + r2.util.escapeDomId(annot_id))
        if ($dom.hasClass('tc_piecegroup')) {
          $dom.focus()
        } else {
          console.error('focusCtrl.focusAnnot', $dom)
        }
        return $dom
      }

      pub_fc.focusPiece = function(piece_id) {
        const $dom = $tc_cur_page.find('#' + r2.util.escapeDomId(piece_id))
        if ($dom.hasClass('tc_piece')) {
          r2.util.focusWithoutScroll($dom.parent()) // focus on .tc_piecegroup
        } else {
          console.error('focusCtrl.focusPiece', $dom)
        }
      }

      pub_fc.next = function() {
        const $focused = $(':focus')
        if ($focused.hasClass('tc_piecegroup')) {
          const $next = $focused.next('.tc_piecegroup')
          if ($next.length !== 0) {
            $next.focus()
          } else if ($focused.parent().hasClass('tc_cols')) {
            // when it's a topmost comment/text,
            const nextTcCols = getNextTcCols($focused.parent())
            nextTcCols
              .find('.tc_piecegroup')
              .first()
              .focus()
          } else {
            // when it's a nested comment
            $focused
              .parent()
              .parent()
              .find('.tc_piecegroup')
              .first()
              .focus()
          }
        } else if ($focused.hasClass('rm_btn')) {
          r2.radialMenu.getNextRmBtn($focused).focus()
        } else {
          $tc_cur_page
            .find('.tc_piecegroup')
            .first()
            .focus()
        }
      }

      pub_fc.prev = function() {
        const $focused = $(':focus')
        if ($focused.hasClass('tc_piecegroup')) {
          const $prev = $focused.prev('.tc_piecegroup')
          if ($prev.length !== 0) {
            $prev.focus()
          } else if ($focused.parent().hasClass('tc_cols')) {
            // when it's a topmost comment/text,
            const nextTcCols = getPrevTcCols($focused.parent())
            nextTcCols
              .children()
              .filter('.tc_piecegroup')
              .last()
              .focus()
          } else {
            // when it's a nested comment
            $focused
              .parent()
              .children()
              .filter('.tc_piecegroup')
              .last()
              .focus()
          }
        } else if ($focused.hasClass('rm_btn')) {
          r2.radialMenu.getPrevRmBtn($focused).focus()
        } else {
          $tc_cur_page
            .find('.tc_piecegroup')
            .last()
            .focus()
        }
      }

      pub_fc.in = function() {
        const $focused = $(':focus')
        if ($focused.hasClass('tc_piecegroup')) {
          const $in = $focused.find('.tc_piecegroup')
          if ($in.length !== 0) {
            $in.first().focus()
          }
        } else if ($focused.hasClass('rm_btn')) {
          r2.radialMenu.getNextRmBtn($focused).focus()
        }
      }

      pub_fc.up = function() {
        const $focused = $(':focus')
        if ($focused.hasClass('tc_piecegroup')) {
          const $up = $focused.parent().parent()
          if ($up.hasClass('tc_piecegroup')) {
            $up.focus()
          }
        } else if ($focused.hasClass('rm_btn')) {
          r2.radialMenu.getPrevRmBtn($focused).focus()
        }
      }

      pub_fc.esc = function() {
        const $focused = $(':focus')
        if ($focused.hasClass('r2_piecekeyboard_textbox')) {
          $focused
            .parent()
            .parent()
            .parent()
            .parent()
            .focus()
        } else if ($focused.hasClass('rm_btn')) {
          $focused
            .parents('.tc_piecegroup')
            .first()
            .focus()
        } else if ($focused.hasClass('tc_piecegroup')) {
          $('#dashboard-comments-title').focus()
        } else if (last_focused_comment !== 0) {
          last_focused_comment.focus()
        }
      }

      pub_fc.setFocusable = function($target) {
        $target.attr('tabindex', 0)
        $target.get(0).addEventListener('focus', function() {
          // $(this).css('outline', 'rgba(77, 144, 254, 0.5) solid 1px');
          // $(this).css('box-shadow', 'inset 0 0 0 0.003em rgba(77, 144, 254, 0.5)');
          last_focused_comment = $(this)
        })
        $target.get(0).addEventListener('blur', function() {
          $(this).css('outline', 'none')
          $(this).css('box-shadow', 'none')
        })
        /*
                $target.on(
                    'focus',
                    function(evt){
                        $(this).css('outline', 'rgba(77, 144, 254, 0.5) solid 1px');
                        $(this).css('box-shadow', 'inset 0 0 0 0.003em rgba(77, 144, 254, 0.5)');
                        last_focused_comment = $(this);
                    }
                ).on(
                    'blur',
                    function(evt){
                        $(this).css('outline', 'none');
                        $(this).css('box-shadow', 'none');
                    }
                ); */
      }

      var getPrevTcCols = function($tc_cols) {
        return getTcColsOffset($tc_cols, -1)
      }
      var getNextTcCols = function($tc_cols) {
        return getTcColsOffset($tc_cols, +1)
      }
      var getTcColsOffset = function($tc_cols, offset) {
        const $l = $tc_cols
          .parent()
          .parent()
          .find('.tc_cols')
        for (let i = 0, l = $l.length; i < l; ++i) {
          if ($tc_cols[0] === $l[i]) {
            return $($l[(i + offset + l) % l])
          }
        }
        return null
      }

      return pub_fc
    })()

    return pub
  })()
})((window.r2 = window.r2 || {}))
