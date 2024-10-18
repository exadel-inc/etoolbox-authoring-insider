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
     * {@link window.eai.fields}
     */
    ns.ui.rte.FieldFacade = class {
        constructor(field, plugin) {
            this._field = field;
            this._plugin = plugin;
        }

        closest(selector) {
            return this._field.closest(selector);
        }

        getSelectedContent() {
            if (this.hasSelectedText()) {
                let windowSelection = this._plugin.editorKernel.editContext.win.getSelection().toString();
                if (!windowSelection && this._storedRange) {
                    this._renewSelection();
                    windowSelection = window.getSelection().toString();
                }
                return windowSelection;
            }
            return this._plugin.editorKernel.editContext.root.innerText;
        }

        getSelectionRange() {
            if (this._storedRange) {
                return this._storedRange;
            }
            return RTE.Selection.createProcessingSelection(this._plugin.editorKernel.editContext);
        }

        hasSelectedText() {
            const range = this.getSelectionRange();
            if (!range) {
                return false;
            }
            if (range.startNode && range.endNode && range.startNode !== range.endNode) {
                return true;
            }
            return ns.utils.isNumber(range.startOffset)
                && ns.utils.isNumber(range.endOffset)
                && (range.startOffset < range.endOffset);
        }

        preserveSelectionRange() {
            delete this._storedRange;
            const currentRange = this.getSelectionRange();
            const noSelection = !currentRange
                || !currentRange.startNode
                || (ns.utils.isNumber(currentRange.startOffset) && !currentRange.endNode);
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

        setFocus() {
            this._plugin.editorKernel.focus(this._plugin.editorKernel.editContext);
            this._renewSelection();
        }

        setSelectedContent(value) {
            if (!this._renewSelection()) {
                this._plugin.editorKernel.relayCmd('clear');
            }
            this._plugin.editorKernel.relayCmd('inserthtml', RTE.Utils.htmlEncode(value));
            delete this._storedRange;
        }

        _renewSelection() {
            if (!this.hasSelectedText() || !this._storedRange) {
                return false;
            }
            const bookmark = RTE.Selection.bookmarkFromProcessingSelection(
                this._plugin.editorKernel.editContext,
                this._storedRange);
            RTE.Selection.selectBookmark(this._plugin.editorKernel.editContext, bookmark);
            return true;
        }
    }

})(window.CUI.rte, window.eai = window.eai || {});