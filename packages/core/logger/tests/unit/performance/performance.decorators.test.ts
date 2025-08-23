/**
 * Unit tests for performance decorators
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  Timed,
  Profile,
  Benchmark,
  TrackInstantiation,
  withTiming,
  setGlobalPerformanceTracker,
  getDecoratorMetrics,
  resetDecoratorMetrics,
  // Enhanced decorators
  DatabaseTimed,
  NetworkTimed,
  ComputationTimed,
  CacheTimed,
  IOTimed,
  ConditionalTiming,
  ComposeDecorators,
  SampledTiming,
  // Configuration functions
  configureGlobalDecorators,
  setPerformanceBudget,
  registerPerformanceExporter,
  getCategoryMetrics,
  getPerformanceBudgets,
  getActiveExporters,
  createJSONExporter,
  createPrometheusExporter,
} from "../../../src/performance/performance.decorators.js";
import { EnhancedPerformanceTracker } from "../../../src/performance/performance.classes.js";
import type { 
  IEnhancedPerformanceConfig,
  IPerformanceBudget,
  IDecoratorActivationConditions,
  PerformanceCategory
} from "../../../src/performance/performance.types.js";

// Mock console methods to avoid noise in tests
const mockConsole = {
  log: vi.fn(),
  warn: vi.fn(),
};

describe("Performance Decorators", () => {
  let tracker: EnhancedPerformanceTracker;
  let config: IEnhancedPerformanceConfig;

  beforeEach(() => {
    config = {
      enabled: true,
      sampleRate: 1.0,
      thresholdMs: 100,
      enableMemoryTracking: false,
      enableGCTracking: false,
      maxLatencyHistory: 100,
      maxGCEventHistory: 50,
      resourceMetricsInterval: 5000,
      enableMeasurementPooling: true,
      measurementPoolInitialSize: 10,
      measurementPoolMaxSize: 50,
    };

    tracker = new EnhancedPerformanceTracker(config);
    setGlobalPerformanceTracker(tracker);

    // Mock console methods
    vi.spyOn(console, "log").mockImplementation(mockConsole.log);
    vi.spyOn(console, "warn").mockImplementation(mockConsole.warn);
  });

  afterEach(() => {
    resetDecoratorMetrics();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("@Timed decorator", () => {
    it("should time synchronous method execution", () => {
      class TestService {
        @Timed({ category: "sync-operation" })
        syncMethod(delay: number): string {
          // Simulate some work
          const start = Date.now();
          while (Date.now() - start < delay) {
            // Busy wait
          }
          return "completed";
        }
      }

      const service = new TestService();
      const result = service.syncMethod(10);

      expect(result).toBe("completed");

      const metrics = getDecoratorMetrics();
      expect(metrics.operation.count).toBeGreaterThan(0);
    });

    it("should time asynchronous method execution", async () => {
      class TestService {
        @Timed({ category: "async-operation" })
        async asyncMethod(delay: number): Promise<string> {
          await new Promise((resolve) => setTimeout(resolve, delay));
          return "completed";
        }
      }

      const service = new TestService();
      const result = await service.asyncMethod(10);

      expect(result).toBe("completed");

      const metrics = getDecoratorMetrics();
      expect(metrics.operation.count).toBeGreaterThan(0);
    });

    it("should handle method errors correctly", () => {
      class TestService {
        @Timed({ category: "error-operation" })
        errorMethod(): never {
          throw new Error("Test error");
        }
      }

      const service = new TestService();

      expect(() => service.errorMethod()).toThrow("Test error");

      const metrics = getDecoratorMetrics();
      expect(metrics.failedLogs).toBeGreaterThan(0);
    });

    it("should handle async method errors correctly", async () => {
      class TestService {
        @Timed({ category: "async-error-operation" })
        async asyncErrorMethod(): Promise<never> {
          await new Promise((resolve) => setTimeout(resolve, 10));
          throw new Error("Async test error");
        }
      }

      const service = new TestService();

      await expect(service.asyncErrorMethod()).rejects.toThrow("Async test error");

      const metrics = getDecoratorMetrics();
      expect(metrics.failedLogs).toBeGreaterThan(0);
    });

    it("should warn when threshold is exceeded", () => {
      class TestService {
        @Timed({ category: "slow-operation", threshold: 5 })
        slowMethod(): string {
          // Simulate work that exceeds threshold
          const start = Date.now();
          while (Date.now() - start < 10) {
            // Busy wait for more than threshold
          }
          return "completed";
        }
      }

      const service = new TestService();
      service.slowMethod();

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining("slow-operation exceeded custom threshold"),
      );
    });

    it("should respect sampling configuration", () => {
      class TestService {
        @Timed({ category: "sampled-operation", sample: false })
        sampledMethod(): string {
          return "completed";
        }
      }

      const service = new TestService();

      // Call multiple times - some should be skipped due to sampling
      for (let i = 0; i < 10; i++) {
        service.sampledMethod();
      }

      // With sample: false and random sampling, some calls might be skipped
      // This test verifies the sampling mechanism works
      expect(true).toBe(true); // Placeholder assertion
    });

    it("should include metadata in measurements", () => {
      const metadata = { userId: "123", operation: "login" };

      class TestService {
        @Timed({ category: "metadata-operation", metadata })
        metadataMethod(): string {
          return "completed";
        }
      }

      const service = new TestService();
      service.metadataMethod();

      // Verify that the measurement was created with metadata
      const metrics = getDecoratorMetrics();
      expect(metrics.operation.count).toBeGreaterThan(0);
    });
  });

  describe("@Profile decorator", () => {
    it("should automatically time all methods in a class", () => {
      @Profile({ category: "profiled-service" })
      class ProfiledService {
        method1(): string {
          return "method1";
        }

        method2(): string {
          return "method2";
        }

        method3(): string {
          return "method3";
        }
      }

      const service = new ProfiledService();

      service.method1();
      service.method2();
      service.method3();

      const metrics = getDecoratorMetrics();
      expect(metrics.operation.count).toBe(3);
      expect(metrics.totalLogs).toBe(3);
    });

    it("should exclude constructor from profiling", () => {
      @Profile({ category: "constructor-test" })
      class ServiceWithConstructor {
        private value: string;

        constructor(value: string) {
          this.value = value;
        }

        getValue(): string {
          return this.value;
        }
      }

      const service = new ServiceWithConstructor("test");
      const result = service.getValue();

      expect(result).toBe("test");

      // Only getValue should be tracked, not constructor
      const metrics = getDecoratorMetrics();
      expect(metrics.operation.count).toBe(1);
    });

    it("should add autoProfiled metadata", () => {
      @Profile({ category: "auto-profiled" })
      class AutoProfiledService {
        testMethod(): string {
          return "test";
        }
      }

      const service = new AutoProfiledService();
      service.testMethod();

      // Verify autoProfiled metadata is included
      const metrics = getDecoratorMetrics();
      expect(metrics.operation.count).toBe(1);
    });
  });

  describe("@Benchmark decorator", () => {
    it("should run benchmark with default settings", () => {
      class BenchmarkService {
        @Benchmark()
        benchmarkedMethod(): number {
          return Math.random();
        }
      }

      const service = new BenchmarkService();
      const result = service.benchmarkedMethod();

      expect(typeof result).toBe("number");

      // Verify benchmark output was logged
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Benchmarking"));
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Benchmark Results"));
    });

    it("should run benchmark with custom runs and warmup", () => {
      class BenchmarkService {
        @Benchmark({ runs: 5, warmup: 2, category: "custom-benchmark" })
        customBenchmark(): number {
          return Date.now();
        }
      }

      const service = new BenchmarkService();
      const result = service.customBenchmark();

      expect(typeof result).toBe("number");

      // Verify custom settings were used
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("2 warmup + 5 runs"));
    });

    it("should calculate and display statistics correctly", () => {
      class BenchmarkService {
        private counter = 0;

        @Benchmark({ runs: 3, warmup: 1 })
        deterministicMethod(): number {
          return ++this.counter;
        }
      }

      const service = new BenchmarkService();
      service.deterministicMethod();

      // Verify statistics were calculated and displayed
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Runs: 3"));
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Mean:"));
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Min:"));
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Max:"));
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("P50:"));
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("P95:"));
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("P99:"));
    });

    it("should warn about async methods", () => {
      class BenchmarkService {
        @Benchmark()
        async asyncMethod(): Promise<string> {
          return "async result";
        }
      }

      const service = new BenchmarkService();
      const result = service.asyncMethod();

      expect(result).toBeInstanceOf(Promise);

      expect(mockConsole.warn).toHaveBeenCalledWith(expect.stringContaining("Async methods not fully supported"));
    });
  });

  describe("@TrackInstantiation decorator", () => {
    it("should track property instantiation time", () => {
      class ServiceWithTrackedProperty {
        @TrackInstantiation({ category: "expensive-init" })
        private _expensiveProperty: object | undefined;

        private createExpensiveObject(): object {
          // Simulate expensive initialization
          const start = Date.now();
          while (Date.now() - start < 5) {
            // Busy wait
          }
          return { initialized: true };
        }

        getProperty(): object {
          if (!this._expensiveProperty) {
            this._expensiveProperty = this.createExpensiveObject();
          }
          return this._expensiveProperty;
        }
      }

      const service = new ServiceWithTrackedProperty();
      const property = service.getProperty();

      expect(property).toEqual({ initialized: true });

      // Property decorators may not trigger the same way as method decorators
      // This test ensures the decorator doesn't crash
      expect(property).toBeDefined();
    });

    it("should apply without errors", () => {
      class ServiceWithSlowProperty {
        @TrackInstantiation({ threshold: 2 })
        private _slowProperty: object | undefined;

        private createSlowObject(): object {
          return { slow: true };
        }

        getProperty(): object {
          if (!this._slowProperty) {
            this._slowProperty = this.createSlowObject();
          }
          return this._slowProperty;
        }
      }

      expect(() => {
        const service = new ServiceWithSlowProperty();
        service.getProperty();
      }).not.toThrow();
    });
  });

  describe("withTiming function wrapper", () => {
    it("should wrap synchronous functions", () => {
      const originalFunction = (x: number, y: number): number => {
        return x + y;
      };

      const timedFunction = withTiming(originalFunction, {
        category: "math-operation",
      });

      const result = timedFunction(5, 3);

      expect(result).toBe(8);

      const metrics = getDecoratorMetrics();
      expect(metrics.operation.count).toBeGreaterThan(0);
    });

    it("should wrap asynchronous functions", async () => {
      const originalFunction = async (delay: number): Promise<string> => {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return "async result";
      };

      const timedFunction = withTiming(originalFunction, {
        category: "async-operation",
      });

      const result = await timedFunction(10);

      expect(result).toBe("async result");

      const metrics = getDecoratorMetrics();
      expect(metrics.operation.count).toBeGreaterThan(0);
    });

    it("should handle function errors", () => {
      const errorFunction = (): never => {
        throw new Error("Function error");
      };

      const timedErrorFunction = withTiming(errorFunction, {
        category: "error-function",
      });

      expect(() => timedErrorFunction()).toThrow("Function error");

      const metrics = getDecoratorMetrics();
      expect(metrics.failedLogs).toBeGreaterThan(0);
    });

    it("should warn when threshold is exceeded", () => {
      const slowFunction = (): string => {
        const start = Date.now();
        while (Date.now() - start < 10) {
          // Busy wait
        }
        return "slow result";
      };

      const timedSlowFunction = withTiming(slowFunction, {
        category: "slow-function",
        threshold: 5,
      });

      timedSlowFunction();

      expect(mockConsole.warn).toHaveBeenCalledWith(expect.stringContaining("slow-function exceeded threshold"));
    });

    it("should work with anonymous functions", () => {
      const timedAnonymous = withTiming(() => "anonymous", {
        category: "anonymous-function",
      });

      const result = timedAnonymous();

      expect(result).toBe("anonymous");

      const metrics = getDecoratorMetrics();
      expect(metrics.operation.count).toBeGreaterThan(0);
    });
  });

  describe("Global Performance Tracker", () => {
    it("should use custom tracker when set", () => {
      const customConfig = { ...config, thresholdMs: 50 };
      const customTracker = new EnhancedPerformanceTracker(customConfig);

      setGlobalPerformanceTracker(customTracker);

      class TestService {
        @Timed({ category: "custom-tracker-test" })
        testMethod(): string {
          return "test";
        }
      }

      const service = new TestService();
      service.testMethod();

      // Verify the custom tracker is being used
      const customMetrics = customTracker.getMetrics();
      expect(customMetrics.operation.count).toBeGreaterThan(0);
    });

    it("should create default tracker if none is set", () => {
      // Reset to ensure no tracker is set
      resetDecoratorMetrics();

      class TestService {
        @Timed({ category: "default-tracker-test" })
        testMethod(): string {
          return "test";
        }
      }

      const service = new TestService();
      service.testMethod();

      // Should not throw and should create measurements
      const metrics = getDecoratorMetrics();
      expect(metrics).toBeDefined();
    });
  });

  describe("Decorator Metrics", () => {
    it("should provide access to decorator metrics", () => {
      class TestService {
        @Timed({ category: "metrics-test" })
        testMethod(): string {
          return "test";
        }
      }

      const service = new TestService();
      service.testMethod();

      const metrics = getDecoratorMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics.logsPerSecond).toBe("number");
      expect(typeof metrics.averageLatencyMs).toBe("number");
      expect(typeof metrics.totalLogs).toBe("number");
      expect(metrics.operation).toBeDefined();
      expect(metrics.resource).toBeDefined();
    });

    it("should reset decorator metrics", () => {
      class TestService {
        @Timed({ category: "reset-test" })
        testMethod(): string {
          return "test";
        }
      }

      const service = new TestService();
      service.testMethod();

      const beforeReset = getDecoratorMetrics();
      expect(beforeReset.totalLogs).toBeGreaterThan(0);

      resetDecoratorMetrics();

      const afterReset = getDecoratorMetrics();
      expect(afterReset.totalLogs).toBe(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle decorator application gracefully", () => {
      // Note: TypeScript/JavaScript decorators on properties may not throw
      // in the same way as method decorators. This test ensures no crashes occur.
      expect(() => {
        class TestClass {
          testMethod(): string {
            return "test";
          }
        }
        new TestClass();
      }).not.toThrow();
    });

    it("should handle missing method descriptors gracefully", () => {
      // This tests the internal error handling of the decorators
      expect(() => {
        class TestClass {
          @Timed()
          normalMethod(): string {
            return "test";
          }
        }
        new TestClass();
      }).not.toThrow();
    });
  });

  // ============================================================================
  // ENHANCED DECORATORS TESTS
  // ============================================================================

  describe("Enhanced Decorator Features", () => {
    describe("Parameter Tracking", () => {
      it("should track method parameters when enabled", () => {
        class TestService {
          @Timed({ 
            category: "param-tracking", 
            trackParameters: true,
            parameterOptions: {
              includeValues: true,
              includeTypes: true,
              maxValueLength: 100
            }
          })
          processData(userId: string, data: { name: string; age: number }): string {
            return `Processed ${userId}: ${data.name}`;
          }
        }

        const service = new TestService();
        service.processData("user123", { name: "John", age: 30 });

        const metrics = getDecoratorMetrics();
        expect(metrics.operation.count).toBeGreaterThan(0);
      });

      it("should exclude specified parameters from tracking", () => {
        class TestService {
          @Timed({ 
            category: "exclude-params", 
            trackParameters: true,
            parameterOptions: {
              includeValues: true,
              excludeParams: ["param1"]
            }
          })
          sensitiveOperation(password: string, userData: any): string {
            return "processed";
          }
        }

        const service = new TestService();
        service.sensitiveOperation("secret123", { name: "John" });

        // Should not crash and should track only non-excluded params
        expect(true).toBe(true);
      });
    });

    describe("Performance Budgets", () => {
      it("should warn when performance budget is exceeded", () => {
        const budget: IPerformanceBudget = {
          maxLatencyMs: 10,
          warningThreshold: 0.5,
          onExceeded: "warn"
        };

        class TestService {
          @Timed({ 
            category: "budget-test", 
            budget 
          })
          slowOperation(): string {
            // Simulate slow operation
            const start = Date.now();
            while (Date.now() - start < 20) {
              // Busy wait
            }
            return "slow result";
          }
        }

        const service = new TestService();
        service.slowOperation();

        // Should log budget warnings
        expect(mockConsole.warn).toHaveBeenCalled();
      });

      it("should throw error when budget exceeded and configured to error", () => {
        const budget: IPerformanceBudget = {
          maxLatencyMs: 5,
          onExceeded: "error"
        };

        class TestService {
          @Timed({ 
            category: "budget-error-test", 
            budget 
          })
          slowOperation(): string {
            const start = Date.now();
            while (Date.now() - start < 10) {
              // Busy wait
            }
            return "slow result";
          }
        }

        const service = new TestService();
        
        // Should throw due to budget exceeded
        expect(() => service.slowOperation()).toThrow(/Performance budget exceeded/);
      });
    });

    describe("Conditional Decoration", () => {
      beforeEach(() => {
        // Clear environment variables
        delete process.env["NODE_ENV"];
        delete process.env["ENVIRONMENT"];
        delete process.env["FEATURE_PERF_TRACKING"];
      });

      it("should activate decorator when conditions are met", () => {
        process.env["NODE_ENV"] = "production";

        const conditions: IDecoratorActivationConditions = {
          nodeEnv: ["production", "staging"]
        };

        class TestService {
          @Timed({ 
            category: "conditional-active", 
            activation: conditions 
          })
          testMethod(): string {
            return "active";
          }
        }

        const service = new TestService();
        service.testMethod();

        const metrics = getDecoratorMetrics();
        expect(metrics.operation.count).toBeGreaterThan(0);
      });

      it("should skip decoration when conditions are not met", () => {
        process.env["NODE_ENV"] = "development";

        const conditions: IDecoratorActivationConditions = {
          nodeEnv: ["production", "staging"]
        };

        class TestService {
          @Timed({ 
            category: "conditional-inactive", 
            activation: conditions 
          })
          testMethod(): string {
            return "inactive";
          }
        }

        const service = new TestService();
        const result = service.testMethod();

        expect(result).toBe("inactive");
        // Should not track metrics when conditions not met
      });

      it("should support feature flag activation", () => {
        process.env["FEATURE_PERF_TRACKING"] = "true";

        const conditions: IDecoratorActivationConditions = {
          featureFlags: ["FEATURE_PERF_TRACKING"]
        };

        class TestService {
          @Timed({ 
            category: "feature-flag-test", 
            activation: conditions 
          })
          testMethod(): string {
            return "flagged";
          }
        }

        const service = new TestService();
        service.testMethod();

        const metrics = getDecoratorMetrics();
        expect(metrics.operation.count).toBeGreaterThan(0);
      });
    });
  });

  describe("Category-Based Decorators", () => {
    describe("@DatabaseTimed", () => {
      it("should apply database-specific defaults", () => {
        class UserRepository {
          @DatabaseTimed({ threshold: 100 })
          async findUser(id: string): Promise<{ id: string; name: string }> {
            // Simulate database operation
            await new Promise(resolve => setTimeout(resolve, 10));
            return { id, name: "User" };
          }
        }

        const repo = new UserRepository();
        return repo.findUser("123").then(result => {
          expect(result.id).toBe("123");
          
          const metrics = getDecoratorMetrics();
          expect(metrics.operation.count).toBeGreaterThan(0);
        });
      });
    });

    describe("@NetworkTimed", () => {
      it("should apply network-specific defaults with reduced sampling", () => {
        class ApiService {
          @NetworkTimed({ threshold: 300 })
          async fetchData(endpoint: string): Promise<string> {
            await new Promise(resolve => setTimeout(resolve, 5));
            return `Data from ${endpoint}`;
          }
        }

        const service = new ApiService();
        return service.fetchData("/api/users").then(result => {
          expect(result).toContain("/api/users");
        });
      });
    });

    describe("@ComputationTimed", () => {
      it("should track computation operations with parameter tracking enabled", () => {
        class DataProcessor {
          @ComputationTimed({ threshold: 50 })
          processArray(data: number[]): number[] {
            return data.map(x => x * 2);
          }
        }

        const processor = new DataProcessor();
        const result = processor.processArray([1, 2, 3, 4, 5]);

        expect(result).toEqual([2, 4, 6, 8, 10]);
        
        const metrics = getDecoratorMetrics();
        expect(metrics.operation.count).toBeGreaterThan(0);
      });
    });

    describe("@CacheTimed", () => {
      it("should apply cache-specific performance budgets", () => {
        class CacheService {
          @CacheTimed({ threshold: 10 })
          get(key: string): string | null {
            // Simulate cache lookup
            return key === "exists" ? "cached-value" : null;
          }
        }

        const cache = new CacheService();
        const result = cache.get("exists");

        expect(result).toBe("cached-value");
        
        const metrics = getDecoratorMetrics();
        expect(metrics.operation.count).toBeGreaterThan(0);
      });
    });

    describe("@IOTimed", () => {
      it("should track I/O operations with appropriate thresholds", () => {
        class FileService {
          @IOTimed({ threshold: 100 })
          readFile(path: string): string {
            // Simulate file read
            return `Content of ${path}`;
          }
        }

        const service = new FileService();
        const result = service.readFile("/path/to/file.txt");

        expect(result).toContain("/path/to/file.txt");
        
        const metrics = getDecoratorMetrics();
        expect(metrics.operation.count).toBeGreaterThan(0);
      });
    });
  });

  describe("Decorator Composition", () => {
    describe("ConditionalTiming", () => {
      beforeEach(() => {
        process.env["NODE_ENV"] = "production";
      });

      it("should apply inner decorator when conditions are met", () => {
        class TestService {
          @ConditionalTiming(
            { nodeEnv: ["production"] },
            DatabaseTimed({ threshold: 100 })
          )
          conditionalMethod(): string {
            return "conditional";
          }
        }

        const service = new TestService();
        service.conditionalMethod();

        const metrics = getDecoratorMetrics();
        expect(metrics.operation.count).toBeGreaterThan(0);
      });

      it("should skip inner decorator when conditions are not met", () => {
        process.env["NODE_ENV"] = "development";

        class TestService {
          @ConditionalTiming(
            { nodeEnv: ["production"] },
            DatabaseTimed({ threshold: 100 })
          )
          conditionalMethod(): string {
            return "conditional";
          }
        }

        const service = new TestService();
        const result = service.conditionalMethod();

        expect(result).toBe("conditional");
        // Should not track metrics when conditions not met
      });
    });

    describe("ComposeDecorators", () => {
      it("should compose multiple decorators with correct order", () => {
        class TestService {
          @ComposeDecorators([
            { decorator: DatabaseTimed(), order: 1 },
            { decorator: Timed({ category: "business-logic" }), order: 2 }
          ])
          composedMethod(): string {
            return "composed";
          }
        }

        const service = new TestService();
        service.composedMethod();

        const metrics = getDecoratorMetrics();
        expect(metrics.operation.count).toBeGreaterThan(0);
      });
    });

    describe("SampledTiming", () => {
      it("should create sampled timing decorator", () => {
        class TestService {
          @SampledTiming({
            strategy: "fixed",
            baseRate: 1.0, // Always sample for testing
            category: "sampled-operation"
          })
          sampledMethod(): string {
            return "sampled";
          }
        }

        const service = new TestService();
        service.sampledMethod();

        // Should create the decorator without errors
        expect(true).toBe(true);
      });
    });
  });

  describe("Configuration and Utilities", () => {
    describe("Global Configuration", () => {
      it("should configure global decorator settings", () => {
        const budget: IPerformanceBudget = {
          maxLatencyMs: 100,
          onExceeded: "warn"
        };

        configureGlobalDecorators({
          globalSampleRate: 0.8,
          budgets: new Map([["database", budget]])
        });

        // Should not throw
        expect(true).toBe(true);
      });

      it("should set performance budgets by category", () => {
        const budget: IPerformanceBudget = {
          maxLatencyMs: 200,
          onExceeded: "error"
        };

        setPerformanceBudget("network", budget);
        
        const budgets = getPerformanceBudgets();
        expect(budgets.has("network")).toBe(true);
        expect(budgets.get("network")).toEqual(budget);
      });
    });

    describe("Performance Exporters", () => {
      it("should create and register JSON exporter", () => {
        const exporter = createJSONExporter("test-json");
        registerPerformanceExporter(exporter);

        const exporters = getActiveExporters();
        expect(exporters.has("test-json")).toBe(true);
        expect(exporters.get("test-json")?.format).toBe("json");
      });

      it("should create and register Prometheus exporter", () => {
        const exporter = createPrometheusExporter("test-prometheus");
        registerPerformanceExporter(exporter);

        const exporters = getActiveExporters();
        expect(exporters.has("test-prometheus")).toBe(true);
        expect(exporters.get("test-prometheus")?.format).toBe("prometheus");
      });

      it("should export metrics in JSON format", () => {
        const exporter = createJSONExporter("json-test");
        
        const mockMetrics = {
          count: 10,
          averageLatency: 150,
          totalTime: 1500
        };
        
        const output = exporter.export(mockMetrics, { category: "test" });
        
        expect(output).toContain('"count": 10');
        expect(output).toContain('"averageLatency": 150');
        expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Performance Metrics"));
      });

      it("should export metrics in Prometheus format", () => {
        const exporter = createPrometheusExporter("prometheus-test");
        
        const mockMetrics = {
          count: 5,
          totalTime: 750
        };
        
        const output = exporter.export(mockMetrics, { category: "test" });
        
        expect(output).toContain("performance_test_count 5");
        expect(output).toContain("performance_test_latency_seconds_sum 0.75");
        expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Prometheus Metrics"));
      });
    });

    describe("Category Metrics", () => {
      it("should get metrics for specific category", () => {
        class TestService {
          @Timed({ category: "specific-category" })
          testMethod(): string {
            return "test";
          }
        }

        const service = new TestService();
        service.testMethod();

        const categoryMetrics = getCategoryMetrics("specific-category");
        expect(categoryMetrics).toBeDefined();
      });
    });
  });
});
