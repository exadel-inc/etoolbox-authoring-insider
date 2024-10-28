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
require('#commons/utils.js');
// noinspection JSFileReferences
require('#commons/providers.js');

const ns = window.eai;

beforeEach(() => {
    ns.providers.register({
        icon: 'provider',
        id: 'my-provider',
        title: 'My Provider',
        method: () => {}
    });
});

afterEach(() => {
   ns.providers.clearAll();
});

test('Should register a provider model', () => {
    expect(ns.providers.getModels().length).toBe(1);
});

test('Should not register an invalid provider model', () => {
    const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation();

    ns.providers.register({ title: 'My Provider' });
    expect(consoleErrorMock).toHaveBeenCalledTimes(1);
    expect(ns.providers.getModels().length).toBe(1);

    consoleErrorMock.mockRestore();
});

test('Should unregister a provider model', () => {
    expect(ns.providers.getModels()).toHaveLength(1);
    ns.providers.unregister('missing-provider');
    expect(ns.providers.getModels()).toHaveLength(1);
    ns.providers.unregister('my-provider');
    expect(ns.providers.getModels()).toHaveLength(0);
});

test('Should create a provider instance', () => {
    ns.providers.addInstance({
        type: 'my-provider',
        icon: 'provider2',
        title: 'My Provider Instance',
        fooSetting: 'bar'
    });
    for (const id of ['my-provider:0', 'my-provider']) {
        const instance = ns.providers.getInstance(id);
        expect(typeof instance).toBe('object');
        expect(instance).toMatchObject({
            icon: 'provider2',
            title: 'My Provider Instance',
            fooSetting: 'bar'
        });
    }
});

test('Should create a provider instance without settings', () => {
    ns.providers.addInstance({
        id: 'another-provider',
        icon: 'provider3',
        title: 'Another Provider Instance',
        handle: () => {}
    });
    const instance = ns.providers.getInstance('another-provider:0');
    expect(typeof instance).toBe('object');
    expect(instance).toMatchObject({
        id: 'another-provider:0',
        icon: 'provider3',
        ordinal: Number.MAX_SAFE_INTEGER,
        title: 'Another Provider Instance',
    });
});

test('Should select providers for a tool (function-based)', () => {
    ns.providers.addInstance({
        type: 'my-provider',
        supports: (tool) => tool.includes('ai.')
    });

    let providers = ns.providers.forRequirements('ai.translation');
    expect(providers).toHaveLength(1);

    providers = ns.providers.forRequirements(['text', 'image']);
    expect(providers).toHaveLength(0);
});

test('Should select providers for a tool', () => {
    addProviderInstance('Supports all');
    addProviderInstance('Supports only method', ['none']);
    addProviderInstance('Supports text', ['text.expand', 'text.shrink', 'summary']);
    addProviderInstance('Supports anything but image and voice', ['!image', '!voice']);

    expectProvidersForRequirementsToContain(
        ['method'],
        [
            'Supports all',
            'Supports only method',
            'Supports text',  // Hits because 'method' is the name of a function this provider's model has
            'Supports anything but image and voice'
        ],
        []
    );
    expectProvidersForRequirementsToContain(
        ['text'],
        [
            'Supports all',
            'Supports text',
            'Supports anything but image and voice'
        ],
        [
            'Supports only method'
        ]
    );
    expectProvidersForRequirementsToContain(
        ['translation'],
        [
            'Supports all',
            'Supports anything but image and voice'
        ],
        [
            'Supports only method',
            'Supports text'
        ]
    );
    expectProvidersForRequirementsToContain(
        ['image', 'audio'],
        [
            'Supports all',
        ],
        [
            'Supports only method',
            'Supports text',
            'Supports anything but image and voice'
        ]
    );
});

function addProviderInstance(title, supports) {
    ns.providers.addInstance({ type: 'my-provider', title, supports });
}

function expectProvidersForRequirementsToContain(requirements, expected, notExpected) {
    const titles = ns.providers.forRequirements(requirements).map((tool) => tool.title);
    expect(titles.length).toBeGreaterThanOrEqual(expected.length);
    expected.forEach((title) => expect(titles).toContain(title));
    notExpected.forEach((title) => expect(titles).not.toContain(title));
}