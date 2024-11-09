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

import com.adobe.granite.ui.components.ds.DataSource;
import com.adobe.granite.ui.components.ds.SimpleDataSource;
import com.exadel.etoolbox.insider.util.Constants;
import com.exadel.etoolbox.insider.util.JsonUtil;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.apache.commons.lang3.ArrayUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.jcr.resource.api.JcrResourceConstants;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * A helper class that processes a {@link SlingHttpServletRequest} object to build a Granite {@link DataSource} object
 * which contains fields for a TouchUI dialog that manages properties of a tool or a provider
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
class DatasourceHelper {

    private static final String PROP_CLASS = "granite:class";
    private static final String PROP_EMPTY_TEXT = "emptyText";
    private static final String PROP_ICON = "icon";
    private static final String PROP_LABEL = "fieldLabel";
    private static final String PROP_NAME = "name";
    private static final String PROP_REQUIRED = "required";
    private static final String PROP_TEXT = "text";
    private static final String PROP_TITLE = "title";
    private static final String PROP_TYPE = "type";
    private static final String PROP_VALUE = "value";

    private static final String RESTYPE_CHECKBOX = "granite/ui/components/coral/foundation/form/checkbox";
    private static final String RESTYPE_HIDDEN = "granite/ui/components/coral/foundation/form/hidden";
    private static final String RESTYPE_MULTIFIELD = "granite/ui/components/coral/foundation/form/multifield";
    private static final String RESTYPE_TEXT_FIELD = "granite/ui/components/coral/foundation/form/textfield";

    private static final List<String> DEFAULT_FIELDS  = Arrays.asList("enabled", PROP_TYPE, PROP_TITLE, PROP_ICON);

    /**
     * Processes a {@link SlingHttpServletRequest} object to build a {@link DataSource} object
     * @param request The {@code SlingHttpServletRequest} object that contains the dialog field definitions
     */
    static void process(SlingHttpServletRequest request) {
        List<Resource> resources = new ArrayList<>();

        List<FieldDefinition> customFields = Collections.emptyList();
        Object customFieldsAttr = request.getAttribute(Constants.PROP_FIELDS);
        if (customFieldsAttr != null) {
            customFields = JsonUtil.getList(customFieldsAttr.toString(), FieldDefinition.class);
        }

        appendDefaultFields(
                resources,
                request.getResourceResolver(),
                request.getRequestPathInfo().getResourcePath() + "/items");

        if (!customFields.isEmpty()) {
            AtomicInteger index = new AtomicInteger(DEFAULT_FIELDS.size());
            customFields
                    .stream()
                    .filter(field -> StringUtils.isNotBlank(field.getName()))
                    .filter(field -> !DEFAULT_FIELDS.contains(field.getName()))
                    .forEach(field -> field.appendTo(
                            resources,
                            request.getResourceResolver(),
                            request.getRequestPathInfo().getResourcePath() + "/items/item" + index.getAndIncrement()));
        }

        DataSource dataSource = new SimpleDataSource(resources.iterator());
        request.setAttribute(DataSource.class.getName(), dataSource);
    }

    private static void appendDefaultFields(
            List<Resource> collection,
            ResourceResolver resolver,
            String rootPath) {

        Resource enabled = VirtualResourceHelper.newResource(
                resolver,
                rootPath + "/enabled",
                JcrResourceConstants.SLING_RESOURCE_TYPE_PROPERTY, RESTYPE_CHECKBOX,
                PROP_NAME, "enabled",
                PROP_CLASS, "no-wrap",
                PROP_TEXT, "Enabled",
                "checked", Boolean.TRUE.toString(),
                "deleteHint", Boolean.FALSE.toString(),
                PROP_VALUE, Boolean.TRUE.toString(),
                "uncheckedValue", Boolean.FALSE.toString());

        Resource type = VirtualResourceHelper.newResource(
                resolver,
                rootPath + "/type",
                JcrResourceConstants.SLING_RESOURCE_TYPE_PROPERTY, RESTYPE_TEXT_FIELD,
                PROP_NAME, PROP_TYPE,
                "disabled", Boolean.TRUE.toString());

        Resource enabledAndType = VirtualResourceHelper.newContainer(
                resolver,
                rootPath + "/enabledAndType",
                Collections.singletonMap(PROP_CLASS, "horizontal-1-2"),
                enabled, type);
        collection.add(enabledAndType);

        Resource title = VirtualResourceHelper.newResource(
                resolver,
                rootPath + "/title",
                JcrResourceConstants.SLING_RESOURCE_TYPE_PROPERTY, RESTYPE_TEXT_FIELD,
                PROP_NAME, PROP_TITLE,
                PROP_LABEL, "Title",
                PROP_REQUIRED, Boolean.TRUE.toString());

        Resource icon = VirtualResourceHelper.newResource(
                resolver,
                rootPath + "/icon",
                JcrResourceConstants.SLING_RESOURCE_TYPE_PROPERTY, RESTYPE_TEXT_FIELD,
                PROP_NAME, PROP_ICON,
                PROP_LABEL, "Icon",
                PROP_EMPTY_TEXT, "If not specified, default will apply");

        Resource titleAndIcon = VirtualResourceHelper.newContainer(
                resolver,
                rootPath + "/titleAndIcon",
                Collections.singletonMap(PROP_CLASS, "horizontal-2-1"),
                title, icon);
        collection.add(titleAndIcon);
    }

