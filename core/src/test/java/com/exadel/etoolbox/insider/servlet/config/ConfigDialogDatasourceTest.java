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

import com.adobe.granite.ui.components.FormData;
import com.adobe.granite.ui.components.ds.DataSource;
import com.exadel.etoolbox.insider.util.Constants;
import io.wcm.testing.mock.aem.junit5.AemContext;
import io.wcm.testing.mock.aem.junit5.AemContextExtension;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ValueMap;
import org.apache.sling.jcr.resource.api.JcrResourceConstants;
import org.apache.sling.testing.mock.sling.servlet.MockRequestPathInfo;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import java.util.List;
import java.util.Objects;
import java.util.Spliterators;
import java.util.Stack;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

@ExtendWith({AemContextExtension.class})
public class ConfigDialogDatasourceTest {

    static final String FIELDS = "[" +
            "{\"name\":\"url\",\"title\":\"Url\",\"required\":true}," +
            "{\"name\":\"models\",\"title\":\"Models\",\"multi\":true}," +
            "{\"name\":\"details\",\"title\":\"Details level\",\"type\":\"select\", \"options\":[\"low\", \"high\"]}" +
            "]";

    private final AemContext context = new AemContext();

    private ConfigDialogDatasource servlet;

    @BeforeEach
    public void init() {
        context.load().json(
                "/com/exadel/etoolbox/insider/servlet/config/conf.json",
                "/conf/etoolbox/authoring-insider");
        context.load().json(
                "/com/exadel/etoolbox/insider/servlet/config/dialog.json",
                "/content/etoolbox/authoring-insider/dialog");
        servlet = context.registerInjectActivateService(new ConfigDialogDatasource());
        context.request().setResource(context.resourceResolver().getResource("/content/etoolbox/authoring-insider/dialog/container"));
    }

    @Test
    public void shouldParsePackedDetails() {
        MockRequestPathInfo requestPathInfo = (MockRequestPathInfo) context.request().getRequestPathInfo();
        requestPathInfo.setSuffix("/conf/etoolbox/authoring-insider/tools/item0");

        servlet.doGet(context.request(), context.response());
        Stack<?> formDataStack = (Stack<?>) context.request().getAttribute(FormData.class.getName());

        Assertions.assertNotNull(formDataStack);
        FormData formData = (FormData) formDataStack.pop();

        ValueMap valueMap = formData.getValueMap();
        Assertions.assertEquals(3, valueMap.size());
        Assertions.assertEquals("Create a new page", valueMap.get("prompt", String.class));
        Assertions.assertArrayEquals(new String[]{"input", ".cq-RichText"}, valueMap.get("selectors", String[].class));
    }

