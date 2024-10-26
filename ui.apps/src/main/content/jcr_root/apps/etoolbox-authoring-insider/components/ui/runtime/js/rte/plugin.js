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
(function (window, document, RTE, ns) {
    'use strict';

    const FEATURE = 'insider';
    const GROUP = FEATURE;

    const CUI_NAMESPACES = ['inline', 'fullscreen', 'dialogFullScreen'];

    // noinspection JSUnusedGlobalSymbols
    /**
     * Registers the Insider plugin with the RTE
     */
    const Plugin = new window.Class({
        extend: RTE.plugins.Plugin,

        /**
         * @private
         */
        _field: null,

        /**
         * @override
         */
        getFeatures: function () {
            return [FEATURE];
        },

        /**
         * @override
         */
        initializeUI: function (tbGenerator, context) {
            // Find matching tools; early return if none found
            let targetField = context.$editable.closest('.coral-Form-field')[0];
            if (!targetField) {
                const inplaceConfig = context.$editable.data('config');
                if (ns.utils.isObject(inplaceConfig)) {
                    targetField = createInplaceFieldSubstitution(inplaceConfig);
                }
            }
            this._tools = ns.tools.forField(targetField);
            if (!this._tools.length) {
                return;
            }

            // Prepare the field facade for use with tool handlers
            this._field = new ns.ui.rte.FieldFacade(context.$editable[0], this);

            // Register the feature
            this.config.features.push(FEATURE);

            // Register the toolbar button
            const toolbarButton = new RTE.ui.cui.InsiderPopupButton(FEATURE, this, false, { title: ns.TITLE });
            tbGenerator.addElement(GROUP, 999, toolbarButton, 10);
            tbGenerator.registerIcon('#' + FEATURE, ns.icons.DEFAULT);
            CUI_NAMESPACES.forEach((ns) => {
                const cui = context.uiSettings.cui[ns];
                if (!cui) {
                    return;
                }
                let toolbar = cui.toolbar;
                if (!Array.isArray(toolbar)) {
                    toolbar = cui.toolbar = [];
                }
                toolbar.push('#' + FEATURE);
            });

            // Register the popover
            const popoverDefinition = {
                ref: FEATURE,
                items: 'insider:getTools:insider-dropdown',
            };
            CUI_NAMESPACES.forEach((ns) => {
                const cui = context.uiSettings.cui[ns];
                if (!cui) {
                    return;
                }
                let popovers = cui.popovers;
                if (!popovers) {
                    popovers = cui.popovers = {};
                }
                popovers.insider = popoverDefinition;
            });

            // Register the popover template
            const rteTemplates = window.Coral.templates.RichTextEditor;
            rteTemplates.insider_dropdown = createDropdown;
        },

        /**
         * @override
         */
        execute: async function (command, action) {
            if (command !== 'run') {
                return;
            }
            adjustSelection(this.editorKernel.getEditContext());
            // Ensure the dropdown is closed
            this.editorKernel.fireUIEvent('updatestate', { origin: 'command', cmd: '', value: false, ret: null });
            this._field.preserveSelectionRange();
            await ns.controls.execute(action, this._field);
        },

        getTools: function () {
            return this._tools;
        },
    });

    RTE.plugins.PluginRegistry.register(GROUP, Plugin);

    /**
     * Generates a makeshift DOM field used to detect available tools for the current in-place editor
     * @param config In-place editor configuration
     * @returns {HTMLDivElement}
     */
    function createInplaceFieldSubstitution(config) {
        const field = document.createElement('inplace-editor');
        field.classList.add('cq-RichText', 'richtext-container', 'coral-Form-field');
        const editElementQuery = config['editElementQuery'];
        if (editElementQuery) {
            if (editElementQuery.startsWith('.')) {
                field.classList.add(...editElementQuery.substring(1).split('.'));
            } else if (editElementQuery.startsWith('#')) {
                field.id = editElementQuery.substring(1);
            }
        }
        if (config['propertyName']) {
            const input = document.createElement('input');
            input.name = config['propertyName'];
            field.appendChild(input);
        }
        return field;
    }

    /**
     * Creates a dropdown template for the RTE toolbar
     * @param tools {Array} List of valid tools to display in the dropdown
     * @returns {DocumentFragment}
     */
    function createDropdown(tools) {
        const fragment = document.createDocumentFragment();
        const dropDownList = new Coral.ButtonList();
        dropDownList.classList.add('eai-tools');
        for (const tool of tools) {
            dropDownList.items.add(ns.controls.createButton(tool));
        }
        fragment.appendChild(dropDownList);
        return fragment;
    }

    /**
     * Adjusts the boundaries of selection so that it embraces entire node(-s) node when a user selects
     * one or more paragraphs with a triple mouse click
     * @param context EditContext object
     */
    function adjustSelection(context) {
        const selection = context.win.getSelection();
        const anchorNode = selection.anchorNode;
        const extentNode = selection.extentNode;
        if (!anchorNode ||
            !extentNode ||
            anchorNode === extentNode ||
            extentNode.nodeType !== Node.ELEMENT_NODE ||
            selection.extentOffset !== 0) {
            return;
        }
        const previousNode = extentNode.previousSibling;
        if (previousNode && (previousNode === anchorNode || previousNode.contains(anchorNode))) {
            const range = context.doc.createRange();
            range.selectNodeContents(previousNode);
            selection.removeAllRanges();
            selection.addRange(range);
        } else if (previousNode && previousNode.nodeType !== Node.TEXT_NODE) {
            selection.extend(previousNode, 1);
        } else if (previousNode) {
            selection.extend(previousNode, previousNode.toString().length);
        }
    }

})(window, document, window.CUI.rte, window.eai = window.eai || {});
