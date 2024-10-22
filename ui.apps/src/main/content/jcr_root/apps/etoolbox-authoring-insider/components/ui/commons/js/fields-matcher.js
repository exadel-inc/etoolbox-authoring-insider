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
(function (ns) {
    'use strict';

    const DIALOG_FLAGS = ['dialog'];
    const PAGE_PROPS_FLAGS = ['page properties', 'pageproperties', 'properties'];

    const ALL_FLAGS = [
        DIALOG_FLAGS,
        PAGE_PROPS_FLAGS
    ].flat();

    ns.fields = ns.fields || {};

    /**
     * Presents a criteria-based matcher for dialogs and page properties fields
     * @class
     */
    ns.fields.Matcher  = class {
        /**
         * Creates a new instance of the matcher
         * @param {string} value - A string representing match criteria
         */
        constructor(value) {
            if (!value) {
                return;
            }
            let source = value.toString().trim();
            if (source.length === 0) {
                return;
            }
            if (source[0] === '!') {
                this.inverted = true;
                source = source.substring(1).trim();
            }
            if (!/^[A-Za-z]/.test(source)) {
                this.selector = source;
                return;
            }
            while (source.length) {
                const flag = extractFlag(source);
                if (flag) {
                    this.flags = this.flags || [];
                    this.flags.push(flag);
                    source = source.substring(flag.length).trim();
                    continue;
                }
                const nameValue = extractNameValuePair(source);
                if (!nameValue) {
                    this.selector = appendIfNeeded(this.selector, source.trim());
                    return;
                }
                this[nameValue.key] = `${nameValue.value}`;
                if (nameValue.matchingMode !== 'equals') {
                    this[nameValue.key + 'Matching'] = nameValue.matchingMode;
                }
                source = source.substring(nameValue.length).trim();
            }
            if (source.length) {
                this.selector = appendIfNeeded(this.selector, source.trim());
            }
        }

        /**
         * Checks if the field matches the criteria
         * @param field - A DOM element
         * @returns {boolean} - Match result
         */
        matches(field) {
            const result = this.isMatch(field);
            return this.inverted ? !result : result;
        }

        /**
         * @private
         */
        getMatchingMode(key) {
            return this[key + 'Matching'] || 'equals';
        }

        /**
         * @private
         */
        getMatchingOperator(key) {
            const mode = this.getMatchingMode(key);
            if (mode === 'contains') {
                return '*=';
            }
            if (mode === 'startsWith') {
                return '^=';
            }
            if (mode === 'endsWith') {
                return '$=';
            }
            return '=';
        }

        /**
         * @private
         */
        isMatch(field) {
            if (!field) {
                return true;
            }
            if (this.selector) {
                try {
                    if (!field.matches(this.selector)) {
                        return false;
                    }
                } catch (e) {
                    console.error('Invalid selector:', this.selector);
                    return false;
                }
            }
            if (this['href'] && !this.isMatchByHref()) {
                return false;
            }
            if (this.flags && this.flags.some((flag) => DIALOG_FLAGS.includes(flag))) {
                if (!field.closest('coral-dialog')) {
                    return false;
                }
            }
            if (this.flags && this.flags.some((flag) => PAGE_PROPS_FLAGS.includes(flag))) {
                if (!field.closest('.cq-siteadmin-admin-properties')) {
                    return false;
                }
            }
            if (this['parentSelector'] && !this.isMatchByParentSelector(field)) {
                return false;
            }
            if (this['field'] && !this.isMatchByFieldName(field)) {
                return false;
            }
            if (this['fieldAttribute'] && !this.isMatchByFieldAttribute(field)) {
                return false;
            }
            if (this['fieldLabel'] && !this.isMatchByFieldLabel(field)) {
                return false;
            }
            if (this['component'] && !this.isMatchByComponent(field)) {
                return false;
            }
            return !(this['tab'] && !this.isMatchByTab(field));
        }

        /**
         * @private
         */
        isMatchByComponent(field) {
            const dialog = field.closest('.cq-dialog');
            const header = dialog ? dialog.querySelector('.cq-dialog-header') : null;
            if (!header) {
                return false;
            }
            const operator = this.getMatchingOperator('component');
            return isMatch(header.textContent.trim().toLowerCase(), this['component'].toLowerCase(), operator);
        }

        /**
         * @private
         */
        isMatchByFieldAttribute(field) {
            const operator = this.getMatchingOperator('field');
            if (operator !== '=') {
                console.error('Unsupported operator for the "fieldAttribute" property');
                return false;
            }
            const fieldAttributeValue = this['fieldAttribute'];
            const possibleAttributes = [fieldAttributeValue];
            if (!fieldAttributeValue.startsWith('data-')) {
                possibleAttributes.push(`data-${fieldAttributeValue}`);
            }
            for (const attr of possibleAttributes) {
                if (field.hasAttribute(attr)) {
                    return true;
                }
                const coralFormField = field.closest('.coral-Form-field');
                if (coralFormField && coralFormField.matches('.cq-RichText')) {
                    if (coralFormField.querySelector(`[${attr}]`)) {
                        return true;
                    }
                }
            }
            return false;
        }

        /**
         * @private
         */
        isMatchByFieldName(field) {
            const coralFormField = field.closest('.coral-Form-field');
            if (!coralFormField) {
                return false;
            }
            const operator = this.getMatchingOperator('field');
            let nameValue = this['field'];
            const variants = [nameValue];
            if ((operator === '=' || operator === '^=') && !nameValue.startsWith('./')) {
                variants.push(`./${nameValue}`);
            }
            for (const variant of variants) {
                const selector = `[name${operator}"${variant}"]`;
                if (coralFormField.matches(selector) || coralFormField.querySelector(selector)) {
                    return true;
                }
            }
            return false;
        }

        /**
         * @private
         */
        isMatchByFieldLabel(field) {
            const coralFormFieldWrapper = field.closest('.coral-Form-fieldwrapper');
            const label = coralFormFieldWrapper ? coralFormFieldWrapper.querySelector('label') : null;
            if (!label) {
                return false;
            }
            const operator = this.getMatchingOperator('fieldLabel');
            const labelValue = this['fieldLabel'];
            return isMatch(label.textContent.trim().toLowerCase(), labelValue.toLowerCase(), operator);
        }

        /**
         * @private
         */
        isMatchByHref() {
            const operator = this.getMatchingOperator('href');
            return isMatch(window.location.href, this['href'], operator);
        }

        /**
         * @private
         */
        isMatchByParentSelector(field) {
            try {
                return !!field.closest(this['parentSelector']);
            } catch (e) {
                console.error('Invalid parent selector:', this['parentSelector']);
                return false;
            }
        }

        /**
         * @private
         */
        isMatchByTab(field) {
            const panel = field.closest('coral-panel');
            if (!panel || !panel.parentElement) {
                return false;
            }
            const panelOrdinal = Array.from(panel.parentElement.children).indexOf(panel);
            const tabView = panel.closest('coral-tabview');
            const tabList = tabView && tabView.querySelector('coral-tablist');
            const tab = tabList && tabList.children[panelOrdinal];
            if (!tab) {
                return false;
            }
            const operator = this.getMatchingOperator('tab');
            return isMatch(tab.textContent.trim().toLowerCase(), this['tab'].toLowerCase(), operator);
        }
    }

    function appendIfNeeded(first, second) {
        if (!first || first.length === 0) {
            return second;
        }
        if (!second || second.length === 0) {
            return first;
        }
        return `${first},${second}`;
    }

    function extractFlag(source) {
        for (const item of ALL_FLAGS) {
            if (source.toLowerCase().startsWith(item)) {
                return item;
            }
        }
        return null;
    }

    function extractLiteral(source, extraChars) {
        const firstChar = source[0];
        if (firstChar === '\'' || firstChar === '"' || firstChar === '`') {
            const closingQuotePos = source.indexOf(firstChar, 1);
            if (closingQuotePos < 1) {
                return '';
            }
            return source.substring(0, closingQuotePos + 1);
        }
        return extractName(source, extraChars);
    }

    function extractName(source, extraChars) {
        let i = 0;
        const len = source.length;
        while (i < len) {
            const chr = source[i];
            if (!isNameCharacter(chr, extraChars)) {
                break;
            }
            i++;
        }
        return source.substring(0, i);
    }

    function extractNameValuePair(source) {
        let buffer = source;
        let key = extractName(buffer);
        if (key.length === 0) {
            return;
        }
        buffer = buffer.substring(key.length).trim();
        key = toCanonicalKey(key);

        const operator = extractOperator(buffer);
        if (!operator) {
            return;
        }
        buffer = buffer.substring(operator.length).trim();
        let value = extractLiteral(buffer, '-_:/?&');
        if (value.length === 0) {
            return;
        }
        buffer = buffer.substring(value.length).replace(/^[\s,]*|\s*$/g, '');
        value = value.replace(/^['"`]+|['"`]+$/g, '').trim();
        let matchingMode = 'equals';
        if (operator === '*=') {
            matchingMode = 'contains';
        } else if (operator === '^=') {
            matchingMode = 'startsWith';
        } else if (operator === '$=') {
            matchingMode = 'endsWith';
        }
        return { key, value, matchingMode, length: source.length - buffer.length };
    }

    function extractOperator(source) {
        if (source.length >= 2 && ['*=', '^=', '$='].includes(source.substring(0, 2))) {
            return source.substring(0, 2);
        }
        if (source.startsWith('=')) {
            return '=';
        }
        return null;
    }

    function isMatch(haystack, needle, operator) {
        if (!haystack || !needle) {
            return false;
        }
        switch (operator) {
            case '*=':
                return haystack.includes(needle);
            case '^=':
                return haystack.startsWith(needle);
            case '$=':
                return haystack.endsWith(needle);
            default:
                return haystack === needle;
        }
    }

    function isNameCharacter(chr, extraChars = '-_') {
        return (chr >= 'A' && chr <= 'Z')
            || (chr >= 'a' && chr <= 'z')
            || (chr >= '0' && chr <= '9')
            || extraChars.includes(chr);
    }

    function toCanonicalKey(key) {
        const lowercase = key.toLowerCase();
        if (lowercase === 'label' || lowercase === 'fieldlabel') {
            return 'fieldLabel';
        }
        if (['attr', 'attribute', 'fieldAttr', 'fieldAttribute'].includes(lowercase)) {
            return 'fieldAttribute';
        }
        if (['href', 'location', 'path', 'url'].includes(lowercase)) {
            return 'href';
        }
        if (['container', 'parent', 'parentselector', 'within'].includes(lowercase)) {
            return 'parentSelector';
        }
        return lowercase;
    }

}(window.eai = window.eai || {}));