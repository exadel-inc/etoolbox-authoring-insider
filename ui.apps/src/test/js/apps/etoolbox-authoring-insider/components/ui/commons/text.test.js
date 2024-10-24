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
    'Sed do {{ Select from | Eiusmod:eiusmod, Tempor=tempor, incididunt }}, ' +
    'ut labore et dolore, {{ Enter magna aliqua }}.';

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
    expect(placeholder).toHaveProperty('title', 'Enter magna aliqua');

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

