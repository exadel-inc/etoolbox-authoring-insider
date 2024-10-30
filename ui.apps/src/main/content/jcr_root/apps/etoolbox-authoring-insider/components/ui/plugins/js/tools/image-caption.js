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

    const ID = 'image.caption';

    const DEFAULT_PROMPT = 'Provide the phrase that can be used as the title and/or alt text for the given image';
    const DEFAULT_REPEAT_PROMPT = DEFAULT_PROMPT.replace('Provide', 'Provide another variant of');

    ns.tools.register({
        icon: 'imageText',
        id: ID,
        title: 'Image caption (alt text)',

        requires: [
            ID,
            'imageToText'
        ],
        settings: [
            { name: 'selectors', type: 'text', title: 'Field selection (if not specified, default will apply)', multi: true },
            { name: 'prompt', type: 'text', title: 'Prompt', defaultValue: DEFAULT_PROMPT },
            { name: 'repeatPrompt', type: 'text', title: 'Repetition Prompt', defaultValue: DEFAULT_REPEAT_PROMPT }
        ],

        isMatch,
        handle,
    });

    function isMatch(field) {
        if (this.selectors && this.selectors.length) {
            return this.selectors.some(selector => field.matches(selector));
        }
        if ((field.getAttribute('name') || '').toLowerCase().includes('alttext')) {
            return true;
        }
        const fieldWrapper = field.closest('.coral-Form-fieldwrapper');
        const label = fieldWrapper && fieldWrapper.querySelector('label');
        const labelText = label ? label.innerText.toLowerCase() : '';
        return labelText.includes('alt text');
    }

    async function handle(field, providerId) {
        const sourceValue = findImageSource(this, field);
        if (!sourceValue) {
            return ns.ui.alert(this.title, 'Could not find an image to create caption for', 'error');
        }

        const provider = ns.providers.getInstance(providerId);
        if (!provider) {
            return ns.ui.alert(this.title, `Could not find a provider for action ${providerId}`, 'error');
        }

        let encodedImage;
        try {
            encodedImage = await ns.http.getText(sourceValue + '.base64');
        } catch (error) {
            return ns.ui.alert(this.title, 'Cannot load the image. This may be due to an invalid path or an unsupported format', 'error');
        }

        const prompt = this.prompt || DEFAULT_PROMPT;
        const repeatPrompt = this.repeatPrompt || DEFAULT_REPEAT_PROMPT;

        ns.ui.chatDialog({
            id: 'image.caption.dialog',
            title: this.title,
            icon: this.icon,
            source: field,
            intro: {
                image: sourceValue,
                prompt
            },
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
            onStart: async(context) => provider.imageToText({
                image: encodedImage,
                messages: [
                    { type: 'user', text: prompt }
                ],
                signal: context.signal
            }),
            onInput: async(msg, context) => provider.imageToText({
                image: encodedImage,
                messages: context.getHistory().messages,
                signal: context.signal
            }),
            onReload: (newProviderId) => this.handle(field, newProviderId || providerId),
            onResponse: (response) => (response || '').replace(/^[\s"'*]+|[\s"'.*]+$/g, ''),
            onAccept: (result) => storeMetadata(field, result, sourceValue),
        });
    }

    function findImageSource(tool, field, dir) {
        if (!field) {
            return ns.ui.alert(tool.title, 'Target field is invalid', 'error');
        }
        if (!dir) {
            const closestFieldWrapper = field.closest('.coral-Form-fieldwrapper');
            return findImageSource(tool, closestFieldWrapper, 'backward') || findImageSource(tool, closestFieldWrapper, 'forward');
        }
        let other = dir === 'backward' ? field.previousSibling : field.nextSibling;
        while (other) {
            const damLinkHolder = other.querySelector && other.querySelector('input[value^="/content/dam"]');
            if (damLinkHolder) {
                return damLinkHolder.value;
            }
            other = dir === 'backward' ? other.previousSibling : other.nextSibling;
        }
        if (!field.parentElement) {
            return null;
        }
        return findImageSource(tool, field.parentElement, dir);
    }

    async function storeMetadata(field, value) {
        ns.fields.setValue(field, value);
    }

})(window.eai = window.eai || {});
