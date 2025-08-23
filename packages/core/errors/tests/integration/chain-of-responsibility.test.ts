/**
 * Integration tests for chain of responsibility error handling
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { BaseAxonError } from "../../src/base/base-error.classes.js";
import { ErrorCategory, ErrorSeverity } from "../../src/base/base-error.types.js";
import {
  ContextEnrichmentHandler,
  ErrorHandlerChain,
  LoggingHandler,
  SanitizationHandler,
  StackTraceHandler,
} from "../../src/chain/chain.classes.js";
import { HandlerPriority } from "../../src/chain/chain.types.js";

describe("Error Handler Chain Integration", () => {
  let chain: ErrorHandlerChain;

  beforeEach(() => {
    chain = new ErrorHandlerChain({
      sortByPriority: true,
      stopOnFirstHandle: false,
    });
  });

  describe("Context enrichment flow", () => {
    it("should enrich errors with correlation ID and metadata", async () => {
      const enrichmentHandler = new ContextEnrichmentHandler({
        addCorrelationId: true,
        addTimestamp: true,
        addComponent: "TestComponent",
        addOperation: "testOperation",
        customMetadata: {
          userId: "user123",
          requestId: "req456",
        },
      });

      chain.addHandler(enrichmentHandler);

      const originalError = new BaseAxonError("Test error", "TEST_CODE");
      let enrichedError: any;

      // Intercept the handler to capture the enriched error
      const originalHandle = enrichmentHandler.handle.bind(enrichmentHandler);
      enrichmentHandler.handle = async (error) => {
        const result = await originalHandle(error);
        enrichedError = result.modifiedError;
        return result;
      };

      await chain.process(originalError);

      expect(enrichedError).toBeDefined();
      expect(enrichedError.context.correlationId).toBeDefined();
      expect(enrichedError.context.component).toBe("TestComponent");
      expect(enrichedError.context.operation).toBe("testOperation");
      expect(enrichedError.context.metadata).toEqual({
        userId: "user123",
        requestId: "req456",
      });
    });

    it("should use custom correlation ID generator", async () => {
      const enrichmentHandler = new ContextEnrichmentHandler({
        addCorrelationId: true,
      });

      const customId = "custom-correlation-123";
      enrichmentHandler.setCorrelationIdGenerator(() => customId);

      chain.addHandler(enrichmentHandler);

      let enrichedError: any;
      const originalHandle = enrichmentHandler.handle.bind(enrichmentHandler);
      enrichmentHandler.handle = async (error) => {
        const result = await originalHandle(error);
        enrichedError = result.modifiedError;
        return result;
      };

      await chain.process(new BaseAxonError("Test"));

      expect(enrichedError.context.correlationId).toBe(customId);
    });
  });

  describe("Stack trace processing", () => {
    it("should clean and limit stack traces", async () => {
      const stackHandler = new StackTraceHandler({
        maxDepth: 5,
        cleanPaths: true,
        filterPatterns: [/node_modules\/vitest/],
      });

      chain.addHandler(stackHandler);

      const error = new BaseAxonError("Stack test");
      let processedError: any;

      const originalHandle = stackHandler.handle.bind(stackHandler);
      stackHandler.handle = async (err) => {
        const result = await originalHandle(err);
        processedError = result.modifiedError;
        return result;
      };

      await chain.process(error);

      expect(processedError).toBeDefined();
      expect(processedError.context.stackTrace).toBeDefined();

      const stackLines = processedError.context.stackTrace.split("\n");
      expect(stackLines.length).toBeLessThanOrEqual(6); // maxDepth + 1 for message
      expect(processedError.context.stackTrace).not.toContain("/node_modules/vitest");
    });
  });

  describe("Sanitization flow", () => {
    it("should redact sensitive information", async () => {
      const sanitizer = new SanitizationHandler({
        sensitiveKeys: ["apiKey", "authToken"],
        redactValue: "[REDACTED]",
        deepScan: true,
      });

      chain.addHandler(sanitizer);

      const error = new BaseAxonError("Error with password=secret123 and apiKey=abc123", "SENSITIVE_ERROR", {
        metadata: {
          apiKey: "sensitive-key",
          authToken: "bearer-token",
          safeData: "visible",
          nested: {
            password: "nested-secret",
          },
        },
      });

      let sanitizedError: any;
      const originalHandle = sanitizer.handle.bind(sanitizer);
      sanitizer.handle = async (err) => {
        const result = await originalHandle(err);
        sanitizedError = result.modifiedError;
        return result;
      };

      await chain.process(error);

      expect(sanitizedError.message).toContain("[REDACTED]");
      expect(sanitizedError.message).not.toContain("secret123");
      expect(sanitizedError.message).not.toContain("abc123");
      expect(sanitizedError.context.metadata.apiKey).toBe("[REDACTED]");
      expect(sanitizedError.context.metadata.authToken).toBe("[REDACTED]");
      expect(sanitizedError.context.metadata.safeData).toBe("visible");
      expect(sanitizedError.context.metadata.nested.password).toBe("[REDACTED]");
    });

    it("should preserve length when configured", async () => {
      const sanitizer = new SanitizationHandler({
        sensitiveKeys: ["secret"],
        redactValue: "*",
        preserveLength: true,
      });

      chain.addHandler(sanitizer);

      const error = new BaseAxonError("Test", "CODE", {
        metadata: {
          secret: "12345678",
        },
      });

      let sanitizedError: any;
      const originalHandle = sanitizer.handle.bind(sanitizer);
      sanitizer.handle = async (err) => {
        const result = await originalHandle(err);
        sanitizedError = result.modifiedError;
        return result;
      };

      await chain.process(error);

      expect(sanitizedError.context.metadata.secret).toBe("********");
    });
  });

  describe("Logging integration", () => {
    it("should log errors based on severity", async () => {
      const mockLogger = {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
      };

      const loggingHandler = new LoggingHandler({
        logLevel: "error",
        includeStack: true,
        includeContext: true,
        logger: mockLogger,
      });

      chain.addHandler(loggingHandler);

      const criticalError = new BaseAxonError("Critical failure", "CRITICAL", {
        severity: ErrorSeverity.CRITICAL,
        category: ErrorCategory.SYSTEM,
      });

      await chain.process(criticalError);

      expect(mockLogger.error).toHaveBeenCalled();
      const [message, context] = mockLogger.error.mock.calls[0];
      expect(message).toContain("Critical failure");
      expect(context.code).toBe("CRITICAL");
      expect(context.severity).toBe(ErrorSeverity.CRITICAL);
      expect(context.context).toBeDefined();
      expect(context.stack).toBeDefined();
    });

    it("should use appropriate log level for severity", async () => {
      const mockLogger = {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
      };

      const loggingHandler = new LoggingHandler({
        logger: mockLogger,
      });

      chain.addHandler(loggingHandler);

      const warningError = new BaseAxonError("Warning", "WARN", {
        severity: ErrorSeverity.WARNING,
      });

      const infoError = new BaseAxonError("Info", "INFO", {
        severity: ErrorSeverity.INFO,
      });

      await chain.process(warningError);
      await chain.process(infoError);

      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledTimes(1);
    });
  });

  describe("Complete pipeline", () => {
    it("should process error through complete handler chain", async () => {
      const mockLogger = {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
      };

      // Add handlers in priority order
      const enrichmentHandler = new ContextEnrichmentHandler(
        {
          addCorrelationId: true,
          addComponent: "Pipeline",
        },
        HandlerPriority.CRITICAL,
      );

      const sanitizer = new SanitizationHandler(
        {
          sensitiveKeys: ["password"],
        },
        HandlerPriority.HIGH,
      );

      const stackHandler = new StackTraceHandler(
        {
          maxDepth: 10,
        },
        HandlerPriority.MEDIUM,
      );

      const logger = new LoggingHandler(
        {
          logger: mockLogger,
        },
        HandlerPriority.LOW,
      );

      chain.addHandler(enrichmentHandler).addHandler(sanitizer).addHandler(stackHandler).addHandler(logger);

      const error = new BaseAxonError("Pipeline error with password=secret", "PIPELINE_ERROR", {
        severity: ErrorSeverity.ERROR,
        metadata: {
          password: "sensitive",
          safe: "data",
        },
      });

      await chain.process(error);

      // Verify logger was called with processed error
      expect(mockLogger.error).toHaveBeenCalled();
      const [message, context] = mockLogger.error.mock.calls[0];

      // Should have correlation ID from enrichment
      expect(context.context.correlationId).toBeDefined();
      expect(context.context.component).toBe("Pipeline");

      // Password should be sanitized in logged context
      expect(JSON.stringify(context)).not.toContain("sensitive");
      expect(JSON.stringify(context)).not.toContain("secret");
    });

    it("should handle handler failures gracefully", async () => {
      const failingHandler = new ContextEnrichmentHandler({});
      failingHandler.handle = async () => {
        throw new Error("Handler failure");
      };

      chain.addHandler(failingHandler);

      const error = new BaseAxonError("Test");

      // Should throw the handler error
      await expect(chain.process(error)).rejects.toThrow("Handler failure");
    });

    it("should respect timeout configuration", async () => {
      const slowChain = new ErrorHandlerChain({
        timeout: 100, // 100ms timeout
      });

      const slowHandler = new ContextEnrichmentHandler({});
      slowHandler.handle = async (error) => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return {
          handled: true,
          continueChain: false,
        };
      };

      slowChain.addHandler(slowHandler);

      const error = new BaseAxonError("Timeout test");

      await expect(slowChain.process(error)).rejects.toThrow("timeout");
    });

    it("should stop on first handle when configured", async () => {
      const stopChain = new ErrorHandlerChain({
        stopOnFirstHandle: true,
      });

      const handler1Called = vi.fn();
      const handler2Called = vi.fn();

      const handler1 = new ContextEnrichmentHandler({});
      const originalHandle1 = handler1.handle.bind(handler1);
      handler1.handle = async (error) => {
        handler1Called();
        return {
          handled: true,
          continueChain: true,
          modifiedError: error,
        };
      };

      const handler2 = new StackTraceHandler({});
      handler2.handle = async (error) => {
        handler2Called();
        return {
          handled: true,
          continueChain: true,
        };
      };

      stopChain.addHandler(handler1).addHandler(handler2);

      await stopChain.process(new BaseAxonError("Test"));

      expect(handler1Called).toHaveBeenCalled();
      expect(handler2Called).not.toHaveBeenCalled();
    });
  });

  describe("Handler management", () => {
    it("should sort handlers by priority", () => {
      const lowHandler = new LoggingHandler({}, HandlerPriority.LOW);
      const highHandler = new SanitizationHandler({}, HandlerPriority.HIGH);
      const criticalHandler = new ContextEnrichmentHandler({}, HandlerPriority.CRITICAL);

      chain.addHandler(lowHandler).addHandler(highHandler).addHandler(criticalHandler);

      const handlers = chain.getHandlers();

      expect(handlers[0]).toBe(criticalHandler);
      expect(handlers[1]).toBe(highHandler);
      expect(handlers[2]).toBe(lowHandler);
    });

    it("should remove handlers by name", () => {
      const handler1 = new ContextEnrichmentHandler({});
      const handler2 = new StackTraceHandler({});

      chain.addHandler(handler1).addHandler(handler2);

      expect(chain.getHandlers()).toHaveLength(2);

      const removed = chain.removeHandler("ContextEnrichmentHandler");

      expect(removed).toBe(true);
      expect(chain.getHandlers()).toHaveLength(1);
      expect(chain.getHandlers()[0]?.name).toBe("StackTraceHandler");
    });

    it("should clear all handlers", () => {
      chain
        .addHandler(new ContextEnrichmentHandler({}))
        .addHandler(new StackTraceHandler({}))
        .addHandler(new LoggingHandler({}));

      expect(chain.getHandlers()).toHaveLength(3);

      chain.clear();

      expect(chain.getHandlers()).toHaveLength(0);
    });
  });
});
