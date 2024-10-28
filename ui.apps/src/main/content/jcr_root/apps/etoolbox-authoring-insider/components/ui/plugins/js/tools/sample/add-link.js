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

    const ID = 'text.addLink';

    ns.tools.register({
        icon: 'link',
        id: ID,
        title: 'Add link',
        isMatch,
        handle,
    });

    function isMatch(field) {
        if (field.matches('.cq-RichText') || field.closest('.cq-siteadmin-admin-properties')) {
            return false;
        }
        const imageCaptionTool = ns.tools.getInstance('image.caption');
        return !imageCaptionTool || !imageCaptionTool.matches(field);
    }

    async function handle(field) {
        if (!field) {
            return ns.ui.alert(this.title, 'Target field is invalid', 'error');
        }

        const sourceValue = ns.fields.getSelectedContent(field);
        const result = await ns.ui.inputDialog({
            icon: 'link',
            title: 'Specify link URL',
            source: field,
            fields: [
                { name: 'url', type: 'textfield', title: 'Link URL', validation: 'notBlank' },
                { name: 'newWindow', type: 'checkbox', title: 'Open in a new window?' },
            ],
            intro: {
                text: sourceValue
            },
        });
        if (result) {
            ns.fields.setSelectedContent(field, `<a href="${result.url}" ${result.newWindow ? 'target="_blank"' : ''} title="${sourceValue}">${sourceValue}</a>`);
        }
    }

})(window.eai = window.eai || {});
