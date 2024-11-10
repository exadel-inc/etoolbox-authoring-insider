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
(function ($, ns) {
    'use strict';

    const RELAY_ENDPOINT = '/content/etoolbox/authoring-insider/servlet/relay.json/';

    const DEFAULT_SERVICE = 'openai';
    const DEFAULT_MODEL = 'gpt-4o-mini';

    const MODELS = {};
    MODELS[DEFAULT_SERVICE] = DEFAULT_MODEL;

    ns.providers.register({
        icon: 'openai',
        id: 'llm.external',
        title: 'External LLM (like OpenAI)',
        isTemplate: true,

        settings: [
            { name: 'service', title: 'Service Identifier', placeholder: 'E.g.: ' + DEFAULT_SERVICE, required: true },
            { name: '_token', type: 'encrypted', title: 'Authentication Token', placeholder: 'Leave empty if not needed' },
            { name: 'llm', title: 'Model', placeholder: 'If left empty, a default for this service will be applied' },
            { name: 'systemPrompt', type: 'text', title: 'System Prompt' },
            { name: 'supports', title: 'Support constraints', multi: true }
        ],

        isValid,
        imageToText,
        textToText
    });

    function isValid() {
        return !!this.service;
    }

    async function imageToText(options) {
        if (!options.image) {
            ns.ui.alert(this.title, 'No image provided', 'error');
            return;
        }
        return await getText(setGeneralValues.call(this, options));
    }

    async function textToText(options) {
        return await getText(setGeneralValues.call(this, options));
    }

    function setGeneralValues(options) {
        options.service = this.service || DEFAULT_SERVICE;
        options.llm = this.llm || MODELS[options.service] || DEFAULT_MODEL;
        options.systemPrompt = this.systemPrompt;
        options.title = this.title;
        options._path = this._path || '';
        return options;
    }

    async function getText(options) {
        if (!Array.isArray(options.messages) || options.messages.length === 0) {
            ns.ui.alert(options.title, 'Prompt message(-s) are missing', 'error');
            return;
        }

        let endpoint = RELAY_ENDPOINT + options.service;
        const searchParams = new URLSearchParams();
        searchParams.set('_path', options._path);
        if (options.dryRun) {
            searchParams.set('dryRun', 'true');
        }
        endpoint += '?' + searchParams.toString();

        const body = JSON.stringify(prepareRequestBody(options));

        const response = await ns.http.getJson(endpoint, { method: 'POST', body, signal: options.signal });
        if (!response) {
            return '';
        }

        let message;
        if (Array.isArray(response.choices) && response.choices.length > 0) {
            message = response.choices[0].message;
        } else if (response.message) {
            message = response.message;
        }
        if (message && message.content) {
            return message.content.toString();
        } else if (message) {
            return message.toString();
        }

        if (response.error) {
            const errorMessage = response.error.message || response.error;
            throw new Error(errorMessage);
        }
        return '';
    }

    function prepareRequestBody(options) {
        const messages = [];
        if (options.systemPrompt) {
            messages.push({ role: 'system', text: options.systemPrompt });
        }
        for (let i = 0; i < options.messages.length; i++) {
            const source = options.messages[i];
            let role = source.role || source.type || 'user';
            if (role === 'local') {
                role = 'user';
            } else if (role === 'remote') {
                role = 'assistant';
            }
            const newMessage = {
                role,
                content: [{ type: 'text', text: source.text || source }]
            };
            if (i === 0 && options.image) {
                newMessage.content.push({ type: 'image_url', image_url: { url: options.image, detail: options.imageDetail || 'low' } });
            }
            messages.push(newMessage);
        }
        return {
            stream: false,
            model: options.llm,
            messages,
        };
    }

})(Granite.$, window.eai = window.eai || {});
