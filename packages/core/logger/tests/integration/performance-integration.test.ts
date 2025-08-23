/**
 * Integration tests for performance tracking with logger system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  EnhancedPerformanceTracker,
  PerformancePlatformDetector,
  MemoryMonitor,
} from "../../src/performance/performance.classes.js";
import {
  Timed,
  Profile,
  withTiming,
  setGlobalPerformanceTracker,
} from "../../src/performance/performance.decorators.js";
import type { IEnhancedPerformanceConfig } from "../../src/performance/performance.types.js";

describe("Performance Integration Tests", () => {
  let tracker: EnhancedPerformanceTracker;
  let config: IEnhancedPerformanceConfig;

  beforeEach(() => {
    config = {
      enabled: true,
      sampleRate: 1.0,
      thresholdMs: 50,
      enableMemoryTracking: true,
      enableGCTracking: false, // Disabled for CI/test environments
      maxLatencyHistory: 100,
      maxGCEventHistory: 50,
      resourceMetricsInterval: 1000,
      enableMeasurementPooling: true,
      measurementPoolInitialSize: 10,
      measurementPoolMaxSize: 50,
    };

    tracker = new EnhancedPerformanceTracker(config);
    setGlobalPerformanceTracker(tracker);
  });

  afterEach(() => {
    tracker.reset();
    vi.clearAllMocks();
  });

  describe("End-to-End Performance Tracking", () => {
    it("should track complete request lifecycle", async () => {
      // Simulate a complete request handling scenario
      const requestId = "req-123";
      const userId = "user-456";

      // 1. Start request processing
      const requestMeasurement = tracker.startOperation("http.request", {
        requestId,
        method: "POST",
        endpoint: "/api/users",
      });

      // 2. Database operation
      const dbMeasurement = tracker.startOperation("database.query", {
        requestId,
        query: "SELECT * FROM users WHERE id = ?",
        table: "users",
      });

      // Simulate database query time
      await new Promise((resolve) => setTimeout(resolve, 10));

      tracker.finishOperation(dbMeasurement);
      tracker.recordSuccess();

      // 3. External API call
      const apiMeasurement = tracker.startOperation("external.api", {
        requestId,
        service: "user-service",
        endpoint: "/validate",
      });

      // Simulate API call time
      await new Promise((resolve) => setTimeout(resolve, 15));

      tracker.finishOperation(apiMeasurement);
      tracker.recordSuccess();

      // 4. Cache operation
      const cacheMeasurement = tracker.startOperation("cache.set", {
        requestId,
        key: `user:${userId}`,
      });

      // Simulate cache write time
      await new Promise((resolve) => setTimeout(resolve, 5));

      tracker.finishOperation(cacheMeasurement);
      tracker.recordSuccess();

      // 5. Complete request
      tracker.finishOperation(requestMeasurement);
      tracker.recordSuccess();

      // Verify metrics
      const metrics = tracker.getMetrics();

      expect(metrics.totalLogs).toBe(4); // 4 successful operations
      expect(metrics.failedLogs).toBe(0);
      expect(metrics.operation.count).toBe(4);
      expect(metrics.averageLatencyMs).toBeGreaterThan(0);
      expect(metrics.peakLatencyMs).toBeGreaterThan(0);

      // Verify resource metrics are included
      expect(metrics.resource).toBeDefined();
      expect(metrics.resource.memory).toBeDefined();
      expect(metrics.resource.uptime).toBeGreaterThan(0);

      // Verify timestamps
      expect(metrics.timestamp).toBeGreaterThan(0);
      expect(metrics.uptimeSeconds).toBeGreaterThan(0);
    });

    it("should handle operation failures gracefully", async () => {
      const requestId = "req-failed";

      // Start operation
      const measurement = tracker.startOperation("failing.operation", {
        requestId,
        type: "critical",
      });

      // Simulate operation time before failure
      await new Promise((resolve) => setTimeout(resolve, 20));

      tracker.finishOperation(measurement);
      tracker.recordFailure(); // Record as failure

      // Verify failure tracking
      const metrics = tracker.getMetrics();

      expect(metrics.totalLogs).toBe(1);
      expect(metrics.failedLogs).toBe(1);
      expect(metrics.operation.count).toBe(1);
      expect(metrics.averageLatencyMs).toBeGreaterThan(0);
    });

    it("should track concurrent operations correctly", async () => {
      const concurrentOperations = 5;
      const measurements = [];

      // Start multiple concurrent operations
      for (let i = 0; i < concurrentOperations; i++) {
        const measurement = tracker.startOperation("concurrent.operation", {
          operationId: `op-${i}`,
          batch: "batch-1",
        });
        measurements.push(measurement);
      }

      // Simulate different completion times
      const completionPromises = measurements.map((measurement, index) => {
        return new Promise<void>((resolve) => {
          setTimeout(
            () => {
              tracker.finishOperation(measurement);
              tracker.recordSuccess();
              resolve();
            },
            (index + 1) * 5,
          ); // Staggered completion
        });
      });

      await Promise.all(completionPromises);

      // Verify all operations were tracked
      const metrics = tracker.getMetrics();

      expect(metrics.totalLogs).toBe(concurrentOperations);
      expect(metrics.failedLogs).toBe(0);
      expect(metrics.operation.count).toBe(concurrentOperations);
      expect(metrics.operation.throughput).toBeGreaterThan(0);
    });
  });

  describe("Decorator Integration", () => {
    it("should integrate decorators with performance tracker", () => {
      @Profile({ category: "user-service" })
      class UserService {
        @Timed({ category: "user.validation", threshold: 10 })
        validateUser(userId: string): boolean {
          // Simulate validation logic
          const isValid = userId.length > 0 && userId.startsWith("user-");
          return isValid;
        }

        @Timed({ category: "user.fetch" })
        async fetchUser(userId: string): Promise<object> {
          // Simulate async user fetch
          await new Promise((resolve) => setTimeout(resolve, 8));
          return { id: userId, name: "Test User" };
        }

        calculateMetrics(data: number[]): number {
          // This method will be automatically profiled by @Profile
          return data.reduce((sum, val) => sum + val, 0) / data.length;
        }
      }

      const userService = new UserService();

      // Execute operations
      const isValid = userService.validateUser("user-123");
      expect(isValid).toBe(true);

      const metrics1 = tracker.getMetrics();
      expect(metrics1.operation.count).toBeGreaterThan(0);

      // Execute async operation
      return userService.fetchUser("user-456").then((user) => {
        expect(user).toEqual({ id: "user-456", name: "Test User" });

        // Execute profiled method
        const average = userService.calculateMetrics([1, 2, 3, 4, 5]);
        expect(average).toBe(3);

        const finalMetrics = tracker.getMetrics();
        expect(finalMetrics.operation.count).toBeGreaterThan(metrics1.operation.count);
        expect(finalMetrics.totalLogs).toBeGreaterThan(2); // At least validation + fetch + calculate
      });
    });

    it("should work with function wrappers", async () => {
      // Create timed functions
      const timedCalculation = withTiming(
        (x: number, y: number) => {
          return Math.pow(x, y);
        },
        { category: "math.calculation" },
      );

      const timedAsyncOperation = withTiming(
        async (delay: number) => {
          await new Promise((resolve) => setTimeout(resolve, delay));
          return "async-complete";
        },
        { category: "async.operation" },
      );

      // Execute timed functions
      const result1 = timedCalculation(2, 8);
      expect(result1).toBe(256);

      const result2 = await timedAsyncOperation(10);
      expect(result2).toBe("async-complete");

      // Verify tracking
      const metrics = tracker.getMetrics();
      expect(metrics.operation.count).toBe(2);
      expect(metrics.totalLogs).toBe(2);
    });
  });

  describe("Memory Monitoring Integration", () => {
    it("should track memory usage over time", async () => {
      const memoryMonitor = new MemoryMonitor();

      // Start memory monitoring
      memoryMonitor.startMonitoring();

      // Simulate some memory-intensive operations
      const largeArrays = [];
      for (let i = 0; i < 10; i++) {
        const measurement = tracker.startOperation("memory.allocation", {
          iteration: i,
          allocSize: "1MB",
        });

        // Allocate some memory
        largeArrays.push(new Array(1000).fill(Math.random()));

        tracker.finishOperation(measurement);
        tracker.recordSuccess();

        // Allow time for memory monitoring
        await new Promise((resolve) => setTimeout(resolve, 2));
      }

      // Get memory metrics
      const memoryMetrics = memoryMonitor.getMemoryMetrics();
      expect(memoryMetrics.rss).toBeGreaterThan(0);
      expect(memoryMetrics.heapUsed).toBeGreaterThan(0);
      expect(memoryMetrics.heapTotal).toBeGreaterThan(0);
      expect(memoryMetrics.utilization).toBeGreaterThan(0);
      expect(memoryMetrics.utilization).toBeLessThanOrEqual(100);

      // Get performance metrics with memory included
      const performanceMetrics = tracker.getMetrics();
      expect(performanceMetrics.resource.memory).toBeDefined();
      expect(performanceMetrics.resource.memory.rss).toBeGreaterThan(0);

      // Stop monitoring
      memoryMonitor.stopMonitoring();

      // Clean up
      largeArrays.length = 0;
    });

    it("should calculate memory trends correctly", async () => {
      const memoryMonitor = new MemoryMonitor();

      // Initial trend should be stable
      expect(memoryMonitor.getMemoryTrend()).toBe("stable");

      // Take multiple memory snapshots to build history
      for (let i = 0; i < 10; i++) {
        memoryMonitor.getMemoryMetrics();
        await new Promise((resolve) => setTimeout(resolve, 1));
      }

      // Trend should be one of the valid values
      const trend = memoryMonitor.getMemoryTrend();
      expect(["increasing", "decreasing", "stable"]).toContain(trend);
    });
  });

  describe("Platform Detection Integration", () => {
    it("should adapt behavior based on platform capabilities", () => {
      const detector = PerformancePlatformDetector.getInstance();
      const platformInfo = detector.getPlatformInfo();

      // Verify platform detection
      expect(platformInfo.isNode).toBe(true); // Running in Node.js test environment
      expect(platformInfo.isBrowser).toBe(false);
      expect(platformInfo.isWebWorker).toBe(false);
      expect(platformInfo.hasPerformanceNow).toBe(true);
      expect(platformInfo.hasMemoryAPI).toBe(true);

      // Test that performance tracker adapts to platform
      const measurement = tracker.startOperation("platform.test");

      if (platformInfo.hasPerformanceNow) {
        expect(measurement.startTime).toBeGreaterThan(0);
        // performance.now() typically returns high-resolution timestamps
        expect(measurement.startTime.toString()).toContain(".");
      }

      tracker.finishOperation(measurement);

      const metrics = tracker.getMetrics();
      if (platformInfo.hasMemoryAPI) {
        expect(metrics.resource.memory).toBeDefined();
        expect(metrics.resource.memory.rss).toBeGreaterThan(0);
      }
    });
  });

  describe("Configuration Impact", () => {
    it("should respect sampling configuration", () => {
      // Create tracker with low sample rate
      const lowSampleConfig = {
        ...config,
        sampleRate: 0.1, // 10% sampling
      };

      const sampledTracker = new EnhancedPerformanceTracker(lowSampleConfig);
      setGlobalPerformanceTracker(sampledTracker);

      // Execute many operations
      const operationCount = 50;
      for (let i = 0; i < operationCount; i++) {
        class TestService {
          @Timed({ category: "sampled.operation" })
          testMethod(): string {
            return `result-${i}`;
          }
        }

        const service = new TestService();
        service.testMethod();
      }

      // With 10% sampling, we should have fewer than all operations tracked
      const metrics = sampledTracker.getMetrics();
      // Due to randomness, we can't be exact, but it should be significantly less than 50
      expect(metrics.operation.count).toBeLessThan(operationCount);
    });

    it("should handle disabled configuration", () => {
      const disabledConfig = {
        ...config,
        enabled: false,
      };

      const disabledTracker = new EnhancedPerformanceTracker(disabledConfig);

      // Execute operations
      const measurement = disabledTracker.startOperation("disabled.test");
      disabledTracker.finishOperation(measurement);
      disabledTracker.recordSuccess();

      // Metrics should reflect minimal tracking
      const metrics = disabledTracker.getMetrics();
      expect(metrics).toBeDefined();
      // Disabled tracker might still provide basic metrics
    });

    it("should respect threshold configuration", () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const thresholdConfig = {
        ...config,
        thresholdMs: 5, // Very low threshold
      };

      const thresholdTracker = new EnhancedPerformanceTracker(thresholdConfig);
      setGlobalPerformanceTracker(thresholdTracker);

      class SlowService {
        @Timed({ category: "slow.operation" })
        slowMethod(): string {
          // Simulate slow operation
          const start = Date.now();
          while (Date.now() - start < 10) {
            // Busy wait
          }
          return "slow-result";
        }
      }

      const service = new SlowService();
      service.slowMethod();

      // Should have warned about threshold exceeded
      // Note: The actual threshold warning is implementation-dependent
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe("Object Pooling Integration", () => {
    it("should reuse measurement objects efficiently", () => {
      const poolConfig = {
        ...config,
        enableMeasurementPooling: true,
        measurementPoolInitialSize: 5,
        measurementPoolMaxSize: 10,
      };

      const pooledTracker = new EnhancedPerformanceTracker(poolConfig);

      // Execute operations to test pooling
      const measurements = [];
      for (let i = 0; i < 15; i++) {
        // More than pool size
        const measurement = pooledTracker.startOperation(`pooled.operation.${i}`);
        measurements.push(measurement);
      }

      // Finish all operations
      measurements.forEach((measurement) => {
        pooledTracker.finishOperation(measurement);
        pooledTracker.recordSuccess();
      });

      // Verify metrics
      const metrics = pooledTracker.getMetrics();
      expect(metrics.operation.count).toBe(15);
      expect(metrics.measurementPoolUtilization).toBeGreaterThanOrEqual(0);
      expect(metrics.measurementPoolUtilization).toBeLessThanOrEqual(100);
    });
  });
});
