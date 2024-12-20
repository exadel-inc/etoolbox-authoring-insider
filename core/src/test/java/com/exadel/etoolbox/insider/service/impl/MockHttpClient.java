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
package com.exadel.etoolbox.insider.service.impl;

import lombok.Getter;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.http.Header;
import org.apache.http.HttpHost;
import org.apache.http.HttpRequest;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.conn.ClientConnectionManager;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.params.HttpParams;
import org.apache.http.protocol.HttpContext;

import java.io.IOException;
import java.util.LinkedList;
import java.util.List;
import java.util.Queue;

@SuppressWarnings("deprecation")
class MockHttpClient extends CloseableHttpClient {

    private final CloseableHttpResponse response;
    private final Queue<IOException> exceptions;

    MockHttpClient(CloseableHttpResponse response, List<IOException> exceptions) {
        this.response = response;
        this.exceptions = new LinkedList<>(exceptions);
    }

    @Getter
    private Header[] requestHeaders;

    @Override
    protected CloseableHttpResponse doExecute(
            HttpHost httpHost,
            HttpRequest httpRequest,
            HttpContext httpContext) throws IOException {

        if (CollectionUtils.isNotEmpty(exceptions)) {
            throw exceptions.remove();
        }
        requestHeaders = httpRequest.getAllHeaders();
        return response;
    }

    @Override
    public void close() {
        // No operation
    }

    @Override
    public HttpParams getParams() {
        return null;
    }

    @Override
    public ClientConnectionManager getConnectionManager() {
        return null;
    }
}
