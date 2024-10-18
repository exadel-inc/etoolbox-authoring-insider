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
package com.exadel.etoolbox.insider.servlet.config;

import com.adobe.granite.ui.components.FormData;
import com.exadel.etoolbox.insider.util.Constants;
import com.exadel.etoolbox.insider.util.JsonUtil;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import org.apache.commons.collections4.MapUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ValueMap;
import org.apache.sling.api.wrappers.ValueMapDecorator;

import java.util.HashMap;
import java.util.Map;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
class FormDataHelper {

    static void process(SlingHttpServletRequest request) {
        Map<String, Object> unpackedDetails = unpackDetails(request);
        if (MapUtils.isEmpty(unpackedDetails)) {
            return;
        }

        Map<String, Object> values = new HashMap<>();
        FormData existing = FormData.from(request);
        if (existing != null) {
            values.putAll(existing.getValueMap());
        }
        values.putAll(unpackedDetails);
        ValueMap valueMap = new ValueMapDecorator(values);
        FormData.push(request, valueMap, FormData.NameNotFoundMode.IGNORE_FRESHNESS);
    }

    private static Map<String, Object> unpackDetails(SlingHttpServletRequest request) {
        String targetResourcePath = request.getRequestPathInfo().getSuffix();
        Resource targetResource = StringUtils.isNotEmpty(targetResourcePath)
                ? request.getResourceResolver().getResource(targetResourcePath)
                : null;
        String details = targetResource != null ? targetResource.getValueMap().get(Constants.PROP_DETAILS, String.class) : null;
        return JsonUtil.getMap(details);
    }
}
