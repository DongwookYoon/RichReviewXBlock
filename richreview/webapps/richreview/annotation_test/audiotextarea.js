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

var TranscriptTextArea = (function () {
    var pub = {};
    pub.textArea = null;
    pub.isEditing = false;
    pub.showsTokenBorders = true;
    var justTyped_ = false;
    var currentWordSelection_ = null;
    var lastSelectionRange = null, lastChildNodes = null;
    var savedSelection = null;

    /* `deletedWordRange` has a start and end attribute representing word indices (inclusive). */
    pub.onDeletion = function (textArea, deletedWordRange, cb) {};
    /* `onEdit` should return a Boolean value `shouldEdit`, and a `selection` {node: offset: } object representing
    the new desired selection. */
    pub.onEdit = function (textArea, nodeRange, contents) {};
    pub.onPlay = function (textArea, nodeIdx) {};
    pub.onSelectionChange = function (textArea, selection) {};

    /* Clients can use this variable to set selection-sensitive context information. It will be cleared after every
    * selection change. */
    pub.selectionContext = {};

    var deselectAll_ = function () {
        pub.textArea.removeClass('annotationSelected');
        pub.textArea.find('span').removeClass('annotationSelected');
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
     * Highlights the nodes in the selection range by adding the class `annotationSelected`. You can customize the
     * styles of selected words using the `annotationSelected` class selector (but use `!important` to override the
     * default annotation token appearance).
     *
     * Not to be confused with pub.highlightWord, which can only apply to one token at a time and uses the
     * `annotationHighlighted` class selector.
     * @param range - A native window selection Range object.
     * @private
     */
    function selectNodesVisually_(range) {
        deselectAll_();

        var node = range.startContainer.parentNode;
        if (range.startOffset < node.textContent.length) {
            node.className = node.className + ' annotationSelected';
        }
        while (node = getNextNode(node, true, range.endContainer.parentNode)) {
            if (node !== range.endContainer.parentNode || range.endOffset > 0) {
                node.className = node.className + ' annotationSelected';
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
            range.setStart(node.childNodes[0], offset);
        } else {
            range.setStart(pub.textArea.get(0), offset);
        }
        range.collapse(true);

        sel.removeAllRanges();
        sel.addRange(range);
        deselectAll_();
        currentWordSelection_ = null;
    }

    function caretNodeLocation_ (selection) {
        if (selection.anchorNode.classList && selection.anchorNode.classList.contains('transcriptView')) {
            return {
                node: pub.textArea[0].childNodes[selection.anchorOffset],
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
            console.log(range.startContainer, range.startOffset);
            if (range.startOffset == 0) {
                if (range.startContainer.parentNode.previousSibling) {
                    range.setStart(range.startContainer.parentNode.previousSibling.childNodes[0], 0);
                } else {
                    range.setStart(range.startContainer, 0);
                }
            } else {
                if (range.startContainer.parentNode.previousSibling) {
                    prev = range.startContainer.parentNode.previousSibling.childNodes[0];
                    range.setStart(prev, prev.textContent.length);
                } else {
                    range.setStart(range.startContainer, 0);
                }
            }

        } else if (direction == 2) {
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
            if (selInfo.offset == selInfo.node.textContent.length) {
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
        } else {
            if (selInfo.node) {
                if (selInfo.offset < selInfo.node.innerText.length / 2) {
                    return {node: selInfo.node, offset: 0};
                } else {
                    return {node: selInfo.node, offset: selInfo.node.textContent.length};
                }
            }
        }
        return selInfo;
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
        if (!pub.textArea[0].childNodes.length)
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
        lastSelectionRange = pub.currentWordSelection();
        lastChildNodes = pub.textArea.children().clone();
        if (!backspacePressed) {
            pub.selectionContext = {};
        }
        currentWordSelection_ = null;
        pub.onSelectionChange(pub.textArea, pub.currentWordSelection());
        justTyped_ = false;
    };

    /**
     * Initializes the TranscriptTextArea interface.
     * @param textArea - A jQuery object representing the text area which this TranscriptTextArea will be representing.
     */
    pub.init = function(textArea) {
        pub.textArea = textArea;

        // Reset member variables
        pub.isEditing = false;
        justTyped_ = false;
        currentWordSelection_ = null;
        lastSelectionRange = null;
        lastChildNodes = null;
        savedSelection = null;
        _mouseIsDown = false;
        _mouseMoved = false;
        backspacePressed = false;
        preventSelectionChange = false
        pub.selectionContext = {};

        // Mouse interactions

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
            pub.isEditing = true;
        });
        textArea.focusout(function (e) {
            deselectAll_();
            lastSelectionRange = pub.currentWordSelection();
            pub.isEditing = false;
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
            } else if (e.which < 16 || e.which > 18)   // Removing modifier keys
                handleSelectionChange(e);
        });

        textArea.on('input', function(e) {
            if (backspacePressed) {
                backspacePressed = false;
                return;
            }
            justTyped_ = true;
            var selection = pub.currentWordSelection(),
                content = textArea[0].childNodes[selection.start].textContent,
                editStatus = pub.onEdit(textArea, selection, content, lastSelectionRange.multipleSelect);
            if (editStatus.shouldEdit && editStatus.selection) {
                moveCursor_(editStatus.selection.node, editStatus.selection.offset);
            }
            if (!editStatus.shouldEdit) {
                textArea.empty();
                for (var k = 0; k < lastChildNodes.length; k++) {
                    textArea.append(lastChildNodes[k]);
                }
            }
            else if (lastSelectionRange.start != lastSelectionRange.end) {
                // It might have created a span inside another token. Let's see.
                var selInfo = caretNodeLocation_(document.getSelection());
                if (selInfo.node.parentNode.nodeName.toLowerCase() == 'span') {
                    // It did. We need to then transfer the contents of the inner span to a neighbor span.
                    var realNode = selInfo.node.parentNode;
                    realNode.removeChild(selInfo.node);
                    var newNode = document.createElement('span');
                    newNode.appendChild(document.createTextNode(selInfo.node.textContent));
                    var isWord = false;
                    for (var i = 0; i < selInfo.node.textContent.length; i++) {
                        if (TranscriptUtils.isWordCharacter(selInfo.node.textContent[i])) {
                            isWord = true;
                            break;
                        }
                    }
                    if (isWord)
                        newNode.className += 'annotationToken' + (pub.showsTokenBorders ? 'annotBordered' : '');
                    else
                        newNode.className += 'annotationSpace' + (pub.showsTokenBorders ? 'annotBordered' : '');
                    realNode.parentNode.insertBefore(newNode, realNode.nextSibling);
                    moveCursor_(newNode, newNode.textContent.length);
                }
            }
            pub.selectionContext = {};
        });

        textArea.keydown(function (e) {
            backspacePressed = false;
            if (e.which == 37)                          // Left arrow
                handleSelectionChange(e, 1);
            else if (e.which == 39)                     // Right arrow
                handleSelectionChange(e, 2);
            else if (e.which == 8 || e.which == 46) {                    // Backspace or delete (fn+backspace)
                backspacePressed = true;
                var sel = window.getSelection(),
                    range = sel.getRangeAt(0),
                    wordSel, parent;
                if (textArea[0].childNodes.length == 0)
                    return;
                if (!range.toString().length) {
                    var selInfo = caretNodeLocation_(sel);
                    var selectedNode = (e.which == 46 ? selInfo.node.nextSibling : selInfo.node);
                    wordSel = pub.currentWordSelection();
                    if (e.which == 46) {
                        wordSel.start++;
                        wordSel.end++;
                        if (selInfo.offset == selInfo.node.textContent.length)
                            selInfo.offset = 0;
                    }

                    e.preventDefault();
                    parent = selectedNode.parentNode;
                    pub.onDeletion(textArea, wordSel, function () {
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
                    wordSel = pub.currentWordSelection();
                    parent = pub.textArea[0].childNodes[wordSel.start].parentNode;
                    pub.onDeletion(textArea, wordSel, function () {
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
                pub.onPlay(textArea, pub.currentWordSelection().start);
            }
            else if (e.which >= 48 && e.which <= 90 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                e.preventDefault();
            }
        });
    };

    /**
     * Gets the selection range of the currently editing word or phrase. These indices correspond to tokens, not of
     * characters in the string.
     * @returns {{start: number, end: number, multipleSelect: boolean}}
     */
    pub.currentWordSelection = function () {
        if (!pub.isEditing) {
            currentWordSelection_ = null;
            return { start: -1, end: -1, multipleSelect: false };
        }
        if (currentWordSelection_) {
            return currentWordSelection_;
        }
        var range = window.getSelection().getRangeAt(0);
        var child;
        if (range.toString().length) {
            var startIdx = 0, endIdx = 0;
            child = range.startContainer.parentNode;
            while( (child = child.previousSibling) != null )
                startIdx--;
            if (range.startOffset == range.startContainer.textContent.length)
                startIdx--;
            child = range.endContainer.parentNode;
            while( (child = child.previousSibling) != null )
                endIdx--;
            if (range.endOffset == 0)
                endIdx++;
            currentWordSelection_ = {
                start: -startIdx,
                end: -endIdx,
                multipleSelect: (range.toString().length > 0)
            };
            return currentWordSelection_;
        } else {
            var selectionInfo = caretNodeLocation_(window.getSelection());
            var idx = 0;
            child = selectionInfo.node;
            if (!child || child.nodeName.toLowerCase() != 'span')
                return { start: 0, end: 0 };
            while( (child = child.previousSibling) != null )
                idx--;
            currentWordSelection_ = {
                start: -idx,
                end: -idx,
                multipleSelect: (range.toString().length > 0)
            };
            return currentWordSelection_;
        }
    };

    /**
     * This function returns the index of the node in the text area.
     * @param node - A DOM node.
     * @returns {Number} - The index of the node.
     */
    pub.positionOfNode = function(node) {
        var idx = 0;
        while( (node = node.previousSibling) != null )
            idx++;
        return idx;
    };

    /**
     * Returns the offset of the caret in the selected word. If there is a multiple selection, -1 is returned.
     * @returns {number|*}
     */
    pub.currentWordSelectionIndex = function() {
        if (window.getSelection().getRangeAt(0).toString().length || !pub.isEditing)
            return -1;
        return caretNodeLocation_(window.getSelection()).offset;
    };

    /**
     * Gets the start and end nodes for the currently selected line. If the selection spans more than one line, the
     * first line containing the selection (in which the start boundary is) is returned.
     * @param node (optional) The index of the node whose line you want to determine. If none is passed, the
     * currently selected line will be returned.
     */
    pub.lineSelection = function (node) {
        var selection;
        if (typeof node !== 'undefined')
            selection = {
                start: node,
                end: node
            };
        else {
            if (!pub.isEditing) {
                selection = {
                    start: 0, end: 0
                };
            } else {
                selection = pub.currentWordSelection();
            }
        }
        var minHeightVariation = 20;

        // Find the first token which appears on this line.
        var siblingNode = pub.textArea[0].childNodes[selection.start];
        var startIdx = selection.start;
        if (siblingNode) {
            var initialOffsetY = siblingNode.offsetTop;
            while( (siblingNode = siblingNode.previousSibling) != null ) {
                if (siblingNode.offsetTop < initialOffsetY - minHeightVariation)
                    break;
                startIdx--;
            }
        }

        // Find the last token which appears on this line.
        siblingNode = pub.textArea[0].childNodes[selection.start];
        var endIdx = selection.start;
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

        while (startIdx >= pub.textArea[0].childNodes.length)
            startIdx--;
        while (endIdx >= pub.textArea[0].childNodes.length)
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
    pub.setCursorWordPosition = function(pos) {
        if (pos > pub.textArea.get(0).childNodes.length || pos < 0) {
            console.error("Pos", pos, "not found in ", pub.textArea.get(0).childNodes);
        }
        if (pos <= pub.textArea.get(0).childNodes.length - 1)
            moveCursor_(pub.textArea.get(0).childNodes[pos], 0);
        else
            moveCursor_(pub.textArea.get(0).childNodes[pos - 1], pub.textArea.get(0).childNodes[pos - 1].textContent.length);
    };

    /**
     * Saves the current selection for later restoration.
     */
    pub.saveSelection = function() {
        var range = window.getSelection().getRangeAt(0);
        if (range.toString().length) {
            savedSelection = pub.currentWordSelection();
        } else {
            savedSelection = caretNodeLocation_(window.getSelection());
        }
    };

    /**
     * Restores a previously saved selection.
     */
    pub.restoreSelection = function() {
        if (savedSelection.start) {
            selectNodes_(savedSelection.start, savedSelection.end);
        } else {
            moveCursor_(savedSelection.node, savedSelection.offset);
        }
    };

    /**
     * Styles the specified node to be highlighted. Only one node will be highlighted in the text area at a
     * given time. The specific style attributes can be specified using the `annotationHighlighted` class selector
     * in CSS.
     * @param nodeIdx
     */
    pub.highlightWord = function(nodeIdx) {
        pub.textArea.find('span').removeClass('annotationHighlighted');
        var node = pub.textArea[0].childNodes[nodeIdx];
        if (node)
            node.className = node.className + ' annotationHighlighted';
    };

    /**
     * Styles all nodes in the text area to be unhighlighted.
     */
    pub.unhighlightAll = function () {
        pub.textArea.find('span').removeClass('annotationHighlighted');
    };

    /**
     * Styles all nodes in the text area to be dimmed. The specific style can be specified using the
     * `annotationDimmed` class selector in CSS.
     */
    pub.dimAll = function () {
        pub.textArea.find('span').addClass('annotationDimmed');
    };

    /**
     * Styles all nodes in the text area to not be dimmed.
     */
    pub.undimAll = function () {
        pub.textArea.find('span').removeClass('annotationDimmed');
    };

    return pub;
}());