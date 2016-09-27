/**
 * Created by yoon on 9/20/16.
 */

(function(r2) {
    'use strict';

    r2.newspeakUI = function (_textbox, _annotid, _annotids) {
        var pub = {};
        var $tbox = $(_textbox);
        var token_buffer = [];
        var anchor_span = null;
        var $anchor_span = null;
        var annotid = _annotid;
        var cur_gesture_replay = null;
        var first = false;

        pub.bgnCommenting = function(){
            r2App.is_recording_or_transcribing = true;
            $tbox.focus();
            indicators.showWait();
        };

        pub.bgnCommentingAsync = function(){
            r2.tooltipAudioWaveform.show();
            indicators.hideWait();
            indicators.showSpeak();
        };

        pub.setCaptionFinal = function(words, base_annotid){
            words.forEach(function(data){
                token_buffer.push({
                    word: data[0],
                    bgn: data[1],
                    end: data[2],
                    annotid: base_annotid
                });
            });
        };

        pub.onEndRecording = function(){
            r2.tooltipAudioWaveform.dismiss();
            indicators.hideSpeak();
            indicators.showTranscribing();
        };

        pub.doneCommentingAsync = function(){
            indicators.hideWait(); // in case when bluemix failed.
            digestTokenBuffer(token_buffer);
            token_buffer = [];
            r2App.is_recording_or_transcribing = false;
            indicators.hideTranscribing();
            r2App.cur_page.refreshSpotlightPrerenderNewspeak();
        };

        pub.setData = function(data){
            /*
             on load data
            */
        };

        pub.saveAnchorSpan = function(){
            if(r2App.mode !== r2App.AppModeEnum.RECORDING) {
                anchor_span = getAnchoredSpan();
                if (anchor_span) {
                    $anchor_span = $(anchor_span);
                }
            }
        };

        pub.drawDynamic = function(canvas_ctx){
            if(cur_gesture_replay) {
                r2App.cur_page.dynamicSpotlightNewspeak(canvas_ctx, cur_gesture_replay, first);
                first = false;
            }
            return;
        };

        function init(){
            $tbox[0].addEventListener('focus', function(e) {
                document.addEventListener('selectionchange', selectionCb);
            });
            $tbox[0].addEventListener('blur', function(e) {
                document.removeEventListener('selectionchange', selectionCb);
            });
            $tbox[0].addEventListener('keydown', onKeyDown);
            $tbox[0].addEventListener('keyup', function(){
                pub.fitDomSize();
            });
            function selectionCb(e){
                pub.saveAnchorSpan();
            }
        }

        function getAnchoredSpan(){
            var sel = window.getSelection();
            if(sel.anchorNode && $tbox.has($(sel.anchorNode)).length !== 0){
                var span = sel.anchorNode;
                while(span.nodeName !== 'SPAN'){
                    if(span.parentNode === $tbox[0]){
                        return null;
                    }
                    else{
                        span = span.parentNode;
                    }
                }
                return span;
            }
            else{
                return null;
            }
        }

        function onKeyDown(e){
            if(e.keyCode === r2.keyboard.CONST.KEY_ENTER) {
                if(r2.keyboard.shift_key_dn){  // shift+enter starts new recording
                    if(r2App.mode === r2App.AppModeEnum.RECORDING) {

                    }
                    else{
                        if(r2App.mode === r2App.AppModeEnum.REPLAYING) {
                            //r2.rich_audio.stop();
                        }
                        pub.saveAnchorSpan();
                        pub.insertRecording();
                    }
                    e.preventDefault();
                }
                else{
                    if(r2App.mode === r2App.AppModeEnum.RECORDING){
                        r2.recordingCtrl.stop(true); // to_upload
                        r2.log.Log_Simple("Recording_Stop_ENTER");
                        e.preventDefault();
                    }
                }
            }
            if(e.keyCode === r2.keyboard.CONST.KEY_SPACE){
                if(r2App.mode === r2App.AppModeEnum.RECORDING) {
                    r2.recordingCtrl.stop(true); // to_upload
                    r2.log.Log_Simple("Recording_Stop_SPACE");
                    e.preventDefault();
                }
                else if (r2App.mode === r2App.AppModeEnum.REPLAYING) {
                    r2.speechSynth.cancel();
                    r2.log.Log_AudioStop('stop_btn', r2.audioPlayer.getCurAudioFileId(), r2.audioPlayer.getPlaybackTime());
                    e.preventDefault();
                }
            }
            if(e.keyCode === r2.keyboard.CONST.KEY_ESC){
                r2.recordingCtrl.stop(true); // to_upload
                r2.log.Log_Simple("Recording_Stop_ESC");
                e.preventDefault();
            }
            if(r2App.mode === r2App.AppModeEnum.RECORDING) {
                e.preventDefault();
            }
            normalizeSpans();
        }

        function normalizeSpans(){
            // size
            $tbox.find('span').css('font-size', '1.0em');
        }

        function digestTokenBuffer(buf){
            function capitalize(datum){
                if(datum.word.length > 0){
                    datum.word = datum.word.charAt(0).toUpperCase() + datum.word.slice(1);
                }
            }
            function punctuate(datum){
                datum.word = datum.word + '.';
            }

            if(buf.length > 0){
                capitalize(buf[0]);
            }
            if(buf.length > 1){
                punctuate(buf[buf.length-1]);
            }
            for(var i = buf.length-1; i > 0; --i){
                var prev = buf[i-1];
                var next = buf[i];
                var space = {
                    word: ' ',
                    bgn: prev.end,
                    end: next.bgn,
                    annotid: prev.annotid
                };
                if(next.bgn-prev.end > 0.8){
                    punctuate(prev);
                    capitalize(next);
                }
                buf.splice(i, 0, space);
            }
            if(anchor_span){
                for(var i = buf.length-1; i >= 0; --i) {
                    var datum = buf[i];
                    var span = $('<span>'+datum.word+'</span>');
                    Object.keys(datum).forEach(function(key){
                        span.attr(key, datum[key]);
                    });
                    $(anchor_span).after(span);
                }
            }
            else{
                buf.forEach(function(datum){
                    var span = $('<span>'+datum.word+'</span>');
                    Object.keys(datum).forEach(function(key){
                        span.attr(key, datum[key]);
                    });
                    $tbox.append(span);
                });
            }
        }

        var indicators = (function(){
            var pub_in = {};

            var $wait = $('<span>Please wait.</span>');
            $wait.addClass('newspeak_wait').addClass('blink_me');

            var $speak = $('<span>Now Speak!</span>');
            $speak.addClass('newspeak_speak').addClass('blink_me');

            var $transcribing= $('<span>Transcribing your speech. Please wait.</span>');
            $transcribing.addClass('newspeak_wait').addClass('blink_me');

            pub_in.showWait = function(){
                if($anchor_span){
                    $anchor_span.after($wait);
                }
                else{
                    $tbox.append($wait);
                }
            };

            pub_in.hideWait = function(){
                $wait.remove();
            };

            pub_in.showSpeak = function(){
                if($anchor_span){
                    $anchor_span.after($speak);
                }
                else {
                    $tbox.append($speak);
                }
            };

            pub_in.hideSpeak = function(){
                $speak.remove();
            };

            pub_in.showTranscribing = function(){
                if($anchor_span){
                    $anchor_span.after($transcribing);
                }
                else {
                    $tbox.append($transcribing);
                }
            };

            pub_in.hideTranscribing = function(){
                $transcribing.remove();
            };

            return pub_in;
        }());

        pub.Play = function(cbLoadingBgn, cbLoadingEnd){

            function getFlattenTextAndSpan(d, l){
                for(var i = 0; i < d.childNodes.length; ++i){
                    getFlattenTextAndSpan(d.childNodes[i], l);
                }
                if(d.nodeName === '#text'){
                    l[l.length-1].push({
                        t: d,
                        s: d.parentNode.nodeName === 'SPAN' ? d.parentNode : null
                    });

                    var txt = d.textContent.trim();
                    if( txt.length > 0 &&
                        (txt.charAt(txt.length-1) === '.' || txt.charAt(txt.length-1) === ',')) {
                        l.push([]); // break the line when the word ends with '.' or ','
                    }
                }
                else if(d.nodeName === 'DIV'){
                    l.push([]); // break the line
                }
            }

            function getSentenceText(sentence){
                var txt = '';
                for(var i = 0; i < sentence.length; ++i){
                    txt += sentence[i].t.textContent;
                }
                return txt;
            }

            function runForEachSpan(sentence, func){
                sentence.forEach(function(text_and_span){
                    if(text_and_span.s){
                        func(text_and_span.s);
                    }
                });
            }

            function getGestureReplay(sentence){
                if(sentence === null){return;}
                var l = [];
                for(var i = 0; i < sentence.length; ++i){
                    var span = sentence[i].s;
                    if(span){
                        var span_annotid = span.getAttribute('annotid');
                        if(span_annotid){
                            var annot = r2App.annots[span_annotid];
                            if(annot){
                                l.push({
                                    annot: annot,
                                    bgn: 1000*parseFloat(span.getAttribute('bgn')),
                                    end: 1000*parseFloat(span.getAttribute('end'))
                                })
                            }
                        }
                    }
                }
                return l;
            }

            // flatten the dom tree into a list of sentences: [ [t:texts,s:span], ...]
            var tbox = $tbox[0];
            var sentences = [[]];
            for(var i = 0; i < tbox.childNodes.length; ++i){
                getFlattenTextAndSpan(tbox.childNodes[i], sentences);
            }

            // remove '[]'s
            for(var i = sentences.length-1; i >=0; --i){
                if(sentences[i].length === 0)
                    sentences.splice(i, 1);
            }

            var anchor_n = 0;
            for(var i = 0; i < sentences.length; ++i) {
                var gotit = false;
                runForEachSpan(sentences[i], function (s) {
                    if (s === anchor_span) {
                        gotit = i;
                    }
                });
                if(gotit)
                    anchor_n = i;
            }


            var serialPlay = function(i){
                if(i < sentences.length){
                    runForEachSpan(sentences[i], function(s){$(s).addClass('replaying')});
                    first = true;
                    cur_gesture_replay = getGestureReplay(sentences[i]);
                    r2App.invalidate_dynamic_scene = true;
                    r2.speechSynth.play(getSentenceText(sentences[i]), annotid, cbLoadingBgn, cbLoadingEnd)
                        .then(function(){
                            runForEachSpan(sentences[i], function(s){$(s).removeClass('replaying')});
                            if(!r2.speechSynth.is_canceled){
                                cur_gesture_replay = null;
                                i += 1;
                                serialPlay(i);
                            }
                        });
                }
            };
            serialPlay(anchor_n);
            return;
        };

        pub.Stop = function(){
            r2.speechSynth.cancel();
        };

        init();

        return pub;
    };
}(window.r2 = window.r2 || {}));
