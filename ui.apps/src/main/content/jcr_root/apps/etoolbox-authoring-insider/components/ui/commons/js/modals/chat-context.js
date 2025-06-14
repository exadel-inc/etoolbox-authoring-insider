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

    const SELECTOR_MESSAGE = '.message';

    ns.ui = ns.ui || {};

    /**
     * Contains meta-information and methods to operate on a chat-like dialog created with {@link ns.ui.showChatDialog}
     * or a similar method. Instances of this class are usually passed to callback functions that are defined by user
     * to handle dialog events
     */
    ns.ui.DialogContext = class {

        /**
         * Creates a new instance of {@code DialogContext}
         * @param {Element} dialog - The chat dialog element
         * @param options - The dialog context options
         */
        constructor(dialog, options) {
            this.dom = dialog;
            if (ns.utils.isObject(options)) {
                Object.assign(this, options);
            }
        }

        /**
         * Gets if the pending operation associated with the current dialog (such as a request to a server) has been
         * aborted
         * @returns {*|boolean}
         */
        get aborted() {
            return this.dom.abortController && this.dom.abortController.signal.aborted;
        }

        /**
         * Adds a message to the chat dialog
         * @param {string|Object} message - The message to add
         * @param {string} type - The message type
         */
        appendMessage(message, type) {
            if (type === 'prompt') {
                type = 'local';
            }
            this.dom.addMessage(message, type);
        }

        /**
         * Closes the chat dialog
         */
        close() {
            this.dom.open = false;
        }

        /**
         * Gets the initial user-provided content from the chat dialog history
         * @returns {string}
         */
        get initialContent() {
            const initialMessage = this.dom.querySelector(SELECTOR_MESSAGE + '.initial ' + ns.ui.SELECTOR_CONTENT);
            return initialMessage ? initialMessage.innerText.trim() : '';
        }

        /**
         * Gets the messages from the chat dialog history
         * @returns {Object[]}
         */
        get messages() {
            const messages = this.dom.querySelectorAll(SELECTOR_MESSAGE);
            const result = [];
            for (const message of messages) {
                const contentHolder = !message.matches('.info') ?
                    message.querySelector(ns.ui.SELECTOR_CONTENT) :
                    null;
                if (!contentHolder) {
                    continue;
                }
                const content = contentHolder.innerText.trim();
                result.messages.push({
                    role: message.matches('.remote') ? 'assistant' : 'user',
                    text: content
                });
            }
            return result;
        }

        /**
         * Gets the prompt string from the chat dialog history
         * @returns {string}
         */
        get prompt() {
            const promptMessage = this.dom.querySelector(SELECTOR_MESSAGE + '.prompt ' + ns.ui.SELECTOR_CONTENT);
            return promptMessage ? promptMessage.innerText.trim() : '';
        }

        /**
         * Gets the AbortSignal object associated with the current dialog
         * @returns {*|AbortSignal}
         */
        get signal() {
            return this.dom.abortController && this.dom.abortController.signal;
        }

        /**
         * Gets the title of the chat dialog
         * @returns {string}
         */
        get title() {
            return this.dom.querySelector('.title').innerText.trim();
        }

        /**
         * Sets the prompt string in the chat dialog
         * @param {string} value - The prompt string
         */
        set prompt(value) {
            const existingPrompt = this.dom.querySelector('.local.prompt .content');
            if (existingPrompt) {
                existingPrompt.innerText = value;
            } else {
                this.dom.addMessage(value, 'local prompt hidden', true);
            }
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
        with(options) {
            if (ns.utils.isObject(options)) {
                Object.assign(this, options);
            }
            return this;
        }
    };

})(window.eai = window.eai || {});
