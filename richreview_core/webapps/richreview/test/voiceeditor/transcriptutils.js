/**
 * Created by venkatesh-sivaraman on 7/2/15.
 *
 * This module contains helper functions for formatting the contents of the transcription text area.
 */

'use strict';

var wordAuxiliaryCharacters = [
    "'", ".", ",", ";", ":", '"', "!", "?", "$", "@", "#", "%", "&", "*", "(", ")", "-", "_",
    "+", "=", "[", "]", "{", "}", "|", "\\", "`", "~", "<", ">", "/"
];

var TranscriptUtils = (function () {

    var pub = {};

    var processString_ = function(baseString, isFinished) {

        if (isFinished) {
            var formattedString = baseString.slice(0, -1);
            formattedString = formattedString.charAt(0).toUpperCase() + formattedString.substring(1);
            formattedString = formattedString.trim() + '.';
            //$('#transcript_textbox').text(formattedString);
            // $('#resultsText').val(formattedString);
            return formattedString;
        } else {
            return baseString;
            //$('#transcript_textbox').text(baseString);
            // $('#resultsText').val(baseString);
        }

    };

    /**
     * This function formats the transcription results and returns the formatted result.
     * @param msg - The JSON-format data that resulted from the transcription request.
     * @param baseString - The running transcription.
     * @param punctuate - Whether or not to add a period at the end of the transcription.
     * @param textHandler - A function that takes the final transcription result and a Boolean final value,
     * along with a list of timestamps if available, and possibly displays it.
     * @returns {*} - The running base string for this point in the recording.
     */
    pub.updateTranscriptionResult = function(msg, baseString, punctuate, textHandler) {
        var idx = +msg.result_index;

        if (msg.results && msg.results.length > 0) {

            var alternatives = msg.results[0].alternatives;
            var text = msg.results[0].alternatives[0].transcript || '';

            //Capitalize first word
            // if final results, append a new paragraph
            if (msg.results && msg.results[0] && msg.results[0].final) {
                baseString += text;
                var displayFinalString = baseString;
                displayFinalString = displayFinalString.replace(/%HESITATION\s/g, '');
                displayFinalString = displayFinalString.replace(/(.)\1{2,}/g, '');
                console.log("Straight from the source:", msg.results[0].alternatives[0].timestamps);
                textHandler(processString_(displayFinalString, punctuate), true, msg.results[0].alternatives[0].timestamps);
                //showMetaData(alternatives[0]);
                // Only show alternatives if we're final
                //alternativePrototype.showAlternatives(alternatives);
            } else {
                var tempString = baseString + text;
                tempString = tempString.replace(/%HESITATION\s/g, '');
                tempString = tempString.replace(/(.)\1{2,}/g, '');
                textHandler(processString_(tempString, false), false, msg.results[0].alternatives[0].timestamps);
            }
        }

        return baseString;

    };

    pub.isWordString = function(str) {
        for (var i = 0; i < str.length; i++) {
            if (pub.isWordCharacter(str[i]))
                return true;
        }
        return false;
    };

    pub.isWordCharacter = function(c) {
        var str = [c].join('');
        return str.toLowerCase() != str.toUpperCase() || wordAuxiliaryCharacters.indexOf(str) >= 0;
    };

    // Thanks to http://stackoverflow.com/a/26482650/2152503
    function removeSpecials_(str) {
        var res = "";
        for(var i=0; i<str.length; ++i) {
            if(pub.isWordCharacter(str[i]) || str[i].trim() === '')
                res += str[i];
            else
                res += " ";
        }
        return res;
    }

    /**
     * Takes an array of IBM Watson's transcription timestamps and produces a corresponding array of Timestamp objects.
     * @param timestamps - An array of timestamps from the Watson speech-to-text service. It should be [[word, start, end]].
     * @param prevEnd - The end time for the last token, which will be bridged to the new timestamps with a space if
     *  necessary. Pass a negative number to disable the bridging.
     * @returns {Array}
     */
    pub.parseTimestamps = function (timestamps, prevEnd) {
        var times = [], word;
        if (prevEnd >= 0) {
            times.push(TranscriptUtils.spaceWordInterval(prevEnd, timestamps[0][1], 0));
        }
        for (var k = 0; k < timestamps.length; k++) {
            word = timestamps[k][0];
            if (word == '%HESITATION')
                word = '???';
            times.push(new Timestamp(0, ' ' + word + ' ', timestamps[k][1], timestamps[k][2]));
            if (k < timestamps.length - 1 && timestamps[k + 1][1] - timestamps[k][2] > 0)
                times.push(TranscriptUtils.spaceWordInterval(timestamps[k][2], timestamps[k + 1][1], 0));
        }
        return times;
    };

    /**
     * This function formats the display of textObject to have tokens around each word in `displayString`.
     * @param textObject - A jQuery object representing a text box or editable div.
     * @param wordIntervals - The word array to be inserted into the textObject.
     * @param visible (optional) - Whether or not the tokens should have visible borders (customizable by CSS).
     *  Default is true.
     */
    pub.formatTranscriptionTokens = function(textObject, wordIntervals, visible) {
        textObject.empty();
        for (var i = 0; i < wordIntervals.length; i++) {
            if (removeSpecials_(wordIntervals[i].word).trim().length) {
                textObject.append('<span class="annotation-token' + (visible ? ' annot-bordered' : '') + '">' +
                    wordIntervals[i].word + '</span>');
            } else {
                if (visible) {
                    textObject.append('<span class="annotation-space annot-bordered">' +
                        wordIntervals[i].word.replace(' ', '&nbsp;') + '</span>');
                } else {
                    textObject.append('<span class="annotation-space">' +
                        wordIntervals[i].word.replace(/\s+/g, '&nbsp;') + '</span>');
                }
            }
        }
    };

    /**
     * Inserts the displayString into the tokenized contents of textObject in a quasi-tokenized form. The tokens don't yet
     * represent timestamps, so they are tagged with the `annot-temporary` class.
     * @param textObject
     * @param displayString
     * @param insertPoint
     * @returns {number} - The number of tokens inserted.
     */
    pub.insertTemporaryTranscriptionTokens = function(textObject, displayString, insertPoint) {
        textObject.find('.annot-temporary').remove();
        var words = removeSpecials_(displayString).split(/\s+/);
        var returnNode = null;

        var nextStartIdx = 0;
        var returnCount = 0, s;
        var boundaryNode = textObject[0].childNodes[insertPoint];
        for (var i = 0; i < words.length; i++) {
            if (words[i].length) {
                // Add each word as a span
                s = document.createElement('span');
                s.className = 'annotation-token annot-temporary annot-bordered';
                s.appendChild(document.createTextNode(words[i]));
                if (boundaryNode) {
                    textObject[0].insertBefore(s, boundaryNode);
                } else {
                    textObject[0].appendChild(s);
                }
                returnCount++;

                // Trim off the beginning of the display string to keep working through it
                var endIdx = displayString.indexOf(words[i].charAt(0)) + words[i].length;
                if (endIdx < words[i].length) {
                    console.error("The word", words[i], "was not found in the display string", displayString,
                        "even though it was generated using that string.");
                }
                displayString = displayString.substring(endIdx);
            }

        }
        if (displayString.length) {
            // Add the remainder of the string in a span
            s = document.createElement('span');
            if (displayString.trim().length) {
                s.className = 'annotation-space annot-temporary annot-bordered';
            } else {
                s.className = 'annot-temporary';
            }
            s.appendChild(document.createTextNode(displayString));
            if (boundaryNode) {
                textObject[0].insertBefore(s, boundaryNode);
            } else {
                textObject[0].appendChild(s);
            }
            returnCount++;
        }
        return returnCount;
    };

    pub.updateTranscriptionTokens = function(textObject, startNode, endNode, wordIntervals) {
        if (wordIntervals.length == 0)
            return;
        var wordIdx = 0;
        startNode.textContent = wordIntervals[wordIdx].word;
        wordIdx++;
        while ((startNode = startNode.nextSibling) != endNode.nextSibling) {
            startNode.textContent = wordIntervals[wordIdx].word;
            wordIdx++;
        }
    };

    pub.spaceWordInterval = function (startTime, endTime, resource) {
        var numSpaces = Math.ceil((endTime - startTime) / SPACE_CHAR_DURATION);
        if (typeof resource !== 'undefined')
            return new Timestamp(resource, (new Array(numSpaces + 1)).join(' '), startTime, endTime);
        return new Timestamp(SPACE_RESOURCE, (new Array(numSpaces + 1)).join(' '), 0, endTime - startTime);
    };

    return pub;
}());