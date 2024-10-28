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
require('#commons/tools.js');
// noinspection JSFileReferences
require('#commons/fields-matcher.js');

const path = require('path');
const { readFileSync } = require('fs');

const ns = window.eai;

beforeEach(() => {
    ns.tools.register({
        id: 'my-tool',
        handle: () => {}
    });
});

afterEach(() => {
    ns.tools.clearAll();
});

test('Should register a tool model', () => {
   expect(ns.tools.getModels().length).toBe(1);
});

test('Should not register an invalid tool model', () => {
    const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation();

    ns.tools.register({ id: 'my-tool' });
    expect(consoleErrorMock).toHaveBeenCalledTimes(1);
    expect(ns.tools.getModels().length).toBe(1);

    consoleErrorMock.mockRestore();
});

test('Should unregister a tool model', () => {
    expect(ns.tools.getModels()).toHaveLength(1);
    ns.tools.unregister('my-tool');
    expect(ns.tools.getModels()).toHaveLength(0);
});

test('Should create a tool instance', () => {
    ns.tools.addInstance({
        type: 'my-tool',
        icon: 'tool',
        title: 'My Tool Instance',
        fooSetting: 'bar'
    });
    for (const id of ['my-tool:0', 'my-tool']) {
        const instance = ns.tools.getInstance(id);
        expect(typeof instance).toBe('object');
        expect(instance).toMatchObject({
            icon: 'tool',
            ordinal: Number.MAX_SAFE_INTEGER,
            title: 'My Tool Instance',
            fooSetting: 'bar'
        });
    }
});

test('Should create a tool instance without settings', () => {
    ns.tools.addInstance({
        id: 'another-tool',
        icon: 'tool',
        title: 'Another Tool Instance',
        handle: () => {}
    });
    const instance = ns.tools.getInstance('another-tool:0');
    expect(typeof instance).toBe('object');
    expect(instance).toMatchObject({
        id: 'another-tool:0',
        icon: 'tool',
        ordinal: Number.MAX_SAFE_INTEGER,
        title: 'Another Tool Instance',
    });
});

test('Should select tools for a field (function-based)', () => {
    ns.tools.addInstance({
        type: 'my-tool',
        isMatch: (field) => field.name.includes('title')
    });

    const dom = createDom('dialog.html');
    const titleField = dom.querySelector('[name="./title"]');
    const descriptionField = dom.querySelector('[name="./description"]');

    let tools = ns.tools.forField(titleField);
    expect(tools).toHaveLength(1);

    tools = ns.tools.forField(descriptionField);
    expect(tools).toHaveLength(0);
});

test('Should select tools for a field', () => {
    addToolInstance('For all fields');
    addToolInstance('For dialog fields', ['ui != properties|inplace']);
    addToolInstance('For page properties', ['ui = properties']);
    addToolInstance('For ./title', '[name="./title"]');
    addToolInstance('For ./title and ./description (matcher by name)', ['@ tab="Tab 0"|Basic', 'name=title|description']);
    addToolInstance('For ./description (matcher by name)', ['@ tab="Tab 0"|Basic', 'name=description']);
    addToolInstance('For margins (matcher by tab)', ['tab != "Tab 0"|Basic']);
    addToolInstance('For margins (matcher by name)', ['name $= Margin']);

    let dom = createDom('dialog.html');

    let titleField = dom.querySelector('[name="./title"]');
    expectToolsForFieldToContain(
        titleField,
        [
            'For all fields',
            'For dialog fields',
            'For ./title',
            'For ./title and ./description (matcher by name)'
        ],
        [
            'For page properties',
            'For ./description (matcher by name)',
            'For margins (matcher by tab)',
            'For margins (matcher by name)'
        ]
    );

    let descriptionField = dom.querySelector('[name="./description"]');
    expectToolsForFieldToContain(
        descriptionField,
        [
            'For all fields',
            'For dialog fields',
            'For ./title and ./description (matcher by name)',
            'For ./description (matcher by name)'
        ],
        [
            'For page properties',
            'For ./title',
            'For margins (matcher by tab)',
            'For margins (matcher by name)'
        ]
    );

    let marginField = dom.querySelector('[name="./leftMargin"]');
    expectToolsForFieldToContain(
        marginField,
        [
            'For all fields',
            'For dialog fields',
            'For margins (matcher by tab)',
            'For margins (matcher by name)'
        ],
        [
            'For page properties',
            'For ./title',
            'For ./title and ./description (matcher by name)',
            'For ./description (matcher by name)'
        ]
    );

    dom = createDom('properties.html');

    titleField = dom.querySelector('[name="./title"]');
    expectToolsForFieldToContain(
        titleField,
        [
            'For all fields',
            'For page properties',
            'For ./title',
            'For ./title and ./description (matcher by name)'
        ],
        [
            'For dialog fields',
            'For ./description (matcher by name)',
            'For margins (matcher by tab)',
            'For margins (matcher by name)'
        ]
    );

    descriptionField = dom.querySelector('[name="./description"]');
    expectToolsForFieldToContain(
        descriptionField,
        [
            'For all fields',
            'For page properties',
            'For ./title and ./description (matcher by name)',
            'For ./description (matcher by name)'
        ],
        [
            'For dialog fields',
            'For ./title',
            'For margins (matcher by tab)',
            'For margins (matcher by name)'
        ]
    );

    marginField = dom.querySelector('[name="./leftMargin"]');
    expectToolsForFieldToContain(
        marginField,
        [
            'For all fields',
            'For page properties',
            'For margins (matcher by tab)',
            'For margins (matcher by name)'
        ],
        [
            'For dialog fields',
            'For ./title',
            'For ./title and ./description (matcher by name)',
            'For ./description (matcher by name)'
        ]
    );
});

function createDom(fileName) {
    const dialogPath = path.join(__dirname, 'resources', fileName);
    const dialogText = readFileSync(dialogPath, 'utf8');
    const container = document.createElement('div');
    container.innerHTML = dialogText;
    return container.firstElementChild;
}

function addToolInstance(title, selectors) {
    ns.tools.addInstance({ type: 'my-tool', title, selectors });
}

function expectToolsForFieldToContain(field, expected, notExpected) {
    const titles = ns.tools.forField(field).map((tool) => tool.title);
    expect(titles.length).toBeGreaterThanOrEqual(expected.length);
    expected.forEach((title) => expect(titles).toContain(title));
    notExpected.forEach((title) => expect(titles).not.toContain(title));
}