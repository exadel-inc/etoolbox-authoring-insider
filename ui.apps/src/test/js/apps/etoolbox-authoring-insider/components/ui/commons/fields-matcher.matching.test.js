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
// noinspection JSFileReferences
require('#commons/fields-matcher.js');

const ns = window.eai;

test('Should match a field by selector', () => {
    const dom = createDom('<div class="my-class"></div>');

    let matcher = new ns.fields.Matcher('.my-class');
    expect(matcher.matches(dom)).toBeTruthy();
    matcher.inverted = true;
    expect(matcher.matches(dom)).toBeFalsy();

    matcher = new ns.fields.Matcher(':not(.my-class)');
    expect(matcher.matches(dom)).toBeFalsy();
    matcher.inverted = true;
    expect(matcher.matches(dom)).toBeTruthy();
});

test('Should match a field in a window by a href', () => {
    delete window.location;
    window.location = new URL('http://localhost:4502/content/we-retail/us/en.html');
    const dom = createDom('<div class="my-class"></div>');

    let matcher = new ns.fields.Matcher('url *= "/we-retail/" .my-class');
    expect(matcher.matches(dom)).toBeTruthy();

    matcher = new ns.fields.Matcher('url $= "en.html"');
    expect(matcher.matches(dom)).toBeTruthy();

    matcher = new ns.fields.Matcher('url ^= "http://localhost:4502/content/wknd/" .my-class');
    expect(matcher.matches(dom)).toBeFalsy();
});

test('Should match a field by parent selector', () => {
    const dom = createDom(`
        <section class="coral-Form-fieldset">
          <div class="coral-Form-fieldwrapper-1">
            <label class="coral-Form-fieldlabel">Right Margin</label>
            <input class="coral-Form-field coral3-Textfield" name="./title">
          </div>
          <div class="coral-Form-fieldwrapper-2">
            <label class="coral-Form-fieldlabel">Left Margin</label>
            <input class="coral-Form-field coral3-Textfield" name="./description">
          </div>
        </section>
    `);
    let matcher = new ns.fields.Matcher('field = title, within=".coral-Form-fieldset"');
    expect(matcher.matches(dom.querySelector('[name="./title"]'))).toBeTruthy();

    matcher = new ns.fields.Matcher('field = title, within=".coral-Form-fieldwrapper-1"');
    expect(matcher.matches(dom.querySelector('[name="./title"]'))).toBeTruthy();
    expect(matcher.matches(dom.querySelector('[name="./description"]'))).toBeFalsy();
});

test('Should match a field by being inside dialog', () => {
    let dom = createDom(`
        <coral-dialog class="cq-Dialog coral3-Dialog">
          <div class="coral3-Dialog-wrapper">
            <form class="cq-dialog foundation-form foundation-layout-form"
                  action="/content/hpe/base/blueprint/test-page/_jcr_content/textonly"
                  method="post">
              <coral-dialog-content class="coral3-Dialog-content">
                <div class="cq-dialog-content">
                  <input class="coral-Form-field coral3-Textfield" name="./title">
                </div>
              </coral-dialog-content>
            </form>
          </div>
        </coral-dialog>    
    `);
    let matcher = new ns.fields.Matcher('dialog .coral-Form-field');
    expect(matcher.matches(dom.querySelector('input'))).toBeTruthy();

    matcher = new ns.fields.Matcher('dialog field=title');
    expect(matcher.matches(dom.querySelector('input'))).toBeTruthy();

    dom = createDom(`
        <div class="cq-dialog-content">
          <input class="coral-Form-field coral3-Textfield" name="./title">
        </div>
    `);
    expect(matcher.matches(dom.querySelector('input'))).toBeFalsy();
});

