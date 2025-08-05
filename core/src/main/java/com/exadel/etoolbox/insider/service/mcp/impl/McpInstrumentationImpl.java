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
package com.exadel.etoolbox.insider.service.mcp.impl;

import com.exadel.etoolbox.insider.service.mcp.McpInstrumentation;
import com.exadel.etoolbox.insider.service.mcp.McpToolComponent;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.modelcontextprotocol.server.McpServer;
import io.modelcontextprotocol.server.McpSyncServer;
import io.modelcontextprotocol.spec.McpSchema;
import io.modelcontextprotocol.spec.McpServerTransportProvider;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.ArrayUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.tuple.Pair;
import org.osgi.framework.BundleContext;
import org.osgi.framework.InvalidSyntaxException;
import org.osgi.framework.ServiceReference;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.osgi.service.component.annotations.ReferenceCardinality;
import org.osgi.service.component.annotations.ReferencePolicy;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

@Component(service = McpInstrumentation.class)
@Slf4j
public class McpInstrumentationImpl implements McpInstrumentation {

    private final AtomicReference<McpSyncServer> mcpServerReference = new AtomicReference<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private BundleContext bundleContext;

    @Reference(cardinality = ReferenceCardinality.MULTIPLE, policy = ReferencePolicy.DYNAMIC)
    private volatile List<McpToolComponent> tools;

    @Activate
    private void activate(BundleContext bundleContext) {
        this.bundleContext = bundleContext;
    }

    @Override
    public synchronized void bindTransport(McpServerTransportProvider transportProvider) {
        mcpServerReference.updateAndGet(current -> {
            if (current != null) {
                return current;
            }
            return registerMcpServer(transportProvider);
        });
    }

    private McpSyncServer registerMcpServer(McpServerTransportProvider transportProvider) {
        String bundleName = StringUtils.substringBeforeLast(bundleContext.getBundle().getSymbolicName(), ".");
        String bundleVersion = bundleContext.getBundle().getVersion().toString();

        McpSchema.ServerCapabilities capabilities = McpSchema.ServerCapabilities
                .builder()
                .tools(true)
                .build();

        McpServer.SyncSpecification<?> spec = McpServer
                .sync(transportProvider)
                .serverInfo(bundleName, bundleVersion)
                .capabilities(capabilities);

        if (CollectionUtils.isEmpty(tools)) {
            log.warn("No MCP tools registered");
        } else {
            tools.forEach(t -> registerMcpTool(spec, t));
        }
        return spec.build();
    }

    private void registerMcpTool(McpServer.SyncSpecification<?> spec, McpToolComponent component) {
        McpSchema.Tool newTool = createMcpSchemaTool(component, objectMapper);
        if (newTool == null) {
            log.error("Failed to create MCP tool for {}", component.getClass().getName());
            return;
        }
        spec.toolCall(newTool, (exchange, request) -> {
            try {
                return component.execute(exchange, request);
            } catch (Exception e) {
                log.error("Error executing tool {}", component.getClass().getName(), e);
                return new McpSchema.CallToolResult(e.getMessage(), true);
            }
        });
    }

    private McpSchema.Tool createMcpSchemaTool(McpToolComponent component, ObjectMapper objectMapper) {
        ServiceReference<? extends McpToolComponent> serviceRef = getServiceReference(component);
        if (serviceRef == null) {
            log.error("Service reference for {} not found", component.getClass().getName());
            return null;
        }
        String name = (String) serviceRef.getProperty("mcp.tool.name");
        name = StringUtils.defaultIfEmpty(name, component.getClass().getName());

        String description = (String) serviceRef.getProperty("mcp.tool.description");
        description = StringUtils.defaultIfEmpty(description, component.getClass().getName());

        Map<String, Map<String, Object>> props = new LinkedHashMap<>();
        List<String> requiredPropNames = new ArrayList<>();

        String[] rawProps = (String[]) serviceRef.getProperty("mcp.tool.property");
        for (String rawProp : ArrayUtils.nullToEmpty(rawProps)) {
            String[] parts = rawProp.split(";");
            if (parts.length < 2) {
                continue;
            }
            Pair<String, String> propNameAndType = extractKeyValue(parts[0], "string");
            String propName = propNameAndType.getLeft();
            String propType = propNameAndType.getRight();
            String propDescription = parts[1].trim();
            boolean isRequired = "required".equalsIgnoreCase(parts[parts.length - 1].trim());

            Map<String, Object> propDetails = new HashMap<>();
            propDetails.put("type", propType);
            propDetails.put("description", propDescription);

            for (int i = 2; i < (isRequired ? parts.length - 1 : parts.length); i++) {
                Pair<String, String> keyValue = extractKeyValue(parts[i], StringUtils.EMPTY);
                propDetails.put(keyValue.getKey(), keyValue.getValue());
            }

            props.put(propName, propDetails);
            if (isRequired) {
                requiredPropNames.add(propName);
            }
        }
        String inputSchema = objectMapper
                .valueToTree(Map.of("type", "object", "properties", props, "required", requiredPropNames))
                .toString();
        return McpSchema.Tool.builder().name(name).description(description).inputSchema(inputSchema).build();
    }

    private ServiceReference<? extends McpToolComponent> getServiceReference(McpToolComponent component) {
        try {
            var serviceReferences = bundleContext.getServiceReferences(
                    McpToolComponent.class,
                    "(component.name=" + component.getClass().getName() + ")");
            if (CollectionUtils.isEmpty(serviceReferences)) {
                return null;
            }
            return serviceReferences.iterator().next();
        } catch (InvalidSyntaxException e) {
            return null;
        }
    }

    private static Pair<String, String> extractKeyValue(String text, String defaultValue) {
        if (!StringUtils.contains(text, ":")) {
            return Pair.of(StringUtils.trim(text), defaultValue);
        }
        return Pair.of(
                StringUtils.substringBefore(text, ":").trim(),
                StringUtils.substringAfter(text, ":").trim());
    }
}
