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
package com.exadel.etoolbox.insider.service.provider.impl;

import com.adobe.granite.crypto.CryptoException;
import com.adobe.granite.crypto.CryptoSupport;
import com.exadel.etoolbox.insider.LoggerExtension;
import com.exadel.etoolbox.insider.service.ServiceException;
import com.exadel.etoolbox.insider.util.Constants;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.wcm.testing.mock.aem.junit5.AemContext;
import io.wcm.testing.mock.aem.junit5.AemContextExtension;
import org.apache.http.Header;
import org.apache.http.HttpHeaders;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.entity.StringEntity;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.mockito.MockedStatic;
import org.mockito.Mockito;

import java.io.IOException;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@ExtendWith({AemContextExtension.class})
public class ServiceProviderImplTest {

    @RegisterExtension
    public final LoggerExtension loggerExtension = new LoggerExtension();

    private final AemContext context = new AemContext();

    private ServiceProviderImpl serviceProvider;

    @BeforeEach
    public void init() throws CryptoException {
        context.load().json(
                "/com/exadel/etoolbox/insider/servlet/config/conf.json",
                "/conf/etoolbox/authoring-insider");
        CryptoSupport mockCryptoSupport = Mockito.mock(CryptoSupport.class);
        Mockito.when(mockCryptoSupport.encrypt(Mockito.any())).thenReturn("encrypted".getBytes());
        Mockito.when(mockCryptoSupport.decrypt(Mockito.any())).thenReturn("dolorSitAmet".getBytes());
        context.registerService(CryptoSupport.class, mockCryptoSupport);

        Map<String, Object> serviceProviderProperties = new HashMap<>();
        serviceProviderProperties.put("url", "http://localhost:4502");
        serviceProviderProperties.put("connectionTimeout", 100);
        serviceProvider = context.registerInjectActivateService(new ServiceProviderImpl(), serviceProviderProperties);
    }

    @Test
    public void shouldReportEmptyPayload() {
        Assertions.assertThrows(ServiceException.class, () -> serviceProvider.getResponse(context.request()));
    }

    @Test
    public void shouldOutputDryRunResult() throws ServiceException {
        context.request().addRequestParameter("dryRun", Boolean.TRUE.toString());
        context.request().setContent(Constants.EMPTY_JSON.getBytes());

        String result = serviceProvider.getResponse(context.request());
        Assertions.assertEquals(Constants.EMPTY_JSON, result);
    }

    @Test
    public void shouldConsumeToken() throws ServiceException {
        context.request().addRequestParameter(Constants.PROP_PATH, "tools/item0");
        context.request().setContent(Constants.EMPTY_JSON.getBytes());
        HttpClientFactory.Builder builder = prepareHttpClientBuilder(Constants.EMPTY_JSON);
        try (MockedStatic<HttpClientFactory> ignored = prepareHttpClientFactory(builder)) {
            String result = serviceProvider.getResponse(context.request());
            Assertions.assertEquals(Constants.EMPTY_JSON, result);
            Header authorization = Arrays.stream(((MockHttpClient) builder.get()).getRequestHeaders())
                    .filter(h -> HttpHeaders.AUTHORIZATION.equals(h.getName()))
                    .findFirst()
                    .orElse(null);
            Assertions.assertNotNull(authorization);
            Assertions.assertEquals("Bearer dolorSitAmet", authorization.getValue());
        }
    }

    @Test
    public void shouldRetrieveResult() throws ServiceException, IOException {
        context.request().setContent(Constants.EMPTY_JSON.getBytes());
        HttpClientFactory.Builder builder = prepareHttpClientBuilder("{\"lorem\": \"ipsum\"}");
        try (MockedStatic<HttpClientFactory> ignored = prepareHttpClientFactory(builder)) {
            String result = serviceProvider.getResponse(context.request());
            JsonNode json = new ObjectMapper().readTree(result);
            Assertions.assertEquals("ipsum", json.get("lorem").asText());
        }
    }

    @Test
    public void shouldRetryRequestOnException() throws ServiceException, IOException {
        context.request().setContent(Constants.EMPTY_JSON.getBytes());
        HttpClientFactory.Builder builder = prepareHttpClientBuilder(
                "{\"lorem\": \"ipsum\"}",
                Arrays.asList(new SocketTimeoutException(), new IOException()));
        try (MockedStatic<HttpClientFactory> ignored = prepareHttpClientFactory(builder)) {
            String result = serviceProvider.getResponse(context.request());
            JsonNode json = new ObjectMapper().readTree(result);
            Assertions.assertEquals("ipsum", json.get("lorem").asText());
        }
        List<String> messages = loggerExtension.getMessages();
        Assertions.assertTrue(messages.stream().anyMatch(m -> m.contains("Connection to http://localhost:4502 timed out after 100 ms")));
        Assertions.assertTrue(messages.stream().anyMatch(m -> m.contains("Request to http://localhost:4502 failed")));
        Assertions.assertTrue(messages.stream().anyMatch(m -> m.contains("Request to http://localhost:4502 succeeded")));
    }

    @Test
    public void shouldFailAfterMaxAttempts() {
        context.request().setContent(Constants.EMPTY_JSON.getBytes());
        HttpClientFactory.Builder builder = prepareHttpClientBuilder(
                Constants.EMPTY_JSON,
                Arrays.asList(new SocketTimeoutException(), new IOException(), new IOException()));
        try (MockedStatic<HttpClientFactory> ignored = prepareHttpClientFactory(builder)) {
            Assertions.assertThrows(ServiceException.class, () -> serviceProvider.getResponse(context.request()));
        }
        List<String> messages = loggerExtension.getMessages();
        Assertions.assertTrue(messages.stream().anyMatch(m -> m.contains("Connection to http://localhost:4502 timed out after 100 ms")));
        Assertions.assertEquals(2, messages.stream().filter(m -> m.contains("Request to http://localhost:4502 failed")).count());
    }

    private static HttpClientFactory.Builder prepareHttpClientBuilder(String response) {
        return prepareHttpClientBuilder(response, Collections.emptyList());
    }

    private static HttpClientFactory.Builder prepareHttpClientBuilder(String response, List<IOException> exceptions) {
        CloseableHttpResponse mockHttpResponse = Mockito.mock(CloseableHttpResponse.class);
        Mockito.when(mockHttpResponse.getEntity()).thenReturn(new StringEntity(response, StandardCharsets.UTF_8));

        HttpClientFactory.Builder mockHttpClientBuilder = Mockito.mock(HttpClientFactory.Builder.class);
        Mockito.when(mockHttpClientBuilder.proxy(Mockito.any())).thenReturn(mockHttpClientBuilder);
        Mockito.when(mockHttpClientBuilder.skipSsl(Mockito.anyBoolean())).thenReturn(mockHttpClientBuilder);
        Mockito.when(mockHttpClientBuilder.timeout(Mockito.anyInt())).thenReturn(mockHttpClientBuilder);
        Mockito.when(mockHttpClientBuilder.get()).thenReturn(new MockHttpClient(mockHttpResponse, exceptions));

        return mockHttpClientBuilder;
    }

    private static MockedStatic<HttpClientFactory> prepareHttpClientFactory(HttpClientFactory.Builder builder) {
        MockedStatic<HttpClientFactory> factory = Mockito.mockStatic(HttpClientFactory.class);
        factory.when(HttpClientFactory::newClient).thenReturn(builder);
        return factory;
    }
}