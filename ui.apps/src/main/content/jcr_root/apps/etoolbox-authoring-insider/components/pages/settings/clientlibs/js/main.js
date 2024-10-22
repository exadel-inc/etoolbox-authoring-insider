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
    const debouncedSubmit = Utils.debounce(onAutoSubmit, DEBOUNCE_DELAY);

    let lastAddedItemId = false;

    $(document)
        .on('ready', onDocumentReady)
        .on('change', '.autosubmit', debouncedSubmit)
        .on('click', '#item-properties [variant="primary"]', onPropertiesSave)
        .on('click', '[data-adds-to]', onAddEntryClick)
        .on('click', '.delete', onDeleteEntryClick)
        .on('click', '.properties', onPropertiesOpen)
        .on('coral-tablist:change', onActiveTabChange)
        .on('keydown', '.foundation-toggleable', onKeyDownInDialog);

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
        $(document).on('change', '.autosubmit-defer', debouncedSubmit);

        displayTabs();
    }

    async function onAutoSubmit(e) {
        e.preventDefault();
        await submitAllData();
    }

    async function onAddEntryClick(e){
        const targetId = e.target.closest('[data-adds-to]').dataset.addsTo;
        await addMultifieldItem(targetId);
    }

    async function onDeleteEntryClick(e) {
        const operation = e.target.closest('[title]').getAttribute('title');
        const confirmation = await ns.ui.prompt(operation, `${operation} this item?`, 'notice');
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
            await ns.http.post(form.action, {body: new FormData(form)});
            ns.ui.notify(null, 'Settings saved', 'success');
            await quietReload();

            if (lastAddedItemId) {
                const multifield = document.getElementById(lastAddedItemId);
                lastAddedItemId = null;
                multifield.items.getAll().slice(-1)[0].querySelector('.properties').click();
            }
        } catch (error) {
            ns.ui.alert('Failed to save settings', error.message, 'error');
        }
    }

    async function submitItemData(dialog, dialogForm) {
        const cancelled  = !dialogForm.dispatchEvent(new Event('submit', { cancelable: true }));
        if (cancelled) {
            return;
        }
        dialog.open = false;
        const body = packDetails(new FormData(dialogForm));
        try {
            await ns.http.post(dialogForm.action, { body });
            ns.ui.notify(null, 'Settings saved', 'success');
            await quietReload();
        } catch (error) {
            ns.ui.alert('Failed to save settings', error.message, 'error');
        }
    }

    /* ----------------
       Multifield logic
       ---------------- */

    async function addMultifieldItem(targetId) {
        let collection = targetId === 'providers' ? ns.providers.getModels() : ns.tools.getModels();
        collection = collection.filter(model => model.isTemplate);
        const title = targetId === 'providers' ? 'Select provider model' : 'Select tool model';

        const modelId = await ns.ui.inputDialog({
            title,
            fields: [{
                type: 'select',
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

        updateMultifieldItemContent(newMultifieldItem, model);
        lastAddedItemId = targetId;
        multifield.trigger('coral-multifield:itemorder');
        multifield.trigger('change');
    }

    async function deleteMultifieldItem(item) {
        const multifield = item.closest('coral-multifield');
        item.remove();
        const changeEventFired = await updateMultifieldContent(multifield);
        if (!changeEventFired) {
            await submitAllData();
        }
    }

    async function updateMultifieldContent(multifield) {
        await whenReady(multifield);

        const models = multifield.id === 'providers' ? ns.providers.getModels() : ns.tools.getModels();
        const matchedModels = new Set();
        const redundantItems = [];

        for (const item of multifield.items.getAll()) {
            const typeField = item.querySelector('[name$="type"]');
            const modelId = typeField && typeField.value;
            const matchedModel = models.find((item) => item.id === modelId);
            if (matchedModel) {
                matchedModels.add(matchedModel);
                updateMultifieldItemActions(item, matchedModel);
                updateMultifieldItemIcon(item, matchedModel);
            } else {
                redundantItems.push(item);
            }
        }
        matchedModels.forEach((model) => models.splice(models.indexOf(model), 1));

        if (models.length === 0 && redundantItems.length === 0) {
            return false;
        }

        redundantItems.forEach((item) => multifield.items.remove(item));

        for (const missedModel of models) {
            const newMultifieldItem = new Coral.Multifield.Item();
            multifield.items.add(newMultifieldItem);
            await whenReady(multifield);
            updateMultifieldItemContent(newMultifieldItem, missedModel);
        }

        multifield.trigger('coral-multifield:itemorder');
        multifield.trigger('change');
        return true;
    }

    function updateMultifieldItemContent(item, model) {
        item.querySelector('[name$="type"]').value = model.id;
        item.querySelector('[name$="title"]').value = model.title;
        updateMultifieldItemActions(item, model);
        updateMultifieldItemIcon(item, model);
    }

    function updateMultifieldItemActions(item, model) {
        let isDeletable = model.isTemplate;
        if (isDeletable) {
            const typeField = item.querySelector('.type');
            isDeletable = typeField.value
                && item.closest('coral-multifield').querySelectorAll(`.type[value="${typeField.value}"]`).length > 1;
        }
        if (!isDeletable) {
            const deleteButton = item.querySelector('.delete');
            deleteButton.setAttribute('aria-label', 'Clear');
            deleteButton.setAttribute('title', 'Clear');
            deleteButton.querySelector('coral-icon').classList.replace('coral3-Icon--delete', 'coral3-Icon--deleteOutline');
        }
    }

    function updateMultifieldItemIcon(item, model) {
        const iconField = item.querySelector('[name$="icon"]');
        const iconHolder = item.querySelector('.icon-holder');
        iconHolder.innerHTML = ns.icons.getHtml(iconField.value || model.icon, model.title);
        iconHolder.classList.remove('default');
    }

    /* ----------
       Tabs logic
       ---------- */

    function displayTabs() {
        const tabList = document.querySelector('coral-tablist');
        const transparentTabs = tabList.closest('.transparent');
        if (transparentTabs) {
            transparentTabs.classList.remove('transparent');
        }

        const hash = window.location.hash;
        if (!hash) {
            return;
        }
        const targetId = hash.substring(1);

        for (const tab of tabList.items.getAll()) {
            const foundationTrackingEvent = tab.dataset.foundationTrackingEvent;
            const element = foundationTrackingEvent && JSON.parse(foundationTrackingEvent).element;
            if (element === 'tab-' + targetId) {
                tab.selected = true;
                return;
            }
        }
    }

    /* ------------
       Dialog logic
       ------------ */

    async function openPropertiesDialog(item, namespace) {
        const models = namespace === 'providers' ? ns.providers.getModels() : ns.tools.getModels();
        const modelId = item.querySelector('[name$="type"]').value;
        const model = models.find((item) => item.id === modelId);
        if (!model) {
            console.error(`Model ${modelId}  not found`);
            return;
        }

        const nodePath = item.querySelector('.path').value;
        const dialogSrc = '/mnt/overlay'
            + '/etoolbox-authoring-insider/components/pages/settings/properties.eai.html'
            + nodePath;
        const dialogData= JSON.stringify(model.settings || []);

        let dialogContent;
        try {
            dialogContent = await ns.http.post(dialogSrc, { body: dialogData });
            dialogContent = Utils.sanitizeHtml(dialogContent);
        } catch (error) {
            ns.ui.alert('Failed to load dialog', error.message, 'error');
            return;
        }

        const dialog = $(dialogContent).appendTo(document.body).get(0);
        Coral.commons.ready(dialog, function () {
            dialog.set({ closable: Coral.Dialog.closable.ON });
            dialog.on('coral-overlay:close', () => dialog.remove());
            dialog.show();
        });
    }

    function packDetails(formData) {
        const details = {};
        const keysToRemove = new Set();
        for (const entry of formData.entries()) {
            const [key, value] = entry;
            if (key.includes('@') || key.startsWith(':') || DEFAULT_PROPS.includes(key)) {
                continue;
            }
            if (value) {
                if (!details[key]) {
                    details[key] = value;
                } else {
                    if (!Array.isArray(details[key])) {
                        details[key] = [details[key]];
                    }
                    details[key].push(value);
                }
            }
            keysToRemove.add(key);
        }
        keysToRemove.forEach((key) => formData.delete(key));
        formData.set('details@Delete', null);
        if (Object.keys(details).length > 0) {
            formData.set('details', JSON.stringify(details));
        }
        return formData;
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
        window.DOMPurify.addHook('uponSanitizeAttribute', function (node, hookEvent ) {
            // noinspection JSDeprecatedSymbols
            if (hookEvent.attrName && hookEvent.attrName.includes('coral-multifield')) {
                hookEvent.forceKeepAttr = true;
            }
        });
    }

})(window, document, Granite.$, Granite.UI.Foundation.Utils, window.eai = window.eai || {});

