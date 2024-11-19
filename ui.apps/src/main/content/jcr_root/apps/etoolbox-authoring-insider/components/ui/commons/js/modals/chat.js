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
(function (document, ns) {
    'use strict';

    const ACTION_ACCEPT = 'accept';
    const ACTION_CLOSE = 'close';
    const ACTION_MESSAGE = 'message';

    const CLS_BUSY = 'is-busy';
    const CLS_CONTENT = 'content';
    const CLS_INTERACTIVE = 'is-interactive';
    const CLS_MODIFIED = 'is-user-modified';

    const SELECTOR_ACTION = '[data-action]';
    const SELECTOR_CONTENT = '.' + CLS_CONTENT;
    const SELECTOR_FIELD = '.coral-Form-field';
    const SELECTOR_FRAMES = '#frames';
    const SELECTOR_MESSAGES = '.messages';
    const SELECTOR_PROVIDERS = '.providers';
    const SELECTOR_REFRESH_BUTTON = '.refresh';
    const SELECTOR_WAIT = 'coral-wait';

    ns.ui = ns.ui || {};

    ns.ui.CLS_BUSY = CLS_BUSY;
    ns.ui.SELECTOR_CONTENT = SELECTOR_CONTENT;
    ns.ui.SELECTOR_WAIT = SELECTOR_WAIT;

    /* -----------------
       Interface methods
       ----------------- */

    /**
     * Brings on screen a dialog with chat-like interface
     * @param {Object} options - The dialog options
     */
    ns.ui.showChatDialog = function (options = {}) {
        const dialog = ns.ui.initDialog({
            id: options.id,
            header: { innerHTML: createHeader(options) },
            content: { innerHTML: createContent(options) },
            class: 'chat no-footer',
            backdrop: Coral.Dialog.backdrop.STATIC,
            closable: Coral.Dialog.closable.ON,
            movable: true,
            focusOnShow: Coral.mixin.overlay.focusOnShow.ON,
            returnFocus: Coral.mixin.overlay.returnFocus.ON,
        });

        dialog.off('change', SELECTOR_PROVIDERS, onProviderChange).on('change', SELECTOR_PROVIDERS, onProviderChange);
        dialog.off('click', SELECTOR_REFRESH_BUTTON, onRefreshClick).on('click', SELECTOR_REFRESH_BUTTON, onRefreshClick);

        dialog.off('click', SELECTOR_ACTION, onActionClick).on('click', SELECTOR_ACTION, onActionClick);

        dialog.off('click', SELECTOR_FIELD, onFieldClick).on('click', SELECTOR_FIELD, onFieldClick);
        dialog.off('keydown', SELECTOR_FIELD, onFieldKeyDown).on('keydown', SELECTOR_FIELD, onFieldKeyDown);

        dialog.off('dialog:accept', onAcceptClick).on('dialog:accept', onAcceptClick);
        dialog.off('dialog:cancel', onCancelClick).on('dialog:cancel', onCancelClick);

        dialog.off('coral-overlay:close', onClose).on('coral-overlay:close', onClose);

        dialog.abortController = new AbortController();
        dialog.source = options.source;
        dialog.addFrame = addFrame.bind(dialog);
        dialog.addMessage = addMessage.bind(dialog);

        dialog.onAccept = options.onAccept;
        dialog.onCancel = options.onCancel;
        dialog.onInput = options.onInput;
        dialog.onReload = options.onReload;
        dialog.onResponse = options.onResponse;

        Coral.commons.ready(dialog, function () {
            const parent = options.parent || (options.source && options.source.closest('coral-dialog'));
            ns.ui.adjustDialogSize(dialog, parent);
            if (ns.utils.isFunction(options.onStart)) {
                runAndRenderResponse(dialog, options.onStart);
            }
            ns.fields.lock(dialog.source);
            dialog.show();
        });
    };

    /**
     * Displays a dialog with chat-like interface and waits for a user action. Unlike {@link ns.ui.showChatDialog},
     * this method returns a promise that resolves with the user input or {@code null} if the dialog was canceled.
     * @param {Object} options - The dialog options
     * @returns {Promise<*|null>}
     */
    ns.ui.chatDialog = function (options = {}) {
        return new Promise((resolve) => {
            if (ns.utils.isFunction(options.onAccept)) {
                const parentAccept = options.onAccept.bind({});
                options.onAccept = (text, dialog) => {
                    parentAccept(text, dialog);
                    resolve(text, dialog);
                };
            } else {
                options.onAccept = (text) => resolve(text);
            }
            if (ns.utils.isFunction(options.onCancel)) {
                const parentCancel = options.onCancel.bind({});
                options.onCancel = () => {
                    parentCancel();
                    resolve(null);
                };
            } else {
                options.onCancel = () => resolve(null);
            }
            ns.ui.showChatDialog(options);
        });
    };

    /* --------------
       Initialization
       -------------- */

    function createHeader(options) {
        return ns.icons.getHtml(options.icon || 'edit') +
            `<span class="title">${options.title || 'EToolbox Authoring Insider'}</span>`;
    }

    function createContent(options) {
        let startMessage;
        if (options.intro && options.intro.image) {
            startMessage = ns.ui.createElement({
                class: 'message initial no-grow',
                children: {
                    tag: 'img',
                    class: 'preview',
                    src: options.intro.image,
                    alt: 'Source image'
                }
            });
        }
        if (options.intro && isNotBlank(options.intro.text)) {
            startMessage = ns.ui.createElement({
                class: 'message initial',
                children: {
                    class: CLS_CONTENT,
                    innerText: options.intro.text
                }
            });
        }

        if (options.intro && options.intro.prompt) {
            startMessage = startMessage ? [startMessage] : [];
            startMessage.unshift(ns.ui.createElement({
                class: 'message local prompt hidden',
                children: {
                    class: CLS_CONTENT,
                    innerText: options.intro.prompt
                }
            }));
        }

        const responsesDefs = [];
        if (Array.isArray(options.responses)) {
            responsesDefs.push(...options.responses);
        }
        responsesDefs.push(
            {
                icon: 'check',
                style: 'primary icon',
                class: 'when-not-alert',
                title: 'Accept last variant',
                action: ACTION_ACCEPT
            },
            {
                icon: 'check',
                style: 'secondary icon',
                class: 'when-alert',
                title: 'OK',
                action: ACTION_CLOSE
            }
        );
        const responses = responsesDefs
            .map((item) => createActionButton(Object.assign(item, { class: 'response no-outline ' + item.class })));

        let providerSelection;
        if (Array.isArray(options.providers) && options.providers.length > 1) {
            const providerItems = [];
            for (const prov of options.providers) {
                const iconHtml = ns.icons.getHtml(prov.icon, prov.title);
                providerItems.push(ns.ui.createElement({
                    tag: 'coral-select-item',
                    value: prov.id,
                    selected: prov.id.endsWith('@' + options.providerId) ? 'selected' : '',
                    innerHtml: iconHtml + prov.title
                }));
            }
            providerSelection = ns.ui.createElement({
                tag: 'coral-select',
                class: 'providers',
                title: 'Providers',
                children: providerItems
            });
        }

        const frames = ns.ui.createElement({
            tag: 'coral-panelstack',
            id: 'frames',
        });
        const mainFrame = ns.ui.createElement({
            tag: 'coral-panel',
            id: 'chat',
            class: 'no-padding scrollable',
            selected: true,
            'data-title': options.title
        });
        mainFrame.content = ns.ui.createElement({
            tag: 'coral-panel-content',
            children: [
                {
                    class: 'messages',
                    children: startMessage
                },
                {
                    tag: SELECTOR_WAIT,
                    size: 'M',
                    class: 'when-busy centered'
                },
                {
                    class: 'responses when-interactive centered',
                    children: responses
                },
                providerSelection,
                {
                    tag: 'button',
                    is: 'coral-button',
                    variant: 'minimal',
                    icon: 'refresh',
                    iconsize: 'S',
                    class: 'refresh',
                    title: 'Refresh'
                }
            ]
        });
        frames.items.add(mainFrame);
        return frames.outerHTML;
    }

    /* --------------
       Event handlers
       -------------- */

    function onAcceptClick(event) {
        const dialog = event.target.closest('coral-dialog');
        const frames = dialog.querySelector(SELECTOR_FRAMES);
        const frame = frames && frames.selectedItem;

        if (!frame || frame.id === 'chat') {
            return;
        }
        if (!ns.ui.validate(frame)) {
            return;
        }

        frame.onAccept && frame.onAccept(ns.ui.getInputValue(frame));

        const nextFrame = frame.nextSibling || frame.items.first();
        frames.items.remove(frame);
        switchToFrame(dialog, nextFrame);
    }

    async function onActionClick(event) {
        const action = event.target.closest(SELECTOR_ACTION).dataset.action;
        if (action === ACTION_ACCEPT) {
            onActionAcceptClick(event);
        } else if (action === ACTION_CLOSE) {
            onCancelClick(event);
        } else if (action === ACTION_MESSAGE) {
            await onActionMessageClick(event);
        }
    }

    function onActionAcceptClick(event) {
        const dialog = event.target.closest('coral-dialog');
        const onAccept = dialog.onAccept;
        if (!ns.utils.isFunction(onAccept)) {
            console.error('The onAccept handler is missing');
            return;
        }
        const message = event.target.closest('.message') ||
            event.target.closest('coral-dialog-content').querySelector('.message.remote:last-of-type');
        dialog.open = false;
        if (!message) {
            return;
        }
        const responseText = message.classList.contains('html') ?
            message.querySelector(SELECTOR_CONTENT).innerHTML :
            message.querySelector(SELECTOR_CONTENT).innerText.trim();
        onAccept(responseText);
    }

    async function onActionMessageClick(event) {
        const dialog = event.target.closest('coral-dialog');
        if (!ns.utils.isFunction(dialog.onInput)) {
            console.error('The onInput handler is missing');
            return;
        }
        const message = event.target.closest(SELECTOR_ACTION).dataset.message;
        if (message) {
            dialog.addMessage(message, 'local hidden');
            runAndRenderResponse(dialog, dialog.onInput, message);
        } else {
            await onActionFreeMessageClick(event);
        }
    }

    async function onActionFreeMessageClick(event) {
        const dialog = event.target.closest('coral-dialog');
        const text = await ns.ui.inputDialog({
            id: 'free-message',
            title: event.target.closest('[is="coral-anchorbutton"]').getAttribute('title'),
            parent: dialog
        });
        if (!text) {
            return;
        }
        dialog.addMessage(text, 'local');
        dialog.classList.add(CLS_MODIFIED);
        runAndRenderResponse(dialog, dialog.onInput, text);
    }

    function onCancelClick(event) {
        const dialog = event.target.closest('coral-dialog');
        const frames = dialog.querySelector(SELECTOR_FRAMES);
        const frame = frames && frames.selectedItem;
        if (!frame || frame.id === 'chat') {
            dialog.open = false;
            return;
        }
        frame.onCancel && frame.onCancel();
        const nextFrame = frame.nextSibling || frames.items.first();
        frames.items.remove(frame);
        switchToFrame(dialog, nextFrame);
    }

    function onClose(event) {
        const dialog = event.target.closest('coral-dialog');
        dialog.classList.remove(CLS_BUSY, CLS_INTERACTIVE, CLS_MODIFIED);
        delete dialog.querySelector(SELECTOR_WAIT).dataset.message;
        dialog.abortController.abort();
        dialog.onCancel && dialog.onCancel();
        ns.fields.focus(dialog.source);
        ns.fields.unlock(dialog.source);
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

    function onProviderChange(event) {
        const dialog = event.target.closest('coral-dialog');
        const onReload = dialog.onReload;
        if (!ns.utils.isFunction(onReload)) {
            console.error('The onReload handler is missing');
            return;
        }
        dialog.open = false;
        onReload(ns.fields.getValue(event.target), new ns.ui.DialogContext(dialog));
    }

    function onRefreshClick(event) {
        const dialog = event.target.closest('coral-dialog');
        const onReload = dialog.onReload;
        if (!ns.utils.isFunction(onReload)) {
            console.error('The onReload handler is missing');
            return;
        }
        dialog.abortController.abort();
        const providerId = ns.fields.getValue(dialog.querySelector(SELECTOR_PROVIDERS));
        dialog.open = false;
        dialog.classList.remove(CLS_MODIFIED);
        onReload(providerId, new ns.ui.DialogContext(dialog, { isRefresh: true }));
    }

    /* ----------------------
       Content creation logic
       ---------------------- */

    function addFrame(options, position = 0) {
        const frames = this.querySelector(SELECTOR_FRAMES);
        if (!frames) {
            return;
        }
        const newFrame = ns.ui.createElement({
            tag: 'coral-panel',
            class: options.class,
            id: options.id,
            'data-title': options.title
        });
        newFrame.content = ns.ui.createElement({
            tag: 'coral-panel-content',
            children: options.content
        });
        newFrame.onAccept = options.onAccept;
        newFrame.onCancel = options.onCancel;

        const exisingFrame = frames.items.getAll()[position];
        frames.items.add(newFrame, exisingFrame);
        switchToFrame(this, newFrame);
    }

    function addMessage(message, type, atStart = false) {
        if (isBlank(message)) {
            return;
        }
        let anchorButton = null;
        if (type === 'remote') {
            anchorButton = createActionButton({
                icon: 'check',
                style: 'secondary icon',
                class: 'no-outline when-not-alert',
                title: 'Accept this variant',
                action: ACTION_ACCEPT,
            });
        }

        const messageDiv = document.createElement('div');
        messageDiv.setAttribute('class', 'message ' + (type || ''));

        const messageContent = document.createElement('span');
        messageContent.classList.add(CLS_CONTENT);
        if (ns.utils.isObjectWithProperty(message, 'type', 'html')) {
            messageContent.innerHTML = message.text;
            messageDiv.classList.add('html');
        } else if (ns.utils.isObjectWithProperty(message, 'type', 'info')) {
            messageContent.innerText = message.text;
            messageDiv.classList.add('info');
        } else {
            messageContent.innerText = message;
        }

        messageDiv.appendChild(messageContent);
        if (anchorButton) {
            messageDiv.appendChild(anchorButton);
        }
        if (atStart) {
            this.querySelector(SELECTOR_MESSAGES).prepend(messageDiv);
        } else {
            this.querySelector(SELECTOR_MESSAGES).append(messageDiv);
        }
    }

    function createActionButton(action) {
        let style = action.style || '';
        const iconOnly = action.style.includes('icon');
        style = style.replace('icon', '').trim() || 'secondary';

        const noText = iconOnly || !action.title;
        let classNames = action.class || '';
        if (noText) {
            classNames += ' no-text';
        }
        let labelContent = '';
        if (action.icon) {
            labelContent += ns.icons.getHtml(action.icon);
        }
        if (!noText) {
            labelContent += action.title || '';
        }
        return ns.ui.createElement({
            tag: 'a',
            is: 'coral-anchorbutton',
            variant: style,
            class: classNames,
            title: action.title,
            'data-action': action.message ? ACTION_MESSAGE : action.action,
            'data-message': action.message,
            children: [{
                tag: 'coral-anchorbutton-label',
                innerHTML: labelContent
            }]
        });
    }

    /* ----------------
       Dynamic UI logic
       ---------------- */

    function runAndRenderResponse(dialog, eventHandler, ...args) {
        dialog.classList.add(CLS_BUSY);
        scrollToBottom(dialog);
        if (!ns.utils.isAsyncFunction(eventHandler)) {
            const response = eventHandler(...args, new ns.ui.DialogContext(dialog));
            dialog.addMessage(response, 'remote');
            dialog.classList.toggle(CLS_INTERACTIVE, dialog.querySelectorAll('.remote').length > 0);
            return;
        }
        eventHandler(...args, new ns.ui.DialogContext(dialog))
            .then((response) => {
                let processedResponse = response;
                if (ns.utils.isFunction(dialog.onResponse)) {
                    processedResponse = dialog.onResponse(processedResponse, new ns.ui.DialogContext(dialog));
                }
                dialog.addMessage(processedResponse, 'remote');
                dialog.classList.toggle(CLS_INTERACTIVE, dialog.querySelectorAll('.remote').length > 0);
            })
            .catch((err) => {
                console.error(err);
                dialog.addMessage(err.message || err, 'error');
                dialog.classList.remove(CLS_INTERACTIVE);
            })
            .finally(() => {
                dialog.classList.remove(CLS_BUSY);
                delete dialog.querySelector(SELECTOR_WAIT).dataset.message;
                scrollToBottom(dialog);
            });
    }

    function scrollToBottom(dialog) {
        const content = dialog.querySelector('.scrollable');
        setTimeout(() => content.scroll({
            top: content.scrollHeight,
            behavior: 'smooth'
        }), 10);
    }

    function switchToFrame(dialog, frame) {
        if (!frame) {
            return;
        }

        frame.setAttribute('selected', true);
        if (frame.dataset.title) {
            dialog.querySelector('coral-dialog-header .title').innerText = frame.dataset.title;
        }

        const field = frame.querySelector(SELECTOR_FIELD);
        if (field) {
            field.focus();
        }

        dialog.classList.toggle('no-footer', frame.id === 'chat');
    }

    /* --------------
       Misc utilities
       -------------- */

    function isBlank(value) {
        if (!value) {
            return true;
        }
        if (ns.utils.isObject(value)) {
            return isBlank(value.text);
        }
        return ns.utils.isBlank(value);
    }

    function isNotBlank(value) {
        return !isBlank(value);
    }

})(document, window.eai = window.eai || {});
