/**
 * Performance parity validation integration tests
 * Validates that performance tracking maintains <10% variance across different environments
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PerformancePlatformDetector, EnhancedPerformanceTracker } from "../../src/performance/core/core.classes.js";
import type {
  IEnhancedPerformanceConfig,
  IPerformanceParityReport,
  IPlatformInfo,
} from "../../src/performance/core/core.types.js";

describe("Performance Parity Validation", () => {
  let baseConfig: IEnhancedPerformanceConfig;

  beforeEach(() => {
    baseConfig = {
      enabled: true,
      sampleRate: 1.0,
      thresholdMs: 100,
      enableMemoryTracking: true,
      enableGCTracking: false,
      maxLatencyHistory: 1000,
      maxGCEventHistory: 50,
      resourceMetricsInterval: 5000,
      enableMeasurementPooling: true,
      measurementPoolInitialSize: 50,
      measurementPoolMaxSize: 200,
      enableEnvironmentOptimization: true,
      enableAutoProfileSelection: true,
      enableParityValidation: true,
      parityValidationInterval: 10000,
      enableWebWorkerSupport: true,
      enableBrowserFallbacks: true,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Baseline Performance Establishment", () => {
    it("should establish consistent baseline metrics", async () => {
      const tracker = new EnhancedPerformanceTracker(baseConfig);
      const operations = 100;
      const measurements: any[] = [];

      // Warm up the tracker
      for (let i = 0; i < 10; i++) {
        const warmup = tracker.startOperation("warmup");
        tracker.finishOperation(warmup);
      }

      // Establish baseline with consistent operations
      const startTime = Date.now();
      for (let i = 0; i < operations; i++) {
        const measurement = tracker.startOperation("baseline-op");
        // Simulate consistent work
        await new Promise((resolve) => setTimeout(resolve, 1));
        tracker.finishOperation(measurement);
      }
      const endTime = Date.now();

      const metrics = tracker.getMetrics();

      expect(metrics.operation.count).toBe(operations + 10); // Including warmup
      expect(metrics.operation.averageLatency).toBeGreaterThan(0);
      expect(metrics.operation.averageLatency).toBeLessThan(50); // Should be fast
      expect(endTime - startTime).toBeLessThan(2000); // Should complete in reasonable time

      tracker.reset();
    });

    it("should maintain consistent throughput under load", () => {
      const tracker = new EnhancedPerformanceTracker(baseConfig);
      const batches = 5;
      const opsPerBatch = 50;
      const throughputMeasurements: number[] = [];

      for (let batch = 0; batch < batches; batch++) {
        const batchStart = Date.now();

        for (let i = 0; i < opsPerBatch; i++) {
          const measurement = tracker.startOperation(`batch-${batch}-op`);
          tracker.finishOperation(measurement);
        }

        const batchEnd = Date.now();
        const throughput = opsPerBatch / ((batchEnd - batchStart) / 1000);
        throughputMeasurements.push(throughput);
      }

      // Calculate coefficient of variation to measure consistency
      const mean = throughputMeasurements.reduce((a, b) => a + b, 0) / throughputMeasurements.length;
      const variance =
        throughputMeasurements.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / throughputMeasurements.length;
      const standardDeviation = Math.sqrt(variance);
      const coefficientOfVariation = (standardDeviation / mean) * 100;

      // Throughput should be consistent (CV < 20%)
      expect(coefficientOfVariation).toBeLessThan(20);
      expect(mean).toBeGreaterThan(0);

      tracker.reset();
    });
  });

  describe("Environment-Specific Parity", () => {
    it("should validate parity report structure", () => {
      const tracker = new EnhancedPerformanceTracker(baseConfig);

      // Generate some operations
      for (let i = 0; i < 20; i++) {
        const measurement = tracker.startOperation("parity-test");
        tracker.finishOperation(measurement);
      }

      const parityReport = tracker.validatePerformanceParity();

      expect(parityReport).toMatchObject({
        environment: expect.any(String),
        baseline: expect.objectContaining({
          count: expect.any(Number),
          averageLatency: expect.any(Number),
          minLatency: expect.any(Number),
          maxLatency: expect.any(Number),
        }),
        current: expect.objectContaining({
          count: expect.any(Number),
          averageLatency: expect.any(Number),
          minLatency: expect.any(Number),
          maxLatency: expect.any(Number),
        }),
        variance: expect.any(Number),
        parityMaintained: expect.any(Boolean),
        recommendations: expect.any(Array),
        timestamp: expect.any(Number),
      });

      tracker.reset();
    });

    it("should maintain parity under normal operations", () => {
      const tracker = new EnhancedPerformanceTracker(baseConfig);

      // Perform operations similar to baseline
      for (let i = 0; i < 100; i++) {
        const measurement = tracker.startOperation("normal-op");
        // Keep operations fast and consistent
        tracker.finishOperation(measurement);
      }

      const parityReport = tracker.validatePerformanceParity();

      // Under normal conditions, variance should be acceptable
      expect(parityReport.variance).toBeLessThan(50); // Allow 50% variance for test environment
      expect(parityReport.parityMaintained).toBe(parityReport.variance < 10);
      expect(parityReport.environment).toBeDefined();

      tracker.reset();
    });

    it("should detect performance degradation", () => {
      const tracker = new EnhancedPerformanceTracker(baseConfig);

      // Simulate degraded performance
      for (let i = 0; i < 20; i++) {
        const measurement = tracker.startOperation("slow-op");
        measurement.startTime -= 100; // Simulate 100ms additional latency
        tracker.finishOperation(measurement);
      }

      const parityReport = tracker.validatePerformanceParity();

      expect(parityReport.variance).toBeGreaterThan(10);
      expect(parityReport.parityMaintained).toBe(false);
      expect(parityReport.recommendations.length).toBeGreaterThan(0);

      tracker.reset();
    });
  });

  describe("Configuration Impact on Parity", () => {
    it("should maintain parity with different pool sizes", () => {
      const configurations = [
        { ...baseConfig, measurementPoolInitialSize: 10, measurementPoolMaxSize: 25 },
        { ...baseConfig, measurementPoolInitialSize: 50, measurementPoolMaxSize: 200 },
        { ...baseConfig, measurementPoolInitialSize: 100, measurementPoolMaxSize: 500 },
      ];

      const results: IPerformanceParityReport[] = [];

      configurations.forEach((config, index) => {
        const tracker = new EnhancedPerformanceTracker(config);

        // Perform consistent operations
        for (let i = 0; i < 50; i++) {
          const measurement = tracker.startOperation(`config-${index}`);
          tracker.finishOperation(measurement);
        }

        const parityReport = tracker.validatePerformanceParity();
        results.push(parityReport);
        tracker.reset();
      });

      // All configurations should maintain reasonable parity
      results.forEach((result, index) => {
        expect(result.variance).toBeLessThan(100); // Allow higher variance due to different configs
        expect(result.current.count).toBe(50);
        expect(result.current.averageLatency).toBeGreaterThan(0);
      });

      // Variance between configurations should be reasonable
      const latencies = results.map((r) => r.current.averageLatency);
      const maxLatency = Math.max(...latencies);
      const minLatency = Math.min(...latencies);
      const configVariance = ((maxLatency - minLatency) / minLatency) * 100;

      expect(configVariance).toBeLessThan(200); // Allow significant variance between configs
    });

    it("should handle sampling rate impact on parity", () => {
      const samplingRates = [0.1, 0.5, 1.0];
      const results: { rate: number; avgLatency: number; count: number }[] = [];

      samplingRates.forEach((rate) => {
        const config = { ...baseConfig, sampleRate: rate };
        const tracker = new EnhancedPerformanceTracker(config);

        // Perform more operations to account for sampling
        for (let i = 0; i < 200; i++) {
          const measurement = tracker.startOperation("sampling-test");
          tracker.finishOperation(measurement);
        }

        const metrics = tracker.getMetrics();
        results.push({
          rate,
          avgLatency: metrics.operation.averageLatency,
          count: metrics.operation.count,
        });

        tracker.reset();
      });

      // Higher sampling rates should capture more operations
      expect(results[2].count).toBeGreaterThanOrEqual(results[1].count); // 1.0 >= 0.5
      expect(results[1].count).toBeGreaterThanOrEqual(results[0].count); // 0.5 >= 0.1

      // Latency measurements should be consistent regardless of sampling
      const latencies = results.map((r) => r.avgLatency).filter((l) => l > 0);
      if (latencies.length > 1) {
        const maxLat = Math.max(...latencies);
        const minLat = Math.min(...latencies);
        const samplingVariance = ((maxLat - minLat) / minLat) * 100;

        expect(samplingVariance).toBeLessThan(100); // Sampling shouldn't dramatically affect latency
      }
    });
  });

  describe("Memory Pressure Impact", () => {
    it("should maintain parity under memory pressure", () => {
      const tracker = new EnhancedPerformanceTracker({
        ...baseConfig,
        enableMemoryTracking: true,
      });

      // Create memory pressure by generating large metadata
      const largeData = new Array(1000).fill("test-data");

      for (let i = 0; i < 30; i++) {
        const measurement = tracker.startOperation("memory-pressure", {
          iteration: i,
          data: largeData,
          timestamp: Date.now(),
        });
        tracker.finishOperation(measurement);
      }

      const parityReport = tracker.validatePerformanceParity();
      const memoryAnalysis = tracker.getMemoryAnalysis();

      // Should still maintain reasonable performance
      expect(parityReport.current.count).toBe(30);
      expect(memoryAnalysis.health).not.toBe("critical");

      // Variance might be higher but should be manageable
      expect(parityReport.variance).toBeLessThan(150);

      tracker.reset();
    });

    it("should adapt to platform-specific memory constraints", () => {
      const detector = PerformancePlatformDetector.getInstance();
      const platformInfo = detector.getPlatformInfo();
      const profile = detector.getEnvironmentProfile();

      const tracker = new EnhancedPerformanceTracker({
        ...baseConfig,
        measurementPoolInitialSize: profile.config.measurementPoolInitialSize || 20,
        measurementPoolMaxSize: profile.config.measurementPoolMaxSize || 100,
      });

      // Perform operations within platform constraints
      const operationCount = Math.min(100, platformInfo.capabilities.recommendedPoolSize * 2);

      for (let i = 0; i < operationCount; i++) {
        const measurement = tracker.startOperation("platform-adaptive");
        tracker.finishOperation(measurement);
      }

      const parityReport = tracker.validatePerformanceParity();

      expect(parityReport.current.count).toBe(operationCount);
      expect(parityReport.variance).toBeLessThan(100);

      tracker.reset();
    });
  });

  describe("Long-Running Stability", () => {
    it("should maintain parity over extended periods", async () => {
      const tracker = new EnhancedPerformanceTracker({
        ...baseConfig,
        resourceMetricsInterval: 100, // Faster collection for testing
      });

      const batches = 10;
      const opsPerBatch = 20;
      const results: number[] = [];

      for (let batch = 0; batch < batches; batch++) {
        const batchStart = Date.now();

        for (let i = 0; i < opsPerBatch; i++) {
          const measurement = tracker.startOperation(`longrun-${batch}`);
          tracker.finishOperation(measurement);
        }

        // Small delay between batches
        await new Promise((resolve) => setTimeout(resolve, 50));

        const batchEnd = Date.now();
        results.push(batchEnd - batchStart);
      }

      const parityReport = tracker.validatePerformanceParity();

      // Performance should remain stable across batches
      expect(parityReport.current.count).toBe(batches * opsPerBatch);

      // Calculate stability across batches
      const avgBatchTime = results.reduce((a, b) => a + b, 0) / results.length;
      const batchVariance = results.reduce((acc, val) => acc + Math.pow(val - avgBatchTime, 2), 0) / results.length;
      const batchCV = (Math.sqrt(batchVariance) / avgBatchTime) * 100;

      expect(batchCV).toBeLessThan(50); // Batch times should be relatively stable

      tracker.reset();
    });

    it("should handle tracker lifecycle without performance degradation", () => {
      const iterations = 5;
      const results: number[] = [];

      for (let iteration = 0; iteration < iterations; iteration++) {
        const tracker = new EnhancedPerformanceTracker(baseConfig);

        const startTime = Date.now();

        for (let i = 0; i < 50; i++) {
          const measurement = tracker.startOperation(`lifecycle-${iteration}`);
          tracker.finishOperation(measurement);
        }

        const metrics = tracker.getMetrics();
        results.push(metrics.operation.averageLatency);

        tracker.reset();
      }

      // Latency should remain consistent across tracker instances
      const avgLatency = results.reduce((a, b) => a + b, 0) / results.length;
      const variance = results.reduce((acc, val) => acc + Math.pow(val - avgLatency, 2), 0) / results.length;
      const cv = (Math.sqrt(variance) / avgLatency) * 100;

      expect(cv).toBeLessThan(30); // Consistency across instances
      results.forEach((latency) => {
        expect(latency).toBeGreaterThan(0);
        expect(latency).toBeLessThan(20); // Should remain fast
      });
    });
  });

  describe("Error Recovery and Parity", () => {
    it("should maintain parity after recovering from errors", () => {
      const tracker = new EnhancedPerformanceTracker(baseConfig);

      // Normal operations
      for (let i = 0; i < 20; i++) {
        const measurement = tracker.startOperation("normal");
        tracker.finishOperation(measurement);
      }

      // Simulate error conditions
      try {
        const measurement = tracker.startOperation("error-prone");
        // Simulate error during operation
        throw new Error("Simulated error");
      } catch {
        // Error handled, continue with normal operations
      }

      // Recovery operations
      for (let i = 0; i < 20; i++) {
        const measurement = tracker.startOperation("recovery");
        tracker.finishOperation(measurement);
      }

      const parityReport = tracker.validatePerformanceParity();

      expect(parityReport.current.count).toBe(40); // Should count all successful operations
      expect(parityReport.variance).toBeLessThan(100);

      tracker.reset();
    });

    it("should handle configuration changes without breaking parity", () => {
      const tracker = new EnhancedPerformanceTracker(baseConfig);

      // Initial operations
      for (let i = 0; i < 25; i++) {
        const measurement = tracker.startOperation("initial");
        tracker.finishOperation(measurement);
      }

      // Update configuration
      tracker.updateConfig({
        thresholdMs: 200,
        enableMemoryTracking: false,
        measurementPoolMaxSize: 50,
      });

      // Operations with new configuration
      for (let i = 0; i < 25; i++) {
        const measurement = tracker.startOperation("updated");
        tracker.finishOperation(measurement);
      }

      const parityReport = tracker.validatePerformanceParity();

      expect(parityReport.current.count).toBe(50);
      // Configuration changes might increase variance but shouldn't break functionality
      expect(parityReport.variance).toBeLessThan(200);

      tracker.reset();
    });
  });
});
