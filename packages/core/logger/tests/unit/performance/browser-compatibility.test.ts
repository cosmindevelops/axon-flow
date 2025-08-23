/**
 * Browser environment compatibility tests
 * Tests browser-specific performance tracking behaviors and fallbacks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  PerformancePlatformDetector,
  MemoryMonitor,
  EnhancedPerformanceTracker,
} from "../../../src/performance/core/core.classes.js";
import type { IEnhancedPerformanceConfig, IPlatformInfo } from "../../../src/performance/core/core.types.js";

// Mock browser globals for testing
const createBrowserMocks = () => {
  const mockWindow = {
    location: { href: "https://example.com" },
    document: {},
    navigator: {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      product: "Gecko",
    },
  };

  const mockPerformance = {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntries: vi.fn(() => []),
    getEntriesByType: vi.fn(() => []),
    getEntriesByName: vi.fn(() => []),
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

  return { mockWindow, mockPerformance };
};

describe("Browser Compatibility", () => {
  let originalProcess: any;
  let originalWindow: any;
  let originalPerformance: any;
  let originalNavigator: any;
  let config: IEnhancedPerformanceConfig;

  beforeEach(() => {
    // Store original globals
    originalProcess = (global as any).process;
    originalWindow = (global as any).window;
    originalPerformance = (global as any).performance;
    originalNavigator = (global as any).navigator;

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
    vi.clearAllMocks();
  });

  describe("Browser Environment Detection", () => {
    it("should detect browser environment correctly", () => {
      const { mockWindow, mockPerformance } = createBrowserMocks();

      // Mock browser environment
      delete (global as any).process;
      (global as any).window = mockWindow;
      (global as any).document = mockWindow.document;
      (global as any).navigator = mockWindow.navigator;
      (global as any).performance = mockPerformance;

      const detector = new (PerformancePlatformDetector as any)();
      const platformInfo: IPlatformInfo = detector.detectPlatform();

      expect(platformInfo.isNode).toBe(false);
      expect(platformInfo.isBrowser).toBe(true);
      expect(platformInfo.isWebWorker).toBe(false);
      expect(platformInfo.browserName).toBe("chrome");
      expect(platformInfo.browserVersion).toBe("91");
      expect(platformInfo.hasPerformanceNow).toBe(true);
      expect(platformInfo.hasPerformanceTimeline).toBe(true);
    });

    it("should detect different browser types", () => {
      const { mockWindow, mockPerformance } = createBrowserMocks();

      // Test Firefox detection
      mockWindow.navigator.userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0";

      delete (global as any).process;
      (global as any).window = mockWindow;
      (global as any).document = mockWindow.document;
      (global as any).navigator = mockWindow.navigator;
      (global as any).performance = mockPerformance;

      const detector = new (PerformancePlatformDetector as any)();
      const platformInfo: IPlatformInfo = detector.detectPlatform();

      expect(platformInfo.browserName).toBe("firefox");
      expect(platformInfo.browserVersion).toBe("89");
    });

    it("should detect Safari correctly", () => {
      const { mockWindow, mockPerformance } = createBrowserMocks();

      // Test Safari detection
      mockWindow.navigator.userAgent =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Version/14.1.1 Safari/537.36";

      delete (global as any).process;
      (global as any).window = mockWindow;
      (global as any).document = mockWindow.document;
      (global as any).navigator = mockWindow.navigator;
      (global as any).performance = mockPerformance;

      const detector = new (PerformancePlatformDetector as any)();
      const platformInfo: IPlatformInfo = detector.detectPlatform();

      expect(platformInfo.browserName).toBe("safari");
      expect(platformInfo.browserVersion).toBe("14");
    });
  });

  describe("Browser Performance API Support", () => {
    it("should handle performance.memory availability", () => {
      const { mockWindow, mockPerformance } = createBrowserMocks();

      delete (global as any).process;
      (global as any).window = mockWindow;
      (global as any).document = mockWindow.document;
      (global as any).performance = mockPerformance;

      const memoryMonitor = new MemoryMonitor();
      const metrics = memoryMonitor.getMemoryMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.heapUsed).toBe(1000000);
      expect(metrics.heapTotal).toBe(2000000);
      expect(metrics.utilization).toBe(50); // 1M / 2M * 100
    });

    it("should fallback gracefully when performance.memory is unavailable", () => {
      const { mockWindow, mockPerformance } = createBrowserMocks();
      delete mockPerformance.memory;

      delete (global as any).process;
      (global as any).window = mockWindow;
      (global as any).document = mockWindow.document;
      (global as any).performance = mockPerformance;

      const memoryMonitor = new MemoryMonitor();
      const metrics = memoryMonitor.getMemoryMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.heapUsed).toBe(0);
      expect(metrics.heapTotal).toBe(0);
      expect(metrics.utilization).toBe(0);
    });

    it("should use performance.now when available", () => {
      const { mockWindow, mockPerformance } = createBrowserMocks();
      mockPerformance.now.mockReturnValue(123.456);

      delete (global as any).process;
      (global as any).window = mockWindow;
      (global as any).document = mockWindow.document;
      (global as any).performance = mockPerformance;

      const tracker = new EnhancedPerformanceTracker(config);
      const measurement = tracker.startOperation("browser-test");

      expect(mockPerformance.now).toHaveBeenCalled();
      expect(measurement.startTime).toBe(123.456);

      tracker.reset();
    });

    it("should fallback to Date.now when performance.now unavailable", () => {
      const { mockWindow } = createBrowserMocks();
      const mockPerformanceNoNow = {
        mark: vi.fn(),
        measure: vi.fn(),
      };

      delete (global as any).process;
      (global as any).window = mockWindow;
      (global as any).document = mockWindow.document;
      (global as any).performance = mockPerformanceNoNow;

      const tracker = new EnhancedPerformanceTracker(config);
      const measurement = tracker.startOperation("fallback-test");

      expect(measurement.startTime).toBeGreaterThan(0);
      expect(measurement.startTime).toBeCloseTo(Date.now(), -2); // Within 100ms

      tracker.reset();
    });
  });

  describe("Browser-Specific Optimizations", () => {
    it("should apply browser-specific configuration profile", () => {
      const { mockWindow, mockPerformance } = createBrowserMocks();

      delete (global as any).process;
      (global as any).window = mockWindow;
      (global as any).document = mockWindow.document;
      (global as any).performance = mockPerformance;

      const detector = new (PerformancePlatformDetector as any)();
      const profile = detector.getEnvironmentProfile();

      expect(profile.environment).toMatch(/browser/);
      expect(profile.features.memoryTracking).toBe(true);
      expect(profile.features.gcTracking).toBe(false); // Disabled in browser
      expect(profile.config.sampleRate).toBeLessThan(0.5); // Lower sampling
      expect(profile.thresholds.warning).toBeGreaterThan(100); // More lenient
    });

    it("should optimize pool size for browser constraints", () => {
      const { mockWindow, mockPerformance } = createBrowserMocks();

      delete (global as any).process;
      (global as any).window = mockWindow;
      (global as any).document = mockWindow.document;
      (global as any).performance = mockPerformance;

      const detector = new (PerformancePlatformDetector as any)();
      const platformInfo = detector.detectPlatform();

      expect(platformInfo.capabilities.recommendedPoolSize).toBeLessThan(50);
      expect(platformInfo.capabilities.maxConcurrentObservations).toBeLessThan(500);
    });

    it("should handle browser performance budget multipliers", () => {
      const { mockWindow, mockPerformance } = createBrowserMocks();

      delete (global as any).process;
      (global as any).window = mockWindow;
      (global as any).document = mockWindow.document;
      (global as any).performance = mockPerformance;

      const detector = new (PerformancePlatformDetector as any)();
      const platformInfo = detector.detectPlatform();

      expect(platformInfo.capabilities.performanceBudgetMultiplier).toBeGreaterThan(1.0);
    });
  });

  describe("Web Worker Environment", () => {
    it("should detect dedicated worker environment", () => {
      const mockSelf = {
        importScripts: vi.fn(),
      };

      delete (global as any).process;
      delete (global as any).window;
      (global as any).self = mockSelf;

      const detector = new (PerformancePlatformDetector as any)();
      const platformInfo = detector.detectPlatform();

      expect(platformInfo.isNode).toBe(false);
      expect(platformInfo.isBrowser).toBe(false);
      expect(platformInfo.isWebWorker).toBe(true);
      expect(platformInfo.isDedicatedWorker).toBe(true);
      expect(platformInfo.isServiceWorker).toBe(false);
      expect(platformInfo.isSharedWorker).toBe(false);
    });

    it("should detect service worker environment", () => {
      const mockSelf = {
        importScripts: vi.fn(),
        registration: {},
      };

      delete (global as any).process;
      delete (global as any).window;
      (global as any).self = mockSelf;

      const detector = new (PerformancePlatformDetector as any)();
      const platformInfo = detector.detectPlatform();

      expect(platformInfo.isWebWorker).toBe(true);
      expect(platformInfo.isServiceWorker).toBe(true);
      expect(platformInfo.isDedicatedWorker).toBe(false);
    });

    it("should apply worker-specific optimizations", () => {
      const mockSelf = {
        importScripts: vi.fn(),
      };

      delete (global as any).process;
      delete (global as any).window;
      (global as any).self = mockSelf;

      const detector = new (PerformancePlatformDetector as any)();
      const platformInfo = detector.detectPlatform();

      expect(platformInfo.capabilities.recommendedPoolSize).toBeLessThan(25);
      expect(platformInfo.capabilities.optimalSampleRate).toBeLessThan(0.1);
      expect(platformInfo.capabilities.performanceBudgetMultiplier).toBeGreaterThan(1.5);
    });
  });

  describe("Browser Fallback Mechanisms", () => {
    it("should continue operating when all performance APIs are unavailable", () => {
      const mockWindow = {
        document: {},
        navigator: { userAgent: "Test Browser" },
      };

      delete (global as any).process;
      delete (global as any).performance;
      (global as any).window = mockWindow;
      (global as any).document = mockWindow.document;

      expect(() => {
        const tracker = new EnhancedPerformanceTracker(config);
        const measurement = tracker.startOperation("fallback");
        tracker.finishOperation(measurement);
        tracker.reset();
      }).not.toThrow();
    });

    it("should handle navigation timing unavailability", () => {
      const { mockWindow, mockPerformance } = createBrowserMocks();
      delete mockPerformance.navigation;

      delete (global as any).process;
      (global as any).window = mockWindow;
      (global as any).document = mockWindow.document;
      (global as any).performance = mockPerformance;

      const detector = new (PerformancePlatformDetector as any)();
      const platformInfo = detector.detectPlatform();

      expect(platformInfo.hasNavigationTiming).toBe(false);
    });

    it("should handle resource timing unavailability", () => {
      const { mockWindow, mockPerformance } = createBrowserMocks();
      delete mockPerformance.getEntriesByType;

      delete (global as any).process;
      (global as any).window = mockWindow;
      (global as any).document = mockWindow.document;
      (global as any).performance = mockPerformance;

      const detector = new (PerformancePlatformDetector as any)();
      const platformInfo = detector.detectPlatform();

      expect(platformInfo.hasResourceTiming).toBe(false);
    });
  });

  describe("Cross-Browser Consistency", () => {
    it("should maintain measurement consistency across browsers", () => {
      const browsers = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Safari/14.1",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edg/91.0",
      ];

      browsers.forEach((userAgent, index) => {
        const { mockWindow, mockPerformance } = createBrowserMocks();
        mockWindow.navigator.userAgent = userAgent;

        delete (global as any).process;
        (global as any).window = mockWindow;
        (global as any).document = mockWindow.document;
        (global as any).navigator = mockWindow.navigator;
        (global as any).performance = mockPerformance;

        const tracker = new EnhancedPerformanceTracker({
          ...config,
          enableEnvironmentOptimization: true,
        });

        const measurement = tracker.startOperation(`browser-test-${index}`);
        expect(measurement).toBeDefined();
        expect(measurement.id).toBeDefined();

        tracker.finishOperation(measurement);
        const metrics = tracker.getMetrics();

        expect(metrics.operation.count).toBe(1);
        tracker.reset();
      });
    });

    it("should handle browser-specific performance characteristics", () => {
      const { mockWindow, mockPerformance } = createBrowserMocks();

      // Simulate Chrome with memory API
      mockWindow.navigator.userAgent = "Chrome/91.0";
      mockPerformance.memory = {
        usedJSHeapSize: 5000000,
        totalJSHeapSize: 10000000,
        jsHeapSizeLimit: 20000000,
      };

      delete (global as any).process;
      (global as any).window = mockWindow;
      (global as any).document = mockWindow.document;
      (global as any).performance = mockPerformance;

      const tracker = new EnhancedPerformanceTracker(config);
      const metrics = tracker.getMetrics();

      expect(metrics.resource.memory.heapUsed).toBe(5000000);
      expect(metrics.resource.memory.utilization).toBe(50);

      tracker.reset();
    });
  });

  describe("Performance Validation in Browser", () => {
    it("should validate browser performance parity", () => {
      const { mockWindow, mockPerformance } = createBrowserMocks();

      delete (global as any).process;
      (global as any).window = mockWindow;
      (global as any).document = mockWindow.document;
      (global as any).performance = mockPerformance;

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

      tracker.reset();
    });

    it("should account for browser performance overhead", () => {
      const { mockWindow, mockPerformance } = createBrowserMocks();

      delete (global as any).process;
      (global as any).window = mockWindow;
      (global as any).document = mockWindow.document;
      (global as any).performance = mockPerformance;

      const detector = new (PerformancePlatformDetector as any)();
      const profile = detector.getEnvironmentProfile();

      // Browser thresholds should be more lenient
      expect(profile.thresholds.warning).toBeGreaterThan(100);
      expect(profile.thresholds.critical).toBeGreaterThan(500);
    });
  });
});