    @Test
    public void shouldCreateDialogContent() {
        context.request().setAttribute(Constants.PROP_FIELDS, FIELDS);

        servlet.doGet(context.request(), context.response());
        DataSource dataSource = (DataSource) context.request().getAttribute(DataSource.class.getName());

        Assertions.assertNotNull(dataSource);
        List<Resource> dialogFields = StreamSupport
                .stream(Spliterators.spliteratorUnknownSize(dataSource.iterator(), 0), false)
                .flatMap(resource -> {
                    Resource items = resource.getChild("items");
                    if (resource.getResourceType().contains("/container") && items != null) {
                        return StreamSupport.stream(Spliterators.spliteratorUnknownSize(items.listChildren(), 0), false);
                    }
                    return Stream.of(resource);
                })
                .collect(Collectors.toList());

        Assertions.assertEquals(7, dialogFields.size());

        ValueMap dialogFieldProperties = dialogFields.get(0).getValueMap();
        Assertions.assertEquals(
                "granite/ui/components/coral/foundation/form/checkbox",
                dialogFieldProperties.get(JcrResourceConstants.SLING_RESOURCE_TYPE_PROPERTY, String.class));
        Assertions.assertEquals("enabled", dialogFieldProperties.get("name", String.class));
        Assertions.assertEquals("Enabled", dialogFieldProperties.get("text", String.class));

        dialogFieldProperties = dialogFields.get(1).getValueMap();
        Assertions.assertEquals(
                "granite/ui/components/coral/foundation/form/textfield",
                dialogFieldProperties.get(JcrResourceConstants.SLING_RESOURCE_TYPE_PROPERTY, String.class));
        Assertions.assertEquals("type", dialogFieldProperties.get("name", String.class));
        Assertions.assertTrue(dialogFieldProperties.get("disabled", false));

        dialogFieldProperties = dialogFields.get(2).getValueMap();
        Assertions.assertEquals(
                "granite/ui/components/coral/foundation/form/textfield",
                dialogFieldProperties.get(JcrResourceConstants.SLING_RESOURCE_TYPE_PROPERTY, String.class));
        Assertions.assertEquals("title", dialogFieldProperties.get("name", String.class));
        Assertions.assertEquals("Title", dialogFieldProperties.get("fieldLabel", String.class));
        Assertions.assertTrue(dialogFieldProperties.get("required", false));

        dialogFieldProperties = dialogFields.get(3).getValueMap();
        Assertions.assertEquals(
                "granite/ui/components/coral/foundation/form/textfield",
                dialogFieldProperties.get(JcrResourceConstants.SLING_RESOURCE_TYPE_PROPERTY, String.class));
        Assertions.assertEquals("icon", dialogFieldProperties.get("name", String.class));
        Assertions.assertEquals("Icon", dialogFieldProperties.get("fieldLabel", String.class));

        dialogFieldProperties = dialogFields.get(4).getValueMap();
        Assertions.assertEquals(
                "granite/ui/components/coral/foundation/form/textfield",
                dialogFieldProperties.get(JcrResourceConstants.SLING_RESOURCE_TYPE_PROPERTY, String.class));
        Assertions.assertEquals("url", dialogFieldProperties.get("name", String.class));
        Assertions.assertEquals("Url", dialogFieldProperties.get("fieldLabel", String.class));
        Assertions.assertTrue(dialogFieldProperties.get("required", false));

        Resource dialogField = dialogFields.get(5);
        Assertions.assertEquals(
                "granite/ui/components/coral/foundation/form/multifield",
                dialogField.getValueMap().get(JcrResourceConstants.SLING_RESOURCE_TYPE_PROPERTY, String.class));
        Assertions.assertEquals("Models", dialogField.getValueMap().get("fieldLabel", String.class));
        Assertions.assertNotNull(dialogField.getChild("field"));
        dialogFieldProperties = Objects.requireNonNull(dialogField.getChild("field")).getValueMap();
        Assertions.assertEquals(
                "granite/ui/components/coral/foundation/form/textfield",
                dialogFieldProperties.get(JcrResourceConstants.SLING_RESOURCE_TYPE_PROPERTY, String.class));
        Assertions.assertEquals("models", dialogFieldProperties.get("name", String.class));

        dialogField = dialogFields.get(6);
        Assertions.assertEquals(
                "granite/ui/components/coral/foundation/form/select",
                dialogField.getValueMap().get(JcrResourceConstants.SLING_RESOURCE_TYPE_PROPERTY, String.class));
        Assertions.assertEquals("Details level", dialogField.getValueMap().get("fieldLabel", String.class));
        Resource items = dialogField.getChild("items");
        Assertions.assertNotNull(items);
        Resource item0 = items.getChild("item0");
        Assertions.assertNotNull(item0);
        dialogFieldProperties = item0.getValueMap();
        Assertions.assertEquals("low", dialogFieldProperties.get("text", String.class));
        Assertions.assertEquals("low", dialogFieldProperties.get("value", String.class));
        Resource item1 = items.getChild("item1");
        Assertions.assertNotNull(item1);
        dialogFieldProperties = item1.getValueMap();
        Assertions.assertEquals("high", dialogFieldProperties.get("text", String.class));
        Assertions.assertEquals("high", dialogFieldProperties.get("value", String.class));
    }
}
