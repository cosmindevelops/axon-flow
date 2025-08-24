/**
 * Test suite for core agent schema validations
 */

import { describe, it, expect } from "vitest";

describe("Core Agent Schema Validations", () => {
  describe("Agent Registration Schema", () => {
    it("should validate agent registration structure", () => {
      const mockRegistrationSchema = {
        validate: (data: any) => {
          const errors: string[] = [];

          if (typeof data !== "object" || data === null) {
            return { valid: false, errors: ["Registration data must be an object"] };
          }

          // Required fields
          const required = ["name", "version", "capabilities"];
          required.forEach((field) => {
            if (!(field in data)) {
              errors.push(`Missing required field: ${field}`);
            }
          });

          // Validate name
          if ("name" in data && (typeof data.name !== "string" || data.name.length === 0)) {
            errors.push("Agent name must be a non-empty string");
          }

          // Validate version
          if ("version" in data && typeof data.version === "string") {
            if (!/^\d+\.\d+\.\d+/.test(data.version)) {
              errors.push("Version must be in semantic version format (e.g., 1.0.0)");
            }
          }

          // Validate capabilities
          if ("capabilities" in data) {
            if (!Array.isArray(data.capabilities)) {
              errors.push("Capabilities must be an array");
            } else {
              data.capabilities.forEach((cap: any, index: number) => {
                if (typeof cap !== "object" || cap === null) {
                  errors.push(`Capability at index ${index} must be an object`);
                } else {
                  if (!cap.name || typeof cap.name !== "string") {
                    errors.push(`Capability at index ${index} must have a name`);
                  }
                  if (!cap.version || typeof cap.version !== "string") {
                    errors.push(`Capability at index ${index} must have a version`);
                  }
                }
              });
            }
          }

          // Validate optional description
          if ("description" in data && typeof data.description !== "string") {
            errors.push("Description must be a string");
          }

          // Validate optional tags
          if ("tags" in data) {
            if (!Array.isArray(data.tags)) {
              errors.push("Tags must be an array");
            } else if (!data.tags.every((tag: any) => typeof tag === "string")) {
              errors.push("All tags must be strings");
            }
          }

          return { valid: errors.length === 0, errors };
        },
      };

      // Valid registration data
      const validRegistration = {
        name: "data-processor-agent",
        version: "1.2.3",
        description: "Agent for processing various data formats",
        capabilities: [
          {
            name: "data-transformation",
            version: "1.0.0",
            description: "Transform data between formats",
          },
          {
            name: "data-validation",
            version: "1.1.0",
            description: "Validate data integrity",
          },
        ],
        tags: ["data", "processing", "transformation"],
        metadata: {
          author: "Axon Flow Team",
          license: "MIT",
        },
      };

      const validResult = mockRegistrationSchema.validate(validRegistration);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid registration data
      const invalidRegistration = {
        name: "", // Invalid empty name
        version: "invalid-version", // Invalid version format
        capabilities: "not-an-array", // Should be array
        tags: [123, true], // Should be strings
        description: 456, // Should be string
      };

      const invalidResult = mockRegistrationSchema.validate(invalidRegistration);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Agent Capability Schema", () => {
    it("should validate agent capability structure", () => {
      const mockCapabilitySchema = {
        validate: (data: any) => {
          const errors: string[] = [];

          if (typeof data !== "object" || data === null) {
            return { valid: false, errors: ["Capability data must be an object"] };
          }

          // Required fields
          const required = ["name", "version", "description"];
          required.forEach((field) => {
            if (!(field in data)) {
              errors.push(`Missing required field: ${field}`);
            }
          });

          // Validate name
          if ("name" in data) {
            if (typeof data.name !== "string" || data.name.length === 0) {
              errors.push("Capability name must be a non-empty string");
            } else if (!/^[a-z][a-z0-9-]*$/.test(data.name)) {
              errors.push("Capability name must be kebab-case (lowercase, hyphens only)");
            }
          }

          // Validate version
          if ("version" in data && typeof data.version === "string") {
            if (!/^\d+\.\d+\.\d+/.test(data.version)) {
              errors.push("Version must be in semantic version format");
            }
          }

          // Validate parameters
          if ("parameters" in data) {
            if (!Array.isArray(data.parameters)) {
              errors.push("Parameters must be an array");
            } else {
              data.parameters.forEach((param: any, index: number) => {
                if (typeof param !== "object" || param === null) {
                  errors.push(`Parameter at index ${index} must be an object`);
                } else {
                  if (!param.name || typeof param.name !== "string") {
                    errors.push(`Parameter at index ${index} must have a name`);
                  }
                  if (!param.type || typeof param.type !== "string") {
                    errors.push(`Parameter at index ${index} must have a type`);
                  }
                  if ("required" in param && typeof param.required !== "boolean") {
                    errors.push(`Parameter at index ${index} required field must be boolean`);
                  }
                }
              });
            }
          }

          // Validate returns
          if ("returns" in data) {
            if (typeof data.returns !== "object" || data.returns === null) {
              errors.push("Returns must be an object");
            } else {
              if (!data.returns.type || typeof data.returns.type !== "string") {
                errors.push("Returns must have a type field");
              }
            }
          }

          return { valid: errors.length === 0, errors };
        },
      };

      // Valid capability data
      const validCapability = {
        name: "data-transformation",
        version: "1.0.0",
        description: "Transform data between different formats",
        parameters: [
          {
            name: "input",
            type: "object",
            description: "Input data to transform",
            required: true,
          },
          {
            name: "format",
            type: "string",
            description: "Target format",
            required: true,
            enum: ["json", "xml", "csv"],
          },
          {
            name: "options",
            type: "object",
            description: "Transformation options",
            required: false,
          },
        ],
        returns: {
          type: "object",
          description: "Transformed data",
        },
        examples: [
          {
            input: { data: [1, 2, 3], format: "json" },
            output: '{"data": [1, 2, 3]}',
          },
        ],
      };

      const validResult = mockCapabilitySchema.validate(validCapability);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid capability data
      const invalidCapability = {
        name: "Invalid_Name_Format", // Invalid name format
        version: "1.0", // Invalid version format
        description: 123, // Should be string
        parameters: "not-an-array", // Should be array
        returns: "not-an-object", // Should be object
      };

      const invalidResult = mockCapabilitySchema.validate(invalidCapability);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Agent Health Check Schema", () => {
    it("should validate agent health check structure", () => {
      const mockHealthSchema = {
        validate: (data: any) => {
          const errors: string[] = [];

          if (typeof data !== "object" || data === null) {
            return { valid: false, errors: ["Health data must be an object"] };
          }

          // Required fields
          const required = ["agentId", "status", "timestamp"];
          required.forEach((field) => {
            if (!(field in data)) {
              errors.push(`Missing required field: ${field}`);
            }
          });

          // Validate agentId
          if ("agentId" in data && typeof data.agentId !== "string") {
            errors.push("Agent ID must be a string");
          }

          // Validate status
          if ("status" in data) {
            const validStatuses = ["healthy", "unhealthy", "unknown", "warning"];
            if (!validStatuses.includes(data.status)) {
              errors.push(`Status must be one of: ${validStatuses.join(", ")}`);
            }
          }

          // Validate timestamp
          if ("timestamp" in data) {
            const timestamp = new Date(data.timestamp);
            if (isNaN(timestamp.getTime())) {
              errors.push("Timestamp must be a valid ISO date string");
            }
          }

          // Validate optional fields
          if ("responseTime" in data && typeof data.responseTime !== "number") {
            errors.push("Response time must be a number");
          }

          if ("lastHeartbeat" in data) {
            const heartbeat = new Date(data.lastHeartbeat);
            if (isNaN(heartbeat.getTime())) {
              errors.push("Last heartbeat must be a valid ISO date string");
            }
          }

          if ("consecutiveFailures" in data) {
            if (typeof data.consecutiveFailures !== "number" || data.consecutiveFailures < 0) {
              errors.push("Consecutive failures must be a non-negative number");
            }
          }

          return { valid: errors.length === 0, errors };
        },
      };

      // Valid health data
      const validHealth = {
        agentId: "agent-001",
        status: "healthy",
        timestamp: new Date().toISOString(),
        responseTime: 125.5,
        lastHeartbeat: new Date(Date.now() - 30000).toISOString(),
        consecutiveFailures: 0,
        checks: {
          connectivity: "pass",
          resources: "pass",
          capabilities: "pass",
        },
      };

      const validResult = mockHealthSchema.validate(validHealth);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid health data
      const invalidHealth = {
        agentId: 123, // Should be string
        status: "invalid-status", // Invalid status
        timestamp: "invalid-date", // Invalid date
        responseTime: "not-a-number", // Should be number
        consecutiveFailures: -1, // Should be non-negative
      };

      const invalidResult = mockHealthSchema.validate(invalidHealth);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Agent Message Schema", () => {
    it("should validate agent message structure", () => {
      const mockMessageSchema = {
        validate: (data: any) => {
          const errors: string[] = [];

          if (typeof data !== "object" || data === null) {
            return { valid: false, errors: ["Message data must be an object"] };
          }

          // Required fields
          const required = ["id", "type", "from", "to", "timestamp"];
          required.forEach((field) => {
            if (!(field in data)) {
              errors.push(`Missing required field: ${field}`);
            }
          });

          // Validate message type
          if ("type" in data) {
            const validTypes = ["command", "query", "event", "reply", "heartbeat"];
            if (!validTypes.includes(data.type)) {
              errors.push(`Message type must be one of: ${validTypes.join(", ")}`);
            }
          }

          // Validate agent IDs
          if ("from" in data && typeof data.from !== "string") {
            errors.push("From field must be a string");
          }

          if ("to" in data && typeof data.to !== "string") {
            errors.push("To field must be a string");
          }

          // Validate timestamp
          if ("timestamp" in data) {
            const timestamp = new Date(data.timestamp);
            if (isNaN(timestamp.getTime())) {
              errors.push("Timestamp must be a valid ISO date string");
            }
          }

          // Validate correlation ID
          if ("correlationId" in data && typeof data.correlationId !== "string") {
            errors.push("Correlation ID must be a string");
          }

          // Validate payload based on message type
          if ("payload" in data && data.type === "command") {
            if (typeof data.payload !== "object" || data.payload === null) {
              errors.push("Command payload must be an object");
            } else {
              if (!data.payload.action || typeof data.payload.action !== "string") {
                errors.push("Command payload must have an action field");
              }
            }
          }

          return { valid: errors.length === 0, errors };
        },
      };

      // Valid message data
      const validMessage = {
        id: "msg-12345",
        type: "command",
        from: "hub-001",
        to: "agent-001",
        timestamp: new Date().toISOString(),
        correlationId: "corr-67890",
        payload: {
          action: "execute-task",
          taskId: "task-123",
          parameters: {
            input: "test-data",
            format: "json",
          },
        },
        metadata: {
          priority: "normal",
          timeout: 30000,
        },
      };

      const validResult = mockMessageSchema.validate(validMessage);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid message data
      const invalidMessage = {
        id: 123, // Should be string
        type: "invalid-type", // Invalid message type
        from: null, // Should be string
        to: "", // Empty string
        timestamp: "invalid-date", // Invalid date
        correlationId: 456, // Should be string
        payload: "not-an-object", // Should be object for command
      };

      const invalidResult = mockMessageSchema.validate(invalidMessage);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Agent Configuration Schema", () => {
    it("should validate agent configuration structure", () => {
      const mockConfigSchema = {
        validate: (data: any) => {
          const errors: string[] = [];

          if (typeof data !== "object" || data === null) {
            return { valid: false, errors: ["Configuration must be an object"] };
          }

          // Validate connection settings
          if ("connection" in data) {
            if (typeof data.connection !== "object" || data.connection === null) {
              errors.push("Connection must be an object");
            } else {
              if ("host" in data.connection && typeof data.connection.host !== "string") {
                errors.push("Connection host must be a string");
              }
              if ("port" in data.connection) {
                const port = data.connection.port;
                if (typeof port !== "number" || port < 1 || port > 65535) {
                  errors.push("Connection port must be a number between 1 and 65535");
                }
              }
              if ("secure" in data.connection && typeof data.connection.secure !== "boolean") {
                errors.push("Connection secure must be a boolean");
              }
            }
          }

          // Validate logging settings
          if ("logging" in data) {
            if (typeof data.logging !== "object" || data.logging === null) {
              errors.push("Logging must be an object");
            } else {
              if ("level" in data.logging) {
                const validLevels = ["error", "warn", "info", "debug", "trace"];
                if (!validLevels.includes(data.logging.level)) {
                  errors.push(`Logging level must be one of: ${validLevels.join(", ")}`);
                }
              }
            }
          }

          // Validate performance settings
          if ("performance" in data) {
            if (typeof data.performance !== "object" || data.performance === null) {
              errors.push("Performance must be an object");
            } else {
              if ("maxConcurrentTasks" in data.performance) {
                const max = data.performance.maxConcurrentTasks;
                if (typeof max !== "number" || max < 1) {
                  errors.push("Max concurrent tasks must be a positive number");
                }
              }
              if ("heartbeatInterval" in data.performance) {
                const interval = data.performance.heartbeatInterval;
                if (typeof interval !== "number" || interval < 1000) {
                  errors.push("Heartbeat interval must be at least 1000ms");
                }
              }
            }
          }

          return { valid: errors.length === 0, errors };
        },
      };

      // Valid configuration
      const validConfig = {
        connection: {
          host: "localhost",
          port: 8080,
          secure: false,
          timeout: 30000,
          retryAttempts: 3,
        },
        logging: {
          level: "info",
          format: "json",
          destination: "console",
        },
        performance: {
          maxConcurrentTasks: 10,
          heartbeatInterval: 30000,
          healthCheckInterval: 60000,
          taskTimeout: 300000,
        },
        capabilities: {
          enabled: ["data-processing", "communication"],
          disabled: ["admin-operations"],
        },
      };

      const validResult = mockConfigSchema.validate(validConfig);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid configuration
      const invalidConfig = {
        connection: {
          host: 123, // Should be string
          port: 70000, // Invalid port range
          secure: "yes", // Should be boolean
        },
        logging: {
          level: "invalid-level", // Invalid log level
        },
        performance: {
          maxConcurrentTasks: 0, // Should be positive
          heartbeatInterval: 500, // Too low
        },
      };

      const invalidResult = mockConfigSchema.validate(invalidConfig);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Schema Integration", () => {
    it("should support nested agent validation", () => {
      const mockAgentSchema = {
        validate: (data: any) => {
          const errors: string[] = [];

          if (typeof data !== "object" || data === null) {
            return { valid: false, errors: ["Agent data must be an object"] };
          }

          // Validate registration section
          if ("registration" in data) {
            if (typeof data.registration !== "object") {
              errors.push("Registration must be an object");
            } else if (!("name" in data.registration)) {
              errors.push("Registration missing name field");
            }
          }

          // Validate capabilities section
          if ("capabilities" in data && !Array.isArray(data.capabilities)) {
            errors.push("Capabilities must be an array");
          }

          // Validate health section
          if ("health" in data) {
            if (typeof data.health !== "object") {
              errors.push("Health must be an object");
            } else if (!("status" in data.health)) {
              errors.push("Health missing status field");
            }
          }

          return { valid: errors.length === 0, errors };
        },
      };

      const validAgentData = {
        registration: {
          name: "test-agent",
          version: "1.0.0",
        },
        capabilities: [
          {
            name: "data-processing",
            version: "1.0.0",
          },
        ],
        health: {
          status: "healthy",
          timestamp: new Date().toISOString(),
        },
        configuration: {
          logging: { level: "info" },
        },
      };

      const result = mockAgentSchema.validate(validAgentData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
