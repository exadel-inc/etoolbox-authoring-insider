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
package com.exadel.etoolbox.insider.servlet.relay;

import java.io.Closeable;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * A simple cache implementation for use with {@link RelayServlet} to store deferred responses from service providers
 * for a limited time
 * @param <T> The type of the cached value
 */
class Cache<T> implements Closeable {

    private final ConcurrentMap<String, TimestampedResponse<T>> cache;
    private final ScheduledExecutorService executorService;

    private final int keepAlive;

    /**
     * Creates a new cache with the specified timeout
     * @param keepAlive The time span in milliseconds during which a value is cached
     */
    Cache(int keepAlive) {
        this.keepAlive = keepAlive;
        cache = new ConcurrentHashMap<>();
        executorService = Executors.newSingleThreadScheduledExecutor();
        executorService.scheduleWithFixedDelay(this::cleanUp, keepAlive / 2, keepAlive / 2, TimeUnit.MILLISECONDS);
    }

    /**
     * Closes the cache and clears all stored values
     */
    @Override
    public void close() {
        cache.clear();
        executorService.shutdown();
    }

    /**
     * Retrieves a cached value by its key
     * @param key The key of the value to retrieve. A non-null string is expected
     * @return The cached value or {@code null} if the key is not present in the cache
     */
    T get(String key) {
        TimestampedResponse<T> value = cache.get(key);
        return value != null ? value.getValue() : null;
    }

    /**
     * Puts a value into the cache and returns the key under which the value is stored
     * @param value The value to store in the cache
     * @return The key under which the value is stored
     */
    String put(T value) {
        String key = UUID.randomUUID().toString();
        cache.put(key, new TimestampedResponse<>(value));
        return key;
    }

    /**
     * Puts a value into the cache under the specified key
     * @param key The key under which to store the value
     * @param value The value to store in the cache
     */
    void put(String key, T value) {
        cache.put(key, new TimestampedResponse<>(value));
        cleanUp();
    }

    /**
     * Removes a value from the cache by its key
     * @param key The key of the value to remove
     */
    void remove(String key) {
        cache.remove(key);
    }

    private void cleanUp() {
        long now = System.currentTimeMillis();
        cache.entrySet().removeIf(entry -> now - entry.getValue().getTimestamp() > keepAlive);
    }

    /**
     * A container for a cached value with a timestamp of when the value was stored
     * @param <T> The type of the cached value
     */
    private static class TimestampedResponse<T> {
        private final long timestamp;
        private final T value;

        TimestampedResponse(T value) {
            this.timestamp = System.currentTimeMillis();
            this.value = value;
        }

        long getTimestamp() {
            return timestamp;
        }

        T getValue() {
            return value;
        }
    }
}
