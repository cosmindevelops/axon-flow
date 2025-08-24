/**
 * Unit tests for circuit-breaker classes
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  CircuitBreaker,
  initializeCircuitBreaker,
  executeWithCircuitBreaker,
  getCircuitBreaker,
  clearCircuitBreaker,
} from "../../../src/circuit-breaker/circuit-breaker.classes.js";
import type { ICircuitBreakerConfig } from "../../../src/types/index.js";
import { InMemoryTransport } from "../../utils/InMemoryTransport.js";

describe("CircuitBreaker", () => {
  let circuitBreaker: CircuitBreaker;
  let config: ICircuitBreakerConfig;
  let testTransport: InMemoryTransport;

  beforeEach(() => {
    config = {
      enabled: true,
      failureThreshold: 3,
      resetTimeoutMs: 100, // Reduced for faster tests
      monitorTimeWindowMs: 10000,
    };
    circuitBreaker = new CircuitBreaker(config);
    testTransport = new InMemoryTransport();
  });

  afterEach(() => {
    testTransport.reset();
  });

  describe("constructor", () => {
    it("should create circuit breaker instance with provided config", () => {
      expect(circuitBreaker).toBeDefined();
      expect(circuitBreaker).toBeInstanceOf(CircuitBreaker);
      expect(circuitBreaker.state).toBe("closed");
    });

    it("should initialize with closed state", () => {
      const newBreaker = new CircuitBreaker(config);
      expect(newBreaker.state).toBe("closed");
      const metrics = newBreaker.getMetrics();
      expect(metrics.failureCount).toBe(0);
      expect(metrics.successCount).toBe(0);
    });

    it("should accept different configuration values", () => {
      const customConfig: ICircuitBreakerConfig = {
        enabled: true,
        failureThreshold: 5,
        resetTimeoutMs: 5000,
        monitorTimeWindowMs: 60000,
      };
      const customBreaker = new CircuitBreaker(customConfig);
      expect(customBreaker).toBeDefined();
      expect(customBreaker.state).toBe("closed");
    });
  });

  describe("execute", () => {
    it("should execute function successfully when circuit is closed", async () => {
      let callCount = 0;
      const testFn = async () => {
        callCount++;
        await testTransport.write({ message: "test success", timestamp: new Date() });
        return "success";
      };

      const result = await circuitBreaker.execute(testFn);

      expect(result).toBe("success");
      expect(callCount).toBe(1);
      expect(testTransport.getLogCount()).toBe(1);
      expect(circuitBreaker.state).toBe("closed");
    });

    it("should reject immediately when circuit is open", async () => {
      let failCallCount = 0;
      let successCallCount = 0;

      // Open the circuit by causing failures
      const failingFn = async () => {
        failCallCount++;
        throw new Error("Test failure");
      };

      // Cause enough failures to open the circuit
      for (let i = 0; i < config.failureThreshold; i++) {
        await circuitBreaker.execute(failingFn).catch(() => {});
      }

      expect(circuitBreaker.state).toBe("open");

      // Try to execute when open
      const testFn = async () => {
        successCallCount++;
        return "should not execute";
      };
      await expect(circuitBreaker.execute(testFn)).rejects.toThrow("Circuit breaker is open");
      expect(successCallCount).toBe(0); // Should not have been called
      expect(failCallCount).toBe(config.failureThreshold); // Only called during failure setup
    });

    it("should handle function failures and increment failure count", async () => {
      const error = new Error("Function failed");
      let callCount = 0;
      const failingFn = async () => {
        callCount++;
        await testTransport.write({ error: "failure attempt", timestamp: new Date() });
        throw error;
      };

      await expect(circuitBreaker.execute(failingFn)).rejects.toThrow("Function failed");

      expect(callCount).toBe(1);
      expect(testTransport.getLogCount()).toBe(1);
      const metrics = circuitBreaker.getMetrics();
      expect(metrics.failureCount).toBe(1);
      expect(metrics.successCount).toBe(0);
    });

    it("should track success statistics", async () => {
      let callCount = 0;
      const successFn = async () => {
        callCount++;
        await testTransport.write({ message: `success ${callCount}`, timestamp: new Date() });
        return "success";
      };

      await circuitBreaker.execute(successFn);
      await circuitBreaker.execute(successFn);
      await circuitBreaker.execute(successFn);

      expect(callCount).toBe(3);
      expect(testTransport.getLogCount()).toBe(3);
      const metrics = circuitBreaker.getMetrics();
      expect(metrics.successCount).toBe(3);
      expect(metrics.failureCount).toBe(0);
    });

    it("should handle mixed success and failure scenarios", async () => {
      let successCallCount = 0;
      let failureCallCount = 0;

      const successFn = async () => {
        successCallCount++;
        await testTransport.write({ type: "success", count: successCallCount });
        return "success";
      };

      const failureFn = async () => {
        failureCallCount++;
        await testTransport.write({ type: "failure", count: failureCallCount });
        throw new Error("failure");
      };

      await circuitBreaker.execute(successFn);
      await circuitBreaker.execute(failureFn).catch(() => {});
      await circuitBreaker.execute(successFn);
      await circuitBreaker.execute(failureFn).catch(() => {});

      expect(successCallCount).toBe(2);
      expect(failureCallCount).toBe(2);
      expect(testTransport.getLogCount()).toBe(4);
      const metrics = circuitBreaker.getMetrics();
      expect(metrics.successCount).toBe(2);
      expect(metrics.failureCount).toBe(2);
      expect(circuitBreaker.state).toBe("closed"); // Still closed, threshold not reached
    });
  });

  describe("state transitions", () => {
    it("should transition from closed to open after reaching failure threshold", async () => {
      let callCount = 0;
      const failingFn = async () => {
        callCount++;
        await testTransport.write({ failureAttempt: callCount });
        throw new Error("Test failure");
      };

      expect(circuitBreaker.state).toBe("closed");

      // Cause failures up to threshold
      for (let i = 0; i < config.failureThreshold; i++) {
        await circuitBreaker.execute(failingFn).catch(() => {});
      }

      expect(circuitBreaker.state).toBe("open");
      expect(callCount).toBe(config.failureThreshold);
      expect(testTransport.getLogCount()).toBe(config.failureThreshold);
      const metrics = circuitBreaker.getMetrics();
      expect(metrics.failureCount).toBe(config.failureThreshold);
    });

    it("should transition from open to half-open after timeout", async () => {
      let failCallCount = 0;
      let successCallCount = 0;

      const failingFn = async () => {
        failCallCount++;
        throw new Error("Test failure");
      };

      // Open the circuit
      for (let i = 0; i < config.failureThreshold; i++) {
        await circuitBreaker.execute(failingFn).catch(() => {});
      }

      expect(circuitBreaker.state).toBe("open");

      // Wait past the reset timeout using real timing
      await new Promise((resolve) => setTimeout(resolve, config.resetTimeoutMs + 10));

      // Next execution attempt should move to half-open
      const testFn = async () => {
        successCallCount++;
        await testTransport.write({ recovery: "success", attempt: successCallCount });
        return "success";
      };
      await circuitBreaker.execute(testFn);

      expect(successCallCount).toBe(1);
      expect(testTransport.hasLog((log) => Boolean(log.recovery))).toBe(true);
      // After successful execution in half-open, should be closed
      expect(circuitBreaker.state).toBe("closed");
    });

    it("should transition from half-open to closed on success", async () => {
      let failCallCount = 0;
      let successCallCount = 0;

      const failingFn = async () => {
        failCallCount++;
        throw new Error("Test failure");
      };

      const successFn = async () => {
        successCallCount++;
        await testTransport.write({ recovery: "successful", count: successCallCount });
        return "success";
      };

      // Open the circuit
      for (let i = 0; i < config.failureThreshold; i++) {
        await circuitBreaker.execute(failingFn).catch(() => {});
      }

      // Wait to allow half-open
      await new Promise((resolve) => setTimeout(resolve, config.resetTimeoutMs + 10));

      // Successful execution should close the circuit
      await circuitBreaker.execute(successFn);
      expect(circuitBreaker.state).toBe("closed");
      expect(successCallCount).toBe(1);
      expect(testTransport.hasLog((log) => Boolean(log.recovery))).toBe(true);

      // Metrics should be reset
      const metrics = circuitBreaker.getMetrics();
      expect(metrics.failureCount).toBe(0);
      expect(metrics.successCount).toBe(0);
    });

    it("should transition from half-open back to open on failure", async () => {
      let callCount = 0;

      const failingFn = async () => {
        callCount++;
        await testTransport.write({ failedRecovery: callCount });
        throw new Error("Test failure");
      };

      // Open the circuit
      for (let i = 0; i < config.failureThreshold; i++) {
        await circuitBreaker.execute(failingFn).catch(() => {});
      }

      expect(circuitBreaker.state).toBe("open");
      const initialCallCount = callCount;

      // Wait to allow half-open
      await new Promise((resolve) => setTimeout(resolve, config.resetTimeoutMs + 10));

      // Failure in half-open should reopen the circuit
      await circuitBreaker.execute(failingFn).catch(() => {});

      expect(circuitBreaker.state).toBe("open");
      expect(callCount).toBe(initialCallCount + 1);
      expect(testTransport.hasLog((log) => Boolean(log.failedRecovery))).toBe(true);
    });
  });

  describe("timeout handling", () => {
    it("should timeout long-running operations", async () => {
      let callCount = 0;
      const slowFn = async () => {
        callCount++;
        await testTransport.write({ slowOperation: "started", attempt: callCount });
        // This promise will be racing with the timeout
        // We use a much longer delay than the reset timeout
        return new Promise((resolve) => {
          setTimeout(() => resolve("slow"), config.resetTimeoutMs * 2);
        });
      };

      // Start the execution which will timeout
      const executePromise = circuitBreaker.execute(slowFn);

      await expect(executePromise).rejects.toThrow("Circuit breaker timeout");
      expect(callCount).toBe(1);
      expect(testTransport.hasLog((log) => Boolean(log.slowOperation))).toBe(true);
    });

    it("should treat timeouts as failures", async () => {
      let callCount = 0;
      const slowFn = async () => {
        callCount++;
        await testTransport.write({ timeoutTest: callCount });
        return new Promise((resolve) => {
          setTimeout(() => resolve("slow"), config.resetTimeoutMs * 2);
        });
      };

      // Start the execution which will timeout
      const executePromise = circuitBreaker.execute(slowFn).catch(() => {});
      await executePromise;

      expect(callCount).toBe(1);
      expect(testTransport.getLogCount()).toBe(1);
      const metrics = circuitBreaker.getMetrics();
      expect(metrics.failureCount).toBe(1);
      expect(metrics.successCount).toBe(0);
    });

    it("should open circuit after timeout failures reach threshold", async () => {
      let callCount = 0;
      const slowFn = async () => {
        callCount++;
        await testTransport.write({ timeoutFailure: callCount });
        return new Promise((resolve) => {
          setTimeout(() => resolve("slow"), config.resetTimeoutMs * 2);
        });
      };

      for (let i = 0; i < config.failureThreshold; i++) {
        const executePromise = circuitBreaker.execute(slowFn).catch(() => {});
        await executePromise;
      }

      expect(callCount).toBe(config.failureThreshold);
      expect(testTransport.getLogCount()).toBe(config.failureThreshold);
      expect(circuitBreaker.state).toBe("open");
    });
  });

  describe("reset", () => {
    it("should reset all metrics and state", async () => {
      let failCallCount = 0;
      let successCallCount = 0;

      const failingFn = async () => {
        failCallCount++;
        await testTransport.write({ resetTest: "failure", count: failCallCount });
        throw new Error("Test failure");
      };

      const successFn = async () => {
        successCallCount++;
        await testTransport.write({ resetTest: "success", count: successCallCount });
        return "success";
      };

      // Create some history
      await circuitBreaker.execute(successFn);
      await circuitBreaker.execute(failingFn).catch(() => {});

      expect(testTransport.getLogCount()).toBe(2);

      // Reset
      circuitBreaker.reset();

      expect(circuitBreaker.state).toBe("closed");
      const metrics = circuitBreaker.getMetrics();
      expect(metrics.failureCount).toBe(0);
      expect(metrics.successCount).toBe(0);
      expect(metrics.nextRetryTime).toBeUndefined();

      // Verify calls still happened but state is reset
      expect(failCallCount).toBe(1);
      expect(successCallCount).toBe(1);
    });

    it("should allow execution after reset from open state", async () => {
      let failCallCount = 0;
      let successCallCount = 0;

      const failingFn = async () => {
        failCallCount++;
        throw new Error("Test failure");
      };

      // Open the circuit
      for (let i = 0; i < config.failureThreshold; i++) {
        await circuitBreaker.execute(failingFn).catch(() => {});
      }

      expect(circuitBreaker.state).toBe("open");
      expect(failCallCount).toBe(config.failureThreshold);

      // Reset
      circuitBreaker.reset();

      // Should be able to execute again
      const successFn = async () => {
        successCallCount++;
        await testTransport.write({ postReset: "success", attempt: successCallCount });
        return "success";
      };
      const result = await circuitBreaker.execute(successFn);

      expect(result).toBe("success");
      expect(successCallCount).toBe(1);
      expect(testTransport.hasLog((log) => Boolean(log.postReset))).toBe(true);
    });
  });

  describe("getMetrics", () => {
    it("should return current metrics", () => {
      const metrics = circuitBreaker.getMetrics();

      expect(metrics).toEqual({
        failureCount: 0,
        successCount: 0,
        state: "closed",
        nextRetryTime: undefined,
      });
    });

    it("should include next retry time when circuit is open", async () => {
      let callCount = 0;
      const failingFn = async () => {
        callCount++;
        await testTransport.write({ metricsTest: "opening", attempt: callCount });
        throw new Error("Test failure");
      };

      // Open the circuit
      for (let i = 0; i < config.failureThreshold; i++) {
        await circuitBreaker.execute(failingFn).catch(() => {});
      }

      expect(callCount).toBe(config.failureThreshold);
      expect(testTransport.getLogCount()).toBe(config.failureThreshold);
      const metrics = circuitBreaker.getMetrics();
      expect(metrics.state).toBe("open");
      expect(metrics.nextRetryTime).toBeDefined();
      expect(typeof metrics.nextRetryTime).toBe("number");
    });

    it("should update metrics after each operation", async () => {
      let successCallCount = 0;
      let failureCallCount = 0;

      const successFn = async () => {
        successCallCount++;
        await testTransport.write({ metrics: "success", count: successCallCount });
        return "success";
      };

      const failureFn = async () => {
        failureCallCount++;
        await testTransport.write({ metrics: "failure", count: failureCallCount });
        throw new Error("failure");
      };

      let metrics = circuitBreaker.getMetrics();
      expect(metrics.successCount).toBe(0);
      expect(metrics.failureCount).toBe(0);

      await circuitBreaker.execute(successFn);
      expect(successCallCount).toBe(1);
      metrics = circuitBreaker.getMetrics();
      expect(metrics.successCount).toBe(1);

      await circuitBreaker.execute(failureFn).catch(() => {});
      expect(failureCallCount).toBe(1);
      expect(testTransport.getLogCount()).toBe(2);
      metrics = circuitBreaker.getMetrics();
      expect(metrics.failureCount).toBe(1);
    });
  });
});

describe("Global Circuit Breaker Functions", () => {
  let globalTestTransport: InMemoryTransport;

  beforeEach(() => {
    clearCircuitBreaker();
    globalTestTransport = new InMemoryTransport();
  });

  afterEach(() => {
    clearCircuitBreaker();
    globalTestTransport.reset();
  });

  describe("initializeCircuitBreaker", () => {
    it("should initialize global circuit breaker", () => {
      const config: ICircuitBreakerConfig = {
        enabled: true,
        failureThreshold: 3,
        resetTimeoutMs: 1000,
        monitorTimeWindowMs: 10000,
      };

      initializeCircuitBreaker(config);

      const breaker = getCircuitBreaker();
      expect(breaker).toBeDefined();
      expect(breaker).toBeInstanceOf(CircuitBreaker);
    });

    it("should replace existing circuit breaker when called again", () => {
      const config1: ICircuitBreakerConfig = {
        enabled: true,
        failureThreshold: 3,
        resetTimeoutMs: 1000,
        monitorTimeWindowMs: 10000,
      };

      const config2: ICircuitBreakerConfig = {
        enabled: true,
        failureThreshold: 5,
        resetTimeoutMs: 2000,
        monitorTimeWindowMs: 20000,
      };

      initializeCircuitBreaker(config1);
      const breaker1 = getCircuitBreaker();

      initializeCircuitBreaker(config2);
      const breaker2 = getCircuitBreaker();

      expect(breaker2).not.toBe(breaker1);
    });
  });

  describe("executeWithCircuitBreaker", () => {
    it("should execute function directly when no circuit breaker is configured", async () => {
      let callCount = 0;
      const testFn = async () => {
        callCount++;
        await globalTestTransport.write({ directExecution: callCount });
        return "success";
      };

      const result = await executeWithCircuitBreaker(testFn);

      expect(result).toBe("success");
      expect(callCount).toBe(1);
      expect(globalTestTransport.getLogCount()).toBe(1);
    });

    it("should use circuit breaker when configured", async () => {
      const config: ICircuitBreakerConfig = {
        enabled: true,
        failureThreshold: 3,
        resetTimeoutMs: 100,
        monitorTimeWindowMs: 10000,
      };

      initializeCircuitBreaker(config);

      let callCount = 0;
      const testFn = async () => {
        callCount++;
        await globalTestTransport.write({ globalBreaker: "success", attempt: callCount });
        return "success";
      };
      const result = await executeWithCircuitBreaker(testFn);

      expect(result).toBe("success");
      expect(callCount).toBe(1);
      expect(globalTestTransport.hasLog((log) => Boolean(log.globalBreaker))).toBe(true);

      const breaker = getCircuitBreaker();
      const metrics = breaker?.getMetrics();
      expect(metrics?.successCount).toBe(1);
    });

    it("should handle failures through circuit breaker", async () => {
      const config: ICircuitBreakerConfig = {
        enabled: true,
        failureThreshold: 2,
        resetTimeoutMs: 100,
        monitorTimeWindowMs: 10000,
      };

      initializeCircuitBreaker(config);

      let callCount = 0;
      const failingFn = async () => {
        callCount++;
        await globalTestTransport.write({ globalFailure: callCount });
        throw new Error("Test failure");
      };

      // First failure
      await expect(executeWithCircuitBreaker(failingFn)).rejects.toThrow("Test failure");

      // Second failure should open the circuit
      await expect(executeWithCircuitBreaker(failingFn)).rejects.toThrow("Test failure");

      // Third attempt should be rejected by open circuit
      await expect(executeWithCircuitBreaker(failingFn)).rejects.toThrow("Circuit breaker is open");

      // Function should not have been called the third time
      expect(callCount).toBe(2);
      expect(globalTestTransport.getLogCount()).toBe(2);
    });
  });

  describe("getCircuitBreaker", () => {
    it("should return undefined when not initialized", () => {
      const breaker = getCircuitBreaker();
      expect(breaker).toBeUndefined();
    });

    it("should return circuit breaker instance after initialization", () => {
      const config: ICircuitBreakerConfig = {
        enabled: true,
        failureThreshold: 3,
        resetTimeoutMs: 1000,
        monitorTimeWindowMs: 10000,
      };

      initializeCircuitBreaker(config);

      const breaker = getCircuitBreaker();
      expect(breaker).toBeDefined();
      expect(breaker).toBeInstanceOf(CircuitBreaker);
      expect(breaker?.state).toBe("closed");
    });
  });

  describe("clearCircuitBreaker", () => {
    it("should clear the global circuit breaker instance", () => {
      const config: ICircuitBreakerConfig = {
        enabled: true,
        failureThreshold: 3,
        resetTimeoutMs: 1000,
        monitorTimeWindowMs: 10000,
      };

      initializeCircuitBreaker(config);
      expect(getCircuitBreaker()).toBeDefined();

      clearCircuitBreaker();
      expect(getCircuitBreaker()).toBeUndefined();
    });

    it("should be safe to call when no circuit breaker exists", () => {
      expect(() => clearCircuitBreaker()).not.toThrow();
      expect(getCircuitBreaker()).toBeUndefined();
    });
  });
});

describe("Circuit Breaker Performance Tests", () => {
  let circuitBreaker: CircuitBreaker;
  let perfTestTransport: InMemoryTransport;

  beforeEach(() => {
    const config: ICircuitBreakerConfig = {
      enabled: true,
      failureThreshold: 3,
      resetTimeoutMs: 100,
      monitorTimeWindowMs: 10000,
    };
    circuitBreaker = new CircuitBreaker(config);
    perfTestTransport = new InMemoryTransport();
  });

  afterEach(() => {
    perfTestTransport.reset();
  });

  it("should have minimal overhead for successful operations", async () => {
    let callCount = 0;
    const fastFn = async () => {
      callCount++;
      await perfTestTransport.write({ fastOperation: callCount });
      return "fast";
    };

    const iterations = 100; // Reduced for realistic test performance
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      await circuitBreaker.execute(fastFn);
    }

    const duration = performance.now() - start;
    const avgOverhead = duration / iterations;

    // Average overhead should be reasonable for real operations including I/O
    expect(avgOverhead).toBeLessThan(10); // Allow for real transport overhead
    expect(callCount).toBe(iterations);
    expect(perfTestTransport.getLogCount()).toBe(iterations);
  });

  it("should handle high-throughput scenarios efficiently", async () => {
    let callCount = 0;
    const testFn = async () => {
      callCount++;
      await perfTestTransport.write({ throughput: callCount });
      return "success";
    };

    // Execute many operations concurrently
    const concurrentOperations = 50; // Reduced for realistic testing
    const promises = Array.from({ length: concurrentOperations }, () => circuitBreaker.execute(testFn));

    const results = await Promise.all(promises);

    expect(results).toHaveLength(concurrentOperations);
    expect(results.every((r) => r === "success")).toBe(true);
    expect(callCount).toBe(concurrentOperations);
    expect(perfTestTransport.getLogCount()).toBe(concurrentOperations);

    const metrics = circuitBreaker.getMetrics();
    expect(metrics.successCount).toBe(concurrentOperations);
  });

  it("should fail fast when circuit is open", async () => {
    let failCallCount = 0;
    const failingFn = async () => {
      failCallCount++;
      await perfTestTransport.write({ failFast: failCallCount });
      throw new Error("Test failure");
    };

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      await circuitBreaker.execute(failingFn).catch(() => {});
    }

    expect(circuitBreaker.state).toBe("open");

    // Measure time for rejecting when open
    const start = performance.now();
    const attempts = 100; // Reduced for testing

    for (let i = 0; i < attempts; i++) {
      await circuitBreaker.execute(failingFn).catch(() => {});
    }

    const duration = performance.now() - start;

    // Should reject quickly when open (less than 1ms per rejection)
    expect(duration / attempts).toBeLessThan(1);

    // Function should only have been called for the initial 3 failures
    expect(failCallCount).toBe(3);
    expect(perfTestTransport.getLogCount()).toBe(3);
  });
});
