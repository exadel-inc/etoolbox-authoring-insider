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

    const models = {};
    const instances = [];
    const idCounter = new ns.utils.IdCounter();

    /**
     * Represents a provider model
     */
    class ProviderModel {
        /**
         * Creates a new instance of {@code ProviderModel}
         * @param {object} options - The provider model options
         */
        constructor(options = {}) {
            this.icon = options.icon;
            this.id = options.id;
            this.isTemplate = options.isTemplate;
            this.title = options.title;
            this.settings = options.settings;
            Object.keys(options)
                .filter((key) => ns.utils.isFunction(options[key]))
                .forEach((key) => {
                    this[key] = options[key];
                });
        }
    }

    /**
     * Represents a provider instance
     */
    class Provider {
        /**
         * Creates a new instance of {@code Provider}
         * @param {ProviderModel} model - The provider model
         * @param {Object} options - The provider instance options
         */
        constructor(model, options = {}) {
            this._model = model;
            this.id = idCounter.nextIndexedId(model.id);
            ns.utils.intern(options, this, { exclude: ['id'], addPrefixTo: ['icon', 'ordinal', 'title'] });
            Object.keys(model)
                .filter((key) => ns.utils.isFunction(model[key]))
                .forEach((key) => {
                    this[key] = model[key].bind(this);
                });
        }

        get icon() {
            return this['_icon'] || this._model.icon;
        }

        get ordinal() {
            return !isNaN(this['_ordinal']) ? this['_ordinal'] : Number.MAX_SAFE_INTEGER;
        }

        get title() {
            return this['_title'] || this._model.title || this.id;
        }

        get valid() {
            if (ns.utils.isFunction(this['isValid'])) {
                // noinspection JSValidateTypes
                return this['isValid']();
            }
            return true;
        }

        matches(requirements) {
            if (!Array.isArray(requirements)) {
                return true;
            }
            let support = this['supports'];
            if (ns.utils.isString(support)) {
                support = [support];
            }
            return requirements.every((req) => {
                // If the provider contains a function named "supports", the decision is up to that function
                if (ns.utils.isFunction(support)) {
                    return support(req);
                }
                // We do not test non-expected requirements
                if (!ns.utils.isString(req)) {
                    return true;
                }
                // If the requirement is a "key=value" expression, we test it against the provider's properties
                if (req.includes('=')) {
                    const [key, value] = req.split('=');
                    return this[key.trim()] === value.trim();
                }
                // If the requirement matches the name of a provider's method, we return true unless
                // the method is explicitly banned by a string like "!myMethod" in the array of supported tokens
                if (ns.utils.isFunction(this[req])) {
                    return !Array.isArray(support) || !support.includes('!' + req);
                }
                // If there is an array of supported tokens, we process it as specified in the README
                if (Array.isArray(support)) {
                    if (support.length === 0) {
                        return true;
                    }
                    let allowByDefault = false;
                    for (const item of support) {
                        if (item.startsWith('!')) {
                            allowByDefault = true;
                        }
                        if (item === req || item.startsWith(req.replace(/\.+$/, '') + '.')) {
                            return true;
                        } else if (item === '!' + req || item.startsWith('!' + req.replace(/\.+$/, '') + '.')) {
                            return false;
                        }
                    }
                    return allowByDefault;
                }
                // If the provider has no specific requirements, we return true
                return true;
            });
        }
    }

    /**
     * Contains provider-related functionality
     */
    ns.providers = {
        /**
         * Adds a new provider instance to the working set
         * @param {*|ProviderModel} options - The provider model or a dictionary of options
         */
        addInstance: function (options) {
            if (options.type) {
                // This is an instance
                const model = models[options.type];
                if (!model) {
                    console.error('Provider model not found', options.id);
                    return;
                }
                instances.push(new Provider(model, options));
            } else {
                // This is a settings-less model
                instances.push(new Provider(options));
            }
            instances.sort((a, b) => a.ordinal - b.ordinal);
        },

        /**
         * Clears all provider instances from the working set
         */
        clearAll: function () {
            instances.splice(0, instances.length);
        },

        /**
         * Retrieves a provider instance by its id
         * @param {string} id - The provider instance id
         * @returns {Provider|null}
         */
        getInstance: function (id) {
            if (!ns.utils.isString(id)) {
                return null;
            }
            if (id.includes('@')) {
                id = id.split('@')[1];
            }
            if (id.includes(':')) {
                return instances.find((item) => item.id === id);
            } else {
                return instances.find((item) => item.id === id || item.id.startsWith(id + ':'));
            }
        },

        /**
         * Retrieves all provider instances that match the given requirements
         * @param value - The requirements to match against
         * @returns {Provider[]}
         */
        forRequirements: function (value) {
            if (!value) {
                return [];
            }
            value = Array.isArray(value) ? value : [value];
            return instances.filter((item) => item.valid && item.matches(value));
        },

        /**
         * Gets all registered provider models
         * @returns {ProviderModel[]}
         */
        getModels: function () {
            return Object.values(models);
        },

        /**
         * Registers a new provider model
         * @param {Object} options - The tool model options
         */
        register: function (options) {
            const model = new ProviderModel(options);
            if (!isValid(model)) {
                console.error('Invalid provider', options);
                return;
            }
            models[model.id] = model;
        },

        /**
         * Unregisters a provider model by its id
         * @param {string} id - The provider model id
         */
        unregister: function (id) {
            delete models[id];
        }
    };

    function isValid(model) {
        return model && !!model.id;
    }

})(window.eai = window.eai || {});
