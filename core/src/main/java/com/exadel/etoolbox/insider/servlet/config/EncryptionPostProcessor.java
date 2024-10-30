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

import com.adobe.granite.crypto.CryptoException;
import com.adobe.granite.crypto.CryptoSupport;
import com.exadel.etoolbox.insider.util.Constants;
import com.exadel.etoolbox.insider.util.JsonUtil;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.ArrayUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.resource.ModifiableValueMap;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.servlets.post.Modification;
import org.apache.sling.servlets.post.SlingPostProcessor;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;

import javax.servlet.ServletRequest;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * A Sling Post Processor implementation that encrypts sensitive data upon storing it in the repository
 */
@Component(service = SlingPostProcessor.class)
@Slf4j
public class EncryptionPostProcessor implements SlingPostProcessor {

    @Reference
    private transient CryptoSupport cryptoService;

    /**
     * Processes the request to encrypt sensitive data before storing it in the repository
     * @param request       The {@link SlingHttpServletRequest} object
     * @param modifications The list of {@link Modification} objects representing changes to be applied to the
     *                      repository
     */
    @Override
    public void process(SlingHttpServletRequest request, List<Modification> modifications) {
        if (!isMatch(request)) {
            return;
        }
        Set<String> encryptableFields = getEncryptableFields(request);
        Map<String, Object> detailsMap = JsonUtil.getMap(request.getParameter(Constants.PROP_DETAILS));
        boolean detailsModified = false;
        for (String key : encryptableFields) {
            if (detailsMap.containsKey(key)) {
                String value = (String) detailsMap.get(key);
                String modifiedValue = ensureEncrypted(key, value);
                detailsMap.put(key, modifiedValue);
                detailsModified |= !StringUtils.equals(value, modifiedValue);
            }
        }
        if (!detailsModified) {
            return;
        }
        Resource resource = request.getResource();
        ModifiableValueMap properties = resource.adaptTo(ModifiableValueMap.class);
        if (properties == null) {
            log.error("Failed to adapt {} to ModifiableValueMap", resource.getPath());
            return;
        }
        properties.put(Constants.PROP_DETAILS, JsonUtil.toJson(detailsMap));
        modifications.add(Modification.onModified(resource.getPath()));
    }

    private static boolean isMatch(SlingHttpServletRequest request) {
        String[] selectors = request.getRequestPathInfo().getSelectors();
        return ArrayUtils.contains(selectors, "eai") && ArrayUtils.contains(selectors, "store");
    }

    private String ensureEncrypted(String key, String value) {
        if (StringUtils.isBlank(value) && value.startsWith(Constants.PREFIX_ENCRYPT)) {
            return value;
        }
        try {
            byte[] encrypted = cryptoService.encrypt(value.getBytes(StandardCharsets.UTF_8));
            String encoded = Base64.getEncoder().encodeToString(encrypted);
            return Constants.PREFIX_ENCRYPT + encoded;
        } catch (CryptoException e) {
            log.error("Failed to encrypt key \"{}\"", key, e);
        }
        return value;
    }

    private static Set<String> getEncryptableFields(ServletRequest request) {
        return request.getParameterMap().keySet()
                .stream()
                .filter(key -> key.endsWith(Constants.SUFFIX_ENCRYPT))
                .map(key -> key.substring(0, key.length() - Constants.SUFFIX_ENCRYPT.length()))
                .collect(Collectors.toSet());
    }
}
