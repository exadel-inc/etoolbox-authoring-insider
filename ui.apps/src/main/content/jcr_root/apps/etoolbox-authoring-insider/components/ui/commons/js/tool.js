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

    class Tool {
        constructor(options = {}) {
            this.icon = options.icon;
            this.id = options.id;
            this.isTemplate = options.isTemplate;
            this.handle = options.handle;
            this.isMatch = options.isMatch;
            this.requires = options.requires;
            this.settings = options.settings;
            this.title = options.title;
        }

        get valid() {
            return this.id && this.handle;
        }
    }

    class ToolInstance {
        constructor(model, options = {}) {
            this._model = model;
            this.id = idCounter.nextIndexedId(model.id);
            ns.utils.intern(options, this, { exclude: ['id'], prefix: ['icon', 'ordinal', 'title'] });
            this._handle = model.handle && model.handle.bind(this);
            const _isMatch = options.isMatch || model.isMatch;
            if (ns.utils.isFunction(_isMatch)) {
                this._isMatch = _isMatch.bind(this);
            }
        }

        get icon() {
            return this['_icon'] || this._model.icon;
        }

        get ordinal() {
            return !isNaN(this['_ordinal']) ? this['_ordinal'] : Number.MAX_SAFE_INTEGER;
        }

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

        get title() {
            return this['_title'] || this._model.title || this.id;
        }

        async handle(field, id, options) {
            if (!this._handle) {
                return;
            }
            const providerId = ns.utils.isString(id) && id.includes('@')
                ? id.split('@')[1]
                : (this.providers.length > 0 ? this.providers[0].id : null);
            await this._handle(field, providerId, options);
        }

        matches(field) {
            if (!field) {
                return false;
            }
            if (ns.utils.isFunction(this._isMatch)) {
                return this._isMatch(field);
            }
            let selectors = this['selectors'];
            if (!selectors) {
                return true;
            }
            if (ns.utils.isString(selectors)) {
                selectors = [selectors];
            } else if (!Array.isArray(selectors) || selectors.length === 0) {
                return true;
            }
            if (isStringArray(selectors)) {
                selectors = selectors.map((selector) => new ns.fields.Matcher(selector));
                this['selectors'] = selectors;
            }
            const straightSelectors = selectors.filter((selector) => !selector.inverted);
            const invertedSelectors = selectors.filter((selector) => selector.inverted);
            return (straightSelectors.length === 0 || straightSelectors.some((selector) => selector.matches(field)))
                && (invertedSelectors.every((selector) => selector.matches(field)));
        }
    }

    ns.tools = {
        addInstance: function (options = {}) {
            if (options.type) {
                // This is an instance
                const model = models[options.type];
                if (!model) {
                    console.error('Tool model not found', options.id);
                    return;
                }
                instances.push(new ToolInstance(model, options));
            } else {
                // This is a settings-less model
                instances.push(new ToolInstance(options));
            }
            instances.sort((a, b) => a.ordinal - b.ordinal);
        },

        getInstance: function (id) {
            if (!ns.utils.isString(id)) {
                return null;
            }
            if (id.includes('@')) {
                id = id.split('@')[0];
            }
            return instances.find((item) => item.id === id);
        },

        getModels: function () {
            return Object.values(models);
        },

        forField: function (field) {
            if (!field) {
                return [];
            }
            return instances.filter((item) => item.matches(field) && item.providers.length > 0);
        },

        register: function (options) {
            const model = new Tool(options);
            if (!model.valid) {
                console.error('Invalid tool', options);
                return;
            }
            models[model.id] = model;
        },

        unregister: function (id) {
            delete models[id];
            instances.splice(0, instances.length, ...instances.filter((item) => item._model.id !== id));
        }
    };

    function isStringArray(value) {
        return Array.isArray(value) && value.every((item) => ns.utils.isString(item));
    }

})(window.eai = window.eai || {});
