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

/*
 * Copyright 2024 - 2024 the original author or authors.
 */
package com.exadel.etoolbox.insider.servlet.mcp;

import com.exadel.etoolbox.insider.service.mcp.McpInstrumentation;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.modelcontextprotocol.spec.McpSchema;
import io.modelcontextprotocol.spec.McpServerSession;
import io.modelcontextprotocol.spec.McpServerTransport;
import io.modelcontextprotocol.spec.McpServerTransportProvider;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.IOUtils;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.SlingHttpServletResponse;
import org.apache.sling.api.servlets.ServletResolverConstants;
import org.apache.sling.api.servlets.SlingAllMethodsServlet;
import org.jetbrains.annotations.NotNull;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Deactivate;
import org.osgi.service.component.annotations.Reference;
import org.osgi.service.component.annotations.ReferenceCardinality;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import javax.servlet.AsyncContext;
import javax.servlet.ServletRequest;
import javax.servlet.ServletRequestWrapper;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

@Component(
		service = javax.servlet.Servlet.class,
		property = {
				ServletResolverConstants.SLING_SERVLET_METHODS + "=GET",
				ServletResolverConstants.SLING_SERVLET_METHODS + "=POST",
				ServletResolverConstants.SLING_SERVLET_RESOURCE_TYPES + "=/bin/etoolbox/authoring-insider/mcp",
				ServletResolverConstants.SLING_SERVLET_RESOURCE_TYPES + "=/bin/etoolbox/authoring-insider/mcp/message",
				"sling.servlet.asyncSupported=true"
		}
)
@Slf4j
public class McpServlet extends SlingAllMethodsServlet implements McpServerTransportProvider {

	private static final String CONTENT_TYPE_JSON = "application/json";
	private static final String CONTENT_TYPE_EVENT_STREAM = "text/event-stream";

	private static final String EVENT_TYPE_MESSAGE = "message";
	private static final String EVENT_TYPE_ENDPOINT = "endpoint";
	private static final int TIMEOUT_INFINITE = 0;

	private final AtomicBoolean isClosing = new AtomicBoolean(false);
	private final ObjectMapper objectMapper = new ObjectMapper();
	private final Map<String, McpServerSession> sessions = new ConcurrentHashMap<>();
	private final AtomicReference<McpServerSession.Factory> sessionFactory = new AtomicReference<>();

	@Reference(cardinality = ReferenceCardinality.OPTIONAL)
	private McpInstrumentation mcpInstrumentation;

	/* ---------
	   Lifecycle
	   --------- */

	@Activate
	private void activate() {
		log.info("Activating MCP servlet");
	}

	@Deactivate
	private void deactivate() {
		log.info("Deactivating MCP servlet");
		closeGracefully().block();
	}

	/* -------------
	   Servlet logic
	   ------------- */