    /**
     * A simple data class representing a dialog field definition that can be deserialized from a request attribute
     */
    @Getter
    @SuppressWarnings("unused")
    private static class FieldDefinition {

        private static final String TYPE_ENCRYPTED = "encrypted";
        private static final String TYPE_SELECT = "select";

        private String defaultValue;
        private boolean multi;
        private String name;
        private String placeholder;
        private String[] options;
        private boolean required;
        private String title;
        private String type;

        void appendTo(List<Resource> collection, ResourceResolver resolver, String path) {
            Map<String, Object> properties = new HashMap<>();
            properties.put(PROP_LABEL, title);

            if (multi) {
                properties.put(JcrResourceConstants.SLING_RESOURCE_TYPE_PROPERTY, RESTYPE_MULTIFIELD);
                Map<String, Object> fieldProperties = new HashMap<>();
                populateCasualProperties(fieldProperties);
                Resource fieldResource = VirtualResourceHelper.newResource(resolver, path + "/field", fieldProperties);
                collection.add(VirtualResourceHelper.newResource(resolver, path, properties, fieldResource));
            } else {
                populateCasualProperties(properties);
                if (TYPE_SELECT.equals(type) && ArrayUtils.isNotEmpty(options)) {
                    Resource[] optionsItems = new Resource[options.length];
                    for (int i = 0; i < options.length; i++) {
                        optionsItems[i] = VirtualResourceHelper.newResource(
                                resolver,
                                path + "/items/item" + i,
                                PROP_TEXT, options[i],
                                PROP_VALUE, options[i]);
                    }
                    collection.add(VirtualResourceHelper.newContainer(resolver, path, properties, optionsItems));
                } else {
                    collection.add(VirtualResourceHelper.newResource(resolver, path, properties));
                }
            }

            if (TYPE_ENCRYPTED.equals(type)) {
                properties.clear();
                properties.put(JcrResourceConstants.SLING_RESOURCE_TYPE_PROPERTY, RESTYPE_HIDDEN);
                properties.put(PROP_NAME, name + Constants.SUFFIX_ENCRYPT);
                properties.put(PROP_VALUE, Boolean.TRUE.toString());
                collection.add(VirtualResourceHelper.newResource(resolver, path + Constants.SUFFIX_ENCRYPT, properties));
            }
        }

        private void populateCasualProperties(Map<String, Object> properties) {
            properties.put(JcrResourceConstants.SLING_RESOURCE_TYPE_PROPERTY, getResourceType(type));
            properties.put(PROP_EMPTY_TEXT, placeholder);
            properties.put(PROP_NAME, name);
            properties.put(PROP_REQUIRED, required);
            properties.put(PROP_VALUE, defaultValue);
        }

        private static String getResourceType(String type) {
            if (StringUtils.isBlank(type)) {
                return RESTYPE_TEXT_FIELD;
            }
            switch (type) {
                case "checkbox":
                    return RESTYPE_CHECKBOX;
                case TYPE_ENCRYPTED:
                    return "granite/ui/components/coral/foundation/form/password";
                case TYPE_SELECT:
                    return "granite/ui/components/coral/foundation/form/select";
                case PROP_TEXT:
                case "textarea":
                    return "granite/ui/components/coral/foundation/form/textarea";
                default:
                    return RESTYPE_TEXT_FIELD;
            }
        }
    }
}
