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
(function (window, $, ns) {
    'use strict';

    class IdCounter {
        constructor() {
            this.idCounter = {};
        }

        nextIndexedId(id) {
            const currentIndex = this.idCounter[id];
            if (currentIndex === undefined) {
                this.idCounter[id] = 0;
                return id + ':0';
            }
            this.idCounter[id] = currentIndex + 1;
            return id + ':' + (currentIndex + 1);
        }
    }

    ns.utils = {

        IdCounter,

        intern: function (source, target, options = {}) {
            Object.keys(source).forEach((key) => {
                if (options.exclude && options.exclude.includes(key)) {
                    return;
                }
                if (options.addPrefixTo && options.addPrefixTo.includes(key)) {
                    target['_' + key] = source[key];
                } else {
                    target[key] = source[key];
                }
            });
        },

        isAsyncFunction: function (value) {
            return ns.utils.isFunction(value) && value.constructor.name === 'AsyncFunction';
        },

        isFunction: function (value) {
            return typeof value === 'function';
        },

        isJquery: function (value) {
            return value instanceof $;
        },

        isHtmlElement: function (value) {
            return value instanceof HTMLElement;
        },

        isNumber: function (value) {
            return typeof value === 'number' && isFinite(value);
        },

        isObject: function (value) {
            return !!value && typeof value === 'object' && value.constructor === Object;
        },

        isObjectWithProperty: function (value, propName, propValue) {
            if (!ns.utils.isObject(value) || !propName) {
                return false;
            }
            if (!Object.prototype.hasOwnProperty.call(value, propName)) {
                return false;
            }
            return !propValue || value[propName] === propValue;
        },

        isString: function (value) {
            return typeof value === 'string' || value instanceof String;
        },
    };

})(window, Granite.$, window.eai = window.eai || {});
