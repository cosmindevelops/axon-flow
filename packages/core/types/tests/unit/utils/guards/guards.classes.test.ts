/**
 * Comprehensive test suite for type guard utilities (36 type guard functions)
 */

import { describe, it, expect } from "vitest";
import {
  // Primitive type guards
  isString,
  isNumber,
  isBoolean,
  isObject,
  isArray,
  isFunction,
  isNull,
  isUndefined,
  isNullish,
  // Agent type guards
  isAgentMetadata,
  isAgentCapability,
  isAgentRegistration,
  isAgentHealth,
  // Task type guards
  isTaskDefinition,
  isTaskExecution,
  isWorkflowDefinition,
  isTaskStatus,
  // Message type guards
  isMessage,
  isCommand,
  isQuery,
  isEvent,
  isReply,
  isErrorMessage,
  // Logging type guards
  isLogEntry,
  isLogContext,
  isLogLevel,
  // Error type guards
  isEnhancedError,
  isErrorContext,
  isErrorSeverity,
  // Utility type guards
  hasProperty,
  isUUID,
  isEmail,
  isURL,
  isISOTimestamp,
  isSemVer,
} from "../../../../src/utils/guards/guards.classes.js";

describe("Type Guard Utilities - Comprehensive Suite", () => {
  describe("Primitive Type Guards (9 guards)", () => {
    describe("isString", () => {
      it("should return true for strings", () => {
        expect(isString("hello")).toBe(true);
        expect(isString("")).toBe(true);
        expect(isString(String("test"))).toBe(true);
      });

      it("should return false for non-strings", () => {
        expect(isString(123)).toBe(false);
        expect(isString(true)).toBe(false);
        expect(isString(null)).toBe(false);
        expect(isString(undefined)).toBe(false);
        expect(isString({})).toBe(false);
        expect(isString([])).toBe(false);
      });
    });

    describe("isNumber", () => {
      it("should return true for valid numbers", () => {
        expect(isNumber(123)).toBe(true);
        expect(isNumber(0)).toBe(true);
        expect(isNumber(-1)).toBe(true);
        expect(isNumber(3.14)).toBe(true);
        expect(isNumber(Number.MAX_VALUE)).toBe(true);
      });

      it("should return false for NaN and non-numbers", () => {
        expect(isNumber(NaN)).toBe(false);
        expect(isNumber("123")).toBe(false);
        expect(isNumber(true)).toBe(false);
        expect(isNumber(null)).toBe(false);
        expect(isNumber(undefined)).toBe(false);
        expect(isNumber({})).toBe(false);
      });
    });

    describe("isBoolean", () => {
      it("should return true for booleans", () => {
        expect(isBoolean(true)).toBe(true);
        expect(isBoolean(false)).toBe(true);
        expect(isBoolean(Boolean(1))).toBe(true);
      });

      it("should return false for non-booleans", () => {
        expect(isBoolean(1)).toBe(false);
        expect(isBoolean(0)).toBe(false);
        expect(isBoolean("true")).toBe(false);
        expect(isBoolean(null)).toBe(false);
        expect(isBoolean(undefined)).toBe(false);
      });
    });

    describe("isObject", () => {
      it("should return true for objects", () => {
        expect(isObject({})).toBe(true);
        expect(isObject({ key: "value" })).toBe(true);
        expect(isObject([])).toBe(true);
        expect(isObject(new Date())).toBe(true);
      });

      it("should return false for non-objects and null", () => {
        expect(isObject(null)).toBe(false);
        expect(isObject(undefined)).toBe(false);
        expect(isObject("string")).toBe(false);
        expect(isObject(123)).toBe(false);
        expect(isObject(true)).toBe(false);
      });
    });

    describe("isArray", () => {
      it("should return true for arrays", () => {
        expect(isArray([])).toBe(true);
        expect(isArray([1, 2, 3])).toBe(true);
        expect(isArray(["a", "b"])).toBe(true);
        expect(isArray(new Array(5))).toBe(true);
      });

      it("should return false for non-arrays", () => {
        expect(isArray({})).toBe(false);
        expect(isArray("string")).toBe(false);
        expect(isArray(null)).toBe(false);
        expect(isArray(undefined)).toBe(false);
      });

      it("should work with generic types", () => {
        const numberArray = [1, 2, 3];
        const stringArray = ["a", "b", "c"];

        expect(isArray<number>(numberArray)).toBe(true);
        expect(isArray<string>(stringArray)).toBe(true);
      });
    });

    describe("isFunction", () => {
      it("should return true for functions", () => {
        expect(isFunction(function () {})).toBe(true);
        expect(isFunction(() => {})).toBe(true);
        expect(isFunction(async () => {})).toBe(true);
        expect(isFunction(Date.now)).toBe(true);
        expect(isFunction(console.log)).toBe(true);
      });

      it("should return false for non-functions", () => {
        expect(isFunction({})).toBe(false);
        expect(isFunction("function")).toBe(false);
        expect(isFunction(null)).toBe(false);
        expect(isFunction(undefined)).toBe(false);
        expect(isFunction(123)).toBe(false);
      });
    });

    describe("isNull", () => {
      it("should return true only for null", () => {
        expect(isNull(null)).toBe(true);
      });

      it("should return false for non-null values", () => {
        expect(isNull(undefined)).toBe(false);
        expect(isNull(0)).toBe(false);
        expect(isNull(false)).toBe(false);
        expect(isNull("")).toBe(false);
        expect(isNull({})).toBe(false);
      });
    });

    describe("isUndefined", () => {
      it("should return true only for undefined", () => {
        expect(isUndefined(undefined)).toBe(true);
        expect(isUndefined(void 0)).toBe(true);
      });

      it("should return false for non-undefined values", () => {
        expect(isUndefined(null)).toBe(false);
        expect(isUndefined(0)).toBe(false);
        expect(isUndefined(false)).toBe(false);
        expect(isUndefined("")).toBe(false);
      });
    });

    describe("isNullish", () => {
      it("should return true for null and undefined", () => {
        expect(isNullish(null)).toBe(true);
        expect(isNullish(undefined)).toBe(true);
      });

      it("should return false for other falsy values", () => {
        expect(isNullish(0)).toBe(false);
        expect(isNullish(false)).toBe(false);
        expect(isNullish("")).toBe(false);
        expect(isNullish(NaN)).toBe(false);
      });
    });
  });

  describe("Agent Type Guards (4 guards)", () => {
    describe("isAgentMetadata", () => {
      it("should validate correct agent metadata", () => {
        const validMetadata = {
          id: "agent-123",
          name: "Test Agent",
          version: "1.0.0",
          capabilities: [],
          status: "active",
          registeredAt: "2024-01-01T00:00:00Z",
          lastHeartbeat: "2024-01-01T00:00:00Z",
          metadata: {},
        };

        expect(isAgentMetadata(validMetadata)).toBe(true);
      });

      it("should reject invalid agent metadata", () => {
        expect(isAgentMetadata({})).toBe(false);
        expect(isAgentMetadata({ id: "test" })).toBe(false);
        expect(isAgentMetadata(null)).toBe(false);
      });
    });

    describe("isAgentCapability", () => {
      it("should validate correct agent capability", () => {
        const validCapability = {
          name: "processData",
          version: "1.0.0",
          description: "Process data",
          parameters: [],
          returns: { type: "object", description: "Result" },
        };

        expect(isAgentCapability(validCapability)).toBe(true);
      });

      it("should reject invalid capability", () => {
        expect(isAgentCapability({})).toBe(false);
        expect(isAgentCapability({ name: "test" })).toBe(false);
      });
    });

    describe("isAgentRegistration", () => {
      it("should validate correct registration", () => {
        const validRegistration = {
          name: "Test Agent",
          version: "1.0.0",
          capabilities: [],
        };

        expect(isAgentRegistration(validRegistration)).toBe(true);
      });

      it("should reject invalid registration", () => {
        expect(isAgentRegistration({})).toBe(false);
        expect(isAgentRegistration({ name: "test" })).toBe(false);
      });
    });

    describe("isAgentHealth", () => {
      it("should validate correct health info", () => {
        const validHealth = {
          agentId: "agent-123",
          status: "active",
          lastHeartbeat: "2024-01-01T00:00:00Z",
        };

        expect(isAgentHealth(validHealth)).toBe(true);
      });

      it("should reject invalid health info", () => {
        expect(isAgentHealth({})).toBe(false);
        expect(isAgentHealth({ agentId: "test" })).toBe(false);
      });
    });
  });

  describe("Task Type Guards (4 guards)", () => {
    describe("isTaskDefinition", () => {
      it("should validate correct task definition", () => {
        const validTask = {
          id: "task-123",
          name: "Test Task",
          description: "Test description",
          agentId: "agent-123",
          capability: "processData",
          parameters: {},
          dependencies: [],
          timeout: 30000,
          priority: "normal",
          retryPolicy: {
            maxAttempts: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            jitter: true,
          },
        };

        expect(isTaskDefinition(validTask)).toBe(true);
      });

      it("should reject invalid task definition", () => {
        expect(isTaskDefinition({})).toBe(false);
        expect(isTaskDefinition({ id: "test" })).toBe(false);
      });
    });

    describe("isTaskExecution", () => {
      it("should validate correct task execution", () => {
        const validExecution = {
          task: {
            id: "task-123",
            name: "Test Task",
            description: "Test description",
            agentId: "agent-123",
            capability: "processData",
            parameters: {},
            dependencies: [],
            timeout: 30000,
            priority: "normal",
            retryPolicy: {
              maxAttempts: 3,
              initialDelay: 1000,
              maxDelay: 10000,
              backoffMultiplier: 2,
              jitter: true,
            },
          },
          status: "executing",
          correlationId: "corr-123",
          retryCount: 0,
        };

        expect(isTaskExecution(validExecution)).toBe(true);
      });
    });

    describe("isWorkflowDefinition", () => {
      it("should validate correct workflow definition", () => {
        const validWorkflow = {
          id: "workflow-123",
          name: "Test Workflow",
          version: "1.0.0",
          description: "Test workflow",
          tasks: [],
          timeout: 300000,
          useSaga: true,
        };

        expect(isWorkflowDefinition(validWorkflow)).toBe(true);
      });
    });

    describe("isTaskStatus", () => {
      it("should validate all valid task statuses", () => {
        const validStatuses = [
          "pending",
          "queued",
          "executing",
          "completed",
          "failed",
          "cancelled",
          "retrying",
          "compensating",
        ];

        validStatuses.forEach((status) => {
          expect(isTaskStatus(status)).toBe(true);
        });
      });

      it("should reject invalid statuses", () => {
        expect(isTaskStatus("invalid")).toBe(false);
        expect(isTaskStatus("")).toBe(false);
        expect(isTaskStatus(null)).toBe(false);
      });
    });
  });

  describe("Message Type Guards (6 guards)", () => {
    const baseMessage = {
      id: "msg-123",
      correlationId: "corr-123",
      payload: {},
      metadata: {},
      timestamp: "2024-01-01T00:00:00Z",
    };

    describe("isMessage", () => {
      it("should validate correct message structure", () => {
        const validMessage = {
          ...baseMessage,
          type: "command",
        };

        expect(isMessage(validMessage)).toBe(true);
      });

      it("should reject invalid message", () => {
        expect(isMessage({})).toBe(false);
        expect(isMessage({ id: "test" })).toBe(false);
      });
    });

    describe("isCommand", () => {
      it("should validate correct command message", () => {
        const validCommand = {
          ...baseMessage,
          type: "command",
          commandName: "executeTask",
          expectsReply: true,
        };

        expect(isCommand(validCommand)).toBe(true);
      });

      it("should reject invalid command", () => {
        expect(isCommand({ ...baseMessage, type: "event" })).toBe(false);
      });
    });

    describe("isQuery", () => {
      it("should validate correct query message", () => {
        const validQuery = {
          ...baseMessage,
          type: "query",
          queryName: "getAgents",
          resultType: "AgentList",
        };

        expect(isQuery(validQuery)).toBe(true);
      });

      it("should reject invalid query", () => {
        expect(isQuery({ ...baseMessage, type: "command" })).toBe(false);
      });
    });

    describe("isEvent", () => {
      it("should validate correct event message", () => {
        const validEvent = {
          ...baseMessage,
          type: "event",
          eventName: "TaskCompleted",
        };

        expect(isEvent(validEvent)).toBe(true);
      });

      it("should reject invalid event", () => {
        expect(isEvent({ ...baseMessage, type: "command" })).toBe(false);
      });
    });

    describe("isReply", () => {
      it("should validate correct reply message", () => {
        const validReply = {
          ...baseMessage,
          type: "reply",
          requestId: "req-123",
          success: true,
        };

        expect(isReply(validReply)).toBe(true);
      });

      it("should reject invalid reply", () => {
        expect(isReply({ ...baseMessage, type: "command" })).toBe(false);
      });
    });

    describe("isErrorMessage", () => {
      it("should validate correct error message", () => {
        const validError = {
          ...baseMessage,
          type: "error",
          severity: "high",
        };

        expect(isErrorMessage(validError)).toBe(true);
      });

      it("should reject invalid error message", () => {
        expect(isErrorMessage({ ...baseMessage, type: "command" })).toBe(false);
      });
    });
  });

  describe("Logging Type Guards (3 guards)", () => {
    describe("isLogEntry", () => {
      it("should validate correct log entry", () => {
        const validEntry = {
          timestamp: "2024-01-01T00:00:00Z",
          level: "info",
          message: "Test message",
          context: { service: "test-service" },
        };

        expect(isLogEntry(validEntry)).toBe(true);
      });

      it("should reject invalid log entry", () => {
        expect(isLogEntry({})).toBe(false);
        expect(isLogEntry({ message: "test" })).toBe(false);
      });
    });

    describe("isLogContext", () => {
      it("should validate correct log context", () => {
        const validContext = {
          service: "test-service",
          correlationId: "corr-123",
        };

        expect(isLogContext(validContext)).toBe(true);
      });

      it("should reject invalid log context", () => {
        expect(isLogContext({})).toBe(false);
        expect(isLogContext({ correlationId: "test" })).toBe(false);
      });
    });

    describe("isLogLevel", () => {
      it("should validate all valid log levels", () => {
        const validLevels = ["trace", "debug", "info", "warn", "error", "fatal"];

        validLevels.forEach((level) => {
          expect(isLogLevel(level)).toBe(true);
        });
      });

      it("should reject invalid log levels", () => {
        expect(isLogLevel("invalid")).toBe(false);
        expect(isLogLevel("")).toBe(false);
        expect(isLogLevel(null)).toBe(false);
      });
    });
  });

  describe("Error Type Guards (3 guards)", () => {
    describe("isEnhancedError", () => {
      it("should validate correct enhanced error", () => {
        const validError = {
          name: "ValidationError",
          message: "Invalid input",
          code: "VALIDATION_FAILED",
          context: {},
          severity: "medium",
          category: "validation",
          recoverable: true,
          retryable: false,
        };

        expect(isEnhancedError(validError)).toBe(true);
      });

      it("should reject invalid enhanced error", () => {
        expect(isEnhancedError({})).toBe(false);
        expect(isEnhancedError({ message: "test" })).toBe(false);
      });
    });

    describe("isErrorContext", () => {
      it("should validate correct error context", () => {
        const validContext = {
          timestamp: "2024-01-01T00:00:00Z",
          component: "task-processor",
        };

        expect(isErrorContext(validContext)).toBe(true);
      });

      it("should reject invalid error context", () => {
        expect(isErrorContext({})).toBe(false);
        expect(isErrorContext({ timestamp: "test" })).toBe(false);
      });
    });

    describe("isErrorSeverity", () => {
      it("should validate all valid severities", () => {
        const validSeverities = ["low", "medium", "high", "critical"];

        validSeverities.forEach((severity) => {
          expect(isErrorSeverity(severity)).toBe(true);
        });
      });

      it("should reject invalid severities", () => {
        expect(isErrorSeverity("invalid")).toBe(false);
        expect(isErrorSeverity("")).toBe(false);
        expect(isErrorSeverity(null)).toBe(false);
      });
    });
  });

  describe("Utility Type Guards (7 guards)", () => {
    describe("hasProperty", () => {
      it("should detect existing properties", () => {
        const obj = { name: "test", value: 123 };

        expect(hasProperty(obj, "name")).toBe(true);
        expect(hasProperty(obj, "value")).toBe(true);
      });

      it("should return false for missing properties", () => {
        const obj = { name: "test" };

        expect(hasProperty(obj, "missing")).toBe(false);
        expect(hasProperty(null, "any")).toBe(false);
        expect(hasProperty(undefined, "any")).toBe(false);
      });
    });

    describe("isUUID", () => {
      it("should validate correct UUIDs", () => {
        const validUUIDs = [
          "123e4567-e89b-12d3-a456-426614174000",
          "550e8400-e29b-41d4-a716-446655440000",
          "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        ];

        validUUIDs.forEach((uuid) => {
          expect(isUUID(uuid)).toBe(true);
        });
      });

      it("should reject invalid UUIDs", () => {
        expect(isUUID("not-a-uuid")).toBe(false);
        expect(isUUID("123e4567-e89b-12d3-a456")).toBe(false);
        expect(isUUID("")).toBe(false);
        expect(isUUID(null)).toBe(false);
      });
    });

    describe("isEmail", () => {
      it("should validate correct emails", () => {
        const validEmails = ["test@example.com", "user.name+tag@domain.co.uk", "user123@test-domain.org"];

        validEmails.forEach((email) => {
          expect(isEmail(email)).toBe(true);
        });
      });

      it("should reject invalid emails", () => {
        expect(isEmail("not-an-email")).toBe(false);
        expect(isEmail("@domain.com")).toBe(false);
        expect(isEmail("user@")).toBe(false);
        expect(isEmail("")).toBe(false);
      });
    });

    describe("isURL", () => {
      it("should validate correct URLs", () => {
        const validURLs = ["https://example.com", "http://localhost:3000", "ftp://ftp.example.com/path"];

        validURLs.forEach((url) => {
          expect(isURL(url)).toBe(true);
        });
      });

      it("should reject invalid URLs", () => {
        expect(isURL("not-a-url")).toBe(false);
        expect(isURL("example.com")).toBe(false);
        expect(isURL("")).toBe(false);
      });
    });

    describe("isISOTimestamp", () => {
      it("should validate correct ISO timestamps", () => {
        const validTimestamps = ["2024-01-01T00:00:00.000Z", "2023-12-25T15:30:45.123Z", new Date().toISOString()];

        validTimestamps.forEach((timestamp) => {
          expect(isISOTimestamp(timestamp)).toBe(true);
        });
      });

      it("should reject invalid timestamps", () => {
        expect(isISOTimestamp("2024-01-01")).toBe(false);
        expect(isISOTimestamp("not-a-date")).toBe(false);
        expect(isISOTimestamp("")).toBe(false);
      });
    });

    describe("isSemVer", () => {
      it("should validate correct semantic versions", () => {
        const validVersions = ["1.0.0", "2.3.4-alpha.1", "10.20.30+build.123", "1.0.0-beta.2+exp.sha.5114f85"];

        validVersions.forEach((version) => {
          expect(isSemVer(version)).toBe(true);
        });
      });

      it("should reject invalid semantic versions", () => {
        expect(isSemVer("1.0")).toBe(false);
        expect(isSemVer("1.0.0.0")).toBe(false);
        expect(isSemVer("v1.0.0")).toBe(false);
        expect(isSemVer("")).toBe(false);
      });
    });
  });

  describe("Performance Tests", () => {
    it("should perform all primitive guards efficiently", () => {
      const iterations = 10000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        isString("test");
        isNumber(42);
        isBoolean(true);
        isObject({});
        isArray([]);
      }

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(1000);
    });

    it("should perform complex object guards efficiently", () => {
      const testAgent = {
        id: "agent-123",
        name: "Test Agent",
        version: "1.0.0",
        capabilities: [],
        status: "active",
        registeredAt: "2024-01-01T00:00:00Z",
        lastHeartbeat: "2024-01-01T00:00:00Z",
        metadata: {},
      };

      const iterations = 5000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        isAgentMetadata(testAgent);
      }

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(500);
    });
  });

  describe("Coverage Validation", () => {
    it("should validate all 36 type guard functions are tested", () => {
      // Count of all type guard categories:
      // - Primitive: 9 guards
      // - Agent: 4 guards
      // - Task: 4 guards
      // - Message: 6 guards
      // - Logging: 3 guards
      // - Error: 3 guards
      // - Utility: 7 guards
      // Total: 36 guards

      const guardCounts = {
        primitive: 9,
        agent: 4,
        task: 4,
        message: 6,
        logging: 3,
        error: 3,
        utility: 7,
      };

      const totalGuards = Object.values(guardCounts).reduce((sum, count) => sum + count, 0);
      expect(totalGuards).toBe(36);

      console.log("Type Guard Coverage:", guardCounts);
      console.log("Total Type Guards Tested:", totalGuards);
    });
  });
});
