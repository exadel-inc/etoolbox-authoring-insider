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

const ns = window.eai;
const $ = Granite.$;

test('Should initialize and increment IdCounter', () => {
    const counter = new ns.utils.IdCounter();
    expect(counter.nextIndexedId('test')).toBe('test:0');
    expect(counter.nextIndexedId('test')).toBe('test:1');
});

test('Should intern properties', () => {
    const source = { a: 1, b: 2 };
    let target = {};
    ns.utils.intern(source, target);
    expect(target).toEqual(source);

    target = {};
    ns.utils.intern(source, target, { exclude: ['b'] });
    expect(target).toEqual({ a: 1 });

    target = {};
    ns.utils.intern(source, target, { addPrefixTo: ['b'] });
    expect(target).toEqual({ a: 1, _b: 2 });
});

test('Should detect a function', () => {
    async function asyncFunc() {}
    expect(ns.utils.isAsyncFunction(asyncFunc)).toBe(true);

    function regularFunc() {}
    expect(ns.utils.isFunction(regularFunc)).toBe(true);
    expect(ns.utils.isAsyncFunction(regularFunc)).toBe(false);

    expect(ns.utils.isFunction(123)).toBe(false);
});

test('Should report a blank vallue', () => {
    expect(ns.utils.isBlank('')).toBe(true);
    expect(ns.utils.isBlank(' ')).toBe(true);
    expect(ns.utils.isBlank('test')).toBe(false);
    expect(ns.utils.isBlank(123)).toBe(false);
    expect(ns.utils.isBlank(null)).toBe(true);
    expect(ns.utils.isBlank(undefined)).toBe(true);
});

test('Should detect a jQuery object', () => {
    const jqueryObj = $(document);
    expect(ns.utils.isJquery(jqueryObj)).toBe(true);
    expect(ns.utils.isJquery({})).toBe(false);
});

test('Should detect an HTML element', () => {
    const element = document.createElement('div');
    expect(ns.utils.isHtmlElement(element)).toBe(true);
    expect(ns.utils.isHtmlElement({})).toBe(false);
    expect(ns.utils.isHtmlElement(null)).toBe(false);
});

test('Should detect a number', () => {
    expect(ns.utils.isNumber(123)).toBe(true);
    expect(ns.utils.isNumber('123')).toBe(false);
    expect(ns.utils.isNumber(true)).toBe(false);
});

test('Should detect an object', () => {
    expect(ns.utils.isObject({})).toBe(true);
    expect(ns.utils.isObject(123)).toBe(false);
    expect(ns.utils.isObject(null)).toBe(false);
});

test('Should detect an object that has a property', () => {
    const obj = { a: 1 };
    expect(ns.utils.isObjectWithProperty(obj, 'a', 1)).toBe(true);
    expect(ns.utils.isObjectWithProperty(obj, 'b')).toBe(false);
    expect(ns.utils.isObject(123)).toBe(false);
    expect(ns.utils.isObject(null)).toBe(false);
});

test('Should detect a string', () => {
    expect(ns.utils.isString('test')).toBe(true);
    expect(ns.utils.isString(123)).toBe(false);
});
