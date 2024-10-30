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
// noinspection JSFileReferences
require('#commons/utils.js');
// noinspection JSFileReferences
require('#runtime/settings.js');

const ns = window.eai;

const SETTINGS = {
    tools: [
        {
            icon: 'my-tool',
            id: 'tool1',
            title: 'First Tool'
        },
        {
            icon: 'my-tool',
            id: 'tool2',
            title: 'Second Tool'
        }
    ],
    providers: [{
        id: 'provider1',
        title: 'First Provider'
    }]
};

let cachedFetch;

beforeAll(() => {
    cachedFetch = global.fetch;
});

afterAll(() => {
    global.fetch = cachedFetch;
});

beforeEach(() => {
    ns.settings.clearAll();
});

test('Should load settings', async () => {
    global.fetch = successfulFetch;

    let toolSettings = await ns.settings.getToolSettings();
    const providerSettings = await ns.settings.getProviderSettings();
    expect(toolSettings).toHaveLength(2);
    expect(providerSettings).toHaveLength(1);

    toolSettings = await ns.settings.getToolSettings('tool1');
    expect(toolSettings).toHaveLength(1);
    expect(toolSettings[0].title).toBe('First Tool');
});

test('Should handle a failed settings loading', async () => {
    global.fetch = failedFetch;
    const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation();

    let toolSettings = await ns.settings.getToolSettings();
    const providerSettings = await ns.settings.getProviderSettings();
    expect(toolSettings).toBeNull();
    expect(providerSettings).toBeNull();
    expect(consoleErrorMock).toHaveBeenCalledTimes(1);

    consoleErrorMock.mockRestore();
});

function successfulFetch() {
    return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(SETTINGS)
    });
}

function failedFetch() {
    return Promise.resolve({
        ok: false,
        status: 403,
        text: () => Promise.resolve('403 Forbidden')
    });
}