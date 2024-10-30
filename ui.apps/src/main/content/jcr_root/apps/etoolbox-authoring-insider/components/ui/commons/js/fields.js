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
(function (window, $, ns) {
    'use strict';

    /**
     * Contains utility methods for working with input fields
     */
    ns.fields = {

        /**
         * Sets focus on the specified input field or field facade
         * @param {*|Element} field - The target field
         * @returns {void|any}
         */
        focus: function (field) {
            if (!field) {
                return;
            }
            if (ns.utils.isFunction(field.setFocus)) {
                return field.setFocus();
            } else if (ns.utils.isFunction(field.focus)) {
                return field.focus();
            }
        },

        /**
         * Performs a lock operation (if present) on the specified input field or field facade. A lock operation is
         * usually triggered for RTE objects to handle selection
         * @param {*|Element} field - The target field
         * @returns {void}
         */
        lock: function (field) {
            if (!field || !ns.utils.isFunction(field.lock)) {
                return;
            }
            field.lock();
        },

        /**
         * Returns the selected content of the specified input field or field facade
         * @param {*|Element} field - The target field
         * @returns {*|string|string}
         */
        getSelectedContent: function (field) {
            if (!field) {
                return '';
            }
            if (ns.utils.isFunction(field.getSelectedContent)) {
                return field.getSelectedContent();
            }
            if ('selectionStart' in field && 'selectionEnd' in field) {
                const selectionStart = field.selectionStart;
                const selectionEnd = field.selectionEnd;
                if (selectionEnd > selectionStart) {
                    return this.getValue(field).substring(selectionStart, selectionEnd);
                }
            }
            return this.getValue(field);
        },

        /**
         * Returns the value of the specified input field or field facade, or else returns the value of a descendant
         * element specified by the selector
         * @param {*|Element} field - The target field
         * @param {string=} selector - The selector to use to find the descendant element
         * @returns {*|string}
         */
        getValue: function (field, selector) {
            if (selector) {
                if (ns.utils.isFunction(field.querySelector)) {
                    return this.getValue(field.querySelector(selector));
                } else if (this.isJquery(field)) {
                    return this.getValue(field.find(selector)[0]);
                }
            }
            if (!field) {
                return '';
            }
            if (ns.utils.isFunction(field.getValue)) {
                return field.getValue();
            }
            const foundationField = $(field).adaptTo('foundation-field');
            if (foundationField) {
                return foundationField.getValue();
            }
            if (field.value !== undefined) {
                return field.value;
            }
            if (field['selectedItem']) {
                const selectedItem = field['selectedItem'];
                return selectedItem.value || selectedItem.textContent;
            }
            return '';
        },

        /**
         * Sets the selected content of the specified input field or field facade. This method is used to insert new
         * text at the current cursor position or to replace the selected text
         * @param {*|Element} field - The target field
         * @param {string} value - The text to set
         */
        setSelectedContent: function (field, value) {
            if (!field) {
                return;
            }
            if (ns.utils.isFunction(field.setSelectedContent)) {
                field.setSelectedContent(value);
                return;
            }
            if ('selectionStart' in field && 'selectionEnd' in field) {
                const selectionStart = field.selectionStart;
                const selectionEnd = field.selectionEnd;
                if (selectionEnd > selectionStart) {
                    const existingValue = this.getValue(field) || '';
                    const pre = existingValue.substring(0, selectionStart);
                    const post = existingValue.substring(selectionEnd);
                    this.setValue(field, pre + value + post);
                    return;
                }
            }
            this.setValue(field, value);
        },

        /**
         * Sets the value of the specified input field or field facade, or else the value of a descendant element
         * specified by the selector
         * @param {*|Element} field - The target field
         * @param {string} selectorOrValue - The selector to use to find the descendant element
         * @param {string=} value - The value to set
         * @returns {*|string}
         */
        setValue: function (field, selectorOrValue, value) {
            if (!field) {
                return;
            }
            if (value !== undefined) {
                if (ns.utils.isFunction(field.querySelector)) {
                    this.setValue(field.querySelector(selectorOrValue), value);
                    return;
                } else if (this.isJquery(field)) {
                    this.setValue(field.find(selectorOrValue)[0], value);
                    return;
                }
            }
            if (ns.utils.isFunction(field.setValue)) {
                field.setValue(selectorOrValue);
                return;
            } else {
                const foundationField = $(field).adaptTo('foundation-field');
                if (foundationField) {
                    foundationField.setValue(selectorOrValue);
                    emitInputEvent(field);
                    return;
                }
            }
            field.value = selectorOrValue;
            emitInputEvent(field);
        },

        /**
         * Performs an unlock operation (if present) on the specified input field or field facade. An unlock operation
         * is usually triggered for RTE objects to handle selection
         * @param {*|Element} field - The target field
         * @returns {void}
         */
        unlock: function (field) {
            if (!field || !ns.utils.isFunction(field.unlock)) {
                return;
            }
            field.unlock();
        }
    };

    function emitInputEvent(field) {
        if (ns.utils.isFunction(field.dispatchEvent)) {
            field.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

})(window, Granite.$, window.eai = window.eai || {});
