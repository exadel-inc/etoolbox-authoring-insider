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
require('#commons/fields.js');

const ns = window.eai;

test('Should focus a field', () => {
    const field = {
        setFocus: jest.fn(),
        focus: jest.fn()
    };
    ns.fields.focus(field);
    expect(field.setFocus).toHaveBeenCalled();
    expect(field.focus).not.toHaveBeenCalled();

    delete field.setFocus;
    ns.fields.focus(field);
    expect(field.focus).toHaveBeenCalled();
});

test('Should retrieve selected content', () => {
    const field = {
        getSelectedContent: jest.fn().mockReturnValue('selected'),
        selectionStart: 0,
        selectionEnd: 4,
        value: 'test'
    };
    let result = ns.fields.getSelectedContent(field);
    expect(result).toBe('selected');

    delete field.getSelectedContent;
    result = ns.fields.getSelectedContent(field);
    expect(result).toBe('test');
});

test('Should retrieve value', () => {
    const field = {
        getValue: () => 'Lorem ipsum'
    };
    expect(ns.fields.getValue(field)).toBe('Lorem ipsum');

    delete field.getValue;
    field.value = 'Dolor sit amet';
    expect(ns.fields.getValue(field)).toBe('Dolor sit amet');

    delete field.value;
    field['foundation-field-value'] = 'Consectetur adipiscing elit';
    expect(ns.fields.getValue(field)).toBe('Consectetur adipiscing elit');

    delete field['foundation-field-value'];
    expect(ns.fields.getValue(field)).toBe('');
});

test('Should retrieve value for a descendant field', () => {
    const container = document.createElement('div');
    const field = document.createElement('input');
    field.value = 'Lorem ipsum';
    field.className = 'field';
    container.appendChild(field);
    expect(ns.fields.getValue(container, '.field')).toBe('Lorem ipsum');
});

test('Should set selected content', () => {
    const field = {
        setSelectedContent: jest.fn(),
        selectionStart: 0,
        selectionEnd: 4,
        value: 'test'
    };
    ns.fields.setSelectedContent(field, 'value');
    expect(field.setSelectedContent).toHaveBeenCalledWith('value');

    delete field.setSelectedContent;
    field['foundation-field-value'] = null;
    ns.fields.setSelectedContent(field, 'new');
    expect(ns.fields.getValue(field)).toBe('new');
});

test('Should set value', () => {
    const field = document.createElement('input');
    const dispatchEventMock = jest.spyOn(field, 'dispatchEvent').mockImplementation();

    field['foundation-field-value'] = null;
    ns.fields.setValue(field, 'Lorem ipsum');
    expect(field['foundation-field-value']).toBe('Lorem ipsum');

    delete field['foundation-field-value'];
    ns.fields.setValue(field, 'Dolor sit amet');
    expect(field.value).toBe('Dolor sit amet');
    expect(dispatchEventMock).toHaveBeenCalled();

    dispatchEventMock.mockRestore();
});

test('Should set value for a descendant field', () => {
    const container = document.createElement('div');
    const field = document.createElement('input');
    field.className = 'field';
    container.appendChild(field);
    ns.fields.setValue(container, '.field', 'Lorem ipsum');
    expect(field.value).toBe('Lorem ipsum');
});

test('Should lock/unlock a field', () => {
    const field = {
        lock: jest.fn(),
        unlock: jest.fn()
    };
    ns.fields.lock(field);
    expect(field.lock).toHaveBeenCalled();

    ns.fields.unlock(field);
    expect(field.unlock).toHaveBeenCalled();
});
