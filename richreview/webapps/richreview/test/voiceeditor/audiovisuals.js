/**
 * Created by venkatesh-sivaraman on 7/8/15.
 */
'use strict';

var Audiovisual = function (canvasElement) {

    var audioFrames = [];
    this.wordIntervals = [];
    /**
     * Set beginVisible and endVisible to the times (in seconds) at which the audio waveform should be displayed.
     * Set endVisible to -1 to default to the end of the buffer.
     * @type {number}
     */
    var beginVisible = 0,
        endVisible = -1;
    this.__defineGetter__('beginVisible', function() { return beginVisible; });
    this.__defineSetter__('beginVisible', function(val) {
        audioPower_ = [];
        beginVisible = val;
    });
    this.__defineGetter__('endVisible', function() { return endVisible; });
    this.__defineSetter__('endVisible', function(val) {
        audioPower_ = [];
        endVisible = val;
    });

    this.sampleRate = 22050;
    this.canvas = canvasElement;
    this.selectedInterval = {
        start: -1,
        end: -1
    };

    var audioPower_ = [],
        _this = this;

    /**
     * Clears the Audiovisual canvas to prepare for a new audio session.
     */
    this.clear = function() {
        audioFrames = [];
        this.wordIntervals = [];
        this.beginVisible = 0;
        this.endVisible = -1;
        this.sampleRate = 22050;
        this.renderWaveform();
    };

    /**
     * Calculates the audio power of audioFrames and saves it to `audioPower_`.
     * @private
     */
    var calculateAudioPower_ = function (frameGranularity) {
        var squaresSum = 0;
        var min = Number.POSITIVE_INFINITY, max = Number.NEGATIVE_INFINITY, value,
            beginFrame = Math.floor();

        for (var i = 0; i < audioFrames.length; i += 2) {
            var beginValue = Math.abs(audioFrames[i] << 8 + (audioFrames[i + 1]));
            squaresSum += beginValue * beginValue;
            if ((i % frameGranularity) >= (frameGranularity - 2)) {
                value = Math.sqrt(squaresSum / (frameGranularity / 2));
                if (value < min) {
                    min = value;
                }
                if (value > max) {
                    max = value;
                }
                audioPower_.push(value);
                squaresSum = 0;
            }
        }

        // Now normalize based on the minimum and maximum values
        for (i = 0; i < audioPower_.length; i++) {
            audioPower_.splice(i, 1, Math.max(0, Math.min(1, (audioPower_[i] - min) / (max - min))));
        }
    };

    /**
     * Gives the Audiovisual canvas a set of audio "frames" to draw. The frames should be in Int8Array format
     * @param frames
     */
    this.setAudioFrames = function (frames) {
        audioFrames = frames;
        audioPower_ = [];
    };

    /**
     * Renders the waveform into the canvas.
     * Providing startFrame, endFrame, startX, and endX is optional, but providing them allows you to stretch the
     * waveform as desired to fit within a certain width.
     * @param ctx
     * @param startFrame (optional) Provides the index of the frame in audioPower_ to start rendering at. Default 0.
     * @param endFrame (optional) The index of the frame in audioPower_ to stop rendering at. Defaults to the
     * end of audioPower_.
     * @param startX (optional) The x-coordinate in the canvas at which to begin drawing. Default 0.
     * @param endX (optional) The x-coordinate in the canvas at which to end drawing. Defaults to the width of the
     * canvas.
     */
    this.renderWaveformSegment_ = function (ctx, startFrame, endFrame, startX, endX) {
        if (typeof startFrame === 'undefined')
            startFrame = 0;
        if (typeof endFrame === 'undefined')
            endFrame = audioPower_.length;
        if (typeof startX === 'undefined')
            startX = 0;
        if (typeof endX === 'undefined')
            endX = this.canvas.width;
        ctx.save();
        ctx.translate(startX, 0);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        var frameX = 0;
        var frameWidth = (endX - startX) / (endFrame - startFrame);
        var frameY = this.canvas.height - (audioPower_[0] * this.canvas.height);
        ctx.beginPath();
        ctx.moveTo(frameX, frameY);
        frameX += frameWidth;
        for (var i = startFrame + 1; i < endFrame; i++, frameX += frameWidth) {
            frameY = this.canvas.height - (audioPower_[i] * this.canvas.height);
            // For bezier curves:
            /*ctx.bezierCurveTo(
             frameX, frameY,
             frameX + frameWidth, this.canvas.height - (audioPower_[i + 1] * this.canvas.height),
             frameX + 2 * frameWidth, this.canvas.height - (audioPower_[i + 2] * this.canvas.height));
             frameX += 3 * frameWidth;*/
            ctx.lineTo(frameX, frameY);
        }
        ctx.stroke();
        ctx.closePath();
        ctx.restore();
    };

    /**
     * Renders the vertical lines that denote word interval boundaries in the canvas.
     * @param ctx
     * @param startTime (optional) The time (in seconds) to start rendering word intervals at. Default 0.
     * @param endTime (optional) The time (in seconds) stop rendering word intervals at. Defaults to the
     * duration of the recording.
     * @param startX (optional) The x-coordinate in the canvas at which to begin drawing. Default 0.
     * @param endX (optional) The x-coordinate in the canvas at which to end drawing. Defaults to the width of the
     * canvas.
     * @private
     */
    this.renderWordIntervalBoundaries_ = function (ctx, startTime, endTime, startX, endX) {
        if (typeof startTime === 'undefined')
            startTime = 0;
        if (typeof endTime === 'undefined')
            endTime = audioFrames.length / (2 * this.sampleRate);
        if (typeof startX === 'undefined')
            startX = 0;
        if (typeof endX === 'undefined')
            endX = this.canvas.width;
        ctx.save();
        ctx.strokeStyle = "#EEEEEE";
        ctx.lineWidth = 1.0;
        for (var i = 0; i < this.wordIntervals.length; i++) {
            if (this.wordIntervals[i].startTime < startTime)
                continue;
            if (this.wordIntervals[i].endTime > endTime)
                break;
            ctx.beginPath();
            ctx.moveTo((this.wordIntervals[i].startTime - startTime) * (endX - startX) / (endTime - startTime), 0);
            ctx.lineTo((this.wordIntervals[i].startTime - startTime) * (endX - startX) / (endTime - startTime), this.canvas.height);
            ctx.stroke();
            ctx.closePath();
        }
        ctx.restore();
    };

    /**
     * Determines the frames in audioPower_ which should be rendered. Uses this.beginVisible and this.endVisible as the
     * parameters. Returns an object with `start` and `end` attributes.
     * @private
     */
    this.boundaryFrames_ = function() {
        var start = this.beginVisible * this.sampleRate;
        var end = this.endVisible * this.sampleRate;
        if (this.endVisible < 0) {
            end = audioFrames.length / 2;
        }
        start *= audioPower_.length / (audioFrames.length / 2);
        end *= audioPower_.length / (audioFrames.length / 2);
        return {
            start: Math.round(start),
            end: Math.round(end)
        };
    };

    var delInfo_ = {};

    /**
     * Animates the deletion of a segment of audio. You call this method upon deleting a set of frames from the audio,
     * without calling renderWaveform.
     * Parameters:
     * - newFrames: The complete new set of frames.
     */
    var av = this;
    this.animateDeletion = (function () {
        var renderDeletion = function () {
            if (delInfo_.centerDistance > 0) {
                window.requestAnimFrame(renderDeletion);
                var ctx = av.canvas.getContext('2d');
                ctx.clearRect(0, 0, av.canvas.width, av.canvas.height);
                av.renderWaveformSegment_(ctx, delInfo_.start, delInfo_.centerFrame, 0, delInfo_.centerX - delInfo_.centerDistance);
                av.renderWordIntervalBoundaries_(ctx, av.beginVisible, delInfo_.tStart - 0.0001, 0, delInfo_.centerX - delInfo_.centerDistance);
                av.renderWaveformSegment_(ctx, delInfo_.centerFrame, delInfo_.end, delInfo_.centerX + delInfo_.centerDistance, av.canvas.width);
                av.renderWordIntervalBoundaries_(ctx, delInfo_.tEnd + 0.0001, av.endVisible, delInfo_.centerX + delInfo_.centerDistance, av.canvas.width);
                delInfo_.centerDistance -= delInfo_.animIncrement;
                delInfo_.centerX += delInfo_.centerIncrement;
            } else {
                av.renderWaveform(av.canvas);
            }
        };
        return function (newFrames, startTime, endTime) {
            var centerDistance, centerX, centerFrame, animIncrement,
                start, end, centerIncrement, tStart, tEnd,
                boundFrames = av.boundaryFrames_(), animDuration = 0.5;
            // Animate the width toward the center
            tStart = startTime;
            tEnd = endTime;
            start = boundFrames.start;
            end = boundFrames.end;
            var frameWidth = av.canvas.width / (end - start);
            centerFrame = Math.floor(startTime * audioPower_.length / (audioFrames.length / (2 * av.sampleRate)));
            var startX = (centerFrame - av.beginVisible) * frameWidth,
                endX = (Math.floor(endTime * audioPower_.length / (audioFrames.length / (2 * av.sampleRate))) - av.beginVisible) * frameWidth;
            centerX = (startX + endX) / 2.0;//(Math.floor((startTime + endTime) / 2 * audioPower_.length / (audioFrames.length / (2 * this.sampleRate))) - this.beginVisible) * frameWidth;
            centerDistance = Math.abs(startX - endX) / 2.0; //((endTime - startTime) * this.sampleRate * audioPower_.length / (audioFrames.length / 2)) * frameWidth / 2;
            animIncrement = centerDistance / (animDuration * 30.0);

            av.setAudioFrames(newFrames);
            if (!audioPower_.length) {
                calculateAudioPower_(Math.floor(((_this.endVisible - _this.beginVisible) * _this.sampleRate * 4) / av.canvas.width));
            }
            boundFrames = av.boundaryFrames_();
            start = boundFrames.start;
            end = boundFrames.end;
            var newCenterX = (centerFrame - av.beginVisible) * av.canvas.width / (end - start);
            centerIncrement = (newCenterX - centerX) / (animDuration * 30.0);

            delInfo_ = {
                centerDistance: centerDistance,
                centerX: centerX,
                centerFrame: centerFrame,
                animIncrement: animIncrement,
                start: start,
                end: end,
                centerIncrement: centerIncrement,
                tStart: tStart,
                tEnd: tEnd
            };
            window.requestAnimFrame(renderDeletion);
        };
    }());

    /**
     * Renders the audio waveform in the canvas.
     * @optional progress - The fraction of the waveform which should be filled in (not accounting for scale factors).
     */
    this.renderWaveform = function (progress) {
        var ctx = this.canvas.getContext('2d'),
            start, end;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2.0;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(0, this.canvas.height);
        ctx.lineTo(this.canvas.width, this.canvas.height);
        ctx.stroke();
        ctx.closePath();

        if (this.selectedInterval.start >= 0 && this.selectedInterval.multipleSelect) {
            ctx.fillStyle = "rgba(165, 211, 246, 0.6)";
            ctx.beginPath();
            var leftX = (this.wordIntervals[this.selectedInterval.start].startTime - this.beginVisible) * this.canvas.width / (this.endVisible - this.beginVisible),
                rightX = (this.wordIntervals[this.selectedInterval.end].endTime - this.beginVisible) * this.canvas.width / (this.endVisible - this.beginVisible);
            ctx.moveTo(leftX, 0);
            ctx.lineTo(leftX, this.canvas.height);
            ctx.lineTo(rightX, this.canvas.height);
            ctx.lineTo(rightX, 0);
            ctx.lineTo(leftX, 0);
            ctx.fill();
            ctx.closePath();
        }

        if (audioFrames.length > 2) {
            if (!audioPower_.length) {
                calculateAudioPower_(Math.floor(((this.endVisible - this.beginVisible) * this.sampleRate * 4) / av.canvas.width));
            }
            var boundFrames = this.boundaryFrames_();
            start = boundFrames.start;
            end = boundFrames.end;
            var frameWidth = this.canvas.width / (end - start);

            this.renderWaveformSegment_(ctx, start, end);

            if (progress) {
                ctx.fillStyle = "#b398ea";
                ctx.strokeStyle = "#b398ea";
                ctx.beginPath();
                ctx.moveTo(0, this.canvas.height);
                var frameX = 0;
                for (var i = start; i < audioPower_.length * progress; i++, frameX += frameWidth) {
                    var frameY = this.canvas.height - (audioPower_[i] * this.canvas.height);
                    // For bezier curves:

                    ctx.lineTo(frameX, frameY);
                }
                ctx.lineTo((audioPower_.length * progress - start) * frameWidth, this.canvas.height);
                ctx.lineTo(0, this.canvas.height);
                ctx.stroke();
                ctx.fill();
                ctx.closePath();
            }
        }

        if (this.wordIntervals.length) {
            start = this.beginVisible;
            end = this.endVisible;
            if (this.endVisible < 0) {
                end = audioFrames.length / (2 * this.sampleRate);
            }
            this.renderWordIntervalBoundaries_(ctx, start, end);
        }

        if (this.selectedInterval.start >= 0 && this.selectedInterval.start < this.wordIntervals.length && !this.selectedInterval.multipleSelect) {
            ctx.strokeStyle = "white";
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            var centerX = (this.wordIntervals[this.selectedInterval.start].startTime - this.beginVisible) * this.canvas.width / (this.endVisible - this.beginVisible);
            ctx.moveTo(centerX, 0);
            ctx.lineTo(centerX, this.canvas.height);
            ctx.stroke();
            ctx.closePath();
        }
    };
};