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

    /**
     * Helps to generate unique ids by assigning numeric indexes
     */
    class IdCounter {
        /**
         * Creates a new instance of {@code IdCounter}
         */
        constructor() {
            this.idCounter = {};
        }

        /**
         * Returns the next indexed id
         * @param {string} id - The base identifier
         * @returns {string}
         */
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

    /**
     * Contains logic for common reflective operations and object manipulations
     */
    ns.utils = {

        IdCounter,

        /**
         * Copies properties from the source object into a target object with optional filtering and prefixing
         * @param {Object} source - The source object
         * @param {Object} target - The target object
         * @param {Object} options - Parameters for filtering and prefixing
         * @param {Array} options.exclude - Properties to exclude
         * @param {Array} options.addPrefixTo - Properties to prefix with an underscore
         */
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

        /**
         * Checks if a value is an async function
         * @param value - The value to check
         * @returns {boolean}
         */
        isAsyncFunction: function (value) {
            return ns.utils.isFunction(value) && value.constructor.name === 'AsyncFunction';
        },

        /**
         * Checks if a value is falsy or else represents a blank string
         * @param value - The value to check
         * @returns {boolean}
         */
        isBlank: function (value) {
            if (!value) {
                return true;
            }
            return value.toString().trim().length === 0;
        },

        /**
         * Checks if a value is a function
         * @param value - The value to check
         * @returns {boolean}
         */
        isFunction: function (value) {
            return typeof value === 'function';
        },

        /**
         * Checks if a value is a {@code jQuery} object
         * @param value - The value to check
         * @returns {boolean}
         */
        isJquery: function (value) {
            return value instanceof $;
        },

        /**
         * Checks if a value is an HTML element
         * @param value - The value to check
         * @returns {boolean}
         */
        isHtmlElement: function (value) {
            return value instanceof HTMLElement;
        },

        /**
         * Checks if a value is a number
         * @param value - The value to check
         * @returns {boolean}
         */
        isNumber: function (value) {
            return typeof value === 'number' && isFinite(value);
        },

        /**
         * Checks if a value is an object
         * @param value - The value to check
         * @returns {boolean}
         */
        isObject: function (value) {
            return !!value && typeof value === 'object' && value.constructor === Object;
        },

        /**
         * Checks if a value is an object with the specified property
         * @param value - The value to check
         * @param {string} propName - The property name
         * @param {*|string=} propValue - The property value
         * @returns {boolean}
         */
        isObjectWithProperty: function (value, propName, propValue) {
            if (!ns.utils.isObject(value) || !propName) {
                return false;
            }
            if (!Object.prototype.hasOwnProperty.call(value, propName)) {
                return false;
            }
            return !propValue || value[propName] === propValue;
        },

        /**
         * Checks if a value is a string
         * @param value - The value to check
         * @returns {boolean}
         */
        isString: function (value) {
            return typeof value === 'string' || value instanceof String;
        },
    };

})(window, Granite.$, window.eai = window.eai || {});
