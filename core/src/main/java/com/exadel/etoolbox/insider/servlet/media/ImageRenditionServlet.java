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
package com.exadel.etoolbox.insider.servlet.media;

import com.day.cq.dam.api.Asset;
import com.day.cq.dam.api.Rendition;
import com.day.image.Layer;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.IOUtils;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.SlingHttpServletResponse;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.servlets.ServletResolverConstants;
import org.apache.sling.api.servlets.SlingSafeMethodsServlet;
import org.jetbrains.annotations.NotNull;
import org.osgi.service.component.annotations.Component;

import javax.servlet.Servlet;
import javax.servlet.http.HttpServletResponse;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import java.util.stream.Collectors;

/**
 * A Sling Servlet implementation that returns a base64-encoded rendition of an image asset
 */
@Component(
        service = Servlet.class,
        property = {
                ServletResolverConstants.SLING_SERVLET_METHODS + "=GET",
                ServletResolverConstants.SLING_SERVLET_RESOURCE_TYPES + "=dam/Asset",
                ServletResolverConstants.SLING_SERVLET_EXTENSIONS + "=base64"
        }
)
@Slf4j
public class ImageRenditionServlet extends SlingSafeMethodsServlet {

    private static final String MIME_TYPE_PNG = "image/png";
    private static final String MIME_TYPE_JPEG = "image/jpeg";

    private static final List<String> SUPPORTED_MIME_TYPES = Arrays.asList(
            MIME_TYPE_PNG,
            MIME_TYPE_JPEG,
            "image/webp",
            "image/gif");

    /**
     * Processes a GET request targeted at an image asset resource
     * @param request  The {@link SlingHttpServletRequest} object
     * @param response The {@link SlingHttpServletResponse} object
     * @throws IOException If an I/O error occurs
     */
    @Override
    protected void doGet(
            @NotNull SlingHttpServletRequest request,
            @NotNull SlingHttpServletResponse response) throws IOException {

        Resource resource = request.getResource();
        Asset asset = resource.adaptTo(Asset.class);
        BoundariesPredicate boundaries = new BoundariesPredicate(request.getParameter("size"));
        Rendition rendition = getFitRendition(asset, boundaries);
        if (rendition == null) {
            log.error("Could not retrieve a rendition for asset {}", request.getResource().getPath());
            response.setStatus(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        byte[] payload;
        String payloadMimeType = rendition.getMimeType();
        if (SUPPORTED_MIME_TYPES.contains(rendition.getMimeType())) {
            if (MIME_TYPE_JPEG.equals(rendition.getMimeType())) {
                payload = IOUtils.toByteArray(rendition.getStream());
            } else {
                payload = getOpaqueRendition(rendition);
            }
        } else {
            try {
                payload = createFitRendition(rendition, boundaries);
                payloadMimeType = MIME_TYPE_PNG;
            } catch (IOException e) {
                log.error("Could not create on-the-fly rendition for asset {}", request.getResource().getPath(), e);
                response.setStatus(HttpServletResponse.SC_NOT_FOUND);
                return;
            }
        }
        String encodedPayload = Base64.getEncoder().encodeToString(payload);

        response.setContentType("text/plain");
        response.setHeader("X-Rendition", rendition.getName());
        response.getWriter().write("data:" + payloadMimeType + ";base64," + encodedPayload);
    }

    private static byte[] getOpaqueRendition(Rendition rendition) throws IOException {
        try (InputStream input = rendition.getStream(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            if (input == null) {
                throw new IOException("Could not read rendition stream");
            }
            Layer foreground = new Layer(input);
            Layer background = new Layer(foreground.getWidth(), foreground.getHeight(), Color.WHITE);
            background.merge(foreground);
            background.write(MIME_TYPE_PNG, 1.0d, output);
            return output.toByteArray();
        }
    }

    private static Rendition getFitRendition(Asset asset, BoundariesPredicate predicate) {
        if (asset == null) {
            return null;
        }
        List<Rendition> matchingRenditions = asset.getRenditions()
                .stream()
                .filter(rendition -> SUPPORTED_MIME_TYPES.contains(rendition.getMimeType()))
                .filter(predicate)
                .collect(Collectors.toList());
        if (matchingRenditions.isEmpty()) {
            matchingRenditions = asset.getRenditions()
                    .stream()
                    .filter(rendition -> SUPPORTED_MIME_TYPES.contains(rendition.getMimeType()))
                    .collect(Collectors.toList());
        }
        return matchingRenditions
                .stream()
                .min((first, second) -> {
                    long size1 = first.getSize();
                    long size2 = second.getSize();
                    return Long.compare(size1, size2);
                })
                .orElse(asset.getOriginal());
    }

    private static byte[] createFitRendition(Rendition rendition, BoundariesPredicate predicate) throws IOException {
        try (InputStream input = rendition.getStream(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            if (input == null) {
                throw new IOException("Could not read rendition stream");
            }
            Layer foreground = new Layer(input);
            float scale = getScale(foreground, predicate.getBoundaries());
            int targetWidth = (int) (foreground.getWidth() * scale);
            int targetHeight = (int) (foreground.getHeight() * scale);
            foreground.resize(targetWidth, targetHeight);

            Layer background = new Layer(targetWidth, targetHeight, Color.WHITE);
            background.merge(foreground);

            background.write(MIME_TYPE_PNG,  1.0d, output);
            return output.toByteArray();
        }
    }

    private static float getScale(Layer layer, BoundariesPredicate.Boundaries boundaries) {
        int targetWidth = layer.getWidth();
        int targetHeight = layer.getHeight();
        int greaterTargetDimension = Math.max(targetWidth, targetHeight);
        float scale = 1.0f;
        if (greaterTargetDimension == targetWidth) {
            if (greaterTargetDimension > boundaries.getMaxWidth()) {
                scale = (float) greaterTargetDimension / boundaries.getMaxWidth();
            } else if (greaterTargetDimension < boundaries.getMinWidth()) {
                scale = (float) boundaries.getMinWidth() / greaterTargetDimension;
            }
        } else {
            if (greaterTargetDimension > boundaries.getMaxHeight()) {
                scale = (float) greaterTargetDimension / boundaries.getMaxHeight();
            } else if (greaterTargetDimension < boundaries.getMinHeight()) {
                scale = (float) boundaries.getMinHeight() / greaterTargetDimension;
            }
        }
        return scale;
    }
}
