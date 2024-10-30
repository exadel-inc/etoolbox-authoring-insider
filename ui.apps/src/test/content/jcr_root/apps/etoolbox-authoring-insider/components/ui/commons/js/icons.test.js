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
require('#commons/icons.js');

const ns = window.eai;

test('Should return a reference to a bundled icon', () => {
    const result = ns.icons.getHtml('expand', 'Expand Icon');
    expect(result).toContain('<span class="icon">');
    expect(result).toContain('icons.svg#expand');
});

test('Should return an icon by a full path', () => {
    const result = ns.icons.getHtml('/etc.clientlibs/etoolbox-authoring-insider/components/ui/commons/resources/expand.svg', 'Expand Icon');
    expect(result).toContain('src="/etc.clientlibs/etoolbox-authoring-insider/components/ui/commons/resources/expand.svg"');
    expect(result).toContain('class="icon"');
});

test('Should return icon HTML for a Coral icon name', () => {
    const result = ns.icons.getHtml('coralIcon', 'Coral Icon');
    expect(result).toBe('<coral-icon icon="coralIcon" size="S" class="icon"></coral-icon>');
});

test('Should return icon HTML with a synthetic SVG', () => {
    let result = ns.icons.getHtml('(A)', 'Synthetic Icon');
    expect(result).toContain('<img class="icon" src="data:image/svg+xml;base64,');

    result = ns.icons.getHtml('', 'Alt Icon');
    expect(result).toContain('<img class="icon" src="data:image/svg+xml;base64,');
});

test('Should return icon HTML for a DOM element', () => {
    const result = ns.icons.getHtml('<div>Icon</div>', 'DOM Icon');
    expect(result).toBe('<div class="icon"><div>Icon</div></div>');
});

test('Should return an empty string for an empty icon and alt text', () => {
    const result = ns.icons.getHtml('', '');
    expect(result).toBe('');
});