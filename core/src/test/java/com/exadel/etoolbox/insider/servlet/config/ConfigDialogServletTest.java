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

import io.wcm.testing.mock.aem.junit5.AemContext;
import io.wcm.testing.mock.aem.junit5.AemContextExtension;
import org.apache.sling.testing.mock.sling.servlet.MockRequestPathInfo;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import javax.servlet.ServletException;
import java.io.IOException;

@ExtendWith({AemContextExtension.class})
public class ConfigDialogServletTest {

    private final AemContext context = new AemContext();

    private ConfigDialogServlet servlet;

    @BeforeEach
    public void init() {
        context.load().json(
                "/com/exadel/etoolbox/insider/servlet/config/dialog.json",
                "/content/etoolbox/authoring-insider/dialog");
        servlet = context.registerInjectActivateService(new ConfigDialogServlet());
    }

    @Test
    public void shouldForwardRequest() throws ServletException, IOException {
        MockRequestPathInfo requestPathInfo = (MockRequestPathInfo) context.request().getRequestPathInfo();
        requestPathInfo.setSelectorString("eak");
        context.request().setResource(context.resourceResolver().getResource("/content/etoolbox/authoring-insider/dialog"));
        context.request().setContent(ConfigDialogDatasourceTest.FIELDS.getBytes());
        MockRequestDispatcher mockRequestDispatcher = new MockRequestDispatcher();
        context.request().setRequestDispatcherFactory(new MockRequestDispatcherFactory(mockRequestDispatcher));

        servlet.doPost(context.request(), context.response());

        Assertions.assertEquals("GET", mockRequestDispatcher.getLastRequestMethod());
        Assertions.assertEquals(ConfigDialogDatasourceTest.FIELDS, mockRequestDispatcher.getLastRequestFieldsAttribute());
    }

    @Test
    public void shouldReport404IfNoDispatcher() throws ServletException, IOException {
        MockRequestPathInfo requestPathInfo = (MockRequestPathInfo) context.request().getRequestPathInfo();
        requestPathInfo.setSelectorString("eak");
        MockRequestDispatcher mockRequestDispatcher = new MockRequestDispatcher();
        context.request().setRequestDispatcherFactory(new MockRequestDispatcherFactory(mockRequestDispatcher));

        servlet.doPost(context.request(), context.response());

        Assertions.assertEquals(404, context.response().getStatus());
    }
}
