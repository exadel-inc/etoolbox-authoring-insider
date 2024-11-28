/*
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
(function (RTE, ns) {
    'use strict';

    ns.ui = ns.ui || {};
    ns.ui.rte = ns.ui.rte || {};

    /**
     * Wraps a DOM object representing an RTE field to provide content accessor method for use with
     * {@link ns.fields}
     */
    ns.ui.rte.FieldFacade = class {

        /**
         * Creates a new instance of {@code FieldFacade}
         * @param {Element} field - The target field
         * @param plugin - The RTE plugin instance
         */
        constructor(field, plugin) {
            this._field = field;
            this._plugin = plugin;
        }

        /**
         * Returns the closest ancestor of the target field that matches the specified selector
         * @param selector - The selector to match
         * @returns {*}
         */
        closest(selector) {
            return this._field.closest(selector);
        }

        /**
         * Retrieves the selection content of the target field
         * @returns {string}
         * @param {boolean=} isHtml - Indicates whether the content should be returned as HTML when possible
         */
        getSelectedContent(isHtml = false) {
            if (this.hasSelectedText()) {
                let windowSelection = this._plugin.editorKernel.editContext.win.getSelection();
                if (!windowSelection.toString().length && this._storedRange) {
                    this.renewSelection();
                    windowSelection = this._plugin.editorKernel.editContext.win.getSelection();
                }
                if (isHtml) {
                    const document = this._plugin.editorKernel.editContext.doc;
                    const container = document.createElement('div');
                    container.appendChild(windowSelection.getRangeAt(0).cloneContents());
                    return container.innerHTML;
                }
                return windowSelection.toString();
            }
            return isHtml ?
                this._plugin.editorKernel.editContext.root.innerHTML :
                this._plugin.editorKernel.editContext.root.innerText;
        }

        /**
         * Performs a lock operation on the target RTE field
         */
        lock() {
            if (!this._plugin.editorKernel.isLocked()) {
                this._plugin.editorKernel.lock();
            }
        }

        /**
         * Stores the selection range of the current RTE field for later retrieval
         */
        preserveSelectionRange() {
            delete this._storedRange;
            const currentRange = this.getSelectionRange();
            const noSelection = !currentRange ||
                !currentRange.startNode ||
                (ns.utils.isNumber(currentRange.startOffset) && !currentRange.endNode);
            if (noSelection) {
                return;
            }
            if (!currentRange.endNode) {
                currentRange.endNode = currentRange.startNode;
            }
            if (!ns.utils.isNumber(currentRange.startOffset)) {
                currentRange.startOffset = 0;
            }
            if (!ns.utils.isNumber(currentRange.endOffset)) {
                currentRange.endOffset = currentRange.endNode.textContent.length;
            }
            this._storedRange = currentRange;
        }

        /**
         * Sets focus on the target RTE field
         */
        setFocus() {
            this._plugin.editorKernel.focus(this._plugin.editorKernel.editContext);
            this.renewSelection();
        }

        /**
         * Sets the selected content of the target RTE field
         * @param {string} value - The text to set
         * @param {boolean=} isHtml - Indicates whether the content should be set as HTML when possible
         */
        setSelectedContent(value, isHtml = false) {
            if (!this.renewSelection()) {
                this._plugin.editorKernel.relayCmd('clear');
            }
            this._plugin.editorKernel.focus();
            const pasteRange = this._plugin.editorKernel.createQualifiedRangeBookmark(this._plugin.editorKernel.editContext);
            if (isHtml) {
                this._plugin.editorKernel.relayCmd('paste', {
                    pasteRange,
                    mode: 'wordhtml',
                    html: value,
                    dom: new DOMParser().parseFromString(value, 'text/html').body,
                    stripHtmlTags: false,
                    htmlRules: this._plugin.editorKernel.htmlRules,
                    pasteRules: HTML_PASTE_RULES
                });
            } else {
                this._plugin.editorKernel.relayCmd('paste', {
                    pasteRange,
                    mode: 'plaintext',
                    text: value
                });
            }
            delete this._storedRange;
        }

        /**
         * Performs an unlock operation on the target RTE field
         */
        unlock() {
            while (this._plugin.editorKernel.isLocked()) {
                this._plugin.editorKernel.unlock();
            }
        }

        /**
         * @private
         */
        getSelectionRange() {
            if (this._storedRange) {
                return this._storedRange;
            }
            return RTE.Selection.createProcessingSelection(this._plugin.editorKernel.editContext);
        }

        /**
         * @private
         */
        hasSelectedText() {
            const range = this.getSelectionRange();
            if (!range) {
                return false;
            }
            if (range.startNode && range.endNode && range.startNode !== range.endNode) {
                return true;
            }
            return ns.utils.isNumber(range.startOffset) &&
                ns.utils.isNumber(range.endOffset) &&
                (range.startOffset < range.endOffset);
        }

        /**
         * @private
         */
        renewSelection() {
            if (!this.hasSelectedText() || !this._storedRange) {
                return false;
            }
            const bookmark = RTE.Selection.bookmarkFromProcessingSelection(
                this._plugin.editorKernel.editContext,
                this._storedRange);
            RTE.Selection.selectBookmark(this._plugin.editorKernel.editContext, bookmark);
            return true;
        }
    };

    const HTML_PASTE_RULES = {
        allowBasics: {
            bold: true,
            italic: true,
            underline: true,
            anchor: true,
            image: true,
            subscript: true,
            superscript: true
        },
        allowBlockTags: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
        allowedAttributes: {
            '*': ['class'],
            table: ['width', 'height', 'cellspacing', 'cellpadding', 'border'],
            td: ['width', 'height', 'colspan', 'rowspan', 'valign'],
            a: ['href', 'name', 'title', 'alt'],
            img: ['src', 'title', 'alt', 'width', 'height'],
            span: ['class']
        },
        list: { allow: true },
        table: {  allow: true },
        linkRemoveRegEx: null
    };

})(window.CUI.rte, window.eai = window.eai || {});
