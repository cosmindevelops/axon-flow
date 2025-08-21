/**
 * Tests for type guard utilities
 */

import { describe, expect, it } from "vitest";
import type {
  IAgentCapability,
  IAgentHealth,
  IAgentMetadata,
  IAgentRegistration,
  ICommand,
  IEnhancedError,
  IErrorContext,
  IErrorMessage,
  IEvent,
  ILogContext,
  ILogEntry,
  IMessage,
  IQuery,
  IReply,
  ITaskDefinition,
  ITaskExecution,
  IWorkflowDefinition,
} from "../../src/index.js";
import {
  hasProperty,
  isAgentCapability,
  isAgentHealth,
  isAgentMetadata,
  isAgentRegistration,
  isArray,
  isBoolean,
  isCommand,
  isEmail,
  isEnhancedError,
  isErrorContext,
  isErrorMessage,
  isErrorSeverity,
  isEvent,
  isFunction,
  isISOTimestamp,
  isLogContext,
  isLogEntry,
  isLogLevel,
  isMessage,
  isNull,
  isNullish,
  isNumber,
  isObject,
  isQuery,
  isReply,
  isSemVer,
  isString,
  isTaskDefinition,
  isTaskExecution,
  isTaskStatus,
  isURL,
  isUUID,
  isUndefined,
  isWorkflowDefinition,
} from "../../src/utils/guards.js";

