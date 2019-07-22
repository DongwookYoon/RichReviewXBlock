/* eslint-disable camelcase,no-var,no-console,prefer-const,no-unused-vars,prettier/prettier,no-undef,no-lone-blocks,no-redeclare,no-throw-literal,new-cap */
/**
 * Simplespeech-UI
 * An implementation of SS's UI as a contenteditable div.
 * This is the 'View' in MVC paradigm.
 * @module simplespeech
 * @requires jQuery
 * @author ian
 * Created by ian on 03/01/2016.
 */
;(function(r2) {
  'use strict'

  r2.transcriptionUI = function(_textbox, _overlay, _annotid, _annotids) {
    const pub = {}

    // DOM elements
    const $textbox = $(_textbox)
    const $overlay = $(_overlay)
    const carret = {
      idx_anchor: 0,
      idx_focus: 0,
      is_collapsed: true,
      idx_bgn: 0,
      idx_end: 0
    }
    let copied_ctrl_talkens = null
    let content_changed = false
    let insert_pos = 0
    let is_recording_and_synthesizing = false
    const annotid_copy = _annotid // The r2.Annot id of the SimpleSpeech piece. This is a copy from the piece's this._annotid.
    const annotids_copy = _annotids // The list ([]) of r2.Annot ids for the base recordings. This is a copy from the piece's this._annotids.
    let base_data_buf = []

    const insertNewTalken = insertNewTalkenSimpleSpeech

    // Listener callbacks
    pub.on_input = null
    pub.bgn_streaming = null
    pub.end_streaming = null

    /*
     * Initializer
     */

    function _init() {
      // Setup event handlers
      $textbox[0].addEventListener('keyup', function(e) {
        checkCarretPositionUpdate(e)
      })

      $textbox[0].addEventListener('focus', function(e) {
        document.addEventListener('selectionchange', selectionCb)
      })
      $textbox[0].addEventListener('blur', function(e) {
        document.removeEventListener('selectionchange', selectionCb)
      })

      $textbox[0].addEventListener('keydown', onKeyDown)
      $textbox[0].addEventListener('keypress', onKeyPress)
      $textbox[0].addEventListener('dragstart', function(e) {
        e.preventDefault()
        setCarret(carret.idx_anchor)
        getCarret()
      })

      function selectionCb(e) {
        checkCarretPositionUpdate(e)
      }
    }

    /*
     * Public functions
     */

    pub.isContentChanged = function() {
      return content_changed
    }

    pub.setCaptionTemporary = function(words, base_annotid) {}

    pub.setCaptionFinal = function(words, base_annotid) {
      words.forEach(function(data) {
        const next_base_data = {
          word: data[0],
          data: [
            {
              word: data[0],
              bgn: data[1],
              end: data[2],
              conf: data[3], // confidence
              annotid: base_annotid
            }
          ]
        }
        base_data_buf.push(next_base_data)
      })
    }

    pub.bgnCommenting = function() {
      is_recording_and_synthesizing = true
      r2App.is_recording_or_transcribing = true
      $textbox.focus()

      $textbox.children('span').each(function(idx) {
        this.$vt.toggleClass('fresh-recording', false)
        $(this).toggleClass('fresh-recording', false)
        $(this).toggleClass('old-recording', true)
      })
      insert_pos = getCarret().idx_anchor
      insertRecordingIndicator.insert(insert_pos++)

      renderViewTalkens()
    }

    pub.bgnCommentingAsync = function() {
      r2.tooltipAudioWaveform.show()
    }

    pub.endCommenting = function() {
      r2.tooltipAudioWaveform.dismiss()
    }

    pub.doneCommentingAsync = function() {
      insertRecordingIndicator.dismiss()
      insert_pos -= 1

      flushBaseDataBuf()

      punctuationUtil.periodForEndCommenting(insert_pos - 1)

      $textbox.children('span').each(function(idx) {
        $(this).toggleClass('old-recording', false)
      })
      getCarret()

      r2App.is_recording_or_transcribing = false
    }

    pub.getTalkenData = function() {
      // save the transcription data for backup
      const td = []
      $textbox.children('span').each(function(idx) {
        td.push($(this)[0].talken_data)
      })
      return td
    }

    pub.drawDynamic = function(duration) {
      if (r2App.mode === r2App.AppModeEnum.REPLAYING) {
        $textbox.children().each(function(idx) {
          if (
            this.rendered_data.bgn < duration / 1000 &&
            duration / 1000 < this.rendered_data.end
          ) {
            this.$vt.toggleClass('replay_highlight', true)
            setCarret(idx + 1)
          } else {
            this.$vt.toggleClass('replay_highlight', false)
          }
        })
      } else {
        $textbox.children().each(function(idx) {
          this.$vt.toggleClass('replay_highlight', false)
        })
      }
    }

    pub.synthesizeNewAnnot = function(_annot_id) {
      pub.bgn_streaming()
      return r2.audioSynthesizer
        .run(talkenRenderer.getCtrlTalkens())
        .then(function(result) {
          r2App.annots[_annot_id].SetRecordingAudioFileUrl(
            result.url,
            result.blob,
            result.buffer
          )
          return null
        })
        .then(function() {
          r2.gestureSynthesizer
            .run(_annot_id, talkenRenderer.getCtrlTalkens_Gesture())
            .then(function() {
              return null
            })
          is_recording_and_synthesizing = false
          content_changed = false
          pub.end_streaming()
          return null
        })
    }

    pub.SetData = function(data) {
      $textbox.empty()
      data.forEach(function(datum) {
        insertNewTalken(datum, $textbox.children().length, false) // is_fresh = false;
      })
      renderViewTalkens()
      talkenRenderer.invalidate()
      pub.synthesizeNewAnnot(annotid_copy)
      r2App.invalidate_size = true
      r2App.invalidate_page_layout = true
    }

    /*
     * Putting commas and capitalize words
     */
    var punctuationUtil = (function() {
      const pub_pu = {}

      pub_pu.toCapitalize = function(pos) {
        pos -= 1
        while (
          pos >= 0 &&
          $textbox.children('span')[pos].talken_data.word === '\xa0'
        ) {
          pos -= 1
        }
        if (pos < 0) {
          return true
        } else {
          // check if the prior word ends with '.'
          const w = $textbox.children('span')[pos].talken_data.word
          if (w[w.length - 1] === '.') {
            return true
          } else {
            return false
          }
        }
      }

      pub_pu.periodForPause = function(pos) {
        if (pos < 0) {
          return
        }
        const rd = $textbox.children('span')[pos + 1].talken_data.data
        if (rd[rd.length - 1].end - rd[0].bgn > 1.0) {
          putPeriod(pos)
        }
      }

      pub_pu.periodForEndCommenting = function(pos) {
        if (pos < 0) {
          return
        }
        putPeriod(pos)
        renderViewTalkens()
      }

      function putPeriod(pos) {
        const datum = $textbox.children('span')[pos].talken_data
        datum.word += '.'
        replaceTalken(datum, pos)
      }

      var replaceTalken = function(talken_data, idx) {
        const was_fresh = $($textbox.children()[idx]).hasClass(
          'fresh-recording'
        )
        $textbox
          .children()
          .slice(idx, idx + 1)
          .remove()
        insertNewTalken(talken_data, idx, was_fresh)
        talkenRenderer.invalidate()
        setCarret(idx + 1)
      }

      return pub_pu
    })()

    /*
     * Synthesizer for audios and gestures from multiple base recordings
     */

    var talkenRenderer = (function() {
      const pub_tr = {}

      let invalidated = true

      pub_tr.invalidate = function() {
        invalidated = true
      }

      pub_tr.getCtrlTalkens = function() {
        if (invalidated) {
          render()
        }

        const rtn = []
        $textbox.children().each(function() {
          this.talken_data.data.forEach(function(datum) {
            rtn.push(datum)
          })
        })
        return rtn
      }

      pub_tr.getCtrlTalkens_Gesture = function() {
        if (invalidated) {
          render()
        }

        const rtn = []
        $textbox.children().each(function() {
          this.talken_data.data.forEach(function(datum) {
            rtn.push({
              base_annotid: datum.annotid,
              base_bgn: datum.bgn,
              base_end: datum.end,
              new_bgn: datum.rendered_bgn,
              new_end: datum.rendered_end,
              word: datum.word
            })
          })
        })
        return rtn
      }

      pub_tr.getRenderedTime = function(idx) {
        if (invalidated) {
          render()
        }

        return $textbox.children('span')[idx].rendered_data.bgn * 1000 + 10
      }

      var render = function() {
        let t = 0
        $textbox.children().each(function() {
          this.rendered_data = {}
          this.rendered_data.bgn = t
          this.talken_data.data.forEach(function(datum) {
            datum.audio_url = r2App.annots[datum.annotid].GetAudioFileUrl()
            datum.rendered_bgn = t
            t += datum.end - datum.bgn
            datum.rendered_end = t
          })
          this.rendered_data.end = t
        })
        invalidated = false
      }

      return pub_tr
    })()

    /*
     * Inserting new talkens
     */

    function flushBaseDataBuf() {
      base_data_buf.forEach(function(datum) {
        const pause_talken_datum = getPauseTalkenDatum(
          $textbox
            .children()
            .filter(':not(.old-recording)')
            .last(),
          datum.data[0]
        )
        if (pause_talken_datum) {
          insertNewTalken(pause_talken_datum, insert_pos++, true) // is_fresh = true
          punctuationUtil.periodForPause(insert_pos - 2)
        }
        if (punctuationUtil.toCapitalize(insert_pos)) {
          datum.word = datum.word.charAt(0).toUpperCase() + datum.word.slice(1)
        }
        insertNewTalken(datum, insert_pos++, true) // is_fresh = true
        setCarret(insert_pos)
      })
      base_data_buf = []
      renderViewTalkens()
      content_changed = true
      talkenRenderer.invalidate()
    }

    var getPauseTalkenDatum = function($last, next_base_datum) {
      if ($last[0]) {
        const last_base_datum =
          $last[0].talken_data.data[$last[0].talken_data.data.length - 1]
        if (next_base_datum.bgn - last_base_datum.end > 0.03) {
          // 30 ms to be consistent with Newspeak.
          return {
            word: '\xa0',
            data: [
              {
                word: '\xa0',
                bgn: last_base_datum.end,
                end: next_base_datum.bgn,
                annotid: next_base_datum.annotid
              }
            ]
          }
        }
      }
    }

    function insertNewTalkenSimpleSpeech(talken_data, idx, is_fresh) {
      is_fresh = typeof is_fresh === 'undefined' ? false : is_fresh // default false

      r2.util.jqueryInsert($textbox, createTalken(talken_data), idx)

      function createTalken(talken_data) {
        const uid = r2.util.generateGuid()
        let word
        if (typeof talken_data.word === 'string') {
          word = talken_data.word
        } else {
          word = talken_data.data
            .map(function(datum) {
              return datum.word
            })
            .join(' ')
            .replace(/\s+/g, '\xa0')
            .trim()
        }

        const $vt = newViewTalken(uid, word)
        $overlay.append($vt)
        const $ct = newCtrlTalken($vt, uid)
        if (is_fresh) {
          $vt.toggleClass('fresh-recording', true)
          $ct.toggleClass('fresh-recording', true)
        }
        return $ct
      }

      function newViewTalken(uid, word) {
        const $vt = $(document.createElement('div'))
        $vt.addClass('ssui-viewtalken')
        $vt.attr('uid', uid)

        const $vt_span = $(document.createElement('span'))
        $vt_span.addClass('ssui-viewtalken-span')
        $vt_span.text(word)
        const opacity = talken_data.data[0].conf * 0.75 + 0.25
        $vt_span.css('color', 'rgba(0, 0, 0, ' + opacity + ')')
        $vt.append($vt_span)

        if (word === '\xa0') {
          $vt.addClass('ssui-pause')
          $vt_span.text('')
          $vt.css(
            'padding-right',
            (talken_data.data[talken_data.data.length - 1].end -
              talken_data.data[0].bgn) *
              0.2 +
              0.15 +
              'em'
          )
        } else {
          $vt.addClass('ssui-word')
        }
        return $vt
      }

      function newCtrlTalken($vt, uid) {
        const CTRL_TKN_MARGIN = 0.1
        const $ct = $(document.createElement('span'))
        $ct.addClass('ssui-ctrltalken')
        $ct.text('\xa0')

        $ct[0].talken_data = talken_data
        $ct[0].$vt = $vt // cache the view_talken corresponding to this ctrl_talken
        const w = $ct[0].$vt[0].getBoundingClientRect().width
        $ct.css(
          'letter-spacing',
          transferPx2EmNumeric(w, r2Const.SIMPLESPEECH_FONT_SIZE) -
            spaceWidth.get() +
            CTRL_TKN_MARGIN +
            'em'
        )
        $ct.attr('uid', uid)

        return $ct
      }
    }

    /*
     * Getting space width of the empty control talken:
     * <the visible talken width> = <spaceWidth.get()> + <'letter-spacing' width>
     */

    var spaceWidth = (function() {
      const pub_sw = {}

      let w = -1 // in em.

      pub_sw.get = function() {
        if (w < 0) {
          init()
        }
        return w
      }

      function init() {
        const $ct = $(document.createElement('span'))
        $ct.addClass('ssui-ctrltalken')
        $ct.text('\xa0')
        $textbox.append($ct)
        w = transferPx2EmNumeric(
          $ct[0].getBoundingClientRect().width,
          r2Const.SIMPLESPEECH_FONT_SIZE
        )
        $ct.remove()
      }

      return pub_sw
    })()

    const waveWeaverWordWidth = (function() {
      const pub_ww = {}

      pub_ww.get = function(word) {
        const $vt = $(document.createElement('div'))
        $vt.addClass('ssui-viewtalken')

        const $vt_span_wrapper = $(document.createElement('div'))
        $vt_span_wrapper.addClass('ssui-waveform-span-wrapper-div')
        $vt.append($vt_span_wrapper)

        const $vt_span = $(document.createElement('span'))
        $vt_span.addClass('ssui-waveform-span')
        $vt_span.text(word)
        $vt_span_wrapper.append($vt_span)

        $overlay.append($vt)
        const w = transferPx2EmNumeric(
          $vt[0].getBoundingClientRect().width,
          r2Const.SIMPLESPEECH_FONT_SIZE
        )
        $vt.remove()
        return w
      }

      return pub_ww
    })()

    /*
     * Inline recording indicator
     */

    var insertRecordingIndicator = (function() {
      const pub_ri = {}

      const indicator_character = ' '
      let $ct = null
      let $vt = null

      pub_ri.insert = function(idx) {
        r2.util.jqueryInsert($textbox, createTalken(), idx)
      }

      pub_ri.dismiss = function() {
        $ct.remove()
        $vt.remove()
      }

      function createTalken() {
        const uid = r2.util.generateGuid()
        const word = indicator_character

        $vt = newViewTalken(uid, word)
        $overlay.append($vt)
        $ct = newCtrlTalken($vt, uid)
        return $ct
      }

      function newViewTalken(uid, word) {
        const $vt = $(document.createElement('div'))
        $vt.addClass('ssui-viewtalken')
        $vt.addClass('ssui-recording-indicator-talken')
        $vt.attr('uid', uid)

        const $vt_span = $(document.createElement('span'))
        $vt_span.addClass('ssui-viewtalken-span')
        $vt_span.text(word)
        $vt.append($vt_span)
        $vt.addClass('ssui-recording-indicator')
        $vt.addClass('blink_me')
        return $vt
      }

      function newCtrlTalken($vt, uid) {
        const $ct = $(document.createElement('span'))
        $ct.addClass('ssui-ctrltalken')
        $ct.addClass('ssui-recording-indicator-talken')

        $ct.text('\xa0')

        $ct[0].talken_data = {
          word: indicator_character,
          data: [
            {
              word: indicator_character,
              bgn: 0,
              end: 0,
              annotid: _annotid
            }
          ]
        }
        $ct[0].$vt = $vt // cache the view_talken corresponding to this ctrl_talken
        const w = $ct[0].$vt[0].getBoundingClientRect().width
        $ct.css(
          'letter-spacing',
          transferPx2Em(w, r2Const.SIMPLESPEECH_FONT_SIZE)
        )
        $ct.attr('uid', uid)

        return $ct
      }

      return pub_ri
    })()

    /*
     * Repositioning the view talkens
     */

    var renderViewTalkens = function() {
      const arrayDiff = function(a, b) {
        return a.filter(function(i) {
          return b.index(i) < 0
        })
      }

      const positionViewTalken = function($ctrl_talken, $edit_box) {
        const $vt = $ctrl_talken[0].$vt

        const ct_rect = $ctrl_talken[0].getBoundingClientRect()
        const eb_rect = $edit_box[0].getBoundingClientRect()
        const w = $vt[0].getBoundingClientRect().width

        const dx = (ct_rect.width - w) * 0.5
        $vt.css('left', transferPx2Em(ct_rect.left - eb_rect.left + dx, 1.0))
        $vt.css('top', transferPx2Em(ct_rect.top - eb_rect.top, 1.0))
      }

      const overlay_uids = $overlay
        .children('.ssui-viewtalken')
        .map(function(idx) {
          return $(this).attr('uid')
        })
      const textbox_uids = $textbox
        .children('.ssui-ctrltalken')
        .map(function(idx) {
          return $(this).attr('uid')
        })

      const to_remove = arrayDiff(overlay_uids, textbox_uids)
      const to_append = arrayDiff(textbox_uids, overlay_uids)

      to_remove.each(function(uid) {
        $overlay.find(".ssui-viewtalken[uid='" + to_remove[uid] + "']").remove()
      })

      to_append.each(function(uid) {
        $overlay.append(
          $textbox.find(".ssui-ctrltalken[uid='" + to_append[uid] + "']")[0].$vt
        )
      })

      $textbox.children('span').each(function(idx) {
        positionViewTalken($(this), $textbox)
      })
    }

    function transferPx2Em(px, this_font_size) {
      return transferPx2EmNumeric(px, this_font_size) + 'em'
    }

    function transferPx2EmNumeric(px, this_font_size) {
      return (
        (px * r2Const.FONT_SIZE_SCALE) /
        r2.dom.getCanvasWidth() /
        this_font_size
      )
    }

    /*
     * Utils extracting texts
     */

    function getSelectedText() {
      getSelectedTextRange(carret.idx_bgn, carret.idx_end)
    }

    function getSelectedTextRange(bgn, end) {
      const l = []
      $textbox
        .children('span')
        .slice(bgn, end)
        .each(function() {
          l.push(this.talken_data)
        })
      return {
        text: l
          .map(function(datum) {
            return datum.word
          })
          .join(' '),
        list: l
      }
    }

    function getCopiedText() {
      const l = []
      if (copied_ctrl_talkens) {
        copied_ctrl_talkens.each(function() {
          l.push(this.talken_data)
        })
      }
      return {
        text: l
          .map(function(datum) {
            return datum.word
          })
          .join(' '),
        list: l
      }
    }

    /*
     * Key event utils
     */

    var onKeyDown = function(e) {
      const key_enable_default = [
        r2.keyboard.CONST.KEY_LEFT,
        r2.keyboard.CONST.KEY_RGHT,
        r2.keyboard.CONST.KEY_UP,
        r2.keyboard.CONST.KEY_DN
      ]

      if (key_enable_default.indexOf(e.keyCode) > -1) {
      } else {
        if (e.keyCode === r2.keyboard.CONST.KEY_DEL) {
          if (carret.is_collapsed) {
            op.remove(carret.idx_bgn, carret.idx_end + 1)
          } else {
            op.remove(carret.idx_bgn, carret.idx_end)
          }
          e.preventDefault()
        } else if (e.keyCode === r2.keyboard.CONST.KEY_BSPACE) {
          if (carret.is_collapsed) {
            op.remove(carret.idx_bgn - 1, carret.idx_end)
          } else {
            op.remove(carret.idx_bgn, carret.idx_end)
          }
          e.preventDefault()
        } else if (
          r2.keyboard.modifier_key_dn &&
          e.keyCode === r2.keyboard.CONST.KEY_C
        ) {
          if (carret.is_collapsed) {
          } else {
            op.copy(carret.idx_bgn, carret.idx_end)
          }
          e.preventDefault()
        } else if (
          r2.keyboard.modifier_key_dn &&
          e.keyCode === r2.keyboard.CONST.KEY_X
        ) {
          if (carret.is_collapsed) {
          } else {
            op.copy(carret.idx_bgn, carret.idx_end)
            op.remove(carret.idx_bgn, carret.idx_end)
          }
          e.preventDefault()
        } else if (
          r2.keyboard.modifier_key_dn &&
          e.keyCode === r2.keyboard.CONST.KEY_V
        ) {
          if (!carret.is_collapsed) {
            op.remove(carret.idx_bgn, carret.idx_end)
          }
          op.paste(carret.idx_bgn)
          e.preventDefault()
        } else if (e.keyCode === r2.keyboard.CONST.KEY_SPACE) {
          if (r2App.mode === r2App.AppModeEnum.REPLAYING) {
            r2.rich_audio.stop()
          } else if (r2App.mode === r2App.AppModeEnum.IDLE) {
            const ctrl_talkens = $textbox.children('span')
            if (carret.idx_focus < ctrl_talkens.length) {
              pub
                .synthesizeAndPlay(
                  content_changed,
                  talkenRenderer.getRenderedTime(carret.idx_focus)
                )
                .then(function() {
                  content_changed = false
                })
            }
          }
          e.preventDefault()
        } else if (e.keyCode === r2.keyboard.CONST.KEY_ENTER) {
          if (r2App.mode === r2App.AppModeEnum.RECORDING) {
          } else {
            if (r2App.mode === r2App.AppModeEnum.REPLAYING) {
              r2.rich_audio.stop()
            }
            pub.insertRecording()
          }
          e.preventDefault()
        } else if (e.keyCode === r2.keyboard.CONST.KEY_ESC) {
          if (r2App.mode === r2App.AppModeEnum.RECORDING) {
            r2.recordingCtrl.stop(false) // to_upload = false
          } else if (r2App.mode === r2App.AppModeEnum.REPLAYING) {
            r2.rich_audio.stop()
          }
          e.preventDefault()
        }

        renderViewTalkens()
        if (pub.on_input) pub.on_input()
      }
    }

    var onKeyPress = function(event) {
      if (
        String.fromCharCode(event.which) === '.' ||
        String.fromCharCode(event.which) === ',' ||
        String.fromCharCode(event.which) === '?' ||
        String.fromCharCode(event.which).match(/\w/)
      ) {
        // alphanumeric
        if (carret.idx_bgn !== carret.idx_end) {
          if (!popupTranscription(carret.idx_bgn, carret.idx_end)) {
            event.preventDefault()
          }
        } else {
          event.preventDefault()
        }
      } else {
        event.preventDefault()
      }
    }

    /*
     * Pop-up box for correcting transcription
     */

    var popupTranscription = function(idx_bgn, idx_end, force_select_all) {
      force_select_all =
        typeof force_select_all === 'undefined' ? false : force_select_all
      let select_all = true
      if (idx_bgn === idx_end) {
        // when collapsed
        idx_bgn -= 1
        select_all = false || force_select_all
      }
      if (
        idx_bgn >= 0 &&
        idx_bgn < idx_end &&
        idx_end <= $textbox.children('span').length
      ) {
        const popup_word = getPopUpWord(idx_bgn, idx_end)

        const tooltip = new r2.tooltip(
          $textbox.parent(),
          // with_blank_text ? '' : getPopUpWord(idx_bgn, idx_end),
          popup_word,
          getPopUpPos(idx_bgn, idx_end),
          function(text) {
            const new_base_data = getNewBaseData(idx_bgn, idx_end, text)
            op.remove(idx_bgn, idx_end)
            new_base_data.data[0].conf = 1.0

            insertNewTalken(new_base_data, idx_bgn)
            renderViewTalkens()
            $textbox.focus()
            if (idx_bgn + 1 < $textbox.children('span').length) {
              setCarret(idx_bgn + 2)
              getCarret()
              r2.audioSynthesizer
                .run($textbox.children('span')[idx_bgn + 1].talken_data.data)
                .then(function(result) {
                  const audio = new Audio(result.url)
                  // audio.play();
                  return null
                })
              if (!popupTranscription(carret.idx_bgn, carret.idx_end, true)) {
                event.preventDefault()
              }
            }
          },
          function() {
            $textbox.focus()
            setCarret(idx_end)
          }
        )
        $textbox.blur()
        tooltip.focus()
        if (select_all) {
          tooltip.selectAll()
        }
        return true
      } else {
        console.error('invalid caret range:', idx_bgn, idx_end)
        $textbox.focus()
        return false
      }

      function getPopUpWord(idx_bgn, idx_end) {
        const l = []
        $textbox
          .children('span')
          .slice(idx_bgn, idx_end)
          .map(function() {
            l.push(this.talken_data.word)
          })
        return l.join('\xa0')
      }
      function getNewBaseData(idx_bgn, idx_end, word) {
        const l = []
        $textbox
          .children('span')
          .slice(idx_bgn, idx_end)
          .map(function() {
            this.talken_data.data.forEach(function(datum) {
              l.push(datum)
            })
          })
        return {
          word: word.replace(/\s+/g, '\xa0').trim(),
          data: l
        }
      }
    }

    /*
     * Getting screen position of tokens
     */

    function getPopUpPos(idx_bgn, idx_end) {
      const tb_bbox = $textbox[0].getBoundingClientRect()
      const l_bbox = $textbox.children('span')[idx_bgn].getBoundingClientRect()
      const r_bbox = $textbox
        .children('span')
        [idx_end - 1].getBoundingClientRect()
      if (l_bbox.top === r_bbox.top) {
        return {
          x:
            (((l_bbox.left + r_bbox.right) * 0.5 - tb_bbox.left) *
              r2Const.FONT_SIZE_SCALE) /
              r2.dom.getCanvasWidth() +
            'em',
          y:
            ((r_bbox.top + r_bbox.height - tb_bbox.top) *
              r2Const.FONT_SIZE_SCALE) /
              r2.dom.getCanvasWidth() +
            'em'
        }
      } else {
        return {
          x:
            ((r_bbox.left + r_bbox.width * 0.5 - tb_bbox.left) *
              r2Const.FONT_SIZE_SCALE) /
              r2.dom.getCanvasWidth() +
            'em',
          y:
            ((r_bbox.top + r_bbox.height - tb_bbox.top) *
              r2Const.FONT_SIZE_SCALE) /
              r2.dom.getCanvasWidth() +
            'em'
        }
      }
    }

    /*
     * Utils for getting and setting carret position
     */

    var checkCarretPositionUpdate = function(event) {
      if (is_recording_and_synthesizing) {
        return
      }

      const old_anchor = carret.idx_anchor
      const old_focus = carret.idx_focus
      getCarret()
      const is_changed = !(
        old_anchor === carret.idx_anchor && old_focus === carret.idx_focus
      )
      if (is_changed) {
        const ctrl_talkens = $textbox.children('span')
        if (carret.idx_focus < ctrl_talkens.length) {
          if (r2App.mode === r2App.AppModeEnum.IDLE) {
            // move the playhead
            r2.rich_audio.jump(
              annotid_copy,
              talkenRenderer.getRenderedTime(carret.idx_focus)
            )
            r2App.invalidate_dynamic_scene = true
          }
        }
        if (carret.idx_focus !== carret.idx_anchor) {
          // non-collapsed selection
          let m_idx = carret.idx_focus
          if (carret.idx_anchor < carret.idx_focus) m_idx -= 1
          if (
            m_idx >= 0 &&
            m_idx < ctrl_talkens.length &&
            r2App.mode === r2App.AppModeEnum.IDLE
          ) {
            r2.audioSynthesizer
              .run($textbox.children('span')[m_idx].talken_data.data)
              .then(function(result) {
                const audio = new Audio(result.url)
                // audio.play();
                return null
              })
          }
        }
      }
      return is_changed
    }

    var getCarret = function() {
      if ($textbox.children().length === 0) {
        return { idx_anchor: 0 }
      }
      const sel = window.getSelection()
      carret.idx_anchor =
        sel.anchorOffset +
        $textbox.children().index($(sel.anchorNode.parentNode))
      carret.idx_focus =
        sel.focusOffset + $textbox.children().index($(sel.focusNode.parentNode))

      carret.is_collapsed = sel.isCollapsed

      carret.idx_bgn = Math.min(carret.idx_anchor, carret.idx_focus)
      carret.idx_end = Math.max(carret.idx_anchor, carret.idx_focus)

      return carret
    }

    var setCarret = function(idx) {
      const sel = window.getSelection()
      const range = document.createRange()
      try {
        if (idx !== 0) {
          var n = $textbox.children()[idx - 1]
          range.setStartAfter(n)
        } else {
          var n = $textbox.children()[0]
          range.setStartBefore(n)
        }
      } catch (err) {
        console.error(err)
      }
      sel.removeAllRanges()
      sel.addRange(range)

      return sel
    }

    /*
     * Token manipulation
     */

    var op = (function() {
      const pub_op = {}

      pub_op.remove = function(idx_bgn, idx_end) {
        // remove [idx_bgn,idx_end), note that 'idx_end' item is not included
        $textbox
          .children()
          .slice(idx_bgn, idx_end)
          .remove()
        content_changed = true
        talkenRenderer.invalidate()
      }

      pub_op.copy = function(idx_bgn, idx_end) {
        copied_ctrl_talkens = $textbox.children().slice(idx_bgn, idx_end)
        content_changed = true
        talkenRenderer.invalidate()
      }

      pub_op.paste = function(idx) {
        if (copied_ctrl_talkens) {
          copied_ctrl_talkens.each(function() {
            insertNewTalken(this.talken_data, idx)
            ++idx
          })
        }
        setCarret(idx)
        content_changed = true
        talkenRenderer.invalidate()
      }

      return pub_op
    })()

    _init()

    return pub
  }
})((window.r2 = window.r2 || {}))