	@Override
	protected void doGet(
			@NotNull SlingHttpServletRequest request,
			@NotNull SlingHttpServletResponse response) throws IOException {

		if (mcpInstrumentation == null) {
			response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
			return;
		} else if (isClosing.get()) {
			response.sendError(HttpServletResponse.SC_SERVICE_UNAVAILABLE, "Server is shutting down");
			return;
		}

		mcpInstrumentation.bindTransport(this);
		if (sessionFactory.get() == null) {
			sendErrorResponse(response, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Session factory is not set");
			return;
		}

		String requestURI = request.getRequestURI();
		if (!requestURI.endsWith("/mcp")) {
			response.sendError(HttpServletResponse.SC_NOT_FOUND);
			return;
		}

		response.setContentType(CONTENT_TYPE_EVENT_STREAM);
		response.setCharacterEncoding(StandardCharsets.UTF_8.name());
		response.setHeader("Cache-Control", "no-cache");
		response.setHeader("Connection", "keep-alive");
		response.setHeader("Access-Control-Allow-Origin", "*");

		String sessionId = UUID.randomUUID().toString();
		HttpServletRequest originalRequest = getOriginalRequest(request);
		AsyncContext asyncContext = originalRequest.startAsync();
		asyncContext.setTimeout(TIMEOUT_INFINITE);
		SessionTransport sessionTransport = new SessionTransport(sessionId, asyncContext);

		sessions.put(sessionId, sessionFactory.get().create(sessionTransport));
		sendEvent(
				asyncContext.getResponse().getWriter(),
				EVENT_TYPE_ENDPOINT,
				request.getRequestPathInfo().getResourcePath() + "/message?sessionId=" + sessionId);
	}

	@Override
	protected void doPost(
			@NotNull SlingHttpServletRequest request,
			@NotNull SlingHttpServletResponse response) throws IOException {

		if (mcpInstrumentation == null) {
			response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
			return;
		} else if (isClosing.get()) {
			response.sendError(HttpServletResponse.SC_SERVICE_UNAVAILABLE, "Server is shutting down");
			return;
		}

		String requestURI = request.getRequestURI();
		if (!requestURI.endsWith("/message")) {
			response.sendError(HttpServletResponse.SC_NOT_FOUND);
			return;
		}

		String sessionId = request.getParameter("sessionId");
		if (sessionId == null) {
			sendErrorResponse(response, HttpServletResponse.SC_BAD_REQUEST, "Session ID is missing");
			return;
		}

		McpServerSession session = sessions.get(sessionId);
		if (session == null) {
			sendErrorResponse(response, HttpServletResponse.SC_BAD_REQUEST, "Session not found: " + sessionId);
			return;
		}

		mcpInstrumentation.bindTransport(this);
		try {
			String body = IOUtils.toString(request.getInputStream(), StandardCharsets.UTF_8);
			McpSchema.JSONRPCMessage message = McpSchema.deserializeJsonRpcMessage(objectMapper, body);
			response.setStatus(HttpServletResponse.SC_OK);
			session.handle(message).block();
		} catch (Exception e) {
			log.error("Error processing message: {}", e.getMessage());
			sendErrorResponse(response, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, e.getMessage());
		}
	}

	private void sendEvent(PrintWriter writer, String eventType, String data) throws IOException {
		writer.write("event: " + eventType + "\n");
		writer.write("data: " + data + "\n\n");
		writer.flush();
		if (writer.checkError()) {
			throw new IOException("Client disconnected");
		}
	}

	/* --------------------
	    MCP transport logic
	   -------------------- */

	@Override
	public void setSessionFactory(McpServerSession.Factory value) {
		this.sessionFactory.set(value);
	}

	@Override
	public Mono<Void> notifyClients(String method, Object params) {
		if (sessions.isEmpty()) {
			log.debug("No active sessions to broadcast a message to");
			return Mono.empty();
		}
		log.debug("Attempting to broadcast a message to {} active sessions", sessions.size());
		return Flux
				.fromIterable(sessions.values())
				.flatMap(session -> session.sendNotification(method, params)
						.doOnError(e -> logSendingFailure(session.getId(), e))
						.onErrorComplete())
				.then();
	}

	@Override
	public Mono<Void> closeGracefully() {
		isClosing.set(true);
		log.debug("Initiating graceful shutdown with {} active sessions", sessions.size());
		return Flux.fromIterable(sessions.values()).flatMap(McpServerSession::closeGracefully).then();
	}

	/* --------------------
	   MCP session handling
	   -------------------- */

	private class SessionTransport implements McpServerTransport {

		private final String sessionId;
		private final AsyncContext context;
		private final PrintWriter writer;

		SessionTransport(String sessionId, AsyncContext context) throws IOException {
			this.sessionId = sessionId;
			this.context = context;
			this.writer = context.getResponse().getWriter();
			log.debug("Session transport {} initialized with an SSE writer", sessionId);
		}

		@Override
		public Mono<Void> sendMessage(McpSchema.JSONRPCMessage message) {
			return Mono.fromRunnable(() -> {
				try {
					String jsonText = objectMapper.writeValueAsString(message);
					sendEvent(writer, EVENT_TYPE_MESSAGE, jsonText);
					log.debug("Message sent to session {}", sessionId);
				}
				catch (Exception e) {
					logSendingFailure(sessionId, e);
					sessions.remove(sessionId);
					context.complete();
				}
			});
		}

		@Override
		public <T> T unmarshalFrom(Object data, TypeReference<T> typeRef) {
			return objectMapper.convertValue(data, typeRef);
		}

		@Override
		public Mono<Void> closeGracefully() {
			return Mono.fromRunnable(() -> {
				log.debug("Closing session transport: {}", sessionId);
				close();
			});
		}

		@Override
		public void close() {
			try {
				sessions.remove(sessionId);
				context.complete();
				log.debug("Successfully completed async context for session {}", sessionId);
			}
			catch (Exception e) {
				log.warn("Failed to complete async context for session {}: {}", sessionId, e.getMessage());
			}
		}
	}

	/* --------------
	   Error handling
	   -------------- */

	private void sendErrorResponse(HttpServletResponse response, int status, String message) throws IOException {
		response.setContentType(CONTENT_TYPE_JSON);
		response.setCharacterEncoding(StandardCharsets.UTF_8.name());
		response.setStatus(status);
		String jsonError = objectMapper.writeValueAsString(Map.of("message", message, "status", status));
		PrintWriter writer = response.getWriter();
		writer.write(jsonError);
		writer.flush();
	}

	private static void logSendingFailure(String sessionId, Throwable e) {
		log.error("Failed to send a message to session {}: {}", sessionId, e.getMessage());
	}

	/* ---------
	   Utilities
	   --------- */

	private static HttpServletRequest getOriginalRequest(SlingHttpServletRequest value) {
		HttpServletRequest result = value;
		while (result instanceof ServletRequestWrapper) {
			ServletRequest wrapped = ((ServletRequestWrapper) result).getRequest();
			if (!(wrapped instanceof HttpServletRequest)) {
				return result;
			}
			result = (HttpServletRequest) wrapped;
		}
		return result;
	}
}
