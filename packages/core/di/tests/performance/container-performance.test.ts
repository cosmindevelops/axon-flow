/**
 * Performance benchmarks for DI container system
 *
 * These tests measure performance characteristics of the container,
 * factories, and object pools under various load conditions.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DIContainer } from "../../src/container/container.classes.js";
import { SimpleFactory, CachedFactory } from "../../src/factory/factory.classes.js";
import { ObjectPool } from "../../src/pool/pool.classes.js";
import { DEFAULT_POOL_CONFIG } from "../../src/pool/pool.schemas.js";
import type { DIToken } from "../../src/container/container.types.js";

// Test services for performance testing
class SimpleService {
  public readonly id = Math.random().toString(36).substring(2, 15);
  public createdAt = Date.now();
}

class ComplexService {
  public readonly id = Math.random().toString(36).substring(2, 15);
  public initTime: number;

  constructor(
    private readonly dep1: SimpleService,
    private readonly dep2: SimpleService,
    private readonly dep3: SimpleService,
  ) {
    // Simulate complex initialization
    const start = performance.now();
    while (performance.now() - start < 1) {
      // Busy wait for 1ms to simulate work
    }
    this.initTime = performance.now() - start;
  }

  getDependencies() {
    return [this.dep1, this.dep2, this.dep3];
  }
}

class ExpensiveService {
  public readonly id = Math.random().toString(36).substring(2, 15);
  public readonly creationCost: number;

  constructor() {
    const start = performance.now();
    // Simulate expensive construction
    let sum = 0;
    for (let i = 0; i < 10000; i++) {
      sum += Math.sqrt(i);
    }
    this.creationCost = performance.now() - start;
  }

  public reset(): void {
    // Reset for pooling
  }
}

// Tokens
const SIMPLE_TOKEN: DIToken<SimpleService> = "SimpleService";
const COMPLEX_TOKEN: DIToken<ComplexService> = "ComplexService";
const EXPENSIVE_TOKEN: DIToken<ExpensiveService> = "ExpensiveService";

/**
 * Performance test utilities
 */
class PerformanceMeasurement {
  private measurements: number[] = [];

  measure(operation: () => void): void {
    const start = performance.now();
    operation();
    const duration = performance.now() - start;
    this.measurements.push(duration);
  }

  async measureAsync(operation: () => Promise<void>): Promise<void> {
    const start = performance.now();
    await operation();
    const duration = performance.now() - start;
    this.measurements.push(duration);
  }

  getStats() {
    if (this.measurements.length === 0) {
      return { avg: 0, min: 0, max: 0, total: 0, count: 0, p95: 0, p99: 0 };
    }

    const sorted = [...this.measurements].sort((a, b) => a - b);
    const total = sorted.reduce((sum, val) => sum + val, 0);
    const avg = total / sorted.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    return { avg, min, max, total, count: sorted.length, p95, p99 };
  }

  reset(): void {
    this.measurements = [];
  }
}

