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

import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.apache.http.HttpHost;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClientBuilder;

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import java.net.MalformedURLException;
import java.net.URL;
import java.security.KeyManagementException;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
@Slf4j
class HttpClientFactory {

    private static final String PROTOCOL_TLS = "TLS";
    private static final X509TrustManager PERMISSIVE_TRUST_MANAGER = new PermissiveTrustManager();

    public static Builder newClient() {
        return new Builder();
    }

    public static class Builder {
        private int timeout;
        private boolean skipSsl;
        private String proxy;

        public Builder timeout(int value) {
            timeout = value;
            return this;
        }

        public Builder skipSsl(boolean value) {
            skipSsl = value;
            return this;
        }

        public Builder proxy(String value) {
            proxy = value;
            return this;
        }

        public CloseableHttpClient get() {
            RequestConfig.Builder configBuilder = RequestConfig.custom();
            if (timeout > 0) {
                configBuilder
                    .setConnectTimeout(timeout)
                    .setConnectionRequestTimeout(timeout)
                    .setSocketTimeout(timeout);
            }
            RequestConfig requestConfig = configBuilder.build();

            HttpClientBuilder httpClientBuilder = HttpClientBuilder
                .create()
                .setDefaultRequestConfig(requestConfig);
            if (skipSsl) {
                SSLContext sslContext = getPermissiveSslContext();
                httpClientBuilder.setSSLContext(sslContext);
            }
            if (StringUtils.isNotBlank(proxy)) {
                try {
                    URL proxyUrl = new URL(proxy);
                    httpClientBuilder.setProxy(new HttpHost(proxyUrl.getHost(), proxyUrl.getPort()));
                } catch (MalformedURLException e) {
                    log.warn("Incorrect proxy setting {}", proxy);
                }
            }
            return httpClientBuilder.build();
        }

        private static SSLContext getPermissiveSslContext() {
            try {
                SSLContext result = SSLContext.getInstance(PROTOCOL_TLS);
                result.init(
                    null,
                    new TrustManager[] {PERMISSIVE_TRUST_MANAGER},
                    new SecureRandom());
                return result;
            } catch (NoSuchAlgorithmException | KeyManagementException e) {
                log.error("Could not initialize a permissive SSL context", e);
            }
            return null;
        }
    }

    @SuppressWarnings("java:S4830")
    private static class PermissiveTrustManager implements X509TrustManager {
        @Override
        public void checkClientTrusted(X509Certificate[] x509Certificates, String s) {
            // No operation
        }
        @Override
        public void checkServerTrusted(X509Certificate[] x509Certificates, String s)  {
            // No operation
        }
        @Override
        public X509Certificate[] getAcceptedIssuers() {
            return new X509Certificate[0];
        }
    }
}
