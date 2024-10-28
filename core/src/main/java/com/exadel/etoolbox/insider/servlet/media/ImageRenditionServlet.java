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
import org.apache.commons.io.IOUtils;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.SlingHttpServletResponse;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.servlets.ServletResolverConstants;
import org.apache.sling.api.servlets.SlingSafeMethodsServlet;
import org.jetbrains.annotations.NotNull;
import org.osgi.service.component.annotations.Component;

import javax.servlet.Servlet;
import java.io.IOException;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import java.util.stream.Collectors;

@Component(
        service = Servlet.class,
        property = {
                ServletResolverConstants.SLING_SERVLET_METHODS + "=GET",
                ServletResolverConstants.SLING_SERVLET_RESOURCE_TYPES + "=dam/Asset",
                ServletResolverConstants.SLING_SERVLET_EXTENSIONS + "=base64"
        }
)
public class ImageRenditionServlet extends SlingSafeMethodsServlet {

    private static final List<String> SUPPORTED_MIME_TYPES = Arrays.asList("image/jpeg", "image/png", "image/webp", "image/gif");

    @Override
    protected void doGet(
            @NotNull SlingHttpServletRequest request,
            @NotNull SlingHttpServletResponse response) throws IOException {

        Resource resource = request.getResource();
        Asset asset = resource.adaptTo(Asset.class);
        BoundariesPredicate boundaries = new BoundariesPredicate("100x100:600x600");
        Rendition rendition = getFitRendition(asset, boundaries);
        if (rendition == null) {
            response.setStatus(404);
            return;
        }

        byte[] bytes = IOUtils.toByteArray(rendition.getStream());
        String encoded = Base64.getEncoder().encodeToString(bytes);

        response.setContentType("text/plain");
        response.setHeader("X-Rendition", rendition.getName());
        response.getWriter().write("data:" + rendition.getMimeType() + ";base64," + encoded);
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
}
