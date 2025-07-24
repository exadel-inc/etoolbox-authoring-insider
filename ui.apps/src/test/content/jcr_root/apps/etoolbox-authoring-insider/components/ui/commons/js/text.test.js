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
require('#commons/text.js');

const ns = window.eai;

const TEXT = 'Lorem ipsum dolor sit amet, {{ Enter consectetur adipiscing elit }}. ' +
    'Sed do {{ Select from | Eiusmod:eiusmod | Tempor=tempor | incididunt }}, ' +
    'ut labore et dolore, {{ Enter magna | aliqua; veniam }}.';

test('Should parse plain text', () => {
    const text = 'Lorem ipsum dolor sit amet';
    const textBuilder = new ns.text.TextBuilder(text);
    expect(textBuilder.build()).toBe(text);
});

test('Should parse text with placeholders', () => {
    const textBuilder = new ns.text.TextBuilder(TEXT);
    expect(textBuilder._placeholders).toHaveLength(3);

    let placeholder = textBuilder.nextPlaceholder();
    expect(placeholder).toHaveProperty('title', 'Enter consectetur adipiscing elit');

    placeholder = textBuilder.nextPlaceholder();
    expect(placeholder).toHaveProperty('title', 'Select from');
    expect(placeholder).toHaveProperty('options', [
        { label: 'Eiusmod', value: 'eiusmod' },
        { label: 'Tempor', value: 'tempor' },
        { label: 'incididunt', value: 'incididunt' }
    ]);

    placeholder = textBuilder.nextPlaceholder();
    expect(placeholder).toHaveProperty('title', 'Enter magna');
    expect(placeholder).toHaveProperty('options', [
        { label: 'aliqua', value: 'aliqua' },
        { label: 'veniam', value: 'veniam' }
    ]);

    placeholder = textBuilder.nextPlaceholder();
    expect(placeholder).toBeNull();
});

test('Should fill in placeholders', () => {
    const textBuilder = new ns.text.TextBuilder(TEXT);
    let placeholder;
    let index = 0;
    while ((placeholder = textBuilder.nextPlaceholder()) !== null) {
        textBuilder.fillIn(placeholder, '' + index++);
    }
    expect(textBuilder.build()).toBe('Lorem ipsum dolor sit amet, 0. Sed do 1, ut labore et dolore, 2.')
});

test('Should parse text with unpaired brackets', () => {
    const text = 'Lorem {{ipsum}} dolor {{sit amet}';
    const textBuilder = new ns.text.TextBuilder(text);
    expect(textBuilder).toHaveProperty('_placeholders', [{ start: 6, end: 15 }]);

    let placeholder;
    while ((placeholder = textBuilder.nextPlaceholder()) !== null) {
        textBuilder.fillIn(placeholder, 'FILL');
    }
    expect(textBuilder.build()).toBe('Lorem FILL dolor {{sit amet}');
});


test('Should report a blank value', () => {
    expect(ns.text.isBlank('')).toBe(true);
    expect(ns.text.isBlank(' ')).toBe(true);
    expect(ns.text.isBlank('<p> <br> <br/></p>')).toBe(true);
    expect(ns.text.isBlank({  html: '' })).toBe(true);
    expect(ns.text.isBlank({  foo: 'bar' })).toBe(false);
    expect(ns.text.isBlank(null)).toBe(true);
    expect(ns.text.isBlank(undefined)).toBe(true);
    expect(ns.text.isBlank('test')).toBe(false);
    expect(ns.text.isBlank(123)).toBe(false);
    expect(ns.text.isBlank({  html: 'foo' })).toBe(false);
});

test('Should strip text from spaces and punctuation', () => {
    let text = '  Lorem ipsum dolor sit amet  ';
    expect(ns.text.stripSpacesAndPunctuation(text)).toBe('Lorem ipsum dolor sit amet');

    text = '*"Lorem ipsum dolor sit amet."';
    expect(ns.text.stripSpacesAndPunctuation(text)).toBe('Lorem ipsum dolor sit amet');

    text = { html: ' <p>Lorem ipsum dolor sit amet.</p> ' };
    expect(ns.text.stripSpacesAndPunctuation(text)).toHaveProperty('html', '<p>Lorem ipsum dolor sit amet.</p>');
});

test('Should strip text from HTML tags', () => {
    let text = ' Lorem ipsum dolor sit amet ';
    expect(ns.text.stripTags(text)).toBe(' Lorem ipsum dolor sit amet ');

    text = '<p>Lorem ipsum <b>dolor</b> sit amet</p>';
    expect(ns.text.stripTags(text)).toBe('Lorem ipsum dolor sit amet');

    text = '<br/>';
    expect(ns.text.stripTags(text)).toBe('');
});