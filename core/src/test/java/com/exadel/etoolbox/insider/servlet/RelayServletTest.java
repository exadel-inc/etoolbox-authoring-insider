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

import io.wcm.testing.mock.aem.junit5.AemContext;
import io.wcm.testing.mock.aem.junit5.AemContextExtension;
import org.apache.http.HttpHeaders;
import org.apache.sling.testing.mock.sling.servlet.MockRequestPathInfo;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import java.io.IOException;

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
        servlet = context.registerInjectActivateService(new RelayServlet());
    }

    @Test
    public void shouldRelayToProperServiceProvider() throws IOException {
        ((MockRequestPathInfo) context.request().getRequestPathInfo()).setSuffix("/mock");

        servlet.doPost(context.request(), context.response());

        Assertions.assertEquals(200, context.response().getStatus());
        Assertions.assertTrue(context.response().getHeader(HttpHeaders.CACHE_CONTROL).contains("no-cache"));
        Assertions.assertEquals("Lorem ipsum", context.response().getOutputAsString());
    }

    @Test
    public void shouldReport400IfNoSuffix() throws IOException {
        servlet.doPost(context.request(), context.response());

        Assertions.assertEquals(400, context.response().getStatus());
    }

    @Test
    public void shouldReport404IfNoServiceProviderFound() throws IOException {
        ((MockRequestPathInfo) context.request().getRequestPathInfo()).setSuffix("/non-existent");

        servlet.doPost(context.request(), context.response());

        Assertions.assertEquals(404, context.response().getStatus());
    }

    @Test
    public void shouldReport500IfServiceProviderFails() throws IOException {
        ((MockRequestPathInfo) context.request().getRequestPathInfo()).setSuffix("/mock-failing");

        servlet.doPost(context.request(), context.response());

        Assertions.assertEquals(500, context.response().getStatus());
        Assertions.assertEquals("{\"error\":\"Dolor sit amet\"}", context.response().getOutputAsString());
    }
}
