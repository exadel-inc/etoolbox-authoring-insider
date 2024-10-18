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

    class Provider {
        constructor(options = {}) {
            this.icon = options.icon;
            this.id = options.id;
            this.isTemplate = options.isTemplate;
            this.title = options.title;
            this.settings = options.settings;
            Object.keys(options)
                .filter((key) => ns.utils.isFunction(options[key]))
                .forEach((key) => this[key] = options[key]);
        }

        get valid() {
            return this.id && this.title;
        }
    }

    class ProviderInstance {
        constructor(model, options = {}) {
            this._model = model;
            this.id = idCounter.nextIndexedId(model.id);
            ns.utils.intern(options, this, { exclude: ['id'], prefix: ['icon', 'ordinal', 'title'] });
            Object.keys(model)
                .filter((key) => ns.utils.isFunction(model[key]))
                .forEach((key) => this[key] = model[key].bind(this));
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

        matches(requirements) {
            if (!Array.isArray(requirements)) {
                return true;
            }
            let support = this['supports'];
            if (ns.utils.isString(support)) {
                support = [support];
            }
            return requirements.every((req) => {
                if (!ns.utils.isString(req)) {
                    return true;
                }
                if (req.includes('=')) {
                    const [key, value] = req.split('=');
                    return this[key.trim()] === value.trim();
                }
                if (ns.utils.isFunction(this[req])) {
                    return true;
                }
                if (ns.utils.isFunction(support)) {
                    return support(req);
                }
                if (Array.isArray(support)) {
                    if (support.length === 0) {
                        return true;
                    }
                    let allowByDefault = true;
                    for (const item of support) {
                        if (item === '*') {
                            allowByDefault = true;
                        } else if (!item.startsWith('!')) {
                            allowByDefault = false;
                        } else if (item === req) {
                            return true;
                        } else if (item === '!' + req) {
                            return false;
                        }
                    }
                    return allowByDefault
                }
                return true;
            });
        }
    }

    ns.providers = {
        addInstance: function (options = {}) {
            if (options.type) {
                // This is an instance
                const model = models[options.type];
                if (!model) {
                    console.error('Provider model not found', options.id);
                    return;
                }
                instances.push(new ProviderInstance(model, options));
            } else {
                // This is a settings-less model
                instances.push(new ProviderInstance(options));
            }
            instances.sort((a, b) => a.ordinal - b.ordinal);
        },

        getInstance: function (id) {
            if (!ns.utils.isString(id)) {
                return null;
            }
            if (id.includes('@')) {
                id = id.split('@')[1];
            }
            return instances.find((item) => item.id === id);
        },

        getModels: function () {
            return Object.values(models);
        },

        forRequirements: function (value) {
            if (!value) {
                return [];
            }
            value = Array.isArray(value) ? value : [value];
            return instances.filter((item) => item.matches(value));
        },

        register: function (value) {
            const model = new Provider(value);
            if (!model.valid) {
                console.error('Invalid provider', value);
                return;
            }
            models[model.id] = model;
        },

        unregister: function (id) {
            delete models[id];
        }
    };
})(window.eai = window.eai || {});

