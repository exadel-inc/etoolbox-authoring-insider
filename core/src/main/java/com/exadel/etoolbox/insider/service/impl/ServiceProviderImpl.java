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

import com.adobe.granite.crypto.CryptoException;
import com.adobe.granite.crypto.CryptoSupport;
import com.exadel.etoolbox.insider.service.ServiceException;
import com.exadel.etoolbox.insider.service.ServiceProvider;
import com.exadel.etoolbox.insider.service.ServiceProviderConfig;
import com.exadel.etoolbox.insider.util.Constants;
import com.exadel.etoolbox.insider.util.JsonUtil;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.http.HttpHeaders;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.util.EntityUtils;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.request.RequestParameter;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ValueMap;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Modified;
import org.osgi.service.component.annotations.Reference;
import org.osgi.service.metatype.annotations.Designate;

import java.io.IOException;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

@Component(service = ServiceProvider.class)
@Designate(ocd = ServiceProviderConfig.class, factory = true)
@Slf4j
public class ServiceProviderImpl implements ServiceProvider {

    private static final String HTTP_HEADER_BEARER = "Bearer ";

    private static final String PARAM_DRY_RUN = "dryRun";

    private String id;
    private String url;
    private String proxy;
    private String token;
    private int connectionAttempts;
    private int connectionTimeout;
    private boolean skipSsl;

    @Reference
    private CryptoSupport cryptoSupport;

    @Activate
    @Modified
    private void activate(ServiceProviderConfig config) {
        this.id = config.id();
        this.url = config.url();
        this.proxy = config.proxy();
        this.token = config.token();
        this.connectionAttempts = Math.min(config.connectionAttempts(), ServiceProviderConfig.DEFAULT_ATTEMPTS);
        this.connectionTimeout = Math.min(config.connectionTimeout(), ServiceProviderConfig.DEFAULT_TIMEOUT);
        this.skipSsl = config.skipSsl();
    }

    @Override
    public String getId() {
        return id;
    }

    @Override
    public String getResponse(SlingHttpServletRequest request) throws ServiceException {
        String requestPayload = extractPayload(request);
        if (StringUtils.isBlank(requestPayload)) {
            throw new ServiceException("Request payload is empty or invalid");
        }

        log.info("Performing request to {}", url);
        log.debug("Sending payload to {}: {}", url, requestPayload);

        if (isDryRun(request)) {
            log.debug("Dry run mode is enabled. Sending empty response from {}", url);
            return Constants.EMPTY_JSON;
        }

        HttpPost httpPost = new HttpPost(url);
        String effectiveToken = getToken(request);
        if (StringUtils.isNotBlank(effectiveToken)) {
            httpPost.setHeader(HttpHeaders.AUTHORIZATION, HTTP_HEADER_BEARER + effectiveToken);
        }
        httpPost.setHeader(HttpHeaders.CONTENT_TYPE, ContentType.APPLICATION_JSON.getMimeType());
        httpPost.setEntity(new StringEntity(requestPayload, StandardCharsets.UTF_8));

        Exception lastException = null;

        for (int attempt = 0; attempt < connectionAttempts; attempt++) {
            try (
                    CloseableHttpClient client = HttpClientFactory
                            .newClient()
                            .timeout(connectionTimeout)
                            .skipSsl(skipSsl)
                            .proxy(proxy)
                            .get();
                    CloseableHttpResponse response = client.execute(httpPost)
            ) {
                String responseContent = IOUtils.toString(response.getEntity().getContent(), StandardCharsets.UTF_8);
                EntityUtils.consume(response.getEntity());
                log.info("Request to {} succeeded", url);
                log.debug("Got response from {}: {}", url, responseContent);
                return responseContent;
            } catch (SocketTimeoutException e) {
                log.warn("Connection to {} timed out after {} ms", url, connectionTimeout);
                lastException = e;
            } catch (IOException e) {
                log.error("Request to {} failed", url, e);
            }
        }

        throw new ServiceException("Request to " + url + " failed", lastException);
    }

    private static String extractPayload(SlingHttpServletRequest request) {
        try {
            return IOUtils.toString(request.getInputStream(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            log.error("Failed to extract request payload", e);
        }
        return StringUtils.EMPTY;
    }

    private String getToken(SlingHttpServletRequest request) {
        String path = request.getParameter(Constants.PROP_PATH);
        if (StringUtils.isEmpty(path)) {
            return token;
        }
        Resource itemResource = request.getResourceResolver().getResource("/conf/etoolbox/authoring-insider/" + path);
        ValueMap itemProperties = itemResource != null ? itemResource.getValueMap() : ValueMap.EMPTY;
        Map<String, Object> itemPropertiesDetails = JsonUtil.getMap(itemProperties.get(Constants.PROP_DETAILS, String.class));
        String effectiveToken = itemPropertiesDetails.getOrDefault("_token", token).toString();
        if (StringUtils.startsWith(effectiveToken, Constants.PREFIX_ENCRYPT)) {
            return decrypt(effectiveToken);
        }
        return effectiveToken;
    }

    private String decrypt(String value) {
        String encoded = value.substring(Constants.PREFIX_ENCRYPT.length());
        byte[] decoded = Base64.getDecoder().decode(encoded);
        try {
            byte[] decrypted = cryptoSupport.decrypt(decoded);
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (CryptoException e) {
            log.error("Failed to decrypt token", e);
            return new String(decoded, StandardCharsets.UTF_8);
        }
    }

    private static boolean isDryRun(SlingHttpServletRequest request) {
        RequestParameter dryRun = request.getRequestParameter(PARAM_DRY_RUN);
        return dryRun != null && Boolean.parseBoolean(dryRun.getString());
    }
}
