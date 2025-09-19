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

    /* ---------
       Utilities
       --------- */

    function getAction($form) {
        const $actionHolder = $form.find('.cq-damadmin-admin-childpages .foundation-selections-item');
        if ($actionHolder.length) {
            return $actionHolder.attr('data-path');
        }
        return $form.attr('data-formid');
    }

    /* --------------
       Event handlers
       -------------- */

    function onDocumentReady() {
        const $form = $('form[data-mime-type^="image"]');
        if (!$form.length) {
            return;
        }
        const eaiFields = $form.find('[name*="eai."]');
        if (eaiFields.length) {
            // Fields already created
            return;
        }
        const $firstPanel = $form.find('coral-panel:first');
        if (!$firstPanel.length) {
            return;
        }
        let $insertionTarget = $firstPanel.find('.aem-assets-metadata-form-column:nth-child(2)');
        $insertionTarget = $insertionTarget.length ? $insertionTarget : $firstPanel;
        $(`
          <label class="coral-Form-fieldlabel" data-metatype="section" id="eai">
            <h3>EToolbox Authoring Insider</h3>
          </label>
          <div class="coral-Form-fieldwrapper eai-field-wrapper">
            <label class="coral-Form-fieldlabel" for="eal-caption">Image Caption (Alt Text)</label>
            <textarea 
              class="coral-Form-field foundation-layout-util-resizable-none eai-field" 
              id="eai-caption" 
              is="coral-textarea" 
              name="./jcr:content/metadata/eai.caption" 
              rows="5"></textarea>
          </div>
        `).appendTo($insertionTarget);

        const action = getAction($form);
        if (!action) {
            console.error('Could not determine a form data path');
            return;
        }
        $.get(action + '/jcr:content/metadata.json', (data) => {
            $form.find('#eai-caption').val(data['eai.caption'] || '');
        }).fail((xhr, status) => {
            console.error('Could not load image metadata: ' + status);
        });
    }

    /* --------------
       Initialization
       -------------- */

    $(document).ready(onDocumentReady);
})(document, Granite.$, window.eai = window.eai || {});
