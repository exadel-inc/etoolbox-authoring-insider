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

import com.adobe.granite.ui.components.ds.ValueMapResource;
import com.day.crx.JcrConstants;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.api.resource.ValueMap;
import org.apache.sling.api.wrappers.ValueMapDecorator;
import org.apache.sling.jcr.resource.api.JcrResourceConstants;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
class VirtualResourceHelper {

    private static final String RESTYPE_CONTAINER = "granite/ui/components/coral/foundation/container";

    static Resource newContainer(
            ResourceResolver resolver,
            String path,
            Map<String, Object> properties,
            Resource... children) {
        Resource items = newResource(resolver, path + "/items", Collections.emptyMap(), Arrays.asList(children));
        Map<String, Object> containerProperties = new HashMap<>();
        containerProperties.put(JcrResourceConstants.SLING_RESOURCE_TYPE_PROPERTY, RESTYPE_CONTAINER);
        containerProperties.putAll(properties);
        return newResource(resolver, path, containerProperties, items);
    }

    static Resource newResource(ResourceResolver resolver, String path, String... values) {
        Map<String, Object> properties = new HashMap<>();
        for (int i = 0; i < values.length; i += 2) {
            String key = values[i];
            String value = values[i + 1];
            if (StringUtils.isNoneBlank(key, value)) {
                properties.put(key, value);
            }
        }
        return newResource(resolver, path, properties);
    }

    static Resource newResource(ResourceResolver resolver, String path, Map<String, Object> properties) {
        return newResource(resolver, path, properties, (Resource) null);
    }

    static Resource newResource(ResourceResolver resolver, String path, Map<String, Object> properties, Resource child) {
        return newResource(
                resolver,
                path,
                properties,
                child != null ? Collections.singletonList(child) : Collections.emptyList());
    }

    static Resource newResource(ResourceResolver resolver, String path, Map<String, Object> properties, List<Resource> children) {
        Map<String, Object> filteredProperties = properties.entrySet()
                .stream()
                .filter(e -> e.getValue() != null && StringUtils.isNotBlank(e.getValue().toString()))
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
        ValueMap valueMap = new ValueMapDecorator(filteredProperties);
        return new ValueMapResource(
                resolver,
                path,
                valueMap.get(JcrResourceConstants.SLING_RESOURCE_TYPE_PROPERTY, JcrConstants.NT_UNSTRUCTURED),
                valueMap,
                children);
    }
}