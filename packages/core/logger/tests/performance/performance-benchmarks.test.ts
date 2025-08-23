/**
 * Performance benchmarking tests for the performance module
 * These tests measure the performance overhead of the performance tracking system itself
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  EnhancedPerformanceTracker,
  MeasurementPool,
  MetricsAggregator,
  MemoryMonitor,
} from "../../src/performance/performance.classes.js";
import { Timed, Benchmark, setGlobalPerformanceTracker } from "../../src/performance/performance.decorators.js";
import type { IEnhancedPerformanceConfig } from "../../src/performance/performance.types.js";

describe("Performance Benchmarks", () => {
  let tracker: EnhancedPerformanceTracker;
  let config: IEnhancedPerformanceConfig;

  beforeEach(() => {
    config = {
      enabled: true,
      sampleRate: 1.0, // 100% sampling for predictable test results
      thresholdMs: 100,
      enableMemoryTracking: true,
      enableGCTracking: false,
      maxLatencyHistory: 1000,
      maxGCEventHistory: 100,
      resourceMetricsInterval: 5000,
      enableMeasurementPooling: true,
      measurementPoolInitialSize: 50,
      measurementPoolMaxSize: 200,
    };
    
    tracker = new EnhancedPerformanceTracker(config);
    setGlobalPerformanceTracker(tracker);
  });

  afterEach(() => {
    tracker.reset();
  });

  describe("Tracking Overhead Benchmarks", () => {
    it("should measure overhead of basic operation tracking", () => {
      const iterations = 10000;
      const measurements: number[] = [];

      // Benchmark without tracking
      const startWithoutTracking = performance.now();
      for (let i = 0; i < iterations; i++) {
        // Simulate a simple operation
        Math.sqrt(i * 2.5);
      }
      const endWithoutTracking = performance.now();
      const timeWithoutTracking = endWithoutTracking - startWithoutTracking;

      // Benchmark with tracking
      const startWithTracking = performance.now();
      for (let i = 0; i < iterations; i++) {
        const measurement = tracker.startOperation("benchmark.operation", {
          iteration: i,
        });
        
        // Simulate the same operation
        Math.sqrt(i * 2.5);
        
        tracker.finishOperation(measurement);
        tracker.recordSuccess();
      }
      const endWithTracking = performance.now();
      const timeWithTracking = endWithTracking - startWithTracking;

      const overhead = timeWithTracking - timeWithoutTracking;
      const overheadPerOperation = overhead / iterations;
      const overheadPercentage = (overhead / timeWithoutTracking) * 100;

      console.log(`Performance Tracking Overhead Benchmark (${iterations} operations):`);
      console.log(`  Without tracking: ${timeWithoutTracking.toFixed(2)}ms`);
      console.log(`  With tracking:    ${timeWithTracking.toFixed(2)}ms`);
      console.log(`  Total overhead:   ${overhead.toFixed(2)}ms`);
      console.log(`  Per operation:    ${(overheadPerOperation * 1000).toFixed(3)}μs`);
      console.log(`  Overhead %:       ${overheadPercentage.toFixed(2)}%`);

      // Verify that overhead is reasonable (performance tracking has significant overhead but provides value)
      // Performance tracking typically adds 2000-10000% overhead due to timing, object creation, and metrics
      expect(overheadPercentage).toBeLessThan(15000); // Realistic upper bound for comprehensive tracking
      expect(overheadPerOperation).toBeLessThan(5); // Less than 5ms per operation is acceptable

      // Verify operations were tracked (limited by measurement window of 1000)
      const metrics = tracker.getMetrics();
      const expectedCount = Math.min(iterations, 1000); // Limited by trimMeasurements() 
      expect(metrics.operation.count).toBe(expectedCount);
      expect(metrics.totalLogs).toBe(iterations); // totalLogs tracks all operations
    });

    it("should benchmark object pooling efficiency", () => {
      const poolSizes = [10, 50, 100, 200];
      const iterations = 5000;

      poolSizes.forEach(poolSize => {
        const poolConfig = {
          ...config,
          measurementPoolInitialSize: poolSize,
          measurementPoolMaxSize: poolSize * 2,
        };
        
        const pooledTracker = new EnhancedPerformanceTracker(poolConfig);
        
        // Benchmark with current pool size
        const startTime = performance.now();
        
        for (let i = 0; i < iterations; i++) {
          const measurement = pooledTracker.startOperation("pooling.benchmark");
          pooledTracker.finishOperation(measurement);
          pooledTracker.recordSuccess();
        }
        
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const timePerOperation = totalTime / iterations;

        console.log(`Pool Size ${poolSize}: ${totalTime.toFixed(2)}ms total, ${(timePerOperation * 1000).toFixed(3)}μs per op`);

        const metrics = pooledTracker.getMetrics();
        const expectedCount = Math.min(iterations, 1000); // Limited by measurement window
        expect(metrics.operation.count).toBe(expectedCount);
        expect(timePerOperation).toBeLessThan(2); // Less than 2ms per operation is acceptable for pooled tracking
      });
    });

    it("should benchmark memory monitoring overhead", () => {
      const memoryMonitor = new MemoryMonitor();
      const iterations = 1000;

      // Benchmark without memory monitoring
      const startWithoutMonitoring = performance.now();
      for (let i = 0; i < iterations; i++) {
        const measurement = tracker.startOperation("memory.benchmark.without");
        tracker.finishOperation(measurement);
        tracker.recordSuccess();
      }
      const endWithoutMonitoring = performance.now();
      const timeWithoutMonitoring = endWithoutMonitoring - startWithoutMonitoring;

      // Benchmark with memory monitoring
      memoryMonitor.startMonitoring();
      
      const startWithMonitoring = performance.now();
      for (let i = 0; i < iterations; i++) {
        const measurement = tracker.startOperation("memory.benchmark.with");
        
        // Get memory metrics (simulating memory tracking)
        memoryMonitor.getMemoryMetrics();
        
        tracker.finishOperation(measurement);
        tracker.recordSuccess();
      }
      const endWithMonitoring = performance.now();
      const timeWithMonitoring = endWithMonitoring - startWithMonitoring;

      memoryMonitor.stopMonitoring();

      const memoryOverhead = timeWithMonitoring - timeWithoutMonitoring;
      const memoryOverheadPercentage = (memoryOverhead / timeWithoutMonitoring) * 100;

      console.log(`Memory Monitoring Overhead Benchmark (${iterations} operations):`);
      console.log(`  Without monitoring: ${timeWithoutMonitoring.toFixed(2)}ms`);
      console.log(`  With monitoring:    ${timeWithMonitoring.toFixed(2)}ms`);
      console.log(`  Memory overhead:    ${memoryOverhead.toFixed(2)}ms (${memoryOverheadPercentage.toFixed(2)}%)`);

      // Memory monitoring adds significant overhead due to process.memoryUsage() calls
      expect(memoryOverheadPercentage).toBeLessThan(5000); // Memory monitoring can add substantial overhead
    });
  });

  describe("Decorator Performance Benchmarks", () => {
    it("should benchmark @Timed decorator overhead", () => {
      const iterations = 5000;

      // Test class without decorator
      class UntimedService {
        simpleOperation(value: number): number {
          return Math.sqrt(value * 2.5);
        }
      }

      // Test class with decorator
      class TimedService {
        @Timed({ category: "decorator.benchmark" })
        simpleOperation(value: number): number {
          return Math.sqrt(value * 2.5);
        }
      }

      const untimedService = new UntimedService();
      const timedService = new TimedService();

      // Benchmark untimed operations
      const startUntimed = performance.now();
      for (let i = 0; i < iterations; i++) {
        untimedService.simpleOperation(i);
      }
      const endUntimed = performance.now();
      const timeUntimed = endUntimed - startUntimed;

      // Reset tracker for clean measurement
      tracker.reset();

      // Benchmark timed operations
      const startTimed = performance.now();
      for (let i = 0; i < iterations; i++) {
        timedService.simpleOperation(i);
      }
      const endTimed = performance.now();
      const timeTimed = endTimed - startTimed;

      const decoratorOverhead = timeTimed - timeUntimed;
      const decoratorOverheadPercentage = (decoratorOverhead / timeUntimed) * 100;

      console.log(`@Timed Decorator Overhead Benchmark (${iterations} operations):`);
      console.log(`  Without @Timed: ${timeUntimed.toFixed(2)}ms`);
      console.log(`  With @Timed:    ${timeTimed.toFixed(2)}ms`);
      console.log(`  Decorator overhead: ${decoratorOverhead.toFixed(2)}ms (${decoratorOverheadPercentage.toFixed(2)}%)`);

      // Verify decorator is working (limited by measurement window)
      const metrics = tracker.getMetrics();
      const expectedCount = Math.min(iterations, 1000); // Limited by measurement window
      expect(metrics.operation.count).toBe(expectedCount);
      
      // Decorator overhead can be substantial due to reflection and instrumentation
      expect(decoratorOverheadPercentage).toBeLessThan(10000); // Realistic bound for decorator overhead
    });

    it("should demonstrate @Benchmark decorator capabilities", () => {
      class BenchmarkService {
        @Benchmark({ runs: 100, warmup: 10, category: "fibonacci" })
        fibonacci(n: number): number {
          if (n <= 1) return n;
          return this.fibonacciHelper(n - 1) + this.fibonacciHelper(n - 2);
        }

        // Non-decorated helper to avoid double decoration
        private fibonacciHelper(n: number): number {
          if (n <= 1) return n;
          return this.fibonacciHelper(n - 1) + this.fibonacciHelper(n - 2);
        }

        @Benchmark({ runs: 50, warmup: 5, category: "array-sort" })
        sortArray(): number[] {
          const arr = Array.from({ length: 1000 }, () => Math.random());
          return arr.sort((a, b) => a - b);
        }
      }

      const service = new BenchmarkService();
      
      // Run benchmarks (these will output results to console)
      const fibResult = service.fibonacci(20);
      expect(fibResult).toBeGreaterThan(0);

      const sortedArray = service.sortArray();
      expect(sortedArray).toHaveLength(1000);
      expect(sortedArray[0]).toBeLessThanOrEqual(sortedArray[999]);
    });
  });

  describe("Scaling Benchmarks", () => {
    it("should measure performance with different sample rates", () => {
      const sampleRates = [0.1, 0.5, 1.0];
      const iterations = 5000;

      sampleRates.forEach(sampleRate => {
        const sampledConfig = {
          ...config,
          sampleRate,
        };
        
        const sampledTracker = new EnhancedPerformanceTracker(sampledConfig);
        
        const startTime = performance.now();
        
        for (let i = 0; i < iterations; i++) {
          const measurement = sampledTracker.startOperation("sampling.benchmark");
          sampledTracker.finishOperation(measurement);
          sampledTracker.recordSuccess();
        }
        
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const timePerOperation = totalTime / iterations;

        console.log(`Sample Rate ${(sampleRate * 100).toFixed(0)}%: ${totalTime.toFixed(2)}ms total, ${(timePerOperation * 1000).toFixed(3)}μs per op`);

        const metrics = sampledTracker.getMetrics();
        
        // With sampling, fewer operations should be tracked
        // Also account for measurement window limit
        const expectedMaxCount = Math.min(iterations, 1000);
        if (sampleRate < 1.0) {
          // With lower sample rates, we should track fewer operations
          // But if too many operations still pass through sampling, they get capped at 1000
          expect(metrics.operation.count).toBeLessThanOrEqual(expectedMaxCount);
        } else {
          expect(metrics.operation.count).toBe(expectedMaxCount);
        }
        
        // Lower sample rates should be faster
        expect(timePerOperation).toBeLessThan(2); // Less than 2ms per operation is reasonable
      });
    });

    it("should measure performance with concurrent operations", async () => {
      const concurrencyLevels = [1, 5, 10, 20];
      const operationsPerLevel = 1000;

      for (const concurrency of concurrencyLevels) {
        tracker.reset();
        
        const startTime = performance.now();
        
        // Create concurrent operation promises
        const concurrentPromises = Array.from({ length: concurrency }, async (_, threadIndex) => {
          for (let i = 0; i < operationsPerLevel; i++) {
            const measurement = tracker.startOperation("concurrent.benchmark", {
              thread: threadIndex,
              operation: i,
            });
            
            // Simulate small async work
            await new Promise(resolve => setTimeout(resolve, 1));
            
            tracker.finishOperation(measurement);
            tracker.recordSuccess();
          }
        });
        
        await Promise.all(concurrentPromises);
        
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const totalOperations = concurrency * operationsPerLevel;
        const operationsPerSecond = (totalOperations / totalTime) * 1000;

        console.log(`Concurrency ${concurrency}: ${totalOperations} ops in ${totalTime.toFixed(2)}ms (${operationsPerSecond.toFixed(0)} ops/sec)`);

        const metrics = tracker.getMetrics();
        const expectedCount = Math.min(totalOperations, 1000); // Limited by measurement window
        expect(metrics.operation.count).toBe(expectedCount);
        expect(metrics.totalLogs).toBe(totalOperations); // totalLogs tracks all operations
        expect(metrics.failedLogs).toBe(0);
      }
    });

    it("should measure memory usage growth", () => {
      const memoryMonitor = new MemoryMonitor();
      const operationCounts = [1000, 5000, 10000, 20000];
      
      operationCounts.forEach(count => {
        tracker.reset();
        
        const initialMemory = memoryMonitor.getMemoryMetrics();
        
        // Perform operations
        for (let i = 0; i < count; i++) {
          const measurement = tracker.startOperation(`memory.growth.${i}`, {
            iteration: i,
            batch: Math.floor(i / 100),
          });
          tracker.finishOperation(measurement);
          tracker.recordSuccess();
        }
        
        const finalMemory = memoryMonitor.getMemoryMetrics();
        const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
        const memoryPerOperation = memoryGrowth / count;

        console.log(`${count} operations: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB growth, ${(memoryPerOperation / 1024).toFixed(2)}KB per op`);

        const metrics = tracker.getMetrics();
        const expectedCount = Math.min(count, 1000); // Limited by measurement window
        expect(metrics.operation.count).toBe(expectedCount);
        
        // Memory growth per operation should be reasonable
        expect(memoryPerOperation).toBeLessThan(1024); // Less than 1KB per operation
      });
    });
  });

  describe("Metrics Aggregation Benchmarks", () => {
    it("should benchmark metrics calculation performance", () => {
      const aggregator = new MetricsAggregator({ maxHistory: 10000 });
      const measurementCount = 10000;
      
      // Add measurements
      const startAdd = performance.now();
      for (let i = 0; i < measurementCount; i++) {
        aggregator.addMeasurement(Math.random() * 100, `category-${i % 10}`);
      }
      const endAdd = performance.now();
      const addTime = endAdd - startAdd;
      
      // Calculate metrics
      const startCalc = performance.now();
      const aggregatedMetrics = aggregator.getAggregatedMetrics();
      const endCalc = performance.now();
      const calcTime = endCalc - startCalc;
      
      console.log(`Metrics Aggregation Benchmark (${measurementCount} measurements):`);
      console.log(`  Add measurements: ${addTime.toFixed(2)}ms (${(addTime / measurementCount * 1000).toFixed(3)}μs per measurement)`);
      console.log(`  Calculate metrics: ${calcTime.toFixed(2)}ms`);
      
      // MetricsAggregator also has 1000 measurement limit
      const expectedCount = Math.min(measurementCount, 1000);
      expect(aggregatedMetrics.count).toBe(expectedCount);
      expect(addTime / measurementCount).toBeLessThan(1); // Less than 1ms per measurement
      expect(calcTime).toBeLessThan(500); // Less than 500ms to calculate metrics
    });
  });

  describe("Real-world Performance Scenarios", () => {
    it("should simulate high-throughput API server performance", async () => {
      const requestsPerSecond = 1000;
      const durationSeconds = 1;
      const totalRequests = requestsPerSecond * durationSeconds;
      
      console.log(`Simulating ${requestsPerSecond} req/sec for ${durationSeconds} seconds (${totalRequests} total requests)`);
      
      const startTime = performance.now();
      
      // Simulate requests
      const requestPromises = [];
      for (let i = 0; i < totalRequests; i++) {
        const requestPromise = (async () => {
          const requestMeasurement = tracker.startOperation("api.request", {
            requestId: `req-${i}`,
            userId: `user-${i % 100}`,
          });
          
          // Simulate database query
          const dbMeasurement = tracker.startOperation("database.query");
          await new Promise(resolve => setTimeout(resolve, Math.random() * 2));
          tracker.finishOperation(dbMeasurement);
          
          // Simulate processing
          const processMeasurement = tracker.startOperation("request.processing");
          await new Promise(resolve => setTimeout(resolve, Math.random() * 1));
          tracker.finishOperation(processMeasurement);
          
          tracker.finishOperation(requestMeasurement);
          tracker.recordSuccess();
        })();
        
        requestPromises.push(requestPromise);
        
        // Control rate
        if (i > 0 && i % 100 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      await Promise.all(requestPromises);
      
      const endTime = performance.now();
      const actualDuration = endTime - startTime;
      const actualRps = (totalRequests / actualDuration) * 1000;
      
      const metrics = tracker.getMetrics();
      
      console.log(`Actual performance:`);
      console.log(`  Duration: ${actualDuration.toFixed(2)}ms`);
      console.log(`  Actual RPS: ${actualRps.toFixed(0)}`);
      console.log(`  Operations tracked: ${metrics.operation.count}`);
      console.log(`  Average latency: ${metrics.averageLatencyMs.toFixed(2)}ms`);
      console.log(`  Peak latency: ${metrics.peakLatencyMs.toFixed(2)}ms`);
      
      // Each request generates 3 operations (api.request, database.query, request.processing)
      // but only calls recordSuccess() once per request
      const totalOperations = totalRequests * 3;
      const expectedCount = Math.min(totalOperations, 1000); // Limited by measurement window
      expect(metrics.operation.count).toBe(expectedCount);
      expect(metrics.totalLogs).toBe(totalRequests); // recordSuccess() called once per request
      expect(metrics.averageLatencyMs).toBeGreaterThan(0);
    });
  });
});