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

    private static final String COMPATIBLE_MIME_TYPE = "image/png";
    private static final List<String> SUPPORTED_MIME_TYPES = Arrays.asList(
            COMPATIBLE_MIME_TYPE,
            "image/jpeg",
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
            payload = IOUtils.toByteArray(rendition.getStream());
        } else {
            try {
                payload = createCompatiblePayload(rendition, boundaries);
                payloadMimeType = COMPATIBLE_MIME_TYPE;
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

    private static byte[] createCompatiblePayload(Rendition rendition, BoundariesPredicate boundaries) throws IOException {
        BoundariesPredicate.Size size = boundaries.getTargetSize();
        try (InputStream input = rendition.getStream(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            if (input == null) {
                throw new IOException("Could not read rendition stream");
            }
            Layer layer = new Layer(input);
            float scale = getScale(layer, size);

            layer.resize((int) (layer.getWidth() * scale), (int) (layer.getHeight() * scale));
            layer.write(COMPATIBLE_MIME_TYPE,  1.0d, output);
            return output.toByteArray();
        }
    }

    private static float getScale(Layer layer, BoundariesPredicate.Size targetSize) {
        int targetWidth = layer.getWidth();
        int targetHeight = layer.getHeight();
        int greaterTargetDimension = Math.max(targetWidth, targetHeight);
        float scale = 1.0f;
        if (greaterTargetDimension == targetWidth && greaterTargetDimension > targetSize.getWidth()) {
            scale = (float) targetSize.getWidth() / greaterTargetDimension;
        } else if (greaterTargetDimension == targetHeight && greaterTargetDimension > targetSize.getHeight()) {
            scale = (float) targetSize.getHeight() / greaterTargetDimension;
        }
        return scale;
    }
}
