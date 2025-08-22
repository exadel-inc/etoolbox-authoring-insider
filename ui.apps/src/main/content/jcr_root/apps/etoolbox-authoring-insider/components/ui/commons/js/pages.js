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

    const EMBARGOED_ELEMENTS = [
        'button',
        'canvas',
        'embed',
        'form',
        'iframe',
        'input',
        'link',
        'meta',
        'noscript',
        'object',
        'script',
        'style',
        'template',
        'svg'
    ];

    /**
     * Contains utility logic for working with HTML content
     */
    ns.pages = {
        /**
         * Extracts content from the provided AEM page removing non-content tags and empty elements
         * @param {string} url - Path to the page
         * @param {object=} [options] - Options for extraction
         * @returns {string}
         */
        extractContent
    };

    async function extractContent(url, options = {}) {
        try {
            const content = await getPageContent(url, options ? options.signal : null);
            const dom = parseDom(content);
            return convertDom(dom, options);
        } catch (e) {
            console.error('Failed to extract page content', e);
            return '';
        }
    }

    /* -----------------
       Content retrieval
       ----------------- */

    async function getPageContent(url, signal) {
        const urlObject = new URL(url);
        urlObject.pathname = urlObject.pathname.replace('/editor.html', '');
        if (urlObject.pathname.startsWith('/mnt/overlay') && urlObject.searchParams.has('item')) {
            urlObject.pathname = urlObject.searchParams.get('item') + '.html';
            urlObject.searchParams.delete('item');
        }
        urlObject.searchParams.set('wcmmode', 'disabled');

        return await ns.http.getText(urlObject.toString(), signal ? { signal } : {});
    }

    function parseDom(text) {
        if (!ns.utils.isString(text)) {
            return '';
        }
        const dom = new DOMParser().parseFromString(text, 'text/html');
        return dom.querySelector('main') || dom.querySelector('body') || dom.documentElement;
    }

    function convertDom(dom, options) {
        if (!dom) {
            return '';
        }
        removeComments(dom);
        removeElements(dom, options && options.excludeElements);
        removeInternalAnchors(dom);

        trimTextContent(dom);

        let result;
        if (options && options.format === 'md') {
            extractSpanContent(dom);
            replaceAnchorTags(dom);
            replaceImgTags(dom);
            replaceHeadings(dom);
            replaceParagraphs(dom);
            replaceLineBreaks(dom);
            replaceListTags(dom);
            result = toMarkdown(dom);
        } else {
            result = dom.innerHTML;
        }
        return result.replace(/\n+/g, options.escapeNewLine ? '\\n' : '\n');
    }

    /* -------------------------
       Common conversion methods
       ------------------------- */

    function removeComments(dom) {
        const walker = dom.ownerDocument.createTreeWalker(dom, 0x80, null);

        const commentsToRemove = [];
        let currentNode;
        while ((currentNode = walker.nextNode())) {
            commentsToRemove.push(currentNode);
        }

        commentsToRemove.forEach(commentNode => {
            if (commentNode.parentNode) {
                commentNode.parentNode.removeChild(commentNode);
            }
        });
    }

    function removeElements(dom, extraElements) {
        EMBARGOED_ELEMENTS.concat(...(extraElements || [])).forEach(selector => {
            try {
                const elements = dom.querySelectorAll(selector);
                elements.forEach(element => {
                    if (element.parentNode) {
                        element.parentNode.removeChild(element);
                    }
                });
            } catch (error) {
                console.error(`Error removing elements with selector "${selector}":`, error.message);
            }
        });
    }

    function removeInternalAnchors(dom) {
        const anchors = dom.querySelectorAll('a[href^="#"]');
        anchors.forEach(anchor => {
            if (anchor.parentNode) {
                anchor.parentNode.removeChild(anchor);
            }
        });
    }

    /* -----------------------------
       Markdown-specific consversion
       ----------------------------- */

    function extractSpanContent(dom) {
        let spans;
        while ((spans = dom.querySelectorAll('span:not(:has(span))')).length > 0) {
            spans.forEach(span => {
                if (!span.parentNode) {
                    return;
                }
                if (span.innerHTML !== span.textContent) {
                    // Contains HTML - replace span with its inner HTML
                    const fragment = dom.ownerDocument.createRange().createContextualFragment(span.innerHTML);
                    span.parentNode.insertBefore(fragment, span);
                } else if (span.textContent.trim().length > 0) {
                    // Simple text - add spaces before and after
                    const textContent = ` ${span.textContent.trim()} `;
                    const textNode = dom.ownerDocument.createTextNode(textContent);
                    span.parentNode.insertBefore(textNode, span);
                }
                span.parentNode.removeChild(span);
            });
        }
    }

    function replaceAnchorTags(dom) {
        const images = dom.querySelectorAll('a[href]');
        images.forEach(a => {
            const title = (a.getAttribute('title') || a.textContent).replace(/^\W+|\W+$/g, '');
            if (title.length > 0) {
                const textNode = dom.ownerDocument.createTextNode(`[${title}](${a.href})`);
                a.parentNode && a.parentNode.insertBefore(textNode, a);
            }
            a.parentNode && a.parentNode.removeChild(a);
        });
    }

    function replaceHeadings(dom) {
        for (let level = 1; level <= 6; level++) {
            const headings = dom.querySelectorAll(`h${level}`);
            headings.forEach(heading => {
                const content = heading.textContent.trim();
                const markdownHeading = '\n\n' + '#'.repeat(level) + ' ' + content + '\n';

                const textNode = dom.ownerDocument.createTextNode(markdownHeading);
                if (heading.parentNode) {
                    heading.parentNode.insertBefore(textNode, heading);
                    heading.parentNode.removeChild(heading);
                }
            });
        }
    }

    function replaceImgTags(dom) {
        const images = dom.querySelectorAll('img');
        images.forEach(img => {
            const altText = img.hasAttribute('alt') ? img.getAttribute('alt').replace(/^\W+|\W+$/g, '') : '';
            if (altText.length > 0) {
                const textNode = dom.ownerDocument.createTextNode(`\n![${altText}](${img.src})`);
                img.parentNode && img.parentNode.insertBefore(textNode, img);
            }
            img.parentNode && img.parentNode.removeChild(img);
        });
    }

    function replaceLineBreaks(dom) {
        const lineBreaks = dom.querySelectorAll('br');
        lineBreaks.forEach(br => {
            if (br.parentNode) {
                const textNode = dom.ownerDocument.createTextNode('\n');
                br.parentNode.insertBefore(textNode, br);
                br.parentNode.removeChild(br);
            }
        });
    }

    function replaceListTags(dom) {
        let listElements;
        while ((listElements = dom.querySelectorAll('ul:not(:has(ul,ol)),ol:not(:has(ul,ol))')).length > 0) {
            listElements.forEach(list => {
                const liElements = list.querySelectorAll('li');
                let markdownList = '';
                liElements.forEach((li, index) => {
                    const listItem = li.textContent.trim();
                    if (listItem) {
                        let prefix = list.tagName.toLowerCase() === 'ul' ? '- ' : `${index + 1}. `;
                        if (listItem.startsWith('#')) {
                            prefix = '';
                        }
                        markdownList += `${prefix}${listItem}\n`;
                    }
                });
                if (markdownList) {
                    const textNode = dom.ownerDocument.createTextNode('\n' + markdownList + '\n');
                    list.parentNode && list.parentNode.insertBefore(textNode, list);
                }
                list.parentNode && list.parentNode.removeChild(list);
            });
        }
    }

    function replaceParagraphs(dom) {
        const paragraphs = dom.querySelectorAll('p');
        paragraphs.forEach(p => {
            const textContent = p.textContent.trim();
            if (textContent.length > 0) {
                const textNode = dom.ownerDocument.createTextNode(textContent + '\n');
                p.parentNode && p.parentNode.insertBefore(textNode, p);
            }
            p.parentNode && p.parentNode.removeChild(p);
        });
    }

    function trimTextContent(dom) {
        const walker = dom.ownerDocument.createTreeWalker(dom, 0x4, null);
        let currentNode;
        while ((currentNode = walker.nextNode())) {
            currentNode.textContent = currentNode.textContent.trim().replace(/[\n\r]+/g, ' ');
        }
    }

    function toMarkdown(dom) {
        return dom.textContent
            .replace(/ +/g, ' ')
            .replace(/^\s+|\s$/g, '');
    }
})(document, window.eai = window.eai || {});
