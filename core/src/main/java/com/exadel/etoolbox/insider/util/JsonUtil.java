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
package com.exadel.etoolbox.insider.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.http.HttpStatus;
import org.apache.sling.api.SlingHttpServletResponse;
import org.jetbrains.annotations.NotNull;

import java.io.IOException;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Contains utility methods for JSON serialization and deserialization
 */
@NoArgsConstructor(access = lombok.AccessLevel.PRIVATE)
@Slf4j
public class JsonUtil {

    public static final String CONTENT_TYPE_JSON = "application/json";

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final TypeReference<Map<String, Object>> MAP = new TypeReference<>() {};

    private static final String EXCEPTION_PARSE = "Could not parse JSON string: {}";
    private static final String EXCEPTION_SERIALIZE = "Could not serialize {} to JSON";

    /**
     * Deserializes a JSON string into a {@code Map<String, Object>}
     * @param json A JSON string
     * @return A non-null {@code Map<String, Object>} object; might be empty
     */
    @NotNull
    public static Map<String, Object> getMap(String json) {
        if (StringUtils.isBlank(json)) {
            return Collections.emptyMap();
        }
        try {
            return OBJECT_MAPPER.readValue(json, MAP);
        } catch (Exception e) {
            log.error(EXCEPTION_PARSE, json, e);
            return Collections.emptyMap();
        }
    }

    /**
     * Deserializes a JSON string into a list of typed objects
     * @param json A JSON string
     * @param type A class reference matching the objects in the list
     * @return A non-null list of objects; might be empty
     * @param <T> The type of the objects in the list
     */
    @NotNull
    public static <T> List<T> getList(String json, Class<T> type) {
        if (StringUtils.isBlank(json)) {
            return Collections.emptyList();
        }
        try {
            return OBJECT_MAPPER.readValue(json, OBJECT_MAPPER.getTypeFactory().constructCollectionType(List.class, type));
        } catch (Exception e) {
            log.error(EXCEPTION_PARSE, json, e);
            return Collections.emptyList();
        }
    }

    /**
     * Serializes an object into a JSON string
     * @param value An object to serialize
     * @return A JSON string. If the object is null or otherwise cannot be serialized, a string representing an empty
     * JSON object is returned
     */
    public static String toJson(Object value) {
        if (value == null) {
            return Constants.EMPTY_JSON;
        }
        try {
            return OBJECT_MAPPER.writeValueAsString(value);
        } catch (Exception e) {
            log.error(EXCEPTION_SERIALIZE, value, e);
            return Constants.EMPTY_JSON;
        }
    }

    /**
     * Writes a JSON-formatted message to the response with the {@code 200 OK} HTTP status
     * @param response A {@link SlingHttpServletResponse} object
     * @param value The message to write
     * @throws IOException If an I/O error occurs
     */
    public static void writeTo(@NotNull SlingHttpServletResponse response,  Object value) throws IOException {
        writeTo(response, HttpStatus.SC_OK, value);
    }

    /**
     * Writes a JSON-formatted message to the response with the specified HTTP status
     * @param response A {@link SlingHttpServletResponse} object
     * @param status The HTTP status code
     * @param values A sequence of key-value pairs that will build up to the JSON structure in the response
     * @throws IOException If an I/O error occurs
     */
    public static void writeTo(@NotNull SlingHttpServletResponse response, int status, @NotNull String... values) throws IOException {
        Map<String, String> map = new LinkedHashMap<>();
        for (int i = 0; i < values.length; i += 2) {
            map.put(values[i], values[i + 1]);
        }
        writeTo(response, status, map);
    }

    /**
     * Writes a JSON-formatted message to the response with the specified HTTP status
     * @param response A {@link SlingHttpServletResponse} object
     * @param status The HTTP status code
     * @param value The message to write
     * @throws IOException If an I/O error occurs
     */
    public static void writeTo(@NotNull SlingHttpServletResponse response, int status, Object value) throws IOException {
        response.setStatus(status);
        response.setContentType(CONTENT_TYPE_JSON);
        response.getWriter().write(value instanceof String ? (String) value : toJson(value));
    }
}
