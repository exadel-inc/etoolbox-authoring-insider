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

    let index = 0;
    const IMAGE_DESCRIPTIONS = [
        'A colorful image',
        'A picture with many details',
        'A beautiful photo of an object or a person'
    ];

    ns.providers.register({
        icon: ns.icons.getHtml('(1)'),
        id: 'repeater.1',
        title: 'Repeater #1',
        supports,
        imageToText,
        textToText
    });

    ns.providers.register({
        icon: ns.icons.getHtml('(2)#ff1111'),
        id: 'repeater.2',
        title: 'Repeater #2',
        supports,
        imageToText,
        textToText
    });

    function supports(requirement) {
        return !requirement.startsWith('page.');
    }

    function imageToText() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(IMAGE_DESCRIPTIONS[index++ % IMAGE_DESCRIPTIONS.length]);
            }, 1000);
        });
    }

    function textToText(options) {
        return new Promise((resolve) => {
            function abort() {
                console.log('Request aborted');
                resolve(null);
            }
            if (options.signal) {
                options.signal.addEventListener('abort', abort);
            }
            setTimeout(() => {
                options.signal.removeEventListener('abort', abort);
                const userMessage = options.messages.findLast(msg => msg.type === 'local' || msg.type === 'user' || msg.type === 'initial');
                resolve(userMessage ?
                    userMessage.text.toUpperCase().replace(/HTTPS?:\/\//g, 'https://') :
                    this.title);
            }, 500);
        });
    }

})(Granite.$, window.eai = window.eai || {});
