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
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.wcm.testing.mock.aem.junit5.AemContext;
import io.wcm.testing.mock.aem.junit5.AemContextExtension;
import org.apache.http.HttpHeaders;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import java.io.IOException;

@ExtendWith({AemContextExtension.class})
public class ConfigServletTest {

    private final AemContext context = new AemContext();

    private ConfigServlet servlet;

    @BeforeEach
    public void init() {
        servlet = context.registerInjectActivateService(new ConfigServlet());
    }

    @Test
    public void shouldOutputConfig() throws IOException {
        context.load().json(
                "/com/exadel/etoolbox/insider/servlet/config/conf.json",
                "/conf/etoolbox/authoring-insider");
        servlet.doGet(context.request(), context.response());
        Assertions.assertEquals(200, context.response().getStatus());
        Assertions.assertTrue(context.response().getHeader(HttpHeaders.CACHE_CONTROL).contains("no-cache"));

        String output = context.response().getOutputAsString();
        JsonNode json = new ObjectMapper().readTree(output);

        Assertions.assertNotNull(json);
        Assertions.assertTrue(json.has("tools"));
        Assertions.assertTrue(json.has("providers"));

        JsonNode toolsList = json.get("tools");
        Assertions.assertEquals(4, toolsList.size());

        JsonNode tool = toolsList.get(0);
        Assertions.assertEquals("tools/item0", tool.get(Constants.PROP_PATH).asText());
        Assertions.assertEquals(0, tool.get("ordinal").asInt());
        Assertions.assertTrue(tool.get("enabled").asBoolean());
        Assertions.assertEquals("edit", tool.get("icon").asText());
        Assertions.assertEquals("Tool 0", tool.get("title").asText());
        Assertions.assertEquals("Create a new page", tool.get("prompt").asText());
        Assertions.assertEquals("input", tool.get("selectors").get(0).asText());

        tool = toolsList.get(1);
        Assertions.assertEquals("tools/item1", tool.get(Constants.PROP_PATH).asText());
        Assertions.assertEquals(1, tool.get("ordinal").asInt());
        Assertions.assertFalse(tool.get("enabled").asBoolean());
        Assertions.assertNull(tool.get("icon"));
        Assertions.assertEquals("Tool 1", tool.get("title").asText());
        Assertions.assertEquals("Create a new component", tool.get("prompt").asText());

        tool = toolsList.get(2);
        Assertions.assertEquals("tools/item2", tool.get(Constants.PROP_PATH).asText());
        Assertions.assertEquals(2, tool.get("ordinal").asInt());
        Assertions.assertTrue(tool.get("enabled").asBoolean());
        Assertions.assertNull(tool.get("icon"));
        Assertions.assertNull(tool.get("title"));

        tool = toolsList.get(3);
        Assertions.assertEquals("tools/item3", tool.get(Constants.PROP_PATH).asText());
        Assertions.assertFalse(tool.get("enabled").asBoolean());

        JsonNode providersList = json.get("providers");
        Assertions.assertEquals(3, providersList.size());

        JsonNode provider = providersList.get(0);
        Assertions.assertEquals("providers/item0", provider.get(Constants.PROP_PATH).asText());
        Assertions.assertEquals(0, provider.get("ordinal").asInt());
        Assertions.assertTrue(provider.get("enabled").asBoolean());
        Assertions.assertEquals("model", provider.get("icon").asText());
        Assertions.assertEquals("Provider 0", provider.get("title").asText());
        Assertions.assertEquals("llm.external", provider.get("type").asText());
        Assertions.assertEquals("http://localhost:10001", provider.get("url").asText());

        provider = providersList.get(1);
        Assertions.assertEquals("providers/item1", provider.get(Constants.PROP_PATH).asText());
        Assertions.assertEquals(1, provider.get("ordinal").asInt());
        Assertions.assertFalse(provider.get("enabled").asBoolean());
        Assertions.assertNull(provider.get("icon"));
        Assertions.assertEquals("Provider 1", provider.get("title").asText());
        Assertions.assertEquals("llm.own", provider.get("type").asText());

        provider = providersList.get(2);
        Assertions.assertEquals("providers/item2", provider.get(Constants.PROP_PATH).asText());
        Assertions.assertEquals(2, provider.get("ordinal").asInt());
        Assertions.assertTrue(provider.get("enabled").asBoolean());
        Assertions.assertNull(provider.get("icon"));
        Assertions.assertNull(provider.get("title"));
    }

    @Test
    public void shouldOutputEmptyConfig() throws IOException {
        servlet.doGet(context.request(), context.response());
        Assertions.assertEquals(200, context.response().getStatus());

        String output = context.response().getOutputAsString();
        JsonNode json = new ObjectMapper().readTree(output);

        Assertions.assertNotNull(json);
        Assertions.assertTrue(json.has("tools"));
        Assertions.assertEquals(0, json.get("tools").size());
        Assertions.assertTrue(json.has("providers"));
        Assertions.assertEquals(0, json.get("providers").size());
    }
}
