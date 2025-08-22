/**
 * Unit tests for circuit-breaker classes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  CircuitBreaker,
  initializeCircuitBreaker,
  executeWithCircuitBreaker,
  getCircuitBreaker,
  clearCircuitBreaker,
} from "../../../src/circuit-breaker/circuit-breaker.classes.js";
import type { ICircuitBreakerConfig } from "../../../src/types/index.js";

describe("CircuitBreaker", () => {
  let circuitBreaker: CircuitBreaker;
  let config: ICircuitBreakerConfig;

  beforeEach(() => {
    config = {
      enabled: true,
      failureThreshold: 3,
      resetTimeoutMs: 1000,
      monitorTimeWindowMs: 10000,
    };
    circuitBreaker = new CircuitBreaker(config);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
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
      const testFn = vi.fn().mockResolvedValue("success");

      const result = await circuitBreaker.execute(testFn);

      expect(result).toBe("success");
      expect(testFn).toHaveBeenCalledOnce();
      expect(circuitBreaker.state).toBe("closed");
    });

    it("should reject immediately when circuit is open", async () => {
      // Open the circuit by causing failures
      const failingFn = vi.fn().mockRejectedValue(new Error("Test failure"));

      // Cause enough failures to open the circuit
      for (let i = 0; i < config.failureThreshold; i++) {
        await circuitBreaker.execute(failingFn).catch(() => {});
      }

      expect(circuitBreaker.state).toBe("open");

      // Try to execute when open
      const testFn = vi.fn().mockResolvedValue("should not execute");
      await expect(circuitBreaker.execute(testFn)).rejects.toThrow("Circuit breaker is open");
      expect(testFn).not.toHaveBeenCalled();
    });

    it("should handle function failures and increment failure count", async () => {
      const error = new Error("Function failed");
      const failingFn = vi.fn().mockRejectedValue(error);

      await expect(circuitBreaker.execute(failingFn)).rejects.toThrow("Function failed");

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.failureCount).toBe(1);
      expect(metrics.successCount).toBe(0);
    });

    it("should track success statistics", async () => {
      const successFn = vi.fn().mockResolvedValue("success");

      await circuitBreaker.execute(successFn);
      await circuitBreaker.execute(successFn);
      await circuitBreaker.execute(successFn);

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.successCount).toBe(3);
      expect(metrics.failureCount).toBe(0);
    });

    it("should handle mixed success and failure scenarios", async () => {
      const successFn = vi.fn().mockResolvedValue("success");
      const failureFn = vi.fn().mockRejectedValue(new Error("failure"));

      await circuitBreaker.execute(successFn);
      await circuitBreaker.execute(failureFn).catch(() => {});
      await circuitBreaker.execute(successFn);
      await circuitBreaker.execute(failureFn).catch(() => {});

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.successCount).toBe(2);
      expect(metrics.failureCount).toBe(2);
      expect(circuitBreaker.state).toBe("closed"); // Still closed, threshold not reached
    });
  });

  describe("state transitions", () => {
    it("should transition from closed to open after reaching failure threshold", async () => {
      const failingFn = vi.fn().mockRejectedValue(new Error("Test failure"));

      expect(circuitBreaker.state).toBe("closed");

      // Cause failures up to threshold
      for (let i = 0; i < config.failureThreshold; i++) {
        await circuitBreaker.execute(failingFn).catch(() => {});
      }

      expect(circuitBreaker.state).toBe("open");
      const metrics = circuitBreaker.getMetrics();
      expect(metrics.failureCount).toBe(config.failureThreshold);
    });

    it("should transition from open to half-open after timeout", async () => {
      const failingFn = vi.fn().mockRejectedValue(new Error("Test failure"));

      // Open the circuit
      for (let i = 0; i < config.failureThreshold; i++) {
        await circuitBreaker.execute(failingFn).catch(() => {});
      }

      expect(circuitBreaker.state).toBe("open");

      // Advance time past the reset timeout
      vi.advanceTimersByTime(config.resetTimeoutMs + 1);

      // Next execution attempt should move to half-open
      const testFn = vi.fn().mockResolvedValue("success");
      await circuitBreaker.execute(testFn);

      // After successful execution in half-open, should be closed
      expect(circuitBreaker.state).toBe("closed");
    });

    it("should transition from half-open to closed on success", async () => {
      const failingFn = vi.fn().mockRejectedValue(new Error("Test failure"));
      const successFn = vi.fn().mockResolvedValue("success");

      // Open the circuit
      for (let i = 0; i < config.failureThreshold; i++) {
        await circuitBreaker.execute(failingFn).catch(() => {});
      }

      // Move to half-open
      vi.advanceTimersByTime(config.resetTimeoutMs + 1);

      // Successful execution should close the circuit
      await circuitBreaker.execute(successFn);
      expect(circuitBreaker.state).toBe("closed");

      // Metrics should be reset
      const metrics = circuitBreaker.getMetrics();
      expect(metrics.failureCount).toBe(0);
      expect(metrics.successCount).toBe(0);
    });

    it("should transition from half-open back to open on failure", async () => {
      const failingFn = vi.fn().mockRejectedValue(new Error("Test failure"));

      // Open the circuit
      for (let i = 0; i < config.failureThreshold; i++) {
        await circuitBreaker.execute(failingFn).catch(() => {});
      }

      expect(circuitBreaker.state).toBe("open");

      // Move time forward to allow half-open
      vi.advanceTimersByTime(config.resetTimeoutMs + 1);

      // Failure in half-open should reopen the circuit
      await circuitBreaker.execute(failingFn).catch(() => {});

      expect(circuitBreaker.state).toBe("open");
    });
  });

  describe("timeout handling", () => {
    it("should timeout long-running operations", async () => {
      const slowFn = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          // This promise will be racing with the timeout
          // We use a much longer delay than the reset timeout
          setTimeout(() => resolve("slow"), config.resetTimeoutMs * 2);
        });
      });

      // Start the execution which will timeout
      const executePromise = circuitBreaker.execute(slowFn);

      // Advance timers to trigger the timeout
      vi.advanceTimersByTime(config.resetTimeoutMs + 1);

      await expect(executePromise).rejects.toThrow("Circuit breaker timeout");
    });

    it("should treat timeouts as failures", async () => {
      const slowFn = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve("slow"), config.resetTimeoutMs * 2);
        });
      });

      // Start the execution which will timeout
      const executePromise = circuitBreaker.execute(slowFn).catch(() => {});

      // Advance timers to trigger the timeout
      vi.advanceTimersByTime(config.resetTimeoutMs + 1);

      await executePromise;

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.failureCount).toBe(1);
      expect(metrics.successCount).toBe(0);
    });

    it("should open circuit after timeout failures reach threshold", async () => {
      const slowFn = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve("slow"), config.resetTimeoutMs * 2);
        });
      });

      for (let i = 0; i < config.failureThreshold; i++) {
        const executePromise = circuitBreaker.execute(slowFn).catch(() => {});
        vi.advanceTimersByTime(config.resetTimeoutMs + 1);
        await executePromise;
      }

      expect(circuitBreaker.state).toBe("open");
    });
  });

  describe("reset", () => {
    it("should reset all metrics and state", async () => {
      const failingFn = vi.fn().mockRejectedValue(new Error("Test failure"));
      const successFn = vi.fn().mockResolvedValue("success");

      // Create some history
      await circuitBreaker.execute(successFn);
      await circuitBreaker.execute(failingFn).catch(() => {});

      // Reset
      circuitBreaker.reset();

      expect(circuitBreaker.state).toBe("closed");
      const metrics = circuitBreaker.getMetrics();
      expect(metrics.failureCount).toBe(0);
      expect(metrics.successCount).toBe(0);
      expect(metrics.nextRetryTime).toBeUndefined();
    });

    it("should allow execution after reset from open state", async () => {
      const failingFn = vi.fn().mockRejectedValue(new Error("Test failure"));

      // Open the circuit
      for (let i = 0; i < config.failureThreshold; i++) {
        await circuitBreaker.execute(failingFn).catch(() => {});
      }

      expect(circuitBreaker.state).toBe("open");

      // Reset
      circuitBreaker.reset();

      // Should be able to execute again
      const successFn = vi.fn().mockResolvedValue("success");
      const result = await circuitBreaker.execute(successFn);

      expect(result).toBe("success");
      expect(successFn).toHaveBeenCalledOnce();
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
      const failingFn = vi.fn().mockRejectedValue(new Error("Test failure"));

      // Open the circuit
      for (let i = 0; i < config.failureThreshold; i++) {
        await circuitBreaker.execute(failingFn).catch(() => {});
      }

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.state).toBe("open");
      expect(metrics.nextRetryTime).toBeDefined();
      expect(typeof metrics.nextRetryTime).toBe("number");
    });

    it("should update metrics after each operation", async () => {
      const successFn = vi.fn().mockResolvedValue("success");
      const failureFn = vi.fn().mockRejectedValue(new Error("failure"));

      let metrics = circuitBreaker.getMetrics();
      expect(metrics.successCount).toBe(0);
      expect(metrics.failureCount).toBe(0);

      await circuitBreaker.execute(successFn);
      metrics = circuitBreaker.getMetrics();
      expect(metrics.successCount).toBe(1);

      await circuitBreaker.execute(failureFn).catch(() => {});
      metrics = circuitBreaker.getMetrics();
      expect(metrics.failureCount).toBe(1);
    });
  });
});

describe("Global Circuit Breaker Functions", () => {
  beforeEach(() => {
    clearCircuitBreaker();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearCircuitBreaker();
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
      const testFn = vi.fn().mockResolvedValue("success");

      const result = await executeWithCircuitBreaker(testFn);

      expect(result).toBe("success");
      expect(testFn).toHaveBeenCalledOnce();
    });

    it("should use circuit breaker when configured", async () => {
      const config: ICircuitBreakerConfig = {
        enabled: true,
        failureThreshold: 3,
        resetTimeoutMs: 1000,
        monitorTimeWindowMs: 10000,
      };

      initializeCircuitBreaker(config);

      const testFn = vi.fn().mockResolvedValue("success");
      const result = await executeWithCircuitBreaker(testFn);

      expect(result).toBe("success");
      expect(testFn).toHaveBeenCalledOnce();

      const breaker = getCircuitBreaker();
      const metrics = breaker?.getMetrics();
      expect(metrics?.successCount).toBe(1);
    });

    it("should handle failures through circuit breaker", async () => {
      const config: ICircuitBreakerConfig = {
        enabled: true,
        failureThreshold: 2,
        resetTimeoutMs: 1000,
        monitorTimeWindowMs: 10000,
      };

      initializeCircuitBreaker(config);

      const failingFn = vi.fn().mockRejectedValue(new Error("Test failure"));

      // First failure
      await expect(executeWithCircuitBreaker(failingFn)).rejects.toThrow("Test failure");

      // Second failure should open the circuit
      await expect(executeWithCircuitBreaker(failingFn)).rejects.toThrow("Test failure");

      // Third attempt should be rejected by open circuit
      await expect(executeWithCircuitBreaker(failingFn)).rejects.toThrow("Circuit breaker is open");

      // Function should not have been called the third time
      expect(failingFn).toHaveBeenCalledTimes(2);
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

  beforeEach(() => {
    const config: ICircuitBreakerConfig = {
      enabled: true,
      failureThreshold: 3,
      resetTimeoutMs: 1000,
      monitorTimeWindowMs: 10000,
    };
    circuitBreaker = new CircuitBreaker(config);
  });

  it("should have minimal overhead for successful operations", async () => {
    const fastFn = vi.fn().mockResolvedValue("fast");

    const iterations = 1000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      await circuitBreaker.execute(fastFn);
    }

    const duration = performance.now() - start;
    const avgOverhead = duration / iterations;

    // Average overhead should be less than 1ms per operation
    expect(avgOverhead).toBeLessThan(1);
    expect(fastFn).toHaveBeenCalledTimes(iterations);
  });

  it("should handle high-throughput scenarios efficiently", async () => {
    const testFn = vi.fn().mockResolvedValue("success");

    // Execute many operations concurrently
    const promises = Array.from({ length: 100 }, () => circuitBreaker.execute(testFn));

    const results = await Promise.all(promises);

    expect(results).toHaveLength(100);
    expect(results.every((r) => r === "success")).toBe(true);
    expect(testFn).toHaveBeenCalledTimes(100);

    const metrics = circuitBreaker.getMetrics();
    expect(metrics.successCount).toBe(100);
  });

  it("should fail fast when circuit is open", async () => {
    const failingFn = vi.fn().mockRejectedValue(new Error("Test failure"));

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      await circuitBreaker.execute(failingFn).catch(() => {});
    }

    expect(circuitBreaker.state).toBe("open");

    // Measure time for rejecting when open
    const start = performance.now();
    const attempts = 1000;

    for (let i = 0; i < attempts; i++) {
      await circuitBreaker.execute(failingFn).catch(() => {});
    }

    const duration = performance.now() - start;

    // Should reject very quickly when open (less than 0.1ms per rejection)
    expect(duration / attempts).toBeLessThan(0.1);

    // Function should only have been called for the initial 3 failures
    expect(failingFn).toHaveBeenCalledTimes(3);
  });
});
