package com.exadel.etoolbox.insider.service.mcp.impl.tool;

import com.exadel.etoolbox.insider.service.ServiceException;
import com.exadel.etoolbox.insider.service.mcp.McpToolComponent;
import io.modelcontextprotocol.server.McpSyncServerExchange;
import io.modelcontextprotocol.spec.McpSchema;
import org.osgi.service.component.annotations.Component;

@Component(
        service = McpToolComponent.class,
        immediate = true,
        property = {
                "mcp.tool.name=arithmetics",
                "mcp.tool.description=Performs arithmetic operations",
                "mcp.tool.property=operation:string;One of 'add', 'subtract', 'multiply', 'divide';required",
                "mcp.tool.property=operand1:number;First operand;required",
                "mcp.tool.property=operand2:number;Second operand;required",
        }
)
public class Arithmetics implements McpToolComponent {

    @Override
    public McpSchema.CallToolResult execute(
            McpSyncServerExchange exchange,
            McpSchema.CallToolRequest request) throws ServiceException {

        if (request == null || request.arguments() == null) {
            throw new ServiceException("Invalid request");
        }

        String operation = (String) request.arguments().get("operation");
        double operand1 = Double.parseDouble(request.arguments().get("operand1").toString());
        double operand2 = Double.parseDouble(request.arguments().get("operand2").toString());
        if ("add".equalsIgnoreCase(operation)) {
            return McpSchema.CallToolResult.builder()
                    .addContent(new McpSchema.TextContent(String.valueOf(operand1 + operand2)))
                    .build();
        } else if ("subtract".equalsIgnoreCase(operation)) {
            return McpSchema.CallToolResult.builder()
                    .addContent(new McpSchema.TextContent(String.valueOf(operand1 - operand2)))
                    .build();
        } else if ("multiply".equalsIgnoreCase(operation)) {
            return McpSchema.CallToolResult.builder()
                    .addContent(new McpSchema.TextContent(String.valueOf(operand1 * operand2)))
                    .build();
        } else if ("divide".equalsIgnoreCase(operation)) {
            if (operand2 == 0) {
                throw new ArithmeticException("Division by zero is not allowed");
            }
            return McpSchema.CallToolResult.builder()
                    .addContent(new McpSchema.TextContent(String.valueOf(operand1 / operand2)))
                    .build();
        } else {
            throw new ServiceException("Unknown operation: " + operation);
        }
    }
}
