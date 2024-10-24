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

    const DEFAULT_MODEL = 'llava-llama3';

    ns.providers.register({
        icon: 'llama',
        id: 'llm.own',
        title: 'Own LLM (like Ollama; Vision support)',
        isTemplate: true,

        settings: [
            { name: 'url', title: 'Endpoint (URL)', required: true },
            { name: 'llm', title: 'Model', required: true },
            { name: 'systemPrompt', type: 'text', title: 'System Prompt' },
            { name: 'supports', title: 'Support constraints', multi: true }
        ],

        imageToText,
        textToText
    });

    async function imageToText(options) {
        if (!options.image) {
            ns.ui.alert(this.title, 'No image provided', 'error');
            return
        }
        return await getText(setGeneralValues.call(this, options));
    }

    async function textToText(options) {
        return await getText(setGeneralValues.call(this, options));
    }

    function setGeneralValues(options) {
        options.url = this.url;
        options.llm = this.llm || DEFAULT_MODEL;
        options.systemPrompt = this.systemPrompt;
        options.title = this.title;
        return options;
    }

    async function getText(options) {
        if (!options.url) {
            ns.ui.alert(options.title, 'Endpoint URL is not set', 'error');
            return;
        }
        if (!Array.isArray(options.messages) || options.messages.length === 0) {
            ns.ui.alert(options.title, 'Prompt message(-s) are missing', 'error');
            return
        }

        const body = JSON.stringify(prepareRequestBody(options));
        const response = await ns.http.getJson(options.url, { method: 'POST', body, signal: options.signal });
        if (!response) {
            return '';
        }

        if (response.content) {
            return response.content.trim().replace(/<\|\w+\|>/g, '');
        } else if (response.message) {
            const result = response.message.content || response.message.toString() || '';
            return result.trim();
        }
        return '';
    }

    function prepareRequestBody(options) {
        const messages = [];
        if (options.systemPrompt) {
            messages.push({ role: 'system', text: options.systemPrompt });
        }
        for (let i = 0; i < options.messages.length; i++) {
            const source = ns.utils.isObject(options.messages[i]) ? options.messages[i].text : options.messages[i].toString();
            if (!source) {
                continue;
            }
            let role = source.role || source.type || 'user';
            if (role === 'local') {
                role = 'user';
            } else if (role === 'remote') {
                role = 'assistant';
            }
            const newMessage = {
                role,
                content: source.text || source
            }
            if (i === 0 && options.image) {
                let encodedImage = options.image;
                if (encodedImage.indexOf(',') > 0) {
                    encodedImage = encodedImage.substring(encodedImage.indexOf(',') + 1);
                }
                newMessage.images = [encodedImage];
            }
            messages.push(newMessage);
        }
        return {
            stream: false,
            model: options.llm,
            temperature: 0.6,
            messages,
        };
    }

})(window.eai = window.eai || {});