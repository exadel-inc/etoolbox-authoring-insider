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
            { name: 'prompt', type: 'text', title: 'Prompt (supports user input templates)', required: true },
            { name: 'repeatPrompt', type: 'text', title: 'Repetition Prompt' }
        ],

        isValid,
        handle,
    });

    function isValid() {
        return !!this.prompt;
    }

    function handle(field, providerId, initialContent) {
        if (!field) {
            return ns.ui.alert(this.title, 'Target field is invalid', 'error');
        }

        const provider = ns.providers.getInstance(providerId);
        if (!provider) {
            return ns.ui.alert(this.title, `Could not find a provider for action ${providerId}`, 'error');
        }

        if (!this.prompt) {
            return ns.ui.alert(this.title, 'Prompt is not set', 'error');
        }
        const repeatPrompt = this.repeatPrompt || 'Provide another variant of how you ' + this.prompt;

        if (!ns.utils.isObject(initialContent)) {
            initialContent = {};
        }
        initialContent.text = initialContent.text || ns.fields.getSelectedContent(field);
        initialContent.prompt = initialContent.prompt || this.prompt;

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
            onStart: async(context) =>
                await inputAndRun(context, provider, initialContent),
            onInput: async(msg, context) =>
                provider.textToText({ messages: context.messages, signal: context.signal }),
            onReload: (newProviderId, context) => {
                if (context.isRefresh) {
                    return this.handle(field, newProviderId);
                }
                this.handle(field, newProviderId, {
                    text: context.initialContent,
                    prompt: context.prompt,
                });
            },
            onResponse: (response) => ns.text.stripSpacesAndPunctuation(response),
            onAccept: (result) =>
                ns.fields.setSelectedContent(field, result),
        });
    }

    async function inputAndRun(context, provider, initialContent) {
        // Ask for the source text if the original field was empty
        if (ns.text.isBlank(initialContent.text)) {
            initialContent.text = await ns.ui.inputDialog({
                title: 'Enter your content',
                parent: context.dom
            });
            if (!initialContent.text) {
                return context.close();
            }
            context.appendMessage(initialContent.text, 'local initial');
        }

        // Fill in the prompt placeholders if there are any
        const textBuilder = new ns.text.TextBuilder(initialContent.prompt);
        let placeholder;
        while ((placeholder = textBuilder.nextPlaceholder()) !== null) {
            const completionArgs = { title: placeholder.title, parent: context.dom };
            if (placeholder.options) {
                completionArgs.fields = [{ type: 'selectlist', options: placeholder.options }];
            }
            const completion = await ns.ui.inputDialog(completionArgs);
            if (!completion) {
                return context.close();
            }
            textBuilder.fillIn(placeholder, completion);
        }
        initialContent.prompt = textBuilder.build();
        context.prompt = initialContent.prompt;

        // Perform the inference
        const messages = [
            { type: 'local', text: initialContent.prompt },
            { type: 'local', text: initialContent.text },
        ];
        const result = await provider.textToText({ messages, signal: context.signal });
        return !context.aborted ? result : '';
    }

})(window.eai = window.eai || {});
