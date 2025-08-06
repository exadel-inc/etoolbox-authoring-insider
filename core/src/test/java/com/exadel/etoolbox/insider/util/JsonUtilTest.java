package com.exadel.etoolbox.insider.util;

import io.wcm.testing.mock.aem.junit5.AemContext;
import io.wcm.testing.mock.aem.junit5.AemContextExtension;
import org.apache.http.HttpStatus;
import org.apache.sling.testing.mock.sling.servlet.MockSlingHttpServletResponse;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import java.io.IOException;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@ExtendWith(AemContextExtension.class)
public class JsonUtilTest {

    private final AemContext context = new AemContext();
    private MockSlingHttpServletResponse response;

    @BeforeEach
    public void setUp() {
        response = context.response();
    }

    @Test
    public void shouldReturnMapForValidJson() {
        String json = "{\"a\":1,\"b\":\"test\"}";

        Map<String, Object> map = JsonUtil.getMap(json);

        Assertions.assertEquals(2, map.size());
        Assertions.assertEquals(1, map.get("a"));
        Assertions.assertEquals("test", map.get("b"));
    }

    @Test
    public void shouldReturnEmptyMapForInvalidJson() {
        Map<String, Object> map = JsonUtil.getMap("{invalid json}");

        Assertions.assertTrue(map.isEmpty());
    }

    @Test
    public void shouldReturnListForValidJson() {
        String json = "[1,2,3]";

        List<Integer> list = JsonUtil.getList(json, Integer.class);

        Assertions.assertEquals(Arrays.asList(1, 2, 3), list);
    }

    @Test
    public void shouldReturnEmptyListForInvalidJson() {
        List<Integer> list = JsonUtil.getList("not a json", Integer.class);

        Assertions.assertTrue(list.isEmpty());
    }

    @Test
    public void shouldReturnEmptyJsonForNull() {
        Assertions.assertEquals(Constants.EMPTY_JSON, JsonUtil.toJson(null));
    }

    @Test
    public void shouldSerializeObjectToJson() {
        Map<String, String> map = Collections.singletonMap("key", "value");

        String json = JsonUtil.toJson(map);

        Assertions.assertTrue(json.contains("\"key\":\"value\""));
    }

    @Test
    public void shouldWriteJsonWithDefaultStatus() throws IOException {
        Map<String, String> payload = Collections.singletonMap("k", "v");

        JsonUtil.writeTo(response, payload);

        Assertions.assertEquals(HttpStatus.SC_OK, response.getStatus());
        Assertions.assertEquals(JsonUtil.CONTENT_TYPE_JSON, response.getContentType());
        Map<String, Object> result = JsonUtil.getMap(context.response().getOutputAsString());
        Assertions.assertEquals("v", result.get("k"));
    }

    @Test
    public void shouldWriteJsonWithCustomStatusAndObject() throws IOException {
        Map<String, String> payload = Collections.singletonMap("k", "v");

        JsonUtil.writeTo(response, HttpStatus.SC_CREATED, payload);

        Assertions.assertEquals(HttpStatus.SC_CREATED, response.getStatus());
        Map<String, Object> result = JsonUtil.getMap(context.response().getOutputAsString());
        Assertions.assertEquals("v", result.get("k"));
    }

    @Test
    public void shouldWriteJsonWithStatusAndKeyValuePairs() throws IOException {
        JsonUtil.writeTo(response, HttpStatus.SC_BAD_REQUEST, Constants.PROP_ERROR, "Something went wrong");

        Assertions.assertEquals(HttpStatus.SC_BAD_REQUEST, response.getStatus());
        Map<String, Object> result = JsonUtil.getMap(context.response().getOutputAsString());
        Assertions.assertEquals("Something went wrong", result.get(Constants.PROP_ERROR));
    }
} 