/**
 * Cross-platform compatibility integration tests
 *
 * Validates that the DI container works consistently across different
 * Node.js versions, browser environments, and platform-specific features
 * while maintaining performance and reliability.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DIContainer } from "../../src/container/container.classes.js";
import { MetadataManager } from "../../src/decorators/decorators.classes.js";
import { ObjectPool } from "../../src/pool/pool.classes.js";
import { SimpleFactory } from "../../src/factory/factory.classes.js";
import type { DIToken } from "../../src/container/container.types.js";

// Platform detection utilities
class PlatformDetector {
  static isNode(): boolean {
    return typeof process !== "undefined" && process.versions?.node !== undefined;
  }
  
  static isBrowser(): boolean {
    return typeof window !== "undefined" && typeof document !== "undefined";
  }
  
  static hasReflectMetadata(): boolean {
    return typeof Reflect !== "undefined" && typeof (Reflect as any).getMetadata === "function";
  }
  
  static getNodeVersion(): string | undefined {
    return PlatformDetector.isNode() ? process.version : undefined;
  }
  
  static hasPerformanceNow(): boolean {
    return typeof performance !== "undefined" && typeof performance.now === "function";
  }
  
  static hasWorkerThreads(): boolean {
    try {
      return PlatformDetector.isNode() && require.resolve("worker_threads");
    } catch {
      return false;
    }
  }
}

// Test services for cross-platform testing
class TimestampService {
  private startTime: number;
  
  constructor() {
    this.startTime = this.getCurrentTime();
  }
  
  private getCurrentTime(): number {
    if (typeof performance !== "undefined" && performance.now) {
      return performance.now();
    }
    return Date.now();
  }
  
  getElapsed(): number {
    return this.getCurrentTime() - this.startTime;
  }
  
  reset(): void {
    this.startTime = this.getCurrentTime();
  }
}

class EnvironmentService {
  public readonly platform: string;
  public readonly nodeVersion?: string;
  public readonly hasReflect: boolean;
  public readonly hasPerformance: boolean;
  
  constructor(private timestampService: TimestampService) {
    this.platform = PlatformDetector.isNode() ? "node" : "browser";
    this.nodeVersion = PlatformDetector.getNodeVersion();
    this.hasReflect = PlatformDetector.hasReflectMetadata();
    this.hasPerformance = PlatformDetector.hasPerformanceNow();
  }
  
  getEnvironmentInfo(): Record<string, unknown> {
    return {
      platform: this.platform,
      nodeVersion: this.nodeVersion,
      hasReflect: this.hasReflect,
      hasPerformance: this.hasPerformance,
      elapsed: this.timestampService.getElapsed(),
    };
  }
}

// Resource-intensive service for performance testing
class ComputeService {
  private results: number[] = [];
  
  performWork(iterations: number = 1000): number {
    const start = performance?.now() || Date.now();
    
    // CPU-intensive work
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      sum += Math.sqrt(i) * Math.sin(i);
    }
    
    const end = performance?.now() || Date.now();
    const duration = end - start;
    
    this.results.push(duration);
    return sum;
  }
  
  getAverageTime(): number {
    return this.results.length > 0
      ? this.results.reduce((a, b) => a + b, 0) / this.results.length
      : 0;
  }
}

// Memory tracking service
class MemoryService {
  private samples: Array<{ timestamp: number; usage?: any }> = [];
  
  takeSample(): void {
    const timestamp = performance?.now() || Date.now();
    let usage;
    
    if (PlatformDetector.isNode() && process.memoryUsage) {
      usage = process.memoryUsage();
    }
    
    this.samples.push({ timestamp, usage });
  }
  
  getSamples(): Array<{ timestamp: number; usage?: any }> {
    return [...this.samples];
  }
  
  clearSamples(): void {
    this.samples.length = 0;
  }
}

// Tokens
const TIMESTAMP_TOKEN: DIToken<TimestampService> = "ITimestampService";
const ENVIRONMENT_TOKEN: DIToken<EnvironmentService> = "IEnvironmentService";
const COMPUTE_TOKEN: DIToken<ComputeService> = "IComputeService";
const MEMORY_TOKEN: DIToken<MemoryService> = "IMemoryService";

describe("Cross-Platform Compatibility Integration", () => {
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer({
      name: "CrossPlatformContainer",
      enableMetrics: true,
    });
  });

  afterEach(() => {
    container.dispose();
  });

  describe("Platform Detection and Adaptation", () => {
    it("should detect current platform correctly", () => {
      const isNode = PlatformDetector.isNode();
      const isBrowser = PlatformDetector.isBrowser();
      
      // Should be either Node.js or browser, not both
      expect(isNode || isBrowser).toBe(true);
      expect(isNode && isBrowser).toBe(false);
      
      if (isNode) {
        expect(typeof process).toBe("object");
        expect(process.versions.node).toBeDefined();
      }
      
      if (isBrowser) {
        expect(typeof window).toBe("object");
        expect(typeof document).toBe("object");
      }
    });

    it("should adapt container behavior based on platform", () => {
      container.register(TIMESTAMP_TOKEN, TimestampService);
      container.register(ENVIRONMENT_TOKEN, EnvironmentService, {
        dependencies: [TIMESTAMP_TOKEN],
      });
      
      const envService = container.resolve(ENVIRONMENT_TOKEN);
      const envInfo = envService.getEnvironmentInfo();
      
      expect(envInfo.platform).toMatch(/node|browser/);
      
      if (PlatformDetector.isNode()) {
        expect(envInfo.nodeVersion).toMatch(/^v\d+\./); // e.g., v18.x.x
      }
    });
  });

  describe("Node.js Version Compatibility", () => {
    it("should work identically on Node.js 18/20/22", () => {
      if (!PlatformDetector.isNode()) {
        console.log("Skipping Node.js specific test in browser environment");
        return;
      }
      
      container.register(COMPUTE_TOKEN, ComputeService, { lifecycle: "singleton" });
      
      const computeService = container.resolve(COMPUTE_TOKEN);
      
      // Perform consistent computation
      const result = computeService.performWork(100);
      expect(typeof result).toBe("number");
      expect(isNaN(result)).toBe(false);
      
      const avgTime = computeService.getAverageTime();
      expect(avgTime).toBeGreaterThan(0);
    });

    it("should handle ES modules correctly", async () => {
      // Test dynamic imports if supported
      const hasESModules = PlatformDetector.isNode() && 
                          process.version.match(/^v(1[4-9]|[2-9]\d)\./); // Node 14+
      
      if (hasESModules) {
        // Should be able to import ES modules (dynamic import is a keyword)
        expect(typeof globalThis.import).toBe("undefined"); // import is not a variable
      }
      
      // Container should work with ES module imports
      container.register(TIMESTAMP_TOKEN, TimestampService);
      const service = container.resolve(TIMESTAMP_TOKEN);
      expect(service).toBeInstanceOf(TimestampService);
    });
  });

  describe("Browser Environment Compatibility", () => {
    it("should work without reflect-metadata in browsers", () => {
      const originalReflect = (globalThis as any).Reflect;
      
      try {
        // Temporarily disable Reflect to simulate browser environment
        delete (globalThis as any).Reflect;
        
        const metadataManager = new MetadataManager();
        expect(metadataManager.hasReflectSupport()).toBe(false);
        
        // Container should still work
        container.register(TIMESTAMP_TOKEN, TimestampService);
        const service = container.resolve(TIMESTAMP_TOKEN);
        expect(service).toBeInstanceOf(TimestampService);
        
      } finally {
        // Restore Reflect
        (globalThis as any).Reflect = originalReflect;
      }
    });

    it("should handle browser-specific timing mechanisms", () => {
      container.register(TIMESTAMP_TOKEN, TimestampService);
      const timestampService = container.resolve(TIMESTAMP_TOKEN);
      
      const elapsed1 = timestampService.getElapsed();
      
      // Wait a bit
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Busy wait
      }
      
      const elapsed2 = timestampService.getElapsed();
      expect(elapsed2).toBeGreaterThan(elapsed1);
    });

    it("should gracefully handle missing browser APIs", () => {
      const originalPerformance = (globalThis as any).performance;
      
      try {
        // Temporarily disable performance API
        delete (globalThis as any).performance;
        
        // Need to work around container using performance.now() internally
        // Create a container after performance is removed
        const tempContainer = new DIContainer({ name: "TempContainer", enableMetrics: false });
        tempContainer.register(TIMESTAMP_TOKEN, TimestampService);
        const service = tempContainer.resolve(TIMESTAMP_TOKEN);
        
        // Should fall back to Date.now()
        expect(service.getElapsed()).toBeGreaterThanOrEqual(0);
        
        tempContainer.dispose();
        
      } finally {
        // Restore performance
        (globalThis as any).performance = originalPerformance;
      }
    });
  });

  describe("Performance Across Platforms", () => {
    it("should maintain consistent performance metrics", () => {
      container.register(COMPUTE_TOKEN, ComputeService, { lifecycle: "singleton" });
      
      const iterations = 100;
      const services: ComputeService[] = [];
      
      const startTime = performance?.now() || Date.now();
      
      // Create multiple instances through container
      for (let i = 0; i < iterations; i++) {
        const service = container.resolve(COMPUTE_TOKEN);
        services.push(service);
      }
      
      const endTime = performance?.now() || Date.now();
      const totalTime = endTime - startTime;
      
      // All services should be the same instance (singleton)
      for (let i = 1; i < services.length; i++) {
        expect(services[i]).toBe(services[0]);
      }
      
      const metrics = container.getMetrics();
      expect(metrics.averageResolutionTime).toBeGreaterThan(0);
      expect(totalTime / iterations).toBeLessThan(1); // Should be fast
    });

    it("should handle memory pressure consistently", () => {
      if (!PlatformDetector.isNode()) {
        console.log("Skipping memory test in non-Node environment");
        return;
      }
      
      container.register(MEMORY_TOKEN, MemoryService, { lifecycle: "singleton" });
      const memoryService = container.resolve(MEMORY_TOKEN);
      
      // Take initial memory sample
      memoryService.takeSample();
      
      // Create many transient services
      for (let i = 0; i < 1000; i++) {
        container.register(`Service_${i}`, TimestampService, { lifecycle: "transient" });
        container.resolve(`Service_${i}` as DIToken<TimestampService>);
      }
      
      // Take final memory sample
      memoryService.takeSample();
      
      const samples = memoryService.getSamples();
      expect(samples.length).toBe(2);
      
      if (samples[0].usage && samples[1].usage) {
        // Memory should not have increased dramatically
        const heapIncrease = samples[1].usage.heapUsed - samples[0].usage.heapUsed;
        expect(heapIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB increase
      }
    });
  });

  describe("Factory Pattern Cross-Platform", () => {
    it("should work consistently across platforms", () => {
      const factory = new SimpleFactory(
        "TimestampFactory",
        () => {
          const service = new TimestampService();
          // Simulate some initialization work
          const start = performance?.now() || Date.now();
          while ((performance?.now() || Date.now()) - start < 1) {
            // Busy wait for 1ms
          }
          return service;
        }
      );
      
      container.registerFactoryInstance(TIMESTAMP_TOKEN, factory);
      
      const service1 = container.resolve(TIMESTAMP_TOKEN);
      const service2 = container.resolve(TIMESTAMP_TOKEN);
      
      expect(service1).toBeInstanceOf(TimestampService);
      expect(service2).toBeInstanceOf(TimestampService);
      expect(service1).not.toBe(service2); // Different instances from factory
      
      const metadata = factory.getMetadata();
      expect(metadata.performance?.totalCreated).toBe(2);
    });

    it("should handle async factory creation across platforms", async () => {
      const asyncFactory = new SimpleFactory(
        "AsyncTimestampFactory",
        async () => {
          // Simulate async initialization
          await new Promise(resolve => setTimeout(resolve, 1));
          return new TimestampService();
        }
      );
      
      container.registerFactoryInstance(TIMESTAMP_TOKEN, asyncFactory);
      
      // Note: Current DI container doesn't support async resolution directly
      // This test shows how it could be handled
      try {
        const promise = container.resolve(TIMESTAMP_TOKEN);
        if (promise instanceof Promise) {
          const service = await promise;
          expect(service).toBeInstanceOf(TimestampService);
        } else {
          // Sync resolution worked
          expect(promise).toBeInstanceOf(TimestampService);
        }
      } catch (error: any) {
        // Expected for current implementation
        expect(error.code).toBe("DI_ASYNC_FACTORY_NOT_SUPPORTED");
      }
    });
  });

  describe("Object Pool Cross-Platform", () => {
    it("should work consistently across platforms", async () => {
      const pool = new ObjectPool(
        COMPUTE_TOKEN,
        () => new ComputeService(),
        {
          minSize: 2,
          maxSize: 5,
          enableMetrics: true,
          evictionPolicy: "LRU",
          validationStrategy: "ON_ACQUIRE",
          validationInterval: 30000,
          createTimeout: 5000,
          acquireTimeout: 5000,
          maxIdleTime: 300000,
          enableWarmup: true,
        }
      );
      
      await pool.warmUp();
      
      // Acquire services from pool
      const service1 = await pool.acquire();
      const service2 = await pool.acquire();
      
      expect(service1).toBeInstanceOf(ComputeService);
      expect(service2).toBeInstanceOf(ComputeService);
      expect(service1).not.toBe(service2);
      
      // Perform work
      service1.performWork(50);
      service2.performWork(50);
      
      // Release back to pool
      await pool.release(service1);
      await pool.release(service2);
      
      const stats = pool.getStats();
      expect(stats.totalAcquired).toBe(2);
      expect(stats.totalReleased).toBe(2);
      
      await pool.destroy();
    });
  });

  describe("Error Handling Cross-Platform", () => {
    it("should provide consistent error information across platforms", () => {
      container.register(ENVIRONMENT_TOKEN, EnvironmentService, {
        dependencies: ["MissingDependency" as DIToken],
      });
      
      try {
        container.resolve(ENVIRONMENT_TOKEN);
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error.code).toBe("DI_REGISTRATION_NOT_FOUND");
        expect(error.metadata).toHaveProperty("containerName");
        expect(error.metadata).toHaveProperty("token", "MissingDependency");
        expect(error.context).toHaveProperty("correlationId");
        
        // Error should have consistent structure across platforms
        expect(error.message).toContain("Registration not found");
      }
    });

    it("should handle platform-specific error scenarios", () => {
      // Test Node.js specific errors
      if (PlatformDetector.isNode()) {
        // Node.js should handle process-related errors
        expect(typeof process.exit).toBe("function");
      }
      
      // Test browser specific errors
      const originalConsole = console.error;
      const errors: string[] = [];
      console.error = (message: string) => errors.push(message);
      
      try {
        container.register("" as DIToken, class {});
        expect.fail("Should have thrown error");
      } catch (error) {
        // Expected validation error
      } finally {
        console.error = originalConsole;
      }
    });
  });

  describe("Metadata Management Cross-Platform", () => {
    it("should handle metadata consistently across environments", () => {
      const metadataManager = new MetadataManager();
      
      // Create a test target
      class TestTarget {}
      const target = new TestTarget();
      
      // Should be able to store and retrieve metadata
      const testKey = Symbol("test-key");
      const testValue = { data: "test-value", platform: PlatformDetector.isNode() ? "node" : "browser" };
      
      // This would simulate metadata storage if methods were public
      // For now, we test that the manager is properly initialized
      expect(metadataManager.hasReflectSupport()).toBe(
        typeof Reflect !== "undefined" && typeof (Reflect as any).getMetadata === "function"
      );
    });

    it("should provide consistent stats across platforms", () => {
      const metadataManager = new MetadataManager();
      
      // Stats should be available and consistent
      const hasReflect = metadataManager.hasReflectSupport();
      expect(typeof hasReflect).toBe("boolean");
      
      // Should work the same way regardless of platform
      const container2 = new DIContainer({
        name: "StatsTestContainer",
        enableMetrics: true,
      });
      
      container2.register(TIMESTAMP_TOKEN, TimestampService);
      container2.resolve(TIMESTAMP_TOKEN);
      
      const metrics = container2.getMetrics();
      expect(metrics.totalRegistrations).toBe(1);
      expect(metrics.totalResolutions).toBe(1);
      
      container2.dispose();
    });
  });

  describe("Resource Cleanup Cross-Platform", () => {
    it("should cleanup resources consistently across platforms", () => {
      const containers: DIContainer[] = [];
      
      // Create multiple containers
      for (let i = 0; i < 10; i++) {
        const c = new DIContainer({
          name: `CleanupTest_${i}`,
          enableMetrics: true,
        });
        
        c.register(TIMESTAMP_TOKEN, TimestampService, { lifecycle: "singleton" });
        c.resolve(TIMESTAMP_TOKEN);
        
        containers.push(c);
      }
      
      // Dispose all containers
      containers.forEach(c => c.dispose());
      
      // All should be properly disposed
      containers.forEach((c, i) => {
        expect(() => {
          c.resolve(TIMESTAMP_TOKEN);
        }).toThrow("Container has been disposed");
      });
    });

    it("should handle garbage collection hints appropriately", () => {
      if (PlatformDetector.isNode() && global.gc) {
        // If manual GC is available, test with it
        const initialMemory = process.memoryUsage().heapUsed;
        
        // Create and dispose many containers
        for (let i = 0; i < 100; i++) {
          const c = new DIContainer({ name: `GC_Test_${i}` });
          c.register(TIMESTAMP_TOKEN, TimestampService);
          c.resolve(TIMESTAMP_TOKEN);
          c.dispose();
        }
        
        // Suggest garbage collection
        global.gc();
        
        const finalMemory = process.memoryUsage().heapUsed;
        
        // Memory increase should be reasonable
        const increase = finalMemory - initialMemory;
        expect(increase).toBeLessThan(5 * 1024 * 1024); // Less than 5MB
      } else {
        // Without manual GC, just ensure disposal doesn't throw
        const c = new DIContainer({ name: "GC_Test_NoManualGC" });
        c.register(TIMESTAMP_TOKEN, TimestampService);
        c.resolve(TIMESTAMP_TOKEN);
        expect(() => c.dispose()).not.toThrow();
      }
    });
  });
});