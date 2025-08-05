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

import org.osgi.service.metatype.annotations.AttributeDefinition;
import org.osgi.service.metatype.annotations.AttributeType;
import org.osgi.service.metatype.annotations.ObjectClassDefinition;

/**
 * Defines the configuration for the {@link RelayServlet}
 */
@ObjectClassDefinition(name="EToolbox Authoring Insider - Relay Config")
public @interface RelayConfig {

    int DEFAULT_WAIT_TIMEOUT = 20_000;
    int DEFAULT_CACHE_TTL = 120_000;

    @AttributeDefinition(
            name = "Async Responses Keep-Alive Timeout (ms)",
            description = "Specify the keep-alive timeout for the deferred service providers' responses",
            type = AttributeType.INTEGER
    )
    int cacheKeepAlive() default DEFAULT_CACHE_TTL;

    @AttributeDefinition(
            name = "Response Waiting Timeout (ms)",
            description = "Specify the timeout for waiting a service provider's response",
            type = AttributeType.INTEGER
    )
    int waitTimeout() default DEFAULT_WAIT_TIMEOUT;
}
