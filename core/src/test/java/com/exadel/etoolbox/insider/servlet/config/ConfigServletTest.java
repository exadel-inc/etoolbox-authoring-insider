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
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import io.wcm.testing.mock.aem.junit5.AemContext;
import io.wcm.testing.mock.aem.junit5.AemContextExtension;
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

        String output = context.response().getOutputAsString();
        JsonObject json = JsonParser.parseString(output).getAsJsonObject();

        Assertions.assertNotNull(json);
        Assertions.assertTrue(json.has("tools"));
        Assertions.assertTrue(json.has("providers"));

        JsonArray toolsList = json.get("tools").getAsJsonArray();
        Assertions.assertEquals(3, toolsList.size());

        JsonObject tool = toolsList.get(0).getAsJsonObject();
        Assertions.assertEquals("tools/item0", tool.get(Constants.PROP_PATH).getAsString());
        Assertions.assertEquals(0, tool.get("ordinal").getAsInt());
        Assertions.assertTrue(tool.get("enabled").getAsBoolean());
        Assertions.assertEquals("edit", tool.get("icon").getAsString());
        Assertions.assertEquals("Tool 0", tool.get("title").getAsString());
        Assertions.assertEquals("Create a new page", tool.get("prompt").getAsString());
        Assertions.assertEquals("input", tool.getAsJsonArray("selectors").get(0).getAsString());

        tool = toolsList.get(1).getAsJsonObject();
        Assertions.assertEquals("tools/item1", tool.get(Constants.PROP_PATH).getAsString());
        Assertions.assertEquals(1, tool.get("ordinal").getAsInt());
        Assertions.assertFalse(tool.get("enabled").getAsBoolean());
        Assertions.assertNull(tool.get("icon"));
        Assertions.assertEquals("Tool 1", tool.get("title").getAsString());
        Assertions.assertEquals("Create a new component", tool.get("prompt").getAsString());

        tool = toolsList.get(2).getAsJsonObject();
        Assertions.assertEquals("tools/item2", tool.get(Constants.PROP_PATH).getAsString());
        Assertions.assertEquals(2, tool.get("ordinal").getAsInt());
        Assertions.assertTrue(tool.get("enabled").getAsBoolean());
        Assertions.assertNull(tool.get("icon"));
        Assertions.assertNull(tool.get("title"));

        JsonArray providersList = json.get("providers").getAsJsonArray();
        Assertions.assertEquals(3, providersList.size());

        JsonObject provider = providersList.get(0).getAsJsonObject();
        Assertions.assertEquals("providers/item0", provider.get(Constants.PROP_PATH).getAsString());
        Assertions.assertEquals(0, provider.get("ordinal").getAsInt());
        Assertions.assertTrue(provider.get("enabled").getAsBoolean());
        Assertions.assertEquals("model", provider.get("icon").getAsString());
        Assertions.assertEquals("Provider 0", provider.get("title").getAsString());
        Assertions.assertEquals("llm.own", provider.get("type").getAsString());
        Assertions.assertEquals("http://localhost:10001", provider.get("url").getAsString());

        provider = providersList.get(1).getAsJsonObject();
        Assertions.assertEquals("providers/item1", provider.get(Constants.PROP_PATH).getAsString());
        Assertions.assertEquals(1, provider.get("ordinal").getAsInt());
        Assertions.assertFalse(provider.get("enabled").getAsBoolean());
        Assertions.assertNull(provider.get("icon"));
        Assertions.assertEquals("Provider 1", provider.get("title").getAsString());
        Assertions.assertEquals("llm.own", provider.get("type").getAsString());

        provider = providersList.get(2).getAsJsonObject();
        Assertions.assertEquals("providers/item2", provider.get(Constants.PROP_PATH).getAsString());
        Assertions.assertEquals(2, provider.get("ordinal").getAsInt());
        Assertions.assertTrue(provider.get("enabled").getAsBoolean());
        Assertions.assertNull(provider.get("icon"));
        Assertions.assertNull(provider.get("title"));
    }

    @Test
    public void shouldOutputEmptyConfig() throws IOException {
        servlet.doGet(context.request(), context.response());
        Assertions.assertEquals(200, context.response().getStatus());

        String output = context.response().getOutputAsString();
        JsonObject json = JsonParser.parseString(output).getAsJsonObject();

        Assertions.assertNotNull(json);
        Assertions.assertTrue(json.has("tools"));
        Assertions.assertEquals(0, json.get("tools").getAsJsonArray().size());
        Assertions.assertTrue(json.has("providers"));
        Assertions.assertEquals(0, json.get("providers").getAsJsonArray().size());
    }
}
