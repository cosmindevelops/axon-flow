/**
 * Cross-platform timing compatibility tests
 *
 * Tests for browser/Node.js compatibility fixes where 'performance is not defined'
 * in simulated browser environments during container resolution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DIContainer } from "../../../src/container/container.classes.js";
import { platformTiming, now, isHighResolutionTimingAvailable } from "../../../src/platform/index.js";

describe("Cross-Platform Timing Compatibility", () => {
  let originalPerformance: Performance | undefined;

  beforeEach(() => {
    // Store original performance object
    originalPerformance = globalThis.performance;
  });

  afterEach(() => {
    // Restore original performance object
    if (originalPerformance) {
      globalThis.performance = originalPerformance;
    } else {
      delete (globalThis as any).performance;
    }
  });

  describe("Platform Timing Utility", () => {
    it("should use performance.now() when available", () => {
      expect(typeof globalThis.performance).toBe("object");
      expect(typeof globalThis.performance.now).toBe("function");
      
      const time = now();
      expect(typeof time).toBe("number");
      expect(time).toBeGreaterThan(0);
      
      expect(isHighResolutionTimingAvailable()).toBe(true);
    });

    it("should fallback to Date.now() when performance is undefined", () => {
      // Simulate browser environment without performance API
      delete (globalThis as any).performance;
      
      const time = now();
      expect(typeof time).toBe("number");
      expect(time).toBeGreaterThan(0);
      
      expect(isHighResolutionTimingAvailable()).toBe(false);
    });

    it("should provide consistent timing interface", () => {
      const timing1 = now();
      const timing2 = now();
      
      expect(timing2).toBeGreaterThanOrEqual(timing1);
      
      // Test fallback behavior
      delete (globalThis as any).performance;
      const timing3 = now();
      
      expect(typeof timing3).toBe("number");
      expect(timing3).toBeGreaterThan(0);
    });
  });

  describe("DIContainer Cross-Platform Resolution", () => {
    it("should resolve dependencies without performance.now() - Issue Fix", () => {
      // This test specifically addresses the "performance is not defined" error
      delete (globalThis as any).performance;
      
      const container = new DIContainer();
      const token = Symbol("TestService");
      
      class TestService {
        public readonly name = "test";
        public readonly id = Math.random();
      }
      
      container.register(token, TestService);
      
      // This should NOT throw "performance is not defined"
      expect(() => {
        const instance = container.resolve(token);
        expect(instance).toBeInstanceOf(TestService);
        expect(instance.name).toBe("test");
      }).not.toThrow();
    });

    it("should collect metrics using fallback timing", () => {
      delete (globalThis as any).performance;
      
      const container = new DIContainer();
      const token = Symbol("MetricsTest");
      
      class MetricsTestService {
        public readonly value = 42;
      }
      
      container.register(token, MetricsTestService);
      
      // Resolve multiple times to generate metrics
      for (let i = 0; i < 5; i++) {
        container.resolve(token);
      }
      
      const metrics = container.getMetrics();
      expect(metrics.totalResolutions).toBe(5);
      expect(metrics.averageResolutionTime).toBeGreaterThanOrEqual(0);
      expect(typeof metrics.averageResolutionTime).toBe("number");
    });

    it("should handle both singleton and transient lifecycles without performance API", () => {
      delete (globalThis as any).performance;
      
      const container = new DIContainer();
      const singletonToken = Symbol("Singleton");
      const transientToken = Symbol("Transient");
      
      class SingletonService {
        public readonly created = Date.now();
      }
      
      class TransientService {
        public readonly created = Date.now();
      }
      
      container.register(singletonToken, SingletonService, { lifecycle: "singleton" });
      container.register(transientToken, TransientService, { lifecycle: "transient" });
      
      // Test singleton caching
      const singleton1 = container.resolve(singletonToken);
      const singleton2 = container.resolve(singletonToken);
      expect(singleton1).toBe(singleton2);
      
      // Test transient instances
      const transient1 = container.resolve(transientToken);
      const transient2 = container.resolve(transientToken);
      expect(transient1).not.toBe(transient2);
      
      const metrics = container.getMetrics();
      expect(metrics.cacheHitRatio).toBeGreaterThan(0);
    });

    it("should maintain timing precision when performance API is available", () => {
      // Ensure performance API is available
      expect(globalThis.performance).toBeDefined();
      expect(isHighResolutionTimingAvailable()).toBe(true);
      
      const container = new DIContainer();
      const token = Symbol("PrecisionTest");
      
      class PrecisionTestService {
        public readonly value = "precise";
      }
      
      container.register(token, PrecisionTestService);
      
      // Multiple resolutions for timing data
      for (let i = 0; i < 10; i++) {
        container.resolve(token);
      }
      
      const metrics = container.getMetrics();
      expect(metrics.totalResolutions).toBe(10);
      expect(metrics.averageResolutionTime).toBeGreaterThanOrEqual(0);
      // High-resolution timing should provide sub-millisecond precision
      expect(metrics.peakResolutionTime).toBeGreaterThanOrEqual(0);
    });

    it("should handle factory functions without performance API", () => {
      delete (globalThis as any).performance;
      
      const container = new DIContainer();
      const token = Symbol("Factory");
      
      let factoryCallCount = 0;
      const factory = () => {
        factoryCallCount++;
        return { id: factoryCallCount, type: "factory-created" };
      };
      
      container.registerFactory(token, factory);
      
      const instance1 = container.resolve(token);
      const instance2 = container.resolve(token);
      
      expect(instance1.type).toBe("factory-created");
      expect(instance2.type).toBe("factory-created");
      expect(factoryCallCount).toBe(2); // Transient by default
    });

    it("should handle resolution context and dependency chains", () => {
      delete (globalThis as any).performance;
      
      const container = new DIContainer();
      const serviceToken = Symbol("Service");
      const dependencyToken = Symbol("Dependency");
      
      class Dependency {
        public readonly name = "dependency";
      }
      
      class Service {
        constructor(public readonly dep: Dependency) {}
      }
      
      container.register(dependencyToken, Dependency);
      container.register(serviceToken, Service, { 
        dependencies: [dependencyToken] 
      });
      
      const service = container.resolve(serviceToken);
      expect(service.dep).toBeInstanceOf(Dependency);
      expect(service.dep.name).toBe("dependency");
      
      const metrics = container.getMetrics();
      expect(metrics.totalResolutions).toBe(1);
    });
  });

  describe("Platform Detection", () => {
    it("should detect platform capabilities correctly", () => {
      const timing = platformTiming;
      
      expect(typeof timing.now()).toBe("number");
      expect(typeof timing.isHighResolution()).toBe("boolean");
      expect(typeof timing.getTimestamp()).toBe("number");
      
      // When performance is available
      expect(timing.isHighResolution()).toBe(true);
      
      // When performance is not available
      delete (globalThis as any).performance;
      const fallbackTiming = new (platformTiming.constructor as any)();
      expect(fallbackTiming.isHighResolution()).toBe(false);
    });

    it("should provide consistent timestamps across timing modes", () => {
      const time1 = now();
      
      // Switch to fallback mode
      delete (globalThis as any).performance;
      const time2 = now();
      
      // Both should be valid timestamps
      expect(time1).toBeGreaterThan(0);
      expect(time2).toBeGreaterThan(0);
      expect(typeof time1).toBe("number");
      expect(typeof time2).toBe("number");
    });
  });
});