describe("DI Container Performance Benchmarks", () => {
  let container: DIContainer;
  let perf: PerformanceMeasurement;

  beforeEach(() => {
    container = new DIContainer({ name: "PerformanceTestContainer", enableMetrics: true });
    perf = new PerformanceMeasurement();
  });

  afterEach(() => {
    container.dispose();
  });

  describe("Basic Resolution Performance", () => {
    it("should resolve simple services quickly", () => {
      // Setup
      container.register(SIMPLE_TOKEN, SimpleService, { lifecycle: "transient" });

      // Benchmark resolution
      const iterations = 10000;
      
      perf.measure(() => {
        for (let i = 0; i < iterations; i++) {
          container.resolve(SIMPLE_TOKEN);
        }
      });

      const stats = perf.getStats();
      const avgPerResolution = stats.total / iterations;

      // Performance assertions
      expect(avgPerResolution).toBeLessThan(0.01); // Less than 0.01ms per resolution
      expect(stats.total).toBeLessThan(100); // Total under 100ms for 10k resolutions
      
      console.log(`Simple resolution: ${avgPerResolution.toFixed(6)}ms avg per resolution`);
    });

    it("should handle singleton caching efficiently", () => {
      container.register(SIMPLE_TOKEN, SimpleService, { lifecycle: "singleton" });

      const warmupIterations = 100;
      const testIterations = 10000;

      // Warmup
      for (let i = 0; i < warmupIterations; i++) {
        container.resolve(SIMPLE_TOKEN);
      }

      // Benchmark cached resolution
      perf.measure(() => {
        for (let i = 0; i < testIterations; i++) {
          container.resolve(SIMPLE_TOKEN);
        }
      });

      const stats = perf.getStats();
      const avgPerResolution = stats.total / testIterations;

      // Cached resolution should be extremely fast
      expect(avgPerResolution).toBeLessThan(0.001); // Less than 0.001ms per cached resolution
      
      const metrics = container.getMetrics();
      expect(metrics.cacheHitRatio).toBeCloseTo(1.0, 2); // 100% cache hit rate

      console.log(`Cached resolution: ${avgPerResolution.toFixed(6)}ms avg per resolution`);
      console.log(`Cache hit ratio: ${(metrics.cacheHitRatio * 100).toFixed(2)}%`);
    });

    it("should maintain performance with deep dependency chains", () => {
      // Create dependency chain: Complex -> Simple (3 dependencies)
      container.register(SIMPLE_TOKEN, SimpleService, { lifecycle: "transient" });
      container.register(COMPLEX_TOKEN, ComplexService, {
        lifecycle: "transient",
        dependencies: [SIMPLE_TOKEN, SIMPLE_TOKEN, SIMPLE_TOKEN],
      });

      const iterations = 1000;

      perf.measure(() => {
        for (let i = 0; i < iterations; i++) {
          container.resolve(COMPLEX_TOKEN);
        }
      });

      const stats = perf.getStats();
      const avgPerResolution = stats.total / iterations;

      // Should handle complex dependency resolution reasonably quickly
      expect(avgPerResolution).toBeLessThan(2); // Less than 2ms per complex resolution (allowing for complexity)
      
      console.log(`Complex resolution: ${avgPerResolution.toFixed(6)}ms avg per resolution`);
    });
  });

  describe("Factory Performance", () => {
    it("should benchmark simple factory throughput", () => {
      const factory = new SimpleFactory("TestFactory", () => new SimpleService());
      container.registerFactoryInstance(SIMPLE_TOKEN, factory);

      const iterations = 5000;

      perf.measure(() => {
        for (let i = 0; i < iterations; i++) {
          container.resolve(SIMPLE_TOKEN);
        }
      });

      const stats = perf.getStats();
      const avgPerCreation = stats.total / iterations;

      expect(avgPerCreation).toBeLessThan(0.02); // Less than 0.02ms per factory creation

      const metadata = factory.getMetadata();
      expect(metadata.performance?.totalCreated).toBe(iterations);
      expect(metadata.performance?.averageCreationTime).toBeGreaterThan(0);

      console.log(`Factory creation: ${avgPerCreation.toFixed(6)}ms avg per creation`);
    });

    it("should benchmark cached factory performance", () => {
      const baseFactory = new SimpleFactory("BaseFactory", () => new SimpleService());
      const cachedFactory = new CachedFactory("CachedFactory", baseFactory, 100);
      container.registerFactoryInstance(SIMPLE_TOKEN, cachedFactory);

      const iterations = 5000;

      perf.measure(() => {
        for (let i = 0; i < iterations; i++) {
          // Use same args to test cache effectiveness
          container.resolve(SIMPLE_TOKEN);
        }
      });

      const stats = perf.getStats();
      const avgPerCreation = stats.total / iterations;

      // Cached factory should be faster than creating new instances
      expect(avgPerCreation).toBeLessThan(0.01);

      console.log(`Cached factory: ${avgPerCreation.toFixed(6)}ms avg per resolution`);
    });
  });

  describe("Object Pool Performance", () => {
    it("should benchmark pool acquisition/release performance", async () => {
      const pool = new ObjectPool(
        EXPENSIVE_TOKEN,
        () => new ExpensiveService(),
        {
          ...DEFAULT_POOL_CONFIG,
          minSize: 10,
          maxSize: 50,
          enableMetrics: true,
        },
        undefined,
        (instance) => Promise.resolve(instance.reset())
      );

      // Warm up the pool
      await pool.warmup();

      const iterations = 1000;
      const instances: ExpensiveService[] = [];

      // Benchmark acquisition
      await perf.measureAsync(async () => {
        for (let i = 0; i < iterations; i++) {
          const instance = await pool.acquire();
          instances.push(instance);
        }
      });

      const acquisitionStats = perf.getStats();
      perf.reset();

      // Benchmark release
      await perf.measureAsync(async () => {
        for (const instance of instances) {
          await pool.release(instance);
        }
      });

      const releaseStats = perf.getStats();

      const avgAcquisitionTime = acquisitionStats.total / iterations;
      const avgReleaseTime = releaseStats.total / iterations;

      // Pool operations should be reasonably fast
      expect(avgAcquisitionTime).toBeLessThan(1); // Less than 1ms per acquisition
      expect(avgReleaseTime).toBeLessThan(1); // Less than 1ms per release

      const poolStats = pool.getStats();
      expect(poolStats.hitRatio).toBeGreaterThan(0.8); // Good cache hit ratio

      console.log(`Pool acquisition: ${avgAcquisitionTime.toFixed(6)}ms avg`);
      console.log(`Pool release: ${avgReleaseTime.toFixed(6)}ms avg`);
      console.log(`Pool hit ratio: ${(poolStats.hitRatio * 100).toFixed(2)}%`);

      await pool.destroy();
    });

    it("should handle pool contention under load", async () => {
      const pool = new ObjectPool(
        SIMPLE_TOKEN,
        () => new SimpleService(),
        {
          ...DEFAULT_POOL_CONFIG,
          minSize: 5,
          maxSize: 20,
          acquireTimeout: 1000,
          enableMetrics: true,
        }
      );

      await pool.warmup();

      const concurrency = 10;
      const iterationsPerWorker = 50;
      const workers: Promise<void>[] = [];

      const startTime = performance.now();

      // Create concurrent workers
      for (let w = 0; w < concurrency; w++) {
        const worker = async () => {
          for (let i = 0; i < iterationsPerWorker; i++) {
            const instance = await pool.acquire();
            // Simulate some work
            await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
            await pool.release(instance);
          }
        };
        workers.push(worker());
      }

      await Promise.all(workers);

      const totalTime = performance.now() - startTime;
      const totalOperations = concurrency * iterationsPerWorker * 2; // acquire + release

      const avgOperationTime = totalTime / totalOperations;

      expect(avgOperationTime).toBeLessThan(5); // Should handle contention reasonably
      expect(totalTime).toBeLessThan(5000); // Complete within 5 seconds

      const stats = pool.getStats();
      expect(stats.totalAcquired).toBe(concurrency * iterationsPerWorker);
      expect(stats.totalReleased).toBe(concurrency * iterationsPerWorker);

      console.log(`Concurrent pool operations: ${avgOperationTime.toFixed(6)}ms avg under contention`);
      console.log(`Pool efficiency under load: ${(stats.hitRatio * 100).toFixed(2)}%`);

      await pool.destroy();
    });
  });

  describe("Memory Usage Benchmarks", () => {
    it("should track memory usage patterns", () => {
      const iterations = 1000;

      // Register services
      container.register(SIMPLE_TOKEN, SimpleService, { lifecycle: "singleton" });
      container.register(COMPLEX_TOKEN, ComplexService, {
        lifecycle: "transient",
        dependencies: [SIMPLE_TOKEN, SIMPLE_TOKEN, SIMPLE_TOKEN],
      });

      // Get baseline metrics
      const baselineMetrics = container.getMetrics();

      // Create many instances
      for (let i = 0; i < iterations; i++) {
        container.resolve(COMPLEX_TOKEN);
      }

      const finalMetrics = container.getMetrics();

      // Memory usage should scale predictably
      expect(finalMetrics.memoryUsage.singletonCount).toBe(1); // Only one singleton
      expect(finalMetrics.totalResolutions).toBeGreaterThanOrEqual(baselineMetrics.totalResolutions + iterations); // At least one resolution per iteration

      // Memory estimation should be reasonable
      const memoryIncrease = finalMetrics.memoryUsage.estimatedBytes - baselineMetrics.memoryUsage.estimatedBytes;
      expect(memoryIncrease).toBeGreaterThan(0);

      console.log(`Memory usage - Singleton count: ${finalMetrics.memoryUsage.singletonCount}`);
      console.log(`Memory usage - Estimated bytes: ${finalMetrics.memoryUsage.estimatedBytes}`);
      console.log(`Total resolutions: ${finalMetrics.totalResolutions}`);
    });

    it("should handle memory pressure gracefully", () => {
      // Create many transient services to test memory behavior
      const iterations = 5000;
      container.register(SIMPLE_TOKEN, SimpleService, { lifecycle: "transient" });

      const startTime = performance.now();
      let services: SimpleService[] = [];

      // Create and hold references to test memory pressure
      for (let i = 0; i < iterations; i++) {
        services.push(container.resolve(SIMPLE_TOKEN));
        
        // Clear some references periodically to simulate realistic usage
        if (i % 1000 === 0 && services.length > 500) {
          services = services.slice(-500); // Keep only last 500
        }
      }

      const totalTime = performance.now() - startTime;
      const avgTimePerResolution = totalTime / iterations;

      // Performance should not degrade significantly under memory pressure
      expect(avgTimePerResolution).toBeLessThan(0.01);
      expect(totalTime).toBeLessThan(100);

      const metrics = container.getMetrics();
      expect(metrics.totalResolutions).toBe(iterations);
      expect(metrics.averageResolutionTime).toBeGreaterThan(0);

      console.log(`Under memory pressure: ${avgTimePerResolution.toFixed(6)}ms avg per resolution`);
    });
  });

  describe("Scaling Characteristics", () => {
    it("should scale linearly with number of registrations", () => {
      const serviceCounts = [10, 50, 100, 500];
      const results: Array<{ count: number; avgTime: number }> = [];

      for (const count of serviceCounts) {
        // Clear container for clean test
        container.clear();

        // Register many services
        for (let i = 0; i < count; i++) {
          const token = `Service_${i}` as DIToken<SimpleService>;
          container.register(token, SimpleService, { lifecycle: "transient" });
        }

        // Benchmark resolution across all services
        const iterations = 100;
        const startTime = performance.now();

        for (let iter = 0; iter < iterations; iter++) {
          for (let i = 0; i < count; i++) {
            const token = `Service_${i}` as DIToken<SimpleService>;
            container.resolve(token);
          }
        }

        const totalTime = performance.now() - startTime;
        const avgTimePerResolution = totalTime / (count * iterations);
        
        results.push({ count, avgTime: avgTimePerResolution });
        
        console.log(`${count} services: ${avgTimePerResolution.toFixed(6)}ms avg per resolution`);
      }

      // Resolution time should scale sub-linearly (Map lookup is O(1))
      // Allow some variance but ensure it doesn't explode
      const firstResult = results[0];
      const lastResult = results[results.length - 1];
      const scalingFactor = lastResult.avgTime / firstResult.avgTime;
      
      expect(scalingFactor).toBeLessThan(3); // Should not scale worse than 3x
      expect(lastResult.avgTime).toBeLessThan(0.05); // Still fast at scale
    });

    it("should handle high-frequency resolution bursts", () => {
      container.register(SIMPLE_TOKEN, SimpleService, { lifecycle: "singleton" });
      container.register(COMPLEX_TOKEN, ComplexService, {
        lifecycle: "transient", 
        dependencies: [SIMPLE_TOKEN, SIMPLE_TOKEN, SIMPLE_TOKEN],
      });

      const burstSizes = [100, 500, 1000, 5000];
      
      for (const burstSize of burstSizes) {
        const startTime = performance.now();
        
        // Rapid-fire resolutions
        for (let i = 0; i < burstSize; i++) {
          container.resolve(COMPLEX_TOKEN);
        }
        
        const totalTime = performance.now() - startTime;
        const throughput = burstSize / (totalTime / 1000); // operations per second
        
        expect(throughput).toBeGreaterThan(500); // At least 500 ops/sec
        
        console.log(`Burst ${burstSize}: ${throughput.toFixed(0)} operations/sec`);
      }
    });
  });

  describe("Performance Regression Detection", () => {
    it("should maintain consistent performance characteristics", () => {
      // This test establishes performance baselines for regression detection
      container.register(SIMPLE_TOKEN, SimpleService, { lifecycle: "transient" });
      container.register(COMPLEX_TOKEN, ComplexService, {
        lifecycle: "singleton",
        dependencies: [SIMPLE_TOKEN, SIMPLE_TOKEN, SIMPLE_TOKEN],
      });

      const testCases = [
        { name: "simple_transient", token: SIMPLE_TOKEN, iterations: 10000 },
        { name: "complex_singleton_first", token: COMPLEX_TOKEN, iterations: 1 },
        { name: "complex_singleton_cached", token: COMPLEX_TOKEN, iterations: 5000 },
      ];

      const benchmarkResults: Record<string, number> = {};

      for (const testCase of testCases) {
        const startTime = performance.now();
        
        for (let i = 0; i < testCase.iterations; i++) {
          container.resolve(testCase.token);
        }
        
        const totalTime = performance.now() - startTime;
        const avgTime = totalTime / testCase.iterations;
        benchmarkResults[testCase.name] = avgTime;
        
        console.log(`${testCase.name}: ${avgTime.toFixed(6)}ms avg`);
      }

      // Performance baselines (these can be adjusted based on environment)
      expect(benchmarkResults.simple_transient).toBeLessThan(0.01);
      expect(benchmarkResults.complex_singleton_first).toBeLessThan(5); // First creation is expensive
      expect(benchmarkResults.complex_singleton_cached).toBeLessThan(0.001); // Cached should be very fast

      // Log final metrics for analysis
      const finalMetrics = container.getMetrics();
      console.log("Final container metrics:", JSON.stringify(finalMetrics, null, 2));
    });
  });
});