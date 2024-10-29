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
(function (document, $, ns) {
    'use strict';

    const CLS_MANAGED = 'js-eai-managed';

    const FRAGMENT_TEMPLATES = '[coral-multifield-template]';
    const INSTRUMENTATION_HOOKS = '.coral-Form-field[type="text"][name], textarea[name]';

    document.addEventListener('DOMContentLoaded', onLoad);
    createAllInsiderObjects();

    function onLoad() {
        const pagePropertiesForm = document.querySelector('.cq-siteadmin-admin-properties');
        if (pagePropertiesForm) {
            pagePropertiesForm.querySelectorAll(INSTRUMENTATION_HOOKS).forEach((field) => ns.controls.handleField(field));
            pagePropertiesForm.querySelectorAll(FRAGMENT_TEMPLATES).forEach((template) => {
                template.content.querySelectorAll(INSTRUMENTATION_HOOKS).forEach((field) => ns.controls.handleField(field));
            });
        } else {
            $(document).on('coral-overlay:beforeopen', 'coral-dialog', onDialogOpen);
        }
    }

    function onDialogOpen(event) {
        if (!event.target.matches('coral-dialog') || event.target.matches('.eai-dialog,.' + CLS_MANAGED)) {
            return;
        }
        const dialog = event.target;
        dialog.classList.add(CLS_MANAGED);
        dialog.querySelectorAll(INSTRUMENTATION_HOOKS).forEach((field) => ns.controls.handleField(field));
        dialog.querySelectorAll(FRAGMENT_TEMPLATES).forEach((template) => {
            template.content.querySelectorAll(INSTRUMENTATION_HOOKS).forEach((field) => ns.controls.handleField(field));
        });
    }

    function createAllInsiderObjects() {
        createInsiderObjects(ns.tools, ns.settings.getToolSettings)
            .then(() => createInsiderObjects(ns.providers, ns.settings.getProviderSettings));
    }

    function createInsiderObjects(namespace, settingsSupplier) {
        const models = namespace.getModels();
        return settingsSupplier().then((loadedSettings) => {
            if (!loadedSettings) {
                return;
            }
            while (models.length) {
                const model = models.pop();
                const matchingSettings = loadedSettings.filter((settings) => settings.type === model.id);
                matchingSettings
                    .filter((settings) => settings.enabled)
                    .forEach((settings) => namespace.addInstance(settings));
                if (!matchingSettings.length) {
                    namespace.addInstance(model);
                }
            }
        });
    }

})(document, Granite.$, window.eai = window.eai || {});
