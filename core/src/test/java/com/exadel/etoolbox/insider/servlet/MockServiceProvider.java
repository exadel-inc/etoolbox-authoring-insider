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
package com.exadel.etoolbox.insider.servlet;

import com.exadel.etoolbox.insider.service.ServiceProvider;
import org.apache.sling.api.SlingHttpServletRequest;
import org.jetbrains.annotations.NotNull;

class MockServiceProvider implements ServiceProvider {
    @Override
    @NotNull
    public String getId() {
        return "mock";
    }

    @Override
    @NotNull
    public String getResponse(SlingHttpServletRequest request) {
        return "Lorem ipsum";
    }
}
