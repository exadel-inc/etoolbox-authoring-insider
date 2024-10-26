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

    const JSON = 'application/json';

    ns.http = ns.http || {};

    ns.http.getJson = async function (url, options = {}) {
        if (!options.headers) {
            options.headers = {};
        }
        options.headers['Content-Type'] = JSON;
        options.expects = JSON;

        return await ajax(url, options);
    };

    ns.http.getText = async function (url, options = {}) {
        return await ajax(url, options);
    };

    ns.http.postJson = async function (url, options = {}) {
        options.method = 'POST';
        if (!options.headers) {
            options.headers = {};
        }
        options.headers['Content-Type'] = JSON;
        return await ajax(url, options);
    };

    ns.http.post = async function (url, options = {}) {
        options.method = 'POST';
        return await ajax(url, options);
    };

    async function ajax(url, options) {
        const expects = options.expects;
        delete options.expects;
        let response;
        try {
            response = await fetch(url, options);
        } catch (e) {
            if (e.name === 'AbortError') {
                return;
            }
            throw new Error(`Request to ${url} failed: ${e.message}`);
        }
        if (!response.ok) {
            let text = extractFromHtml(await response.text());
            if (text) {
                text = ` and text "${truncate(text, 100)}"`;
            }
            throw new Error(`Request to ${url} failed with status "${response.statusText || response.status}"${text}`);
        }
        if (expects === JSON) {
            try {
                return await response.json();
            } catch (e) {
                throw new Error('The output is not a valid JSON. Probably the service returned an error message.');
            }
        } else {
            try {
                return await response.text();
            } catch (e) {
                throw new Error('Could not extract response text');
            }
        }
    }

    function extractFromHtml(value) {
        if (!value || !/<\/[\w-]+>/.test(value)) {
            return (value || '').trim();
        }
        const html = document.createElement('div');
        html.innerHTML = value;
        return html.textContent;
    }

    function truncate(str, maxLength) {
        const result = (str || '').trim();
        return result.length > maxLength ? result.substring(0, maxLength).trim() + '...' : result;
    }

})(document, window.eai = window.eai || {});
