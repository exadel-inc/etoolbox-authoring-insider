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
(function (document, ns) {
    'use strict';

    /**
     * A utility class for building a string from a template with named placeholders
     */
    class TextBuilder {
        /**
         * Creates a new instance of {@code TextBuilder}
         * @param {string} value - The template string
         */
        constructor(value) {
            this._placeholderIndex = 0;
            this._value = value ? value.toString() : '';
            if (!this._value.length) {
                return;
            }
            let bracketPos = this._value.indexOf('{{');
            while (bracketPos >= 0) {
                const closingBracketPos = this._value.indexOf('}}', bracketPos);
                if (closingBracketPos <= bracketPos) {
                    break;
                }
                if (!this._placeholders) {
                    this._placeholders = [];
                }
                this._placeholders.push({ start: bracketPos, end: closingBracketPos + 2 });
                bracketPos = this._value.indexOf('{{', closingBracketPos + 2);
            }
        }

        /**
         * Compiles the resulting string with the placeholders replaced by the provided values
         * @returns {string}
         */
        build() {
            if (!Array.isArray(this._placeholders) || this._placeholders.length === 0) {
                return this.toString();
            }
            for (let i = this._placeholders.length - 1; i >= 0; i--) {
                const placeholder = this._placeholders[i];
                this._value = this._value.substring(0, placeholder.start) +
                    (placeholder.content || '') +
                    this._value.substring(placeholder.end);
            }
            return this.toString();
        }

        /**
         * Fills in a placeholder with a value
         * @param {object} placeholder - The placeholder object
         * @param value - The value to fill in
         */
        fillIn(placeholder, value) {
            if (!ns.utils.isObjectWithProperty(placeholder, 'start')) {
                return;
            }
            const matchingPlaceholder = Array.isArray(this._placeholders) &&
                this._placeholders.find((p) => p.start === placeholder.start && p.end === placeholder.end);
            if (!matchingPlaceholder) {
                return;
            }
            matchingPlaceholder.content = value;
        }

        /**
         * Gets the next placeholder in the template
         * @returns {object|null}
         */
        nextPlaceholder() {
            if (!Array.isArray(this._placeholders) || this._placeholders.length <= this._placeholderIndex) {
                return null;
            }
            const matchingPlaceholder = this._placeholders[this._placeholderIndex];
            const content = this._value.substring(matchingPlaceholder.start, matchingPlaceholder.end);
            const result = Object.assign({}, matchingPlaceholder, parsePlaceholder(content));
            this._placeholderIndex++;
            return result;
        }

        /**
         * Gets the string representation of the current object
         * @returns {string}
         */
        toString() {
            return this._value;
        }
    }

    /**
     * Contains utility logic for working with text
     */
    ns.text = {
        TextBuilder,

        /**
         * Gets whether the provided value is falsy or else represents a blank string
         * @param value - The value to check
         * @returns {boolean}
         */
        isBlank,

        /**
         * Compacts the provided text to a single line string, removing all line breaks and extra spaces but preserving
         * dedicated line breaks if provided as {@code \\n}
         */
        singleLine,

        /**
         * Strips spaces and punctuation from the provided value
         * @param value {string|object} - The value to process. Can be a string or an object with an 'html' property
         * @returns {string|object}
         */
        stripSpacesAndPunctuation,

        /**
         * Given an HTML string, returns the text content without any HTML tags. If a falsy value is provided,
         * an empty string is returned
         * @param {string} html - The HTML string to process
         * @returns {string}
         */
        stripTags
    };

    function parsePlaceholder(value) {
        value = value.replace(/^[{\s]+|[}\s]+$/g, '');
        if (!value.includes('|')) {
            return { title: value.trim() };
        }
        const [titlePart, ...optionsPart] = value.split('|');
        let options;
        if (optionsPart.length === 1 && (optionsPart[0].includes(';') || optionsPart[0].includes(','))) {
            const optionsDelimiter = optionsPart[0].includes(';') ? ';' : ',';
            options = optionsPart[0].split(optionsDelimiter);
        } else {
            options = optionsPart;
        }
        options = options.map((item) => item.trim())
            .filter((item) => item.length > 0)
            .map((item) => {
                let indexOfKeyValueDelim = item.indexOf('=');
                if (indexOfKeyValueDelim < 0) {
                    indexOfKeyValueDelim = item.indexOf(':');
                }
                if (indexOfKeyValueDelim > 0) {
                    return {
                        label: item.substring(0, indexOfKeyValueDelim).trim(),
                        value: item.substring(indexOfKeyValueDelim + 1).trim()
                    };
                }
                return {
                    label: item.trim(),
                    value: item.trim()
                };
            });
        return { title: titlePart.trim(), options };
    }

    function isBlank(value) {
        if (!value) {
            return true;
        }
        if (ns.utils.isObject(value)) {
            return isBlank(value.html);
        }
        if (ns.utils.isHtmlElement(value)) {
            return isBlank(value.innerText);
        }
        if (ns.utils.isString(value)) {
            const textContent = /<\/?\w+/.test(value) ? stripTags(value) : value;
            return textContent.trim().length === 0;
        }
        return value.toString().trim().length === 0;
    }

    function singleLine(value) {
        if (!ns.utils.isString(value)) {
            return '';
        }
        return value.replace(/[\n\r\s]+/g, ' ').replace(/\\n/g, '\n');
    }

    function stripSpacesAndPunctuation(value) {
        const pattern = /^[\s.,'"`*]+|[\s.,'"`*]+$/g;
        if (ns.utils.isObjectWithProperty(value, 'html')) {
            value.html = value.html.replace(pattern, '');
            return value;
        }
        if (ns.utils.isString(value)) {
            return value.replace(pattern, '');
        }
        return '';
    }

    function stripTags(html) {
        if (!html) {
            return '';
        }
        const container = document.createElement('div');
        container.innerHTML = html;
        return container.textContent;
    }
})(document, window.eai = window.eai || {});
