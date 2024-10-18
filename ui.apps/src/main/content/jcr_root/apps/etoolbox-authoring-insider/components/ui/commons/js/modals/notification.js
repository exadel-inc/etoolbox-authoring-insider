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
(function (window, $, ns) {
    'use strict';

    const foundationUI = $(window).adaptTo('foundation-ui');

    ns.ui = ns.ui || {};

    ns.ui.alert = function (title, message, type) {
        console[type === 'error' ? 'error' : 'info'](message);
        foundationUI.alert(title, `<div class="notification">${message}</div>`, type);
    }

    ns.ui.prompt = async function (title, message, type = 'default') {
        return new Promise((resolve) => {
            foundationUI.prompt(
                title,
                `<div class="notification">${message}</div>`,
                type,
                [
                    {
                        text: 'OK',
                        primary: true,
                        handler: () => resolve(true)
                    },
                    {
                        text: 'Cancel',
                        primary: false,
                        handler: () => resolve(false)
                    }
                ]);
        });
    }

    ns.ui.notify = function (title, message, type) {
        foundationUI.notify(title, message, type);
    }

    ns.ui.wait = function (target) {
        foundationUI.wait(target);
    }

    ns.ui.clearWait = function () {
        foundationUI.clearWait();
    }

})(window, Granite.$, window.eai = window.eai || {});