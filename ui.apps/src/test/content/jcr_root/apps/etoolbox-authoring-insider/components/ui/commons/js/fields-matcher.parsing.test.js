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

test('Should parse alternating conditions', () => {
    let matcher = new ns.fields.Matcher('ui = dialog|properties');
    expect(matcher).toHaveProperty('ui', ['dialog', 'pageProperties']);

    matcher = new ns.fields.Matcher('component *= "Text Box" | "Description Box" field="jcr:title" ');
    expect(matcher).toHaveProperty('component', ['Text Box', 'Description Box']);
    expect(matcher).toHaveProperty('field', 'jcr:title');
});

test('Should extract matching operator', () => {
    let matcher = new ns.fields.Matcher('component *= "AnchorNav"');
    expect(matcher).toHaveProperty('component', 'AnchorNav');
    expect(matcher).toHaveProperty('componentMatching', '*=');

    matcher = new ns.fields.Matcher('component^= AnchorNav');
    expect(matcher).toHaveProperty('componentMatching', '^=');

    matcher = new ns.fields.Matcher('component $= "AnchorNav"');
    expect(matcher).toHaveProperty('componentMatching', '$=');

    matcher = new ns.fields.Matcher('component!=AnchorNav');
    expect(matcher).toHaveProperty('componentMatching', '!=');

    matcher = new ns.fields.Matcher('component = "AnchorNav"');
    expect(matcher).toHaveProperty('componentMatching', '=');
});

test('Should detect required conditions', () => {
    let matcher = new ns.fields.Matcher(' @component = AnchorNav');
    expect(matcher).toHaveProperty('component', 'AnchorNav');
    expect(matcher).toHaveProperty('isRequirement', true);

    matcher = new ns.fields.Matcher('component = "AnchorNav"');
    expect(matcher).toHaveProperty('isRequirement', false);

    matcher = new ns.fields.Matcher('@ coral-multifield');
    expect(matcher).toHaveProperty('selector', 'coral-multifield');
    expect(matcher).toHaveProperty('isRequirement', true);

    matcher = new ns.fields.Matcher('name != "my-name"');
    expect(matcher).toHaveProperty('isRequirement', true);

    matcher = new ns.fields.Matcher('component*=Anchor name!="my-name"');
    expect(matcher).toHaveProperty('isRequirement', false);
});