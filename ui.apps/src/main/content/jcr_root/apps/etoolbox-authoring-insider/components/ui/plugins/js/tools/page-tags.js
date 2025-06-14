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

    const ID = 'page.tags';
    const PROMPT = `/no_think Given the list of tags below, choose tags that best describe content of the web page 
    in the next message. If the next message is HTML-formatted, analyze the HTML markup to detect the most important 
    parts of the text to be tagged. The number of tags should not exceed {{count}}. You may choose fewer tags if you 
    cannot find enough relevant tags, but not less than 1. Answer with a comma-separated list of tags, without any 
    additional text.`;

    const DEFAULT_TAG_COUNT = 10;
    const DEFAULT_TAG_FOLDER = '/content/cq:tags';

    ns.tools.register({
        icon: 'pageTag',
        id: ID,
        title: 'Assign page tags',
        isTemplate: true,

        requires: [
            'page',
            'textToText',
        ],
        settings: [
            { name: 'selectors', type: 'textfield', title: 'Field selection (if not specified, will match all text fields)', multi: true },
            { name: 'source', type: 'textfield', title: 'Tag folder', required: true, defaultValue: DEFAULT_TAG_FOLDER },
            { name: 'count', type: 'textfield', title: 'Number of tags to select', required: true, defaultValue: DEFAULT_TAG_COUNT },
        ],

        isValid,
        handle,
    });

    function isValid() {
        return !!this.source && !isNaN(this.count) && this.count > 0;
    }

    function handle(field, providerId) {
        if (!field) {
            return ns.ui.alert(this.title, 'Target field is invalid', 'error');
        }

        const provider = ns.providers.getInstance(providerId);
        if (!provider) {
            return ns.ui.alert(this.title, `Could not find a provider for action ${providerId}`, 'error');
        }

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
            onStart: async(context) => await doTask(context.with({
                source: this.source,
                count: parseInt(this.count, 10)
            }), provider),
            onInput: async(msg, context) =>
                provider.textToText({ messages: context.messages, signal: context.signal }),
            onReload: (newProviderId, context) => {
                this.handle(field, newProviderId, {
                    prompt: context.prompt,
                });
            },
            onAccept: (result) => ns.fields.setSelectedContent(field, result),
        });
    }

    async function doTask(context, provider) {
        debugger;
        if (!context.tagList) {
            context.wait('Loading tags...');
            try {
                const tagsJson = await ns.http.getJson(context.source + '.1.json');
                if (ns.utils.isObject(tagsJson)) {
                    context.tagList = prepareTagList(context.source, tagsJson);
                } else {
                    context.tagList = [];
                }
            } catch (error) {
                return ns.ui.alert('Error', 'Failed to load tags from ' + context.source, 'error');
            }
        }
        if (!context.tagList.length) {
            return ns.ui.alert('Error', 'No tags found in ' + context.source, 'error');
        }

        let prompt = context.prompt;
        if (!prompt) {
            prompt = PROMPT.replace(/[\n\r\s]+/g, ' ').replace('{{count}}', context.count) +
            `\n<tags>\n${context.tagList.map((t) => t.title).join('\n')}\n</tags>`;
            context.prompt = prompt;
        }

        // Collect the page content
        context.wait('Collecting page info...');
        const pageContent = await ns.pages.extractContent(window.location.href);
        if (!pageContent) {
            return ns.ui.alert('Error', 'Failed to extract page content', 'error');
        }

        // Feed page content to the provider
        context.wait('Processing content...');
        let response = await provider.textToText({
            messages: [
                { type: 'user', text: prompt },
                { type: 'user', text: pageContent },
            ],
            signal: context.signal
        });
        if (context.aborted) {
            return null;
        }
        response = ns.text.stripSpacesAndPunctuation((response || '').replace(/<think>.+?<\/think>/gs, ''));
        const tagSet = response
            .split(',')
            .map((tag) => tag.trim())
            .map((tag) => findMatchingTagId(context.tagList, tag))
            .filter(Boolean)
            .reduce((acc, tag) => acc.add(tag), new Set());
        return { type: 'html', html: Array.from(tagSet).sort().join('<br>') };
    }

    function prepareTagList(sourcePath, sourceObject) {
        const indexOfCqTags = sourcePath.indexOf('/cq:tags/');
        let tagRelativePath = indexOfCqTags >= 0 ?
            sourcePath.substring(indexOfCqTags + 9) :
            sourcePath.replace(/^\//, '');
        const tagPrefix = tagRelativePath.includes('/') ?
            tagRelativePath.substring(0, tagRelativePath.indexOf('/')) :
            tagRelativePath;
        tagRelativePath = tagRelativePath.substring(tagPrefix.length).replace(/^\//, '');
        return Object.keys(sourceObject)
            .filter((k) => !/^\w+:/.test(k))
            .filter((k) => ns.utils.isObject(sourceObject[k]))
            .map((k) => {
                return {
                    id: `${tagPrefix}:${tagRelativePath}${tagRelativePath.length > 0 ? '/' : ''}${k}`,
                    title: sourceObject[k]['jcr:title'] || k,
                }
            });
    }

    function findMatchingTagId(tagList, tag) {
        if (!tag || !tag.length) {
            return null;
        }
        const match = tagList.find((t) => t.title.toLowerCase() === tag.toLowerCase());
        return match ? match.id : null;
    }

})(window, document, window.eai = window.eai || {});
