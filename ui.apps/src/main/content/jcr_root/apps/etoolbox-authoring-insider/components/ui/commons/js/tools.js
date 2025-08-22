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
     * Represents a tool model
     */
    class ToolModel {
        /**
         * Creates a new instance of {@code ToolModel}
         * @param {object} options - The tool model options
         */
        constructor(options = {}) {
            this.icon = options.icon;
            this.id = options.id;
            this.isTemplate = options.isTemplate;
            this.handle = options.handle;
            this.isMatch = options.isMatch;
            this.isValid = options.isValid;
            this.requires = options.requires;
            this.settings = options.settings;
            this.title = options.title;
        }
    }

    /**
     * Represents a tool instance
     */
    class Tool {
        /**
         * Creates a new instance of {@code Tool}
         * @param {ToolModel} model - The tool model
         * @param {Object} options - The tool instance options
         */
        constructor(model, options = {}) {
            this._model = model;
            this.id = idCounter.nextIndexedId(model.id);
            if (Array.isArray(model.settings) && model.settings.some((setting) => setting.defaultValue !== undefined)) {
                const defaults = {};
                model.settings
                    .filter((setting) => setting.defaultValue !== undefined)
                    .forEach((setting) => {
                        defaults[setting.name] = setting.defaultValue;
                    });
                options = Object.assign({}, defaults, options);
            }
            ns.utils.intern(options, this, { exclude: ['id', 'isMatch'], addPrefixTo: ['icon', 'ordinal', 'title'] });
            this._handle = model.handle && model.handle.bind(this);
            const _isMatch = options.isMatch || model.isMatch;
            if (ns.utils.isFunction(_isMatch)) {
                this._isMatch = _isMatch.bind(this);
            }
            const _isValid = options.isValid || model.isValid;
            if (ns.utils.isFunction(_isValid)) {
                this._isValid = _isValid.bind(this);
            }
        }

        /**
         * Gets the tool icon
         * @returns {*|string}
         */
        get icon() {
            return this['_icon'] || this._model.icon;
        }

        /**
         * Gets the tool ordinal
         * @returns {number}
         */
        get ordinal() {
            return !isNaN(this['_ordinal']) ? this['_ordinal'] : Number.MAX_SAFE_INTEGER;
        }

        /**
         * Gets the providers matching the current tool instance
         * @returns {Provider[]}
         */
        get providers() {
            if (!this._providers) {
                if (!Array.isArray(this._model.requires)) {
                    this._providers = [{ id: this.id, title: this.title }];
                } else {
                    const self = this;
                    this._providers = ns.providers.forRequirements(this._model.requires)
                        .map((provider) => {
                            return { id: self.id + '@' + provider.id, title: provider.title, icon: provider.icon };
                        });
                }
            }
            return this._providers;
        }

        /**
         * Gets the tool title
         * @returns {*|string}
         */
        get title() {
            return this['_title'] || this._model.title || this.id;
        }

        /**
         * Gets whether the tool instance is valid
         * @returns {boolean}
         */
        get valid() {
            if (ns.utils.isFunction(this._isValid)) {
                return this._isValid();
            }
            return true;
        }

        /**
         * Performs an operation against a field
         * @param {Element} field - The field to operate on
         * @param {*|string} providerId - ID of the provider to use for the operation
         * @returns {Promise<void>}
         */
        async handle(field, providerId) {
            if (!this._handle) {
                return;
            }
            providerId = ns.utils.isString(providerId) && providerId.includes('@') ?
                providerId.split('@')[1] :
                (this.providers.length > 0 ? this.providers[0].id : null);
            await this._handle(field, providerId);
        }

        /**
         * Checks if the tool instance matches a given {@code field}
         * @param {Element} field - The field to match against
         * @returns {boolean}
         */
        matches(field) {
            if (!field) {
                return false;
            }
            let selectors = this['selectors'];
            if (ns.utils.isString(selectors)) {
                selectors = [selectors];
            }
            if (Array.isArray(selectors) && selectors.length > 0) {
                if (isStringArray(selectors)) {
                    selectors = selectors.map((selector) => new ns.fields.Matcher(selector));
                    this['selectors'] = selectors;
                }
                const requirements = selectors.filter((selector) => selector.isRequirement);
                const options = selectors.filter((selector) => !selector.isRequirement);
                const allRequirementsMatched = requirements.every((requirement) => requirement.matches(field));
                const someOptionsMatched = options.length === 0 || options.some((option) => option.matches(field));
                return allRequirementsMatched && someOptionsMatched;
            }
            const isTextField = !field.matches('.cq-ui-tagfield');
            if (ns.utils.isFunction(this._isMatch)) {
                const resultByIsMatch = this._isMatch(field);
                return resultByIsMatch !== undefined ? resultByIsMatch : isTextField;
            }
            return isTextField;
        }
    }

    /**
     * Contains tool-related functionality
     */
    ns.tools = {
        /**
         * Adds a tool instance to the working set
         * @param {*|ToolModel} options - The tool model or a dictionary of options
         */
        addInstance: function (options) {
            if (options.type) {
                // This is an instance
                const model = models[options.type];
                if (!model) {
                    console.error('Tool model not found', options.id);
                    return;
                }
                instances.push(new Tool(model, options));
            } else {
                // This is a settings-less model
                const model = new ToolModel(options);
                if (!model.id || !ns.utils.isFunction(model.handle)) {
                    console.error('Invalid tool', options);
                    return;
                }
                instances.push(new Tool(model));
            }
            instances.sort((a, b) => a.ordinal - b.ordinal);
        },

        /**
         * Clears all tool instances from the working set
         */
        clearAll: function () {
            instances.splice(0, instances.length);
        },

        /**
         * Gets a tool instance by its {@code id}
         * @param {string} id - The tool instance id
         * @returns {Tool|null}
         */
        getInstance: function (id) {
            if (!ns.utils.isString(id)) {
                return null;
            }
            if (id.includes('@')) {
                id = id.split('@')[0];
            }
            if (id.includes(':')) {
                return instances.find((item) => item.id === id);
            } else {
                return instances.find((item) => item.id === id || item.id.startsWith(id + ':'));
            }
        },

        /**
         * Gets all tool instances available for a given {@code field}
         * @param {Element} field - The field to match against
         * @returns {*[]}
         */
        forField: function (field) {
            if (!field) {
                return [];
            }
            return instances.filter((item) => item.valid && item.matches(field) && item.providers.length > 0);
        },

        /**
         * Gets all registered tool models
         * @returns {ToolModel[]}
         */
        getModels: function () {
            return Object.values(models);
        },

        /**
         * Registers a tool model
         * @param {Object} options - The tool model options
         */
        register: function (options) {
            const model = new ToolModel(options);
            if (!model.id || !ns.utils.isFunction(model.handle)) {
                console.error('Invalid tool', options);
                return;
            }
            models[model.id] = model;
        },

        /**
         * Removes a tool model by its {@code id}
         * @param {string} id - The tool model id
         */
        unregister: function (id) {
            delete models[id];
            instances.splice(0, instances.length, ...instances.filter((item) => item._model.id !== id));
        }
    };

    function isStringArray(value) {
        return Array.isArray(value) && value.every((item) => ns.utils.isString(item));
    }

})(window.eai = window.eai || {});
