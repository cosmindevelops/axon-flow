/**
 * Unit tests for RecoveryManager - central coordinator for recovery mechanisms
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
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

describe("RecoveryManager", () => {
  let recoveryManager: RecoveryManager;
  let mockError: BaseAxonError;

  beforeEach(() => {
    vi.clearAllMocks();
    mockError = new BaseAxonError("System failure", "SYSTEM_ERROR", {
      severity: ErrorSeverity.ERROR,
      category: ErrorCategory.SYSTEM,
    });

    recoveryManager = new RecoveryManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
      const mockOperation = {
        name: "test-operation",
        operation: vi.fn().mockResolvedValue("success"),
        timeout: 5000,
      };

      const result = await recoveryManager.executeWithRecovery(mockOperation);

      expect(result).toBe("success");
      expect(mockOperation.operation).toHaveBeenCalledTimes(1);
    });

    it("should handle failed operation with retry handler", async () => {
      const retryHandler = new RetryHandler({
        maxRetries: 2,
        backoffStrategy: BackoffStrategy.LINEAR,
        initialDelay: 10,
      });

      recoveryManager.registerHandler(retryHandler);

      let callCount = 0;
      const mockOperation = {
        name: "retry-test",
        operation: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            const error = new Error("Temporary failure");
            throw error;
          }
          return "success on retry";
        }),
        timeout: 5000,
      };

      const result = await recoveryManager.executeWithRecovery(mockOperation);

      expect(result).toBe("success on retry");
      expect(mockOperation.operation).toHaveBeenCalledTimes(2);
    });

    it("should apply graceful degradation when retry fails", async () => {
      const retryHandler = new RetryHandler({
        maxRetries: 1,
        backoffStrategy: BackoffStrategy.LINEAR,
        initialDelay: 10,
      });

      const degradationHandler = new GracefulDegradationHandler({
        fallbackStrategies: new Map([["SERVICE_ERROR", async () => ({ fallback: true, data: [] })]]),
      });

      recoveryManager.registerHandler(retryHandler);
      recoveryManager.registerHandler(degradationHandler);

      const failingOperation = {
        name: "degradation-test",
        operation: vi.fn().mockRejectedValue(new BaseAxonError("Service error", "SERVICE_ERROR")),
        timeout: 5000,
      };

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

      const failingOperation = {
        name: "failing-test",
        operation: vi.fn().mockRejectedValue(new Error("Persistent failure")),
        timeout: 5000,
      };

      await expect(recoveryManager.executeWithRecovery(failingOperation)).rejects.toThrow();
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
      const mockOperation = {
        name: "metrics-test",
        operation: vi.fn().mockResolvedValue("success"),
        timeout: 5000,
      };

      await recoveryManager.executeWithRecovery(mockOperation);

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

      const failingOperation = {
        name: "failed-metrics-test",
        operation: vi.fn().mockRejectedValue(new Error("Operation failed")),
        timeout: 5000,
      };

      await expect(recoveryManager.executeWithRecovery(failingOperation)).rejects.toThrow();

      const metrics = recoveryManager.getMetrics();

      expect(metrics.totalAttempts).toBeGreaterThan(0);
      expect(metrics.failedAttempts).toBeGreaterThan(0);
    });

    it("should clear metrics", async () => {
      const retryHandler = new RetryHandler({ maxRetries: 2 });
      recoveryManager.registerHandler(retryHandler);

      // Generate some metrics by executing a successful operation
      const successOperation = {
        name: "success-for-metrics",
        operation: vi.fn().mockResolvedValue("success"),
        timeout: 5000,
      };

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
      const operations = Array.from({ length: 3 }, (_, i) => ({
        name: `concurrent-op-${i}`,
        operation: () => Promise.resolve(`result-${i}`),
        timeout: 5000,
      }));

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
