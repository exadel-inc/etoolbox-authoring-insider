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
package com.exadel.etoolbox.insider.servlet.relay;

import com.exadel.etoolbox.insider.service.ServiceException;
import com.exadel.etoolbox.insider.service.provider.ServiceProvider;
import com.exadel.etoolbox.insider.util.Constants;
import com.exadel.etoolbox.insider.util.JsonUtil;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.http.HttpHeaders;
import org.apache.http.HttpStatus;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.SlingHttpServletResponse;
import org.apache.sling.api.servlets.ServletResolverConstants;
import org.apache.sling.api.servlets.SlingAllMethodsServlet;
import org.jetbrains.annotations.NotNull;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Deactivate;
import org.osgi.service.component.annotations.Reference;
import org.osgi.service.component.annotations.ReferenceCardinality;
import org.osgi.service.component.annotations.ReferencePolicy;
import org.osgi.service.metatype.annotations.Designate;

import javax.servlet.Servlet;
import javax.servlet.ServletException;
import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Supplier;

/**
 * A Sling Servlet implementation that relays requests to service providers and returns their responses in synchronous
 * or asynchronous mode
 * @see ServiceProvider
 */
@Component(
        service = Servlet.class,
        property = {
                ServletResolverConstants.SLING_SERVLET_METHODS + "=GET",
                ServletResolverConstants.SLING_SERVLET_METHODS + "=POST",
                ServletResolverConstants.SLING_SERVLET_RESOURCE_TYPES + "=/bin/etoolbox/authoring-insider/relay",
                ServletResolverConstants.SLING_SERVLET_EXTENSIONS + "=json"
        }
)
@Designate(ocd = RelayConfig.class)
@Slf4j
public class RelayServlet extends SlingAllMethodsServlet {

    private static final String PROP_TASK = "task";

    @Reference(cardinality = ReferenceCardinality.MULTIPLE, policy = ReferencePolicy.DYNAMIC)
    private volatile List<ServiceProvider> providers;

    private Cache<Future<StatusResponse>> responseCache;
    private int waitTimeout;

    @Activate
    private void activate(RelayConfig config) {
        responseCache = new Cache<>(config.cacheKeepAlive());
        waitTimeout = config.waitTimeout();
    }

    @Deactivate
    private void deactivate() {
        if (responseCache != null) {
            responseCache.close();
        }
    }

    /**
     * Processes a GET request targeted at a resource with the {@code /bin/etoolbox/authoring-insider/relay} resource
     * type. This method is used to handle secondary requests for a task that is being processed asynchronously
     * @param request  The {@link SlingHttpServletRequest} object
     * @param response The {@link SlingHttpServletResponse} object
     * @throws IOException If an I/O error occurs
     */
    @Override
    protected void doGet(
            @NotNull SlingHttpServletRequest request,
            @NotNull SlingHttpServletResponse response) throws ServletException, IOException {

        response.setHeader(HttpHeaders.CACHE_CONTROL, Constants.HEADER_NO_CACHE);

        if (!StringUtils.contains(
                request.getRequestPathInfo().getSuffix(),
                Constants.SEPARATOR_SLASH + PROP_TASK + Constants.SEPARATOR_SLASH)) {
            outputError(response, HttpStatus.SC_BAD_REQUEST, "Task is not specified");
            return;
        }

        String taskId = StringUtils.substringAfterLast(request.getRequestPathInfo().getSuffix(), Constants.SEPARATOR_SLASH);
        Future<StatusResponse> statusResponseFuture = responseCache.get(taskId);
        if (statusResponseFuture == null) {
            outputError(response, HttpStatus.SC_NOT_FOUND, "Task is not found");
            return;
        }
        if (!statusResponseFuture.isDone()) {
            JsonUtil.writeTo(response, HttpStatus.SC_OK, PROP_TASK, taskId);
            return;
        }

        responseCache.remove(taskId);
        StatusResponse result;
        try {
            result = statusResponseFuture.get();
        } catch (ExecutionException | InterruptedException e) {
            outputError(response, HttpStatus.SC_INTERNAL_SERVER_ERROR, e.getMessage());
            return;
        }
        if (result == null) {
            outputError(response, HttpStatus.SC_SERVICE_UNAVAILABLE, "No result retrieved");
        } else if (result.isError()) {
            outputError(response, result.getStatus(), result.getMessage());
        } else {
            JsonUtil.writeTo(response, result.getStatus(), result.getMessage());
        }
    }

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

        response.setHeader(HttpHeaders.CACHE_CONTROL, Constants.HEADER_NO_CACHE);

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
            outputError(response, HttpStatus.SC_NOT_FOUND, "Service provider is not found");
            return;
        }

        StatusResponse result = waitForResponse(request, matchingProvider);
        if (result == null) {
            outputError(response, HttpStatus.SC_SERVICE_UNAVAILABLE, "No response of processing interrupted");
        } else if (result.isError()) {
            outputError(response, result.getStatus(), result.getMessage());
        } else {
            JsonUtil.writeTo(response, result.getStatus(), result.getMessage());
        }
    }

    private StatusResponse waitForResponse(
            SlingHttpServletRequest request,
            ServiceProvider provider) {

        CountDownLatch waiting = new CountDownLatch(1);

        Supplier<StatusResponse> execRoutine = () -> {
            String responseString;
            try {
                responseString = provider.getResponse(request);
                waiting.countDown();
                return new StatusResponse(HttpStatus.SC_OK, responseString);
            } catch (ServiceException e) {
                return new StatusResponse(HttpStatus.SC_INTERNAL_SERVER_ERROR, e.getMessage());
            }
        };
        CompletableFuture<StatusResponse> execFuture = CompletableFuture.supplyAsync(execRoutine);

        try {
            return execFuture.get(waitTimeout, TimeUnit.MILLISECONDS);
        } catch (InterruptedException | ExecutionException e) {
            return new StatusResponse(HttpStatus.SC_INTERNAL_SERVER_ERROR, e.getMessage());
        } catch (TimeoutException e) {
            String newTaskId = responseCache.put(execFuture);
            String message = JsonUtil.toJson(Collections.singletonMap(PROP_TASK, newTaskId));
            return new StatusResponse(HttpStatus.SC_ACCEPTED, message);
        }
    }

    private static void outputError(@NotNull SlingHttpServletResponse response, int status, String message) throws IOException {
        JsonUtil.writeTo(response, status, Constants.PROP_ERROR, message);
    }

    @RequiredArgsConstructor
    @Getter
    private static class StatusResponse {
        private final int status;
        private final String message;
        boolean isError() {
            return status >= HttpStatus.SC_BAD_REQUEST;
        }
    }
}
