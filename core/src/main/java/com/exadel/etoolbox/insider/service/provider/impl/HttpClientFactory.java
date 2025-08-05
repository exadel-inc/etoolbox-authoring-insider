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

import com.exadel.etoolbox.insider.service.provider.ServiceProvider;
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

/**
 * A factory class for creating customized {@link CloseableHttpClient}s for use with
 * {@link ServiceProvider} instances
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
@Slf4j
class HttpClientFactory {

    private static final String PROTOCOL_TLS = "TLS";
    private static final X509TrustManager PERMISSIVE_TRUST_MANAGER = new PermissiveTrustManager();

    /**
     * Starts creating a new {@link CloseableHttpClient} instance via the builder interface
     * @return A new {@link Builder} instance
     */
    public static Builder newClient() {
        return new Builder();
    }

    /**
     * A builder class for creating customized {@link CloseableHttpClient} instances
     */
    public static class Builder {
        private int timeout;
        private boolean skipSsl;
        private String proxy;

        /**
         * Assigns the client timeout
         * @param value Timeout value in milliseconds
         * @return This instance
         */
        public Builder timeout(int value) {
            if (value >= 0) {
                timeout = value;
            }
            return this;
        }

        /**
         * Assigns the flag indicating whether SSL verification should be skipped
         * @param value {@code True} to skip SSL verification, {@code false} otherwise
         * @return This instance
         */
        public Builder skipSsl(boolean value) {
            skipSsl = value;
            return this;
        }

        /**
         * Assigns the proxy server address
         * @param value String value; a valid URL is expected
         * @return This instance
         */
        public Builder proxy(String value) {
            proxy = value;
            return this;
        }

        /**
         * Creates a new {@link CloseableHttpClient} instance based on the provided settings
         * @return A {@code CloseableHttpClient} instance
         */
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

    /**
     * A permissive {@link X509TrustManager} implementation used to bypass certificate validation
     */
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
