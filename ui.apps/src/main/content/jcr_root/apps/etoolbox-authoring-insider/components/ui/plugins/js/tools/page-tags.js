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

    const ID = 'page.tags';

    const PROMPT = `You will receive two inputs:\\n
    1. A block of text in Markdown;\\n
    2. A list of keywords, semicolon-separated.\\n
    Your task is to read the text, consider the keywords one by one, and decide which keywords correspond to the text.\\n
    Select not more than 10 keywords.\\n
    Output **only** the keywords you have selected, sorted by relevance starting with the most relevant one, 
    semicolon-separated. No additional text, explanation, or formatting is allowed.`;

    const DEFAULT_TAG_COUNT = 10;
    const DEFAULT_TAG_FOLDER = '/content/cq:tags';

    ns.tools.register({
        icon: 'pageTag',
        id: ID,
        title: 'Assign page tags',

        requires: [
            'page',
            'textToText',
        ],
        settings: [
            { name: 'selectors', type: 'textfield', title: 'Field selection (if not specified, will match all text fields)', multi: true },
            { name: 'tagFolder', type: 'textfield', title: 'Tag folder', required: true, defaultValue: DEFAULT_TAG_FOLDER },
            { name: 'count', type: 'textfield', title: 'Number of tags to select', required: true, defaultValue: DEFAULT_TAG_COUNT },
            { name: 'excludedElements', type: 'textfield', title: 'Page elements to ignore', multi: true },
        ],

        isMatch,
        isValid,
        handle,
    });

    function isMatch(field) {
        return ns.fields.getName(field).includes('cq:tags');
    }

    function isValid() {
        return !!this.tagFolder && !isNaN(this.count) && this.count > 0;
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

            onStartup: async(context) => await handleDialogContext(context.withData({
                tagFolder: this.tagFolder,
                count: parseInt(this.count, 10),
                excludedElements: this.excludedElements
            })),

            onAccept: (result, context) => {
                const tagIds = result.split('<br>')
                    .map((tag) => findMatchingTagId(context.data.tagList, tag))
                    .filter(Boolean);
                ns.fields.setSelectedContent(field, tagIds);
            },
        });
    }

    async function handleDialogContext(context) {
        let tagList = context.data.tagList;
        if (!tagList) {
            context.wait('Loading tags...');
            try {
                const tagData = await loadTagData(context);
                tagList = (context.data.tagList = await prepareTagList(context.data.tagFolder, tagData));
            } catch (error) {
                context.addError('Failed to load tags from ' + context.data.tagFolder);
            }
        }
        if (!tagList.length) {
            return context.addError('No tags found in ' + context.data.tagFolder);
        }

        // Collect the page content
        context.wait('Collecting page info...');
        const pageContent = await ns.pages.extractContent(
            window.location.href,
            { format: 'md', exclude: context.data.excludedElements, signal: context.signal, escapeNewLine: true });
        if (context.aborted) {
            return null;
        }
        if (!pageContent) {
            return context.addMessage('Not enough content in the page', 'info');
        }

        // Feed page content to the provider
        context.wait('Processing content...');
        const prompt = ns.text.singleLine(PROMPT).replace('{{count}}', context.data.count.toString());

        const response = await context.provider.textToText({
            messages: [
                { type: 'system', text: prompt },
                { type: 'user', text: pageContent },
                { type: 'user', text: '### Keywords:\n' + tagList.map((t) => t.title).join(';') }
            ],
            signal: context.signal
        });
        if (context.aborted) {
            return null;
        }

        const tags = ns.text.stripSpacesAndPunctuation(response)
            .split(/[;,]/)
            .map((tag) => tag.trim())
            .filter(Boolean)
            .reduce((set, tagId) => set.add(tagId), new Set());

        if (tags.size === 0) {
            return context.addError('No tags picked for the page');
        }

        return { type: 'html', html: Array.from(tags).slice(0, context.data.count).sort().join('<br>') };
    }

    async function loadTagData(context) {
        let tagData = await ns.http.getJson(context.data.tagFolder + '.-1.json', {
            validStatuses: [300],
            signal: context.signal,
        });
        // The above request may return an array of available depths. In this case, pick the largest depth
        if (Array.isArray(tagData) && tagData.every((item) => ns.utils.isString(item) && item.endsWith('.json'))) {
            tagData = tagData.sort((a, b) => {
                const aName = a.replace(/\.json$/, '');
                const aIndex = /\.\d+$/.test(aName) ? parseInt(aName.split('.').pop(), 10) : 0;
                const bName = b.replace(/\.json$/, '');
                const bIndex = /\.\d+$/.test(bName) ? parseInt(bName.split('.').pop(), 10) : 0;
                return aIndex - bIndex;
            });
            return await ns.http.getJson(tagData.pop());
        }
        return tagData;
    }

    function prepareTagList(sourcePath, sourceObject) {
        if (!ns.utils.isObject(sourceObject)) {
            return [];
        }

        const tags = [];
        extractTagsRecursively(sourceObject, sourcePath, tags);
        tags.forEach((tag) => {
            const pathChunks = tag.id.split('/').filter(Boolean);
            const indexOfCqTags = pathChunks.indexOf('cq:tags');
            let relativePathChunks = indexOfCqTags >= 0 ?
                pathChunks.slice(indexOfCqTags + 1) :
                pathChunks;
            let tagPrefix = '';
            if (relativePathChunks.length > 0) {
                tagPrefix = relativePathChunks[0] + ':';
                relativePathChunks = relativePathChunks.slice(1);
            }
            tag.id = tagPrefix + relativePathChunks.join('/');
            if (tag.id.length && !tag.id.includes(':')) {
                tag.id += ':';
            }
        });
        return tags.filter((tag) => tag.id.length && tag.title.length);
    }

    function extractTagsRecursively(obj, currentPath, collection) {
        Object.keys(obj).forEach((key) => {
            const value = obj[key];
            if (!ns.utils.isObject(value) || value['jcr:primaryType'] !== 'cq:Tag' || !value['jcr:title']) {
                return;
            }
            const nestedPath = currentPath ? `${currentPath}/${key}` : key;
            collection.push({
                id: nestedPath,
                title: value['jcr:title']
            });
            extractTagsRecursively(value, nestedPath, collection);
        });
    }

    function findMatchingTagId(tagList, tag) {
        if (!tag || !tag.length) {
            return null;
        }
        const match = tagList.find((t) => t.title.toLowerCase() === tag.toLowerCase());
        return match ? match.id : null;
    }
})(window.eai = window.eai || {});
