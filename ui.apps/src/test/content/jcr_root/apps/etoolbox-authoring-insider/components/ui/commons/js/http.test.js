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
require('#commons/http.js');

const ns = window.eai;

test('Should retrieve JSON response', async () => {
    let result = await ns.http.getJson('/test-json');
    expect(result).toEqual({ key: 'value' });

    result = await ns.http.postJson('/test-text', { body: JSON.stringify({ data: 'test' }) });
    expect(result).toEqual('Lorem ipsum dolor sit amet');

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
    await expect(ns.http.getJson('/error')).rejects.toThrow('Request to /error failed: Network error');
});
