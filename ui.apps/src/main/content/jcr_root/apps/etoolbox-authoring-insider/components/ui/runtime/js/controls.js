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

    const ATTR_ACTION = 'data-eai-action';
    const SELECTOR_TOOLS = '.eai-tool-button'

    /**
     * Contains utility methods for working with Authoring Insider controls
     */
    ns.controls = {
        /**
         * Attaches Authoring Insider controls to the specified field
         * @param {Element} field - The target field
         */
        handleField,

        /**
         * Creates a dropdown button manifesting a particular Authoring Insider tool for the current field
         * @param {Tool} tool - The tool to use
         * @param {Element} field - The target field
         */
        createButton: createActionButton,

        /**
         * Executes the specified action for the current field
         * @param {string} actionId - The action identifier
         * @param {Element} field - The target field
         */
        execute
    };

    function handleField(field) {
        const tools = ns.tools.forField(field);
        if (!tools.length) {
            return;
        }
        createDropdown(tools, field);
        const container = field.closest('coral-dialog') || field.closest('form');
        renewActionHandlers(container, `[${ATTR_ACTION}]`);
    }

    function createActionButton(tool) {
        let toolButtonHtml = `${ns.icons.getHtml(tool.icon || 'insider-mono')}<span class="title">${tool.title}</span>`;
        let displaysProviders = false;
        if (tool.providers.length > 1 && tool.providers.length < 5) {
            toolButtonHtml += '<div class="providers">';
            for (const prov of tool.providers) {
                toolButtonHtml += `<a title="${prov.title}" ${ATTR_ACTION}="${prov.id}">${ns.icons.getHtml(prov.icon, prov.title)}</a>`;
            }
            toolButtonHtml += '</div>';
            displaysProviders = true;
        }
        const firstProviderTitle = displaysProviders ? tool.providers[0].title : '';
        const toolButton = new Coral.ButtonList.Item().set({
            title: tool.title + (firstProviderTitle ? ` (${firstProviderTitle})` : ''),
            content: { innerHTML: toolButtonHtml }
        });
        toolButton.setAttribute(ATTR_ACTION, tool.id);
        if (displaysProviders) {
            toolButton.classList.add('has-providers');
        }
        return toolButton;
    }

    function createDropdown(tools, field) {
        const dropDownButton = new Coral.AnchorButton();
        dropDownButton.set({
            label: { innerHTML: ns.icons.getHtml(ns.icons.DEFAULT) },
        });
        dropDownButton.setAttribute('title', ns.TITLE);
        dropDownButton.classList.add('eai-tool-button');

        const dropDownList = new Coral.ButtonList();
        for (const tool of tools) {
            dropDownList.items.add(createActionButton(tool));
        }

        const popover = new Coral.Popover();
        popover.set({
            focusOnShow: Coral.mixin.overlay.focusOnShow.OFF,
            returnFocus: Coral.mixin.overlay.returnFocus.ON
        });
        popover.content.appendChild(dropDownList);
        popover.classList.add('eai-tools');

        const wrapper = document.createElement('div');
        wrapper.classList.add('eai-field-wrapper');
        field.parentNode.insertBefore(wrapper, field);
        wrapper.appendChild(field);
        wrapper.appendChild(dropDownButton);
        wrapper.appendChild(popover);
    }

    async function execute(actionId, field) {
        if (!field) {
            console.error(`There is not a controlled field for ${actionId}`);
            return;
        }
        const tool = ns.tools.getInstance(actionId);
        if (!tool) {
            console.error(`${actionId} is not found or has no handler`);
            return;
        }
        await tool.handle(field, actionId);
    }

    function renewActionHandlers(target) {
        if (!target) {
            return;
        }
        const actionSelector = `[${ATTR_ACTION}]`;
        if (ns.utils.isFunction(target.off)) {
            target
                .off('click', actionSelector, onActionClick).on('click', actionSelector, onActionClick)
                .off('click', SELECTOR_TOOLS, onActionClick).on('click', SELECTOR_TOOLS, onToolButtonClick);
        } else {
            $(target)
                .off('click', actionSelector, onActionClick).on('click', actionSelector, onActionClick)
                .off('click', SELECTOR_TOOLS, onActionClick).on('click', SELECTOR_TOOLS, onToolButtonClick);
        }
    }

    async function onActionClick(event) {
        event.preventDefault();
        event.stopPropagation();
        const clickedButton = event.target.closest(`[${ATTR_ACTION}]`);
        const action = clickedButton.getAttribute(ATTR_ACTION);
        const popover = clickedButton.closest('coral-popover');
        popover.hide();
        await execute(action, popover.controlled);
    }

    function onToolButtonClick(event) {
        event.preventDefault();
        event.stopPropagation();
        const clickedButton = event.target.closest(SELECTOR_TOOLS);
        const popover = clickedButton.nextElementSibling;
        if (!popover.target) {
            popover.set({
                alignMy: 'right top',
                alignAt: 'right bottom',
                target: clickedButton,
            });
        }
        if (!popover.controlled) {
            popover.controlled = clickedButton.previousElementSibling;
        }
        popover.show();
    }

})(document, Granite.$, window.eai = window.eai || {});
