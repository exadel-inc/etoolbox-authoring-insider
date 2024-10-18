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
(function (window, ns) {
    'use strict';

    const RESOURCES_PREFIX = '/etc.clientlibs/etoolbox-authoring-insider/components/ui/commons/resources/';
    const ICON_PACK = RESOURCES_PREFIX + 'icons.svg';

    const PREDEFINED_ICONS = [
        'expand',
        'insider-mono',
        'llama',
        'openai',
        'plus-one',
        'shrink',
        'summary'
    ];

    const DEFAULT_COLOR = '#1182CA';

    ns.icons = ns.icons || {};

    ns.icons.DEFAULT = RESOURCES_PREFIX + 'insider.svg';

    ns.icons.getHtml = function (icon, alt) {
        icon = (icon || '').trim();
        // Pass ready HTML as is
        if (icon.startsWith('<img') || icon.startsWith('<svg')) {
            return icon;
        }
        // Create from a full path/url
        if (/^(http|\/apps|\/etc)/.test(icon)) {
            return `<img src="${icon}" alt="${alt || 'Icon'}" class="icon">`;
        }
        // Create from a predefined path/url
        if (PREDEFINED_ICONS.includes(icon)) {
            // return `<img src="${PREDEFINED_ICONS[icon]}" alt="${alt || 'Icon'}" class="icon">`;
            return `<span class="icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill-rule="evenodd" clip-rule="evenodd"><use href="${ICON_PACK}#${icon}"/></svg></span>`
        }
        // Create from a DOM element
        if (/^<[\w-]+/.test(icon)) {
            return `<div class="icon">${icon}</div>`;
        }
        // Create from a requested synthetic SVG
        if (/^\(\w+\)/.test(icon)) {
            const text = icon.substring(1).split(')')[0];
            const color = icon.includes('#') ? icon.substring(icon.indexOf('#')).trim() : DEFAULT_COLOR;
            return `<img class="icon" src="${getSyntheticSvg(text, color)}" alt="${alt || 'Icon'}">`;
        }
        // Create from a Coral icon name
        if (icon.length) {
            return `<coral-icon icon="${icon}" size="S" class="icon"></coral-icon>`;
        }
        // Create from the first character of alt text
        if (alt && alt.length) {
            return `<img class="icon" src="${getSyntheticSvg(alt, DEFAULT_COLOR)}" alt="${alt || 'Icon'}">`;
        }
        return '';
    }

    ns.icons.DEFAULT_MONO = ns.icons.getHtml('insider-mono');

    function getSyntheticSvg(text, color) {
        const char = text.charAt(0).toUpperCase();
        const svgContent = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
              <mask id="mask">
                <circle r="100" cx="100" cy="100" fill="white"/>
                <text x="50%" y="147" font-family="sans-serif" font-size="130px" font-weight="bold" text-anchor="middle" fill="black">${char}</text>
              </mask>
              <circle r="100" cx="100" cy="100" mask="url(#mask)" fill="${color}"/>
            </svg>`;
        return 'data:image/svg+xml;base64,' + btoa(svgContent);

    }

})(window, window.eai = window.eai || {});

