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

    ns.ui.getInputValue = function (container) {
        const valueHolders = container.querySelectorAll('.coral-Form-field');
        if (valueHolders.length === 1) {
            return ns.fields.getValue(valueHolders[0]);
        }
        const result = {};
        valueHolders.forEach((item) => result[item.name || item.getAttribute('name')] = ns.fields.getValue(item));
        return result;
    }

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
                innerHTML: `<button is="coral-button" id="cancel">Cancel</button><button is="coral-button" id="accept" variant="primary">OK</button>`
            },
        });

        dialog.classList.add('eai-dialog');
        options.class && dialog.classList.add(...options.class.split(' '));

        dialog.on('click', '#cancel', () => dialog.dispatchEvent(new CustomEvent('dialog:cancel')));
        dialog.on('click', '#accept', () => dialog.dispatchEvent(new CustomEvent('dialog:accept')));

        return dialog;
    };

    ns.ui.validate = function (container) {
        const validatable = container.querySelectorAll('[data-validation],[required]');
        let isValid = true;
        for (const item of validatable) {
            const validation = $(validatable).adaptTo('foundation-validation');
            if (validation && !validation.checkValidity()) {
                validation.updateUI();
                isValid = false;
            }
        }
        return isValid;
    }

    $(window).adaptTo('foundation-registry').register('foundation.validation.validator', {
        selector:'[data-validation="notBlank"]',
        validate: function (field) {
            return ns.fields.getValue(field).replaceAll(/^\s+|\s$/g, '').length > 0
                ? null
                : 'You need to enter some text';
        }
    });

})(window, document, Granite.$, window.eai = window.eai || {});