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
            intro: {
                text: ns.fields.getSelectedContent(field),
            },
            providers: this.providers,
            providerId,

            responses: [
                {
                    icon: 'plus-one',
                    title: 'Another variant',
                    message: this.repeatPrompt || 'Provide another variant of how you ' + this.prompt,
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

            onStartup: async(context) => await handleDialogContext(context.withData({ promptTemplate: this.prompt })),

            onInput: async(msg, context) => context.provider.textToText({
                messages: context.messages,
                signal: context.signal
            }),

            onResponse: (response) => ns.text.stripSpacesAndPunctuation(response),

            onAccept: (result) => ns.fields.setSelectedContent(field, result),
        });
    }

    async function handleDialogContext(context) {
        // Ask for the source text if the original field was empty
        if (ns.text.isBlank(context.initial)) {
            const text = await ns.ui.inputDialog({
                title: 'Enter your content',
                parent: context.dom
            });
            if (ns.text.isBlank(text)) {
                return context.close();
            }
            context.addInitial(text.trim(), false);
        }

        // Fill in the prompt placeholders if there are any
        if (ns.text.isBlank(context.prompt)) {
            const textBuilder = new ns.text.TextBuilder(context.data.promptTemplate);
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
            context.addPrompt(textBuilder.toString());
        }

        // Perform the inference
        const result = await context.provider.textToText({ messages: context.messages, signal: context.signal });
        return !context.aborted ? result : '';
    }

})(window.eai = window.eai || {});
