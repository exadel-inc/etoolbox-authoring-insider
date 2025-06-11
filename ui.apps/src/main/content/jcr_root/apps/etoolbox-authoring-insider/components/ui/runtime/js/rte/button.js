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
(function (window, RTE) {
    'use strict';

    /**
     * Declares the Insider popup button for use with the RTE
     */
    RTE.ui.cui.InsiderPopupButton = new window.Class({
        extend: RTE.ui.cui.ElementImpl,

        /**
         * @override
         */
        notifyToolbar: function (toolbar, skipHandlers) {
            this.superClass.notifyToolbar.call(this, toolbar, skipHandlers);

            const $tbContainer = RTE.UIUtils.getToolbarContainer(toolbar.getToolbarContainer(), toolbar.tbType);
            $tbContainer.find('button[data-action="#insider"]').attr('title', this.tooltip.title);

            if (skipHandlers) {
                return;
            }

            const plugin = this.plugin;
            $tbContainer
                .off('.eai')
                .on('click.rte-handler.eai', '[data-eai-action]', async function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const action = e.target.closest('[data-eai-action]').dataset.eaiAction;
                    await plugin.execute('run', action);
                });
        }
    });

})(window, window.CUI.rte);
