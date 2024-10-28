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
package com.exadel.etoolbox.insider.servlet.config;

import lombok.RequiredArgsConstructor;
import org.apache.sling.api.request.RequestDispatcherOptions;
import org.apache.sling.api.resource.Resource;

import javax.servlet.RequestDispatcher;

@RequiredArgsConstructor
class MockRequestDispatcherFactory implements org.apache.sling.testing.mock.sling.servlet.MockRequestDispatcherFactory {
    private final MockRequestDispatcher mockRequestDispatcher;

    @Override
    public RequestDispatcher getRequestDispatcher(String path, RequestDispatcherOptions options) {
        return mockRequestDispatcher;
    }

    @Override
    public RequestDispatcher getRequestDispatcher(Resource resource, RequestDispatcherOptions options) {
        if (resource == null) {
            return null;
        }
        return mockRequestDispatcher;
    }
}
