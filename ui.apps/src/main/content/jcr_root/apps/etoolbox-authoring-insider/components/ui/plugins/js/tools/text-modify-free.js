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

    const ID = 'text.modify.free';

    ns.tools.register({
        icon: 'scribble',
        id: ID,
        title: 'Modify text with a free prompt',

        requires: [
            ID,
            'textToText',

        ],
        settings: [
            { name: 'selectors', type: 'textfield', title: 'Field selection (if not specified, will match all text fields)', multi: true },
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
            providers: this.providers,
            providerId,
            responses: [
                {
                    icon: 'scribble',
                    title: 'Send your own message',
                    action: 'message',
                    style: 'icon'
                }
            ],
            onStart: async(context) => {
                return await inputAndRun(context, provider, initialContent);
            },
            onInput: async(msg, context) => {
                return await provider.textToText({ messages: context.messages, signal: context.signal });
            },
            onReload: (newProviderId, context) => {
                if (context.isRefresh) {
                    return this.handle(field, newProviderId);
                }
                this.handle(field, newProviderId, {
                    prompt: context.prompt,
                    text: context.initialContent,
                });
            },
            onResponse: (response) => ns.text.stripSpacesAndPunctuation(response),
            onAccept: (result) => ns.fields.setSelectedContent(field, result),
        });
    }

    async function inputAndRun(context, provider, initialContent) {
        let text = initialContent.text;
        if (!text) {
            text = await ns.ui.inputDialog({
                title: 'Enter your content',
                parent: context.dom
            });
            if (!text) {
                return context.close();
            }
        }

        let prompt = initialContent.prompt;
        if (!prompt) {
            prompt = await ns.ui.inputDialog({
                title: 'Enter your prompt',
                parent: context.dom,
                intro: {
                    text
                },
            });
            if (!prompt) {
                return context.close();
            }
        }

        context.appendMessage(prompt, 'local prompt');
        context.appendMessage(text, 'local initial');

        const messages = [
            { type: 'local', text: prompt },
            { type: 'local', text }
        ];

        const result = await provider.textToText({ messages, signal: context.signal });
        return !context.aborted ? result : null;
    }

})(window.eai = window.eai || {});
