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

    let settings;

    async function loadSettings() {
        if (settings !== undefined) {
            return settings;
        }
        try {
            settings = await ns.http.getJson('/content/etoolbox/authoring-insider/servlet/config.json');
            return settings;
        } catch (error) {
            console.error(`Failed to load ${ns.TITLE} settings`);
            settings = null;
            throw error;
        }
    }

    async function extractSettings(namespace, id) {
        const result = await loadSettings();
        if (result === null) {
            return null;
        }
        if (!id) {
            return result[namespace] || [];
        }
        return (result[namespace] || []).filter(f => f.id === id) || [];
    }

    ns.settings = {
        getToolSettings: async function (id) {
            return await extractSettings('tools', id);
        },

        getProviderSettings: async function (id) {
            return await extractSettings('providers', id);
        },
    };

})(window.eai = window.eai || {});
