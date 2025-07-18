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

    function handle(field, providerId) {
        // Arguments validation
        if (!field) {
            return ns.ui.alert(this.title, 'Target field is invalid', 'error');
        }
        if (!ns.providers.getInstance(providerId)) {
            return ns.ui.alert(this.title, `Could not find a provider for action ${providerId}`, 'error');
        }

        // Chat dialog
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

            onStartup: async(context) => await handleDialogContext(context),

            onInput: async(msg, context) =>
                await context.provider.textToText({ messages: context.messages, signal: context.signal }),

            onResponse: (response) => ns.text.stripSpacesAndPunctuation(response),

            onAccept: (result) => ns.fields.setSelectedContent(field, result),
        });
    }

    async function handleDialogContext(context) {
        let text;
        if (ns.text.isBlank(context.initialContent)) {
            text = ns.fields.getSelectedContent(context.source) || await ns.ui.inputDialog({
                title: 'Enter your content',
                parent: context.dom
            });
            if (ns.text.isBlank(text)) {
                return context.close();
            }
            context.addInitial(text, false);
        }
        if (ns.text.isBlank(context.prompt)) {
            const prompt = await ns.ui.inputDialog({
                title: 'Enter your prompt',
                parent: context.dom,
                intro: { text },
            });
            if (ns.text.isBlank(prompt)) {
                return context.close();
            }
            context.addPrompt(prompt);
        }

        const result = await context.provider.textToText({ messages: context.messages, signal: context.signal });
        return !context.aborted ? result : null;
    }

})(window.eai = window.eai || {});
