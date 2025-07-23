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
(function ($, ns) {
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
            { name: 'selectors', type: 'textfield', title: 'Field selection (if not specified, default will apply)', multi: true },
            { name: 'imageSize', type: 'textfield', title: 'Image size filter (if not specified, default will apply)', placeholder: 'E.g.: 100x100 - 600x600' },
            { name: 'imageDetail', type: 'select', title: 'Image detail', options: ['low', 'high'] },
            { name: 'save', type: 'checkbox', title: 'Save the caption to image metadata?', defaultValue: true },
            { name: 'prompt', type: 'text', title: 'Prompt', defaultValue: DEFAULT_PROMPT },
            { name: 'repeatPrompt', type: 'text', title: 'Repetition Prompt', defaultValue: DEFAULT_REPEAT_PROMPT }
        ],

        isMatch,
        handle,
    });

    function isMatch(field) {
        const fieldName = (field.getAttribute('name') || '').toLowerCase();
        if (fieldName.includes('alttext') || fieldName === './alt') {
            return true;
        }
        const fieldWrapper = field.closest('.coral-Form-fieldwrapper');
        const label = fieldWrapper && fieldWrapper.querySelector('label');
        const labelText = label ? label.innerText.toLowerCase() : '';
        return labelText.includes('alt text') || labelText.includes('alternative text');
    }

    async function handle(field, providerId) {
        // Arguments validation
        const sourceValue = findImageSource(this, field);
        if (!sourceValue) {
            return ns.ui.alert(this.title, 'Could not find an image to create caption for', 'error');
        }
        if (!ns.providers.getInstance(providerId)) {
            return ns.ui.alert(this.title, `Could not find a provider with ID ${providerId}`, 'error');
        }

        // Initialization
        let encodedImage;
        try {
            encodedImage = await ns.http.getText(sourceValue + '.base64?size=' + (this.imageSize || ''));
        } catch (error) {
            return ns.ui.alert(this.title, 'Cannot load the image. This may be due to an invalid path or an unsupported format', 'error');
        }

        const prompt = this.prompt || DEFAULT_PROMPT;
        const repeatPrompt = this.repeatPrompt || DEFAULT_REPEAT_PROMPT;

        // Chat dialog
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

            onStartup: async(context) => handleDialogContext(context.withData({
                image: encodedImage,
                imageAddress: this.save ? sourceValue : null,
                imageDetail: this.imageDetail,
                prompt
            })),

            onInput: async(msg, context) => context.provider.imageToText({
                image: context.data.image,
                imageDetail: context.data.imageDetail,
                messages: context.messages,
                signal: context.signal
            }),

            onResponse: (response) => ns.text.stripSpacesAndPunctuation(response),

            onAccept: (result, context) => storeMetadata(field, result, context.data.imageAddress),
        });
    }

    async function handleDialogContext(context) {
        if (context.data.imageAddress) {
            try {
                const metadata = await ns.http.getJson(context.data.imageAddress + '.metadata');
                if (metadata && metadata['eai.caption']) {
                    return {
                        type: 'text',
                        text: metadata['eai.caption'],
                        note: '* Loaded from image metadata',
                    };
                }
            } catch (error) {
                console.error('Failed to load image metadata: ' + error.message);
            }
        }
        return context.provider.imageToText({
            image: context.data.image,
            imageDetail: context.data.imageDetail,
            messages: [
                { type: 'user', text: context.data.prompt }
            ],
            signal: context.signal
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

    async function storeMetadata(field, value, imageAddress) {
        ns.fields.setValue(field, value);
        if (!imageAddress) {
            return;
        }
        $(field).closest('form').off('eai').one('submit.eai', async function submitCaption() {
            const caption = ns.fields.getValue(field);
            if (ns.text.isBlank(caption)) {
                return;
            }
            try {
                await ns.http.post(imageAddress + '.metadata', { data: { 'eai.caption': caption } });
            } catch (error) {
                ns.ui.alert('Image caption', 'Could not save the caption to image metadata: ' + error.message, 'error');
            }
        });
    }

})(Granite.$, window.eai = window.eai || {});
