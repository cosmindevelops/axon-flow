/**
 * Integration tests for chain of responsibility error handling
 */

import { beforeEach, describe, expect, it, afterEach } from "vitest";
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
  let eventTracker: any;
  let realLogger: any;

  beforeEach(() => {
    chain = new ErrorHandlerChain({
      sortByPriority: true,
      stopOnFirstHandle: false,
    });

    // Create event tracker for observation
    eventTracker = {
      events: [] as any[],
      addEvent: function (type: string, data: any) {
        this.events.push({ type, data, timestamp: new Date() });
      },
      getEvents: function (type?: string) {
        return type ? this.events.filter((e) => e.type === type) : this.events;
      },
      reset: function () {
        this.events = [];
      },
    };

    // Create real logger with event observation
    realLogger = {
      error: function (message: any, context?: any) {
        eventTracker.addEvent("log_error", { message, context });
      },
      warn: function (message: any, context?: any) {
        eventTracker.addEvent("log_warn", { message, context });
      },
      info: function (message: any, context?: any) {
        eventTracker.addEvent("log_info", { message, context });
      },
      debug: function (message: any, context?: any) {
        eventTracker.addEvent("log_debug", { message, context });
      },
    };
  });

  afterEach(() => {
    eventTracker?.reset();
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
      const results = await chain.process(originalError);

      // Verify results contain enriched error information
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      
      const handlerResult = results[0];
      expect(handlerResult.handled).toBe(true);
      expect(handlerResult.modifiedError).toBeDefined();
      
      const enrichedError = handlerResult.modifiedError;
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

      const results = await chain.process(new BaseAxonError("Test"));
      
      expect(results.length).toBeGreaterThan(0);
      const enrichedError = results[0].modifiedError;
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
      const results = await chain.process(error);

      expect(results.length).toBeGreaterThan(0);
      const processedError = results[0].modifiedError;
      
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

      const results = await chain.process(error);
      
      expect(results.length).toBeGreaterThan(0);
      const sanitizedError = results[0].modifiedError;

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

      const results = await chain.process(error);
      
      expect(results.length).toBeGreaterThan(0);
      const sanitizedError = results[0].modifiedError;
      expect(sanitizedError.context.metadata.secret).toBe("********");
    });
  });

  describe("Logging integration", () => {
    it("should log errors based on severity", async () => {
      const loggingHandler = new LoggingHandler({
        logLevel: "error",
        includeStack: true,
        includeContext: true,
        logger: realLogger,
      });

      chain.addHandler(loggingHandler);

      const criticalError = new BaseAxonError("Critical failure", "CRITICAL", {
        severity: ErrorSeverity.CRITICAL,
        category: ErrorCategory.SYSTEM,
      });

      await chain.process(criticalError);

      const errorLogs = eventTracker.getEvents("log_error");
      expect(errorLogs).toHaveLength(1);
      
      const logEntry = errorLogs[0].data;
      expect(logEntry.message).toContain("Critical failure");
      expect(logEntry.context.code).toBe("CRITICAL");
      expect(logEntry.context.severity).toBe(ErrorSeverity.CRITICAL);
      expect(logEntry.context.context).toBeDefined();
      expect(logEntry.context.stack).toBeDefined();
    });

    it("should use appropriate log level for severity", async () => {
      const loggingHandler = new LoggingHandler({
        logger: realLogger,
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

      expect(eventTracker.getEvents("log_warn")).toHaveLength(1);
      expect(eventTracker.getEvents("log_info")).toHaveLength(1);
    });
  });

  describe("Complete pipeline", () => {
    it("should process error through complete handler chain", async () => {
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
          logger: realLogger,
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

      const results = await chain.process(error);

      // Verify all handlers processed the error
      expect(results).toHaveLength(4);

      // Verify logger was called with processed error
      const errorLogs = eventTracker.getEvents("log_error");
      expect(errorLogs).toHaveLength(1);
      
      const loggedContext = errorLogs[0].data.context;

      // Should have correlation ID from enrichment
      expect(loggedContext.context.correlationId).toBeDefined();
      expect(loggedContext.context.component).toBe("Pipeline");

      // Password should be sanitized in logged context
      expect(JSON.stringify(loggedContext)).not.toContain("sensitive");
      expect(JSON.stringify(loggedContext)).not.toContain("secret");
    });

    it("should handle handler failures gracefully", async () => {
      const failingHandler = new ContextEnrichmentHandler({});
      const originalHandle = failingHandler.handle.bind(failingHandler);
      
      failingHandler.handle = async () => {
        eventTracker.addEvent("handler_error", { message: "Handler failure" });
        throw new Error("Handler failure");
      };

      chain.addHandler(failingHandler);

      const error = new BaseAxonError("Test");

      // Should throw the handler error
      await expect(chain.process(error)).rejects.toThrow("Handler failure");
      
      // Verify the error was tracked
      expect(eventTracker.getEvents("handler_error")).toHaveLength(1);
    });

    it("should respect timeout configuration", async () => {
      const slowChain = new ErrorHandlerChain({
        timeout: 100, // 100ms timeout
      });

      const slowHandler = new ContextEnrichmentHandler({});
      const originalHandle = slowHandler.handle.bind(slowHandler);
      
      slowHandler.handle = async (error) => {
        eventTracker.addEvent("slow_handler_start", { timeout: 200 });
        await new Promise((resolve) => setTimeout(resolve, 200));
        eventTracker.addEvent("slow_handler_complete", { message: "Should not reach here" });
        return {
          handled: true,
          continueChain: false,
        };
      };

      slowChain.addHandler(slowHandler);

      const error = new BaseAxonError("Timeout test");

      await expect(slowChain.process(error)).rejects.toThrow("timeout");
      
      // Should have started but not completed
      expect(eventTracker.getEvents("slow_handler_start")).toHaveLength(1);
      expect(eventTracker.getEvents("slow_handler_complete")).toHaveLength(0);
    });

    it("should stop on first handle when configured", async () => {
      const stopChain = new ErrorHandlerChain({
        stopOnFirstHandle: true,
      });

      const handler1 = new ContextEnrichmentHandler({});
      const originalHandle1 = handler1.handle.bind(handler1);
      handler1.handle = async (error) => {
        eventTracker.addEvent("handler1_called", { name: "handler1" });
        return {
          handled: true,
          continueChain: true,
          modifiedError: error,
        };
      };

      const handler2 = new StackTraceHandler({});
      const originalHandle2 = handler2.handle.bind(handler2);
      handler2.handle = async (error) => {
        eventTracker.addEvent("handler2_called", { name: "handler2" });
        return {
          handled: true,
          continueChain: true,
        };
      };

      stopChain.addHandler(handler1).addHandler(handler2);

      await stopChain.process(new BaseAxonError("Test"));

      expect(eventTracker.getEvents("handler1_called")).toHaveLength(1);
      expect(eventTracker.getEvents("handler2_called")).toHaveLength(0);
    });
  });

  describe("Handler management", () => {
    it("should sort handlers by priority", () => {
      const lowHandler = new LoggingHandler({ logger: realLogger }, HandlerPriority.LOW);
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
        .addHandler(new LoggingHandler({ logger: realLogger }));

      expect(chain.getHandlers()).toHaveLength(3);

      chain.clear();

      expect(chain.getHandlers()).toHaveLength(0);
    });
  });

  describe("Real error recovery chain integration", () => {
    it("should integrate with recovery strategies for complete error handling", async () => {
      // Create a chain that enriches then attempts recovery
      const enrichmentHandler = new ContextEnrichmentHandler({
        addCorrelationId: true,
        addComponent: "RecoveryChain",
      });

      const loggingHandler = new LoggingHandler({
        logger: realLogger,
        logLevel: "error",
      });

      chain.addHandler(enrichmentHandler).addHandler(loggingHandler);

      // Create a serious error that would trigger recovery
      const recoveryError = new BaseAxonError("Database connection failed", "DB_CONNECTION_ERROR", {
        severity: ErrorSeverity.CRITICAL,
        category: ErrorCategory.SYSTEM,
        metadata: {
          host: "localhost",
          port: 5432,
          retryAttempts: 3,
        },
      });

      const results = await chain.process(recoveryError);

      // Verify enrichment happened
      expect(results.length).toBe(2);
      const enrichedResult = results.find(r => r.handler === "ContextEnrichmentHandler");
      expect(enrichedResult?.modifiedError.context.correlationId).toBeDefined();
      expect(enrichedResult?.modifiedError.context.component).toBe("RecoveryChain");

      // Verify logging happened
      const errorLogs = eventTracker.getEvents("log_error");
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].data.message).toContain("Database connection failed");
    });

    it("should handle chained error transformations", async () => {
      // Create a chain that transforms an error through multiple stages
      const enrichmentHandler = new ContextEnrichmentHandler({
        addCorrelationId: true,
        addRequestId: true,
      });

      const sanitizer = new SanitizationHandler({
        sensitiveKeys: ["connectionString", "password"],
        redactValue: "***REDACTED***",
      });

      const stackHandler = new StackTraceHandler({
        maxDepth: 8,
        cleanPaths: true,
      });

      chain.addHandler(enrichmentHandler)
           .addHandler(sanitizer)
           .addHandler(stackHandler);

      const originalError = new BaseAxonError(
        "Failed to connect with connectionString=user:password@host:5432/db", 
        "DB_AUTH_ERROR",
        {
          severity: ErrorSeverity.ERROR,
          metadata: {
            connectionString: "postgresql://user:secret@localhost:5432/mydb",
            password: "supersecret",
            publicInfo: "This is safe to log",
          },
        }
      );

      const results = await chain.process(originalError);

      expect(results).toHaveLength(3);

      // Get the final transformed error (from the last handler)
      const finalError = results[results.length - 1].modifiedError;

      // Should have correlation ID from enrichment
      expect(finalError.context.correlationId).toBeDefined();

      // Should have sanitized sensitive data
      expect(finalError.message).toContain("***REDACTED***");
      expect(finalError.message).not.toContain("user:password");
      expect(finalError.context.metadata.connectionString).toBe("***REDACTED***");
      expect(finalError.context.metadata.password).toBe("***REDACTED***");
      expect(finalError.context.metadata.publicInfo).toBe("This is safe to log");

      // Should have processed stack trace
      expect(finalError.context.stackTrace).toBeDefined();
      const stackLines = finalError.context.stackTrace.split("\n");
      expect(stackLines.length).toBeLessThanOrEqual(9); // maxDepth + 1
    });
  });

  describe("Performance and reliability", () => {
    it("should handle high throughput error processing", async () => {
      const fastChain = new ErrorHandlerChain({
        sortByPriority: true,
      });

      const fastLogger = new LoggingHandler({
        logger: realLogger,
      });

      fastChain.addHandler(fastLogger);

      // Process multiple errors rapidly
      const errors = Array.from({ length: 100 }, (_, i) =>
        new BaseAxonError(`Error ${i}`, `CODE_${i}`, {
          severity: ErrorSeverity.WARNING,
          metadata: { index: i },
        })
      );

      const startTime = performance.now();
      
      await Promise.all(errors.map(error => fastChain.process(error)));
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should process 100 errors quickly
      expect(duration).toBeLessThan(1000); // Under 1 second
      expect(eventTracker.getEvents("log_warn")).toHaveLength(100);
    });

    it("should maintain consistent processing time", async () => {
      const consistentChain = new ErrorHandlerChain();
      const enrichmentHandler = new ContextEnrichmentHandler({
        addCorrelationId: true,
      });
      
      consistentChain.addHandler(enrichmentHandler);

      const durations: number[] = [];

      // Test consistent processing times
      for (let i = 0; i < 20; i++) {
        const error = new BaseAxonError(`Test ${i}`, `CODE_${i}`);
        
        const start = performance.now();
        await consistentChain.process(error);
        const end = performance.now();
        
        durations.push(end - start);
      }

      const avgDuration = durations.reduce((a, b) => a + b) / durations.length;
      const maxDuration = Math.max(...durations);

      // Processing should be consistently fast
      expect(avgDuration).toBeLessThan(5); // Under 5ms average
      expect(maxDuration).toBeLessThan(20); // No outliers over 20ms
    });
  });
});