test('Should match a field by being inside page properties', () => {
    const dom = createDom(`
        <form id="cq-sites-properties-form" class="cq-siteadmin-admin-properties coral-Form" 
              action="/content/hpe/base/blueprint/test-page/_jcr_content" 
              method="post">
          <input class="coral-Form-field" name="./pageTitle">      
        </form>
    `);
    let matcher = new ns.fields.Matcher('Page Properties [name="./pageTitle"]');
    expect(matcher.matches(dom.querySelector('input'))).toBeTruthy();

    matcher = new ns.fields.Matcher('Page Properties [name="./pageDescription"]');
    expect(matcher.matches(dom.querySelector('input'))).toBeFalsy();

    dom.removeAttribute('class');
    expect(matcher.matches(dom.querySelector('input'))).toBeFalsy();
});

test('Should match a field by name', () => {
    let dom = createDom('<input class="coral-Form-field coral-TextField" name="./title" placeholder="Enter the title">');
    let matcher = new ns.fields.Matcher('field= title');
    expect(matcher.matches(dom)).toBeTruthy();

    matcher = new ns.fields.Matcher('field= title [placeholder]');
    expect(matcher.matches(dom)).toBeTruthy();

    matcher = new ns.fields.Matcher('field $= title');
    expect(matcher.matches(dom)).toBeTruthy();

    matcher = new ns.fields.Matcher('field^=title');
    expect(matcher.matches(dom)).toBeTruthy();

    matcher = new ns.fields.Matcher('field = description');
    expect(matcher.matches(dom)).toBeFalsy();

    dom = createDom(`
        <div class="cq-RichText coral-Form-field">
          <input type="hidden" name="./description">
          <div class="cq-RichText-editable"></div>
          <textarea class="rte-sourceEditor u-coral-noBorder"></textarea>
        </div>    
    `);
    expect(matcher.matches(dom)).toBeTruthy();

    matcher = new ns.fields.Matcher('field= title');
    expect(matcher.matches(dom)).toBeFalsy();
});

test('Should match a field by attribute', () => {
    let dom = createDom('<input class="coral-Form-field coral-TextField" name="./title" placeholder="Enter the title" data-my-attribute>');
    let matcher = new ns.fields.Matcher('attribute= placeholder, field= title');
    expect(matcher.matches(dom)).toBeTruthy();

    matcher = new ns.fields.Matcher('attr=my-attribute');
    expect(matcher.matches(dom)).toBeTruthy();

    dom = createDom(`
        <div class="cq-RichText coral-Form-field">
          <input type="hidden" name="./description" data-my-attribute="my-value">
          <div class="cq-RichText-editable"></div>
          <textarea class="rte-sourceEditor u-coral-noBorder"></textarea>
        </div>    
    `);
    expect(matcher.matches(dom)).toBeTruthy();
});

test('Should match a field by label', () => {
    let dom = createDom(`
        <div class="coral-Form-fieldwrapper">
          <label class="coral-Form-fieldlabel">Enter Title</label>
          <input class="coral-Form-field coral3-Textfield" name="./title">
        </div>    
    `);
    let matcher = new ns.fields.Matcher('label= "Enter Title"');
    expect(matcher.matches(dom.querySelector('input'))).toBeTruthy();

    matcher = new ns.fields.Matcher('label *= Title');
    expect(matcher.matches(dom.querySelector('input'))).toBeTruthy();

    matcher = new ns.fields.Matcher('label $= Enter');
    expect(matcher.matches(dom.querySelector('input'))).toBeFalsy();

    dom = createDom(`
        <form id="cq-sites-properties-form" class="cq-siteadmin-admin-properties coral-Form" 
              action="/content/hpe/base/blueprint/test-page/_jcr_content" 
              method="post">
            <div class="coral-Form-fieldwrapper foundation-field-edit">
              <label class="coral-Form-fieldlabel">Enter Description</label>
              <textarea class="coral-Form-field coral3-Textfield--multiline" name="./jcr:description"></textarea>
            </div>
        </form>
    `);
    matcher = new ns.fields.Matcher('properties fieldLabel *= description');
    expect(matcher.matches(dom.querySelector('textarea'))).toBeTruthy();
});

