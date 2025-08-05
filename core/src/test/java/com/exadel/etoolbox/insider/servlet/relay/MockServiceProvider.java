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

import com.exadel.etoolbox.insider.service.provider.ServiceProvider;
import org.apache.commons.lang3.StringUtils;
import org.apache.sling.api.SlingHttpServletRequest;
import org.jetbrains.annotations.NotNull;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

class MockServiceProvider implements ServiceProvider {
    @Override
    @NotNull
    public String getId() {
        return "mock";
    }

    @Override
    @NotNull
    public String getResponse(SlingHttpServletRequest request) {
        boolean respondSlow = Boolean.parseBoolean(request.getParameter("slow"));
        if (!respondSlow) {
            return "Lorem ipsum";
        }
        try {
            if (!new CountDownLatch(1).await(1000, TimeUnit.MILLISECONDS)) {
                return "Timed out";
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return StringUtils.EMPTY;
    }
}
