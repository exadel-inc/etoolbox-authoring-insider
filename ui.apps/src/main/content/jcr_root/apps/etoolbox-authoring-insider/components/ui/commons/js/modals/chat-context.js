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

    ns.ui.DialogContext = class {
        constructor(dialog, options) {
            this.dom = dialog;
            if (ns.utils.isObject(options)) {
                Object.assign(this, options);
            }
        }

        get aborted() {
            return this.dom.abortController && this.dom.abortController.signal.aborted;
        }

        appendMessage(message, type, atStart = false) {
            if (type === 'prompt') {
                const firstMessage = this.dom.querySelector(SELECTOR_MESSAGE);
                if (firstMessage) {
                    firstMessage.dataset.prompt = message;
                    return;
                }
                type = 'local';
            }
            this.dom.addMessage(message, type, atStart);
        }

        close() {
            this.dom.open = false;
        }

        getHistory() {
            const messages = this.dom.querySelectorAll(SELECTOR_MESSAGE);
            const result = { messages: [] };
            for (const message of messages) {
                if (message.dataset.prompt) {
                    result.prompt = message.dataset.prompt;
                    result.messages.push({ role: 'user', text: message.dataset.prompt });
                }
                const contentHolder = message.querySelector(ns.ui.SELECTOR_CONTENT);
                if (!contentHolder) {
                    continue;
                }
                const content = contentHolder.innerText.trim();
                if (message.matches('.prompt')) {
                    delete result.prompt;
                    result.visiblePrompt = contentHolder.innerText.trim();
                    result.messages.push({ role: 'user', text: content });
                } else if (message.matches('.initial')) {
                    result.initial = contentHolder.innerText.trim();
                    result.messages.push({ role: 'user', text: content });
                } else if (!message.matches('.info')) {
                    result.messages.push({
                        role: message.matches('.remote') ? 'assistant' : 'user',
                        text: contentHolder.innerText.trim()
                    });
                }
            }
            return result;
        }

        prependMessage(message, type) {
            this.appendMessage(message, type, true);
        }

        get signal() {
            return this.dom.abortController && this.dom.abortController.signal;
        }

        get title() {
            return this.dom.querySelector('.title').innerText;
        }

        wait(message) {
            this.dom.classList.add(ns.ui.CLS_BUSY);
            if (message) {
                this.dom.querySelector(ns.ui.SELECTOR_WAIT).dataset.message = message;
            }
        }
    }


})(window.eai = window.eai || {});