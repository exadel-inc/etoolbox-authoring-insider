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
(function (window, document, ns) {
    'use strict';

    const ID = 'page.command';

    ns.tools.register({
        icon: 'page',
        id: ID,
        title: 'Process page with a command',
        isTemplate: true,

        requires: [
            'page',
            'textToText',
        ],
        settings: [
            { name: 'selectors', type: 'textfield', title: 'Field selection (if not specified, will match all text fields)', multi: true },
            { name: 'prompt', type: 'text', title: 'Prompt (supports user input templates)', required: true },
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
            return ns.ui.alert(this.title, `Could not find a provider with ID ${providerId}`, 'error');
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

            onStart: async(context) =>
                await handleDialogContext(context.withData({ promptTemplate: this.prompt })),

            onInput: async(msg, context) =>
                context.provider.textToText({ messages: context.messages, signal: context.signal }),

            onResponse: (response) => ns.text.stripSpacesAndPunctuation(response),

            onAccept: (result) => ns.fields.setSelectedContent(field, result),
        });
    }

    async function handleDialogContext(context) {
        // Prepare messages
        if (ns.text.isBlank(context.prompt)) {

            // Fill in the prompt placeholders if there are any
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

            // Collect the page content
            context.wait('Collecting page info...');
            const pageContent = await ns.pages.extractContent(
                window.location.href,
                { format: 'md', signal: context.signal, escapeNewLine: true }
            );
            if (!pageContent) {
                return ns.ui.alert('Error', 'Failed to extract page content', 'error');
            }
            context.addPrompt(pageContent);
        }

        // Feed messages to the provider
        context.wait('Processing content...');
        const result = await context.provider.textToText({ messages: context.messages, signal: context.signal });
        return !context.aborted ? result : '';
    }
})(window, document, window.eai = window.eai || {});
