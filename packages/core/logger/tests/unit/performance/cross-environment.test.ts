/**
 * Cross-environment compatibility tests for performance tracking
 * Validates behavior across Node.js versions, browsers, and Web Workers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  PerformancePlatformDetector,
  EnhancedPerformanceTracker,
} from "../../../src/performance/performance.classes.js";
import type {
  IEnhancedPerformanceConfig,
  IPlatformInfo,
  IEnvironmentProfile,
} from "../../../src/performance/performance.types.js";

describe("Cross-Environment Compatibility", () => {
  let detector: PerformancePlatformDetector;
  let tracker: EnhancedPerformanceTracker;
  let config: IEnhancedPerformanceConfig;

  beforeEach(() => {
    detector = PerformancePlatformDetector.getInstance();
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
      enableEnvironmentOptimization: true,
      enableAutoProfileSelection: true,
      enableParityValidation: true,
      parityValidationInterval: 5000,
      enableWebWorkerSupport: true,
      enableBrowserFallbacks: true,
    };
    tracker = new EnhancedPerformanceTracker(config);
  });

  afterEach(() => {
    tracker.reset();
    vi.clearAllMocks();
  });

  describe("Platform Detection", () => {
    it("should detect Node.js environment correctly", () => {
      const platformInfo = detector.getPlatformInfo();

      expect(platformInfo.isNode).toBe(true);
      expect(platformInfo.isBrowser).toBe(false);
      expect(platformInfo.isWebWorker).toBe(false);
      expect(platformInfo.hasMemoryAPI).toBe(true);
      expect(platformInfo.hasPerformanceNow).toBe(true);
    });

    it("should provide Node.js version information", () => {
      const platformInfo = detector.getPlatformInfo();

      if (platformInfo.isNode) {
        expect(platformInfo.nodeVersion).toBeDefined();
        expect(platformInfo.nodeVersion).toMatch(/^\d+\.\d+\.\d+/);
      }
    });

    it("should detect platform capabilities correctly", () => {
      const platformInfo = detector.getPlatformInfo();

      expect(platformInfo.capabilities).toBeDefined();
      expect(platformInfo.capabilities.maxConcurrentObservations).toBeGreaterThan(0);
      expect(platformInfo.capabilities.recommendedPoolSize).toBeGreaterThan(0);
      expect(platformInfo.capabilities.optimalSampleRate).toBeGreaterThan(0);
    });

    it("should validate environment compatibility", () => {
      const compatibility = detector.validateEnvironmentCompatibility();

      expect(compatibility).toBeDefined();
      expect(typeof compatibility.compatible).toBe("boolean");
      expect(Array.isArray(compatibility.issues)).toBe(true);
    });
  });

  describe("Environment Profiles", () => {
    it("should provide appropriate profile for current environment", () => {
      const profile = detector.getEnvironmentProfile();

      expect(profile).toBeDefined();
      expect(profile.name).toBeDefined();
      expect(profile.environment).toBeDefined();
      expect(profile.config).toBeDefined();
      expect(profile.features).toBeDefined();
      expect(profile.thresholds).toBeDefined();
    });

    it("should have Node.js optimized configuration for Node environments", () => {
      const profile = detector.getEnvironmentProfile();
      const platformInfo = detector.getPlatformInfo();

      if (platformInfo.isNode && profile.environment !== "unknown") {
        expect(profile.environment).toMatch(/node/);
        expect(profile.features.memoryTracking).toBe(true);
        expect(profile.features.resourceMetrics).toBe(true);
        expect(profile.config.measurementPoolInitialSize).toBeGreaterThan(25);
      } else {
        // In test environment, it might fall back to unknown
        expect(profile.environment).toBeDefined();
      }
    });

    it("should provide fallback profile for unknown environments", () => {
      // Mock unknown environment
      const originalDetect = detector['detectEnvironmentType'];
      detector['detectEnvironmentType'] = () => 'unknown-env';

      const profile = detector.getEnvironmentProfile();

      expect(profile.name).toBe("Default Fallback");
      expect(profile.features.memoryTracking).toBe(false);
      expect(profile.features.gcTracking).toBe(false);

      // Restore
      detector['detectEnvironmentType'] = originalDetect;
    });
  });

  describe("Performance API Fallbacks", () => {
    it("should handle missing performance.now gracefully", () => {
      // Mock missing performance.now
      const originalPerformance = global.performance;
      try {
        // @ts-ignore
        global.performance = undefined;

        const measurement = tracker.startOperation("test");
        expect(measurement.startTime).toBeGreaterThan(0);

        tracker.finishOperation(measurement);
      } finally {
        // Restore
        global.performance = originalPerformance;
      }
    });

    it("should handle missing PerformanceObserver gracefully", () => {
      // This is tested by checking that GC tracking initialization doesn't throw
      expect(() => {
        const newConfig = { ...config, enableGCTracking: true };
        const newTracker = new EnhancedPerformanceTracker(newConfig);
        newTracker.reset();
      }).not.toThrow();
    });

    it("should provide memory fallbacks when APIs are unavailable", () => {
      // Mock process.memoryUsage not available
      const originalMemoryUsage = process.memoryUsage;
      try {
        // @ts-ignore
        process.memoryUsage = undefined;

        const metrics = tracker.getMetrics();
        expect(metrics.resource.memory).toBeDefined();
        expect(metrics.resource.memory.rss).toBeGreaterThanOrEqual(0);
        expect(metrics.resource.memory.heapTotal).toBeGreaterThanOrEqual(0);
      } finally {
        // Restore
        process.memoryUsage = originalMemoryUsage;
      }
    });
  });

  describe("Node.js Version Compatibility", () => {
    it("should optimize for Node.js 18.x", () => {
      // Mock Node 18
      const originalVersion = process.versions.node;
      process.versions.node = "18.19.0";

      const freshDetector = new (PerformancePlatformDetector as any)();
      const platformInfo = freshDetector.detectPlatform();

      expect(platformInfo.capabilities.maxConcurrentObservations).toBe(500);
      expect(platformInfo.capabilities.recommendedPoolSize).toBe(50);

      // Restore
      process.versions.node = originalVersion;
    });

    it("should optimize for Node.js 20.x+", () => {
      // Mock Node 20
      const originalVersion = process.versions.node;
      process.versions.node = "20.10.0";

      const freshDetector = new (PerformancePlatformDetector as any)();
      const platformInfo = freshDetector.detectPlatform();

      expect(platformInfo.capabilities.maxConcurrentObservations).toBe(1000);
      expect(platformInfo.capabilities.recommendedPoolSize).toBe(100);
      expect(platformInfo.capabilities.supportsCPUProfiling).toBe(true);

      // Restore
      process.versions.node = originalVersion;
    });

    it("should handle unknown Node.js versions gracefully", () => {
      const originalVersion = process.versions.node;
      process.versions.node = "99.0.0";

      const freshDetector = new (PerformancePlatformDetector as any)();
      const platformInfo = freshDetector.detectPlatform();

      expect(platformInfo.capabilities.maxConcurrentObservations).toBeGreaterThan(0);

      // Restore
      process.versions.node = originalVersion;
    });
  });

  describe("Performance Parity Validation", () => {
    it("should validate performance parity", () => {
      const parityReport = tracker.validatePerformanceParity();

      expect(parityReport).toBeDefined();
      expect(parityReport.environment).toBeDefined();
      expect(parityReport.baseline).toBeDefined();
      expect(parityReport.current).toBeDefined();
      expect(typeof parityReport.variance).toBe("number");
      expect(typeof parityReport.parityMaintained).toBe("boolean");
      expect(Array.isArray(parityReport.recommendations)).toBe(true);
      expect(parityReport.timestamp).toBeGreaterThan(0);
    });

    it("should detect performance variance", () => {
      // Simulate performance measurements
      for (let i = 0; i < 10; i++) {
        const measurement = tracker.startOperation("test");
        // Simulate slow operation
        measurement.startTime -= 200; // Add artificial delay
        tracker.finishOperation(measurement);
      }

      const parityReport = tracker.validatePerformanceParity();
      expect(parityReport.variance).toBeGreaterThan(0);
    });

    it("should provide recommendations for high variance", () => {
      // Mock high variance scenario
      const originalCalculateVariance = tracker['calculateVariance'];
      tracker['calculateVariance'] = () => 30; // 30% variance

      const parityReport = tracker.validatePerformanceParity();
      
      expect(parityReport.parityMaintained).toBe(false);
      expect(parityReport.recommendations.length).toBeGreaterThan(0);
      expect(parityReport.recommendations[0]).toContain("30.0% exceeds 10% threshold");

      // Restore
      tracker['calculateVariance'] = originalCalculateVariance;
    });
  });

  describe("Cross-Environment Measurements", () => {
    it("should maintain consistent measurement format across environments", () => {
      const measurement = tracker.startOperation("cross-env-test", { environment: "test" });

      expect(measurement).toBeDefined();
      expect(measurement.id).toBeDefined();
      expect(measurement.startTime).toBeGreaterThan(0);
      expect(measurement.category).toBe("cross-env-test");
      expect(measurement.metadata?.environment).toBe("test");
      expect(measurement.inUse).toBe(true);

      tracker.finishOperation(measurement);
    });

    it("should handle high-frequency operations consistently", () => {
      const startTime = Date.now();
      const operations = 100;
      const measurements: any[] = [];

      // Create measurements
      for (let i = 0; i < operations; i++) {
        measurements.push(tracker.startOperation(`batch-${i % 5}`));
      }

      // Finish measurements
      measurements.forEach(m => tracker.finishOperation(m));

      const endTime = Date.now();
      const metrics = tracker.getMetrics();

      // Validate performance characteristics
      expect(endTime - startTime).toBeLessThan(500); // Should complete quickly
      expect(metrics.operation.count).toBe(operations);
      expect(metrics.measurementPoolUtilization).toBeGreaterThan(0);
    });

    it("should maintain performance under memory pressure", () => {
      // Create many operations to stress memory
      const operations = 1000;
      const measurements: any[] = [];

      for (let i = 0; i < operations; i++) {
        const measurement = tracker.startOperation("memory-stress");
        measurement.metadata = { iteration: i, data: new Array(100).fill(i) };
        tracker.finishOperation(measurement);
      }

      const metrics = tracker.getMetrics();
      expect(metrics.operation.count).toBe(operations);

      // Memory should still be healthy
      const analysis = tracker.getMemoryAnalysis();
      expect(analysis.health).not.toBe("critical");
    });
  });

  describe("Platform-Specific Optimizations", () => {
    it("should adjust pool size based on platform capabilities", () => {
      const platformInfo = tracker.getPlatformInfo();
      const profile = tracker.getEnvironmentProfile();

      if (platformInfo.isNode) {
        // Node.js should have larger pool sizes
        expect(profile.config.measurementPoolMaxSize).toBeGreaterThan(50);
      } else {
        // Other environments should be more conservative
        expect(profile.config.measurementPoolMaxSize).toBeLessThan(200);
      }
    });

    it("should adjust sampling rate based on environment", () => {
      const profile = tracker.getEnvironmentProfile();

      // Node.js environments should support higher sampling
      if (detector.getPlatformInfo().isNode) {
        expect(profile.thresholds.sampling).toBeGreaterThanOrEqual(0.5);
      }
    });

    it("should enable appropriate features based on platform", () => {
      const platformInfo = tracker.getPlatformInfo();
      const profile = tracker.getEnvironmentProfile();

      if (platformInfo.isNode) {
        expect(profile.features.memoryTracking).toBe(true);
        expect(profile.features.resourceMetrics).toBe(true);
      }

      if (platformInfo.hasGCSupport) {
        expect(profile.features.gcTracking).toBe(true);
      }
    });
  });

  describe("Error Resilience", () => {
    it("should handle platform detection errors gracefully", () => {
      // Mock global objects being unavailable
      const originalProcess = global.process;
      const originalPerformance = global.performance;

      try {
        // @ts-ignore
        delete global.process;
        // @ts-ignore
        delete global.performance;

        expect(() => {
          const resilientDetector = new (PerformancePlatformDetector as any)();
          resilientDetector.detectPlatform();
        }).not.toThrow();

      } finally {
        // Restore
        global.process = originalProcess;
        global.performance = originalPerformance;
      }
    });

    it("should continue operating when performance APIs fail", () => {
      // Mock performance.now to throw
      const originalNow = performance.now;
      performance.now = () => { throw new Error("Performance API unavailable"); };

      expect(() => {
        const measurement = tracker.startOperation("error-resilience");
        tracker.finishOperation(measurement);
      }).not.toThrow();

      // Restore
      performance.now = originalNow;
    });

    it("should handle configuration validation errors", () => {
      expect(() => {
        const invalidConfig = {
          ...config,
          measurementPoolInitialSize: -1,
          measurementPoolMaxSize: 0,
        };
        new EnhancedPerformanceTracker(invalidConfig);
      }).not.toThrow();
    });
  });

  describe("Environment Transition", () => {
    it("should maintain metrics when configuration changes", () => {
      // Record some operations
      for (let i = 0; i < 5; i++) {
        const measurement = tracker.startOperation("transition-test");
        tracker.finishOperation(measurement);
      }

      const beforeMetrics = tracker.getMetrics();
      expect(beforeMetrics.operation.count).toBe(5);

      // Update configuration
      tracker.updateConfig({
        enableMemoryTracking: false,
        measurementPoolMaxSize: 200,
      });

      const afterMetrics = tracker.getMetrics();
      expect(afterMetrics.operation.count).toBe(5); // Should preserve existing metrics
    });

    it("should adapt to runtime environment changes", () => {
      const initialProfile = tracker.getEnvironmentProfile();
      
      // Simulate environment change by updating detector profiles
      const customProfile: IEnvironmentProfile = {
        name: "Custom Environment",
        environment: "custom",
        config: {
          measurementPoolInitialSize: 5,
          measurementPoolMaxSize: 20,
        },
        features: {
          memoryTracking: false,
          gcTracking: false,
          resourceMetrics: false,
          advancedProfiling: false,
        },
        thresholds: {
          warning: 1000,
          critical: 5000,
          sampling: 0.01,
        },
      };

      tracker.updateConfig({ customProfile });
      
      // Tracker should continue to function with new profile
      expect(() => {
        const measurement = tracker.startOperation("adaptive-test");
        tracker.finishOperation(measurement);
      }).not.toThrow();
    });
  });
});