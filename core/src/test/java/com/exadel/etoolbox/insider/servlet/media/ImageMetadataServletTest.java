package com.exadel.etoolbox.insider.servlet.media;

import com.exadel.etoolbox.insider.util.JsonUtil;
import io.wcm.testing.mock.aem.junit5.AemContext;
import io.wcm.testing.mock.aem.junit5.AemContextExtension;
import org.apache.http.HttpStatus;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ValueMap;

import java.io.IOException;
import java.util.Map;

@ExtendWith({AemContextExtension.class})
public class ImageMetadataServletTest {

    private final AemContext context = new AemContext();

    private ImageMetadataServlet servlet;

    @BeforeEach
    public void setUp() {
        context.load().json(
                "/com/exadel/etoolbox/insider/servlet/media/content.json",
                "/content/dam");
        servlet = context.registerInjectActivateService(new ImageMetadataServlet());
    }

    @Test
    public void shouldReturnMetadata() throws IOException {
        context.request().setResource(context.resourceResolver().getResource("/content/dam/image.png"));

        servlet.doGet(context.request(), context.response());

        Assertions.assertEquals(HttpStatus.SC_OK, context.response().getStatus());

        String output = context.response().getOutputAsString();
        Map<String, Object> metadata = JsonUtil.getMap(output);

        Assertions.assertFalse(metadata.isEmpty());
        Assertions.assertEquals("image/png", metadata.get("dam:MIMEtype"));
        Assertions.assertEquals("image/png", metadata.get("dc:format"));
    }

    @Test
    public void shouldUpdateMetadata() throws IOException {
        context.request().setResource(context.resourceResolver().getResource("/content/dam/image.png"));
        String payload = "{\"dc:creator\":\"John Doe\"}";
        context.request().setContent(payload.getBytes());

        servlet.doPost(context.request(), context.response());

        Assertions.assertEquals(HttpStatus.SC_OK, context.response().getStatus());
        Map<String, Object> responseJson = JsonUtil.getMap(context.response().getOutputAsString());
        Assertions.assertEquals("ok", responseJson.get("status"));

        Resource metadataResource = context.resourceResolver().getResource("/content/dam/image.png/jcr:content/metadata");
        Assertions.assertNotNull(metadataResource);
        ValueMap metadata = metadataResource.getValueMap();
        Assertions.assertEquals("John Doe", metadata.get("dc:creator", String.class));
    }

    @Test
    public void shouldReturnBadRequestForInvalidPayload() throws IOException {
        context.request().setResource(context.resourceResolver().getResource("/content/dam/image.png"));
        context.request().setContent(new byte[0]);

        servlet.doPost(context.request(), context.response());

        Assertions.assertEquals(HttpStatus.SC_BAD_REQUEST, context.response().getStatus());
        Map<String, Object> responseJson = JsonUtil.getMap(context.response().getOutputAsString());
        Assertions.assertEquals("Invalid payload", responseJson.get("error"));
    }
} 