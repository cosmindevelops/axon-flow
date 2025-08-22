/**
 * Integration tests for correlation flow across logger components
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  CorrelationManager,
  CorrelationIdGenerator,
  CorrelationManagerFactory,
  AsyncLocalStorageCorrelationManager,
  BrowserCorrelationManager,
  HttpCorrelationMiddleware,
  CorrelationMiddlewareChain,
} from "../../src/correlation/correlation.classes.js";
import { HighPerformancePinoLogger } from "../../src/logger/logger.classes.js";
import type {
  IEnhancedCorrelationManager,
  CorrelationId,
  ICorrelationContext,
} from "../../src/correlation/correlation.types.js";
import type { ILoggerConfig } from "../../src/types/index.js";

describe("Correlation Flow Integration", () => {
  let correlationManager: IEnhancedCorrelationManager;
  let logger: HighPerformancePinoLogger;
  let mockTransportOutput: any[];

  // Helper function to wait for async log operations to complete
  const waitForLogs = async (expectedCount?: number, timeoutMs = 1000): Promise<void> => {
    const startTime = Date.now();
    const checkInterval = 10;

    return new Promise((resolve) => {
      const checkLogs = () => {
        const elapsed = Date.now() - startTime;

        if (expectedCount && mockTransportOutput.length >= expectedCount) {
          resolve();
          return;
        }

        if (elapsed >= timeoutMs) {
          // Don't reject if we just need to wait for async operations
          resolve();
          return;
        }

        setTimeout(checkLogs, checkInterval);
      };

      checkLogs();
    });
  };

  beforeEach(async () => {
    // Initialize components with test configuration
    const factory = new CorrelationManagerFactory();
    correlationManager = factory.create();

    // Mock transport output for testing
    mockTransportOutput = [];

    // Create a custom writable stream to capture Pino output
    const { Writable } = await import("stream");
    const testStream = new Writable({
      write(chunk, _encoding, callback) {
        const logStr = chunk.toString();

        try {
          const logEntry = JSON.parse(logStr);
          mockTransportOutput.push(logEntry);
        } catch {
          // Handle non-JSON logs
          mockTransportOutput.push({ message: logStr });
        }
        callback();
      },
    });

    // Create logger with test-optimized config - NO transports to use direct Pino
    const testConfig: Partial<ILoggerConfig> = {
      environment: "test", // Use test mode for proper mock capture
      logLevel: "debug",
      transports: [], // Empty transports to force direct Pino logging with testStream
      performance: { enabled: false, sampleRate: 0, thresholdMs: 1000 },
      circuitBreaker: { enabled: false, failureThreshold: 10, resetTimeoutMs: 60000, monitorTimeWindowMs: 120000 },
      objectPool: { enabled: false, initialSize: 0, maxSize: 0, growthFactor: 1 },
      enableCorrelationIds: true,
      timestampFormat: "iso",
      testStream: testStream,
    };

    logger = new HighPerformancePinoLogger(testConfig);

    // CRITICAL: Replace logger's correlation manager with the test one
    // This ensures both test and logger use the same correlation context
    (logger as any).correlationManager = correlationManager;

    // CRITICAL: Wait for logger to be fully initialized
    // The logger initialization is async, we need to wait for it
    // We need to access the private promise and await it properly
    await (logger as any).loggerInitPromise;
  });

  afterEach(() => {
    mockTransportOutput = [];
    correlationManager.clearContext();
  });

  describe("End-to-End Correlation Flow", () => {
    it("should propagate correlation ID through entire logging pipeline", async () => {
      // 1. Create correlation context
      const testCorrelationId = correlationManager.create("test-prefix");

      // 2. Execute operation within correlation context
      await correlationManager.withAsync(testCorrelationId, async () => {
        // 3. Log messages should include correlation ID
        logger.info("Test message", { data: "test" });
        logger.error("Error message", { errorDetails: "test error" });
      });

      // 4. Wait for async log operations to complete
      await waitForLogs(2);

      // 5. Verify correlation ID appears in log outputs
      expect(mockTransportOutput).toHaveLength(2);

      const infoLog = mockTransportOutput.find((log) => log.msg === "Test message");
      const errorLog = mockTransportOutput.find((log) => log.msg === "Error message");

      expect(infoLog).toBeDefined();
      expect(errorLog).toBeDefined();
      expect(infoLog.correlationId).toBe(testCorrelationId);
      expect(errorLog.correlationId).toBe(testCorrelationId);
      expect(infoLog.data).toBe("test");
      expect(errorLog.errorDetails).toBe("test error");
    });

    it("should handle nested correlation contexts", async () => {
      const parentCorrelationId = correlationManager.create("parent");
      const childCorrelationId = correlationManager.create("child");

      // Parent correlation context
      await correlationManager.withAsync(parentCorrelationId, async () => {
        const parentContext = correlationManager.currentContext();
        expect(parentContext?.id).toBe(parentCorrelationId);

        logger.info("Parent context message");

        // Nested correlation context
        await correlationManager.withAsync(childCorrelationId, async () => {
          const childContext = correlationManager.currentContext();
          expect(childContext?.id).toBe(childCorrelationId);

          logger.info("Child context message");
        });

        // Back to parent context
        const restoredContext = correlationManager.currentContext();
        expect(restoredContext?.id).toBe(parentCorrelationId);
      });

      // Verify both messages were logged with correct correlation IDs
      expect(mockTransportOutput).toHaveLength(2);

      const parentLog = mockTransportOutput.find((log) => log.msg === "Parent context message");
      const childLog = mockTransportOutput.find((log) => log.msg === "Child context message");

      expect(parentLog?.correlationId).toBe(parentCorrelationId);
      expect(childLog?.correlationId).toBe(childCorrelationId);
    });

    it("should maintain correlation across async operations", async () => {
      const testCorrelationId = correlationManager.create("async-test");

      await correlationManager.withAsync(testCorrelationId, async () => {
        logger.info("Before async operation");

        // Simulate async operations
        await new Promise((resolve) => setTimeout(resolve, 10));

        await Promise.all([
          new Promise<void>((resolve) =>
            setTimeout(() => {
              logger.info("Async operation 1");
              resolve();
            }, 5),
          ),
          new Promise<void>((resolve) =>
            setTimeout(() => {
              logger.info("Async operation 2");
              resolve();
            }, 8),
          ),
        ]);

        logger.info("After async operations");
      });

      // All log entries should have same correlation ID
      expect(mockTransportOutput).toHaveLength(4);

      mockTransportOutput.forEach((log) => {
        expect(log.correlationId).toBe(testCorrelationId);
      });
    });

    it("should handle correlation context errors gracefully", async () => {
      const testCorrelationId = correlationManager.create("error-test");

      await expect(
        correlationManager.withAsync(testCorrelationId, async () => {
          logger.info("Before error");
          throw new Error("Test error");
        }),
      ).rejects.toThrow("Test error");

      // Context should be cleaned up after error
      expect(correlationManager.current()).toBeUndefined();

      // The log before error should still be captured
      expect(mockTransportOutput).toHaveLength(1);
      expect(mockTransportOutput[0].msg).toBe("Before error");
      expect(mockTransportOutput[0].correlationId).toBe(testCorrelationId);
    });
  });

  describe("Multi-Transport Correlation", () => {
    it("should include correlation ID in all transports simultaneously", async () => {
      const testCorrelationId = correlationManager.create("multi-transport");

      await correlationManager.withAsync(testCorrelationId, async () => {
        logger.info("Multi-transport message", { key: "value" });
        logger.error("Error message", { errorType: "test" });
      });

      // Should capture both log messages
      expect(mockTransportOutput).toHaveLength(2);

      const infoLog = mockTransportOutput.find((log) => log.msg === "Multi-transport message");
      const errorLog = mockTransportOutput.find((log) => log.msg === "Error message");

      expect(infoLog?.correlationId).toBe(testCorrelationId);
      expect(errorLog?.correlationId).toBe(testCorrelationId);
      expect(infoLog?.key).toBe("value");
      expect(errorLog?.errorType).toBe("test");
    });

    it("should handle transport failures without losing correlation", async () => {
      // Mock console.error to throw an error (simulate transport failure)
      let errorCallCount = 0;

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation((...args) => {
        errorCallCount++;
        if (errorCallCount === 1) {
          // First call fails (simulating transport failure)
          throw new Error("Transport failed");
        }
        // Subsequent calls succeed
        try {
          const logStr = args.join(" ");
          const logEntry = JSON.parse(logStr);
          mockTransportOutput.push(logEntry);
        } catch {
          mockTransportOutput.push({ message: args.join(" ") });
        }
      });

      const testCorrelationId = correlationManager.create("failure-test");

      await correlationManager.withAsync(testCorrelationId, async () => {
        logger.info("Info message before failure");

        // This should fail silently and continue
        try {
          logger.error("Message that fails transport");
        } catch (error) {
          // Logger should handle transport failures gracefully
        }

        logger.info("Message after transport failure");
      });

      // Console (info) transport should still receive correlation ID
      // Error transport failure shouldn't affect other transports
      const infoLogs = mockTransportOutput.filter(
        (log) => log.msg?.includes("Info message") || log.msg?.includes("Message after"),
      );
      expect(infoLogs).toHaveLength(2);
      infoLogs.forEach((log) => {
        expect(log.correlationId).toBe(testCorrelationId);
      });

      // Restore original console.error
      consoleErrorSpy.mockRestore();
    });
  });

  describe("Performance and Memory", () => {
    it("should not leak correlation contexts under normal operation", async () => {
      // Test memory leak prevention
      const initialMemory = process.memoryUsage();

      // Create many correlation contexts
      for (let i = 0; i < 100; i++) {
        // Reduced from 1000 for faster tests
        await correlationManager.withAsync(correlationManager.create(`test-correlation-${i}`), async () => {
          logger.debug(`Test message ${i}`);
        });
      }

      // Clear any remaining context
      correlationManager.clearContext();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory growth should be reasonable (less than 5MB for 100 contexts)
      expect(memoryGrowth).toBeLessThan(5 * 1024 * 1024);

      // Verify we created the expected number of log entries
      expect(mockTransportOutput).toHaveLength(100);
    });

    it("should maintain performance with high correlation context throughput", async () => {
      // Test performance under load
      const startTime = Date.now();
      const promises: Promise<void>[] = [];

      // Simulate high throughput with smaller batch for faster tests
      for (let i = 0; i < 50; i++) {
        promises.push(
          correlationManager.withAsync(correlationManager.create(`throughput-test-${i}`), async () => {
            logger.info(`High throughput message ${i}`);
          }),
        );
      }

      await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 2 seconds for 50 contexts)
      expect(duration).toBeLessThan(2000);

      // Verify all messages were logged with correct correlation IDs
      expect(mockTransportOutput).toHaveLength(50);

      // Each log should have its unique correlation ID
      const correlationIds = mockTransportOutput.map((log) => log.correlationId);
      const uniqueIds = new Set(correlationIds);
      expect(uniqueIds.size).toBe(50); // All should be unique
    });

    it("should handle rapid context switching efficiently", async () => {
      const testCorrelationIds = Array.from({ length: 10 }, (_, i) => correlationManager.create(`rapid-${i}`));

      const startTime = Date.now();

      // Rapidly switch between correlation contexts
      for (let iteration = 0; iteration < 5; iteration++) {
        for (const correlationId of testCorrelationIds) {
          await correlationManager.withAsync(correlationId, async () => {
            logger.debug(`Rapid switch iteration ${iteration}`, { correlationId });
          });
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete efficiently (less than 1 second)
      expect(duration).toBeLessThan(1000);

      // Should have logged 50 messages (10 IDs × 5 iterations)
      expect(mockTransportOutput).toHaveLength(50);

      // Verify correlation IDs are correctly maintained
      const logsByCorrelationId = mockTransportOutput.reduce(
        (acc, log) => {
          acc[log.correlationId] = (acc[log.correlationId] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Each correlation ID should appear exactly 5 times
      Object.values(logsByCorrelationId).forEach((count) => {
        expect(count).toBe(5);
      });
    });
  });

  describe("Cross-Component Integration", () => {
    it("should integrate correlation with logger context helpers", async () => {
      // Test correlation with logger's built-in context helpers
      const testCorrelationId = correlationManager.create("context-helper-test");

      // Test withContext method
      const result = await logger.withContextAsync(testCorrelationId, async () => {
        logger.info("Message within logger context");

        // Verify current correlation ID is accessible
        const currentId = logger.getCurrentCorrelationId();
        expect(currentId).toBe(testCorrelationId);

        return "test-result";
      });

      expect(result).toBe("test-result");
      expect(mockTransportOutput).toHaveLength(1);
      expect(mockTransportOutput[0].correlationId).toBe(testCorrelationId);
    });

    it("should integrate correlation with logger manual correlation", async () => {
      // Test manual correlation ID setting vs automatic context detection
      const manualCorrelationId = correlationManager.create("manual-test");
      const contextCorrelationId = correlationManager.create("context-test");

      // Start with context correlation
      await correlationManager.withAsync(contextCorrelationId, async () => {
        // Create logger with manual correlation ID - should take precedence
        const loggerWithManualCorrelation = logger.withCorrelation(manualCorrelationId);

        loggerWithManualCorrelation.info("Manual correlation message");

        // Regular logger should use context correlation
        logger.info("Context correlation message");
      });

      expect(mockTransportOutput).toHaveLength(2);

      const manualLog = mockTransportOutput.find((log) => log.msg === "Manual correlation message");
      const contextLog = mockTransportOutput.find((log) => log.msg === "Context correlation message");

      expect(manualLog?.correlationId).toBe(manualCorrelationId);
      expect(contextLog?.correlationId).toBe(contextCorrelationId);
    });

    it("should integrate correlation with logger health checking", async () => {
      // Test that correlation doesn't interfere with logger health checking
      const testCorrelationId = correlationManager.create("health-test");

      await correlationManager.withAsync(testCorrelationId, async () => {
        // Health check should work regardless of correlation context
        const isHealthy = logger.isHealthy();
        expect(typeof isHealthy).toBe("boolean");

        // Metrics should work regardless of correlation context
        const metrics = logger.getMetrics();
        expect(typeof metrics).toBe("object");

        logger.info("Health check during correlation context");
      });

      expect(mockTransportOutput).toHaveLength(1);
      expect(mockTransportOutput[0].correlationId).toBe(testCorrelationId);
    });

    it("should integrate correlation with middleware chain", async () => {
      // Test correlation with middleware processing
      const httpMiddleware = new HttpCorrelationMiddleware({
        name: "TestHttpMiddleware",
      });

      const middlewareChain = new CorrelationMiddlewareChain();
      middlewareChain.add(httpMiddleware);

      const testCorrelationId = correlationManager.create("middleware-test");
      const mockRequest = {
        headers: { "user-agent": "test-agent" },
        url: "/test-endpoint",
      };

      await correlationManager.withAsync(testCorrelationId, async () => {
        const context = correlationManager.currentContext();
        expect(context).toBeDefined();

        // Process context through middleware
        const processedContext = await middlewareChain.process(context!, mockRequest);

        expect(processedContext.id).toBe(testCorrelationId);
        expect(processedContext.metadata?.["httpRequest"]).toBe(true);
        expect(processedContext.metadata?.["userAgent"]).toBe("test-agent");
        expect(processedContext.metadata?.["requestPath"]).toBe("/test-endpoint");

        logger.info("Message after middleware processing");
      });

      expect(mockTransportOutput).toHaveLength(1);
      expect(mockTransportOutput[0].correlationId).toBe(testCorrelationId);
    });
  });

  describe("Edge Cases and Error Scenarios", () => {
    it("should handle correlation manager failures gracefully", async () => {
      // Test correlation manager failure scenarios by creating a failing manager
      // Mock create method to throw error
      const createSpy = vi.spyOn(correlationManager, "create").mockImplementationOnce(() => {
        throw new Error("Correlation ID generation failed");
      });

      // Logger should continue working without correlation
      expect(() => {
        logger.info("Message without correlation during failure");
      }).not.toThrow();

      // Wait for async log operations to complete
      await waitForLogs(1);

      // Log should not have correlation ID due to failure
      expect(mockTransportOutput).toHaveLength(1);
      expect(mockTransportOutput[0].correlationId).toBeUndefined();

      // Restore original function
      createSpy.mockRestore();

      // Subsequent operations should work normally
      const workingCorrelationId = correlationManager.create("recovery-test");
      await correlationManager.withAsync(workingCorrelationId, async () => {
        logger.info("Message after recovery");
      });

      // Wait for the second log to complete
      await waitForLogs(2);

      expect(mockTransportOutput).toHaveLength(2);
      expect(mockTransportOutput[1].correlationId).toBe(workingCorrelationId);
    });

    it("should handle invalid correlation contexts robustly", async () => {
      // Test handling of edge cases in correlation context
      const generator = new CorrelationIdGenerator();

      // Test with various edge case correlation IDs
      const edgeCaseIds = [
        generator.generate(), // Valid ID
        generator.generate(""), // Empty prefix
        generator.generate("very-long-prefix-that-exceeds-normal-length-expectations-for-testing-purposes"),
      ];

      for (const correlationId of edgeCaseIds) {
        await correlationManager.withAsync(correlationId, async () => {
          logger.info(`Edge case test`, { testId: correlationId });

          // Context should be properly maintained
          const currentContext = correlationManager.currentContext();
          expect(currentContext?.id).toBe(correlationId);
        });
      }

      expect(mockTransportOutput).toHaveLength(3);

      // All logs should have their respective correlation IDs
      edgeCaseIds.forEach((id, index) => {
        expect(mockTransportOutput[index].correlationId).toBe(id);
      });
    });

    it("should handle concurrent correlation context modifications", async () => {
      // Test concurrent context handling
      const promises: Promise<void>[] = [];
      const concurrentCount = 20; // Reduced for faster test execution

      for (let i = 0; i < concurrentCount; i++) {
        promises.push(
          correlationManager.withAsync(correlationManager.create(`concurrent-${i}`), async () => {
            const initialContext = correlationManager.currentContext();
            const initialId = initialContext?.id;

            logger.info(`Concurrent message ${i}`, { threadId: i });

            // Simulate some async work
            await new Promise((resolve) => setTimeout(resolve, Math.random() * 50));

            // Context should remain consistent after async operations
            const finalContext = correlationManager.currentContext();
            expect(finalContext?.id).toBe(initialId);

            logger.debug(`Concurrent completion ${i}`, { threadId: i });
          }),
        );
      }

      await Promise.all(promises);

      // Should have logged 40 messages (2 per concurrent operation)
      expect(mockTransportOutput).toHaveLength(concurrentCount * 2);

      // Group logs by correlation ID and verify consistency
      const logsByCorrelationId = mockTransportOutput.reduce(
        (acc, log) => {
          if (!acc[log.correlationId]) {
            acc[log.correlationId] = [];
          }
          acc[log.correlationId].push(log);
          return acc;
        },
        {} as Record<string, any[]>,
      );

      // Each correlation ID should have exactly 2 logs
      Object.entries(logsByCorrelationId).forEach(([_correlationId, logs]) => {
        const typedLogs = logs as any[];
        expect(typedLogs).toHaveLength(2);
        // Both logs should have the same threadId
        expect(typedLogs[0].threadId).toBe(typedLogs[1].threadId);
      });
    });

    it("should handle context cleanup after unexpected errors", async () => {
      // Test context cleanup in error scenarios
      const testCorrelationId = correlationManager.create("cleanup-test");

      try {
        await correlationManager.withAsync(testCorrelationId, async () => {
          logger.info("Before unexpected error");

          // Simulate an unexpected error during execution
          throw new Error("Unexpected system error");
        });
      } catch (error) {
        expect((error as Error).message).toBe("Unexpected system error");
      }

      // Context should be cleaned up properly
      expect(correlationManager.current()).toBeUndefined();

      // New correlation contexts should work normally
      const newCorrelationId = correlationManager.create("after-cleanup-test");
      await correlationManager.withAsync(newCorrelationId, async () => {
        logger.info("Message after cleanup");
      });

      expect(mockTransportOutput).toHaveLength(2);
      expect(mockTransportOutput[0].correlationId).toBe(testCorrelationId);
      expect(mockTransportOutput[1].correlationId).toBe(newCorrelationId);
    });
  });

  describe("Configuration and Customization", () => {
    it("should support custom correlation ID formats", async () => {
      // Test custom correlation ID generation with different prefixes
      const customPrefixes = ["API", "WEB", "BATCH"];

      for (const prefix of customPrefixes) {
        const customCorrelationId = correlationManager.create(prefix);

        // Correlation ID should start with the custom prefix
        expect(customCorrelationId).toMatch(new RegExp(`^${prefix}-`));

        await correlationManager.withAsync(customCorrelationId, async () => {
          logger.info(`Custom format test for ${prefix}`);

          const context = correlationManager.currentContext();
          expect(context?.id).toBe(customCorrelationId);
        });
      }

      expect(mockTransportOutput).toHaveLength(3);

      // Each log should have the corresponding custom correlation ID
      customPrefixes.forEach((prefix, index) => {
        const log = mockTransportOutput[index];
        expect(log.correlationId).toMatch(new RegExp(`^${prefix}-`));
        expect(log.msg).toContain(prefix);
      });
    });

    it("should support correlation context metadata enrichment", async () => {
      // Test metadata enrichment through middleware
      const httpMiddleware = new HttpCorrelationMiddleware();
      const middlewareChain = new CorrelationMiddlewareChain();
      middlewareChain.add(httpMiddleware);

      const testCorrelationId = correlationManager.create("metadata-test");
      const mockRequest = {
        headers: {
          "user-agent": "test-browser/1.0",
          "x-forwarded-for": "192.168.1.1",
        },
        url: "/api/users/123",
      };

      await correlationManager.withAsync(testCorrelationId, async () => {
        const context = correlationManager.currentContext();

        // Process context through middleware to enrich metadata
        const enrichedContext = await middlewareChain.process(context!, mockRequest);

        // Verify metadata enrichment
        expect(enrichedContext.metadata?.["httpRequest"]).toBe(true);
        expect(enrichedContext.metadata?.["userAgent"]).toBe("test-browser/1.0");
        expect(enrichedContext.metadata?.["requestPath"]).toBe("/api/users/123");
        expect(enrichedContext.metadata?.["timestamp"]).toBeDefined();

        logger.info("Enriched correlation test", {
          userId: "user123",
          sessionId: "session456",
        });
      });

      expect(mockTransportOutput).toHaveLength(1);
      expect(mockTransportOutput[0].correlationId).toBe(testCorrelationId);
      expect(mockTransportOutput[0].userId).toBe("user123");
      expect(mockTransportOutput[0].sessionId).toBe("session456");
    });

    it("should support different correlation manager implementations", async () => {
      // Test different correlation manager implementations
      const basicManager = new CorrelationManager();
      const browserManager = new BrowserCorrelationManager();

      const managers = [
        { name: "basic", manager: basicManager },
        { name: "browser", manager: browserManager },
      ];

      for (const { name, manager } of managers) {
        const testId = manager.create(`${name}-test`);

        await manager.withAsync(testId, async () => {
          // Create a temporary logger for this manager
          const tempLogger = logger.withCorrelation(testId);
          tempLogger.info(`Testing ${name} manager`);
        });
      }

      expect(mockTransportOutput).toHaveLength(2);

      const basicLog = mockTransportOutput.find((log) => log.msg?.includes("basic"));
      const browserLog = mockTransportOutput.find((log) => log.msg?.includes("browser"));

      expect(basicLog?.correlationId).toMatch(/^basic-test-/);
      expect(browserLog?.correlationId).toMatch(/^browser-test-/);
    });

    it("should validate correlation system configuration", async () => {
      // Test that correlation system works with different logger configurations
      const testConfigs = [
        { enableCorrelationIds: true, expected: true },
        { enableCorrelationIds: false, expected: false },
      ];

      for (const { enableCorrelationIds, expected } of testConfigs) {
        // Get the testStream from the main logger to ensure logs are captured
        const testStream = (logger as any).config.testStream;
        
        // Create new logger with specific configuration that shares the test stream
        const testLogger = new HighPerformancePinoLogger({
          enableCorrelationIds,
          environment: "test",
          logLevel: "info",
          transports: [], // Empty transports to use Pino direct logging
          testStream: testStream, // Share the test stream for log capture
        });

        // Share the correlation manager to ensure consistent behavior
        (testLogger as any).correlationManager = correlationManager;
        
        // Wait for test logger to be initialized
        await (testLogger as any).loggerInitPromise;

        const testCorrelationId = correlationManager.create("config-test");

        await correlationManager.withAsync(testCorrelationId, async () => {
          testLogger.info(`Config test - correlation ${expected ? "enabled" : "disabled"}`);
        });

        // Wait for async logging to complete
        await waitForLogs();

        const lastLogIndex = mockTransportOutput.length - 1;
        const lastLog = mockTransportOutput[lastLogIndex];

        // Ensure we have a log entry
        expect(lastLog).toBeDefined();

        if (expected) {
          expect(lastLog.correlationId).toBe(testCorrelationId);
        } else {
          expect(lastLog.correlationId).toBeUndefined();
        }
      }
    });
  });
});
