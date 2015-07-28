/**
 * Created by venkatesh-sivaraman on 7/8/15.
 */

'use strict';

/**
 * A method to iterate over all nodes within a selection.
 * Thanks to http://stackoverflow.com/questions/667951/how-to-get-nodes-lying-inside-a-range-with-javascript
 * @param node - The node to start at.
 * @param skipChildren - Whether or not to go into the child nodes of `node`'s generation.
 * @param endNode - The node to stop at.
 * @returns {*}
 */
function getNextNode (node, skipChildren, endNode){
    //if there are child nodes and we didn't come from a child node
    if (endNode === node) {
        return null;
    }
    if (node.firstChild && !skipChildren) {
        return node.firstChild;
    }
    if (!node.parentNode){
        return null;
    }
    return node.nextSibling || getNextNode(node.parentNode, true, endNode);
}

var REVISION_BOX_FADE_TIME = 100;

var TranscriptTextArea = function (ta) {
    this.textArea = null;
    this.revisionBox = null;
    this.isEditing = false;
    this.editable = true;
    var justTyped_ = false,
        currentWordSelection_ = null,
        lastSelectionRange = null,
        lastChildNodes = null,
        savedSelection = null,
        _this = this,
        highlightedNode_ = null;

    /* `deletedWordRange` has a start and end attribute representing word indices (inclusive). */
    this.onDeletion = function (textArea, deletedWordRange, cb) {};
    /* `onEdit` should return a Boolean value `shouldEdit`, and a `selection` {node: offset: } object representing
    the new desired selection. */
    this.onEdit = function (textArea, nodeRange, contents) {};
    this.onPlay = function (textArea, nodeIdx) {};
    this.onSelectionChange = function (textArea, selection) {};

    /* Clients can use this variable to set selection-sensitive context information. It will be cleared after every
    * selection change. */
    this.selectionContext = {};

    var deselectAll_ = function () {
        _this.textArea.removeClass('annotation-selected');
        _this.textArea.find('span').removeClass('annotation-selected');
    };

    /**
     * Selects all the nodes from `start` to `end`. Assumes they are ordered beginning to end.
     * @param start
     * @param end
     * @private
     */
    function selectNodes_(start, end) {
        var range = document.createRange(),
            sel = window.getSelection();

        range.setStart(start, 0);
        range.setEnd(end, end.textContent.length);

        sel.removeAllRanges();
        sel.addRange(range);
        selectNodesVisually_(range);
        currentWordSelection_ = null;
    }

    /**
     * Highlights the nodes in the selection range by adding the class `annotation-selected`. You can customize the
     * styles of selected words using the `annotation-selected` class selector (but use `!important` to override the
     * default annotation token appearance).
     *
     * Not to be confused with this.highlightWord, which can only apply to one token at a time and uses the
     * `annotation-highlighted` class selector.
     * @param range - A native window selection Range object.
     * @private
     */
    function selectNodesVisually_(range) {
        deselectAll_();

        var node = range.startContainer.parentNode;
        if (range.startOffset < node.textContent.length) {
            node.className = node.className + ' annotation-selected';
        }
        while (node = getNextNode(node, true, range.endContainer.parentNode)) {
            if (node !== range.endContainer.parentNode || range.endOffset > 0) {
                node.className = node.className + ' annotation-selected';
            }
        }
    }

    /**
     * Moves the cursor to the offset inside node.
     * @param node - A span (annotation token). The anchor node of the selection will be this node's child.
     * @param offset - The integer offset within the node to place the cursor at.
     * @private
     */
    function moveCursor_(node, offset) {
        var range = document.createRange(),
            sel = window.getSelection();
        if (node) {
            if (offset > node.childNodes[0].textContent.length)
                alert("Tried to create a selection on node " + JSON.stringify(node.childNodes[0]) + " with offset " + offset.toString());
            range.setStart(node.childNodes[0], offset);
        } else {
            range.setStart(_this.textArea.get(0), offset);
        }
        range.collapse(true);

        sel.removeAllRanges();
        sel.addRange(range);
        deselectAll_();
        currentWordSelection_ = null;
        _this.onSelectionChange(_this.textArea, _this.currentWordSelection());
    }

    function caretNodeLocation_ (selection) {
        if (selection.anchorNode.classList && selection.anchorNode.classList.contains('transcript-view')) {
            return {
                node: _this.textArea[0].childNodes[selection.anchorOffset],
                offset: 0
            };
        }
        return {
            node: selection.anchorNode.parentNode,
            offset: selection.anchorOffset
        };
    }

    // Selection handling

    var snappedSelectionRange = function (range, direction) {
        // Round the selection so that it always contains full words.
        var prev, next;
        if (direction == 1) {
            if (range.startOffset == 0) {
                if (range.startContainer.parentNode.previousSibling) {
                    range.setStart(range.startContainer.parentNode.previousSibling.childNodes[0], 0);
                } else {
                    range.setStart(range.startContainer, 0);
                }
            } else {
                if (range.startContainer.parentNode.previousSibling) {
                    range.setStart(range.startContainer, 0);
                } else {
                    range.setStart(range.startContainer, 0);
                }
            }

        } else if (direction == 2) {
            console.log(range.endContainer.parentNode, range.endOffset);
            if (range.endOffset == range.endContainer.textContent.length) {
                if (range.endContainer.parentNode.nextSibling) {
                    next = range.endContainer.parentNode.nextSibling.childNodes[0];
                    range.setEnd(next, next.textContent.length);
                } else {
                    range.setEnd(range.endContainer, range.endContainer.textContent.length);
                }
            } else {
                if (range.endContainer.parentNode.nextSibling) {
                    range.setEnd(range.endContainer.parentNode.nextSibling.childNodes[0], 0);
                } else {
                    range.setEnd(range.endContainer, range.endContainer.textContent.length);
                }
            }
        } else if (direction == 3) {
            var nearestUpwardSel = nearestNodeVertically(range.startContainer.parentNode, range.startOffset == 0, 1);
            range.setStart(nearestUpwardSel.node.childNodes[0], nearestUpwardSel.offset);
        } else if (direction == 4) {
            var nearestDownwardSel = nearestNodeVertically(range.endContainer.parentNode, range.startOffset == 0, 2);
            range.setEnd(nearestDownwardSel.node.childNodes[0], nearestDownwardSel.offset);
        } else if (range.startContainer === range.endContainer && range.startOffset == range.endOffset) {
            range.setStart(range.startContainer, 0);
            range.setEnd(range.endContainer, range.endContainer.textContent.length);
        } else {
            var startNodeText = range.startContainer.textContent,
                endNodeText = range.endContainer.textContent;

            if (range.startOffset <= startNodeText.length / 2) {
                range.setStart(range.startContainer, 0);
            } else {
                range.setStart(range.startContainer, startNodeText.length);
            }

            if (range.endOffset >= endNodeText.length / 2) {
                range.setEnd(range.endContainer, endNodeText.length);
            } else {
                range.setEnd(range.endContainer, 0);
            }
        }

        return range;
    };

    var snappedSelectionCaret = function (selInfo, direction) {
        // Round the selection so that if it's on a word, it's always at the beginning or end of the word.
        if (direction == 1) {
            if (selInfo.offset == 0) {
                if (selInfo.node.previousSibling) {
                    return {node: selInfo.node.previousSibling, offset: 0};
                } else {
                    return {node: selInfo.node, offset: 0};
                }
            } else {
                if (selInfo.node.previousSibling) {
                    return {node: selInfo.node.previousSibling, offset: selInfo.node.previousSibling.textContent.length};
                } else {
                    return {node: selInfo.node, offset: 0};
                }
            }
        } else if (direction == 2) {
            if (selInfo.offset >= selInfo.node.textContent.length - 1) {
                if (selInfo.node.nextSibling) {
                    return {node: selInfo.node.nextSibling, offset: selInfo.node.nextSibling.textContent.length};
                } else {
                    return {node: selInfo.node, offset: selInfo.node.textContent.length};
                }
            }
            else {
                if (selInfo.node.nextSibling) {
                    return {node: selInfo.node.nextSibling, offset: 0};
                } else {
                    return {node: selInfo.node, offset: selInfo.node.textContent.length};
                }
            }
        } else if (direction == 3) {
            return nearestNodeVertically(selInfo.node, selInfo.offset == 0, 1);
        } else if (direction == 4) {
            return nearestNodeVertically(selInfo.node, selInfo.offset == 0, 2);
        } else {
            if (selInfo.node) {
                if (selInfo.offset < selInfo.node.textContent.length / 2) {
                    return {node: selInfo.node, offset: 0};
                } else {
                    return {node: selInfo.node, offset: selInfo.node.textContent.length};
                }
            }
        }
        return selInfo;
    };

    /**
     * Finds the nearest node/offset above or below the given node and offset.
     * @param node
     * @param beginning - true if the offset is 0, false if the offset is at the end of the word
     * @param direction - 0 or 1 for up, 2 for down
     * @returns {*}
     */
    var nearestNodeVertically = function (node, beginning, direction) {
        var startRect = node.getBoundingClientRect(),
            textAreaRect = _this.textArea[0].getBoundingClientRect(),
            xCoord = beginning ? startRect.left - textAreaRect.left : startRect.right - textAreaRect.left,
            closestDist = Number.POSITIVE_INFINITY, closestSel = null,
            newRect, newXCoord, dist, testingNode;
        console.log(direction);
        if (direction <= 1) {
            var prevLineEnd = _this.lineSelection(_this.positionOfNode(node)).start;
            if (prevLineEnd <= 0)
                return { node: _this.textArea[0].childNodes[0], offset: 0 };
            testingNode = _this.textArea[0].childNodes[prevLineEnd];
            while ((testingNode = testingNode.previousSibling) != null) {
                newRect = testingNode.getBoundingClientRect();
                newXCoord = newRect.left - textAreaRect.left;
                dist = Math.abs(newXCoord - xCoord);
                if (dist <= closestDist) {
                    closestSel = { node: testingNode, offset: 0 };
                    closestDist = dist;
                } else if (closestSel) {
                    break;
                }
            }

            return closestSel;
        } else if (direction == 2) {
            var nextLineStart = _this.lineSelection(_this.positionOfNode(node)).end;
            if (nextLineStart >= _this.textArea[0].childNodes.length)
                return { node: _this.textArea[0].lastChild, offset: _this.textArea[0].lastChild.textContent.length };
            testingNode = _this.textArea[0].childNodes[nextLineStart];
            while ((testingNode = testingNode.nextSibling) != null) {
                newRect = testingNode.getBoundingClientRect();
                newXCoord = newRect.left - textAreaRect.left;
                dist = Math.abs(newXCoord - xCoord);
                if (dist <= closestDist) {
                    closestSel = { node: testingNode, offset: 0 };
                    closestDist = dist;
                } else if (closestSel) {
                    break;
                }
            }

            return closestSel;
        }

        console.error("Something went wrong in the vertical selection process.");
        return { node: node, offset: -1 };
    };

    var backspacePressed = false,
        preventSelectionChange = false,
        _mouseIsDown = false,
        _mouseMoved = false;

    var handleSelectionChange = function (e, direction) {
        if (preventSelectionChange) {
            preventSelectionChange = false;
            return;
        }
        if (!_this.textArea[0].childNodes.length)
            return;

        var sel = window.getSelection(),
            range = sel.getRangeAt(0),
            length = range.toString().length;
        if ((((e.type == 'mouseup' && (_mouseMoved || e.which == 3)) || e.type == 'mousemove') && length) ||
            e.shiftKey || e.type == 'dblclick') {

            range = snappedSelectionRange(range, direction);
            if (e.type == 'dblclick' && !length) {
                selectNodes_(range.startContainer, range.endContainer);
                e.preventDefault();
            } else if (e.type == 'mouseup' || e.type == 'keydown') {
                sel.removeAllRanges();
                sel.addRange(range);
                e.preventDefault();
            }
            selectNodesVisually_(range);

            /*if (!length && range.toString().length && _this.editable) {
                _this.showRevisionBox();
            }*/

        } else if (!length || (e.type == 'mouseup' && !_mouseMoved)) {
            var an = sel.anchorNode,
                pa = an.parentNode,
                selectionInfo;
            if (an.nodeName.toLowerCase() == 'div' && an.childNodes.length) {
                pa = an.childNodes[sel.anchorOffset - 1];
                if (typeof pa !== 'undefined')
                    moveCursor_(pa, pa.textContent.length);
                else {
                    pa = an.childNodes[0];
                    moveCursor_(pa, 0);
                }
            } else {
                selectionInfo = caretNodeLocation_(sel);
            }

            if (e.type == 'mouseup' || (direction && !e.shiftKey)) {
                var newSel = snappedSelectionCaret(selectionInfo, direction);
                if (direction && (newSel.node != selectionInfo.node || newSel.offset != selectionInfo.offset)) {
                    e.preventDefault();
                }
                moveCursor_(newSel.node, newSel.offset);
            }
            // Appear to deselect everything
            deselectAll_();
        }
        lastSelectionRange = _this.currentWordSelection();
        lastChildNodes = _this.textArea.children().clone();
        if (!backspacePressed) {
            _this.selectionContext = {};
        }
        currentWordSelection_ = null;
        _this.onSelectionChange(_this.textArea, _this.currentWordSelection());
        justTyped_ = false;
    };

    this.showRevisionBox = function (replacementText) {
        var sel = window.getSelection(),
            range = sel.getRangeAt(0),
            textAreaRect = _this.textArea[0].parentNode.getBoundingClientRect(),
            startRect, endRect,
            revisionBody;

        if (range.toString().length) {
            startRect = range.startContainer.parentNode.getBoundingClientRect();
            endRect = range.endContainer.parentNode.getBoundingClientRect();
            revisionBody = range.toString();
        } else {
            var caret = caretNodeLocation_(sel);
            if (caret.offset == 0)
                caret = caret.previousSibling;
            startRect = endRect = caret.node.getBoundingClientRect();
            revisionBody = caret.node.textContent;
        }
        if (!revisionBody.trim().length)
            return;
        var leftX = startRect.left - textAreaRect.left,
            rightX = endRect.right - textAreaRect.left,
            bottomY = endRect.bottom - textAreaRect.top;
        _this.revisionBox.css('left', leftX - 20.0);
        _this.revisionBox.css('top', bottomY);
        _this.revisionBox.css('width', (rightX - leftX) + 40.0);
        _this.revisionBox.css('height', startRect.height);
        _this.revisionBox.fadeIn(REVISION_BOX_FADE_TIME);

        var revisionInput = _this.revisionBox.find('#revision-input');
        revisionInput.val(replacementText || revisionBody.trim().replace(/\s+/g, ' '));
        if (replacementText)
            revisionInput.unbind('focus');
        else
            revisionInput.focus(function() { $(this).select(); } );
        revisionInput.focus();
        function finishRevision () {
            if (!revisionInput.val().length)
                return;
            revisionInput.unbind('focusout').unbind('keyup');
            var selection = lastSelectionRange,
                content = ' ' + revisionInput.val() + ' ',
                editStatus = _this.onEdit( _this.textArea, selection, content, true);
            if (editStatus.shouldEdit) {
                var startNode = _this.textArea[0].childNodes[selection.start],
                    newNode = document.createElement('span');
                newNode.appendChild(document.createTextNode(content));
                if (TranscriptUtils.isWordString(content))
                    newNode.className += 'annotation-token' + (_this.editable ? ' annot-bordered' : '');
                else
                    newNode.className += 'annotation-space' + (_this.editable ? ' annot-bordered' : '');
                _this.textArea[0].insertBefore(newNode, startNode);

                // Delete old nodes
                var i = 0;
                while (i <= selection.end - selection.start) {
                    _this.textArea[0].removeChild(newNode.nextSibling);
                    i++;
                }
                moveCursor_(newNode, newNode.textContent.length);
            }
            if (editStatus.shouldEdit && editStatus.selection) {
                moveCursor_(editStatus.selection.node, editStatus.selection.offset);
            }
            if (!editStatus.shouldEdit) {
                _this.textArea.empty();
                for (var k = 0; k < lastChildNodes.length; k++) {
                    _this.textArea.append(lastChildNodes[k]);
                }
                if (editStatus.selection)
                    moveCursor_(editStatus.selection.node, editStatus.selection.offset);
                else if (selection.multipleSelect)
                    selectNodes_(_this.textArea[0].childNodes[Math.max(0, selection.start)], _this.textArea[0].childNodes[selection.end]);
                else if (selection.start < 0)
                    moveCursor_(_this.textArea[0].childNodes[0], 0);
                else
                    moveCursor_(_this.textArea[0].childNodes[selection.start], _this.textArea[0].childNodes[selection.start].textContent.length);
            }
            _this.selectionContext = {};
            _this.revisionBox.fadeOut(REVISION_BOX_FADE_TIME);
        }
        revisionInput.focusout(function (e) {
            _this.revisionBox.fadeOut(REVISION_BOX_FADE_TIME);
            finishRevision();
        });
        revisionInput.keyup(function (e) {
            if (e.which == 13) {
                finishRevision();
            } else if (e.which == 27) {
                // Cancel (esc key)
                revisionInput.unbind('focusout').unbind('keyup');
                _this.selectionContext = {};
                _this.revisionBox.fadeOut(REVISION_BOX_FADE_TIME);
            }
        });
    };

    this.initializeTextCallbacks = function (textArea) {
        textArea.mouseup(function (e) {
            _mouseIsDown = false;
            backspacePressed = false;
            handleSelectionChange(e);
            _mouseMoved = false;
        });
        textArea.mousedown(function (e) {
            _mouseIsDown = true;
            backspacePressed = false;
        });
        textArea.mousemove(function (e) {
            if (_mouseIsDown) {
                _mouseMoved = true;
                handleSelectionChange(e);
            }
        });
        textArea.click(function(e) {
            justTyped_ = false;
            backspacePressed = false;
        });
        textArea.dblclick(function(e) {
            handleSelectionChange(e);
        });
        textArea.focus(function (e) {
            _this.isEditing = true;
        });
        textArea.focusout(function (e) {
            deselectAll_();
            lastSelectionRange = _this.currentWordSelection();
            _this.isEditing = false;
        });

        // Cut/paste (not supported)
        textArea[0].oncut = function () { return false; };
        textArea[0].onpaste = function () { return false; };

        // Keyboard/input interactions

        textArea.keyup(function (e) {
            if ((e.which == 37 || e.which == 39) && e.shiftKey) {
                e.preventDefault();
            } else if (e.which >= 48 && e.which <= 90 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                e.preventDefault();
            } else if (e.which == 38 || e.which == 40) {        //Up and down arrows, respectively.
                e.preventDefault();
            } else if (e.which == 13) {
                _this.showRevisionBox();
                e.preventDefault();
            } else if (e.which < 16 || e.which > 18)   // Removing modifier keys
                handleSelectionChange(e);
        });

        textArea.keypress(function (e) {
            var str = String.fromCharCode(e.which);
            if (TranscriptUtils.isWordString(str) && !e.ctrlKey && !e.altKey && !e.metaKey) {
                e.preventDefault();
                console.log("Pressed", e.which);
                if (window.getSelection().getRangeAt(0).toString().length) {
                    _this.showRevisionBox(str);
                }
            }
        });

        textArea.on('input', function(e) {
            if (backspacePressed) {
                backspacePressed = false;
                return;
            }
            justTyped_ = true;
            var selInfo = caretNodeLocation_(document.getSelection());
            if (lastSelectionRange.multipleSelect) {
                // It might have created a span inside another token. Let's see.
                if (selInfo.node.parentNode.nodeName.toLowerCase() == 'span') {
                    // It did. We need to then transfer the contents of the inner span to a neighbor span.
                    var realNode = selInfo.node.parentNode;
                    realNode.removeChild(selInfo.node);
                    var newNode = document.createElement('span');
                    newNode.appendChild(document.createTextNode(selInfo.node.textContent));
                    console.log(newNode, realNode);
                    if (TranscriptUtils.isWordString(selInfo.node.textContent))
                        newNode.className += 'annotation-token' + (_this.editable ? ' annot-bordered' : '');
                    else
                        newNode.className += 'annotation-space' + (_this.editable ? ' annot-bordered' : '');
                    realNode.parentNode.insertBefore(newNode, realNode.nextSibling);
                    moveCursor_(newNode, newNode.textContent.length);
                }
            }

            var selection = _this.currentWordSelection();
            var content = textArea[0].childNodes[Math.max(0, selection.start)].textContent;
            console.log(content, selection);
            var editStatus = _this.onEdit(textArea, selection, content, lastSelectionRange.multipleSelect);
            if (editStatus.shouldEdit && editStatus.selection) {
                moveCursor_(editStatus.selection.node, editStatus.selection.offset);
            }
            if (!editStatus.shouldEdit) {
                textArea.empty();
                for (var k = 0; k < lastChildNodes.length; k++) {
                    textArea.append(lastChildNodes[k]);
                }
                if (editStatus.selection)
                    moveCursor_(editStatus.selection.node, editStatus.selection.offset);
                else if (selection.multipleSelect)
                    selectNodes_(textArea[0].childNodes[Math.max(0, selection.start)], textArea[0].childNodes[selection.end]);
                else if (selection.start < 0)
                    moveCursor_(textArea[0].childNodes[0], 0);
                else
                    moveCursor_(textArea[0].childNodes[selection.start], textArea[0].childNodes[selection.start].textContent.length);
            }
            _this.selectionContext = {};
        });

        textArea.keydown(function (e) {
            backspacePressed = false;
            if (e.which == 37)                          // Left arrow
                handleSelectionChange(e, 1);
            else if (e.which == 38)
                handleSelectionChange(e, 3);
            else if (e.which == 39)                     // Right arrow
                handleSelectionChange(e, 2);
            else if (e.which == 40)
                handleSelectionChange(e, 4);
            else if (e.which == 8 || e.which == 46) {                    // Backspace or delete (fn+backspace)
                backspacePressed = true;
                var sel = window.getSelection(),
                    range = sel.getRangeAt(0),
                    wordSel = _this.currentWordSelection(),
                    parent;
                if (textArea[0].childNodes.length == 0 || wordSel.start < 0)
                    return;
                if (!range.toString().length) {
                    var selectedNode = _this.cursorNode();
                    if (e.which == 46) {
                        selectedNode = _this.cursorNode().nextSibling;
                        wordSel.start++;
                        wordSel.end++;
                    }
                    console.log(wordSel, "to be deleted?", selectedNode);

                    e.preventDefault();
                    parent = selectedNode.parentNode;
                    _this.onDeletion(textArea, wordSel, function () {
                        if (wordSel.start >= parent.childNodes.length && parent.childNodes.length > 0) {
                            var lastChild = parent.childNodes[parent.childNodes.length - 1];
                            moveCursor_(lastChild, lastChild.textContent.length);
                        } else if (wordSel.start > 0) {
                            moveCursor_(parent.childNodes[wordSel.start], 0);
                        } else {
                            moveCursor_(null, 0);
                        }
                    });
                } else if (!justTyped_) {
                    e.preventDefault();
                    parent = _this.textArea[0].childNodes[wordSel.start].parentNode;
                    _this.onDeletion(textArea, wordSel, function () {
                        if (wordSel.start >= parent.childNodes.length && parent.childNodes.length > 0) {
                            var lastChild = parent.childNodes[parent.childNodes.length - 1];
                            moveCursor_(lastChild, lastChild.textContent.length);
                        } else if (wordSel.start > 0) {
                            moveCursor_(parent.childNodes[wordSel.start], 0);
                        } else {
                            moveCursor_(null, 0);
                        }
                    });
                }
            }
            else if (e.which == 32 && e.shiftKey) {     // Shift + space
                e.preventDefault();
                preventSelectionChange = true;
                _this.onPlay(textArea, _this.currentWordSelection().start);
            }
            else if (e.which == 13) {
                e.preventDefault();
            }
            else if (e.which >= 48 && e.which <= 90 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                //e.preventDefault();
            }
        });
    };

    /**
     * Initializes the TranscriptTextArea interface.
     * @param textArea - A jQuery object representing the text area which this TranscriptTextArea will be representing.
     */
    this.init = function(textArea) {
        this.textArea = textArea;

        // Reset member variables
        this.isEditing = false;
        justTyped_ = false;
        currentWordSelection_ = null;
        lastSelectionRange = null;
        lastChildNodes = null;
        savedSelection = null;
        _mouseIsDown = false;
        _mouseMoved = false;
        backspacePressed = false;
        preventSelectionChange = false;
        this.selectionContext = {};

        // Mouse interactions
        if (this.editable) {
            this.initializeTextCallbacks(textArea);
        }
    };

    this.deselect = function () {
        window.getSelection().removeAllRanges();
        deselectAll_();
    };

    /**
     * Gets the selection range of the currently editing word or phrase. These indices correspond to tokens, not of
     * characters in the string.
     * @returns {{start: number, end: number, multipleSelect: boolean}}
     */
    this.currentWordSelection = function () {
        if (!this.isEditing) {
            currentWordSelection_ = null;
            return { start: -1, end: -1, multipleSelect: false };
        }
        if (!currentWordSelection_) {
            var range = window.getSelection().getRangeAt(0);
            if (range.toString().length) {
                var startIdx = this.positionOfNode(range.startContainer.parentNode),
                    endIdx = this.positionOfNode(range.endContainer.parentNode);
                if (range.startOffset > 0)
                    startIdx++;
                if (range.endOffset == 0)
                    endIdx--;
                currentWordSelection_ = {
                    start: startIdx,
                    end: endIdx,
                    multipleSelect: true
                };
            } else {
                var selectionInfo = caretNodeLocation_(window.getSelection());
                var idx = this.positionOfNode(selectionInfo.node);
                if (selectionInfo.offset == 0)
                    idx--;
                currentWordSelection_ = {
                    start: idx,
                    end: idx,
                    multipleSelect: false
                };
            }
        }
        return {
            start: currentWordSelection_.start,
            end: currentWordSelection_.end,
            multipleSelect: currentWordSelection_.multipleSelect
        };
    };

    /**
     * This function returns the index of the node in the text area.
     * @param node - A DOM node.
     * @returns {Number} - The index of the node.
     */
    this.positionOfNode = function(node) {
        var idx = 0;
        while( (node = node.previousSibling) != null )
            idx++;
        return idx;
    };

    /**
     * Returns the node which the cursor is at the RIGHT edge of. If there is a multiple selection or not editing,
     * returns null.
     * @returns {*}
     */
    this.cursorNode = function() {
        if (window.getSelection().getRangeAt(0).toString().length || !this.isEditing)
            return null;
        return this.textArea[0].childNodes[this.currentWordSelection().start];
    };

    /**
     * Returns the offset of the caret in the selected word. If there is a multiple selection, -1 is returned.
     * @returns {number|*}
     */
    this.currentWordSelectionIndex = function() {
        if (!this.isEditing ||
            (window.getSelection().rangeCount && window.getSelection().getRangeAt(0).toString().length))
            return -1;
        return caretNodeLocation_(window.getSelection()).offset;
    };

    /**
     * Gets the start and end nodes for the currently selected line. If the selection spans more than one line, the
     * first line containing the selection (in which the start boundary is) is returned.
     * @param node (optional) The index of the node whose line you want to determine. If none is passed, the
     * currently selected line will be returned.
     */
    this.lineSelection = function (node) {
        var selection;
        if (typeof node !== 'undefined')
            selection = {
                start: node,
                end: node
            };
        else {
            if (!this.isEditing) {
                selection = {
                    start: 0, end: 0
                };
            } else {
                selection = this.currentWordSelection();
            }
        }
        var minHeightVariation = 20;

        // Find the first token which appears on this line.
        var startIdx = Math.min(Math.max(0, selection.start), this.textArea[0].childNodes.length - 1);
        var siblingNode = this.textArea[0].childNodes[startIdx];
        if (siblingNode) {
            var initialOffsetY = siblingNode.offsetTop;
            while( (siblingNode = siblingNode.previousSibling) != null ) {
                if (siblingNode.offsetTop < initialOffsetY - minHeightVariation)
                    break;
                startIdx--;
            }
        }

        // Find the last token which appears on this line.
        var endIdx = Math.min(Math.max(0, selection.start), this.textArea[0].childNodes.length - 1);
        siblingNode = this.textArea[0].childNodes[endIdx];
        if (siblingNode) {
            initialOffsetY = siblingNode.offsetTop;
            while( (siblingNode = siblingNode.nextSibling) != null ) {
                if (siblingNode.offsetTop > initialOffsetY + minHeightVariation)
                    break;
                endIdx++;
            }
        } else {
            endIdx = selection.end;
        }

        while (startIdx >= this.textArea[0].childNodes.length)
            startIdx--;
        while (endIdx >= this.textArea[0].childNodes.length)
            endIdx--;
        return {
            start: startIdx,
            end: endIdx
        };
    };

    /**
     * Sets the location of the cursor in the appropriate node specified by `pos`.
     * @param pos - The node index to place the cursor at.
     */
    this.setCursorWordPosition = function(pos) {
        if (pos > this.textArea.get(0).childNodes.length || pos < 0) {
            console.error("Pos", pos, "not found in ", this.textArea.get(0).childNodes);
        }
        if (pos <= this.textArea.get(0).childNodes.length - 1)
            moveCursor_(this.textArea.get(0).childNodes[pos], 0);
        else
            moveCursor_(this.textArea.get(0).childNodes[pos - 1], this.textArea.get(0).childNodes[pos - 1].textContent.length);
    };

    /**
     * Saves the current selection for later restoration.
     */
    this.saveSelection = function() {
        var range = window.getSelection().getRangeAt(0);
        if (range.toString().length) {
            savedSelection = this.currentWordSelection();
        } else {
            savedSelection = caretNodeLocation_(window.getSelection());
        }
    };

    /**
     * Restores a previously saved selection.
     */
    this.restoreSelection = function() {
        if (savedSelection.start) {
            selectNodes_(savedSelection.start, savedSelection.end);
        } else {
            moveCursor_(savedSelection.node, savedSelection.offset);
        }
    };

    /**
     * Styles the specified node to be highlighted. Only one node will be highlighted in the text area at a
     * given time. The specific style attributes can be specified using the `annotation-highlighted` class selector
     * in CSS.
     * @param nodeIdx
     */
    this.highlightWord = function(nodeIdx) {
        if (highlightedNode_)
            $(highlightedNode_).removeClass('annotation-highlighted');
        var node = this.textArea[0].childNodes[nodeIdx];
        if (node) {
            node.className = node.className + ' annotation-highlighted';
            highlightedNode_ = node;
        }
    };

    /**
     * Styles all nodes in the text area to be unhighlighted.
     */
    this.unhighlightAll = function () {
        this.textArea.children().removeClass('annotation-highlighted');
        highlightedNode_ = null;
    };

    /**
     * Styles all nodes in the text area to be dimmed. The specific style can be specified using the
     * `annotation-dimmed` class selector in CSS.
     */
    this.dimAll = function () {
        this.textArea.children().addClass('annotation-dimmed');
    };

    /**
     * Styles all nodes in the text area to not be dimmed.
     */
    this.undimAll = function () {
        this.textArea.children().removeClass('annotation-dimmed');
    };

    this.init(ta);
};