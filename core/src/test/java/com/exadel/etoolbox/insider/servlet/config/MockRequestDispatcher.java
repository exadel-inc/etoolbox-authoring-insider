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

import com.exadel.etoolbox.insider.util.Constants;
import lombok.Getter;
import org.apache.sling.api.SlingHttpServletRequest;

import javax.servlet.RequestDispatcher;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;

@Getter
class MockRequestDispatcher implements RequestDispatcher {
    private String lastRequestMethod;
    private String lastRequestFieldsAttribute;

    @Override
    public void forward(ServletRequest request, ServletResponse response) {
        lastRequestMethod = ((SlingHttpServletRequest) request).getMethod();
        lastRequestFieldsAttribute = request.getAttribute(Constants.PROP_FIELDS).toString();
    }

    @Override
    public void include(ServletRequest request, ServletResponse response) {
        throw new UnsupportedOperationException("Not implemented");
    }
}
