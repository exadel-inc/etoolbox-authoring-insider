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
(function (window, document, $, Utils, ns) {
    'use strict';

    const NAMESPACES = ['tools', 'providers'];
    const DEFAULT_PROPS = ['enabled', 'icon', 'title', 'type'];

    const DEBOUNCE_DELAY = 750;
    const onAutoSubmitDebounce = Utils.debounce(onAutoSubmit, DEBOUNCE_DELAY);

    let lastModifiedMultifieldId = false;

    /* --------------
       Event handlers
       -------------- */

    async function onDocumentReady() {
        let anyChangeEventFired = false;
        for (const key of NAMESPACES) {
            const multifield = document.getElementById(key);
            const changeEventFired = await updateMultifieldContent(multifield);
            if (changeEventFired) {
                anyChangeEventFired = true;
            }
        }
        if (anyChangeEventFired) {
            await submitAllData();
        }
        // This hook is added apart from the rest to avoid "autosubmit" handler running unconditionally upon a page load
        $(document).on('change.eai', '.autosubmit-defer', onAutoSubmitDebounce);

        const hash = window.location.hash;
        const targetId = hash && hash.substring(1);

        displayTabs(targetId);
        adjustToolbarVisibility(targetId);
    }

    async function onAutoSubmit(e) {
        e.preventDefault();
        await submitAllData();
    }

    async function onAddEntryClick(e) {
        const button = e.target.closest('[data-adds-to]');
        const targetId = button.dataset.addsTo;
        const title = button.innerText;
        await addMultifieldItem(targetId, title);
    }

    async function onDeleteEntryClick(e) {
        const confirmation = await ns.ui.prompt('Delete', 'Delete this item?', 'notice');
        if (!confirmation) {
            return;
        }
        const item = e.target.closest('coral-multifield-item');
        await deleteMultifieldItem(item);
    }

    async function onPropertiesOpen(e) {
        const item = e.target.closest('coral-multifield-item');
        const namespace = e.target.closest('coral-multifield').id;
        await openPropertiesDialog(item, namespace);
    }

    async function onPropertiesSave(e) {
        e.preventDefault();
        const dialog = e.target.closest('coral-dialog');
        const form = e.target.closest('form') || dialog.querySelector('form');
        await submitItemData(dialog, form);
    }

    function onActiveTabChange(e) {
        const selection = e.detail.selection;
        if (!selection) {
            return;
        }
        const foundationTrackingEvent = selection.dataset.foundationTrackingEvent;
        const element = foundationTrackingEvent && JSON.parse(foundationTrackingEvent).element.replace('tab-', '');
        if (!element || window.location.hash === '#' + element) {
            return;
        }
        window.location.hash = '#' + element;
        adjustToolbarVisibility(element);
    }

    function onKeyDownInDialog(e) {
        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
            e.preventDefault();
            e.target.closest('coral-dialog')
                .querySelector('[variant="primary"]')
                .dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
    }

    /* ---------------------
       Window/document logic
       --------------------- */

    async function quietReload() {
        let newContent;
        try {
            newContent = await ns.http.getText(window.location.href);
        } catch (e) {
            console.error('Failed to reload the page', e);
        }
        if (!newContent) {
            return;
        }
        const newDom = new DOMParser().parseFromString(newContent, 'text/html');
        for (const multifield of document.querySelectorAll('coral-multifield')) {
            const newMultifield = newDom.getElementById(multifield.id);
            if (!newMultifield) {
                continue;
            }
            updateMultifieldGraphics(newMultifield);
            multifield.replaceWith(newMultifield);
            const changeEventFired = await updateMultifieldContent(newMultifield);
            if (!changeEventFired) {
                // This is needed to assign proper names to the multifield's inner fields
                newMultifield.trigger('coral-multifield:itemorder');
            }
        }
    }

    async function submitAllData() {
        const form = document.getElementById('settings');
        try {
            // Wrap the form data in URLSearchParams to avoid sending as a multipart attachment
            // because in the latter case a Sling restrictuin on the number of fields may apply
            await ns.http.post(form.action, { data: new URLSearchParams(new FormData(form)) });
            ns.ui.notify(null, 'Settings saved', 'success');
            await quietReload();

            if (lastModifiedMultifieldId) {
                const multifield = document.getElementById(lastModifiedMultifieldId);
                lastModifiedMultifieldId = null;
                multifield.items.getAll().slice(-1)[0].querySelector('.properties').click();
            }
        } catch (error) {
            ns.ui.alert('Failed to save settings', error.message, 'error');
        }
    }

    async function submitItemData(dialog, dialogForm) {
        const isValid = ns.ui.validate(dialogForm);
        if (!isValid) {
            return;
        }
        dialog.open = false;
        // Wrap the form data in URLSearchParams to avoid sending as a multipart attachment
        // because in the latter case a Sling restriction on the number of fields may apply
        const formData = new FormData(dialogForm);
        packDetails(formData);
        const data = new URLSearchParams(formData);
        try {
            await ns.http.post(dialogForm.action, { data });
            ns.ui.notify(null, 'Settings saved', 'success');
            await quietReload();
        } catch (error) {
            ns.ui.alert('Failed to save settings', error.message, 'error');
        }
    }

    /* ----------------
       Multifield logic
       ---------------- */

    async function addMultifieldItem(targetId, title) {
        let collection = ns[targetId].getModels();
        const disabledItemsHolder = document.querySelector(`[name="./disabled${targetId[0].toUpperCase() + targetId.substring(1)}"]`);
        const disabledItems = disabledItemsHolder.value.split(';').filter(Boolean);
        collection = collection.filter(model => model.isTemplate || disabledItems.includes(model.id));

        const modelId = await ns.ui.inputDialog({
            title,
            fields: [{
                type: 'selectlist',
                options: collection
            }]
        });
        if (!modelId) {
            return;
        }

        const multifield = document.getElementById(targetId);
        const model = collection.find((item) => item.id === modelId);
        const newMultifieldItem = new Coral.Multifield.Item();
        multifield.items.add(newMultifieldItem);
        await whenReady(multifield);

        if (disabledItems.includes(modelId)) {
            disabledItems.splice(disabledItems.indexOf(modelId), 1);
            disabledItemsHolder.value = disabledItems.join(';');
        }

        updateMultifieldItemContent(newMultifieldItem, model);
        lastModifiedMultifieldId = targetId;

        multifield.trigger('coral-multifield:itemorder');
        multifield.trigger('change');
    }

    async function deleteMultifieldItem(item) {
        const multifield = item.closest('coral-multifield');
        const typeField = item.querySelector('[name$="type"]');
        const modelId = typeField && typeField.value;
        const matchedModel = ns[multifield.id].getModels().find((item) => item.id === modelId);
        const shouldDisable = !matchedModel || !matchedModel.isTemplate;

        item.remove();
        if (shouldDisable) {
            const disabledItemsHolder = multifield.parentElement.querySelector('.disabled-items');
            const disabledItems = new Set(disabledItemsHolder.value.split(';').filter(Boolean));
            disabledItems.add(modelId);
            disabledItemsHolder.value = Array.from(disabledItems).join(';');
        }
        await submitAllData();
    }

    async function updateMultifieldContent(multifield) {
        await whenReady(multifield);

        const models = ns[multifield.id].getModels();
        const matchedModels = new Set();
        const redundantItems = [];

        for (const item of multifield.items.getAll()) {
            const typeField = item.querySelector('[name$="type"]');
            const modelId = typeField && typeField.value;
            const matchedModel = models.find((item) => item.id === modelId);
            if (matchedModel) {
                matchedModels.add(matchedModel);
                updateMultifieldItemIcon(item, matchedModel);
            } else {
                redundantItems.push(item);
            }
        }
        matchedModels.forEach((model) => models.splice(models.indexOf(model), 1));

        let hasChanges = false;
        if (redundantItems.length > 0) {
            redundantItems.forEach((item) => multifield.items.remove(item));
            hasChanges = true;
        }
        if (models.length > 0) {
            const disabledItemsHolder = multifield.parentElement.querySelector('.disabled-items');
            const disabledItems = new Set(disabledItemsHolder.value.split(';').filter(Boolean));

            for (const missedModel of models) {
                if (missedModel.isTemplate || disabledItems.has(missedModel.id)) {
                    continue;
                }
                const newMultifieldItem = new Coral.Multifield.Item();
                multifield.items.add(newMultifieldItem);
                await whenReady(multifield);
                updateMultifieldItemContent(newMultifieldItem, missedModel);
                hasChanges = true;
            }
        }

        if (hasChanges) {
            multifield.trigger('coral-multifield:itemorder');
            multifield.trigger('change');
        }
        return hasChanges;
    }

    function updateMultifieldItemContent(item, model) {
        item.querySelector('[name$="type"]').value = model.id;
        item.querySelector('[name$="title"]').value = model.title;
        updateMultifieldItemIcon(item, model);
    }

    function updateMultifieldGraphics(multifield) {
        const models = ns[multifield.id].getModels();
        for (const item of multifield.querySelectorAll('coral-multifield-item')) {
            const typeField = item.querySelector('[name$="type"]');
            const modelId = typeField && typeField.value;
            const matchedModel = models.find((item) => item.id === modelId);
            if (matchedModel) {
                updateMultifieldItemIcon(item, matchedModel);
            }
        }
    }

    function updateMultifieldItemIcon(item, model) {
        const iconField = item.querySelector('[name$="icon"]');
        const iconHolder = item.querySelector('.icon-holder');
        if (!iconHolder.classList.contains('default')) {
            return;
        }
        iconHolder.innerHTML = ns.icons.getHtml(iconField.value || model.icon, model.title);
        iconHolder.classList.remove('default');
    }

    /* ----------
       Tabs logic
       ---------- */

    function displayTabs(targetId) {
        const tabList = document.querySelector('coral-tablist');
        const transparentTabs = tabList.closest('.transparent');
        if (transparentTabs) {
            transparentTabs.classList.remove('transparent');
        }
        adjustTabVisibility(tabList, targetId);
    }

    function adjustTabVisibility(tabList, targetId) {
        if (!targetId) {
            return;
        }
        for (const tab of tabList.items.getAll()) {
            const foundationTrackingEvent = tab.dataset.foundationTrackingEvent;
            const element = foundationTrackingEvent && JSON.parse(foundationTrackingEvent).element;
            if (element === 'tab-' + targetId) {
                tab.selected = true;
                return;
            }
        }
    }

    /* -------------
       Toolbar logic
       ------------- */

    function adjustToolbarVisibility(targetId) {
        if (!targetId) {
            return;
        }
        document.querySelectorAll('[data-adds-to]').forEach((item) => {
            item.classList.toggle('hidden', item.dataset.addsTo !== targetId);
        });
    }

    /* ------------
       Dialog logic
       ------------ */

    async function openPropertiesDialog(item, namespace) {
        const models = ns[namespace].getModels();
        const modelId = item.querySelector('[name$="type"]').value;
        const model = models.find((item) => item.id === modelId);
        if (!model) {
            console.error(`Model ${modelId}  not found`);
            return;
        }

        const nodePath = item.querySelector('.path').value;
        const dialogSrc = '/mnt/overlay' +
            '/etoolbox-authoring-insider/components/pages/settings/properties.eai.html' +
            nodePath;

        const sanitizeHtml = (Utils.XSS && Utils.XSS.sanitizeHtml) ?
            Utils.XSS.sanitizeHtml :
            Utils.sanitizeHtml;
        let dialogContent;
        try {
            dialogContent = await ns.http.post(dialogSrc, { data: model.settings || [] });
            if (ns.utils.isFunction(sanitizeHtml)) {
                dialogContent = sanitizeHtml(dialogContent);
            }
        } catch (error) {
            ns.ui.alert('Failed to load dialog', error.message, 'error');
            return;
        }

        const dialog = $(dialogContent).appendTo(document.body).get(0);
        Coral.commons.ready(dialog, function () {
            dialog.set({
                header: {
                    innerHTML: namespace === 'tools' ? 'Tool settings' : 'Provider settings'
                },
                closable: Coral.Dialog.closable.ON
            });
            dialog.on('coral-overlay:close', () => dialog.remove());
            dialog.show();
        });
    }

    function packDetails(formData) {
        const formDataObject = {};
        for (const entry of formData.entries()) {
            const [key, value] = entry;
            if (key.startsWith(':') || DEFAULT_PROPS.includes(key)) {
                continue;
            }
            const formDataKey = key.includes('@') ? key.split('@')[0] : key;
            if (!formDataObject[formDataKey]) {
                formDataObject[formDataKey] = {};
            }
            const formDataPropName = key.includes('@') ? key.split('@')[1] : 'value';
            if (formDataPropName === 'value' && formDataObject[formDataKey]['value'] === undefined) {
                formDataObject[formDataKey]['value'] = value;
            } else if (formDataPropName === 'value') {
                if (!Array.isArray(formDataObject[formDataKey]['value'])) {
                    formDataObject[formDataKey]['value'] = [formDataObject[formDataKey]['value']];
                }
                formDataObject[formDataKey]['value'].push(value);
            } else {
                formDataObject[formDataKey][formDataPropName] = value;
            }
        }

        const details = {};
        const packedKeys = new Set();
        for (const entries of Object.entries(formDataObject)) {
            const [key, properties] = entries;
            if (properties.value) {
                details[key] = properties.value;
            } else if (properties['DefaultValue'] && properties['UseDefaultWhenMissing']) {
                details[key] = properties['DefaultValue'];
            }
            Object.keys(properties).forEach((prop) => {
                if (prop === 'value') {
                    packedKeys.add(key);
                } else {
                    packedKeys.add(key + '@' + prop);
                }
            });
        }
        packedKeys.forEach((key) => formData.delete(key));
        formData.set('details@Delete', null);
        if (Object.keys(details).length > 0) {
            formData.set('details', JSON.stringify(details));
        }
    }

    /* -----
       Utils
       ----- */

    function whenReady(element) {
        return new Promise((resolve) => {
            Coral.commons.ready(element, resolve);
        });
    }

    /* -------
       Patches
       ------- */

    if (window.DOMPurify) {
        window.DOMPurify.addHook('uponSanitizeAttribute', function (node, hookEvent) {
            // noinspection JSDeprecatedSymbols
            if (hookEvent.attrName && hookEvent.attrName.includes('coral-multifield')) {
                hookEvent.forceKeepAttr = true;
            }
        });
    }

    /* --------------
       Initialization
       -------------- */

    $(document)
        .off('.eai')
        .on('ready.eai', onDocumentReady)
        .on('click.eai', '#item-properties [variant="primary"]', onPropertiesSave)
        .on('click.eai', '[data-adds-to]', onAddEntryClick)
        .on('click.eai', '.delete', onDeleteEntryClick)
        .on('click.eai', '.properties', onPropertiesOpen)
        .on('coral-tablist:change.eai', onActiveTabChange)
        .on('keydown.eai', '.foundation-toggleable', onKeyDownInDialog);
})(window, document, Granite.$, Granite.UI.Foundation.Utils, window.eai = window.eai || {});
