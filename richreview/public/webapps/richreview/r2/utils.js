/**
 * Created by Dongwook on 10/18/2014.
 */

/** @namespace r2 */
(function(r2){
    "use strict";

    r2.util = (function(){
        var pub = {};
        pub.handleError = function(err, msg){
            if(r2App.is_first_error && !err.silent){
                r2App.is_first_error = false; // do not prompt error msgs for the subsequent errors

                var s = "Error Message: " + err.message + "\n\nDetails: " + err.stack;

                if(typeof msg === 'undefined') {
                    msg = 'We caught an invalid operation of the system.';
                }
                prompt(msg, s + '\n' + window.location.href);
            }
        };

        pub.setCookie = function (cname, cvalue, exdays) {
            var d = new Date();
            d.setTime(d.getTime() + (exdays*24*60*60*1000));
            var expires = "expires="+d.toUTCString();
            document.cookie = cname + "=" + cvalue + "; " + expires;
        };

        pub.getCookie = function (cname) {
            var name = cname + "=";
            var ca = document.cookie.split(';');
            for(var i=0; i<ca.length; i++) {
                var c = ca[i];
                while (c.charAt(0)==' ') c = c.substring(1);
                if (c.indexOf(name) == 0) return c.substring(name.length,c.length);
            }
            return "";
        };

        pub.isEmpty = function (obj) {
            return Object.keys(obj).length === 0;
        };

        pub.myXOR = function (a,b) {
            return ( a || b ) && !( a && b );
        };

        pub.chronologicalSort = function(a,b) {
            if (new Date(a.time) < new Date(b.time))
                return -1;
            if (new Date(a.time) > new Date(b.time))
                return 1;
            return 0;
        };

        pub.lastOf = function (l){
            if(l.length==0)
                return null;
            return l[l.length-1];
        };

        pub.rootMeanSquare = function (l, bgn, end){
            var i = bgn;
            var accum = 0;
            while(i < end){
                accum += l[i]*l[i];
                i++
            }
            return Math.sqrt(accum/ (end-bgn));
        };

        pub.vec2ListToNumList = function (l){
            var rtn = [];
            l.forEach(function(f){
                rtn.push(f.x.toFixed(3));rtn.push(f.y.toFixed(3));
            });
            return rtn;
        };

        pub.numListToVec2List = function (l){
            var rtn = [];
            for(var i = 0; i < l.length-1; i += 2){
                rtn.push(new Vec2(l[i], l[i+1]));
            }
            return rtn;
        };

        pub.linePointDistance = function (v, w, pt) {
            var l2 = v.distance(w);
            if (l2 < 0.00001){return pt.distance(v);}   // v == w
            var t = pt.subtract(v, true).dot(w.subtract(v, true)) / l2;
            if (t < 0.0){return pt.distance(v);}
            else if (t > 1.0){return pt.distance(w);}
            var prj = v.add(t * (w.subtract(v, true)), true);  // Projection falls on the segment
            return pt.distance(prj);
        };

        pub.urlQuery = function (querystring){
            this.init = function(qs){
                this.data = {};
                var pairs = qs.substring(1).split('&');
                for (var i = 0; i < pairs.length; i++) {
                    var pair = pairs[i].split('=');
                    if(pair.length == 2)
                        this.data[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
                }
            };

            this.get = function(q){
                return this.data.hasOwnProperty(q) ? this.data[q] : "";
            };

            this.init(querystring);
        };

        pub.normalizeUrl = function(url){
            var protocols = {x:'http://', o:'https://'};
            if(location.protocol + '//' === protocols.x){
                protocols.x = [protocols.o, protocols.o = protocols.x][0]; // swap
            }

            if(url.substring(0, protocols.x.length) === protocols.x){
                url = protocols.o + url.substring(protocols.x.length);
            }
            return url;
        };

        pub.epoch1601to1970 = function (t_1970){
            var epoch_1601 = new Date(Date.UTC(1601,0,1)).getTime();
            return t_1970+epoch_1601;
        };

        pub.getUrlData = function(path, resp_type, progress_cb){
            return new Promise(function(resolve, reject){
                var xhr = new XMLHttpRequest();
                if ("withCredentials" in xhr) { // "withCredentials" only exists on XMLHTTPRequest2 objects.
                    xhr.open('GET', path, true);
                    xhr.withCredentials = true;
                    xhr.responseType = resp_type;
                }
                else if (typeof XDomainRequest != "undefined") { // Otherwise, XDomainRequest only exists in IE, and is IE's way of making CORS requests.
                    xhr = new XDomainRequest();
                    xhr.open(method, path);
                }
                else {
                    reject(new Error('Error from GetUrlData: CORS is not supported by the browser.'));
                }

                if (!xhr) {
                    reject(new Error('Error from GetUrlData: CORS is not supported by the browser.'));
                }
                xhr.onerror = reject;

                xhr.addEventListener('progress', function(event) {
                    if(event.lengthComputable) {
                        var progress = (event.loaded / event.total) * 100;
                        if(progress_cb)
                            progress_cb(progress);
                    }
                });

                xhr.onreadystatechange = function(){
                    if (xhr.readyState === 4){   //if complete
                        if(xhr.status === 200){  //check if "OK" (200)
                            resolve(xhr.response);
                        } else {
                            reject(new Error("XMLHttpRequest Error, Status code:" + xhr.status));
                        }
                    }
                };

                xhr.send();
            });
        };

        pub.getOutputScale = function(ctx) {
            var devicePixelRatio = window.devicePixelRatio || 1; //
            var backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
                ctx.mozBackingStorePixelRatio ||
                ctx.msBackingStorePixelRatio ||
                ctx.oBackingStorePixelRatio ||
                ctx.backingStorePixelRatio || 1;
            var pixelRatio = devicePixelRatio / backingStoreRatio;
            console.log("pixelratio:", devicePixelRatio, backingStoreRatio);
            return {
                sx: pixelRatio,
                sy: pixelRatio,
                scaled: pixelRatio != 1
            };
        };

        pub.getPdf = function(path){
            r2.modalWindowLoading.bgnDownloadingPdf();
            return pub.getUrlData(
                path,
                "arraybuffer",
                function(progress){
                    r2.modalWindowLoading.setPdfProgress(100.0*progress);
                }
            ).then(
                function(pdf_data){
                    return new Promise(function(resolve, reject) {
                        PDFJS.getDocument(new Uint8Array(pdf_data), null, null)
                            .then(
                            function (_pdf) {
                                resolve(_pdf);
                            }
                        ).catch(reject);
                    });
                }
            );
        };

        pub.setAjaxCsrfToken = function(){
            $.ajaxSetup({
                beforeSend: function(xhr, settings) {
                    function getCookie(name) {
                        var cookieValue = null;
                        if (document.cookie && document.cookie != '') {
                            var cookies = document.cookie.split(';');
                            for (var i = 0; i < cookies.length; i++) {
                                var cookie = jQuery.trim(cookies[i]);
                                // Does this cookie string begin with the name we want?
                                if (cookie.substring(0, name.length + 1) == (name + '=')) {
                                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                                    break;
                                }
                            }
                        }
                        return cookieValue;
                    }
                    if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                        // Only send the token to relative URLs i.e. locally.
                        xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
                    }
                }
            });
        };

        pub.ajaxPostTextData = function(data, progressCb){
            return new Promise(function(resolve, reject){
                var posting = $.ajax({
                    type: 'POST',
                    url: r2.ctx.upload_audio_url,
                    data: data,
                    dataType: 'text',
                    xhr: function() {  // custom xhr
                        var myXhr = $.ajaxSettings.xhr();
                        if(myXhr.upload){ // check if upload property exists
                            myXhr.upload.addEventListener(
                                'progress',
                                progressCb,
                                false); // for handling the progress of the upload
                        }
                        return myXhr;
                    }
                });
                posting.success(
                    function(resp) {
                        resolve(resp);
                    }
                );
                posting.fail(
                    function(err) {
                        reject(err);
                    }
                );
            });
        };

        pub.postToDbsServer = function(op, msg){
            return new Promise(function(resolve, reject){
                var url = r2.ctx.serve_dbs_url + 'op=' + op;
                var posting = $.post(url, msg);
                posting.success(function(resp){
                    resolve(resp);
                });
                posting.fail(function(err){
                    reject(err)
                });
            });
        };

        pub.escapeDomId = function(s){
            return s.replace(/\.|\-|T|\:/g, '_');
        };

        return pub;
    }());


}(window.r2 = window.r2 || {}));