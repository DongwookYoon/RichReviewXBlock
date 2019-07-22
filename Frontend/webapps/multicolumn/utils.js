/* eslint-disable camelcase,no-var,no-console,prefer-const,no-unused-vars,prettier/prettier,no-undef,no-lone-blocks,no-extend-native */
/**
 * Created by Dongwook Yoon on 3/25/15.
 */

/** @namespace Pla */
;(function(Pla) {
  Pla.util = (function() {
    const pub = {}

    pub.getOutputScale = function(ctx) {
      const devicePixelRatio = window.devicePixelRatio || 1
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
        scaled: pixelRatio !== 1
      }
    }

    /**
     * Check environments if it's mobile or non-Chrome
     */
    pub.checkEnv = function() {
      return new Promise(function(resolve, reject) {
        resolve()
      })
    }

    pub.handleErr = function(err, msg) {
      const s_header =
        'Something unexpected went wrong with this pdf file. ' +
        'Please try again. If this error persists, please contact the system manager (dy252@cornell.edu) about this.\n\n'
      let s
      if (err instanceof Error) {
        s = 'Browser Error'
        if (err.stack) {
          s += '\n\n    Specific: ' + err.stack
        }
      } else if (err instanceof Object) {
        s = 'Network Error'
        if (err.hasOwnProperty('status') && err.hasOwnProperty('statusText')) {
          s += '\n\n    Status: ' + err.status + ', ' + err.statusText
        }
        if (err.hasOwnProperty('responseText')) {
          s += '\n\n    Specific: ' + err.responseText
        }
      } else {
        s = 'Unknown Error'
      }
      if (typeof msg === 'string') {
        s += '\n\n    Context: ' + msg
      }
      if (!Pla.recurring_err) {
        alert(s_header + s)
        Pla.recurring_err = true
        Pla.override.error(err)
      }
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

    pub.postJson = function(url, data) {
      return new Promise(function(resolve, reject) {
        const posting = $.ajax({
          type: 'POST',
          url: url,
          data: data,
          contentType: 'application/jsonrequest'
        })

        posting.success(function(resp) {
          resolve(resp)
        })

        posting.fail(function(resp) {
          reject(resp)
        })
      })
    }

    return pub
  })()

  // from http://stackoverflow.com/questions/7837456/comparing-two-arrays-in-javascript
  Array.prototype.equals = function(array) {
    // if the other array is a falsy value, return
    if (!array) return false

    // compare lengths - can save a lot of time
    if (this.length !== array.length) return false

    for (let i = 0, l = this.length; i < l; i++) {
      // Check if we have nested arrays
      if (this[i] instanceof Array && array[i] instanceof Array) {
        // recurse into the nested arrays
        if (!this[i].equals(array[i])) return false
      } else if (this[i] !== array[i]) {
        // Warning - two different object instances will never be equal: {x:20} !== {x:20}
        return false
      }
    }
    return true
  }
})((window.Pla = window.Pla || {}))
