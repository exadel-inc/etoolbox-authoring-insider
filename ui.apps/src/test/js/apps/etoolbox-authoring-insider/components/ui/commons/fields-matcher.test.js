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
// noinspection JSFileReferences
require('#commons/fields-matcher.js');

const ns = window.eai;

test('Should parse selector', () => {
    let matcher = new ns.fields.Matcher('.my-class ');
    expect(matcher).toHaveProperty('selector', '.my-class');

    matcher = new ns.fields.Matcher('[coral-multifield]');
    expect(matcher).toHaveProperty('selector', '[coral-multifield]');

    matcher = new ns.fields.Matcher('coral-multifield > [add-button]');
    expect(matcher).toHaveProperty('selector', 'coral-multifield > [add-button]');
});

test('Should parse condition + selector', () => {
    let matcher = new ns.fields.Matcher(' component *= "AnchorNav"  .my-field');
    expect(matcher).toHaveProperty('selector', '.my-field');
    expect(matcher).toHaveProperty('component', 'AnchorNav');

    matcher = new ns.fields.Matcher(' selector=`.my-field ` component = "AnchorNav"');
    expect(matcher).toHaveProperty('selector', '.my-field');
    expect(matcher).toHaveProperty('component', 'AnchorNav');

    matcher = new ns.fields.Matcher(' selector=` .my-field ` component= "AnchorNav" [name="my-name"]');
    expect(matcher).toHaveProperty('selector', '.my-field,[name="my-name"]');
    expect(matcher).toHaveProperty('component', 'AnchorNav');
});

test('Should parse page flag', () => {
    let matcher = new ns.fields.Matcher(' PageProperties field= jcr:title :has(.name)');
    expect(matcher).toHaveProperty('flags', ['pageproperties']);
    expect(matcher).toHaveProperty('field', 'jcr:title');
    expect(matcher).toHaveProperty('selector', ':has(.name)');
});

test('Should extract matching condition', () => {
    let matcher = new ns.fields.Matcher('component *= "AnchorNav"');
    expect(matcher).toHaveProperty('component', 'AnchorNav');
    expect(matcher).toHaveProperty('componentMatching', 'contains');

    matcher = new ns.fields.Matcher('component ^= "AnchorNav"');
    expect(matcher).toHaveProperty('componentMatching', 'startsWith');

    matcher = new ns.fields.Matcher('component $= "AnchorNav"');
    expect(matcher).toHaveProperty('componentMatching', 'endsWith');

    matcher = new ns.fields.Matcher('component = "AnchorNav"');
    expect(matcher).not.toHaveProperty('componentMatching');
});

test('Should detect inverted condition', () => {
    let matcher = new ns.fields.Matcher(' !component = AnchorNav');
    expect(matcher).toHaveProperty('component', 'AnchorNav');
    expect(matcher).toHaveProperty('inverted', true);

    matcher = new ns.fields.Matcher('component = "AnchorNav"');
    expect(matcher).not.toHaveProperty('inverted');

    matcher = new ns.fields.Matcher('! coral-multifield');
    expect(matcher).toHaveProperty('selector', 'coral-multifield');
    expect(matcher).toHaveProperty('inverted', true);
});