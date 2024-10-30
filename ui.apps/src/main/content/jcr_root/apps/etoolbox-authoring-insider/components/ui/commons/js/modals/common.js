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
(function (window, document, $, ns) {
    'use strict';

    ns.ui = ns.ui || {};

    /**
     * Adjusts the size of the specified dialog to match the size of the parent dialog
     * @param {Element} dialog - The dialog to adjust
     * @param {Element} parent - The parent dialog
     */
    ns.ui.adjustDialogSize = function (dialog, parent) {
        if (!parent || parent.matches('.coral3-Dialog--fullscreen')) {
            return;
        }
        const sourceWrapper = parent.querySelector('.coral3-Dialog-wrapper');
        const targetWrapper = dialog.querySelector('.coral3-Dialog-wrapper');
        targetWrapper.style.marginTop = sourceWrapper.style.marginTop;
        targetWrapper.style.marginLeft = sourceWrapper.style.marginLeft;
        targetWrapper.style.width = sourceWrapper.style.width || sourceWrapper.offsetWidth + 'px';
        targetWrapper.style.height = sourceWrapper.style.height || sourceWrapper.offsetHeight + 'px';
    };

    /**
     * Creates a new HTML DOM element with the specified tag name, attributes, and optional children
     * @param {Object} options - The element attributes and options
     * @param {string} options.tag - The tag name of the element (optional, default is 'div')
     * @param {string} options.innerHtml - The inner HTML content of the element (optional)
     * @param {string} options.innerText - The inner text content of the element (optional)
     * @param {Array|Object} options.children - The child elements of the element (optional)
     * @returns {Element}
     */
    ns.ui.createElement = function (options) {
        const tag = (options && options.tag) || 'div';
        const element = document.createElement(tag);
        if (ns.utils.isObject(options)) {
            for (const name in options) {
                if (name === 'innerHtml' || name === 'innerHTML') {
                    element.innerHTML = options[name];
                } else if (name === 'innerText') {
                    element.innerText = options[name];
                } else if (name === 'children') {
                    const children = Array.isArray(options[name]) ? options[name] : [options[name]];
                    for (const child of children) {
                        if (ns.utils.isObject(child)) {
                            element.appendChild(ns.ui.createElement(child));
                        } else if (ns.utils.isHtmlElement(child)) {
                            element.appendChild(child);
                        } else if (child) {
                            element.innerHTML += child;
                        }
                    }
                } else if (name !== 'tag' && options[name]) {
                    element.setAttribute(name, options[name]);
                }
            }
        }
        return element;
    };

    /**
     * Collects the values of the input fields inside the specified container and outputs them either as a single
     * object (if there is only one input field) or as a key-value dictionary
     * @param {Element} container
     * @returns {*|{}}
     */
    ns.ui.getInputValue = function (container) {
        const valueHolders = container.querySelectorAll('.coral-Form-field');
        if (valueHolders.length === 1) {
            return ns.fields.getValue(valueHolders[0]);
        }
        const result = {};
        valueHolders.forEach((item) => {
            result[item.name || item.getAttribute('name')] = ns.fields.getValue(item);
        });
        return result;
    };

    /**
     * Creates a new Granite/Coral dialog with the specified options. This is a service method designed to be called
     * from either {@link ns.ui.showChatDialog} or {@link ns.ui.showInputDialog}
     * @param {Object} options - The dialog options
     * @returns {Element}
     */
    ns.ui.initDialog = function (options) {
        let dialog = document.getElementById(options.id);
        if (dialog) {
            if (options.content) {
                dialog.set({ content: options.content });
            }
            if (options.header) {
                dialog.set({ header: options.header });
            }
            return dialog;
        }

        dialog = new Coral.Dialog();
        document.body.appendChild(dialog);
        dialog.set(options);
        dialog.set({
            footer: {
                innerHTML: '<button is="coral-button" id="cancel">Cancel</button><button is="coral-button" id="accept" variant="primary">OK</button>'
            },
        });

        dialog.classList.add('eai-dialog');
        options.class && dialog.classList.add(...options.class.split(' '));

        dialog.on('click', '#cancel', () => dialog.dispatchEvent(new CustomEvent('dialog:cancel')));
        dialog.on('click', '#accept', () => dialog.dispatchEvent(new CustomEvent('dialog:accept')));

        return dialog;
    };

    /**
     * Validates the input fields inside the specified container
     * @param {Element} container - The container to validate
     * @returns {boolean}
     */
    ns.ui.validate = function (container) {
        const validatable = container.querySelectorAll('[data-validation],[required]');
        let isValid = true;
        for (const item of validatable) {
            const validation = $(item).adaptTo('foundation-validation');
            if (validation && !validation.checkValidity()) {
                validation.updateUI();
                isValid = false;
            }
        }
        return isValid;
    };

    $(window).adaptTo('foundation-registry').register('foundation.validation.validator', {
        selector: '[data-validation="notBlank"]',
        validate: function (field) {
            if (ns.fields.getValue(field).replaceAll(/^\s+|\s$/g, '').length > 0) {
                return null;
            }
            return field.dataset.validationMessage || 'This field is required';
        }
    });

})(window, document, Granite.$, window.eai = window.eai || {});
