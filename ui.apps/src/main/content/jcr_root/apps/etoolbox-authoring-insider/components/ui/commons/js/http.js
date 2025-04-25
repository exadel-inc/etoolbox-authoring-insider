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
(function (document, $, ns) {
    'use strict';

    const CONTENT_TYPE_JSON = 'application/json; charset=utf-8';

    /**
     * Contains utility methods for working with HTTP requests
     */
    ns.http = ns.http || {};

    /**
     * Performs an HTTP GET request and returns response as JSON
     * @param {string} url - The URL to request
     * @param {Object} options - The request options
     * @returns {Promise<undefined|*>}
     */
    ns.http.getJson = async function (url, options = {}) {
        return await ajax(url, options, CONTENT_TYPE_JSON);
    };

    /**
     * Performs an HTTP GET request and returns response as text
     * @param {string} url - The URL to request
     * @param {Object} options - The request options
     * @returns {Promise<undefined|*>}
     */
    ns.http.getText = async function (url, options = {}) {
        return await ajax(url, options);
    };

    /**
     * Performs an HTTP POST request and returns response as JSON
     * @param {string} url - The URL to request
     * @param {Object} options - The request options
     * @returns {Promise<undefined|*>}
     */
    ns.http.post = async function (url, options = {}) {
        options.method = 'POST';
        return await ajax(url, options);
    };

    async function ajax(url, options, format) {
        return new Promise((resolve, reject) => {
            const ajaxOptions = Object.assign({}, options);
            if (options.body && !options.data) {
                ajaxOptions.data = options.body;
                delete ajaxOptions.body;
            }
            if (ajaxOptions.data && !ns.utils.isString(ajaxOptions.data) && !isFormContent(ajaxOptions.data)) {
                ajaxOptions.data = JSON.stringify(ajaxOptions.data);
                ajaxOptions.contentType = CONTENT_TYPE_JSON;
            } else if (isFormContent(options.data)) {
                ajaxOptions.contentType = false;
                ajaxOptions.processData = false;
            }
            ajaxOptions.beforeSend = function (xhr) {
                if (options.signal) {
                    options.signal.addEventListener('abort', () => {
                        xhr.abort();
                        resolve(null);
                    });
                }
            };
            ajaxOptions.success = function (data) {
                if (ns.utils.isString(data) && !ns.text.isBlank(data) && format === CONTENT_TYPE_JSON) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('The output is not a valid JSON. Probably the service returned an error message.'));
                    }
                } else {
                    resolve(data);
                }
            };
            ajaxOptions.error = function (xhr, status, error) {
                if (status === 'abort') {
                    console.warn(`Request to ${url} was aborted`);
                    resolve(null);
                    return;
                }
                let message = `with status "${error.message || error || status}"`;
                if (xhr.responseText) {
                    message += ` and text "${truncate(ns.text.stripTags(xhr.responseText), 100)}"`;
                }
                reject(new Error(`Request to ${url} failed ${message}`));
            };
            $.ajax(url, ajaxOptions);
        });
    }

    function isFormContent(data) {
        return data instanceof FormData || data instanceof URLSearchParams;
    }

    function truncate(str, maxLength) {
        const result = (str || '').trim();
        return result.length > maxLength ? result.substring(0, maxLength).trim() + '...' : result;
    }

})(document, Granite.$, window.eai = window.eai || {});