test('Should match a field by component title', () => {
    let dom = createDom(`
        <coral-dialog class="cq-Dialog coral3-Dialog">
          <div class="coral3-Dialog-wrapper">
            <form class="cq-dialog foundation-form foundation-layout-form"
                  action="/content/hpe/base/blueprint/test-page/_jcr_content/textonly"
                  method="post">
              <div class="coral3-Dialog-header">
                <div class="coral3-Dialog-title coral-Heading">
                  <coral-dialog-header class="cq-dialog-header">
                    Text Only
                  </coral-dialog-header>
                </div>
                <button is="coral-button" class="coral3-Button coral3-Dialog-closeButton"></button>
              </div>
              <coral-dialog-content class="coral3-Dialog-content">
                <div class="cq-dialog-content">
                  <input class="coral-Form-field coral3-Textfield" name="./title">
                </div>
              </coral-dialog-content>
            </form>
          </div>
        </coral-dialog>    
    `);
    let matcher = new ns.fields.Matcher('component="Text Only"');
    expect(matcher.matches(dom.querySelector('input'))).toBeTruthy();

    matcher = new ns.fields.Matcher('component *= "Text"');
    expect(matcher.matches(dom.querySelector('input'))).toBeTruthy();

    matcher = new ns.fields.Matcher('component $= AnchorNav');
    expect(matcher.matches(dom.querySelector('input'))).toBeFalsy();

    dom = createDom(`
        <div class="coral-Form-fieldwrapper">
          <label class="coral-Form-fieldlabel">Enter Title</label>
          <input class="coral-Form-field coral3-Textfield" name="./title">
        </div>    
    `);
    expect(matcher.matches(dom.querySelector('input'))).toBeFalsy();
});

test('Should match a field by tab title', () => {
    const dom = createDom(`
        <coral-dialog class="cq-Dialog coral3-Dialog">
          <div class="coral3-Dialog-wrapper">
            <form class="cq-dialog foundation-form foundation-layout-form"
                  action="/content/hpe/base/blueprint/test-page/_jcr_content/textonly"
                  method="post">
              <coral-dialog-content class="coral3-Dialog-content">
                <div class="cq-dialog-content">
                  <coral-tabview class="coral3-TabView">
                    <coral-tablist>
                      <coral-tab id="tab0">
                        <coral-tab-label>Content</coral-tab-label>
                      </coral-tab>
                      <coral-tab id="tab1">
                        <coral-tab-label>Component Margin</coral-tab-label>
                      </coral-tab>
                    </coral-tablist>
                    <coral-panelstack>
                      <coral-panel aria-labelledby="tab0">
                        <coral-panel-content>
                          <input class="coral-Form-field coral3-Textfield" name="./title">
                        </coral-panel-content>
                      </coral-panel>
                      <coral-panel aria-labelledby="tab1">
                        <coral-panel-content>
                          <input class="coral-Form-field coral3-Textfield" name="./description">
                        </coral-panel-content>
                      </coral-panel>
                    </coral-panelstack>
                  </coral-tabview>
                </div>
              </coral-dialog-content>
            </form>
          </div>
        </coral-dialog>    
    `);
    let matcher = new ns.fields.Matcher('tab= "Content"');
    expect(matcher.matches(dom.querySelector('[name="./title"]'))).toBeTruthy();
    expect(matcher.matches(dom.querySelector('[name="./description"]'))).toBeFalsy();

    matcher = new ns.fields.Matcher('tab *= "margin"');
    expect(matcher.matches(dom.querySelector('[name="./title"]'))).toBeFalsy();
    expect(matcher.matches(dom.querySelector('[name="./description"]'))).toBeTruthy();
});

function createDom(text) {
    const parent = document.createElement('div');
    parent.innerHTML = text;
    return parent.firstElementChild;
}