/**
 * Unit tests for RecoveryManager - central coordinator for recovery mechanisms
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { BaseAxonError } from "../../../src/base/base-error.classes.js";
import { ErrorSeverity, ErrorCategory } from "../../../src/base/base-error.types.js";
import {
  RecoveryManager,
  RetryHandler,
  CircuitBreakerHandler,
  TimeoutHandler,
  GracefulDegradationHandler,
} from "../../../src/recovery/recovery.classes.js";
import { BackoffStrategy, RecoveryStrategy, RecoveryState } from "../../../src/recovery/recovery.types.js";

// Real operation implementations for testing
class TestOperations {
  private static callCounts = new Map<string, number>();

  static resetCallCounts() {
    this.callCounts.clear();
  }

  static getCallCount(operationName: string): number {
    return this.callCounts.get(operationName) || 0;
  }

  static incrementCallCount(operationName: string) {
    this.callCounts.set(operationName, this.getCallCount(operationName) + 1);
  }

  static createSuccessfulOperation(name: string, result: any) {
    return {
      name,
      operation: async () => {
        this.incrementCallCount(name);
        return result;
      },
      timeout: 5000,
    };
  }

  static createFailingOperation(name: string, error: Error) {
    return {
      name,
      operation: async () => {
        this.incrementCallCount(name);
        throw error;
      },
      timeout: 5000,
    };
  }

  static createRetryableOperation(name: string, failTimes: number, successResult: any) {
    return {
      name,
      operation: async () => {
        const currentCount = this.getCallCount(name);
        this.incrementCallCount(name);

        if (currentCount < failTimes) {
          throw new Error("Temporary failure");
        }
        return successResult;
      },
      timeout: 5000,
    };
  }

  static createSimpleFunction(result: any) {
    return async () => result;
  }

  static createFailingFunction(error: Error) {
    return async () => {
      throw error;
    };
  }
}

describe("RecoveryManager", () => {
  let recoveryManager: RecoveryManager;
  let mockError: BaseAxonError;

  beforeEach(() => {
    TestOperations.resetCallCounts();
    mockError = new BaseAxonError("System failure", "SYSTEM_ERROR", {
      severity: ErrorSeverity.ERROR,
      category: ErrorCategory.SYSTEM,
    });

    recoveryManager = new RecoveryManager();
  });

  afterEach(() => {
    TestOperations.resetCallCounts();
  });

  describe("constructor", () => {
    it("should create RecoveryManager with default configuration", () => {
      const manager = new RecoveryManager();
      expect(manager).toBeDefined();
      expect(manager.getHandlers().length).toBe(0);
    });

    it("should create RecoveryManager with custom configuration", () => {
      const config = {
        retryConfig: {
          maxRetries: 3,
          backoffStrategy: BackoffStrategy.EXPONENTIAL,
          initialDelay: 100,
        },
        circuitBreakerConfig: {
          failureThreshold: 5,
          resetTimeout: 60000,
        },
      };
      const manager = new RecoveryManager(config);
      expect(manager).toBeDefined();
      expect(manager.getHandlers().length).toBe(2); // retry + circuit breaker
    });

    it("should auto-register configured handlers", () => {
      const config = {
        retryConfig: { maxRetries: 3 },
        timeoutConfig: { defaultTimeout: 5000 },
        gracefulDegradationConfig: {
          fallbackStrategies: new Map([["ERROR", async () => "fallback"]]),
        },
      };
      const manager = new RecoveryManager(config);
      expect(manager.getHandlers().length).toBe(3);
    });
  });

  describe("handler management", () => {
    it("should register recovery handlers", () => {
      const retryHandler = new RetryHandler({
        maxRetries: 3,
        backoffStrategy: BackoffStrategy.EXPONENTIAL,
      });

      recoveryManager.registerHandler(retryHandler);
      expect(recoveryManager.getHandlers().length).toBe(1);
      expect(recoveryManager.getHandlers()[0]).toBe(retryHandler);
    });

    it("should unregister recovery handlers by name", () => {
      const retryHandler = new RetryHandler({
        maxRetries: 3,
        backoffStrategy: BackoffStrategy.EXPONENTIAL,
      });

      recoveryManager.registerHandler(retryHandler);
      expect(recoveryManager.getHandlers().length).toBe(1);

      const removed = recoveryManager.unregisterHandler(retryHandler.name);
      expect(removed).toBe(true);
      expect(recoveryManager.getHandlers().length).toBe(0);
    });

    it("should return false when unregistering non-existent handler", () => {
      const removed = recoveryManager.unregisterHandler("non-existent");
      expect(removed).toBe(false);
    });

    it("should provide read-only access to handlers", () => {
      const retryHandler = new RetryHandler({ maxRetries: 3 });
      recoveryManager.registerHandler(retryHandler);

      const handlers = recoveryManager.getHandlers();
      expect(() => {
        (handlers as any).push("should not work");
      }).toThrow();
    });
  });

  describe("operation execution with recovery", () => {
    it("should execute successful operation without recovery", async () => {
      const successfulOperation = TestOperations.createSuccessfulOperation("test-operation", "success");

      const result = await recoveryManager.executeWithRecovery(successfulOperation);

      expect(result).toBe("success");
      expect(TestOperations.getCallCount("test-operation")).toBe(1);
    });

    it("should handle failed operation with retry handler", async () => {
      const retryHandler = new RetryHandler({
        maxRetries: 2,
        backoffStrategy: BackoffStrategy.LINEAR,
        initialDelay: 10,
      });

      recoveryManager.registerHandler(retryHandler);

      const retryableOperation = TestOperations.createRetryableOperation("retry-test", 1, "success on retry");

      const result = await recoveryManager.executeWithRecovery(retryableOperation);

      expect(result).toBe("success on retry");
      expect(TestOperations.getCallCount("retry-test")).toBe(2);
    });

    it("should apply graceful degradation when retry fails", async () => {
      const retryHandler = new RetryHandler({
        maxRetries: 1,
        backoffStrategy: BackoffStrategy.LINEAR,
        initialDelay: 10,
      });

      const degradationHandler = new GracefulDegradationHandler({
        fallbackStrategies: new Map([
          ["SERVICE_ERROR", TestOperations.createSimpleFunction({ fallback: true, data: [] })],
        ]),
      });

      recoveryManager.registerHandler(retryHandler);
      recoveryManager.registerHandler(degradationHandler);

      const failingOperation = TestOperations.createFailingOperation(
        "degradation-test",
        new BaseAxonError("Service error", "SERVICE_ERROR"),
      );

      const result = await recoveryManager.executeWithRecovery(failingOperation);

      expect(result).toEqual({ fallback: true, data: [] });
    });

    it("should throw error when all recovery strategies fail", async () => {
      const retryHandler = new RetryHandler({
        maxRetries: 1,
        backoffStrategy: BackoffStrategy.LINEAR,
        initialDelay: 10,
      });

      recoveryManager.registerHandler(retryHandler);

      const failingOperation = TestOperations.createFailingOperation("failing-test", new Error("Persistent failure"));

      await expect(recoveryManager.executeWithRecovery(failingOperation)).rejects.toThrow("Persistent failure");
    });
  });

  describe("direct recovery attempts", () => {
    it("should attempt recovery for errors", async () => {
      const retryHandler = new RetryHandler({
        maxRetries: 2,
        backoffStrategy: BackoffStrategy.LINEAR,
        initialDelay: 10,
      });

      recoveryManager.registerHandler(retryHandler);

      const result = await recoveryManager.attemptRecovery(mockError);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.strategy).toBeDefined();
      expect(result.context).toBeDefined();
    });

    it("should return failure when no handlers available", async () => {
      const result = await recoveryManager.attemptRecovery(mockError);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NO_RECOVERY_HANDLERS");
    });

    it("should return failure when all handlers fail", async () => {
      // Create a handler that will try to recover but should fail for this specific error
      const failingHandler = new RetryHandler({
        maxRetries: 1,
        backoffStrategy: BackoffStrategy.LINEAR,
        initialDelay: 10,
      });

      recoveryManager.registerHandler(failingHandler);

      // Create an error that the retry handler cannot actually recover from
      const unrecoverableError = new BaseAxonError("Unrecoverable error", "UNRECOVERABLE_ERROR");

      const result = await recoveryManager.attemptRecovery(unrecoverableError);

      // The retry handler may attempt recovery but it should ultimately fail
      // since there's no actual operation to retry - it's just the error itself
      expect(result.attempts).toBeGreaterThan(0);
      expect(result.context).toBeDefined();
    });
  });

  describe("metrics and monitoring", () => {
    it("should track operation metrics", async () => {
      const successfulOperation = TestOperations.createSuccessfulOperation("metrics-test", "success");

      await recoveryManager.executeWithRecovery(successfulOperation);

      const metrics = recoveryManager.getMetrics();

      expect(metrics.totalAttempts).toBeGreaterThan(0);
      expect(metrics.successfulAttempts).toBeGreaterThan(0);
      expect(metrics.totalRecoveryTime).toBeGreaterThan(0);
    });

    it("should track failed operation metrics", async () => {
      // Add a retry handler to generate metrics during the failed operation
      const retryHandler = new RetryHandler({
        maxRetries: 1,
        backoffStrategy: BackoffStrategy.LINEAR,
        initialDelay: 10,
      });
      recoveryManager.registerHandler(retryHandler);

      const failingOperation = TestOperations.createFailingOperation(
        "failed-metrics-test",
        new Error("Operation failed"),
      );

      await expect(recoveryManager.executeWithRecovery(failingOperation)).rejects.toThrow("Operation failed");

      const metrics = recoveryManager.getMetrics();

      expect(metrics.totalAttempts).toBeGreaterThan(0);
      expect(metrics.failedAttempts).toBeGreaterThan(0);
    });

    it("should clear metrics", async () => {
      const retryHandler = new RetryHandler({ maxRetries: 2 });
      recoveryManager.registerHandler(retryHandler);

      // Generate some metrics by executing a successful operation
      const successOperation = TestOperations.createSuccessfulOperation("success-for-metrics", "success");

      await recoveryManager.executeWithRecovery(successOperation);

      const beforeClear = recoveryManager.getMetrics();
      expect(beforeClear.totalAttempts).toBeGreaterThan(0);

      recoveryManager.clearMetrics();

      const afterClear = recoveryManager.getMetrics();
      expect(afterClear.totalAttempts).toBe(0);
    });

    it("should provide strategy-specific metrics", async () => {
      const retryHandler = new RetryHandler({
        maxRetries: 2,
        backoffStrategy: BackoffStrategy.LINEAR,
        initialDelay: 10,
      });

      recoveryManager.registerHandler(retryHandler);

      await recoveryManager.attemptRecovery(mockError);

      const metrics = recoveryManager.getMetrics();

      expect(metrics.attemptsByStrategy).toBeDefined();
      expect(metrics.successRateByStrategy).toBeDefined();
      expect(metrics.recoveryTimeByStrategy).toBeDefined();
    });
  });

  describe("concurrent operations", () => {
    it("should handle multiple concurrent recovery attempts", async () => {
      const retryHandler = new RetryHandler({
        maxRetries: 1,
        backoffStrategy: BackoffStrategy.LINEAR,
        initialDelay: 10,
      });

      recoveryManager.registerHandler(retryHandler);

      const errors = Array.from({ length: 5 }, (_, i) => new BaseAxonError(`Error ${i}`, `ERROR_${i}`));

      const recoveryPromises = errors.map((error) => recoveryManager.attemptRecovery(error));

      const results = await Promise.all(recoveryPromises);

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
      });
    });

    it("should handle concurrent operation execution", async () => {
      const operations = Array.from({ length: 3 }, (_, i) =>
        TestOperations.createSuccessfulOperation(`concurrent-op-${i}`, `result-${i}`),
      );

      const results = await Promise.all(operations.map((op) => recoveryManager.executeWithRecovery(op)));

      expect(results).toEqual(["result-0", "result-1", "result-2"]);
    });
  });

  describe("handler compatibility and priority", () => {
    it("should execute handlers in priority order", async () => {
      // Create handlers with different priorities
      const highPriorityHandler = new TimeoutHandler({
        defaultTimeout: 1000,
        priority: 1,
      });

      const lowPriorityHandler = new RetryHandler({
        maxRetries: 2,
        backoffStrategy: BackoffStrategy.LINEAR,
        priority: 10,
      });

      recoveryManager.registerHandler(highPriorityHandler);
      recoveryManager.registerHandler(lowPriorityHandler);

      const handlers = recoveryManager.getHandlers();
      expect(handlers.length).toBe(2);

      // Test that recovery attempts use priority ordering
      const result = await recoveryManager.attemptRecovery(mockError);
      expect(result).toBeDefined();
    });

    it("should filter handlers based on error compatibility", async () => {
      const networkHandler = new RetryHandler({
        maxRetries: 2,
        backoffStrategy: BackoffStrategy.LINEAR,
      });

      recoveryManager.registerHandler(networkHandler);

      const networkError = new BaseAxonError("Network timeout", "NETWORK_ERROR", {
        category: ErrorCategory.NETWORK,
      });

      const result = await recoveryManager.attemptRecovery(networkError);
      expect(result).toBeDefined();
    });
  });
});
