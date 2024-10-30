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
import org.apache.commons.io.IOUtils;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.SlingHttpServletResponse;
import org.apache.sling.api.servlets.HttpConstants;
import org.apache.sling.api.servlets.ServletResolverConstants;
import org.apache.sling.api.servlets.SlingAllMethodsServlet;
import org.apache.sling.api.wrappers.SlingHttpServletRequestWrapper;
import org.jetbrains.annotations.NotNull;
import org.osgi.service.component.annotations.Component;

import javax.servlet.RequestDispatcher;
import javax.servlet.Servlet;
import javax.servlet.ServletException;
import java.io.IOException;

/**
 * A Sling Servlet implementation that processes POST requests targeted at Granite UI dialogs with a specific selector.
 * This implementation serves as kind of proxy to convert a contentful request that features dialog field definitions
 * into an ordinary GET request for a dialog that can be processed by {@link ConfigDialogDatasource}
 */
@Component(
        service = Servlet.class,
        property = {
                ServletResolverConstants.SLING_SERVLET_METHODS + "=POST",
                ServletResolverConstants.SLING_SERVLET_RESOURCE_TYPES + "=granite/ui/components/coral/foundation/dialog",
                ServletResolverConstants.SLING_SERVLET_SELECTORS + "=eai",
                ServletResolverConstants.SLING_SERVLET_EXTENSIONS + "=html",
        }
)
public class ConfigDialogServlet extends SlingAllMethodsServlet {

    /**
     * Processes a POST request that targets at a Granite UI dialog resource and contains the {@code .eai.} selector
     * @param request  The {@link SlingHttpServletRequest} object
     * @param response The {@link SlingHttpServletResponse} object
     * @throws ServletException If a routing error occurs during request processing
     * @throws IOException      If an I/O error occurs
     */
    @Override
    protected void doPost(
            @NotNull SlingHttpServletRequest request,
            @NotNull SlingHttpServletResponse response) throws ServletException, IOException {

        RequestDispatcher requestDispatcher = request.getRequestDispatcher(request.getResource());
        if (requestDispatcher == null) {
            response.sendError(404, "Not found");
            return;
        }
        SlingHttpServletRequest wrappedRequest = new SlingHttpServletRequestWrapper(request) {
            @Override
            public String getMethod() {
                return HttpConstants.METHOD_GET;
            }
        };
        wrappedRequest.setAttribute(Constants.PROP_FIELDS, IOUtils.toString(request.getReader()));
        requestDispatcher.forward(wrappedRequest, response);
    }
}
