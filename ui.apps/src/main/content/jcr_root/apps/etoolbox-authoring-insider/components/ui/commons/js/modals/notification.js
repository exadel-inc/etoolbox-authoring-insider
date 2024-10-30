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

    /**
     * Displays a Granite alert notification
     * @param {string} title - The alert title
     * @param {string} message - The alert message to display
     * @param {string} type - The alert type (error|info)
     */
    ns.ui.alert = function (title, message, type) {
        console[type === 'error' ? 'error' : 'info'](message);
        foundationUI.alert(title, `<div class="notification">${message}</div>`, type);
    };

    /**
     * Displays a Granite prompt / confirmation dialog with the "OK" and "Cancel" buttons. This function returns a
     * {@code Promise}. If the "OK" button is clicked, the promise will be resolved with {@code true}, otherwise with
     * {@code false}
     * @param {string} title - The prompt dialog title
     * @param {string} message - The prompt dialog message
     * @param {string} type - The prompt dialog type (default|error|info)
     * @returns {Promise<boolean>}
     */
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
    };

    /**
     * Displays a Granite notification bar
     * @param {string} title - The notification title
     * @param {string} message - The notification message
     * @param {string} type - The notification type
     */
    ns.ui.notify = function (title, message, type) {
        foundationUI.notify(title, message, type);
    };

    /**
     * Displays a Granite spinner (wait indicator)
     * @param {*|Element} target - An optional target element to display the spinner inside
     */
    ns.ui.wait = function (target) {
        foundationUI.wait(target);
    };

    /**
     * Removes the Granite spinner (wait indicator)
     */
    ns.ui.clearWait = function () {
        foundationUI.clearWait();
    };

})(window, Granite.$, window.eai = window.eai || {});