describe("Type Guards", () => {
  describe("Primitive type guards", () => {
    it("should correctly identify strings", () => {
      expect(isString("hello")).toBe(true);
      expect(isString(123)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
    });

    it("should correctly identify numbers", () => {
      expect(isNumber(123)).toBe(true);
      expect(isNumber(0)).toBe(true);
      expect(isNumber(-123.456)).toBe(true);
      expect(isNumber(NaN)).toBe(false);
      expect(isNumber("123")).toBe(false);
    });

    it("should correctly identify booleans", () => {
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean(false)).toBe(true);
      expect(isBoolean(1)).toBe(false);
      expect(isBoolean("true")).toBe(false);
    });

    it("should correctly identify objects", () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ key: "value" })).toBe(true);
      expect(isObject(null)).toBe(false);
      expect(isObject([])).toBe(true); // Arrays are objects
      expect(isObject("object")).toBe(false);
    });

    it("should correctly identify arrays", () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2, 3])).toBe(true);
      expect(isArray({})).toBe(false);
      expect(isArray("array")).toBe(false);
    });

    it("should correctly identify functions", () => {
      expect(isFunction(() => {})).toBe(true);
      expect(isFunction(function () {})).toBe(true);
      expect(isFunction(async () => {})).toBe(true);
      expect(isFunction("function")).toBe(false);
    });

    it("should correctly identify null", () => {
      expect(isNull(null)).toBe(true);
      expect(isNull(undefined)).toBe(false);
      expect(isNull(0)).toBe(false);
      expect(isNull("")).toBe(false);
    });

    it("should correctly identify undefined", () => {
      expect(isUndefined(undefined)).toBe(true);
      expect(isUndefined(null)).toBe(false);
      expect(isUndefined(0)).toBe(false);
      expect(isUndefined("")).toBe(false);
    });

    it("should correctly identify nullish values", () => {
      expect(isNullish(null)).toBe(true);
      expect(isNullish(undefined)).toBe(true);
      expect(isNullish(0)).toBe(false);
      expect(isNullish("")).toBe(false);
      expect(isNullish(false)).toBe(false);
    });
  });

  describe("Agent type guards", () => {
    it("should correctly identify IAgentMetadata", () => {
      const validAgent: IAgentMetadata = {
        id: "agent-1" as any,
        name: "TestAgent",
        version: "1.0.0",
        capabilities: [],
        status: "active",
        registeredAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
        metadata: {},
      };

      expect(isAgentMetadata(validAgent)).toBe(true);
      expect(isAgentMetadata({})).toBe(false);
      expect(isAgentMetadata({ id: "test" })).toBe(false);
    });

    it("should correctly identify IAgentCapability", () => {
      const validCapability: IAgentCapability = {
        name: "processData",
        version: "1.0.0",
        description: "Processes data",
        parameters: [],
        returns: { type: "string", description: "" },
      };

      expect(isAgentCapability(validCapability)).toBe(true);
      expect(isAgentCapability({})).toBe(false);
    });

    it("should correctly identify IAgentRegistration", () => {
      const validRegistration: IAgentRegistration = {
        name: "TestAgent",
        version: "1.0.0",
        capabilities: [],
        // no endpoint field in type
      };

      expect(isAgentRegistration(validRegistration)).toBe(true);
      expect(isAgentRegistration({})).toBe(false);
    });

    it("should correctly identify IAgentHealth", () => {
      const validHealth: IAgentHealth = {
        agentId: "agent-1" as any,
        status: "active" as any,
        lastHeartbeat: new Date().toISOString(),
      };

      expect(isAgentHealth(validHealth)).toBe(true);
      expect(isAgentHealth({})).toBe(false);
    });
  });

  describe("Task type guards", () => {
    it("should correctly identify ITaskDefinition", () => {
      const validTask: ITaskDefinition = {
        id: "task-1" as any,
        name: "TestTask",
        description: "Test task",
        agentId: "agent-1" as any,
        capability: "processData",
        parameters: {},
        dependencies: [],
        timeout: 30000,
        priority: "normal",
        retryPolicy: { retries: 3, backoffMultiplier: 2 } as any,
      };

      expect(isTaskDefinition(validTask)).toBe(true);
      expect(isTaskDefinition({})).toBe(false);
    });

    it("should correctly identify ITaskExecution", () => {
      const validExecution: ITaskExecution = {
        task: {} as ITaskDefinition,
        status: "pending",
        correlationId: "corr-1" as any,
        retryCount: 0,
      };

      expect(isTaskExecution(validExecution)).toBe(true);
      expect(isTaskExecution({})).toBe(false);
    });

    it("should correctly identify IWorkflowDefinition", () => {
      const validWorkflow: IWorkflowDefinition = {
        id: "workflow-1" as any,
        name: "TestWorkflow",
        version: "1.0.0",
        description: "Test workflow",
        tasks: [],
        timeout: 60000,
        useSaga: false,
      };

      expect(isWorkflowDefinition(validWorkflow)).toBe(true);
      expect(isWorkflowDefinition({})).toBe(false);
    });

    it("should correctly identify TaskStatus", () => {
      expect(isTaskStatus("pending")).toBe(true);
      expect(isTaskStatus("executing")).toBe(true);
      expect(isTaskStatus("completed")).toBe(true);
      expect(isTaskStatus("invalid")).toBe(false);
    });
  });

  describe("Message type guards", () => {
    const baseMessage: IMessage = {
      id: "msg-1" as any,
      correlationId: "corr-1" as any,
      type: "command",
      payload: {},
      metadata: { source: "test", version: "1" } as any,
      timestamp: new Date().toISOString() as any,
    };

    it("should correctly identify IMessage", () => {
      expect(isMessage(baseMessage)).toBe(true);
      expect(isMessage({})).toBe(false);
    });

    it("should correctly identify ICommand", () => {
      const command: ICommand = {
        ...baseMessage,
        type: "command",
        commandName: "TestCommand",
        expectsReply: true,
      };

      expect(isCommand(command)).toBe(true);
      expect(isCommand(baseMessage)).toBe(false);
    });

    it("should correctly identify IQuery", () => {
      const query: IQuery = {
        ...baseMessage,
        type: "query",
        queryName: "TestQuery",
        resultType: "string",
      };

      expect(isQuery(query)).toBe(true);
      expect(isQuery(baseMessage)).toBe(false);
    });

    it("should correctly identify IEvent", () => {
      const event: IEvent = {
        ...baseMessage,
        type: "event",
        eventName: "TestEvent",
      };

      expect(isEvent(event)).toBe(true);
      expect(isEvent(baseMessage)).toBe(false);
    });

    it("should correctly identify IReply", () => {
      const reply: IReply = {
        ...baseMessage,
        type: "reply",
        requestId: "req-1" as any,
        success: true,
      };

      expect(isReply(reply)).toBe(true);
      expect(isReply(baseMessage)).toBe(false);
    });

    it("should correctly identify IErrorMessage", () => {
      const errorMsg: IErrorMessage = {
        ...baseMessage,
        type: "error",
        severity: "error",
        payload: { code: "E_TEST", message: "Test error" },
      };

      expect(isErrorMessage(errorMsg)).toBe(true);
      expect(isErrorMessage(baseMessage)).toBe(false);
    });
  });

  describe("Logging type guards", () => {
    it("should correctly identify ILogEntry", () => {
      const validLog: ILogEntry = {
        timestamp: new Date().toISOString() as any,
        level: "info",
        message: "Test log",
        context: { service: "test" },
      };

      expect(isLogEntry(validLog)).toBe(true);
      expect(isLogEntry({})).toBe(false);
    });

    it("should correctly identify ILogContext", () => {
      const validContext: ILogContext = {
        service: "test-service",
      };

      expect(isLogContext(validContext)).toBe(true);
      expect(isLogContext({})).toBe(false);
    });

    it("should correctly identify LogLevel", () => {
      expect(isLogLevel("trace")).toBe(true);
      expect(isLogLevel("debug")).toBe(true);
      expect(isLogLevel("info")).toBe(true);
      expect(isLogLevel("warn")).toBe(true);
      expect(isLogLevel("error")).toBe(true);
      expect(isLogLevel("fatal")).toBe(true);
      expect(isLogLevel("invalid")).toBe(false);
    });
  });

  describe("Error type guards", () => {
    it("should correctly identify IEnhancedError", () => {
      const validError: IEnhancedError = {
        name: "TestError",
        message: "Test error message",
        code: "TEST_ERROR",
        context: { timestamp: new Date().toISOString() as any, component: "test" },
        severity: "medium",
        category: "system",
        recoverable: true,
        retryable: false,
      };

      expect(isEnhancedError(validError)).toBe(true);
      expect(isEnhancedError({})).toBe(false);
    });

    it("should correctly identify IErrorContext", () => {
      const validContext: IErrorContext = {
        timestamp: new Date().toISOString() as any,
        component: "test-component",
      };

      expect(isErrorContext(validContext)).toBe(true);
      expect(isErrorContext({})).toBe(false);
    });

    it("should correctly identify ErrorSeverity", () => {
      expect(isErrorSeverity("low")).toBe(true);
      expect(isErrorSeverity("medium")).toBe(true);
      expect(isErrorSeverity("high")).toBe(true);
      expect(isErrorSeverity("critical")).toBe(true);
      expect(isErrorSeverity("invalid")).toBe(false);
    });
  });

  describe("Utility type guards", () => {
    it("should correctly check hasProperty", () => {
      const obj = { key: "value", nested: { prop: true } };

      expect(hasProperty(obj, "key")).toBe(true);
      expect(hasProperty(obj, "nested")).toBe(true);
      expect(hasProperty(obj, "missing")).toBe(false);
      expect(hasProperty(null, "key")).toBe(false);
    });

    it("should correctly identify UUIDs", () => {
      expect(isUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
      expect(isUUID("invalid-uuid")).toBe(false);
      expect(isUUID("550e8400-e29b-41d4-a716")).toBe(false);
    });

    it("should correctly identify emails", () => {
      expect(isEmail("test@example.com")).toBe(true);
      expect(isEmail("user.name+tag@domain.co.uk")).toBe(true);
      expect(isEmail("invalid-email")).toBe(false);
      expect(isEmail("@example.com")).toBe(false);
    });

    it("should correctly identify URLs", () => {
      expect(isURL("https://example.com")).toBe(true);
      expect(isURL("http://localhost:3000/path")).toBe(true);
      expect(isURL("ftp://files.example.com")).toBe(true);
      expect(isURL("invalid-url")).toBe(false);
      expect(isURL("example.com")).toBe(false);
    });

    it("should correctly identify ISO timestamps", () => {
      const now = new Date();
      expect(isISOTimestamp(now.toISOString())).toBe(true);
      expect(isISOTimestamp("2024-01-01T00:00:00.000Z")).toBe(true);
      expect(isISOTimestamp("2024-01-01")).toBe(false);
      expect(isISOTimestamp("invalid-date")).toBe(false);
    });

    it("should correctly identify semantic versions", () => {
      expect(isSemVer("1.0.0")).toBe(true);
      expect(isSemVer("2.1.3-alpha.1")).toBe(true);
      expect(isSemVer("0.0.1-beta+build.123")).toBe(true);
      expect(isSemVer("1.0")).toBe(false);
      expect(isSemVer("v1.0.0")).toBe(false);
    });
  });
});
