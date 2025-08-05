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
package com.exadel.etoolbox.insider.service.provider;

import com.exadel.etoolbox.insider.service.ServiceException;
import com.exadel.etoolbox.insider.servlet.relay.RelayServlet;
import org.apache.sling.api.SlingHttpServletRequest;
import org.jetbrains.annotations.NotNull;

/**
 * Defines an interface for a component that answers to a request from the Authoring Insider's UI relayed via
 * {@link RelayServlet}. Such a component usually communicates to a third-party HTTP
 * endpoint or a service, or else performs a complex operation
 */
public interface ServiceProvider {

    /**
     * Returns the unique identifier of the service provider
     * @return String value; a non-blank string is expected
     */
    @NotNull
    String getId();

    /**
     * Retrieves the response to a request from the Authoring Insider's UI
     * @param request The {@link SlingHttpServletRequest} object containing parameters of the request
     * @return String value; a non-null string is expected
     * @throws ServiceException If an error occurs during the operation
     */
    @NotNull
    String getResponse(SlingHttpServletRequest request) throws ServiceException;

}
