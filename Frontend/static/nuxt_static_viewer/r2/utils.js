/* eslint-disable no-console,camelcase */
/**
 * Created by Dongwook on 10/18/2014.
 */

/** @namespace r2 */
;(function(r2) {
  'use strict'

  r2.util = (function() {
    const pub = {}
    pub.handleError = function(err) {
      if (!err.silent) {
        let msg = ''
        let detail

        if (
          typeof err.status === 'number' &&
          typeof err.statusText === 'string'
        ) {
          // http error
          detail = 'HTTP '
          msg = 'The legacy responded with an error.'
          console.error(err)
          console.error(err.stack)
          detail +=
            err.status +
            ':' +
            err.statusText +
            ', ' +
            (err.responseText || 'no reponse text') +
            ', '
        } else {
          // javascript error
          detail = 'System '
          msg = r2.constructErrorMsg(r2.ctx.lti)
          detail += err.message + ', ' + err.stack + ', '
        }
        detail += window.location.href
        if (bowser) {
          detail +=
            ' [' +
            bowser.name +
            '/' +
            bowser.version +
            '/' +
            bowser.mac +
            '/' +
            bowser.windows +
            '/' +
            bowser.ios +
            '/' +
            pub.is_mobile +
            ']'
        }
        detail = detail.replace(/(\r\n|\n|\r)/gm, '<n>')

        if (err.custom_msg) {
          console.error(err.custom_msg + '\n' + detail)
          // alert(err.custom_msg)
          //location.reload()
        } else {
          console.error(msg + '\n' + detail)
          // prompt(msg, detail)
          //location.reload()
        }
      }
    }

    pub.setCookie = function(cname, cvalue, exdays) {
      const d = new Date()
      d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000)
      const expires = 'expires=' + d.toUTCString()
      document.cookie = cname + '=' + cvalue + '; ' + expires
    }

    pub.resetCookie = function(cname) {
      const expires = 'expires=Thu, 01-Jan-70 00:00:01 GMT;'
      document.cookie = cname + '=' + 'x' + '; ' + expires
    }

    pub.getCookie = function(cname) {
      const name = cname + '='
      const ca = document.cookie.split(';')
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i]
        while (c.charAt(0) == ' ') c = c.substring(1)
        if (c.indexOf(name) == 0) return c.substring(name.length, c.length)
      }
      return ''
    }

    pub.isEmpty = function(obj) {
      return Object.keys(obj).length === 0
    }

    pub.myXOR = function(a, b) {
      return (a || b) && !(a && b)
    }

    pub.chronologicalSort = function(a, b) {
      if (new Date(a.time) < new Date(b.time)) return -1
      if (new Date(a.time) > new Date(b.time)) return 1
      return 0
    }

    pub.lastOf = function(l) {
      if (l.length == 0) return null
      return l[l.length - 1]
    }

    pub.rootMeanSquare = function(l, bgn, end) {
      let i = bgn
      let accum = 0
      while (i < end) {
        accum += l[i] * l[i]
        i++
      }
      return Math.sqrt(accum / (end - bgn))
    }

    pub.vec2ListToNumList = function(l) {
      const rtn = []
      l.forEach(function(f) {
        rtn.push(f.x.toFixed(3))
        rtn.push(f.y.toFixed(3))
      })
      return rtn
    }

    pub.numListToVec2List = function(l) {
      const rtn = []
      for (let i = 0; i < l.length - 1; i += 2) {
        rtn.push(new Vec2(l[i], l[i + 1]))
      }
      return rtn
    }

    pub.linePointDistance = function(v, w, pt) {
      const l2 = v.distance(w)
      if (l2 < 0.00001) {
        return pt.distance(v)
      } // v == w
      const t =
        pt.subtract(v, true).dot(w.subtract(v, true)) / (pt.distance(v) * l2)
      if (t < 0.0) {
        return pt.distance(v)
      } else if (t > 1.0) {
        return pt.distance(w)
      }

      const prj = v.add(w.subtract(v, true).multiply(t, true), true) // Projection falls on the segment
      return pt.distance(prj)
    }

    pub.urlQuery = function(querystring) {
      this.init = function(qs) {
        this.data = {}
        const pairs = qs.substring(1).split('&')
        for (let i = 0; i < pairs.length; i++) {
          const pair = pairs[i].split('=')
          if (pair.length == 2)
            this.data[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1])
        }
      }

      this.get = function(q) {
        return this.data.hasOwnProperty(q) ? this.data[q] : ''
      }

      this.init(querystring)
    }

    pub.normalizeUrl = function(url) {
      const protocols = { x: 'http://', o: 'https://' }
      if (location.protocol + '//' === protocols.x) {
        protocols.x = [protocols.o, (protocols.o = protocols.x)][0] // swap
      }

      if (url.substring(0, protocols.x.length) === protocols.x) {
        url = protocols.o + url.substring(protocols.x.length)
      }
      return url
    }

    pub.epoch1601to1970 = function(t_1970) {
      const epoch_1601 = new Date(Date.UTC(1601, 0, 1)).getTime()
      return t_1970 + epoch_1601
    }

    pub.getUrlData = function(path, resp_type, progress_cb) {
      return new Promise(function(resolve, reject) {
        let xhr = new XMLHttpRequest()
        if ('withCredentials' in xhr) {
          // "withCredentials" only exists on XMLHTTPRequest2 objects.
          xhr.open('GET', path, true)
          xhr.withCredentials = true
          xhr.responseType = resp_type
        } else if (typeof XDomainRequest !== 'undefined') {
          // Otherwise, XDomainRequest only exists in IE, and is IE's way of making CORS requests.
          xhr = new XDomainRequest()
          xhr.open(method, path)
        } else {
          reject(
            new Error(
              'Error from GetUrlData: CORS is not supported by the browser.'
            )
          )
        }

        if (!xhr) {
          reject(
            new Error(
              'Error from GetUrlData: CORS is not supported by the browser.'
            )
          )
        }
        xhr.onerror = reject

        xhr.addEventListener('progress', function(event) {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100
            if (progress_cb) progress_cb(progress)
          }
        })

        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            // if complete
            if (xhr.status === 200) {
              // check if "OK" (200)
              resolve(xhr.response)
            } else {
              reject(
                new Error('XMLHttpRequest Error, Status code:' + xhr.status)
              )
            }
          }
        }

        xhr.send()
      })
    }

    pub.getOutputScale = function(ctx) {
      const devicePixelRatio = window.devicePixelRatio || 1 //
      const backingStoreRatio =
        ctx.webkitBackingStorePixelRatio ||
        ctx.mozBackingStorePixelRatio ||
        ctx.msBackingStorePixelRatio ||
        ctx.oBackingStorePixelRatio ||
        ctx.backingStorePixelRatio ||
        1
      const pixelRatio = devicePixelRatio / backingStoreRatio
      return {
        sx: pixelRatio,
        sy: pixelRatio,
        scaled: pixelRatio != 1
      }
    }

    pub.getPdf = function(path) {
      r2.modalWindowLoading.bgnDownloadingPdf()
      return pub
        .getUrlData(path, 'arraybuffer', function(progress) {
          r2.modalWindowLoading.setPdfProgress(100.0 * progress)
        })
        .then(function(pdf_data) {
          return new Promise(function(resolve, reject) {
            PDFJS.getDocument(new Uint8Array(pdf_data), null, null)
              .then(function(_pdf) {
                resolve(_pdf)
              })
              .catch(reject)
          })
        })
    }

    pub.setAjaxCsrfToken = function() {
      $.ajaxSetup({
        beforeSend: function(xhr, settings) {
          function getCookie(name) {
            let cookieValue = null
            if (document.cookie && document.cookie != '') {
              const cookies = document.cookie.split(';')
              for (let i = 0; i < cookies.length; i++) {
                const cookie = jQuery.trim(cookies[i])
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) == name + '=') {
                  cookieValue = decodeURIComponent(
                    cookie.substring(name.length + 1)
                  )
                  break
                }
              }
            }
            return cookieValue
          }
          if (
            !(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))
          ) {
            // Only send the token to relative URLs i.e. locally.
            xhr.setRequestHeader('X-CSRFToken', getCookie('csrftoken'))
          }
        }
      })
    }

    pub.postToDbsServer = function(op, msg) {
      return new Promise(function(resolve, reject) {
        const url = r2.ctx.serve_dbs_url + 'dbs/op=' + op
        $.ajax({
          type: 'POST',
          url: url,
          data: msg,
          timeout: 5000, // in milliseconds
          success: function(data) {
            console.log({ data })
            resolve(data)
          },
          error: function(err) {
            reject(err)
          }
        })
      })
    }

    pub.getMyself = function() {
      return new Promise((resolve, reject) => {
        const url = r2.ctx.serve_dbs_url + 'dbs/getmyself'
        $.ajax({
          type: 'GET',
          url: url,
          headers: {
            authorization: r2.ctx.auth.sub
          },
          timeout: 5000, // in milliseconds
          success: function(data) {
            console.log({ data })
            resolve(data)
          },
          error: function(err) {
            reject(err)
          }
        })
      })
    }

    pub.getGroupData = function(msg) {
      return new Promise((resolve, reject) => {
        const url =
          r2.ctx.serve_dbs_url +
          'dbs/getgroupdata/' +
          msg.groupid.replace('grp:', '')
        $.ajax({
          type: 'GET',
          url: url,
          headers: {
            authorization: r2.ctx.auth
          },
          timeout: 5000, // in milliseconds
          success: function(data) {
            console.log({ data })
            resolve(data)
          },
          error: function(err) {
            reject(err)
          }
        })
      })
    }

    pub.postDownloadCmds = function(msg) {
      return new Promise(function(resolve, reject) {
        const url = r2.ctx.serve_dbs_url + 'dbs/downloadcmds'
        $.ajax({
          type: 'POST',
          url: url,
          data: msg,
          timeout: 5000, // in milliseconds
          success: function(data) {
            console.log({ data })
            resolve(data)
          },
          error: function(err) {
            reject(err)
          }
        })
      })
    }

    pub.postWebAppLogs = function(msg) {
      return new Promise(function(resolve, reject) {
        const url = r2.ctx.serve_dbs_url + 'dbs/webapplogs'
        $.ajax({
          type: 'POST',
          url: url,
          data: msg,
          timeout: 5000, // in milliseconds
          success: function(data) {
            console.log({ data })
            resolve(data)
          },
          error: function(err) {
            reject(err)
          }
        })
      })
    }

    pub.uploadCmd = function(msg) {
      return new Promise(function(resolve, reject) {
        const url = r2.ctx.serve_dbs_url + 'dbs/uploadcmd'
        $.ajax({
          type: 'POST',
          url: url,
          data: msg,
          timeout: 5000, // in milliseconds
          success: function(data) {
            console.log({ data })
            resolve(data)
          },
          error: function(err) {
            reject(err)
          }
        })
      })
    }

    pub.getUploadSas = function(msg) {
      return new Promise(function(resolve, reject) {
        const url = r2.ctx.serve_dbs_url + 'dbs/getuploadsas'
        $.ajax({
          type: 'GET',
          url: url,
          data: msg,
          timeout: 5000, // in milliseconds
          success: function(data) {
            console.log({ data })
            resolve(data)
          },
          error: function(err) {
            reject(err)
          }
        })
      })
    }

    pub.putBlobWithSas = function(url, sas, blob) {
      return new Promise(function(resolve, reject) {
        const blob_reader = new FileReader()
        blob_reader.onloadend = function(evt) {
          if (evt.target.readyState === FileReader.DONE) {
            const requestData = new Uint8Array(evt.target.result)
            $.ajax({
              url: url + '?' + sas,
              type: 'PUT',
              data: requestData,
              processData: false,
              beforeSend: function(xhr) {
                xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob')
              },
              xhr: function() {
                const xhr = new window.XMLHttpRequest()
                xhr.upload.addEventListener(
                  'load',
                  function(e) {
                    resolve(url)
                  },
                  false
                )
                return xhr
              },
              error: reject
            })
          }
        }
        blob_reader.readAsArrayBuffer(blob)
      })
    }

    pub.escapeDomId = function(s) {
      if (s) {
        return s.replace(/\.|\-|T|\:/g, '_')
      }
      return ''
    }

    pub.SimplifyStrokeDouglasPuecker = function(pts, begin, end, _eps) {
      if (pts == null) {
        return []
      }
      let maxDist = 0
      let farthestPtIndex = 0

      const startPt = pts[begin]
      const endPt = pts[end - 1]
      for (let i = begin; i < end; ++i) {
        const pt = pts[i]
        const curDist = pub.linePointDistance(startPt, endPt, pt)
        if (curDist > maxDist) {
          farthestPtIndex = i
          maxDist = curDist
        }
      }
      if (
        maxDist > _eps &&
        end - begin > 2 &&
        farthestPtIndex != begin &&
        farthestPtIndex != end - 1
      ) {
        const rlist = pub.SimplifyStrokeDouglasPuecker(
          pts,
          farthestPtIndex,
          end,
          _eps
        )
        let llist = pub.SimplifyStrokeDouglasPuecker(
          pts,
          begin,
          farthestPtIndex + 1,
          _eps
        )
        llist = llist.concat(rlist)
        return llist
      } else {
        const rtn_list = []
        if (begin == 0) {
          rtn_list.push(pts[begin])
        }
        rtn_list.push(pts[end - 1])
        return rtn_list
      }
    }

    pub.jqueryInsert = function($target, $elem, idx) {
      var idx_last = $target.children().length
      $target.append($elem)
      if (idx < idx_last) {
        $target
          .children()
          .eq(idx)
          .before($target.children().last())
      }
    }

    /*
     * Jon Surrell's GUID function from SO: http://stackoverflow.com/a/105074
     */
    pub.generateGuid = function() {
      function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
          .toString(16)
          .substring(1)
      }
      return s4() + s4() + s4() + s4() + s4() + s4() + s4() + s4()
    }

    pub.retryPromise = function(promise, interval, count) {
      return promise.catch(function(err) {
        if (count === 1) {
          return Promise.reject(err)
        } else {
          return new Promise(function(resolve, reject) {
            window.setTimeout(function() {
              pub
                .retryPromise(promise, interval, count - 1)
                .then(function(resp) {
                  resolve(resp)
                })
                .catch(function(err) {
                  reject(err)
                })
            }, interval)
          })
        }
      })
    }

    pub.focusWithoutScroll = function(target_dom) {
      const pos = r2.dom.getScroll()
      target_dom.focus()
      r2.dom.setScroll(pos.x, pos.y)
    }

    return pub
  })()
})((window.r2 = window.r2 || {}))
