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
'use strict';

// noinspection JSFileReferences
require('#commons/text.js');
// noinspection JSFileReferences
require('#commons/utils.js');
// noinspection JSFileReferences
require('#commons/http.js');

const ns = window.eai;

beforeAll(() => {
    Granite.$.ajax = function(url, options) {
        const { beforeSend, success, error } = options;
        if (url.includes('error')) {
            return error({ }, 'error', new Error('Network error'));
        }
        if (url.includes('not-found')) {
            return error({ responseText: '404 Not found' }, 'error', new Error('Not Found'));
        }
        if (url.includes('invalid-json')) {
            return success('Not a JSON', 'success', { responseText: 'Not a JSON' });
        }
        if (url.includes('abort')) {
            const xhr = { abort: options.abortFunction };
            beforeSend(xhr);
            return xhr;
        }
        if (url.includes('json')) {
            return success({ key: 'value' }, 'success', { responseText: '{"key":"value"}' });
        }
        return success('Lorem ipsum dolor sit amet', 'success', { responseText: 'Lorem ipsum dolor sit amet' });
    }
});

test('Should retrieve JSON response', async () => {
    let result = await ns.http.getJson('/test-json');
    expect(result).toEqual({ key: 'value' });

    await expect(ns.http.getJson('/invalid-json')).rejects.toThrow('The output is not a valid JSON. Probably the service returned an error message.');
});

test('Should retrieve text response', async () => {
    const result = await ns.http.getText('/test-text');
    expect(result).toBe('Lorem ipsum dolor sit amet');
});

test('Should throw an error upon a non-OK response', async () => {
    await expect(ns.http.getJson('/not-found')).rejects.toThrow('Request to /not-found failed with status "Not Found" and text "404 Not found"');
});

test('Should handle network error', async () => {
    await expect(ns.http.getJson('/error')).rejects.toThrow('Request to /error failed with status "Network error"');
});

test('Should abort the request', async () => {
    const abortController = new AbortController();
    const abortFunction = jest.fn();
    const request = ns.http.getJson('/abort', { signal: abortController.signal, abortFunction });
    abortController.abort();
    await expect(request).resolves.toBe(null);
    expect(abortFunction).toHaveBeenCalledTimes(1);
});
