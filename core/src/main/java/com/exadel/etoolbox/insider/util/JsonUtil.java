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

import com.google.gson.Gson;
import com.google.gson.JsonParseException;
import com.google.gson.reflect.TypeToken;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.http.HttpStatus;
import org.apache.sling.api.SlingHttpServletResponse;
import org.jetbrains.annotations.NotNull;

import java.io.IOException;
import java.lang.reflect.Type;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@NoArgsConstructor(access = lombok.AccessLevel.PRIVATE)
@Slf4j
public class JsonUtil {

    public static final String CONTENT_TYPE_JSON = "application/json";

    private static final Gson GSON = new Gson();
    private static final Type MAP = new TypeToken<Map<String, Object>>() {}.getType();

    private static final String EXCEPTION_PARSE = "Could not parse JSON string: {}";
    private static final String EXCEPTION_SERIALIZE = "Could not serialize {} to JSON";

    @NotNull
    public static Map<String, Object> getMap(String json) {
        if (StringUtils.isBlank(json)) {
            return Collections.emptyMap();
        }
        try {
            return GSON.fromJson(json, MAP);
        } catch (Exception e) {
            log.error(EXCEPTION_PARSE, json, e);
            return Collections.emptyMap();
        }
    }

    @NotNull
    public static <T> List<T> getList(String json, Class<T> type) {
        if (StringUtils.isBlank(json)) {
            return Collections.emptyList();
        }
        try {
            return GSON.fromJson(json, TypeToken.getParameterized(List.class, type).getType());
        } catch (Exception e) {
            log.error(EXCEPTION_PARSE, json, e);
            return Collections.emptyList();
        }
    }

    public static String toJson(Object value) {
        if (value == null) {
            return Constants.EMPTY_JSON;
        }
        try {
            return GSON.toJson(value);
        } catch (JsonParseException e) {
            log.error(EXCEPTION_SERIALIZE, value, e);
            return Constants.EMPTY_JSON;
        }
    }

    public static void writeTo(@NotNull SlingHttpServletResponse response,  Object value) throws IOException {
        writeTo(response, HttpStatus.SC_OK, value);
    }

    public static void writeTo(@NotNull SlingHttpServletResponse response, int status, @NotNull String... values) throws IOException {
        Map<String, String> map = new LinkedHashMap<>();
        for (int i = 0; i < values.length; i += 2) {
            map.put(values[i], values[i + 1]);
        }
        writeTo(response, status, map);
    }

    public static void writeTo(@NotNull SlingHttpServletResponse response, int status, Object value) throws IOException {
        response.setStatus(status);
        response.setContentType(CONTENT_TYPE_JSON);
        response.getWriter().write(value instanceof String ? (String) value : toJson(value));
    }
}
