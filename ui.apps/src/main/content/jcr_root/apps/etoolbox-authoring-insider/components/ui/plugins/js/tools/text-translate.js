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

    const PROMPT = `
        Translate the next message into {{lang}}. If the message contains any HTML tags, keep them exactly as they are. 
        Respond with only the translation. Do not add any extra HTML markup, introductory words, or comments. 
        Give exactly one variant of translation.`;

    const REPETITION_PROMPT = `
        Provide another variant of how you translate the given message. If the message contains any HTML tags, keep them 
        exactly as they are. Respond with only the translation. Give exactly one variant.`;

    const VALIDATION_PROMPT = `
        The next two messages contain a text in English and then its translation into {{lang}}. Please verify that
        the translation is accurate, complete, easy to read, and grammatically correct. If the translation is correct, 
        respond with just the translation. If not, make any changes needed and respond with the corrected text. 
        Do not add any introductory words or comments.`;

    const PROOFREADING_PROMPT = `
        Please proofread the following text in {{lang}}. Make sure that it is free of errors and uses
        modern real-world language. If you find any issues, correct them and respond with the corrected text. 
        If the text is already perfect, respond with the same text. Keep as close to the original text as possible 
        and do not make any arbitrary changes. Do not add any introductory words or comments.`;

    const PAGEANT_PROMPT = `
        The next three messages contain a text in English and then three variants of translation into {{lang}}. 
        Please select of the three translations the one that is the most accurate, has the most correct spelling and 
        grammar, and is easy to read. Respond with just the number of the selected translation: 1, 2, or 3.`;

    const DEFAULT_LANGUAGES = ['French', 'German'];

    ns.tools.register({
        icon: 'textSize',
        id: ID,
        title: 'Translate',

        requires: [
            ID,
            'textToText',
            'translate'
        ],
        settings: [
            { name: 'selectors', type: 'textfield', title: 'Field selection (if not specified, will match all text fields)', multi: true },
            { name: 'languages', type: 'textfield', title: 'Languages', multi: true },
            {
                name: 'validation',
                type: 'select',
                title: 'Validation',
                options: [
                    'None:none',
                    'Second opinion:extra',
                    'Second opinion plus proofreading:extra-proofread',
                    'Pageant:pageant',
                ]
            },
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
            initialContent = { html: ns.fields.getSelectedContent(field, true) };
        }

        const responses = [{
            icon: 'scribble',
            title: 'Send your own message',
            action: 'message',
            style: 'icon'
        }];
        if (!this.verify) {
            responses.unshift({
                icon: 'plus-one',
                title: 'Another variant',
                message: preparePrompt(REPETITION_PROMPT),
                style: 'icon'
            });
        }

        ns.ui.chatDialog({
            id: ID + '.dialog',
            title: this.title,
            icon: this.icon,
            source: field,
            intro: initialContent,
            providers: this.providers,
            providerId,
            responses,
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
            onResponse: (response) => ns.text.stripSpacesAndPunctuation(response),
            onAccept: (result) => ns.fields.setSelectedContent(field, result, true),
        });
    }

    async function inputAndRun(self, context, provider, initialContent) {
        // Prompt for user input if the original field is empty
        let text = initialContent.text || initialContent.html;
        if (ns.text.isBlank(text)) {
            text = await ns.ui.inputDialog({
                title: 'Enter your content',
                parent: context.dom
            });
            if (!text) {
                return context.close();
            }
            context.appendMessage(text, 'local initial');
        }

        // Ask user to select a language if it was not provided
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
            prompt = preparePrompt(PROMPT, language);
            context.setPrompt(prompt);
        }

        // Translate the text
        context.wait(self.validation !== 'none' ? 'Translating...' : '');
        const translation = await provider.textToText({
            messages: [
                { type: 'user', text: prompt },
                { type: 'user', text }
            ],
            signal: context.signal
        });

        if (context.aborted || !translation) {
            return null;
        }

        // Perform validation step(s) if needed
        if (self.validation && self.validation.includes('extra')) {
            const language = prompt.match(/into ([^.]+)/i)[1];
            return await performValidation(
                context,
                provider,
                { text, translation, language, doProofread: self.validation.includes('proofread') });

        } else if (self.validation && self.validation === 'pageant') {
            const language = prompt.match(/into ([^.]+)/i)[1];
            return await performPageant(
                context,
                provider,
                { text, translation, prompt, language });

        } else {
            return /<\w+|<\/\w+>/g.test(translation) ?
                { type: 'html', html: translation, } :
                translation;
        }
    }

    async function performValidation(context, provider, params) {
        context.wait('Validating translation...');
        let result = await provider.textToText({
            messages: [
                { type: 'user', text: preparePrompt(VALIDATION_PROMPT, params.language) },
                { type: 'user', text: params.text },
                { type: 'user', text: params.translation }
            ],
            signal: context.signal
        });
        if (context.aborted || !result) {
            return null;
        }

        if (params.doProofread) {
            context.wait('Proofreading...');
            result = await provider.textToText({
                messages: [
                    { type: 'user', text: preparePrompt(PROOFREADING_PROMPT, params.language) },
                    { type: 'user', text: result }
                ],
                signal: context.signal
            });
        }
        if (context.aborted || !result) {
            return null;
        }
        return /<\w+|<\/\w+>/g.test(result) ?
            { type: 'html', html: result, } :
            result;
    }

    async function performPageant(context, provider, params) {
        const allTranslations = [params.translation];
        for (let i = 0; i < 2; i++) {
            context.wait(`Translating (step ${i + 2})...`);
            const anotherTranslation = await provider.textToText({
                messages: [
                    { type: 'user', text: params.prompt },
                    { type: 'user', text: params.text }
                ],
                signal: context.signal
            }) || 'no translation';
            if (context.aborted) {
                return null;
            }
            allTranslations.push(anotherTranslation);
        }

        const result = await provider.textToText({
            messages: [
                { type: 'user', text: preparePrompt(PAGEANT_PROMPT, params.language) },
                { type: 'user', text: params.text },
                { type: 'user', text: allTranslations[0] },
                { type: 'user', text: allTranslations[1] },
                { type: 'user', text: allTranslations[2] }
            ],
            signal: context.signal
        });

        if (context.aborted || !result) {
            return null;
        }
        let index = Number.parseInt(result, 10);
        if (isNaN(index) || index < 1 || index > 3) {
            index = 1;
        }
        const selectedTranslation = allTranslations[index - 1];

        return /<\w+|<\/\w+>/g.test(selectedTranslation) ?
            { type: 'html', html: selectedTranslation } :
            selectedTranslation;
    }

    function preparePrompt(text, language) {
        return text.replace(/\s+/g, ' ').trim().replace('{{lang}}', language || '');
    }

})(window.eai = window.eai || {});
