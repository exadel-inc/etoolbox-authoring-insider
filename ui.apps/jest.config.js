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

function JQuery(src) {
    const result = Object.create(JQuery.prototype);
    result.adaptTo = (adapter) => adaptTo(src, adapter);
    result.toString = () => 'jQuery';
    return result;
}

function adaptTo(src, adapter) {
    if (adapter === 'foundation-field' && Object.prototype.hasOwnProperty.call(src, 'foundation-field-value')) {
        return {
            getValue: () => src['foundation-field-value'],
            setValue: (value) => src['foundation-field-value'] = value,
        }
    }
    return null;
}

const config = {
    testEnvironment: 'jsdom',
    globals: {
        fetch,
        Granite: { $: JQuery },
    }
};

module.exports = config;