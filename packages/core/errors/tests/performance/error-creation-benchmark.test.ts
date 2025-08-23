/**
 * Performance benchmarks for error creation
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AggregateAxonError, BaseAxonError, ChainableError, ErrorFactory } from "../../src/base/base-error.classes.js";
import { ErrorCategory, ErrorSeverity } from "../../src/base/base-error.types.js";

/**
 * High-resolution timer for performance measurement
 */
class PerformanceTimer {
  private startTime: [number, number] | null = null;

  start(): void {
    this.startTime = process.hrtime();
  }

  end(): number {
    if (!this.startTime) {
      throw new Error("Timer not started");
    }
    const [seconds, nanoseconds] = process.hrtime(this.startTime);
    return seconds * 1000 + nanoseconds / 1_000_000; // Convert to milliseconds
  }
}

/**
 * Calculate statistics from measurements
 */
function calculateStats(measurements: number[]) {
  const sorted = [...measurements].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const mean = sum / sorted.length;

  const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / sorted.length;
  const stdDev = Math.sqrt(variance);

  return {
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    mean,
    median: sorted[Math.floor(sorted.length / 2)] ?? 0,
    p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
    p99: sorted[Math.floor(sorted.length * 0.99)] ?? 0,
    stdDev,
  };
}

describe("Error Creation Performance", () => {
  const ITERATIONS = 10000;
  const WARMUP_ITERATIONS = 1000;
  const MAX_ACCEPTABLE_TIME = 1.0; // 1ms threshold

  let timer: PerformanceTimer;

  beforeEach(() => {
    timer = new PerformanceTimer();

    // Warmup - JIT compilation
    for (let i = 0; i < WARMUP_ITERATIONS; i++) {
      new BaseAxonError("Warmup");
    }
  });

  afterEach(() => {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  describe("BaseAxonError performance", () => {
    it("should create errors within 1ms", () => {
      const measurements: number[] = [];

      for (let i = 0; i < ITERATIONS; i++) {
        timer.start();
        const _error = new BaseAxonError("Performance test error", "PERF_TEST", {
          severity: ErrorSeverity.ERROR,
          category: ErrorCategory.APPLICATION,
          component: "TestComponent",
          operation: "testOperation",
          metadata: {
            iteration: i,
            timestamp: Date.now(),
          },
        });
        const elapsed = timer.end();
        measurements.push(elapsed);
      }

      const stats = calculateStats(measurements);

      console.log("BaseAxonError Performance Stats:", {
        ...stats,
        iterations: ITERATIONS,
      });

      expect(stats.mean).toBeLessThan(MAX_ACCEPTABLE_TIME);
      expect(stats.median).toBeLessThan(MAX_ACCEPTABLE_TIME);
      expect(stats.p95).toBeLessThan(MAX_ACCEPTABLE_TIME);
      expect(stats.p99).toBeLessThan(MAX_ACCEPTABLE_TIME * 1.5); // Allow 50% margin for p99
    });

    it("should create minimal errors efficiently", () => {
      const measurements: number[] = [];

      for (let i = 0; i < ITERATIONS; i++) {
        timer.start();
        const _error = new BaseAxonError("Minimal error");
        const elapsed = timer.end();
        measurements.push(elapsed);
      }

      const stats = calculateStats(measurements);

      console.log("Minimal BaseAxonError Performance Stats:", stats);

      expect(stats.mean).toBeLessThan(MAX_ACCEPTABLE_TIME * 0.5); // Should be faster
      expect(stats.median).toBeLessThan(MAX_ACCEPTABLE_TIME * 0.5);
    });

    it("should handle error chaining efficiently", () => {
      const measurements: number[] = [];
      const cause = new Error("Root cause");

      for (let i = 0; i < ITERATIONS; i++) {
        timer.start();
        const error = new BaseAxonError("Chained error").withCause(cause).withContext({ metadata: { iteration: i } });
        const elapsed = timer.end();
        measurements.push(elapsed);
      }

      const stats = calculateStats(measurements);

      console.log("Chained Error Performance Stats:", stats);

      expect(stats.mean).toBeLessThan(MAX_ACCEPTABLE_TIME);
      expect(stats.p95).toBeLessThan(MAX_ACCEPTABLE_TIME * 1.2);
    });
  });

  describe("ChainableError performance", () => {
    it("should create chainable errors within 1ms", () => {
      const measurements: number[] = [];

      for (let i = 0; i < ITERATIONS; i++) {
        timer.start();
        const _error = new ChainableError("Chainable test", "CHAIN_TEST", {
          severity: ErrorSeverity.WARNING,
          category: ErrorCategory.NETWORK,
        });
        const elapsed = timer.end();
        measurements.push(elapsed);
      }

      const stats = calculateStats(measurements);

      console.log("ChainableError Performance Stats:", stats);

      expect(stats.mean).toBeLessThan(MAX_ACCEPTABLE_TIME);
      expect(stats.median).toBeLessThan(MAX_ACCEPTABLE_TIME);
    });
  });

  describe("AggregateAxonError performance", () => {
    it("should create aggregate errors efficiently", () => {
      const measurements: number[] = [];
      const subErrors = [new Error("Error 1"), new Error("Error 2"), new BaseAxonError("Error 3")];

      for (let i = 0; i < ITERATIONS; i++) {
        timer.start();
        const _error = new AggregateAxonError("Aggregate test", subErrors);
        const elapsed = timer.end();
        measurements.push(elapsed);
      }

      const stats = calculateStats(measurements);

      console.log("AggregateAxonError Performance Stats:", stats);

      expect(stats.mean).toBeLessThan(MAX_ACCEPTABLE_TIME);
      expect(stats.p95).toBeLessThan(MAX_ACCEPTABLE_TIME * 1.5);
    });

    it("should handle large aggregates", () => {
      const measurements: number[] = [];
      const subErrors = Array.from({ length: 100 }, (_, i) => new Error(`Error ${i}`));

      for (let i = 0; i < ITERATIONS / 10; i++) {
        // Fewer iterations for large aggregates
        timer.start();
        const _error = new AggregateAxonError("Large aggregate", subErrors);
        const elapsed = timer.end();
        measurements.push(elapsed);
      }

      const stats = calculateStats(measurements);

      console.log("Large AggregateAxonError Performance Stats:", stats);

      // More lenient for large aggregates
      expect(stats.mean).toBeLessThan(MAX_ACCEPTABLE_TIME * 5);
      expect(stats.p95).toBeLessThan(MAX_ACCEPTABLE_TIME * 10);
    });
  });

  describe("ErrorFactory performance", () => {
    it("should create errors via factory efficiently", () => {
      const factory = new ErrorFactory();
      const measurements: number[] = [];

      for (let i = 0; i < ITERATIONS; i++) {
        timer.start();
        const _error = factory.create("Factory error", "FACTORY_CODE", {
          component: "TestComponent",
          metadata: { iteration: i },
        });
        const elapsed = timer.end();
        measurements.push(elapsed);
      }

      const stats = calculateStats(measurements);

      console.log("ErrorFactory Performance Stats:", stats);

      expect(stats.mean).toBeLessThan(MAX_ACCEPTABLE_TIME);
      expect(stats.median).toBeLessThan(MAX_ACCEPTABLE_TIME);
    });

    it("should wrap errors efficiently", () => {
      const factory = new ErrorFactory();
      const originalError = new Error("Original");
      const measurements: number[] = [];

      for (let i = 0; i < ITERATIONS; i++) {
        timer.start();
        const _error = factory.createFromError(originalError, "WRAPPED");
        const elapsed = timer.end();
        measurements.push(elapsed);
      }

      const stats = calculateStats(measurements);

      console.log("Error Wrapping Performance Stats:", stats);

      expect(stats.mean).toBeLessThan(MAX_ACCEPTABLE_TIME);
      expect(stats.p95).toBeLessThan(MAX_ACCEPTABLE_TIME * 1.2);
    });
  });

  describe("Memory efficiency", () => {
    it("should not leak memory during error creation", () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const errors: BaseAxonError[] = [];

      // Create many errors
      for (let i = 0; i < 10000; i++) {
        errors.push(
          new BaseAxonError(`Error ${i}`, `CODE_${i}`, {
            metadata: { index: i, data: new Array(100).fill(i) },
          }),
        );
      }

      const afterCreation = process.memoryUsage().heapUsed;
      const memoryIncrease = (afterCreation - initialMemory) / 1024 / 1024; // MB

      console.log(`Memory increase for 10000 errors: ${memoryIncrease.toFixed(2)} MB`);
      console.log(`Average per error: ${((memoryIncrease / 10000) * 1024).toFixed(2)} KB`);

      // Clear references
      errors.length = 0;

      // Force GC if available
      if (global.gc) {
        global.gc();
        const afterGC = process.memoryUsage().heapUsed;
        const retained = (afterGC - initialMemory) / 1024 / 1024;
        console.log(`Memory retained after GC: ${retained.toFixed(2)} MB`);

        // Should release most memory
        expect(retained).toBeLessThan(memoryIncrease * 0.1);
      }

      // Average memory per error should be reasonable
      expect(memoryIncrease / 10000).toBeLessThan(0.01); // Less than 10KB per error
    });
  });

  describe("Concurrent error creation", () => {
    it("should handle concurrent creation efficiently", async () => {
      const promises: Promise<BaseAxonError>[] = [];
      const timer = new PerformanceTimer();

      timer.start();

      // Create errors concurrently
      for (let i = 0; i < 1000; i++) {
        promises.push(Promise.resolve().then(() => new BaseAxonError(`Concurrent ${i}`, `CONCURRENT_${i}`)));
      }

      const errors = await Promise.all(promises);
      const elapsed = timer.end();

      console.log(`Concurrent creation of 1000 errors: ${elapsed.toFixed(2)}ms`);
      console.log(`Average per error: ${(elapsed / 1000).toFixed(3)}ms`);

      expect(errors).toHaveLength(1000);
      expect(elapsed / 1000).toBeLessThan(MAX_ACCEPTABLE_TIME);
    });
  });
});
