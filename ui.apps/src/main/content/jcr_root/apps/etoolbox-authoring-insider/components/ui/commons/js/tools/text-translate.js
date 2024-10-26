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

    const ID = 'text.translate';
    const PROMPT = 'Translate the next message into {{lang}}. Respond with only the translation. Give exactly one variant.';
    const REPETITION_PROMPT = 'Provide another variant of how you translate the given message. Respond with only the translation. Give exactly one variant.';
    const DEFAULT_LANGUAGES = ['French', 'German'];

    ns.tools.register({
        icon: 'textSize',
        id: ID,
        title: 'Translate',

        requires: [
            ID,
            'textToText'
        ],
        settings: [
            { name: 'selectors', type: 'textfield', title: 'Field selection (if not specified, will match all text fields)', multi: true },
            { name: 'languages', type: 'textfield', title: 'Languages', multi: true },
        ],

        handle,
    });

    function handle(field, providerId, initialContent) {
        if (!field) {
            return ns.ui.alert(this.title, 'Target field is invalid', 'error');
        }
        const provider = ns.providers.getInstance(providerId);
        if (!provider) {
            return ns.ui.alert(this.title, `Could not find a provider for action ${providerId}`, 'error');
        }

        if (!ns.utils.isObject(initialContent)) {
            initialContent = { text: ns.fields.getSelectedContent(field) };
        }

        ns.ui.chatDialog({
            id: ID + '.dialog',
            title: this.title,
            icon: this.icon,
            source: field,
            intro: initialContent,
            providers: this.providers,
            providerId,
            responses: [
                {
                    icon: 'plus-one',
                    title: 'Another variant',
                    message: REPETITION_PROMPT,
                    style: 'icon'
                },
            ],
            onStart: async(context) => {
                return await inputAndRun(this, context, provider, initialContent);
            },
            onInput: async(msg, context) => {
                return await provider.textToText({ messages: context.getHistory().messages, signal: context.signal });
            },
            onReload: (newProviderId, context) => {
                if (context.isRefresh) {
                    return this.handle(field, newProviderId);
                }
                const history = context.getHistory();
                this.handle(field, newProviderId, {
                    prompt: history.prompt,
                    text: history.initial,
                });
            },
            onResponse: (response) => (response || '').replace(/^[\s"']+|[\s"']+$/g, ''),
            onAccept: (result) => ns.fields.setSelectedContent(field, result),
        });
    }

    async function inputAndRun(self, context, provider, initialContent) {
        let text = initialContent.text;
        if (!text) {
            text = await ns.ui.inputDialog({
                title: 'Enter your content',
                parent: context.dom
            });
            if (!text) {
                return context.close();
            }
            context.appendMessage(text, 'local initial');
        }

        let prompt = initialContent.prompt;
        if (!prompt) {
            const language = await ns.ui.inputDialog({
                title: context.title,
                parent: context.dom,
                fields: [
                    {
                        name: 'language',
                        type: 'selectlist',
                        title: 'Language',
                        options: self.languages || DEFAULT_LANGUAGES
                    }
                ]
            });
            if (!language) {
                return context.close();
            }
            prompt = PROMPT.replace('{{lang}}', language);
            context.setPrompt(prompt);
        }

        const messages = [
            { type: 'user', text: prompt },
            { type: 'user', text },
        ];

        const result = await provider.textToText({ messages, signal: context.signal });
        return !context.aborted ? result : '';
    }

})(window.eai = window.eai || {});
