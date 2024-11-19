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

import io.wcm.testing.mock.aem.junit5.AemContext;
import io.wcm.testing.mock.aem.junit5.AemContextExtension;
import org.apache.commons.lang3.StringUtils;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collections;

@ExtendWith({AemContextExtension.class})
public class ImageRenditionServletTest {

    private final AemContext context = new AemContext();

    private ImageRenditionServlet servlet;

    @BeforeEach
    public void init() {
        context.load().json(
                "/com/exadel/etoolbox/insider/servlet/media/content.json",
                "/content/dam");
        context.load().binaryFile(
                "/com/exadel/etoolbox/insider/servlet/media/image.png",
                "/content/dam/image.png/jcr:content/renditions/original");
        context.load().binaryFile(
                "/com/exadel/etoolbox/insider/servlet/media/image.bmp",
                "/content/dam/image.bmp/jcr:content/renditions/original");

        servlet = context.registerInjectActivateService(new ImageRenditionServlet());
    }

    @Test
    public void shouldReturnBase64EncodedImage() throws IOException {
        loadRenditions();
        for (String path : new String[]{"/content/dam/image.png", "/content/dam/image.bmp"}) {
            context.request().setResource(context.resourceResolver().getResource(path));

            servlet.doGet(context.request(), context.response());
            String output = context.response().getOutputAsString();

            Assertions.assertTrue(output.contains("data:image/png;base64"));
        }
    }

    @Test
    public void shouldReturnSmallestFitRendition() throws IOException {
        loadRenditions();
        context.request().setResource(context.resourceResolver().getResource("/content/dam/image.png"));

        servlet.doGet(context.request(), context.response());

        Assertions.assertTrue(context.response().containsHeader("X-Rendition"));
        Assertions.assertEquals("cq5dam.thumbnail.140.100.png", context.response().getHeader("X-Rendition"));

        context.request().setParameterMap(Collections.singletonMap("size", new String[]{"200x200"}));
        servlet.doGet(context.request(), context.response());

        Assertions.assertTrue(context.response().containsHeader("X-Rendition"));
        Assertions.assertEquals("cq5dam.thumbnail.319.319.png", context.response().getHeader("X-Rendition"));
    }

    @Test
    public void shouldReturnOriginalWhenNoFitRenditions() throws IOException {
        context.request().setResource(context.resourceResolver().getResource("/content/dam/image.png"));

        servlet.doGet(context.request(), context.response());

        Assertions.assertEquals("original", context.response().getHeader("X-Rendition"));
    }

    @Test
    public void shouldAddOpaqueBackground() throws IOException {
        context.request().setResource(context.resourceResolver().getResource("/content/dam/image.png"));

        servlet.doGet(context.request(), context.response());

        String encodedImage = context.response().getOutputAsString();
        Base64.Decoder decoder = Base64.getDecoder();
        byte[] bytes = decoder.decode(StringUtils.substringAfter(encodedImage, "base64,"));
        ByteArrayInputStream inputStream = new ByteArrayInputStream(bytes);
        BufferedImage image = ImageIO.read(inputStream);

        Assertions.assertNotNull(image);
        int rgbValueLT = image.getRGB(0, 0);
        int rgbValueRT = image.getRGB(image.getWidth() - 1, 0);
        int rgbValueLB = image.getRGB(0, image.getHeight() - 1);
        int rgbValueRB = image.getRGB(image.getWidth() - 1, image.getHeight() - 1);

        for (int rgbValue : new int[]{rgbValueLT, rgbValueRT, rgbValueLB, rgbValueRB}) {
            int alpha = (rgbValue >> 24) & 0xFF;
            int red = (rgbValue >> 16) & 0xFF;
            int green = (rgbValue >> 8) & 0xFF;
            int blue = rgbValue & 0xFF;
            Assertions.assertEquals(255, alpha);
            Assertions.assertEquals(255, red);
            Assertions.assertEquals(255, green);
            Assertions.assertEquals(255, blue);
        }
    }

    @Test
    public void shouldCreateRenditionOnTheFly() throws IOException {
        context.request().setResource(context.resourceResolver().getResource("/content/dam/image.bmp"));
        context.request().setParameterMap(Collections.singletonMap("size", new String[]{"> 200x200"}));

        servlet.doGet(context.request(), context.response());
        String output = context.response().getOutputAsString();

        Assertions.assertTrue(context.response().containsHeader("X-Rendition"));
        Assertions.assertEquals("original", context.response().getHeader("X-Rendition"));
        Assertions.assertTrue(output.contains("data:image/png;base64"));
    }

    private void loadRenditions() {
        Arrays.asList(
                        "cq5dam.thumbnail.48.48.png",
                        "cq5dam.thumbnail.140.100.png",
                        "cq5dam.thumbnail.319.319.png",
                        "cq5dam.thumbnail.1280.1280.png")
                .forEach(rendition -> context.load().binaryFile(
                        "/com/exadel/etoolbox/insider/servlet/media/thumbnail.png",
                        "/content/dam/image.png/jcr:content/renditions/" + rendition));
        context.load().binaryFile(
                "/com/exadel/etoolbox/insider/servlet/media/thumbnail.png",
                "/content/dam/image.svg/jcr:content/renditions/cq5dam.thumbnail.140.100.png");
    }
}