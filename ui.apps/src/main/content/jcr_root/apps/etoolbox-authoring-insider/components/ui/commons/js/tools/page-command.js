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
            ID,
            'textToText',
        ],
        settings: [
            { name: 'selectors', type: 'textfield', title: 'Field selection (if not specified, will match all text fields)', multi: true },
            { name: 'prompt', type: 'text', title: 'Prompt', required: true },
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

        if (!this.prompt) {
            return ns.ui.alert(this.title, 'Prompt is not set', 'error');
        }

        if (!ns.utils.isObject(initialContent)) {
            initialContent = {};
        }
        initialContent.prompt = initialContent.prompt || this.prompt;

        ns.ui.chatDialog({
            id: ID + '.dialog',
            title: this.title,
            icon: this.icon,
            source: field,
            providers: this.providers,
            providerId: providerId,
            responses: [
                {
                    icon: 'scribble',
                    title: 'Send your own message',
                    action: 'message',
                    style: 'icon'
                }
            ],
            onStart: async (context) => await doTask(context, provider, initialContent),
            onReload: (newProviderId, context) =>  {
                if (context.isRefresh) {
                    return this.handle(field, newProviderId);
                }
                const history = context.getHistory();
                this.handle(field, newProviderId, {
                    prompt: history.prompt,
                });
            },
            onResponse: (response) => (response || '').replace(/^[\s"']+|[\s"'.]+$/g, ''),
            onAccept: (result) => ns.fields.setSelectedContent(field, result),
        });
    }

    async function doTask(context, provider, initialContent) {
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
        context.setPrompt(initialContent.prompt);

        // Collect the page content
        context.wait('Collecting page info...');

        const url = new URL(window.location.href);
        url.pathname = url.pathname.replace('/editor.html', '');
        if (url.pathname.startsWith('/mnt/overlay') && url.searchParams.has('item')) {
            url.pathname = url.searchParams.get('item') + '.html';
            url.searchParams.delete('item');
        }
        url.searchParams.set('wcmmode', 'disabled');

        const html = await ns.http.getText(url.toString());

        const dom = new DOMParser().parseFromString(html, 'text/html');
        const main = dom.querySelector('main') || dom.querySelector('body');

        // Feed page content to the provider
        context.wait('Processing content...');

        const result = await provider.textToText({
            messages: [
                { type: 'user', text: initialContent.prompt },
                { type: 'user', text: main.innerText }
            ],
            signal: context.signal
        });
        return !context.aborted ? result : '';
    }

})(window, document, window.eai = window.eai || {});