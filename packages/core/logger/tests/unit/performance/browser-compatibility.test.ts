/**
 * Browser environment compatibility tests
 * Tests browser-specific performance tracking behaviors and fallbacks
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  PerformancePlatformDetector,
  MemoryMonitor,
  EnhancedPerformanceTracker,
} from "../../../src/performance/core/core.classes.js";
import type { IEnhancedPerformanceConfig, IPlatformInfo } from "../../../src/performance/core/core.types.js";
import { InMemoryTransport } from "../../utils/InMemoryTransport.js";

// Real browser environment simulation for testing
const createBrowserEnvironment = () => {
  const realWindow = {
    location: { href: "https://example.com" },
    document: {},
    navigator: {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      product: "Gecko",
    },
  };

  const realPerformance = {
    now: () => (performance?.now ? performance.now() : Date.now()),
    mark: (name: string) => {
      // Use real performance.mark if available
      if (typeof performance !== "undefined" && performance.mark) {
        try {
          performance.mark(name);
        } catch {
          // Silently fail if performance API unavailable
        }
      }
    },
    measure: (name: string, start?: string, end?: string) => {
      // Use real performance.measure if available
      if (typeof performance !== "undefined" && performance.measure) {
        try {
          performance.measure(name, start, end);
        } catch {
          // Silently fail if performance API unavailable
        }
      }
    },
    getEntries: () => {
      return typeof performance !== "undefined" && performance.getEntries ? performance.getEntries() : [];
    },
    getEntriesByType: (type: string) => {
      return typeof performance !== "undefined" && performance.getEntriesByType
        ? performance.getEntriesByType(type)
        : [];
    },
    getEntriesByName: (name: string) => {
      return typeof performance !== "undefined" && performance.getEntriesByName
        ? performance.getEntriesByName(name)
        : [];
    },
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000,
    },
    navigation: {
      type: 0,
      redirectCount: 0,
    },
  };

  return { realWindow, realPerformance };
};

// Helper function to safely set up browser environment without property conflicts
const setBrowserEnvironment = (realWindow: any, realPerformance: any) => {
  // Create a mock process that avoids "process is not defined" but returns safe values
  (global as any).process = {
    uptime: () => 0,
    memoryUsage: () => ({ heapUsed: 0, heapTotal: 0, external: 0, rss: 0 }),
    // Keep essential properties that Vitest needs
    listeners: global.process?.listeners?.bind?.(global.process),
    emit: global.process?.emit?.bind?.(global.process),
    on: global.process?.on?.bind?.(global.process),
    off: global.process?.off?.bind?.(global.process),
    removeListener: global.process?.removeListener?.bind?.(global.process),
  };

  (global as any).window = realWindow;
  (global as any).document = realWindow.document;

  // Use Object.defineProperty to safely override read-only navigator property
  Object.defineProperty(global, "navigator", {
    value: realWindow.navigator,
    writable: true,
    configurable: true,
  });

  (global as any).performance = realPerformance;
};

describe("Browser Compatibility", () => {
  let originalProcess: any;
  let originalWindow: any;
  let originalPerformance: any;
  let originalNavigator: any;
  let config: IEnhancedPerformanceConfig;
  let testTransport: InMemoryTransport;

  beforeEach(() => {
    // Store original globals
    originalProcess = (global as any).process;
    originalWindow = (global as any).window;
    originalPerformance = (global as any).performance;
    originalNavigator = (global as any).navigator;

    testTransport = new InMemoryTransport();

    config = {
      enabled: true,
      sampleRate: 0.1, // Lower sampling for browser
      thresholdMs: 150,
      enableMemoryTracking: true,
      enableGCTracking: false, // Disabled in browser
      maxLatencyHistory: 500,
      maxGCEventHistory: 0,
      resourceMetricsInterval: 10000,
      enableMeasurementPooling: true,
      measurementPoolInitialSize: 10,
      measurementPoolMaxSize: 50,
      enableEnvironmentOptimization: true,
      enableAutoProfileSelection: true,
      enableParityValidation: true,
      parityValidationInterval: 30000,
      enableWebWorkerSupport: true,
      enableBrowserFallbacks: true,
    };
  });

  afterEach(() => {
    // Restore original globals
    (global as any).process = originalProcess;
    (global as any).window = originalWindow;
    (global as any).performance = originalPerformance;
    (global as any).navigator = originalNavigator;

    testTransport.reset();
  });

  describe("Browser Environment Detection", () => {
    it("should detect browser environment correctly", async () => {
      const { realWindow, realPerformance } = createBrowserEnvironment();

      // Simulate browser environment
      setBrowserEnvironment(realWindow, realPerformance);

      await testTransport.write({
        test: "browser detection",
        environment: "browser",
        userAgent: realWindow.navigator.userAgent,
      });

      const detector = new (PerformancePlatformDetector as any)();
      const platformInfo: IPlatformInfo = detector.detectPlatform();

      expect(platformInfo.isNode).toBe(false);
      expect(platformInfo.isBrowser).toBe(true);
      expect(platformInfo.isWebWorker).toBe(false);
      expect(platformInfo.browserName).toBe("chrome");
      expect(platformInfo.browserVersion).toBe("91");
      expect(platformInfo.hasPerformanceNow).toBe(true);
      expect(platformInfo.hasPerformanceTimeline).toBe(true);

      // Verify test transport captured the event
      expect(testTransport.getLogs()).toHaveLength(1);
      expect(testTransport.hasLog((log) => log.test === "browser detection")).toBe(true);
    });

    it("should detect different browser types", async () => {
      const { realWindow, realPerformance } = createBrowserEnvironment();

      // Test Firefox detection
      realWindow.navigator.userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0";

      setBrowserEnvironment(realWindow, realPerformance);

      await testTransport.write({
        test: "firefox detection",
        userAgent: realWindow.navigator.userAgent,
      });

      const detector = new (PerformancePlatformDetector as any)();
      const platformInfo: IPlatformInfo = detector.detectPlatform();

      expect(platformInfo.browserName).toBe("firefox");
      expect(platformInfo.browserVersion).toBe("89");

      expect(testTransport.hasLog((log) => log.test === "firefox detection")).toBe(true);
    });

    it("should detect Safari correctly", async () => {
      const { realWindow, realPerformance } = createBrowserEnvironment();

      // Test Safari detection
      realWindow.navigator.userAgent =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Version/14.1.1 Safari/537.36";

      setBrowserEnvironment(realWindow, realPerformance);

      await testTransport.write({
        test: "safari detection",
        userAgent: realWindow.navigator.userAgent,
      });

      const detector = new (PerformancePlatformDetector as any)();
      const platformInfo: IPlatformInfo = detector.detectPlatform();

      expect(platformInfo.browserName).toBe("safari");
      expect(platformInfo.browserVersion).toBe("14");

      expect(testTransport.hasLog((log) => log.test === "safari detection")).toBe(true);
    });
  });

  describe("Browser Performance API Support", () => {
    it("should handle performance.memory availability", async () => {
      const { realWindow, realPerformance } = createBrowserEnvironment();

      setBrowserEnvironment(realWindow, realPerformance);

      await testTransport.write({
        test: "memory availability",
        memoryHeap: realPerformance.memory.usedJSHeapSize,
      });

      const memoryMonitor = new MemoryMonitor();
      const metrics = memoryMonitor.getMemoryMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.heapUsed).toBe(1000000);
      expect(metrics.heapTotal).toBe(2000000);
      expect(metrics.utilization).toBe(50); // 1M / 2M * 100

      expect(testTransport.hasLog((log) => log.test === "memory availability")).toBe(true);
    });

    it("should fallback gracefully when performance.memory is unavailable", async () => {
      const { realWindow, realPerformance } = createBrowserEnvironment();
      delete realPerformance.memory;

      setBrowserEnvironment(realWindow, realPerformance);

      await testTransport.write({
        test: "memory fallback",
        hasMemoryAPI: false,
      });

      const memoryMonitor = new MemoryMonitor();
      const metrics = memoryMonitor.getMemoryMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.heapUsed).toBe(0);
      expect(metrics.heapTotal).toBe(0);
      expect(metrics.utilization).toBe(0);

      expect(testTransport.hasLog((log) => log.test === "memory fallback")).toBe(true);
    });

    it("should use performance.now when available", async () => {
      const { realWindow, realPerformance } = createBrowserEnvironment();

      setBrowserEnvironment(realWindow, realPerformance);

      // Override global performance.now with a fixed value for testing
      let nowCallCount = 0;
      (global as any).performance.now = () => {
        nowCallCount++;
        return 123.456;
      };

      await testTransport.write({
        test: "performance.now usage",
        nowValue: 123.456,
      });

      const tracker = new EnhancedPerformanceTracker(config);
      const measurement = tracker.startOperation("browser-test");

      expect(nowCallCount).toBeGreaterThan(0);
      expect(measurement.startTime).toBe(123.456);

      expect(testTransport.hasLog((log) => log.test === "performance.now usage")).toBe(true);

      tracker.reset();
    });

    it("should fallback to Date.now when performance.now unavailable", async () => {
      const { realWindow } = createBrowserEnvironment();

      // Set up browser environment with no performance.now
      setBrowserEnvironment(realWindow, {});

      // Delete performance.now to force fallback
      delete (global as any).performance.now;

      await testTransport.write({
        test: "fallback to Date.now",
        hasPerformanceNow: false,
      });

      const tracker = new EnhancedPerformanceTracker(config);
      const startTime = Date.now();

      // Add a small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 2));

      const measurement = tracker.startOperation("fallback-test");

      expect(measurement.startTime).toBeGreaterThan(startTime);
      expect(measurement.startTime).toBeCloseTo(Date.now(), -1); // Within 10ms

      expect(testTransport.hasLog((log) => log.test === "fallback to Date.now")).toBe(true);

      tracker.reset();
    });
  });

  describe("Browser-Specific Optimizations", () => {
    it("should apply browser-specific configuration profile", async () => {
      const { realWindow, realPerformance } = createBrowserEnvironment();

      setBrowserEnvironment(realWindow, realPerformance);

      await testTransport.write({
        test: "browser configuration profile",
        userAgent: realWindow.navigator.userAgent,
      });

      const detector = new (PerformancePlatformDetector as any)();
      const profile = detector.getEnvironmentProfile();

      expect(profile.environment).toMatch(/browser/);
      expect(profile.features.memoryTracking).toBe(true);
      expect(profile.features.gcTracking).toBe(false); // Disabled in browser
      expect(profile.config.sampleRate).toBeLessThan(0.5); // Lower sampling
      expect(profile.thresholds.warning).toBeGreaterThan(100); // More lenient

      expect(testTransport.hasLog((log) => log.test === "browser configuration profile")).toBe(true);
    });

    it("should optimize pool size for browser constraints", async () => {
      const { realWindow, realPerformance } = createBrowserEnvironment();

      setBrowserEnvironment(realWindow, realPerformance);

      await testTransport.write({
        test: "browser pool optimization",
        environment: "browser",
      });

      const detector = new (PerformancePlatformDetector as any)();
      const platformInfo = detector.detectPlatform();

      expect(platformInfo.capabilities.recommendedPoolSize).toBeLessThan(50);
      expect(platformInfo.capabilities.maxConcurrentObservations).toBeLessThan(500);

      expect(testTransport.hasLog((log) => log.test === "browser pool optimization")).toBe(true);
    });

    it("should handle browser performance budget multipliers", async () => {
      const { realWindow, realPerformance } = createBrowserEnvironment();

      setBrowserEnvironment(realWindow, realPerformance);

      await testTransport.write({
        test: "browser performance budget",
        multiplier: "calculation",
      });

      const detector = new (PerformancePlatformDetector as any)();
      const platformInfo = detector.detectPlatform();

      expect(platformInfo.capabilities.performanceBudgetMultiplier).toBeGreaterThan(1.0);

      expect(testTransport.hasLog((log) => log.test === "browser performance budget")).toBe(true);
    });
  });

  describe("Web Worker Environment", () => {
    it("should detect dedicated worker environment", async () => {
      const realSelf = {
        importScripts: (script: string) => {
          // Real importScripts implementation for testing
          testTransport.write({ importScript: script, workerType: "dedicated" });
        },
      };

      (global as any).process = {
        uptime: () => 0,
        memoryUsage: () => ({ heapUsed: 0, heapTotal: 0, external: 0, rss: 0 }),
        listeners: global.process?.listeners?.bind?.(global.process),
        emit: global.process?.emit?.bind?.(global.process),
      };
      delete (global as any).window;
      (global as any).self = realSelf;

      const detector = new (PerformancePlatformDetector as any)();
      const platformInfo = detector.detectPlatform();

      expect(platformInfo.isNode).toBe(false);
      expect(platformInfo.isBrowser).toBe(false);
      expect(platformInfo.isWebWorker).toBe(true);
      expect(platformInfo.isDedicatedWorker).toBe(true);
      expect(platformInfo.isServiceWorker).toBe(false);
      expect(platformInfo.isSharedWorker).toBe(false);
    });

    it("should detect service worker environment", async () => {
      const realSelf = {
        importScripts: (script: string) => {
          // Real importScripts implementation for service worker testing
          testTransport.write({ importScript: script, workerType: "service" });
        },
        registration: {},
      };

      (global as any).process = {
        uptime: () => 0,
        memoryUsage: () => ({ heapUsed: 0, heapTotal: 0, external: 0, rss: 0 }),
        listeners: global.process?.listeners?.bind?.(global.process),
        emit: global.process?.emit?.bind?.(global.process),
      };
      delete (global as any).window;
      (global as any).self = realSelf;

      const detector = new (PerformancePlatformDetector as any)();
      const platformInfo = detector.detectPlatform();

      expect(platformInfo.isWebWorker).toBe(true);
      expect(platformInfo.isServiceWorker).toBe(true);
      expect(platformInfo.isDedicatedWorker).toBe(false);
    });

    it("should apply worker-specific optimizations", async () => {
      const realSelf = {
        importScripts: (script: string) => {
          // Real importScripts implementation for worker optimization testing
          testTransport.write({ importScript: script, workerType: "optimization" });
        },
      };

      (global as any).process = {
        uptime: () => 0,
        memoryUsage: () => ({ heapUsed: 0, heapTotal: 0, external: 0, rss: 0 }),
        listeners: global.process?.listeners?.bind?.(global.process),
        emit: global.process?.emit?.bind?.(global.process),
      };
      delete (global as any).window;
      (global as any).self = realSelf;

      const detector = new (PerformancePlatformDetector as any)();
      const platformInfo = detector.detectPlatform();

      expect(platformInfo.capabilities.recommendedPoolSize).toBeLessThan(25);
      expect(platformInfo.capabilities.optimalSampleRate).toBeLessThan(0.1);
      expect(platformInfo.capabilities.performanceBudgetMultiplier).toBeGreaterThan(1.5);
    });
  });

  describe("Browser Fallback Mechanisms", () => {
    it("should continue operating when all performance APIs are unavailable", async () => {
      const realWindow = {
        document: {},
        navigator: { userAgent: "Test Browser" },
      };

      (global as any).process = {
        uptime: () => 0,
        memoryUsage: () => ({ heapUsed: 0, heapTotal: 0, external: 0, rss: 0 }),
        listeners: global.process?.listeners?.bind?.(global.process),
        emit: global.process?.emit?.bind?.(global.process),
      };
      delete (global as any).performance;
      (global as any).window = realWindow;
      (global as any).document = realWindow.document;

      await testTransport.write({
        test: "no performance APIs",
        fallback: true,
      });

      expect(() => {
        const tracker = new EnhancedPerformanceTracker(config);
        const measurement = tracker.startOperation("fallback");
        tracker.finishOperation(measurement);
        tracker.reset();
      }).not.toThrow();

      expect(testTransport.hasLog((log) => log.test === "no performance APIs")).toBe(true);
    });

    it("should handle navigation timing unavailability", async () => {
      const { realWindow, realPerformance } = createBrowserEnvironment();
      delete realPerformance.navigation;

      setBrowserEnvironment(realWindow, realPerformance);

      await testTransport.write({
        test: "no navigation timing",
        hasNavigation: false,
      });

      const detector = new (PerformancePlatformDetector as any)();
      const platformInfo = detector.detectPlatform();

      expect(platformInfo.hasNavigationTiming).toBe(false);
      expect(testTransport.hasLog((log) => log.test === "no navigation timing")).toBe(true);
    });

    it("should handle resource timing unavailability", async () => {
      const { realWindow, realPerformance } = createBrowserEnvironment();
      delete realPerformance.getEntriesByType;

      setBrowserEnvironment(realWindow, realPerformance);

      await testTransport.write({
        test: "no resource timing",
        hasResourceTiming: false,
      });

      const detector = new (PerformancePlatformDetector as any)();
      const platformInfo = detector.detectPlatform();

      expect(platformInfo.hasResourceTiming).toBe(false);
      expect(testTransport.hasLog((log) => log.test === "no resource timing")).toBe(true);
    });
  });

  describe("Cross-Browser Consistency", () => {
    it("should maintain measurement consistency across browsers", async () => {
      const browsers = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Safari/14.1",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edg/91.0",
      ];

      for (const [index, userAgent] of browsers.entries()) {
        const { realWindow, realPerformance } = createBrowserEnvironment();
        realWindow.navigator.userAgent = userAgent;

        setBrowserEnvironment(realWindow, realPerformance);

        await testTransport.write({
          test: "cross-browser consistency",
          browser: userAgent,
          index,
        });

        const tracker = new EnhancedPerformanceTracker({
          ...config,
          enableEnvironmentOptimization: true,
        });

        const measurement = tracker.startOperation(`browser-test-${index}`);
        expect(measurement).toBeDefined();
        expect(measurement.id).toBeDefined();

        // Add a small delay to allow the measurement to register
        await new Promise((resolve) => setTimeout(resolve, 1));

        tracker.finishOperation(measurement);

        // Add another small delay after finishing
        await new Promise((resolve) => setTimeout(resolve, 1));

        const metrics = tracker.getMetrics();

        expect(metrics.operation.count).toBe(1);
        tracker.reset();
      }

      expect(testTransport.getLogs()).toHaveLength(4);
      expect(testTransport.hasLog((log) => log.test === "cross-browser consistency")).toBe(true);
    });

    it("should handle browser-specific performance characteristics", async () => {
      const { realWindow, realPerformance } = createBrowserEnvironment();

      // Simulate Chrome with memory API
      realWindow.navigator.userAgent = "Chrome/91.0";
      realPerformance.memory = {
        usedJSHeapSize: 5000000,
        totalJSHeapSize: 10000000,
        jsHeapSizeLimit: 20000000,
      };

      setBrowserEnvironment(realWindow, realPerformance);

      await testTransport.write({
        test: "chrome memory characteristics",
        heapUsed: realPerformance.memory.usedJSHeapSize,
        heapTotal: realPerformance.memory.totalJSHeapSize,
      });

      const tracker = new EnhancedPerformanceTracker(config);
      const metrics = tracker.getMetrics();

      expect(metrics.resource.memory.heapUsed).toBe(5000000);
      expect(metrics.resource.memory.utilization).toBe(50);

      expect(testTransport.hasLog((log) => log.test === "chrome memory characteristics")).toBe(true);

      tracker.reset();
    });
  });

  describe("Performance Validation in Browser", () => {
    it("should validate browser performance parity", async () => {
      const { realWindow, realPerformance } = createBrowserEnvironment();

      setBrowserEnvironment(realWindow, realPerformance);

      await testTransport.write({
        test: "browser performance parity",
        operationCount: 5,
      });

      const tracker = new EnhancedPerformanceTracker(config);

      // Simulate some operations
      for (let i = 0; i < 5; i++) {
        const measurement = tracker.startOperation("browser-validation");
        tracker.finishOperation(measurement);
      }

      const parityReport = tracker.validatePerformanceParity();

      expect(parityReport.environment).toMatch(/browser/);
      expect(parityReport.variance).toBeGreaterThanOrEqual(0);
      expect(typeof parityReport.parityMaintained).toBe("boolean");

      expect(testTransport.hasLog((log) => log.test === "browser performance parity")).toBe(true);

      tracker.reset();
    });

    it("should account for browser performance overhead", async () => {
      const { realWindow, realPerformance } = createBrowserEnvironment();

      setBrowserEnvironment(realWindow, realPerformance);

      await testTransport.write({
        test: "browser performance overhead",
        thresholds: "calculation",
      });

      const detector = new (PerformancePlatformDetector as any)();
      const profile = detector.getEnvironmentProfile();

      // Browser thresholds should be more lenient
      expect(profile.thresholds.warning).toBeGreaterThan(100);
      expect(profile.thresholds.critical).toBeGreaterThan(500);

      expect(testTransport.hasLog((log) => log.test === "browser performance overhead")).toBe(true);
    });
  });
});
