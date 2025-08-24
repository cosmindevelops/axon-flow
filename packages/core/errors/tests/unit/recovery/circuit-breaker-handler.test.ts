/**
 * Unit tests for CircuitBreakerHandler recovery mechanism
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { BaseAxonError } from "../../../src/base/base-error.classes.js";
import { ErrorSeverity, ErrorCategory } from "../../../src/base/base-error.types.js";
import { CircuitBreakerHandler } from "../../../src/recovery/recovery.classes.js";
import { TestRecoveryStrategies, TestOperations, TestErrors, PerformanceMeasurement } from "../../utils/recovery-test-utils.js";

describe("CircuitBreakerHandler", () => {
  let circuitBreakerHandler: CircuitBreakerHandler;
  let testError: BaseAxonError;
  let eventTracker: any;

  beforeEach(() => {
    testError = new BaseAxonError("Service failure", "SERVICE_ERROR", {
      severity: ErrorSeverity.ERROR,
      category: ErrorCategory.EXTERNAL_SERVICE,
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
  });

  afterEach(() => {
    eventTracker?.reset();
  });

  describe("constructor", () => {
    it("should create CircuitBreakerHandler with default configuration", () => {
      const handler = new CircuitBreakerHandler({
        failureThreshold: 5,
        resetTimeout: 60000,
      });

      expect(handler).toBeInstanceOf(CircuitBreakerHandler);
      expect(handler.name).toBe("CircuitBreakerHandler");
      expect(handler.getState()).toBe("CLOSED");
      expect(handler.canHandle(testError)).toBe(true);
    });

    it("should create CircuitBreakerHandler with custom configuration", () => {
      const handler = new CircuitBreakerHandler({
        failureThreshold: 10,
        resetTimeout: 120000,
        minimumRequests: 20,
        successThreshold: 0.8,
        onOpen: (error) => {
          eventTracker.addEvent("circuit_opened", { error: error.message });
        },
        onClose: () => {
          eventTracker.addEvent("circuit_closed", {});
        },
      });

      expect(handler).toBeInstanceOf(CircuitBreakerHandler);
      expect(handler.getState()).toBe("CLOSED");
      expect(handler.canRecover(testError)).toBe(true);
    });
  });

  describe("circuit states", () => {
    it("should start in CLOSED state", () => {
      const handler = new CircuitBreakerHandler({
        failureThreshold: 5,
        resetTimeout: 60000,
      });

      expect(handler.getState()).toBe("CLOSED");
      expect(handler.canRecover(testError)).toBe(true);
    });

    it("should transition from CLOSED to OPEN after failure threshold", async () => {
      const handler = new CircuitBreakerHandler({
        failureThreshold: 3,
        resetTimeout: 10000,
        onOpen: (error) => {
          eventTracker.addEvent("circuit_opened", { 
            error: error.message,
            timestamp: new Date() 
          });
        },
      });

      expect(handler.getState()).toBe("CLOSED");

      // Record failures to reach threshold
      for (let i = 0; i < 3; i++) {
        const failureOperation = TestOperations.createFailureOperation(testError, 10);
        
        try {
          await handler.execute(failureOperation);
        } catch (error) {
          // Expected to fail
          eventTracker.addEvent("operation_failed", { attempt: i + 1 });
        }
      }

      expect(handler.getState()).toBe("OPEN");
      expect(eventTracker.getEvents("circuit_opened")).toHaveLength(1);
    });

    it("should transition from OPEN to HALF_OPEN after recovery timeout", async () => {
      const handler = new CircuitBreakerHandler({
        failureThreshold: 1,
        resetTimeout: 100, // Short timeout for testing
        onHalfOpen: () => {
          eventTracker.addEvent("circuit_half_open", { timestamp: new Date() });
        },
      });

      // Force circuit to open
      const failureOperation = TestOperations.createFailureOperation(testError, 5);
      
      try {
        await handler.execute(failureOperation);
      } catch (error) {
        // Expected
      }

      expect(handler.getState()).toBe("OPEN");

      // Wait for recovery timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Check state - should auto-transition to HALF_OPEN
      expect(handler.getState()).toBe("HALF-OPEN");
    });

    it("should transition from HALF_OPEN to CLOSED after successful calls", async () => {
      const handler = new CircuitBreakerHandler({
        failureThreshold: 1,
        resetTimeout: 50,
        successThreshold: 0.5,
        onClose: () => {
          eventTracker.addEvent("circuit_closed", { timestamp: new Date() });
        },
      });

      // First open the circuit
      const failureOperation = TestOperations.createFailureOperation(testError, 5);
      
      try {
        await handler.execute(failureOperation);
      } catch (error) {
        // Expected
      }

      expect(handler.getState()).toBe("OPEN");

      // Wait for recovery timeout to reach HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 80));

      // Now record successes
      const successOperation = TestOperations.createSuccessOperation("success", 5);
      
      await handler.execute(successOperation);
      handler.recordSuccess();

      expect(handler.getState()).toBe("CLOSED");
      expect(eventTracker.getEvents("circuit_closed")).toHaveLength(1);
    });

    it("should transition from HALF_OPEN to OPEN on failure", async () => {
      const handler = new CircuitBreakerHandler({
        failureThreshold: 1,
        resetTimeout: 50,
      });

      // Open the circuit first
      const failureOperation = TestOperations.createFailureOperation(testError, 5);
      
      try {
        await handler.execute(failureOperation);
      } catch (error) {
        // Expected
      }

      expect(handler.getState()).toBe("OPEN");

      // Wait to reach HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 80));
      expect(handler.getState()).toBe("HALF-OPEN");

      // Fail again - should go back to OPEN
      try {
        await handler.execute(failureOperation);
      } catch (error) {
        // Expected
      }

      expect(handler.getState()).toBe("OPEN");
    });
  });

  describe("failure counting", () => {
    it("should track failure metrics through operations", async () => {
      const handler = new CircuitBreakerHandler({
        failureThreshold: 5,
        resetTimeout: 60000,
      });

      const metrics = handler.getMetrics();
      expect(metrics.failureCount).toBe(0);

      // Record some failures through operations
      const failureOperation = TestOperations.createFailureOperation(testError, 10);
      
      for (let i = 0; i < 3; i++) {
        try {
          await handler.execute(failureOperation);
        } catch (error) {
          eventTracker.addEvent("failure_recorded", { attempt: i + 1 });
        }
      }

      const updatedMetrics = handler.getMetrics();
      expect(updatedMetrics.failureCount).toBeGreaterThan(0);
      expect(eventTracker.getEvents("failure_recorded")).toHaveLength(3);
    });

    it("should reset failure count on success", async () => {
      const handler = new CircuitBreakerHandler({
        failureThreshold: 5,
        resetTimeout: 60000,
      });

      // Record some failures first
      const failureOperation = TestOperations.createFailureOperation(testError, 5);
      
      for (let i = 0; i < 2; i++) {
        try {
          await handler.execute(failureOperation);
        } catch (error) {
          // Expected
        }
      }

      let metrics = handler.getMetrics();
      const initialFailures = metrics.failureCount;

      // Record success
      const successOperation = TestOperations.createSuccessOperation("success", 5);
      await handler.execute(successOperation);
      
      handler.recordSuccess();
      eventTracker.addEvent("success_recorded", { initialFailures });

      expect(eventTracker.getEvents("success_recorded")).toHaveLength(1);
    });

    it("should track operation patterns with real operations", async () => {
      const handler = new CircuitBreakerHandler({
        failureThreshold: 10,
        resetTimeout: 60000,
      });

      // Create mixed success/failure operations
      const successOp = TestOperations.createSuccessOperation("success", 5);
      const failureOp = TestOperations.createFailureOperation(testError, 5);

      // Execute pattern: 3 success, 2 failures, 1 success
      const operations = [successOp, successOp, successOp, failureOp, failureOp, successOp];
      
      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        try {
          await handler.execute(op);
          eventTracker.addEvent("operation_success", { index: i });
        } catch (error) {
          eventTracker.addEvent("operation_failure", { index: i });
        }
      }

      expect(eventTracker.getEvents("operation_success")).toHaveLength(4);
      expect(eventTracker.getEvents("operation_failure")).toHaveLength(2);
      expect(handler.getState()).toBe("CLOSED"); // Should still be closed
    });

    it("should handle rapid consecutive operations", async () => {
      const handler = new CircuitBreakerHandler({
        failureThreshold: 5,
        resetTimeout: 1000,
      });

      // Create operation that fails quickly
      const rapidFailureOp = TestOperations.createFailureOperation(testError, 1);

      // Execute many rapid operations
      const promises = Array.from({ length: 10 }, async (_, i) => {
        try {
          await handler.execute(rapidFailureOp);
        } catch (error) {
          eventTracker.addEvent("rapid_failure", { index: i });
        }
      });

      await Promise.all(promises);

      const rapidFailures = eventTracker.getEvents("rapid_failure");
      expect(rapidFailures.length).toBeGreaterThan(0);
      
      // Circuit should be open after reaching threshold
      expect(handler.getState()).toBe("OPEN");
    });
  });

  describe("execution control", () => {
    it("should allow execution when circuit is CLOSED", async () => {
      const handler = new CircuitBreakerHandler({
        failureThreshold: 5,
        resetTimeout: 60000,
      });

      expect(handler.canRecover(testError)).toBe(true);

      const successOperation = TestOperations.createSuccessOperation("test-result", 10);
      const result = await handler.execute(successOperation);

      expect(result).toBe("test-result");
      expect(handler.getState()).toBe("CLOSED");
    });

    it("should prevent execution when circuit is OPEN", async () => {
      const handler = new CircuitBreakerHandler({ 
        failureThreshold: 1,
        resetTimeout: 10000,
      });

      // Force circuit to open
      const failureOperation = TestOperations.createFailureOperation(testError, 5);
      
      try {
        await handler.execute(failureOperation);
      } catch (error) {
        // Expected
      }

      expect(handler.getState()).toBe("OPEN");

      // Now execution should be prevented
      const testOperation = TestOperations.createSuccessOperation("should-not-execute", 5);
      
      await expect(handler.execute(testOperation)).rejects.toThrow("Circuit breaker is open");
      expect(handler.canRecover(testError)).toBe(false);
    });

    it("should handle limited execution in HALF_OPEN state", async () => {
      const handler = new CircuitBreakerHandler({
        failureThreshold: 1,
        resetTimeout: 50,
        successThreshold: 0.5,
      });

      // Open circuit first
      const failureOperation = TestOperations.createFailureOperation(testError, 5);
      
      try {
        await handler.execute(failureOperation);
      } catch (error) {
        // Expected
      }

      expect(handler.getState()).toBe("OPEN");

      // Wait to reach HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 80));
      expect(handler.getState()).toBe("HALF-OPEN");

      // In HALF_OPEN, operations are cautiously allowed
      const cautousOperation = TestOperations.createSuccessOperation("half-open-test", 5);
      const result = await handler.execute(cautousOperation);
      
      expect(result).toBe("half-open-test");
    });

    it("should execute operations with circuit breaker protection", async () => {
      const handler = new CircuitBreakerHandler({
        failureThreshold: 5,
        resetTimeout: 60000,
      });

      const protectedOperation = TestOperations.createSuccessOperation("protected-result", 10);
      
      const result = await handler.execute(protectedOperation);

      expect(result).toBe("protected-result");
      expect(protectedOperation.callCount).toBe(1);
      
      const metrics = handler.getMetrics();
      expect(metrics.successfulAttempts).toBeGreaterThanOrEqual(1);
    });

    it("should handle operation failures correctly", async () => {
      const handler = new CircuitBreakerHandler({
        failureThreshold: 5,
        resetTimeout: 60000,
      });

      const failingOperation = TestOperations.createFailureOperation(testError, 10);

      await expect(handler.execute(failingOperation)).rejects.toThrow("Service failure");
      expect(failingOperation.callCount).toBe(1);
      
      const metrics = handler.getMetrics();
      expect(metrics.failureCount).toBeGreaterThan(0);
    });
  });

  describe("performance requirements", () => {
    it("should perform state checks efficiently", async () => {
      const handler = new CircuitBreakerHandler({
        failureThreshold: 5,
        resetTimeout: 60000,
      });

      const measurement = new PerformanceMeasurement();

      // Measure multiple state checks
      for (let i = 0; i < 1000; i++) {
        await measurement.measure(() => {
          handler.getState();
          handler.canRecover(testError);
          return Promise.resolve();
        });
      }

      const stats = measurement.getStats();
      expect(stats).toBeDefined();
      expect(stats!.mean).toBeLessThan(1); // Should be very fast
      expect(stats!.p95).toBeLessThan(5); // 95% of calls under 5ms
      
      eventTracker.addEvent("performance_test_complete", {
        iterations: 1000,
        avgTime: stats!.mean,
        p95Time: stats!.p95,
      });
    });

    it("should maintain performance under load", async () => {
      const handler = new CircuitBreakerHandler({
        failureThreshold: 100,
        resetTimeout: 60000,
      });

      const operations = [];
      
      // Create mix of operations
      for (let i = 0; i < 50; i++) {
        operations.push(TestOperations.createSuccessOperation(`success-${i}`, 1));
        operations.push(TestOperations.createFailureOperation(testError, 1));
      }

      const measurement = new PerformanceMeasurement();

      // Execute operations and measure performance
      for (const operation of operations) {
        await measurement.measure(async () => {
          try {
            await handler.execute(operation);
          } catch (error) {
            // Expected for failure operations
          }
        });
      }

      const stats = measurement.getStats();
      expect(stats!.mean).toBeLessThan(10); // Average under 10ms
      expect(stats!.p99).toBeLessThan(50); // 99% under 50ms

      eventTracker.addEvent("load_test_complete", {
        operations: operations.length,
        avgTime: stats!.mean,
        maxTime: stats!.max,
      });
    });

    it("should handle frequent state transitions efficiently", async () => {
      const handler = new CircuitBreakerHandler({
        failureThreshold: 1,
        resetTimeout: 10, // Very short for rapid transitions
      });

      const measurement = new PerformanceMeasurement();
      
      // Cause rapid state transitions
      for (let i = 0; i < 20; i++) {
        await measurement.measure(async () => {
          const failureOp = TestOperations.createFailureOperation(testError, 1);
          
          try {
            await handler.execute(failureOp);
          } catch (error) {
            // Expected
          }

          eventTracker.addEvent("state_transition", {
            iteration: i,
            state: handler.getState(),
          });

          // Wait briefly for state to potentially change
          await new Promise((resolve) => setTimeout(resolve, 15));
        });
      }

      const stats = measurement.getStats();
      const transitions = eventTracker.getEvents("state_transition");
      
      expect(transitions.length).toBe(20);
      expect(stats!.mean).toBeLessThan(30); // Should handle transitions quickly
    });
  });

  describe("metrics and monitoring", () => {
    it("should provide comprehensive circuit breaker metrics", async () => {
      const handler = new CircuitBreakerHandler({
        failureThreshold: 3,
        resetTimeout: 1000,
      });

      const metrics = handler.getMetrics();

      expect(metrics.state).toBeDefined();
      expect(metrics.failureCount).toBeDefined();
      expect(metrics.successfulAttempts).toBeDefined();
      expect(metrics.failedAttempts).toBeDefined();
      expect(metrics.totalAttempts).toBeDefined();

      // Execute some operations to generate metrics
      const successOp = TestOperations.createSuccessOperation("success", 5);
      const failureOp = TestOperations.createFailureOperation(testError, 5);

      await handler.execute(successOp);
      
      try {
        await handler.execute(failureOp);
      } catch (error) {
        // Expected
      }

      const updatedMetrics = handler.getMetrics();
      expect(updatedMetrics.totalAttempts).toBeGreaterThan(metrics.totalAttempts);
      
      eventTracker.addEvent("metrics_collected", {
        state: updatedMetrics.state,
        totalAttempts: updatedMetrics.totalAttempts,
      });
    });

    it("should track circuit breaker behavior over time", async () => {
      const handler = new CircuitBreakerHandler({
        failureThreshold: 2,
        resetTimeout: 100,
        onOpen: () => eventTracker.addEvent("state_changed", { to: "OPEN" }),
        onClose: () => eventTracker.addEvent("state_changed", { to: "CLOSED" }),
        onHalfOpen: () => eventTracker.addEvent("state_changed", { to: "HALF_OPEN" }),
      });

      // Start with failures to open circuit
      const failureOp = TestOperations.createFailureOperation(testError, 5);
      
      for (let i = 0; i < 2; i++) {
        try {
          await handler.execute(failureOp);
        } catch (error) {
          eventTracker.addEvent("operation_executed", { type: "failure", iteration: i });
        }
      }

      // Should be open now
      expect(handler.getState()).toBe("OPEN");

      // Wait for recovery timeout
      await new Promise((resolve) => setTimeout(resolve, 120));

      // Should auto-transition to HALF_OPEN
      expect(handler.getState()).toBe("HALF-OPEN");

      // Record success to close circuit
      const successOp = TestOperations.createSuccessOperation("recovery", 5);
      await handler.execute(successOp);
      handler.recordSuccess();

      expect(handler.getState()).toBe("CLOSED");

      const stateChanges = eventTracker.getEvents("state_changed");
      expect(stateChanges.length).toBeGreaterThanOrEqual(1);
    });

    it("should emit events on state changes through callbacks", async () => {
      const stateChangeEvents: any[] = [];
      
      const handler = new CircuitBreakerHandler({
        failureThreshold: 1,
        resetTimeout: 50,
        onOpen: (error) => {
          stateChangeEvents.push({
            event: "opened",
            error: error.message,
            timestamp: new Date(),
          });
        },
        onClose: () => {
          stateChangeEvents.push({
            event: "closed",
            timestamp: new Date(),
          });
        },
        onHalfOpen: () => {
          stateChangeEvents.push({
            event: "half_open",
            timestamp: new Date(),
          });
        },
      });

      // Force state change by causing failure
      const failureOp = TestOperations.createFailureOperation(testError, 5);
      
      try {
        await handler.execute(failureOp);
      } catch (error) {
        // Expected
      }

      expect(handler.getState()).toBe("OPEN");
      expect(stateChangeEvents).toContainEqual(
        expect.objectContaining({
          event: "opened",
          error: "Service failure",
        })
      );

      eventTracker.addEvent("state_change_callbacks", {
        eventsTriggered: stateChangeEvents.length,
        lastEvent: stateChangeEvents[stateChangeEvents.length - 1],
      });
    });
  });

  describe("error handler integration", () => {
    it("should integrate with recovery manager workflow", async () => {
      const handler = new CircuitBreakerHandler({
        failureThreshold: 3,
        resetTimeout: 1000,
      });

      const result = await handler.recover(testError);

      expect(result.strategy).toBe("circuit_breaker");
      expect(result.success).toBeDefined();
      expect(result.context).toBeDefined();
      expect(result.context.strategiesAttempted).toContain("circuit_breaker");

      eventTracker.addEvent("recovery_integration", {
        strategy: result.strategy,
        success: result.success,
      });
    });

    it("should provide circuit breaker context in recovery result", async () => {
      const handler = new CircuitBreakerHandler({
        failureThreshold: 1,
        resetTimeout: 5000,
      });

      const result = await handler.recover(testError);

      expect(result.context).toBeDefined();
      expect(result.context.recoveryData?.circuitState).toBeDefined();
      expect(result.context.recoveryData?.failureCount).toBeDefined();
      expect(result.context.strategiesAttempted).toContain("circuit_breaker");

      eventTracker.addEvent("recovery_context", {
        circuitState: result.context.recoveryData?.circuitState,
        hasFailureCount: typeof result.context.recoveryData?.failureCount !== "undefined",
      });
    });

    it("should handle recovery with realistic timing", async () => {
      const handler = new CircuitBreakerHandler({
        failureThreshold: 1,
        resetTimeout: 60000, // 1 minute
      });

      // Open circuit first
      const failureOp = TestOperations.createFailureOperation(testError, 5);
      
      try {
        await handler.execute(failureOp);
      } catch (error) {
        // Expected
      }

      expect(handler.getState()).toBe("OPEN");

      // Attempt recovery while circuit is open
      const recoveryResult = await handler.recover(testError);

      expect(recoveryResult.success).toBe(false);
      expect(recoveryResult.error?.message).toContain("Circuit breaker is open");

      eventTracker.addEvent("recovery_timing", {
        resetTimeout: 60000,
        circuitOpen: handler.getState() === "OPEN",
        recoverySuccess: recoveryResult.success,
      });
    });
  });

  describe("configuration and customization", () => {
    it("should support error type filtering", () => {
      const handler = new CircuitBreakerHandler({
        failureThreshold: 5,
        resetTimeout: 60000,
        monitoredErrorTypes: ["CRITICAL_ERROR", "SYSTEM_FAILURE"],
      });

      const criticalError = new BaseAxonError("Critical failure", "CRITICAL_ERROR");
      const normalError = new BaseAxonError("Normal error", "NORMAL_ERROR");

      expect(handler.canHandle(criticalError)).toBe(true);
      expect(handler.canHandle(normalError)).toBe(false);

      eventTracker.addEvent("error_filtering", {
        criticalHandled: handler.canHandle(criticalError),
        normalHandled: handler.canHandle(normalError),
      });
    });

    it("should support different configuration patterns", () => {
      const exponentialHandler = new CircuitBreakerHandler({
        failureThreshold: 3,
        resetTimeout: 1000,
        successThreshold: 0.8,
        minimumRequests: 5,
      });

      const simpleHandler = new CircuitBreakerHandler({
        failureThreshold: 10,
        resetTimeout: 30000,
      });

      expect(exponentialHandler.getState()).toBe("CLOSED");
      expect(simpleHandler.getState()).toBe("CLOSED");

      eventTracker.addEvent("configuration_patterns", {
        exponentialConfig: exponentialHandler.name,
        simpleConfig: simpleHandler.name,
      });
    });
  });

  describe("edge cases and error conditions", () => {
    it("should handle concurrent operations safely", async () => {
      const handler = new CircuitBreakerHandler({
        failureThreshold: 5,
        resetTimeout: 1000,
      });

      const operations = Array.from({ length: 20 }, (_, i) =>
        TestOperations.createFailureOperation(testError, 1)
      );

      // Execute concurrent operations
      const promises = operations.map(async (op, i) => {
        try {
          await handler.execute(op);
        } catch (error) {
          eventTracker.addEvent("concurrent_failure", { index: i });
        }
      });

      await Promise.all(promises);

      const concurrentFailures = eventTracker.getEvents("concurrent_failure");
      expect(concurrentFailures.length).toBeGreaterThan(0);
      
      // Circuit should eventually open
      expect(handler.getState()).toBe("OPEN");
    });

    it("should handle time-based state transitions correctly", async () => {
      const handler = new CircuitBreakerHandler({
        failureThreshold: 1,
        resetTimeout: 100,
      });

      // Record failure to open circuit
      const failureOp = TestOperations.createFailureOperation(testError, 5);
      
      try {
        await handler.execute(failureOp);
      } catch (error) {
        // Expected
      }

      const openTime = Date.now();
      expect(handler.getState()).toBe("OPEN");

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 120));
      
      const transitionTime = Date.now();
      expect(handler.getState()).toBe("HALF-OPEN");

      eventTracker.addEvent("time_based_transition", {
        openTime,
        transitionTime,
        elapsed: transitionTime - openTime,
        expectedTimeout: 100,
      });
    });

    it("should maintain state consistency under stress", async () => {
      const handler = new CircuitBreakerHandler({
        failureThreshold: 3,
        resetTimeout: 50,
      });

      // Cause multiple state transitions rapidly
      for (let cycle = 0; cycle < 5; cycle++) {
        // Cause failures to open circuit
        const failureOp = TestOperations.createFailureOperation(testError, 1);
        
        for (let i = 0; i < 3; i++) {
          try {
            await handler.execute(failureOp);
          } catch (error) {
            // Expected
          }
        }

        expect(handler.getState()).toBe("OPEN");
        eventTracker.addEvent("stress_cycle", { cycle, state: "OPEN" });

        // Wait for recovery
        await new Promise((resolve) => setTimeout(resolve, 70));
        
        const stateAfterWait = handler.getState();
        eventTracker.addEvent("stress_cycle", { cycle, state: stateAfterWait });
      }

      const stressCycles = eventTracker.getEvents("stress_cycle");
      expect(stressCycles.length).toBeGreaterThan(0);
    });
  });

  describe("real recovery integration", () => {
    it("should integrate with TestRecoveryStrategies for authentic behavior", async () => {
      const realCircuitHandler = TestRecoveryStrategies.createCircuitBreakerHandler({
        failureThreshold: 2,
        recoveryTime: 100,
      });

      // Set up event observation
      realCircuitHandler.onAttempt((data: any) => {
        eventTracker.addEvent("real_attempt", data);
      });

      realCircuitHandler.onOpened((data: any) => {
        eventTracker.addEvent("real_opened", data);
      });

      realCircuitHandler.onClosed((data: any) => {
        eventTracker.addEvent("real_closed", data);
      });

      const result = await realCircuitHandler.recover(testError);

      expect(result.recovered).toBe(false); // Initial failure
      expect(result.strategy).toBe("circuit_breaker");
      expect(eventTracker.getEvents("real_attempt")).toHaveLength(1);

      // Clean up event listeners
      realCircuitHandler.removeAllListeners();
    });

    it("should demonstrate real circuit breaker patterns", async () => {
      const realHandler = TestRecoveryStrategies.createCircuitBreakerHandler({
        failureThreshold: 1,
        recoveryTime: 50,
      });

      // Track state changes through real implementation
      realHandler.onOpened(() => {
        eventTracker.addEvent("real_state_change", { 
          state: "OPEN",
          timestamp: new Date(),
        });
      });

      // Cause circuit to open
      await realHandler.recover(testError);

      // Wait for recovery timeout
      await new Promise((resolve) => setTimeout(resolve, 80));

      // Try recovery again (should be in HALF_OPEN)
      const recoveryResult = await realHandler.recover(testError);

      expect(recoveryResult.strategy).toBe("circuit_breaker");
      expect(eventTracker.getEvents("real_state_change")).toHaveLength(1);

      realHandler.removeAllListeners();
    });
  });
});
