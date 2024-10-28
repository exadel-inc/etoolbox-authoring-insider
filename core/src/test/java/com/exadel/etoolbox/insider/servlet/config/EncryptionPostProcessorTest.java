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
import io.wcm.testing.mock.aem.junit5.AemContext;
import io.wcm.testing.mock.aem.junit5.AemContextExtension;
import org.apache.commons.lang3.StringUtils;
import org.apache.sling.api.resource.ValueMap;
import org.apache.sling.servlets.post.Modification;
import org.apache.sling.testing.mock.sling.servlet.MockRequestPathInfo;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mockito;

import java.util.ArrayList;
import java.util.List;

@ExtendWith({AemContextExtension.class})
public class EncryptionPostProcessorTest {

    private final AemContext context = new AemContext();

    private EncryptionPostProcessor encryptor;

    @BeforeEach
    public void init() throws CryptoException {
        context.load().json(
            "/com/exadel/etoolbox/insider/servlet/config/conf.json",
            "/conf/etoolbox/authoring-insider");

        CryptoSupport mockCryptoSupport = Mockito.mock(CryptoSupport.class);
        Mockito.when(mockCryptoSupport.encrypt(Mockito.any())).thenReturn("encrypted".getBytes());
        context.registerService(CryptoSupport.class, mockCryptoSupport);
        encryptor = context.registerInjectActivateService(new EncryptionPostProcessor());
    }

    @Test
    public void shouldNotProcessUnmatchedRequest() {
        List<Modification> modifications = new ArrayList<>();

        encryptor.process(context.request(), modifications);

        Assertions.assertEquals(0, modifications.size());
    }

    @Test
    public void shouldProcessMatchingRequest() {
        MockRequestPathInfo requestPathInfo = (MockRequestPathInfo) context.request().getRequestPathInfo();
        requestPathInfo.setSelectorString("eai.store");
        context.request().addRequestParameter("title", "Lorem ipsum");
        context.request().addRequestParameter("_token@encrypt", null);
        context.request().addRequestParameter(Constants.PROP_DETAILS, "{\"_token\":\"dolorSitAmet\", \"prompt\":\"Consectetur adipiscing elit\"}");
        context.request().setResource(context.resourceResolver().getResource("/conf/etoolbox/authoring-insider/tools/item0"));
        List<Modification> modifications = new ArrayList<>();

        encryptor.process(context.request(), modifications);

        Assertions.assertEquals(1, modifications.size());
        Assertions.assertEquals("/conf/etoolbox/authoring-insider/tools/item0", modifications.get(0).getSource());

        ValueMap valueMap = context.request().getResource().getValueMap();
        Assertions.assertTrue(StringUtils.contains(valueMap.get(Constants.PROP_DETAILS, String.class), "\"_token\":\"enc_"));
    }
}