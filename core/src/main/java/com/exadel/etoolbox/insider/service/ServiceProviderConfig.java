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
package com.exadel.etoolbox.insider.service;

import org.osgi.service.metatype.annotations.AttributeDefinition;
import org.osgi.service.metatype.annotations.AttributeType;
import org.osgi.service.metatype.annotations.ObjectClassDefinition;

@ObjectClassDefinition(name="EToolbox Authoring Insider - Service Providers")
public @interface ServiceProviderConfig {

    int DEFAULT_ATTEMPTS = 3;
    int DEFAULT_TIMEOUT = 20000;

    @AttributeDefinition(
            name = "Name (ID)",
            description = "Specify the name of the service provider"
    )
    String id();

    @AttributeDefinition(
            name = "Enabled",
            description = "Enable or disable this service provider",
            type = AttributeType.BOOLEAN
    )
    boolean enabled() default true;

    @AttributeDefinition(
            name = "Service Endpoint (URL)",
            description = "Specify the service endpoint (including path)"
    )
    String url();

    @AttributeDefinition(
            name = "Authentication Token",
            description = "Specify the authentication token. Leave blank if not required"
    )
    String token() default "";

    @AttributeDefinition(
            name = "Proxy",
            description = "Specify the proxy server. Leave blank if not required"
    )
    String proxy() default "";

    @AttributeDefinition(
            name = "Bypass SSL Verification",
            description = "Check to skip SSL verification for this service provider",
            type = AttributeType.BOOLEAN
    )
    boolean skipSsl() default false;

    @AttributeDefinition(
            name = "Connection Attempts",
            description = "Specify the number of connection attempts",
            type = AttributeType.INTEGER
    )
    int connectionAttempts() default DEFAULT_ATTEMPTS;

    @AttributeDefinition(
            name = "Service Timeout (ms)",
            description = "Specify the service timeout in milliseconds",
            type = AttributeType.INTEGER
    )
    int connectionTimeout() default DEFAULT_TIMEOUT;
}
