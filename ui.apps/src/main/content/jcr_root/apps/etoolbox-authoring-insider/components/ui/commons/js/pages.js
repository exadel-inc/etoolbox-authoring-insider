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
(function (document, ns) {
    'use strict';

    const NON_CONTENT_TAGS = ['script', 'style', 'link', 'iframe', 'object', 'embed'];
    const NON_EMPTY_TAGS = ['div', 'span', 'section', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

    /**
     * Contains utility logic for working with HTML content
     */
    ns.pages = {
        /**
         * Extracts HTML content from the provided AEM page removing non-content tags and empty elements
         * @param {string} address - Path to the page
         * @returns {string}
         */
        extractContent
    };

    async function extractContent(url) {
        try {
            const content = await getPageContent(url);
            return parsePageDom(content);
        } catch (e) {
            console.error('Failed to extract page content', e);
            return '';
        }
    }

    async function getPageContent(url) {
        const urlObject = new URL(url);
        urlObject.pathname = urlObject.pathname.replace('/editor.html', '');
        if (urlObject.pathname.startsWith('/mnt/overlay') && urlObject.searchParams.has('item')) {
            urlObject.pathname = urlObject.searchParams.get('item') + '.html';
            urlObject.searchParams.delete('item');
        }
        urlObject.searchParams.set('wcmmode', 'disabled');

        return await ns.http.getText(urlObject.toString());
    }

    function parsePageDom(value) {
        if (!ns.utils.isString(value)) {
            return '';
        }
        try {
            const dom = new DOMParser().parseFromString(value, 'text/html');
            return cleanUpDom(dom.querySelector('main') || dom.querySelector('body') || dom.documentElement);
        } catch (e) {
            console.warn('Failed to parse content', e);
            return '';
        }
    }

    function cleanUpDom(value) {
        if (!value) {
            return '';
        }
        NON_CONTENT_TAGS.forEach(tag => {
            value.querySelectorAll(tag).forEach(element => element.remove());
        });
        cleanUpNodes(value);
        Array.from(value.querySelectorAll(':empty'))
            .filter(element => NON_EMPTY_TAGS.includes(element.tagName.toLowerCase()))
            .forEach((element) => element.remove());
        return value.innerHTML.trim();
    }

    function cleanUpNodes(value) {
        const removableAttributes = value.getAttributeNames()
            .filter((name) => name !== 'role' && !name.startsWith('aria-'));
        removableAttributes.forEach((name) => value.removeAttribute(name));
        for (const childNode of value.childNodes) {
            if (childNode.nodeType === Node.ELEMENT_NODE) {
                cleanUpNodes(childNode);
            } else if (childNode.nodeType === Node.TEXT_NODE) {
                childNode.nodeValue = childNode.nodeValue.trim();
            }
        }
    }
})(document, window.eai = window.eai || {});
