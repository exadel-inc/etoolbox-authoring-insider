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

import com.exadel.etoolbox.insider.service.ServiceException;
import com.exadel.etoolbox.insider.service.ServiceProvider;
import com.exadel.etoolbox.insider.util.JsonUtil;
import org.apache.commons.lang3.StringUtils;
import org.apache.http.HttpHeaders;
import org.apache.http.HttpStatus;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.SlingHttpServletResponse;
import org.apache.sling.api.servlets.ServletResolverConstants;
import org.apache.sling.api.servlets.SlingAllMethodsServlet;
import org.jetbrains.annotations.NotNull;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.osgi.service.component.annotations.ReferenceCardinality;
import org.osgi.service.component.annotations.ReferencePolicy;

import javax.servlet.Servlet;
import java.io.IOException;
import java.util.List;

/**
 * A Sling Servlet implementation that relays requests to service providers based on the provider ID
 * @see ServiceProvider
 */
@Component(
        service = Servlet.class,
        property = {
                ServletResolverConstants.SLING_SERVLET_METHODS + "=POST",
                ServletResolverConstants.SLING_SERVLET_RESOURCE_TYPES + "=/bin/etoolbox/authoring-insider/relay",
                ServletResolverConstants.SLING_SERVLET_EXTENSIONS + "=json"
        }
)
public class RelayServlet extends SlingAllMethodsServlet {

    @Reference(cardinality = ReferenceCardinality.MULTIPLE, policy = ReferencePolicy.DYNAMIC)
    private volatile List<ServiceProvider> providers;

    /**
     * Processes a POST request targeted at a resource with the {@code /bin/etoolbox/authoring-insider/relay} resource
     * type
     * @param request  The {@link SlingHttpServletRequest} object
     * @param response The {@link SlingHttpServletResponse} object
     * @throws IOException If an I/O error occurs
     */
    @Override
    protected void doPost(
            @NotNull SlingHttpServletRequest request,
            @NotNull SlingHttpServletResponse response) throws IOException {

        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-cache");

        String providerString = StringUtils.strip(request.getRequestPathInfo().getSuffix(), "/ ");
        if (StringUtils.isEmpty(providerString)) {
            outputError(response, HttpStatus.SC_BAD_REQUEST, "Service provider is not specified");
            return;
        }

        ServiceProvider matchingProvider = providers.stream()
                .filter(p -> StringUtils.equals(p.getId(), providerString))
                .findFirst()
                .orElse(null);
        if (matchingProvider == null) {
            outputError(response, HttpStatus.SC_NOT_FOUND, "Service provider not found");
            return;
        }

        String responseString;
        try {
            responseString = matchingProvider.getResponse(request);
        } catch (ServiceException e) {
            outputError(response, HttpStatus.SC_INTERNAL_SERVER_ERROR, e.getMessage());
            return;
        }

        if (StringUtils.isEmpty(responseString)) {
            outputError(response, HttpStatus.SC_INTERNAL_SERVER_ERROR, "Service provider returned an empty response");
            return;
        }

        JsonUtil.writeTo(response, responseString);
    }

    private static void outputError(@NotNull SlingHttpServletResponse response, int status, String message) throws IOException {
        JsonUtil.writeTo(response, status, "error", message);
    }
}
