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
(function (ns) {
    'use strict';

    ns.ui = ns.ui || {};

    /**
     * Contains meta-information and methods to operate on a chat-like dialog created with {@link ns.ui.showChatDialog}
     * or a similar method. Instances of this class are usually passed to callback functions that are defined by user
     * to handle dialog events
     */
    ns.ui.DialogContext = class DialogContext {

        /**
         * Creates a new instance of {@code DialogContext}
         * @param {Element} dialog - The chat dialog element
         */
        constructor(dialog) {
            this.dom = dialog;
            this.data = {};
            this._abortController = new AbortController();
        }

        /**
         * Aborts the pending operation associated with the current dialog (such as a request to a server).
         */
        abort() {
            if (this._abortController.signal.aborted) {
                return;
            }
            this._abortController.abort();
        }

        /**
         * Gets if the pending operation associated with the current dialog (such as a request to a server) has been
         * aborted
         * @returns {*|boolean}
         */
        get aborted() {
            return this._abortController.signal.aborted;
        }

        /**
         * Adds an error message to the chat dialog
         * @param {string} message - The error message to add
         */
        addError(message) {
            if (this.aborted) {
                return;
            }
            return this.addMessage(message, 'error');
        }

        /**
         * Adds an initial message to the chat dialog
         * @param {string} message - The initial message to add
         * @param {boolean} hidden - If true, the message will be added as a hidden initial message
         */
        addInitial(message, hidden) {
            if (this.aborted) {
                return;
            }
            this.dom.addMessage(
                message,
                'local initial' + (hidden ? ' hidden' : ''),
                { afterLast: (msg) => msg.matches('.initial,.prompt'), fallback: 'beginning' }
            );
        }

        /**
         * Adds a message to the chat dialog
         * @param {string|Object} message - The message to add
         * @param {string} type - The message type
         */
        addMessage(message, type) {
            if (this.aborted) {
                return;
            }
            this.dom.addMessage(message, type);
        }

        /**
         * Adds a prompt message to the chat dialog. If a prompt already exists, it updates its content
         * @param {string|Object} message - The message to add
         */
        addPrompt(message) {
            if (this.aborted) {
                return;
            }
            this.dom.addMessage(
                message,
                'local prompt hidden',
                { afterLast: (msg) => msg.matches('.prompt'), fallback: 'beginning' }
            );
        }

        /**
         * Closes the chat dialog
         */
        close() {
            this.abort();
            this.dom.open = false;
        }

        /**
         * Checks if the chat dialog has an initial message. The initial message is usually a text value of the field
         * to process, or the content of the page to process
         * @returns {boolean}
         */
        get hasInitialContent() {
            return !!this.dom.querySelector(ns.ui.SELECTOR_MESSAGE + '.initial');
        }

        /**
         * Checks if the chat dialog has a prompt message
         * @returns {boolean}
         */
        get hasPrompt() {
            return !!this.dom.querySelector(ns.ui.SELECTOR_MESSAGE + '.prompt');
        }

        /**
         * Checks if the chat dialog contains a prompt and/or initial content. This accessor is used to judge if there is
         * a need to process setup data or prompt user for additional input
         * @returns {boolean}
         */
        get isPrefilled() {
            return this.hasInitialContent || this.hasPrompt;
        }

        /**
         * Gets the messages from the chat dialog history
         * @returns {Object[]}
         */
        get messages() {
            const messages = this.dom.querySelectorAll(ns.ui.SELECTOR_MESSAGE);
            const result = [];
            for (const message of messages) {
                const contentHolder = !message.matches('.info') ?
                    message.querySelector(ns.ui.SELECTOR_CONTENT) :
                    null;
                if (!contentHolder) {
                    continue;
                }
                const content = contentHolder.innerText.trim();
                result.push({
                    role: message.matches('.remote') ? 'assistant' : 'user',
                    text: content
                });
            }
            return result;
        }

        /**
         * Gets the provider instance selected in the chat dialog. The provider is used to process messages
         * @returns {Provider|null}
         */
        get provider() {
            const providerId = ns.fields.getValue(this.dom.querySelector(ns.ui.SELECTOR_PROVIDERS));
            return ns.providers.getInstance(providerId);
        }

        /**
         * Gets the AbortSignal object associated with the current dialog
         * @returns {*|AbortSignal}
         */
        get signal() {
            return this._abortController.signal;
        }

        /**
         * Gets the source field associated with the chat dialog
         * @returns {*|Element}
         */
        get source() {
            return this.dom.source;
        }

        /**
         * Gets the title of the chat dialog
         * @returns {string}
         */
        get title() {
            return this.dom.querySelector('.title').innerText.trim();
        }

        /**
         * Switches the chat dialog into the "waiting" state with a spinner and an optional message displayed
         * @param {string=} message - The optional waiting message
         */
        wait(message) {
            this.dom.classList.add(ns.ui.CLS_BUSY);
            if (message) {
                this.dom.querySelector(ns.ui.SELECTOR_WAIT).dataset.message = message;
            }
        }

        /**
         * Assigns metadata to the dialog context. The metadata can be used later in the dialog event handlers
         * @param {Object} options - Object containing the metadata to assign
         * @returns {ns.ui.DialogContext}
         */
        withData(options) {
            if (ns.utils.isObject(options)) {
                Object.assign(this.data, options);
            }
            return this;
        }
    };
})(window.eai = window.eai || {});
