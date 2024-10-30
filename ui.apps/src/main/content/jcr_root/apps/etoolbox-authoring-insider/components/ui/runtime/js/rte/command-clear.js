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
(function (RTE) {
    'use strict';

    // noinspection JSUnusedGlobalSymbols
    /**
     * Registers the Clear command with the RTE
     */
    const ClearCommand = new window.Class({

        extend: RTE.commands.Command,

        toString: 'ClearCommand',

        /**
         * @override
         */
        isCommand: function (cmdStr) {
            return cmdStr === 'clear';
        },

        /**
         * @override
         */
        getProcessingOptions: function () {
            return RTE.commands.Command.PO_NODELIST;
        },

        /**
         * @override
         */
        execute: function (execDef) {
            const root = execDef.editContext.root;
            while (root.childNodes.length) {
                root.childNodes[0].remove();
            }
            RTE.DomProcessor.ensureMinimumContent(execDef.editContext);
        }
    });

    RTE.commands.CommandRegistry.register('clear', ClearCommand);

})(window.CUI.rte);
