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

import io.wcm.testing.mock.aem.junit5.AemContext;
import io.wcm.testing.mock.aem.junit5.AemContextExtension;
import org.apache.commons.lang.StringUtils;
import org.apache.http.HttpHeaders;
import org.apache.http.HttpStatus;
import org.apache.sling.testing.mock.sling.servlet.MockRequestPathInfo;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import javax.servlet.ServletException;
import java.io.IOException;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

@ExtendWith({AemContextExtension.class})
public class RelayServletTest {

    private final AemContext context = new AemContext();

    private RelayServlet servlet;

    @BeforeEach
    public void init() {
        context.load().json(
                "/com/exadel/etoolbox/insider/servlet/content.json",
                "/content/etoolbox/authoring-insider/servlet/relay");

        context.registerService(new MockServiceProvider());
        context.registerService(new MockFailingServiceProvider());

        Map<String, Object> relayServletProperties = new HashMap<>();
        relayServletProperties.put("waitTimeout", 100);
        relayServletProperties.put("cacheKeepAlive", 200);
        servlet = context.registerInjectActivateService(new RelayServlet(), relayServletProperties);
    }

    @Test
    public void shouldRelayToProperServiceProvider() throws IOException {
        ((MockRequestPathInfo) context.request().getRequestPathInfo()).setSuffix("/mock");

        servlet.doPost(context.request(), context.response());

        Assertions.assertEquals(HttpStatus.SC_OK, context.response().getStatus());
        Assertions.assertTrue(context.response().getHeader(HttpHeaders.CACHE_CONTROL).contains("no-cache"));
        Assertions.assertEquals("Lorem ipsum", context.response().getOutputAsString());
    }

    @Test
    public void shouldReport202IfSlow() throws IOException {
        context.request().setParameterMap(Collections.singletonMap("slow", Boolean.TRUE.toString()));
        ((MockRequestPathInfo) context.request().getRequestPathInfo()).setSuffix("/mock");

        servlet.doPost(context.request(), context.response());

        Assertions.assertEquals(HttpStatus.SC_ACCEPTED, context.response().getStatus());
        String output = context.response().getOutputAsString();
        Assertions.assertTrue(output.contains("\"task\":"));
    }

    @Test
    public void shouldHandleFutureTaskWhenSlow() throws IOException {
        context.request().setParameterMap(Collections.singletonMap("slow", Boolean.TRUE.toString()));
        ((MockRequestPathInfo) context.request().getRequestPathInfo()).setSuffix("/mock");

        servlet.doPost(context.request(), context.response());

        String taskId = StringUtils.substringBetween(context.response().getOutputAsString(), "\"task\":\"", "\"");
        Assertions.assertTrue(StringUtils.isNotBlank(taskId));

        Executors.newSingleThreadScheduledExecutor().schedule(
                () -> {
                    ((MockRequestPathInfo) context.request().getRequestPathInfo()).setSuffix("/task/" + taskId);
                    try {
                        servlet.doGet(context.request(), context.response());
                        Assertions.assertEquals(HttpStatus.SC_OK, context.response().getStatus());
                        Assertions.assertEquals("Lorem ipsum", context.response().getOutputAsString());
                        // Task future is only memoized for a single request
                        servlet.doGet(context.request(), context.response());
                        Assertions.assertEquals(HttpStatus.SC_NOT_FOUND, context.response().getStatus());
                    } catch (ServletException | IOException e) {
                        throw new RuntimeException(e);
                    }
                },
                200,
                TimeUnit.MILLISECONDS);
    }

    @Test
    public void shouldForgetFutureTaskIfNotRequested() throws IOException {
        context.request().setParameterMap(Collections.singletonMap("slow", Boolean.TRUE.toString()));
        ((MockRequestPathInfo) context.request().getRequestPathInfo()).setSuffix("/mock");

        servlet.doPost(context.request(), context.response());

        String taskId = StringUtils.substringBetween(context.response().getOutputAsString(), "\"task\":\"", "\"");
        Assertions.assertTrue(StringUtils.isNotBlank(taskId));

        Executors.newSingleThreadScheduledExecutor().schedule(
                () -> {
                    ((MockRequestPathInfo) context.request().getRequestPathInfo()).setSuffix("/task/" + taskId);
                    try {
                        servlet.doGet(context.request(), context.response());
                        Assertions.assertEquals(HttpStatus.SC_NOT_FOUND, context.response().getStatus());
                    } catch (ServletException | IOException e) {
                        throw new RuntimeException(e);
                    }
                },
                300,
                TimeUnit.MILLISECONDS);
    }

    @Test
    public void shouldReport400IfNoSuffix() throws IOException {
        servlet.doPost(context.request(), context.response());

        Assertions.assertEquals(HttpStatus.SC_BAD_REQUEST, context.response().getStatus());
    }

    @Test
    public void shouldReport400IfNoTaskSuffix() throws IOException, ServletException {
        servlet.doGet(context.request(), context.response());
        Assertions.assertEquals(HttpStatus.SC_BAD_REQUEST, context.response().getStatus());

        ((MockRequestPathInfo) context.request().getRequestPathInfo()).setSuffix("/task");
        servlet.doGet(context.request(), context.response());
    }

    @Test
    public void shouldReport404IfNoServiceProviderFound() throws IOException {
        ((MockRequestPathInfo) context.request().getRequestPathInfo()).setSuffix("/non-existent");

        servlet.doPost(context.request(), context.response());

        Assertions.assertEquals(HttpStatus.SC_NOT_FOUND, context.response().getStatus());
    }

    @Test
    public void shouldReport404IfNoTaskFound() throws IOException, ServletException {
        ((MockRequestPathInfo) context.request().getRequestPathInfo()).setSuffix("/task/dummy");

        servlet.doGet(context.request(), context.response());

        Assertions.assertEquals(HttpStatus.SC_NOT_FOUND, context.response().getStatus());
    }

    @Test
    public void shouldReport500IfServiceProviderFails() throws IOException {
        ((MockRequestPathInfo) context.request().getRequestPathInfo()).setSuffix("/mock-failing");

        servlet.doPost(context.request(), context.response());

        Assertions.assertEquals(HttpStatus.SC_INTERNAL_SERVER_ERROR, context.response().getStatus());
        Assertions.assertEquals("{\"error\":\"Dolor sit amet\"}", context.response().getOutputAsString());
    }
}
