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
require('#commons/icons.js');
// noinspection JSFileReferences
require('#runtime/controls.js');

const ns = window.eai;

class MockCoralElement {
    constructor() {
        this._dom = document.createElement('coral-element');
        this._dom.set = setProperties.bind(this._dom);
        this._dom.content = this._dom;
        return this._dom;
    }
}

class MockCoralCollectionElement {
    constructor() {
        this._dom = document.createElement('coral-collection-element');
        this._dom.set = setProperties.bind(this._dom);
        this._dom.items = new MockCoralCollection(this._dom);
        return this._dom;
    }
    static Item = MockCoralElement;
}

class MockCoralCollection {
    constructor(dom) {
        this._dom = dom;
    }
    add(item) {
        this._dom.appendChild(item);
    }
}

function setProperties(props) {
    if (ns.utils.isObjectWithProperty(props.content, 'innerHTML')) {
        this.innerHTML += props.content.innerHTML;
    }
    return this;
}

global.Coral = {
    AnchorButton: MockCoralElement,
    ButtonList: MockCoralCollectionElement,
    Popover: MockCoralElement,
    mixin: {
        overlay: {
            focusOnShow: { OFF: 'off' },
            returnFocus: { ON: 'on' }
        }
    }
};

test('Should create a tool dropdown for a field', () => {
    ns.tools.forField = jest.fn().mockReturnValue([
        { id: 'tool1', title: 'Tool 1', providers: [{ id: 'prov1' }, { id: 'prov2' }] },
        { id: 'tool1', title: 'Tool 2', providers: [{ id: 'prov2' }, { id: 'prov3' }] },
    ]);

    const field = document.createElement('input');
    const section = document.createElement('section');
    section.appendChild(field);

    ns.controls.handleField(field);
    expect(section.querySelector('.eai-tool-button')).not.toBeNull();
    expect(section.querySelector('.eai-tools')).not.toBeNull();
    expect(section.querySelectorAll('[data-eai-action].has-providers').length).toBe(2);

    const firstTool = section.querySelector('[data-eai-action]');
    expect(firstTool.querySelector('.providers')).not.toBeNull()
    expect(firstTool.querySelectorAll('a').length).toBe(2);

    const secondTool = firstTool.nextElementSibling;
    expect(secondTool.querySelectorAll('a').length).toBe(2);
    expect(secondTool.querySelector('a:last-of-type').outerHTML).toContain('prov3');
});

test('Should log an error if a field is not provided', async () => {
    const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation();

    await ns.controls.execute('action1');
    expect(consoleErrorMock).toHaveBeenCalledWith('There is not a controlled field for action1');

    consoleErrorMock.mockRestore();
});

test('Should log an error if a tool is not found', async () => {
    ns.tools.getInstance = jest.fn().mockReturnValue(null);
    const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation();

    const field = document.createElement('input');
    await ns.controls.execute('action1', field);
    expect(consoleErrorMock).toHaveBeenCalledWith('action1 is not found or has no handler');

    consoleErrorMock.mockRestore();
});

test('Should call a tool handle method', async () => {
    const tool = { handle: jest.fn() };
    ns.tools.getInstance = jest.fn().mockReturnValue(tool);
    const field = document.createElement('input');
    await ns.controls.execute('action1', field);
    expect(tool.handle).toHaveBeenCalledWith(field, 'action1');
});
