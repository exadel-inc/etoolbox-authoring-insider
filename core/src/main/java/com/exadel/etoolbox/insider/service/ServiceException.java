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

/**
 * Represents an exception that may occur during service operations
 * @see ServiceProvider
 */
public class ServiceException extends Exception {

    /**
     * Constructs a new exception with the specified detail message
     * @param message The detail message
     */
    public ServiceException(String message) {
        super(message);
    }

    /**
     * Constructs a new exception with the specified detail message and cause
     * @param message The detail message
     * @param cause   The upstream exception (or "cause") per the {@link Exception} contract
     */
    public ServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}
