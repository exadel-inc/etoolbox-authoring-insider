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
package com.exadel.etoolbox.insider;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.AppenderBase;
import lombok.Getter;
import org.junit.jupiter.api.extension.AfterEachCallback;
import org.junit.jupiter.api.extension.BeforeEachCallback;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;

public class LoggerExtension implements BeforeEachCallback, AfterEachCallback {

    private final Logger logger = (Logger) LoggerFactory.getLogger(Logger.ROOT_LOGGER_NAME);
    private final LocalAppender appender = new LocalAppender();

    @Getter
    private List<String> messages;

    @Override
    public void afterEach(ExtensionContext extensionContext) {
        appender.stop();
        logger.detachAppender(appender);
        messages.clear();
    }

    @Override
    public void beforeEach(ExtensionContext extensionContext) {
        messages = new ArrayList<>();
        logger.addAppender(appender);
        appender.start();
    }

    private class LocalAppender extends AppenderBase<ILoggingEvent> {
        @Override
        protected void append(ILoggingEvent iLoggingEvent) {
            messages.add(iLoggingEvent.getFormattedMessage());
        }
    }
}