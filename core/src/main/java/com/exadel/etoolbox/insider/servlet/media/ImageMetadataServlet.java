package com.exadel.etoolbox.insider.servlet.media;

import com.day.cq.dam.api.Asset;
import com.exadel.etoolbox.insider.util.Constants;
import com.exadel.etoolbox.insider.util.JsonUtil;
import org.apache.commons.collections4.MapUtils;
import org.apache.commons.io.IOUtils;
import org.apache.http.HttpStatus;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.SlingHttpServletResponse;
import org.apache.sling.api.resource.ModifiableValueMap;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ValueMap;
import org.apache.sling.api.servlets.ServletResolverConstants;
import org.apache.sling.api.servlets.SlingAllMethodsServlet;
import org.jetbrains.annotations.NotNull;
import org.osgi.service.component.annotations.Component;

import javax.servlet.Servlet;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * A Sling Servlet implementation that provides access to the metadata of an image asset.
 */
@Component(
        service = Servlet.class,
        property = {
                ServletResolverConstants.SLING_SERVLET_METHODS + "=GET",
                ServletResolverConstants.SLING_SERVLET_METHODS + "=POST",
                ServletResolverConstants.SLING_SERVLET_RESOURCE_TYPES + "=dam/Asset",
                ServletResolverConstants.SLING_SERVLET_EXTENSIONS + "=metadata"
        }
)
public class ImageMetadataServlet extends SlingAllMethodsServlet {

    private static final String PROP_STATUS = "status";

    /**
     * Processes a GET request targeted at an image asset resource to retrieve its metadata.
     * @param request The {@link SlingHttpServletRequest} object
     * @param response The {@link SlingHttpServletResponse} object
     * @throws IOException If an I/O error occurs
     */
    @Override
    protected void doGet(
            @NotNull SlingHttpServletRequest request,
            @NotNull SlingHttpServletResponse response) throws IOException {

        Resource resource = request.getResource();
        Asset asset = resource.adaptTo(Asset.class);
        if (asset == null) {
            response.setStatus(HttpStatus.SC_NOT_FOUND);
            return;
        }
        Map<String, Object> cqMetadata = MapUtils.emptyIfNull(asset.getMetadata());
        Map<String, Object> fullMetadata = new HashMap<>(cqMetadata);
        Resource metadataResource = resource.getChild("jcr:content/metadata");
        if (metadataResource != null) {
            ValueMap metadataValueMap = metadataResource.getValueMap();
            fullMetadata.putAll(metadataValueMap);
        }
        JsonUtil.writeTo(response, fullMetadata);
    }

    /**
     * Processes a POST request to update the metadata of an image asset.
     * @param request The {@link SlingHttpServletRequest} object
     * @param response The {@link SlingHttpServletResponse} object
     * @throws IOException If an I/O error occurs
     */
    @Override
    protected void doPost(
            @NotNull SlingHttpServletRequest request,
            @NotNull SlingHttpServletResponse response) throws IOException {

        String payload = IOUtils.toString(request.getReader());
        Map<String, Object> values = JsonUtil.getMap(payload);
        if (values.isEmpty()) {
            JsonUtil.writeTo(response, HttpStatus.SC_BAD_REQUEST, Constants.PROP_ERROR, "Invalid payload");
            return;
        }


        Resource resource = request.getResource();
        Resource metadataResource = resource.getChild("jcr:content/metadata");
        ModifiableValueMap metadata = metadataResource != null ? metadataResource.adaptTo(ModifiableValueMap.class) : null;

        if (metadata == null) {
            response.setStatus(404);
            return;
        }
        metadata.putAll(values);
        request.getResourceResolver().commit();

        JsonUtil.writeTo(response, HttpStatus.SC_OK, PROP_STATUS, "ok");
    }
}
