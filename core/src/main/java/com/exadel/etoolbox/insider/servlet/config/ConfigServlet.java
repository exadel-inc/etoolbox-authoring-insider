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
import com.exadel.etoolbox.insider.util.JsonUtil;
import org.apache.commons.lang.StringUtils;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.SlingHttpServletResponse;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ResourceUtil;
import org.apache.sling.api.resource.ValueMap;
import org.apache.sling.api.servlets.ServletResolverConstants;
import org.apache.sling.api.servlets.SlingSafeMethodsServlet;
import org.jetbrains.annotations.NotNull;
import org.osgi.service.component.annotations.Component;

import javax.servlet.Servlet;
import java.io.IOException;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Spliterator;
import java.util.Spliterators;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

/**
 * A Sling Servlet implementation that returns configuration data for the Authoring Insider tools and providers
 */
@Component(
        service = Servlet.class,
        property = {
                ServletResolverConstants.SLING_SERVLET_METHODS + "=GET",
                ServletResolverConstants.SLING_SERVLET_RESOURCE_TYPES + "=/bin/etoolbox/authoring-insider/config",
                ServletResolverConstants.SLING_SERVLET_EXTENSIONS + "=json"
        }
)
public class ConfigServlet extends SlingSafeMethodsServlet {

    private static final String SLASH = "/";

    private static final String CONFIG_ROOT = "/conf/etoolbox/authoring-insider/";
    private static final String NODE_PROVIDERS = "providers";
    private static final String NODE_TOOLS = "tools";

    private static final String PROP_ENABLED = "enabled";

    /**
     * Processes a GET request targeted at a configuration resource
     * @param request  The {@link SlingHttpServletRequest} object
     * @param response The {@link SlingHttpServletResponse} object
     * @throws IOException If an I/O error occurs
     */
    @Override
    protected void doGet(
            @NotNull SlingHttpServletRequest request,
            @NotNull SlingHttpServletResponse response) throws IOException {

        Map<String, Object> config = new HashMap<>();
        config.put(
                NODE_TOOLS,
                createEntries(request.getResourceResolver().getResource(CONFIG_ROOT + NODE_TOOLS)));
        config.put(
                NODE_PROVIDERS,
                createEntries(request.getResourceResolver().getResource(CONFIG_ROOT + NODE_PROVIDERS)));
        JsonUtil.writeTo(response, config);
    }

    private static List<Map<String, Object>> createEntries(Resource resource) {
        if (resource == null) {
            return Collections.emptyList();
        }
        Spliterator<Resource> spliterator = Spliterators.spliteratorUnknownSize(resource.listChildren(), 0);
        AtomicInteger index = new AtomicInteger(0);
        return StreamSupport.stream(spliterator, false)
                .map(child -> createEntry(child, index))
                .collect(Collectors.toList());
    }

    private static Map<String, Object> createEntry(Resource resource, AtomicInteger index) {
        ValueMap source = ResourceUtil.getValueMap(resource);
        Map<String, Object> target = new LinkedHashMap<>();

        target.put(Constants.PROP_PATH, getLastTwoChunks(resource.getPath()));
        putNonEmptyValue(source, "type", target);
        putNonEmptyValue(source, "id", target);
        target.put(PROP_ENABLED, source.get(PROP_ENABLED, true));
        putNonEmptyValue(source, "title", target);
        putNonEmptyValue(source, "icon", target);
        target.put("ordinal", index.getAndIncrement());

        unpackDetails(source.get(Constants.PROP_DETAILS, StringUtils.EMPTY), target);

        return target;
    }

    private static void putNonEmptyValue(ValueMap source, String key, Map<String, Object> target) {
        String value = source.get(key, String.class);
        if (StringUtils.isNotEmpty(value)) {
            target.put(key, value);
        }
    }

    private static void unpackDetails(String details, Map<String, Object> target) {
        if (StringUtils.isEmpty(details)) {
            return;
        }
        Map<String, Object> unpackedDetails = JsonUtil.getMap(details);
        unpackedDetails.forEach((key, value) -> {
            boolean isHidden = !key.isEmpty() && (key.charAt(0) == '_' || key.charAt(0) == '.');
            if (!isHidden) {
                target.put(key, value);
            }
        });
    }

    private static String getLastTwoChunks(String value) {
        String[] chunks = value.split(SLASH);
        return chunks.length > 1 ? chunks[chunks.length - 2] + SLASH + chunks[chunks.length - 1] : value;
    }
}
