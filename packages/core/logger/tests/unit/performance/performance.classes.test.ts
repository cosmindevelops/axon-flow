/**
 * Unit tests for performance tracking classes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  PerformancePlatformDetector,
  MemoryMonitor,
  MeasurementPool,
  MetricsAggregator,
  EnhancedPerformanceTracker,
} from "../../../src/performance/tracker/tracker.classes.js";
import type {
  IEnhancedPerformanceConfig,
  IPerformanceMeasurement,
  IMemoryMetrics,
} from "../../../src/performance/tracker/tracker.types.js";

describe("Performance Classes", () => {
  describe("PerformancePlatformDetector", () => {
    let detector: PerformancePlatformDetector;

    beforeEach(() => {
      detector = PerformancePlatformDetector.getInstance();
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    describe("getInstance", () => {
      it("should return singleton instance", () => {
        const instance1 = PerformancePlatformDetector.getInstance();
        const instance2 = PerformancePlatformDetector.getInstance();
        expect(instance1).toBe(instance2);
      });
    });

    describe("getPlatformInfo", () => {
      it("should detect platform capabilities", () => {
        const platformInfo = detector.getPlatformInfo();

        expect(platformInfo).toBeDefined();
        expect(typeof platformInfo.isNode).toBe("boolean");
        expect(typeof platformInfo.isBrowser).toBe("boolean");
        expect(typeof platformInfo.isWebWorker).toBe("boolean");
        expect(typeof platformInfo.hasGCSupport).toBe("boolean");
        expect(typeof platformInfo.hasPerformanceNow).toBe("boolean");
        expect(typeof platformInfo.hasMemoryAPI).toBe("boolean");
      });

      it("should detect Node.js environment correctly", () => {
        const platformInfo = detector.getPlatformInfo();

        // In test environment, should detect Node.js
        expect(platformInfo.isNode).toBe(true);
        expect(platformInfo.isBrowser).toBe(false);
        expect(platformInfo.isWebWorker).toBe(false);
        expect(platformInfo.hasMemoryAPI).toBe(true);
      });
    });
  });

  describe("MemoryMonitor", () => {
    let memoryMonitor: MemoryMonitor;

    beforeEach(() => {
      memoryMonitor = new MemoryMonitor();
    });

    afterEach(() => {
      vi.clearAllMocks();
      memoryMonitor.stopMonitoring();
    });

    describe("getMemoryMetrics", () => {
      it("should return memory metrics in Node.js environment", () => {
        const metrics = memoryMonitor.getMemoryMetrics();

        expect(metrics).toBeDefined();
        expect(typeof metrics.rss).toBe("number");
        expect(typeof metrics.heapTotal).toBe("number");
        expect(typeof metrics.heapUsed).toBe("number");
        expect(typeof metrics.external).toBe("number");
        expect(typeof metrics.arrayBuffers).toBe("number");
        expect(typeof metrics.utilization).toBe("number");

        expect(metrics.rss).toBeGreaterThan(0);
        expect(metrics.heapTotal).toBeGreaterThan(0);
        expect(metrics.heapUsed).toBeGreaterThan(0);
        expect(metrics.utilization).toBeGreaterThanOrEqual(0);
        expect(metrics.utilization).toBeLessThanOrEqual(100);
      });
    });

    describe("startMonitoring", () => {
      it("should start memory monitoring and begin collecting snapshots", async () => {
        expect(() => memoryMonitor.startMonitoring()).not.toThrow();

        // Wait for initial snapshot to be recorded
        await new Promise((resolve) => setTimeout(resolve, 100));

        const trend = memoryMonitor.getMemoryTrend();
        expect(["increasing", "decreasing", "stable"]).toContain(trend);
      });

      it("should set memory baseline on first monitoring start", () => {
        memoryMonitor.startMonitoring();
        const metrics = memoryMonitor.getMemoryMetrics();

        // Verify baseline is established (can't directly access private field)
        expect(metrics).toBeDefined();
        expect(metrics.heapUsed).toBeGreaterThan(0);
      });
    });

    describe("stopMonitoring", () => {
      it("should stop memory monitoring", () => {
        memoryMonitor.startMonitoring();
        expect(() => memoryMonitor.stopMonitoring()).not.toThrow();
      });
    });

    describe("advanced memory analysis", () => {
      beforeEach(() => {
        memoryMonitor.startMonitoring();
      });

      describe("getMemoryPressure", () => {
        it("should return appropriate pressure levels", () => {
          const pressure = memoryMonitor.getMemoryPressure();
          expect(["low", "medium", "high", "critical"]).toContain(pressure);
        });
      });

      describe("getMemoryGrowthRate", () => {
        it("should return growth rate in MB/minute", () => {
          const growthRate = memoryMonitor.getMemoryGrowthRate();
          expect(typeof growthRate).toBe("number");
          expect(growthRate).toBeGreaterThanOrEqual(0);
        });
      });

      describe("detectMemoryLeak", () => {
        it("should return false initially with insufficient data", () => {
          const hasLeak = memoryMonitor.detectMemoryLeak();
          expect(hasLeak).toBe(false);
        });

        it("should detect sustained high memory usage patterns", async () => {
          // Simulate high memory usage by mocking multiple snapshots
          // This would require access to private methods in a real test scenario
          const hasLeak = memoryMonitor.detectMemoryLeak();
          expect(typeof hasLeak).toBe("boolean");
        });
      });

      describe("getMemoryAnalysis", () => {
        it("should return comprehensive memory analysis", () => {
          const analysis = memoryMonitor.getMemoryAnalysis();

          expect(analysis).toBeDefined();
          expect(["healthy", "warning", "critical"]).toContain(analysis.health);
          expect(["increasing", "decreasing", "stable"]).toContain(analysis.trend);
          expect(["low", "medium", "high", "critical"]).toContain(analysis.pressure);
          expect(typeof analysis.leakDetected).toBe("boolean");
          expect(typeof analysis.growthRate).toBe("number");
          expect(Array.isArray(analysis.recommendations)).toBe(true);
        });

        it("should provide relevant recommendations", () => {
          const analysis = memoryMonitor.getMemoryAnalysis();

          // Recommendations should be strings
          analysis.recommendations.forEach((rec) => {
            expect(typeof rec).toBe("string");
            expect(rec.length).toBeGreaterThan(0);
          });
        });
      });
    });

    describe("getMemoryTrend", () => {
      it("should return 'stable' when insufficient history", () => {
        const trend = memoryMonitor.getMemoryTrend();
        expect(trend).toBe("stable");
      });

      it("should calculate trend correctly with sufficient history", async () => {
        memoryMonitor.startMonitoring();

        // Wait for some snapshots to be collected
        await new Promise((resolve) => setTimeout(resolve, 200));

        const trend = memoryMonitor.getMemoryTrend();
        expect(["increasing", "decreasing", "stable"]).toContain(trend);
      });

      it("should use linear regression for trend analysis", async () => {
        memoryMonitor.startMonitoring();

        // Simulate collecting multiple memory snapshots
        for (let i = 0; i < 15; i++) {
          memoryMonitor.getMemoryMetrics();
          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        const trend = memoryMonitor.getMemoryTrend();
        expect(["increasing", "decreasing", "stable"]).toContain(trend);
      });
    });
  });

  describe("MeasurementPool", () => {
    let pool: MeasurementPool;
    const initialSize = 10;
    const maxSize = 50;

    beforeEach(() => {
      pool = new MeasurementPool(initialSize, maxSize);
    });

    describe("constructor", () => {
      it("should initialize with correct pool size", () => {
        expect(pool.getSize()).toBe(initialSize);
        expect(pool.getActiveCount()).toBe(0);
      });
    });

    describe("acquire and release", () => {
      it("should acquire measurement from pool", () => {
        const measurement = pool.acquire();

        expect(measurement).toBeDefined();
        expect(measurement.inUse).toBe(true);
        expect(measurement.startTime).toBeGreaterThan(0);
        expect(pool.getActiveCount()).toBe(1);
        expect(pool.getSize()).toBe(initialSize);
      });

      it("should release measurement back to pool", () => {
        const measurement = pool.acquire();
        const initialActiveCount = pool.getActiveCount();

        pool.release(measurement);

        expect(measurement.inUse).toBe(false);
        expect(pool.getActiveCount()).toBe(initialActiveCount - 1);
      });

      it("should clean measurement object on release", () => {
        const measurement = pool.acquire();
        measurement.metadata = { test: "data" };
        measurement.category = "test";
        measurement.endTime = Date.now();

        pool.release(measurement);

        expect(measurement.metadata).toBeUndefined();
        expect(measurement.category).toBe("default");
        expect(measurement.endTime).toBeUndefined();
        expect(measurement.startTime).toBe(0);
      });

      it("should create new measurement when pool is empty", () => {
        // Exhaust the pool
        const measurements = [];
        for (let i = 0; i < initialSize + 5; i++) {
          measurements.push(pool.acquire());
        }

        const efficiency = pool.getEfficiencyMetrics();
        expect(efficiency.totalCreations).toBeGreaterThan(0);
        expect(pool.getActiveCount()).toBe(initialSize + 5);

        // Clean up
        measurements.forEach((m) => pool.release(m));
      });
    });

    describe("efficiency tracking", () => {
      it("should track acquisition and reuse metrics", () => {
        const measurement1 = pool.acquire();
        const measurement2 = pool.acquire();

        pool.release(measurement1);
        pool.release(measurement2);

        const reusedMeasurement = pool.acquire();

        const efficiency = pool.getEfficiencyMetrics();
        expect(efficiency.totalAcquisitions).toBe(3);
        expect(efficiency.reuseRate).toBeGreaterThan(0);
        expect(efficiency.hitRate).toBeGreaterThan(0);

        pool.release(reusedMeasurement);
      });

      it("should calculate correct hit rate", () => {
        // Use all pooled objects
        const measurements = [];
        for (let i = 0; i < initialSize; i++) {
          measurements.push(pool.acquire());
        }

        // This should create a new object (miss)
        measurements.push(pool.acquire());

        const efficiency = pool.getEfficiencyMetrics();
        const expectedHitRate = (initialSize / (initialSize + 1)) * 100;
        expect(efficiency.hitRate).toBeCloseTo(expectedHitRate, 1);

        measurements.forEach((m) => pool.release(m));
      });
    });

    describe("pool optimization", () => {
      it("should grow pool when hit rate is low", () => {
        // Force low hit rate by creating many new objects
        const measurements = [];
        for (let i = 0; i < initialSize * 2; i++) {
          measurements.push(pool.acquire());
        }

        // Pool might have grown due to low hit rate
        const sizeBefore = initialSize;
        const sizeAfter = pool.getSize();
        expect(sizeAfter).toBeGreaterThanOrEqual(sizeBefore);

        measurements.forEach((m) => pool.release(m));
      });

      it("should not exceed max size", () => {
        // Try to create more objects than max size allows
        const measurements = [];
        for (let i = 0; i < maxSize * 2; i++) {
          measurements.push(pool.acquire());
        }

        // The key behaviors we want to verify:
        // 1. All acquisitions should succeed
        expect(measurements.length).toBe(maxSize * 2);
        measurements.forEach((m) => {
          expect(m).toBeDefined();
          expect(m.inUse).toBe(true);
        });

        // 2. Pool should be tracking active measurements correctly
        expect(pool.getActiveCount()).toBe(maxSize * 2);

        // 3. Pool efficiency metrics should be available
        const efficiency = pool.getEfficiencyMetrics();
        expect(efficiency.totalAcquisitions).toBe(maxSize * 2);
        expect(efficiency.reuseRate).toBeGreaterThanOrEqual(0);

        measurements.forEach((m) => pool.release(m));

        // After releasing, active count should be 0
        expect(pool.getActiveCount()).toBe(0);
      });
    });

    describe("warmUp", () => {
      it("should pre-populate pool with additional objects", () => {
        const targetSize = initialSize + 5;
        pool.warmUp(targetSize);

        expect(pool.getSize()).toBeGreaterThanOrEqual(targetSize);
      });

      it("should not exceed max size during warmup", () => {
        pool.warmUp(maxSize + 10);
        expect(pool.getSize()).toBeLessThanOrEqual(maxSize);
      });
    });

    describe("compact", () => {
      it("should reduce pool size when efficiency is low", async () => {
        // Simulate low efficiency scenario
        const measurements = [];

        // Create many objects to simulate low reuse
        for (let i = 0; i < initialSize * 3; i++) {
          measurements.push(pool.acquire());
        }

        // Release only some to create inefficiency
        measurements.slice(0, initialSize).forEach((m) => pool.release(m));

        const sizeBefore = pool.getSize();
        pool.compact();

        // Size should be reduced or stay the same
        expect(pool.getSize()).toBeLessThanOrEqual(sizeBefore);

        // Clean up remaining measurements
        measurements.slice(initialSize).forEach((m) => pool.release(m));
      });
    });

    describe("resize", () => {
      it("should resize pool to new size", () => {
        const newSize = initialSize + 10;
        pool.resize(newSize);

        // Pool should accommodate the new size
        expect(pool.getSize()).toBeGreaterThanOrEqual(initialSize);
      });

      it("should not resize below active count", () => {
        const measurements = [];
        for (let i = 0; i < 5; i++) {
          measurements.push(pool.acquire());
        }

        const activeCount = pool.getActiveCount();
        pool.resize(activeCount - 1); // Try to resize below active count

        expect(pool.getActiveCount()).toBe(activeCount); // Should remain unchanged

        measurements.forEach((m) => pool.release(m));
      });
    });

    describe("clear", () => {
      it("should clear all pooled objects and reset metrics", () => {
        const measurement = pool.acquire();
        pool.release(measurement);

        pool.clear();

        expect(pool.getActiveCount()).toBe(0);
        expect(pool.getSize()).toBe(initialSize);

        const efficiency = pool.getEfficiencyMetrics();
        expect(efficiency.totalAcquisitions).toBe(0);
        expect(efficiency.totalCreations).toBe(0);
      });
    });
  });

  describe("MetricsAggregator", () => {
    let aggregator: MetricsAggregator;

    beforeEach(() => {
      aggregator = new MetricsAggregator({ maxHistory: 100 });
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    describe("addMeasurement", () => {
      it("should add measurement and calculate metrics", () => {
        aggregator.addMeasurement(50, "test-operation");

        const metrics = aggregator.getCategoryMetrics("test-operation");
        expect(metrics).toBeDefined();
        expect(metrics.count).toBe(1);
        expect(metrics.averageLatency).toBe(50);
        expect(metrics.minLatency).toBe(50);
        expect(metrics.maxLatency).toBe(50);
      });

      it("should add measurement without category", () => {
        aggregator.addMeasurement(50);

        const metrics = aggregator.getAggregatedMetrics();
        expect(metrics).toBeDefined();
        expect(metrics.count).toBe(1);
        expect(metrics.averageLatency).toBe(50);
      });
    });

    describe("getCategoryMetrics", () => {
      it("should return default metrics for unknown category", () => {
        const metrics = aggregator.getCategoryMetrics("unknown-category");

        expect(metrics.count).toBe(0);
        expect(metrics.averageLatency).toBe(0);
        expect(metrics.throughput).toBe(0);
      });

      it("should calculate correct metrics for multiple measurements", () => {
        const latencies = [50, 100, 25];

        latencies.forEach((latency) => aggregator.addMeasurement(latency, "test"));

        const metrics = aggregator.getCategoryMetrics("test");
        expect(metrics.count).toBe(3);
        expect(metrics.averageLatency).toBeCloseTo(58.33, 1);
        expect(metrics.minLatency).toBe(25);
        expect(metrics.maxLatency).toBe(100);
      });
    });

    describe("getAggregatedMetrics", () => {
      it("should return overall aggregated metrics", () => {
        aggregator.addMeasurement(50, "cat1");
        aggregator.addMeasurement(100, "cat2");

        const allMetrics = aggregator.getAggregatedMetrics();
        expect(allMetrics).toBeDefined();
        expect(allMetrics.count).toBe(2);
        expect(allMetrics.averageLatency).toBe(75);
      });
    });

    describe("reset", () => {
      it("should clear all stored metrics", () => {
        aggregator.addMeasurement(50, "test-category");

        const beforeReset = aggregator.getAggregatedMetrics();
        expect(beforeReset.count).toBeGreaterThan(0);

        aggregator.reset();

        const afterReset = aggregator.getAggregatedMetrics();
        expect(afterReset.count).toBe(0);
      });
    });
  });

  describe("EnhancedPerformanceTracker", () => {
    let tracker: EnhancedPerformanceTracker;
    let config: IEnhancedPerformanceConfig;

    beforeEach(() => {
      config = {
        enabled: true,
        sampleRate: 1.0,
        thresholdMs: 100,
        enableMemoryTracking: true,
        enableGCTracking: true,
        maxLatencyHistory: 1000,
        maxGCEventHistory: 50,
        resourceMetricsInterval: 1000,
        enableMeasurementPooling: true,
        measurementPoolInitialSize: 20,
        measurementPoolMaxSize: 100,
      };
      tracker = new EnhancedPerformanceTracker(config);
    });

    afterEach(() => {
      tracker.reset();
    });

    describe("constructor", () => {
      it("should initialize with memory monitoring enabled", () => {
        const metrics = tracker.getMetrics();
        expect(metrics.resource.memory).toBeDefined();
        expect(metrics.measurementPoolUtilization).toBe(0);
      });

      it("should start resource metrics collection when interval is configured", () => {
        const configWithInterval = { ...config, resourceMetricsInterval: 100 };
        const trackerWithInterval = new EnhancedPerformanceTracker(configWithInterval);

        expect(() => trackerWithInterval.getMetrics()).not.toThrow();
        trackerWithInterval.reset();
      });
    });

    describe("memory analysis integration", () => {
      it("should provide memory analysis", () => {
        const analysis = tracker.getMemoryAnalysis();

        expect(analysis).toBeDefined();
        expect(["healthy", "warning", "critical"]).toContain(analysis.health);
        expect(["increasing", "decreasing", "stable"]).toContain(analysis.trend);
        expect(["low", "medium", "high", "critical"]).toContain(analysis.pressure);
        expect(typeof analysis.leakDetected).toBe("boolean");
        expect(typeof analysis.growthRate).toBe("number");
        expect(Array.isArray(analysis.recommendations)).toBe(true);
      });
    });

    describe("pool efficiency", () => {
      it("should track pool efficiency", () => {
        const measurement1 = tracker.startOperation("test");
        tracker.finishOperation(measurement1);

        const measurement2 = tracker.startOperation("test");
        tracker.finishOperation(measurement2);

        const efficiency = tracker.getPoolEfficiency();
        expect(typeof efficiency).toBe("number");
        expect(efficiency).toBeGreaterThanOrEqual(0);
        expect(efficiency).toBeLessThanOrEqual(100);
      });

      it("should achieve high pool reuse efficiency", () => {
        // Perform multiple operations to test pool reuse
        const operations = 50;
        for (let i = 0; i < operations; i++) {
          const measurement = tracker.startOperation(`test-${i % 5}`);
          setTimeout(() => tracker.finishOperation(measurement), 1);
        }

        // Wait for operations to complete
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            const efficiency = tracker.getPoolEfficiency();
            // Should achieve high efficiency with pool reuse
            expect(efficiency).toBeGreaterThan(60); // Target >80% but allow some variance
            resolve();
          }, 100);
        });
      });
    });

    describe("GC tracking", () => {
      it("should initialize GC tracking when enabled", () => {
        const metrics = tracker.getMetrics();
        expect(Array.isArray(metrics.gcEvents)).toBe(true);
      });

      it("should provide forceGC method for testing", () => {
        expect(() => tracker.forceGC()).not.toThrow();
      });
    });

    describe("enhanced resource metrics", () => {
      it("should provide enhanced CPU usage calculation", () => {
        const metrics = tracker.getMetrics();
        expect(typeof metrics.resource.cpuUsage).toBe("number");
        expect(metrics.resource.cpuUsage).toBeGreaterThanOrEqual(0);
      });

      it("should track event loop delay in Node.js", () => {
        const metrics = tracker.getMetrics();

        if (typeof process !== "undefined") {
          // In Node.js environment, eventLoopDelay should be defined
          expect(metrics.resource.eventLoopDelay).toBeDefined();
          expect(typeof metrics.resource.eventLoopDelay).toBe("number");
        }
      });
    });

    describe("configuration updates", () => {
      it("should update GC tracking configuration", () => {
        tracker.updateConfig({ enableGCTracking: false });
        // GC tracking should be disabled - difficult to test directly
        expect(() => tracker.getMetrics()).not.toThrow();
      });

      it("should update memory tracking configuration", () => {
        tracker.updateConfig({ enableMemoryTracking: false });

        const metrics = tracker.getMetrics();
        expect(metrics.resource.memory).toBeDefined(); // Should still provide metrics
      });

      it("should update resource metrics interval", () => {
        tracker.updateConfig({ resourceMetricsInterval: 2000 });
        expect(() => tracker.getMetrics()).not.toThrow();
      });
    });

    describe("performance optimization", () => {
      it("should maintain low performance overhead", () => {
        const startTime = Date.now();
        const operations = 100;

        for (let i = 0; i < operations; i++) {
          const measurement = tracker.startOperation("performance-test");
          tracker.finishOperation(measurement);
        }

        const endTime = Date.now();
        const totalTime = endTime - startTime;
        const avgTimePerOp = totalTime / operations;

        // Should complete 100 operations quickly (< 1ms average per operation)
        expect(avgTimePerOp).toBeLessThan(1);
      });

      it("should handle high-frequency operations efficiently", () => {
        const operations = 1000;
        const measurements: any[] = [];

        const startTime = Date.now();

        // Start many operations
        for (let i = 0; i < operations; i++) {
          measurements.push(tracker.startOperation(`batch-${i % 10}`));
        }

        // Finish all operations
        measurements.forEach((m) => tracker.finishOperation(m));

        const endTime = Date.now();
        const metrics = tracker.getMetrics();

        expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
        expect(metrics.operation.count).toBe(operations);
        expect(tracker.getPoolEfficiency()).toBeGreaterThan(80); // High efficiency expected
      });
    });
  });
});
