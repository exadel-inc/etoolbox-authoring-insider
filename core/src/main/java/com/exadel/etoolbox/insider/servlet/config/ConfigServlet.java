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
import org.apache.commons.lang3.StringUtils;
import org.apache.http.HttpHeaders;
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
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.Spliterator;
import java.util.Spliterators;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Pattern;
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

    private static final String TYPE_BOOLEAN = "{Boolean}";
    private static final String TYPE_DOUBLE = "{Double}";
    private static final String TYPE_LONG = "{Long}";

    private static final String CONFIG_ROOT = "/conf/etoolbox/authoring-insider";
    private static final String NODE_PROVIDERS = "providers";
    private static final String NODE_TOOLS = "tools";

    private static final String PROP_ENABLED = "enabled";
    private static final String PROP_ORDINAL = "ordinal";
    private static final String PROP_TYPE = "type";

    private static final Pattern SEMICOLON = Pattern.compile(";");

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

        response.setHeader(HttpHeaders.CACHE_CONTROL, Constants.HEADER_NO_CACHE);
        Map<String, Object> config = new HashMap<>();
        Resource configRoot = request.getResourceResolver().getResource(CONFIG_ROOT);
        config.put(NODE_TOOLS, createEntries(configRoot, NODE_TOOLS));
        config.put(NODE_PROVIDERS, createEntries(configRoot, NODE_PROVIDERS));
        JsonUtil.writeTo(response, config);
    }

    private static List<Map<String, Object>> createEntries(Resource configRoot, String key) {
        Resource childrenRoot = configRoot != null ? configRoot.getChild(key) : null;
        if (childrenRoot == null) {
            return Collections.emptyList();
        }

        String disabledItemsString = configRoot.getValueMap().get(
                "disabled" + StringUtils.capitalize(key),
                StringUtils.EMPTY);
        Set<String> disabledItems = SEMICOLON.splitAsStream(disabledItemsString)
                .filter(StringUtils::isNotBlank)
                .collect(Collectors.toSet());
        Spliterator<Resource> spliterator = Spliterators.spliteratorUnknownSize(childrenRoot.listChildren(), 0);
        AtomicInteger index = new AtomicInteger(0);

        List<Map<String, Object>> result = StreamSupport.stream(spliterator, false)
                .map(child -> createEntry(child, index, disabledItems))
                .collect(Collectors.toCollection(ArrayList::new));

        for (String disabledItem : disabledItems) {
            Map<String, Object> disabledEntry = new HashMap<>();
            disabledEntry.put(Constants.PROP_PATH, key + "/item" + index.getAndIncrement());
            disabledEntry.put(PROP_TYPE, disabledItem);
            disabledEntry.put(PROP_ENABLED, false);
            result.add(disabledEntry);
        }
        return result;
    }

    private static Map<String, Object> createEntry(Resource resource, AtomicInteger index, Set<String> exclusions) {
        ValueMap source = ResourceUtil.getValueMap(resource);
        String type = source.get(PROP_TYPE, StringUtils.EMPTY);

        Map<String, Object> target = new LinkedHashMap<>();
        target.put(Constants.PROP_PATH, getLastTwoChunks(resource.getPath()));
        target.put(PROP_TYPE, type);
        target.put(PROP_ENABLED, !exclusions.contains(type));
        putNonEmptyValue(source, "title", target);
        putNonEmptyValue(source, "icon", target);
        target.put(PROP_ORDINAL, index.getAndIncrement());
        unpackDetails(source.get(Constants.PROP_DETAILS, StringUtils.EMPTY), target);

        exclusions.remove(type);
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
            if (isHidden) {
                return;
            }
            Object effectiveValue = value;
            if (isStringifiedBoolean(value)) {
                effectiveValue = Boolean.parseBoolean(StringUtils.removeStart(value.toString(),TYPE_BOOLEAN));
            } else if (isStringifiedLong(value)) {
                effectiveValue = Long.parseLong(StringUtils.removeStart(value.toString(), TYPE_LONG));
            } else if (isStringifiedDouble(value)) {
                effectiveValue = Double.parseDouble(StringUtils.removeStart(value.toString(), TYPE_DOUBLE));
            }
            target.put(key, effectiveValue);
        });
    }

    private static String getLastTwoChunks(String value) {
        String[] chunks = value.split(Constants.SEPARATOR_SLASH);
        return chunks.length > 1 ? chunks[chunks.length - 2] + Constants.SEPARATOR_SLASH + chunks[chunks.length - 1] : value;
    }

    private static boolean isStringifiedBoolean(Object value) {
        if (!(value instanceof String)) {
            return false;
        }
        return StringUtils.startsWith(value.toString(), TYPE_BOOLEAN)
                || StringUtils.equalsAny(value.toString(), "true", "false");
    }

    private static boolean isStringifiedDouble(Object value) {
        return value instanceof String && StringUtils.startsWith(value.toString(), TYPE_DOUBLE);
    }

    private static boolean isStringifiedLong(Object value) {
        return value instanceof String && StringUtils.startsWith(value.toString(), TYPE_LONG);
    }
}
