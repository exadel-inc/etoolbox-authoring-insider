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

    ns.fields = {

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

        getSelectedContent: function(field) {
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
            if (field.selectedItem) {
                return field.selectedItem.value || field.selectedItem.textContent;
            }
            return '';
        },

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
                    const existingValue = this.getValue(field);
                    const pre = existingValue.substring(0, selectionStart);
                    const post = existingValue.substring(selectionEnd);
                    this.setValue(field, pre + value + post);
                    return;
                }
            }
            this.setValue(field, value);
        },

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
            } else {
                $(field).adaptTo('foundation-field').setValue(selectorOrValue);
            }
        },
    }

})(window, Granite.$, window.eai = window.eai || {});

