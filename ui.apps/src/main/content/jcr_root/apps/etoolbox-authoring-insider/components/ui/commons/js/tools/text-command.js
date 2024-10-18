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

    const ID = 'text.modify.command';

    ns.tools.register({
        icon: 'edit',
        id: ID,
        title: 'Process text with a command',
        isTemplate: true,

        requires: [
            ID,
            'textToText'
        ],
        settings: [
            { name: 'selectors', type: 'textfield', title: 'Field selection (if not specified, will match all text fields)', multi: true },
            { name: 'prompt', type: 'text', title: 'Prompt', required: true },
            { name: 'repeatPrompt', type: 'text', title: 'Repetition Prompt' }
        ],

        handle,
    });

    function handle(field, providerId, initialContent) {
        if (!field) {
            return ns.ui.alert(this.title, 'Target field is invalid', 'error');
        }
        if (!this.prompt) {
            return ns.ui.alert(this.title, 'Prompt is not set', 'error');
        }
        const provider = ns.providers.getInstance(providerId);
        if (!provider) {
            return ns.ui.alert(this.title, `Could not find a provider for action ${providerId}`, 'error');
        }

        const repeatPrompt = this.repeatPrompt || 'Provide another variant of how you ' + this.prompt;

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
            providerId: providerId,
            responses: [
                {
                    icon: 'plus-one',
                    title: 'Another variant',
                    message: repeatPrompt,
                    style: 'icon',
                    class: 'skip-after-input'
                },
                {
                    icon: 'scribble',
                    title: 'Send your own message',
                    action: 'message',
                    style: 'icon'
                }
            ],
            onStart: async (context) =>
                await inputAndRun(context, provider, initialContent.text, this.prompt),
            onInput: async (msg, context) =>
                provider.textToText({ messages: context.getHistory().messages, signal: context.signal }),
            onReload: (newProviderId, context) => {
                if (context.isRefresh) {
                    return this.handle(field, newProviderId);
                }
                const history = context.getHistory();
                this.handle(field, newProviderId, {
                    text: history.initial,
                });
            },
            onResponse: (response) =>
                (response || '').replace(/^[\s"']+|[\s"']+$/g, ''),
            onAccept: (result) =>
                ns.fields.setSelectedContent(field, result),
        });
    }

    async function inputAndRun(context, provider, sourceValue, prompt) {
        if (!sourceValue) {
            sourceValue = await ns.ui.inputDialog({
                title: 'Enter your content',
                parent: context.dom
            });
            if (!sourceValue) {
                return context.close();
            }
            context.appendMessage(sourceValue, 'initial');
            context.prependMessage(prompt, 'prompt');
        }

        const messages = [
            { type: 'local', text: prompt },
            { type: 'local', text: sourceValue },
        ];

        const result = await provider.textToText({ messages, signal: context.signal });
        return !context.aborted ? result : '';
    }

})(window.eai = window.eai || {});