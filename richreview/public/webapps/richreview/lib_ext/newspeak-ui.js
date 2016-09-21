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

        pub.drawDynamic = function(){
        };

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
                    conf: data[3], // confidence
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
            digestTokenBuffer(token_buffer);
            token_buffer = [];
            r2App.is_recording_or_transcribing = false;
            indicators.hideTranscribing();
        };

        pub.setData = function(data){
            /*
             on load data
            */
        };

        function init(){
            $tbox[0].addEventListener('keydown', onKeyDown);
            $tbox[0].addEventListener('keyup', function(){
                pub.fitDomSize();
            });
        }

        function getAnchoredSpan(){
            var sel = window.getSelection();
            if(sel.anchorNode){
                var span = sel.anchorNode;
                console.log('start', span);
                while(span.parentNode !== $tbox[0]){
                    span = span.parentNode;
                    console.log(span);
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
                        anchor_span = getAnchoredSpan();
                        if(anchor_span){$anchor_span = $(anchor_span);}
                        pub.insertRecording();
                    }
                    e.preventDefault();
                }
                else{
                    if(r2App.mode === r2App.AppModeEnum.RECORDING){
                        r2.recordingCtrl.stop(true); // to_upload
                        r2.log.Log_Simple("Recording_Stop");
                        e.preventDefault();
                    }
                }
            }
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
                    word: '\xa0',
                    bgn: prev.end,
                    end: next.bgn,
                    conf: 0.0,
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

        init();

        return pub;
    };
}(window.r2 = window.r2 || {}));
