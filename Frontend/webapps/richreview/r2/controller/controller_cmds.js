/* eslint-disable camelcase,no-var,no-console,prefer-const,no-unused-vars,prettier/prettier,no-undef,no-lone-blocks,no-redeclare,no-throw-literal,new-cap,standard/computed-property-even-spacing */
/**
 * Created by yoon on 12/21/14.
 */

/*
 * ExtractFromDocVer2
 */

/** @namespace r2 */
;(function(r2) {
  'use strict'

  r2.createDoc = (function() {
    const pub = {}

    pub.createR2DocFromDocJs = function(docjs) {
      function getR2PieceTextFromPageJs(
        rect,
        page_bbox,
        npage,
        nrgn,
        npt,
        ttX,
        ttW
      ) {
        const ratioX = page_bbox[2] - page_bbox[0]
        const ratioY = page_bbox[3] - page_bbox[1]
        const piecetext = new r2.PieceText()
        r2.PieceText.prototype.SetPiece.apply(piecetext, [
          r2.pieceHashId.text(npage, nrgn, npt), // id
          0, // creationTime
          new Vec2((rect[2] - rect[0]) / ratioX, (rect[3] - rect[1]) / ratioX),
          [
            0, // ttDepth
            (ttX - rect[0]) / ratioX, // ttX
            ttW / ratioX // ttW
          ]
        ])
        r2.PieceText.prototype.SetPieceText.apply(piecetext, [
          new Vec2(rect[0] / ratioX, 1.0 - rect[1] / ratioY), // texcoordLT
          new Vec2(rect[2] / ratioX, 1.0 - rect[3] / ratioY), // texcoordRB
          rect[4]
        ])
        return piecetext
      }

      function getR2RgnFromPageJs(rgnjs, page_bbox, npage, nrgn) {
        const region = new r2.Region()
        for (let i = 0; i < rgnjs.rects.length; i++) {
          if (rgnjs.ttX === null && rgnjs.ttW === null) {
            const w = rgnjs.rects[0][2] - rgnjs.rects[0][0]
            rgnjs.ttX = 0.1 * w
            rgnjs.ttW = 0.8 * w
          }
          const piecetext = getR2PieceTextFromPageJs(
            rgnjs.rects[i],
            page_bbox,
            npage,
            nrgn,
            i,
            rgnjs.ttX,
            rgnjs.ttW
          )
          region.AddChildAtBack(piecetext)
        }
        return region
      }

      function getR2PageFromPageJs(pagejs, npage) {
        const page = new r2.Page()

        for (let i = 0; i < 4; i++) {
          const region = getR2RgnFromPageJs(
            pagejs.rgns[i],
            pagejs.bbox,
            npage,
            i
          )
          page.AddChildAtBack(region)
        }

        return page
      }

      const doc = new r2.Doc()
      for (let i = 0; i < docjs.pages.length; ++i) {
        const page = getR2PageFromPageJs(docjs.pages[i], i)
        page.SetPage(i)
        doc.AddPage(page)
      }
      return doc
    }

    pub.extractDocFromLegacyDoc = function(r2legacy_doc) {
      // get piece texts from r2legacy_doc

      const r2doc = new r2.Doc()

      let page
      for (let i = 0; (page = r2legacy_doc.GetPage(i)); ++i) {
        const r2page = new r2.Page()
        r2page.SetPage(i)
        r2doc.AddPage(r2page)

        var region
        for (let j = 0; (region = page.GetRegion(j)); ++j) {
          const r2region = new r2.Region()
          r2page.AddChildAtBack(r2region)

          const l = region.GetObjByType(r2Legacy.PieceText)
          var p
          for (let k = 0; (p = l[k]); ++k) {
            const r2piecetext = new r2.PieceText()
            r2.PieceText.prototype.SetPiece.apply(
              r2piecetext,
              p.ExportArgumentsToR2Doc_Piece()
            )
            r2.PieceText.prototype.SetPieceText.apply(
              r2piecetext,
              p.ExportArgumentsToR2Doc_PieceText()
            )
            r2region.AddChildAtBack(r2piecetext)
          }
        }
      }

      return r2doc
    }

    pub.extractCmdsFromLegacyDoc = function(r2legacy_doc) {
      const cmds = []
      function addCmdIfNotEmpty(cmd) {
        if (!r2.util.isEmpty(cmd)) cmds.push(cmd)
      }
      let i, page
      for (i = 0; (page = r2legacy_doc.GetPage(i)); ++i) {
        let l = page.GetObjByType(r2Legacy.PieceTeared)
        var pieceteared
        for (var j = 0; (pieceteared = l[j]); ++j) {
          addCmdIfNotEmpty(pieceteared.ExtractR2DocCmd_PieceTeared())
          addCmdIfNotEmpty(pieceteared.ExtractR2DocCmd_CommentAudio())
        }

        var piece
        l = page.GetObjByType(r2Legacy.Piece)
        for (j = 0; (piece = l[j]); ++j) {
          const m = piece.ExtractR2DocCmds_Ink()
          var c
          for (let k = 0; (c = m[k]); ++k) {
            cmds.push(c)
          }
        }
      }
      return cmds
    }

    return pub
  })()

  r2.cmd = (function() {
    const pub = {}

    pub.executeCmd = function(doc, cmd, legacy_user_only) {
      let torun = r2.userGroup.IsValidMember(cmd.user)

      if (legacy_user_only) {
        torun = torun && cmd.user === r2Const.LEGACY_USERNAME
      }

      let success = false
      if (torun) {
        switch (cmd.op) {
          case 'CreateComment':
            success = createComment(doc, cmd)
            break
          case 'ChangeProperty':
            success = changeProperty(doc, cmd)
            break
          case 'DeleteComment':
            success = deleteComment(doc, cmd)
            break
          default:
            console.error('Unknown Cmd Error:', JSON.stringify(cmd))
        }
      }
      return success
    }

    var changeProperty = function(doc, cmd) {
      let success = false
      switch (cmd.type) {
        case 'PieceKeyboardTextChange':
          success = changeProperty_PieceKeyboardTextChange(doc, cmd)
          break
        case 'PieceNewSpeakChange':
          success = changeProperty_PieceNewSpeakChange(doc, cmd)
          break
        case 'PieceNewSpeakNewBaseAnnot':
          success = changeProperty_PieceNewSpeakNewBaseAnnot(doc, cmd)
          break
        case 'PieceKeyboardPubPrivate':
          success = changeProperty_PieceKeyboardPubPrivate(doc, cmd)
          break
        default:
          console.error('Unknown Cmd Error:', JSON.stringify(cmd))
      }
      return success
    }

    var deleteComment = function(doc, cmd) {
      // time: 2014-12-21T13...
      // user: 'red user'
      // type: PieceKeyboard or CommentAudio
      // op: 'DeleteComment'
      // target: {type: 'PieceKeyboard', pid: pid, page: 2}
      //          {type: 'CommentAudio', aid: aid, page: 2}

      let askuser, mute
      if (cmd.target.type === 'PieceKeyboard') {
        var target = doc.GetTargetPiece(cmd.target)
        if (target) {
          r2.removeAnnot(target.GetAnnotId(), (askuser = false), (mute = true))
          cmd.target.aid = target.GetAnnotId()
          return true
        }
      } else if (cmd.target.type === 'PieceNewSpeak') {
        var target = doc.GetTargetPiece(cmd.target)
        if (target) {
          r2.removeAnnot(target.GetAnnotId(), (askuser = false), (mute = true))
          cmd.target.aid = target.GetAnnotId()
          return true
        }
      } else if (cmd.target.type === 'CommentAudio') {
        if (r2App.annots.hasOwnProperty(cmd.target.aid)) {
          r2.removeAnnot(cmd.target.aid, (askuser = false), (mute = true))
          return true
        }
      } else if (cmd.target.type === 'Inks') {
        cmd.data.forEach(function(erase_cmd) {
          const annot = r2App.annots[erase_cmd.target.aid]
          const piece = r2App.pieces_cache[erase_cmd.target.pid]
          if (typeof piece !== 'undefined' && typeof annot !== 'undefined') {
            const ink = piece.getInkByTimeBgn(
              erase_cmd.target.t_bgn,
              erase_cmd.target.aid
            )
            if (ink) {
              piece.detachInk(ink)
              annot.detachInk(ink)
              r2App.invalidate_page_layout = true
            }
          } else {
            console.error('deleteComment, Ink: ', cmd, annot, piece)
          }
        })
        return true
      }
      return false
    }

    const getAnchorPiece = function(anchorpage, cmd) {
      if (cmd.anchorTo.type === 'PieceText') {
        return anchorpage.SearchPiece(cmd.anchorTo.id)
      } else if (cmd.anchorTo.type === 'PieceTeared') {
        return anchorpage.SearchPiece(cmd.anchorTo.id)
      } else if (cmd.anchorTo.type === 'PieceNewSpeak') {
        return anchorpage.SearchPiece(cmd.anchorTo.id)
      } else if (cmd.anchorTo.type === 'PieceKeyboard') {
        return anchorpage.SearchPiece(cmd.anchorTo.id)
      } else if (cmd.anchorTo.type === 'CommentAudio') {
        return anchorpage.SearchPieceAudioByAnnotId(
          cmd.anchorTo.id,
          (cmd.anchorTo.time[0] + cmd.anchorTo.time[1]) / 2
        )
      }
      return null
    }

    var createComment = function(doc, cmd) {
      let success = false
      switch (cmd.type) {
        case 'TextTearing':
          success = createTextTearing(doc, cmd)
          break
        case 'CommentAudio':
          success = createCommentAudio(doc, cmd)
          break
        case 'CommentInk': // inks from the legacy Tablet app
          success = createCommentInk(doc, cmd)
          break
        case 'CommentText':
          success = createCommentText(doc, cmd)
          break
        case 'CommentNewSpeak':
          success = createCommentNewSpeak(doc, cmd)
          break
        case 'PrivateHighlight':
          success = createPrivateHighlight(doc, cmd)
          break
        case 'StaticInk':
          success = createStaticInk(doc, cmd)
          break
        default:
          console.error('Unknown Cmd Error:', JSON.stringify(cmd))
      }
      return success
    }

    var createTextTearing = function(doc, cmd) {
      // time: 2014-12-21T13...
      // user: 'red user'
      // op: 'CreateComment'
      // type: 'TextTearing'
      // anchorTo: {type: 'PieceText', id: pid, page: 2} or
      //           {type: 'CommentAudio', id: annotId, page: 2, time: [t0, t1]}
      // data: {pid: id, height: 0.1}

      if (!r2App.pieces_cache.hasOwnProperty(cmd.data.pid)) {
        // create if not exist
        const anchorpage = doc.GetPage(cmd.anchorTo.page)
        const anchorpiece = getAnchorPiece(anchorpage, cmd)
        if (anchorpiece) {
          const pieceteared = new r2.PieceTeared()
          pieceteared.SetPiece(
            cmd.data.pid,
            new Date(cmd.time).getTime(),
            new Vec2(anchorpiece._cnt_size.x, cmd.data.height),
            anchorpiece.GetTTData()
          )
          pieceteared.SetPieceTeared(cmd.user)
          anchorpiece.AddChildrenChronologically([pieceteared])

          r2.dom_model.createTextTearing(pieceteared)
          r2App.invalidate_size = true
          r2App.invalidate_page_layout = true
          return true
        }
      } else {
        // change height it exist
        r2App.pieces_cache[cmd.data.pid].resize(cmd.data.height)
        r2.dom_model.updateSizeTextTearing(r2App.pieces_cache[cmd.data.pid])
        r2App.invalidate_size = true
        r2App.invalidate_page_layout = true
        return true
      }

      return false
    }

    var createCommentAudio = function(doc, cmd) {
      // time: 2014-12-21T13...
      // user: 'red user'
      // op: 'CreateComment'
      // type: CommentAudio
      // anchorTo: {type: 'PieceText', id: pid, page: 2} or
      //           {type: 'PieceTeared', id: pid, page: 2}
      //           {type: 'CommentAudio', id: annotId, page: 2, time: [t0, t1]}
      // data: {aid: ..., duration: t, waveform_sample: [0, 100, 99, 98 ...], Spotlights: [Spotlight, Spotlight, ...] };
      // Spotlight: {t_bgn:..., t_end:..., npage: 0, segments: [Segment, Segment, ...]}
      // Spotlight.Segment: {pid: ..., pts: [Vec2, Vec2, ...]}

      const anchorpage = doc.GetPage(cmd.anchorTo.page)
      const anchorpiece = getAnchorPiece(anchorpage, cmd)

      if (anchorpiece) {
        const annot = new r2.Annot()
        annot.SetAnnot(
          cmd.data.aid,
          anchorpiece.GetId(),
          cmd.time,
          cmd.data.duration,
          cmd.data.waveform_sample,
          cmd.user,
          cmd.data.audiofileurl,
          cmd.data.ui_type
        )
        if (cmd.data.is_base_annot) {
          annot.setIsBaseAnnot()
        }
        r2App.annots[cmd.data.aid] = annot
        r2.dom_model.createCommentVoice(
          annot,
          cmd.anchorTo.page,
          false
        ) /* live_recording = false */

        const timePerPiece =
          r2Const.PIECEAUDIO_TIME_PER_WIDTH * anchorpiece.GetTtWidth()
        const npiece = Math.ceil(cmd.data.duration / timePerPiece)
        const l = []
        for (var i = 0; i < npiece; ++i) {
          const pieceaudio = new r2.PieceAudio()
          pieceaudio.SetPiece(
            r2.pieceHashId.voice(cmd.data.aid, i),
            new Date(cmd.time).getTime(),
            anchorpiece.GetNewPieceSize(),
            anchorpiece.GetTTData()
          )
          pieceaudio.SetPieceAudio(
            cmd.data.aid,
            cmd.user,
            i * timePerPiece,
            Math.min(cmd.data.duration, (i + 1) * timePerPiece)
          )
          l.push(pieceaudio)
          r2.dom_model.appendPieceVoice(
            cmd.data.aid,
            i,
            cmd.time,
            pieceaudio
          ) /* dom */
        }
        anchorpiece.AddChildrenChronologically(l)
        r2App.invalidate_size = true
        r2App.invalidate_page_layout = true

        let cmd_spotlight
        for (i = 0; (cmd_spotlight = cmd.data.Spotlights[i]); ++i) {
          const spotlight = new r2.Spotlight()
          let spotlight_time = 0
          if (cmd_spotlight.time) spotlight_time = cmd_spotlight.time
          spotlight.SetSpotlight(
            cmd.user,
            cmd.data.aid,
            cmd_spotlight.npage,
            spotlight_time,
            cmd_spotlight.t_bgn,
            cmd_spotlight.t_end
          )
          for (var j = 0; j < cmd_spotlight.segments.length; ++j) {
            if (
              r2App.pieces_cache.hasOwnProperty(cmd_spotlight.segments[j].pid)
            ) {
              var segment = new r2.Spotlight.Segment()
              segment.SetSegment(
                cmd_spotlight.segments[j].pid,
                r2.util.numListToVec2List(cmd_spotlight.segments[j].pts)
              )
              spotlight.AddSegment(segment)
            }
          }
          var toupload
          annot.AddSpotlight(spotlight, (toupload = false))
        }

        if (cmd.data.Inks) {
          let cmd_ink
          for (i = 0; (cmd_ink = cmd.data.Inks[i]); ++i) {
            if (cmd_ink.pid) {
              // filters out the old inking that is using .anchorpid
              const ink = new r2.Ink()
              ink.SetInk(
                cmd_ink.pid,
                cmd_ink.username,
                cmd_ink.annotid,
                [cmd_ink.t_bgn, cmd_ink.t_end],
                cmd_ink.npage
              )
              for (var j = 0; j < cmd_ink.segments.length; ++j) {
                if (
                  r2App.pieces_cache.hasOwnProperty(cmd_ink.segments[j].pid)
                ) {
                  var segment = new r2.Ink.Segment()
                  segment.SetSegment(
                    cmd_ink.segments[j].pid,
                    r2.util.numListToVec2List(cmd_ink.segments[j].pts)
                  )
                  ink.AddSegment(segment)
                }
              }
              anchorpiece.addInk(cmd.data.aid, ink)
              annot.addInk(ink)
            }
          }
        }
        return true
      }
      return false
    }

    var createCommentInk = function(doc, cmd) {
      // inks from the legacy app
      // time: 2014-12-21T13...
      // user: 'red user'
      // op: 'CreateComment'
      // type: 'CommentInk'
      // anchorTo: {type: 'PieceText or PieceTeared', id: pid, page: 2} or
      // data: {aid: ..., strokes: [{anchorTo: {}, , time: [t0, t1], pts:[Vec2, Vec2, ...]}, {}, ...]}

      const anchorpage = doc.GetPage(cmd.anchorTo.page)
      const anchorpiece = getAnchorPiece(anchorpage, cmd)
      if (anchorpiece) {
        let stroke
        for (let i = 0; (stroke = cmd.data.strokes[i]); ++i) {
          cmd.data.aid =
            cmd.data.aid !== ''
              ? cmd.data.aid
              : r2.userGroup
                  .GetUser(r2Const.LEGACY_USERNAME)
                  .GetAnnotStaticInkId()
          const ink = new r2.Ink()
          ink.SetInk(
            anchorpiece.GetId(),
            cmd.user,
            cmd.data.aid,
            stroke.time,
            anchorpage.GetNumPage()
          )
          const segment = new r2.Ink.Segment()
          segment.SetSegment(
            anchorpiece.GetId(),
            r2.util.numListToVec2List(stroke.pts)
          )
          ink.AddSegment(segment)
          anchorpiece.addInk(cmd.data.aid, ink)
          if (r2App.annots[cmd.data.aid]) {
            r2App.annots[cmd.data.aid].addInk(ink)
          } else {
            r2App.annots[
              r2.userGroup
                .GetUser(r2Const.LEGACY_USERNAME)
                .GetAnnotStaticInkId()
            ].addInk(ink) // this can be removed after a database review
          }
        }
        return true
      }
      return false
    }

    var createCommentText = function(doc, cmd) {
      // time: 2014-12-21T13...
      // user: 'red user'
      // op: 'CreateComment'
      // type: 'CommentText'
      // anchorTo: {type: 'PieceText or PieceTeared', id: pid, page: 2} or
      // data: {pid:..., aid: ..., text: "this is a", isprivate:}
      const anchorpage = doc.GetPage(cmd.anchorTo.page)

      const anchorpiece = getAnchorPiece(anchorpage, cmd)

      if (anchorpiece && !cmd.data.isprivate) {
        const piecekeyboard = new r2.PieceKeyboard()
        piecekeyboard.SetPiece(
          cmd.data.pid,
          new Date(cmd.time).getTime(),
          anchorpiece.GetNewPieceSize(),
          anchorpiece.GetTTData()
        )
        const dom_piecekeyboard = piecekeyboard.SetPieceKeyboard(
          anchorpiece.GetId(),
          cmd.data.aid,
          cmd.user,
          cmd.data.text,
          cmd.data.isprivate,
          anchorpiece.IsOnLeftColumn()
        )
        anchorpiece.AddChildrenChronologically([piecekeyboard])

        r2App.invalidate_size = true
        r2App.invalidate_page_layout = true
        return true
      }

      return false
    }

    // fixMe move this to somewhere else
    function registerAnnotFromData(anchor_pid, annt_data) {
      const annot = new r2.Annot()
      annot.SetAnnot(
        annt_data.data.aid,
        anchor_pid,
        annt_data.data.time,
        annt_data.data.duration,
        annt_data.data.waveform_sample,
        annt_data.user,
        annt_data.data.audiofileurl,
        annt_data.data.ui_type
      )
      if (annt_data.data.is_base_annot) {
        annot.setIsBaseAnnot()
      }
      r2App.annots[annt_data.data.aid] = annot
      let cmd_spotlight
      for (var i = 0; (cmd_spotlight = annt_data.data.Spotlights[i]); ++i) {
        const spotlight = new r2.Spotlight()
        let spotlight_time = 0
        if (cmd_spotlight.time) spotlight_time = cmd_spotlight.time
        spotlight.SetSpotlight(
          annt_data.user,
          annt_data.data.aid,
          cmd_spotlight.npage,
          spotlight_time,
          cmd_spotlight.t_bgn,
          cmd_spotlight.t_end
        )
        for (var j = 0; j < cmd_spotlight.segments.length; ++j) {
          if (
            r2App.pieces_cache.hasOwnProperty(cmd_spotlight.segments[j].pid)
          ) {
            var segment = new r2.Spotlight.Segment()
            segment.SetSegment(
              cmd_spotlight.segments[j].pid,
              r2.util.numListToVec2List(cmd_spotlight.segments[j].pts)
            )
            spotlight.AddSegment(segment)
          }
        }
        annot.AddSpotlight(spotlight, false) // to_upload = false
      }
      let cmd_ink
      for (i = 0; (cmd_ink = annt_data.data.Inks[i]); ++i) {
        if (cmd_ink.pid) {
          // filters out the old inking that is using .anchorpid
          const ink = new r2.Ink()
          ink.SetInk(
            cmd_ink.pid,
            cmd_ink.username,
            cmd_ink.annotid,
            [cmd_ink.t_bgn, cmd_ink.t_end],
            cmd_ink.npage
          )
          for (j = 0; j < cmd_ink.segments.length; ++j) {
            if (r2App.pieces_cache.hasOwnProperty(cmd_ink.segments[j].pid)) {
              var segment = new r2.Ink.Segment()
              segment.SetSegment(
                cmd_ink.segments[j].pid,
                r2.util.numListToVec2List(cmd_ink.segments[j].pts)
              )
              ink.AddSegment(segment)
            }
          }
          if (r2App.pieces_cache[cmd_ink.pid]) {
            r2App.pieces_cache[cmd_ink.pid].addInk(cmd_ink.annotid, ink)
          }
          annot.addInk(ink)
        }
      }
    }

    var createCommentNewSpeak = function(doc, cmd) {
      // time: 2014-12-21T13...
      // user: 'red user'
      // op: 'CreateComment'
      // type: 'CommentNewSpeak'
      // anchorTo: {type: 'PieceText or PieceTeared', id: pid, page: 2} or
      // data: {pid:..., aid: ..., text: "this is a", isprivate:}
      if (r2.ctx.text_only) {
        return true
      }
      const anchorpage = doc.GetPage(cmd.anchorTo.page)

      const anchorpiece = getAnchorPiece(anchorpage, cmd)

      if (anchorpiece && !cmd.data.isprivate) {
        const piece = new r2.PieceNewSpeak()
        piece.SetPiece(
          cmd.data.pid,
          new Date(cmd.time).getTime(),
          anchorpiece.GetNewPieceSize(),
          anchorpiece.GetTTData()
        )
        piece.SetPieceNewSpeak(
          anchorpiece.GetId(),
          cmd.data.aid,
          cmd.user,
          cmd.data.text,
          false // live_recording
        )
        anchorpiece.AddChildrenChronologically([piece])
        registerAnnotFromData(anchorpiece.GetId(), cmd.data.annot)

        r2App.invalidate_size = true
        r2App.invalidate_page_layout = true
        return true
      }

      return false
    }

    var createPrivateHighlight = function(doc, cmd) {
      // time: 2014-12-21T13...
      // user: 'red user'
      // op: 'CreateComment'
      // type: PrivateHighlight
      // data: {Spotlights: [Spotlight, Spotlight, ...] };

      if (
        cmd.user === r2.userGroup.cur_user.name &&
        new Date(cmd.time).getTime() >
          r2App.annot_private_spotlight.timeLastChanged
      ) {
        let i, cmd_spotlight
        for (i = 0; (cmd_spotlight = cmd.data.Spotlights[i]); ++i) {
          const spotlight = new r2.Spotlight()
          let spotlight_time = 0
          if (cmd_spotlight.time) spotlight_time = cmd_spotlight.time
          spotlight.SetSpotlight(
            cmd.user,
            cmd.data.aid,
            cmd_spotlight.npage,
            spotlight_time,
            cmd_spotlight.t_bgn,
            cmd_spotlight.t_end
          )
          for (let j = 0; j < cmd_spotlight.segments.length; ++j) {
            if (
              r2App.pieces_cache.hasOwnProperty(cmd_spotlight.segments[j].pid)
            ) {
              const segment = new r2.Spotlight.Segment()
              segment.SetSegment(
                cmd_spotlight.segments[j].pid,
                r2.util.numListToVec2List(cmd_spotlight.segments[j].pts)
              )
              spotlight.AddSegment(segment)
            }
          }
          var toupload
          r2App.annot_private_spotlight.AddSpotlight(
            spotlight,
            (toupload = false)
          )
        }
        return true
      }
      return false
    }

    var createStaticInk = function(doc, cmd) {
      cmd.data.inks.forEach(function(cmd_ink) {
        if (cmd_ink.pid) {
          // filters out the old inking that is using .anchorpid
          const ink = new r2.Ink()
          ink.SetInk(
            cmd_ink.pid,
            cmd_ink.username,
            cmd_ink.annotid,
            [cmd_ink.t_bgn, cmd_ink.t_end],
            cmd_ink.npage
          )
          for (let j = 0; j < cmd_ink.segments.length; ++j) {
            if (r2App.pieces_cache.hasOwnProperty(cmd_ink.segments[j].pid)) {
              const segment = new r2.Ink.Segment()
              segment.SetSegment(
                cmd_ink.segments[j].pid,
                r2.util.numListToVec2List(cmd_ink.segments[j].pts)
              )
              ink.AddSegment(segment)
            }
          }

          const piece = r2App.pieces_cache[cmd_ink.pid]
          if (piece) {
            piece.addInk(cmd_ink.annotid, ink)
            const annot =
              r2App.annots[
                r2.userGroup.GetUser(cmd_ink.username).GetAnnotStaticInkId()
              ]
            annot.addInk(ink)
          }
        }
      })
      r2App.invalidate_page_layout = true
      return true
    }

    var changeProperty_PieceNewSpeakChange = function(doc, cmd) {
      // time: 2014-12-21T13...
      // user: 'red user'
      // op: 'ChangeProperty'
      // type: 'PieceNewSpeakChange'
      // target: {type: 'PieceNewSpeak', pid: pid, page: 2}
      // data: 'lorem ipsum ...'
      const target = doc.GetTargetPiece(cmd.target)
      if (target) {
        target.SetText(cmd.data)
        r2App.invalidate_size = true
        r2App.invalidate_page_layout = true
        return true
      }
      return false
    }

    var changeProperty_PieceNewSpeakNewBaseAnnot = function(doc, cmd) {
      // time: 2014-12-21T13...
      // user: 'red user'
      // op: 'ChangeProperty'
      // type: 'PieceNewSpeakChange'
      // target: {type: 'PieceNewSpeak', pid: pid, page: 2}
      // data: 'lorem ipsum ...'
      const target = doc.GetTargetPiece(cmd.target)
      if (target) {
        registerAnnotFromData(cmd.data.pid, cmd.data.annot)
        target.SetText(cmd.data.text)
        target.annotids.push(cmd.data.annot.data.aid)
        target.gatherSpotlights()
        r2App.doc.GetPage(cmd.target.page).refreshSpotlightPrerenderNewspeak() // generate spotlight caches
        r2App.invalidate_size = true
        r2App.invalidate_page_layout = true
        return true
      }
      return false
    }

    var changeProperty_PieceKeyboardTextChange = function(doc, cmd) {
      // time: 2014-12-21T13...
      // user: 'red user'
      // op: 'ChangeProperty'
      // type: 'PieceKeyboardTextChange'
      // target: {type: 'PieceKeyboard', pid: pid, page: 2}
      // data: 'lorem ipsum ...'
      const target = doc.GetTargetPiece(cmd.target)
      if (target) {
        target.SetText(cmd.data)
        r2App.invalidate_size = true
        r2App.invalidate_page_layout = true
        return true
      }
      return false
    }

    var changeProperty_PieceKeyboardPubPrivate = function(doc, cmd) {
      // time: 2014-12-21T13...
      // user: 'red user'
      // op: 'ChangeProperty'
      // type: 'PieceKeyboardPubPrivate'
      // target: {type: 'PieceKeyboard', pid: pid, page: 2}
      // data: 'private' or 'pub'
      const target = doc.GetTargetPiece(cmd.target)
      if (target) {
        let isprivate
        if (cmd.data === 'private') {
          target.SetPubPrivate((isprivate = true))
        } else {
          target.SetPubPrivate((isprivate = false))
        }
        target.UpdateForPubPrivate()
        return true
      }
      return false
    }

    return pub
  })()
})((window.r2 = window.r2 || {}))
