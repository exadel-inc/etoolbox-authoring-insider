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

    class TextBuilder {
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

        toString() {
            return this._value;
        }
    }

    ns.text = {
        TextBuilder
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

})(window.eai = window.eai || {});
