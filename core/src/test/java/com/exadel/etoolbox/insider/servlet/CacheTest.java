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
package com.exadel.etoolbox.insider.servlet;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

class CacheTest {

    private Cache<String> responseCache;

    @BeforeEach
    void init() {
        responseCache = new Cache<>(100);
    }

    @Test
    void shouldReturnStoredValue() {
        responseCache.put("key", "value");
        String result = responseCache.get("key");
        Assertions.assertEquals("value", result);

        responseCache.put("key", "value2");
        result = responseCache.get("key");
        Assertions.assertEquals("value2", result);

        String key = responseCache.put("value3");
        result = responseCache.get(key);
        Assertions.assertEquals("value3", result);
    }

    @Test
    void shouldReturnNullIfKeyNotPresent() {
        String result = responseCache.get("nonexistentKey");
        Assertions.assertNull(result);
    }

    @Test
    void shouldRemoveValueByKey() {
        responseCache.put("key", "value");
        Assertions.assertNotNull(responseCache.get("key"));
        responseCache.remove("key");
        Assertions.assertNull(responseCache.get("key"));
    }

    @Test
    void shouldEvictObsoleteEntries() {
        responseCache.put("key", "value");
        Executors.newSingleThreadScheduledExecutor().schedule(
                () -> Assertions.assertNull(responseCache.get("key")),
                200,
                TimeUnit.MILLISECONDS);
    }

    @Test
    void shouldDispose() {
        responseCache.put("foo", "bar");
        responseCache.close();
        String result = responseCache.get("foo");
        Assertions.assertNull(result);
    }
}