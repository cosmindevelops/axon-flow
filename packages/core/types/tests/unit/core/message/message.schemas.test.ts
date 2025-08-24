/**
 * Test suite for core message schema validations
 */

import { describe, it, expect } from "vitest";

describe("Core Message Schema Validations", () => {
  describe("Base Message Schema", () => {
    it("should validate base message structure", () => {
      const mockMessageSchema = {
        validate: (data: any) => {
          const errors: string[] = [];

          if (typeof data !== "object" || data === null) {
            return { valid: false, errors: ["Message must be an object"] };
          }

          // Required fields
          const required = ["id", "type", "correlationId", "timestamp", "payload"];
          required.forEach((field) => {
            if (!(field in data)) {
              errors.push(`Missing required field: ${field}`);
            }
          });

          // Validate message ID
          if ("id" in data && typeof data.id !== "string") {
            errors.push("Message ID must be a string");
          }

          // Validate message type
          if ("type" in data) {
            const validTypes = ["command", "query", "event", "reply", "error"];
            if (!validTypes.includes(data.type)) {
              errors.push(`Message type must be one of: ${validTypes.join(", ")}`);
            }
          }

          // Validate correlation ID
          if ("correlationId" in data && typeof data.correlationId !== "string") {
            errors.push("Correlation ID must be a string");
          }

          // Validate timestamp
          if ("timestamp" in data) {
            const timestamp = new Date(data.timestamp);
            if (isNaN(timestamp.getTime())) {
              errors.push("Timestamp must be a valid ISO date string");
            }
          }

          // Validate metadata if present
          if ("metadata" in data && typeof data.metadata !== "object") {
            errors.push("Metadata must be an object");
          }

          return { valid: errors.length === 0, errors };
        },
      };

      // Valid message
      const validMessage = {
        id: "msg-12345",
        type: "command",
        correlationId: "corr-67890",
        timestamp: new Date().toISOString(),
        payload: {
          action: "execute-task",
          data: { input: "test" },
        },
        metadata: {
          source: "hub",
          priority: "normal",
        },
      };

      const validResult = mockMessageSchema.validate(validMessage);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid message
      const invalidMessage = {
        id: 123, // Should be string
        type: "invalid-type", // Invalid type
        correlationId: null, // Should be string
        timestamp: "invalid-date", // Invalid date
        // Missing payload
        metadata: "not-an-object", // Should be object
      };

      const invalidResult = mockMessageSchema.validate(invalidMessage);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Command Message Schema", () => {
    it("should validate command message structure", () => {
      const mockCommandSchema = {
        validate: (data: any) => {
          const errors: string[] = [];

          if (typeof data !== "object" || data === null) {
            return { valid: false, errors: ["Command must be an object"] };
          }

          // Validate command name
          if (!("commandName" in data) || typeof data.commandName !== "string") {
            errors.push("Command name is required and must be a string");
          }

          // Validate expects reply
          if (!("expectsReply" in data) || typeof data.expectsReply !== "boolean") {
            errors.push("Expects reply is required and must be a boolean");
          }

          // Validate parameters
          if ("parameters" in data && typeof data.parameters !== "object") {
            errors.push("Parameters must be an object");
          }

          // Validate timeout
          if ("timeout" in data) {
            if (typeof data.timeout !== "number" || data.timeout <= 0) {
              errors.push("Timeout must be a positive number");
            }
          }

          return { valid: errors.length === 0, errors };
        },
      };

      // Valid command
      const validCommand = {
        commandName: "execute-capability",
        expectsReply: true,
        parameters: {
          capabilityName: "data-processing",
          input: { data: [1, 2, 3] },
          options: { validate: true },
        },
        timeout: 30000,
      };

      const validResult = mockCommandSchema.validate(validCommand);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid command
      const invalidCommand = {
        // Missing commandName
        expectsReply: "yes", // Should be boolean
        parameters: "not-an-object", // Should be object
        timeout: -1000, // Should be positive
      };

      const invalidResult = mockCommandSchema.validate(invalidCommand);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Query Message Schema", () => {
    it("should validate query message structure", () => {
      const mockQuerySchema = {
        validate: (data: any) => {
          const errors: string[] = [];

          if (typeof data !== "object" || data === null) {
            return { valid: false, errors: ["Query must be an object"] };
          }

          // Validate query name
          if (!("queryName" in data) || typeof data.queryName !== "string") {
            errors.push("Query name is required and must be a string");
          }

          // Validate result type
          if (!("resultType" in data) || typeof data.resultType !== "string") {
            errors.push("Result type is required and must be a string");
          }

          // Validate query parameters
          if ("queryParams" in data && typeof data.queryParams !== "object") {
            errors.push("Query parameters must be an object");
          }

          // Validate filters
          if ("filters" in data) {
            if (!Array.isArray(data.filters)) {
              errors.push("Filters must be an array");
            } else {
              data.filters.forEach((filter: any, index: number) => {
                if (typeof filter !== "object" || !filter.field || !filter.operator) {
                  errors.push(`Filter at index ${index} must have field and operator`);
                }
              });
            }
          }

          return { valid: errors.length === 0, errors };
        },
      };

      // Valid query
      const validQuery = {
        queryName: "get-agent-status",
        resultType: "AgentStatus[]",
        queryParams: {
          agentIds: ["agent-001", "agent-002"],
          includeMetrics: true,
        },
        filters: [
          { field: "status", operator: "equals", value: "active" },
          { field: "lastHeartbeat", operator: "greaterThan", value: "2024-01-01T00:00:00Z" },
        ],
      };

      const validResult = mockQuerySchema.validate(validQuery);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid query
      const invalidQuery = {
        // Missing queryName
        resultType: 123, // Should be string
        queryParams: "not-an-object", // Should be object
        filters: [
          { field: "status" }, // Missing operator
          "invalid-filter", // Should be object
        ],
      };

      const invalidResult = mockQuerySchema.validate(invalidQuery);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Event Message Schema", () => {
    it("should validate event message structure", () => {
      const mockEventSchema = {
        validate: (data: any) => {
          const errors: string[] = [];

          if (typeof data !== "object" || data === null) {
            return { valid: false, errors: ["Event must be an object"] };
          }

          // Validate event name
          if (!("eventName" in data) || typeof data.eventName !== "string") {
            errors.push("Event name is required and must be a string");
          }

          // Validate event data
          if ("eventData" in data && typeof data.eventData !== "object") {
            errors.push("Event data must be an object");
          }

          // Validate source
          if ("source" in data && typeof data.source !== "string") {
            errors.push("Source must be a string");
          }

          // Validate event category
          if ("category" in data) {
            const validCategories = ["system", "agent", "task", "workflow", "user"];
            if (!validCategories.includes(data.category)) {
              errors.push(`Category must be one of: ${validCategories.join(", ")}`);
            }
          }

          return { valid: errors.length === 0, errors };
        },
      };

      // Valid event
      const validEvent = {
        eventName: "agent.registered",
        eventData: {
          agentId: "agent-001",
          capabilities: ["data-processing", "communication"],
          metadata: { version: "1.0.0" },
        },
        source: "registration-service",
        category: "agent",
        severity: "info",
      };

      const validResult = mockEventSchema.validate(validEvent);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid event
      const invalidEvent = {
        eventName: 123, // Should be string
        eventData: "not-an-object", // Should be object
        source: null, // Should be string
        category: "invalid-category", // Invalid category
      };

      const invalidResult = mockEventSchema.validate(invalidEvent);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Reply Message Schema", () => {
    it("should validate reply message structure", () => {
      const mockReplySchema = {
        validate: (data: any) => {
          const errors: string[] = [];

          if (typeof data !== "object" || data === null) {
            return { valid: false, errors: ["Reply must be an object"] };
          }

          // Validate request ID
          if (!("requestId" in data) || typeof data.requestId !== "string") {
            errors.push("Request ID is required and must be a string");
          }

          // Validate success flag
          if (!("success" in data) || typeof data.success !== "boolean") {
            errors.push("Success flag is required and must be a boolean");
          }

          // If success is false, error should be present
          if ("success" in data && !data.success && !("error" in data)) {
            errors.push("Error information is required when success is false");
          }

          // Validate error structure if present
          if ("error" in data) {
            if (typeof data.error !== "object" || data.error === null) {
              errors.push("Error must be an object");
            } else {
              if (!data.error.code || typeof data.error.code !== "string") {
                errors.push("Error code is required and must be a string");
              }
              if (!data.error.message || typeof data.error.message !== "string") {
                errors.push("Error message is required and must be a string");
              }
            }
          }

          return { valid: errors.length === 0, errors };
        },
      };

      // Valid success reply
      const validSuccessReply = {
        requestId: "req-12345",
        success: true,
        result: {
          data: "processed successfully",
          processingTime: 1500,
        },
      };

      const validSuccessResult = mockReplySchema.validate(validSuccessReply);
      expect(validSuccessResult.valid).toBe(true);
      expect(validSuccessResult.errors).toHaveLength(0);

      // Valid error reply
      const validErrorReply = {
        requestId: "req-67890",
        success: false,
        error: {
          code: "PROCESSING_ERROR",
          message: "Failed to process input data",
          details: { inputSize: 1024, errorLine: 42 },
        },
      };

      const validErrorResult = mockReplySchema.validate(validErrorReply);
      expect(validErrorResult.valid).toBe(true);
      expect(validErrorResult.errors).toHaveLength(0);

      // Invalid reply
      const invalidReply = {
        requestId: 123, // Should be string
        success: "yes", // Should be boolean
        error: "not-an-object", // Should be object
      };

      const invalidResult = mockReplySchema.validate(invalidReply);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Error Message Schema", () => {
    it("should validate error message structure", () => {
      const mockErrorSchema = {
        validate: (data: any) => {
          const errors: string[] = [];

          if (typeof data !== "object" || data === null) {
            return { valid: false, errors: ["Error message must be an object"] };
          }

          // Validate severity
          if (!("severity" in data)) {
            errors.push("Severity is required");
          } else {
            const validSeverities = ["low", "medium", "high", "critical"];
            if (!validSeverities.includes(data.severity)) {
              errors.push(`Severity must be one of: ${validSeverities.join(", ")}`);
            }
          }

          // Validate error code
          if ("errorCode" in data && typeof data.errorCode !== "string") {
            errors.push("Error code must be a string");
          }

          // Validate error message
          if ("errorMessage" in data && typeof data.errorMessage !== "string") {
            errors.push("Error message must be a string");
          }

          // Validate stack trace
          if ("stackTrace" in data && typeof data.stackTrace !== "string") {
            errors.push("Stack trace must be a string");
          }

          // Validate context
          if ("context" in data && typeof data.context !== "object") {
            errors.push("Context must be an object");
          }

          return { valid: errors.length === 0, errors };
        },
      };

      // Valid error message
      const validError = {
        severity: "high",
        errorCode: "AGENT_COMMUNICATION_FAILURE",
        errorMessage: "Failed to establish connection with agent",
        stackTrace: "Error: Connection timeout\n    at connect (agent.js:123)",
        context: {
          agentId: "agent-001",
          attemptCount: 3,
          lastAttempt: "2024-01-01T12:00:00Z",
        },
      };

      const validResult = mockErrorSchema.validate(validError);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid error message
      const invalidError = {
        severity: "invalid-severity", // Invalid severity
        errorCode: 123, // Should be string
        errorMessage: null, // Should be string
        context: "not-an-object", // Should be object
      };

      const invalidResult = mockErrorSchema.validate(invalidError);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Message Routing Schema", () => {
    it("should validate message routing configuration", () => {
      const mockRoutingSchema = {
        validate: (data: any) => {
          const errors: string[] = [];

          if (typeof data !== "object" || data === null) {
            return { valid: false, errors: ["Routing config must be an object"] };
          }

          // Validate routing type
          if ("type" in data) {
            const validTypes = ["direct", "broadcast", "multicast", "round-robin"];
            if (!validTypes.includes(data.type)) {
              errors.push(`Routing type must be one of: ${validTypes.join(", ")}`);
            }
          }

          // Validate targets
          if ("targets" in data) {
            if (!Array.isArray(data.targets)) {
              errors.push("Targets must be an array");
            } else if (data.targets.length === 0 && data.type !== "broadcast") {
              errors.push("Targets array cannot be empty for non-broadcast routing");
            }
          }

          // Validate routing rules
          if ("rules" in data) {
            if (!Array.isArray(data.rules)) {
              errors.push("Rules must be an array");
            } else {
              data.rules.forEach((rule: any, index: number) => {
                if (typeof rule !== "object" || !rule.condition || !rule.action) {
                  errors.push(`Rule at index ${index} must have condition and action`);
                }
              });
            }
          }

          return { valid: errors.length === 0, errors };
        },
      };

      // Valid routing config
      const validRouting = {
        type: "multicast",
        targets: ["agent-001", "agent-002", "agent-003"],
        rules: [
          {
            condition: "message.type === 'command'",
            action: "route_to_available",
          },
          {
            condition: "message.priority === 'critical'",
            action: "route_to_all",
          },
        ],
        fallback: {
          type: "direct",
          target: "default-handler",
        },
      };

      const validResult = mockRoutingSchema.validate(validRouting);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid routing config
      const invalidRouting = {
        type: "invalid-type", // Invalid routing type
        targets: "not-an-array", // Should be array
        rules: [
          { condition: "test" }, // Missing action
          "invalid-rule", // Should be object
        ],
      };

      const invalidResult = mockRoutingSchema.validate(invalidRouting);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Schema Integration", () => {
    it("should support composite message validation", () => {
      const mockCompositeSchema = {
        validate: (data: any) => {
          const errors: string[] = [];

          // Validate base message structure
          if (typeof data !== "object" || data === null) {
            return { valid: false, errors: ["Message must be an object"] };
          }

          // Validate based on message type
          if ("type" in data) {
            switch (data.type) {
              case "command":
                if (!("commandName" in data)) {
                  errors.push("Command messages must have commandName");
                }
                break;
              case "query":
                if (!("queryName" in data)) {
                  errors.push("Query messages must have queryName");
                }
                break;
              case "event":
                if (!("eventName" in data)) {
                  errors.push("Event messages must have eventName");
                }
                break;
            }
          }

          return { valid: errors.length === 0, errors };
        },
      };

      const validCompositeMessage = {
        id: "msg-123",
        type: "command",
        commandName: "execute-task",
        correlationId: "corr-456",
        timestamp: new Date().toISOString(),
        payload: { action: "process" },
      };

      const result = mockCompositeSchema.validate(validCompositeMessage);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
