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
(function (document, $, ns) {
    'use strict';

    const CLS_DIALOG = 'user-input';
    const CLS_FIELD = 'coral-Form-field';

    const SELECTOR_FIELD = '.' + CLS_FIELD;

    ns.ui = ns.ui || {};

    /* -----------------
       Interface methods
       ----------------- */

    ns.ui.showInputDialog = function (options = {}) {
        const parent = options.parent || (options.source && options.source.closest('coral-dialog'));

        if (parent && ns.utils.isFunction(parent.addFrame)) {
            parent.addFrame(Object.assign(options, {
                id: options.id || CLS_DIALOG,
                class: CLS_DIALOG,
                content: createContent(options),
            }), 0);
            return;
        }

        const dialog = ns.ui.initDialog({
            id: CLS_DIALOG,
            class: CLS_DIALOG,
            header: {
                innerHTML: createHeader(options)
            },
            content: {
                innerHTML: createContent(options).outerHTML
            },
            backdrop: Coral.Dialog.backdrop.STATIC,
            closable: Coral.Dialog.closable.ON,
            movable: true,
            focusOnShow: Coral.mixin.overlay.focusOnShow.ON,
            returnFocus: Coral.mixin.overlay.returnFocus.ON,
        });

        dialog.source = options.source;
        dialog.onAccept = options.onAccept;
        dialog.onCancel = options.onCancel;
        dialog.off('dialog:accept', onAcceptClick).on('dialog:accept', onAcceptClick);
        dialog.off('dialog:cancel', onCancelClick).on('dialog:cancel', onCancelClick);
        dialog.off('keydown', SELECTOR_FIELD, onFieldKeyDown).on('keydown', SELECTOR_FIELD, onFieldKeyDown);
        dialog.off('click', SELECTOR_FIELD, onFieldClick).on('click', SELECTOR_FIELD, onFieldClick);
        dialog.off('coral-overlay:close', onClose).on('coral-overlay:close', onClose);

        dialog.show();
        Coral.commons.ready(dialog, function () {
            ns.ui.adjustDialogSize(dialog, parent);
        });
    };

    ns.ui.inputDialog = function (options = {}) {
        return new Promise((resolve) => {
            ns.ui.showInputDialog(Object.assign(
                options,
                { onAccept: (result) => resolve(result), onCancel: () => resolve(null) }));
        });
    };

    /* --------------
       Initialization
       -------------- */

    function createHeader(options) {
        let content = options.prompt || options.title || 'User input';
        if (options.icon) {
            content = ns.icons.getHtml(options.icon) + content;
        }
        return content;
    }

    function createContent(options) {
        const children = createInputs(options.fields);
        if (options.intro && options.intro.text) {
            children.unshift(
                ns.ui.createElement({
                    class: 'initial',
                    children: [{
                        class: 'content',
                        innerText: options.intro.text
                    }]
                })
            );
        } else if (options.intro && options.intro.image) {
            children.unshift(
                ns.ui.createElement({
                    class: 'initial no-grow',
                    children: [{
                        tag: 'img',
                        class: 'preview',
                        src: options.intro.image,
                        alt: 'Image'
                    }]
                })
            );
        }
        return ns.ui.createElement({ class: 'fields', children });
    }

    function createInputs(fields) {
        if (!Array.isArray(fields) || fields.length === 0) {
            fields = [{ type: 'textarea', validation: 'notBlank', validationMessage: 'You need to enter some text' }];
        }
        const result = [];
        for (const field of fields) {
            const fieldName = field.name || 'value';
            if (field.type === 'checkbox') {
                result.push(ns.ui.createElement({
                    tag: 'coral-checkbox',
                    name: fieldName,
                    class: CLS_FIELD,
                    innerText: field.title
                }));
                continue;
            }
            if (field.title) {
                result.push(ns.ui.createElement({
                    tag: 'label',
                    innerText: field.title
                }));
            }

            if (field.type === 'select' && Array.isArray(field.options)) {
                const items = field.options.map((opt) => {
                    return ns.ui.createElement({
                        tag: 'coral-select-item',
                        value: opt.value || opt.id || opt,
                        innerText: opt.label || opt.title || opt
                    });
                });
                result.push(ns.ui.createElement({
                    tag: 'coral-select',
                    name: fieldName,
                    class: CLS_FIELD,
                    children: items
                }));

            } else if (field.type === 'selectlist' && Array.isArray(field.options)) {
                const items = field.options.map((opt) => {
                    return ns.ui.createElement({
                        tag: 'coral-selectlist-item',
                        value: opt.value || opt.id || opt,
                        innerText: opt.label || opt.title || opt
                    });
                });
                if (items.length > 0) {
                    items[0].selected = true;
                }
                result.push(ns.ui.createElement({
                    tag: 'coral-selectlist',
                    name: fieldName,
                    class: CLS_FIELD,
                    children: items
                }));

            } else if (field.type === 'textfield') {
                result.push(ns.ui.createElement({
                    tag: 'input',
                    type: 'text',
                    name: fieldName,
                    class: CLS_FIELD + ' coral3-Textfield',
                    'data-validation': field.validation,
                    'data-validation-message': field.validationMessage
                }));

            } else {
                result.push(ns.ui.createElement({
                    tag: 'textarea',
                    name: fieldName,
                    class: CLS_FIELD,
                    'data-validation': field.validation,
                    'data-validation-message': field.validationMessage
                }));
            }
        }
        return result;
    }

    /* --------------
       Event handlers
       -------------- */

    function onAcceptClick(event) {
        event.preventDefault();
        const dialog = event.target.closest('coral-dialog');
        if (!ns.ui.validate(dialog)) {
            return;
        }
        dialog.open = false;
        if (!ns.utils.isFunction(dialog.onAccept)) {
            console.error('The onAccept handler is missing');
            return;
        }
        dialog.onAccept(ns.ui.getInputValue(dialog));
    }

    function onCancelClick(event) {
        event.preventDefault();
        const dialog = event.target.closest('coral-dialog');
        dialog.open = false;
        if (!ns.utils.isFunction(dialog.onCancel)) {
            console.error('The onAccept handler is missing');
            return;
        }
        dialog.onCancel();
    }

    function onClose(event) {
        const dialog = event.target.closest('coral-dialog');
        dialog.onCancel && dialog.onCancel();
        ns.fields.focus(dialog.source);
    }

    function onFieldClick(event) {
        setTimeout(() => event.target.focus(), 10);
    }

    function onFieldKeyDown(event) {
        if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey) {
            event.preventDefault();
            onAcceptClick(event);
        }
    }

})(document, Granite.$, window.eai = window.eai || {});
