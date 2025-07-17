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

    const ID = 'text.proofread';
    const PROMPT = `Proofread the text in the next message. If there are no mistakes, output the same text. 
        If you do any corrections, enclose the wrong text in the pair of tags <del></del>, 
        and next to it place the correction enclosed in tags <ins></ins>. If the message contains HTML tags, leave 
        them exactly as they are. Do not add any extra HTML markup, introductory words, or comments.`;

    ns.tools.register({
        icon: 'spellcheck',
        id: ID,
        title: 'Proofread',

        requires: [
            ID,
            'textToText'
        ],
        settings: [
            { name: 'selectors', type: 'textfield', title: 'Field selection (if not specified, will match all text fields)', multi: true },
        ],

        handle,
    });

    function handle(field, providerId) {
        // Argumenys validation
        if (!field) {
            return ns.ui.alert(this.title, 'Target field is invalid', 'error');
        }
        if (!ns.providers.getInstance(providerId)) {
            return ns.ui.alert(this.title, `Could not find a provider with ID ${providerId}`, 'error');
        }
        if (ns.text.isBlank(ns.fields.getSelectedContent(field, true))) {
            return ns.ui.alert(this.title, 'No text to proofread', 'error');
        }

        // Chat dialog
        ns.ui.chatDialog({
            id: ID + '.dialog',
            title: this.title,
            icon: this.icon,
            source: field,
            providers: this.providers,
            providerId,

            onStartup: async(context) => await handleDialogContext(context),

            onResponse: (response) => ns.text.stripSpacesAndPunctuation(response),

            onAccept: (result) => {
                if (result.includes('<del>')) {
                    result = result.replace(/<del>[^<]*<\/del>/g, '');
                }
                result = result.replace(/<\/?ins>/g, '');
                ns.fields.setSelectedContent(field, result, true);
            },
        });
    }

    async function handleDialogContext(context) {
        const messages = [
            { type: 'user', text: PROMPT },
            { type: 'user', text: ns.fields.getSelectedContent(context.source, true) },
        ];

        const result = await context.provider.textToText({ messages, signal: context.signal });
        if (context.aborted || !result) {
            return '';
        }
        if (result.includes('<del>') || result.includes('<ins>')) {
            return { type: 'html', html: result };
        }
        return {
            type: 'info',
            value: 'No changes required'
        };
    }

})(window.eai = window.eai || {});
