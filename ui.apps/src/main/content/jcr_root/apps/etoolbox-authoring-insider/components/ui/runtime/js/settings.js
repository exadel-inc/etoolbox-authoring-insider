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

    ns.TITLE = 'EToolbox Authoring Insider';

    let settings = {};

    let settingsLoader = new Promise(async (resolve) => {
        try {
            settings = await ns.http.getJson('/content/etoolbox/authoring-insider/servlet/config.json');
        } catch (error) {
            console.error(`Failed to load ${ns.TITLE} settings`);
        }
        resolve(settings);
        settingsLoader = new Promise((resolve) => resolve(settings));
    });

    ns.settings = {
        ifAvailable: function () {
            return new Promise(async (resolve, reject) => {
                const hasProperties = (await settingsLoader).hasOwnProperty('tools');
                if (hasProperties) {
                    resolve();
                } else {
                    reject();
                }
            })
        },

        getToolSettings: async function (id) {
            const result = (await settingsLoader).tools || [];
            if (!id) {
                return result;
            }
            return result.filter(f => f.id === id) || [];
        },

        getProviderSettings: async function (id) {
            const result = (await settingsLoader).providers || [];
            if (!id) {
                return result;
            }
            return result.filter(p => p.id === id) || [];
        },
    };

})(window.eai = window.eai || {});

