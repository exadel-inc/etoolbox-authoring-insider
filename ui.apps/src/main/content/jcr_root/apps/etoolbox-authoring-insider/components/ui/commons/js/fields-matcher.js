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
            if (source[0] === '@') {
                this._requirement = true;
                source = source.substring(1).trim();
            }
            if (!/^[A-Za-z]/.test(source)) {
                this.selector = source;
                return;
            }
            while (source.length) {
                const nameValue = extractNameValuePair(source);
                if (!nameValue) {
                    this.selector = appendIfNeeded(this.selector, source.trim());
                    return;
                }
                this[nameValue.key] = nameValue.value;
                this[nameValue.key + 'Matching'] = nameValue.operator;
                source = source.substring(nameValue.length).trim();
            }
            if (source.length) {
                this.selector = appendIfNeeded(this.selector, source.trim());
            }
        }

        /**
         * Gets whether the criteria stored in the current instance is a requirement (i.e., it combines with other
         * matchers in a set using the AND operator)
         */
        get isRequirement() {
            if (this._requirement) {
                return true;
            }
            const operators = Object.keys(this).filter((key) => key.endsWith('Matching'));
            return operators.length > 0 && operators.every((key) => this[key] === '!=');
        }

        /**
         * Checks if the field matches the criteria
         * @param field - A DOM element
         * @returns {boolean} - Match result
         */
        matches(field) {
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
            if (this['ui'] && !this.isMatchByUi(field)) {
                return false;
            }
            if (this['parentSelector'] && !this.isMatchByParentSelector(field)) {
                return false;
            }
            if (this['fieldName'] && !this.isMatchByFieldName(field)) {
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
        getOperator(key) {
            return this[key + 'Matching'] || '=';
        }

        /**
         * @private
         */
        isMatchByComponent(field) {
            const operator = this.getOperator('component');
            const dialog = field.closest('.cq-dialog');
            const header = dialog ? dialog.querySelector('.cq-dialog-header') : null;
            if (!header) {
                return operator === '!=';
            }
            return isMatch(header.textContent.trim(), this['component'], operator);
        }

        /**
         * @private
         */
        isMatchByFieldAttribute(field) {
            const operator = this.getOperator('fieldAttribute');
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
            const operator = this.getOperator('fieldName');
            const coralFormField = field.closest('.coral-Form-field');
            if (!coralFormField) {
                return operator === '!=';
            }
            const name = this['fieldName'];
            const variants = Array.isArray(name) ? [].concat(...name) : [name];
            if ((operator === '=' || operator === '^=') ) {
                // Supplement provided filed name(-s) with the variants that start with "./"
                variants.filter((v) => !v.startsWith('./')).forEach((v) => variants.push(`./${v}`));
            }
            for (const variant of variants) {
                const selector = operator !== '!=' ? `[name${operator}"${variant}"]` : `:not([name*="${variant}"])`;
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
            const operator = this.getOperator('fieldLabel');
            const coralFormFieldWrapper = field.closest('.coral-Form-fieldwrapper');
            const label = coralFormFieldWrapper ? coralFormFieldWrapper.querySelector('label') : null;
            if (!label) {
                return operator === '!=';
            }
            const labelValue = this['fieldLabel'];
            return isMatch(label.textContent.trim(), labelValue, operator);
        }

        /**
         * @private
         */
        isMatchByHref() {
            const operator = this.getOperator('href');
            return isMatch(window.location.href, this['href'], operator);
        }

        /**
         * @private
         */
        isMatchByParentSelector(field) {
            const operator = this.getOperator('parentSelector');
            if (operator !== '=') {
                console.error('Unsupported operator for the "parentSelector" property');
                return false;
            }
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
            const operator = this.getOperator('tab');
            const panel = field.closest('coral-panel');
            if (!panel || !panel.parentElement) {
                return operator === '!=';
            }
            const panelOrdinal = Array.from(panel.parentElement.children).indexOf(panel);
            const tabView = panel.closest('coral-tabview');
            const tabList = tabView && tabView.querySelector('coral-tablist');
            const tab = tabList && tabList.children[panelOrdinal];
            if (!tab) {
                return false;
            }
            return isMatch(tab.textContent.trim(), this['tab'], operator);
        }

        /**
         * @private
         */
        isMatchByUi(field) {
            const operator = this.getOperator('ui');
            if (operator !== '=' && operator !== '!=') {
                console.error('Unsupported operator for the "ui" property');
                return false;
            }
            let uiValue = this['ui'];
            uiValue = Array.isArray(uiValue) ? uiValue : [uiValue];
            let result = false;
            for (const ui of uiValue) {
                if (ui === 'dialog') {
                    if (field.closest('coral-dialog')) {
                        result = true;
                        break;
                    }
                } else if (ui === 'pageProperties') {
                    if (field.closest('.cq-siteadmin-admin-properties')) {
                        result = true;
                        break;
                    }
                } else if (ui === 'inPlace') {
                    if (field.closest('inplace-editor')) {
                        result = true;
                        break;
                    }
                }
            }
            return operator === '=' ? result : !result;
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
        key = normalizeKey(key);

        const operator = extractOperator(buffer);
        if (!operator) {
            return;
        }
        buffer = buffer.substring(operator.length).trim();
        let value;
        let nextLiteral;
        while (buffer.length > 0) {
            nextLiteral = extractLiteral(buffer, '-_:/?&');
            if (nextLiteral.length === 0) {
                break;
            }
            buffer = buffer.substring(nextLiteral.length).trim();
            nextLiteral = nextLiteral.replace(/^['"`]+|['"`]+$/g, '').trim();
            nextLiteral = normalizeValue(nextLiteral, key);
            if (!value) {
                value = nextLiteral;
            } else {
                if (!Array.isArray(value)) {
                    value = [value];
                }
                value.push(nextLiteral);
            }
            if (buffer.length === 0 || buffer[0] !== '|') {
                break;
            }
            buffer = buffer.substring(1).trim();
        }
        buffer = buffer.replace(/^[\s,]*/, '');
        return { key, value, operator, length: source.length - buffer.length };
    }

    function extractOperator(source) {
        if (source.length >= 2 && ['*=', '^=', '$=', '!='].includes(source.substring(0, 2))) {
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
        const needles = Array.isArray(needle) ? needle : [needle];
        for (const n of needles) {
            if (isMatchSingle(haystack, n, operator)) {
                return true;
            }
        }
        return false;
    }

    function isMatchSingle(haystack, needle, operator, ci) {
        switch (operator) {
            case '*=':
                return haystack.toLowerCase().includes(needle.toLowerCase());
            case '^=':
                return haystack.startsWith(needle);
            case '$=':
                return haystack.endsWith(needle, ci);
            case '!=':
                return !haystack.includes(needle, ci);
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

    function normalizeKey(value) {
        const lowercase = value.toLowerCase();
        if (lowercase === 'label' || lowercase === 'fieldlabel') {
            return 'fieldLabel';
        }
        if (['attr', 'attribute', 'fieldAttr', 'fieldAttribute'].includes(lowercase)) {
            return 'fieldAttribute';
        }
        if (['href', 'location', 'path', 'url'].includes(lowercase)) {
            return 'href';
        }
        if (['name', 'fieldname'].includes(lowercase)) {
            return 'fieldName';
        }
        if (['container', 'parent', 'parentselector'].includes(lowercase)) {
            return 'parentSelector';
        }
        return lowercase;
    }

    function normalizeValue(value, key) {
        if (key !== 'ui') {
            return value;
        }
        if (['page', 'page properties', 'properties'].includes(value.toLowerCase())) {
            return 'pageProperties';
        }
        if (['inplace', 'in-place'].includes(value.toLowerCase())) {
            return 'inPlace';
        }
        return value.toLowerCase();
    }

}(window.eai = window.eai || {}));