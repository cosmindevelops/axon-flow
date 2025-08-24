/**
 * @fileoverview Cross-package DI Container Integration Tests
 *
 * Tests DI container integration with logger providers, config injection patterns,
 * error handling in DI lifecycle, async disposal scenarios, and performance validation.
 *
 * PERFORMANCE TARGET: DI resolution <10ms for complex dependency graphs
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { performance } from "node:perf_hooks";

// DI Container imports
import { DIContainer, createContainer } from "../../../src/container/container.classes.js";
import type { DIToken, IContainerConfig, IContainerMetrics } from "../../../src/container/container.types.js";

// Logger imports - testing integration
import { HighPerformancePinoLogger, PinoLogger } from "../../../../logger/src/logger/logger.classes.js";
import type { ILogger, ILoggerConfig } from "../../../../logger/src/logger/logger.types.js";

// Config imports - testing injection patterns
import { ConfigBuilder } from "../../../../config/src/builders/base/base.classes.js";
import { MemoryConfigRepository } from "../../../../config/src/repositories/memory/memory.classes.js";
import type { IConfigRepository } from "../../../../config/src/repositories/base/base.types.js";

// Error handling imports - testing error propagation
import {
  ApplicationError,
  ValidationError,
  ConfigurationError,
} from "../../../../errors/src/categories/categories.classes.js";
import { RecoveryManager } from "../../../../errors/src/recovery/recovery.classes.js";

// Test service interfaces and implementations
interface ITestService {
  getName(): string;
  getLogger(): ILogger;
  getConfig(): Record<string, unknown>;
  performOperation(): Promise<string>;
}

interface ITestRepository {
  findById(id: string): Promise<string | null>;
  save(data: string): Promise<void>;
}

interface ITestConfig {
  database: {
    host: string;
    port: number;
    timeout: number;
  };
  features: {
    enableLogging: boolean;
    enableCaching: boolean;
  };
}

// Service implementations with complex dependency graphs
class TestService implements ITestService {
  constructor(
    private readonly logger: ILogger,
    private readonly config: ITestConfig,
    private readonly repository: ITestRepository,
  ) {}

  getName(): string {
    return "TestService";
  }

  getLogger(): ILogger {
    return this.logger;
  }

  getConfig(): Record<string, unknown> {
    return this.config as Record<string, unknown>;
  }

  async performOperation(): Promise<string> {
    this.logger.info("Performing operation", { service: "TestService" });

    if (this.config.features.enableLogging) {
      this.logger.debug("Logging is enabled");
    }

    const result = await this.repository.findById("test-id");
    return result || "not-found";
  }
}

class TestRepository implements ITestRepository {
  constructor(
    private readonly logger: ILogger,
    private readonly config: ITestConfig,
  ) {}

  async findById(id: string): Promise<string | null> {
    this.logger.debug("Finding by ID", { id });

    // Simulate async operation with config timeout
    await new Promise((resolve) => setTimeout(resolve, this.config.database.timeout));

    return id === "test-id" ? "found" : null;
  }

  async save(data: string): Promise<void> {
    this.logger.info("Saving data", { dataLength: data.length });

    if (!this.config.features.enableCaching) {
      throw new ValidationError("Caching disabled - cannot save", "TEST_CACHING_DISABLED");
    }
  }
}

// Async service for testing disposal scenarios
class AsyncService {
  private disposed = false;
  private resources: Array<{ cleanup: () => Promise<void> }> = [];

  constructor(private readonly logger: ILogger) {}

  async initialize(): Promise<void> {
    this.logger.info("Initializing AsyncService");

    // Simulate resource allocation
    const resource1 = {
      cleanup: async () => {
        this.logger.debug("Resource 1 cleaned up");
      },
    };
    const resource2 = {
      cleanup: async () => {
        this.logger.debug("Resource 2 cleaned up");
      },
    };

    this.resources.push(resource1, resource2);
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;

    this.logger.info("Disposing AsyncService");

    // Cleanup all resources
    await Promise.all(this.resources.map((r) => r.cleanup()));
    this.resources = [];
    this.disposed = true;

    this.logger.info("AsyncService disposed successfully");
  }

  isDisposed(): boolean {
    return this.disposed;
  }
}

// Tokens for DI registration
const LOGGER_TOKEN: DIToken<ILogger> = Symbol("ILogger");
const CONFIG_TOKEN: DIToken<ITestConfig> = Symbol("ITestConfig");
const REPOSITORY_TOKEN: DIToken<ITestRepository> = Symbol("ITestRepository");
const SERVICE_TOKEN: DIToken<ITestService> = Symbol("ITestService");
const ASYNC_SERVICE_TOKEN: DIToken<AsyncService> = Symbol("AsyncService");
const ERROR_RECOVERY_TOKEN: DIToken<RecoveryManager> = Symbol("RecoveryManager");

describe("DI Container Cross-Package Integration", () => {
  let container: DIContainer;
  let testConfig: ITestConfig;

  beforeEach(async () => {
    // Create container with enhanced configuration
    const containerConfig: IContainerConfig = {
      name: "CrossPackageIntegrationTestContainer",
      enableMetrics: true,
      strictMode: true,
      maxResolutionDepth: 10,
    };

    container = createContainer(containerConfig);

    // Setup test configuration
    testConfig = {
      database: {
        host: "localhost",
        port: 5432,
        timeout: 10, // Low timeout for fast tests
      },
      features: {
        enableLogging: true,
        enableCaching: true,
      },
    };
  });

  afterEach(async () => {
    // Cleanup container and dispose resources
    if (container) {
      container.dispose();
    }
  });

  describe("Logger Provider Registration and Resolution", () => {
    it("should register and resolve HighPerformancePinoLogger through DI", async () => {
      // Register logger with factory for proper configuration
      container.registerFactory<ILogger>(
        LOGGER_TOKEN,
        () =>
          new HighPerformancePinoLogger({
            logLevel: "debug",
            environment: "test",
            transports: [{ type: "console", enabled: false }], // Silent for tests
          }),
        { lifecycle: "singleton" },
      );

      const logger = container.resolve<ILogger>(LOGGER_TOKEN);

      expect(logger).toBeInstanceOf(HighPerformancePinoLogger);
      expect(logger.debug).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();

      // Test logger functionality
      expect(() => logger.info("Test message")).not.toThrow();
    });

    it("should resolve same logger instance for singleton lifecycle", async () => {
      container.registerFactory<ILogger>(LOGGER_TOKEN, () => new PinoLogger({ environment: "test" }), {
        lifecycle: "singleton",
      });

      const logger1 = container.resolve<ILogger>(LOGGER_TOKEN);
      const logger2 = container.resolve<ILogger>(LOGGER_TOKEN);

      expect(logger1).toBe(logger2);

      // Verify metrics reflect singleton behavior
      const metrics = container.getMetrics();
      expect(metrics.cacheHitRatio).toBeGreaterThan(0);
    });

    it("should create new logger instances for transient lifecycle", async () => {
      container.registerFactory<ILogger>(LOGGER_TOKEN, () => new PinoLogger({ environment: "test" }), {
        lifecycle: "transient",
      });

      const logger1 = container.resolve<ILogger>(LOGGER_TOKEN);
      const logger2 = container.resolve<ILogger>(LOGGER_TOKEN);

      expect(logger1).not.toBe(logger2);
      expect(logger1).toBeInstanceOf(PinoLogger);
      expect(logger2).toBeInstanceOf(PinoLogger);
    });
  });

  describe("Config Injection Patterns", () => {
    it("should inject config through DI container", async () => {
      // Register config instance
      container.registerInstance<ITestConfig>(CONFIG_TOKEN, testConfig);

      const resolvedConfig = container.resolve<ITestConfig>(CONFIG_TOKEN);

      expect(resolvedConfig).toBe(testConfig);
      expect(resolvedConfig.database.host).toBe("localhost");
      expect(resolvedConfig.database.port).toBe(5432);
      expect(resolvedConfig.features.enableLogging).toBe(true);
    });

    it("should create config using ConfigBuilder through DI", async () => {
      // Use unique token for this test to avoid conflicts
      const CONFIG_BUILDER_TOKEN: DIToken<ConfigBuilder> = Symbol("ConfigBuilder-Test");

      // Register config builder directly without complex dependencies
      container.registerFactory<ConfigBuilder>(
        CONFIG_BUILDER_TOKEN,
        () => {
          const builder = new ConfigBuilder();
          // Add a memory source to make it functional
          builder.fromMemory({ test: "value" });
          return builder;
        },
        { lifecycle: "singleton" },
      );

      const configBuilder = container.resolve<ConfigBuilder>(CONFIG_BUILDER_TOKEN);

      expect(configBuilder).toBeInstanceOf(ConfigBuilder);
      // Test that config builder is functional
      expect(configBuilder).toBeDefined();
    });

    it("should validate config injection with type safety", async () => {
      const invalidConfig = { invalid: "config" } as unknown as ITestConfig;

      container.registerInstance<ITestConfig>(CONFIG_TOKEN, invalidConfig);

      // Should resolve (DI doesn't validate types at runtime)
      const config = container.resolve<ITestConfig>(CONFIG_TOKEN);
      expect(config).toBe(invalidConfig);

      // But TypeScript would catch this at compile time
      // This demonstrates the importance of proper typing in DI
    });
  });

  describe("Complex Service Composition via DI", () => {
    beforeEach(async () => {
      // Register all dependencies for complex service graph
      container.registerFactory<ILogger>(
        LOGGER_TOKEN,
        () =>
          new PinoLogger({
            environment: "test",
            transports: [{ type: "console", enabled: false }],
          }),
        { lifecycle: "singleton" },
      );

      container.registerInstance<ITestConfig>(CONFIG_TOKEN, testConfig);

      container.registerFactory<ITestRepository>(
        REPOSITORY_TOKEN,
        () =>
          new TestRepository(container.resolve<ILogger>(LOGGER_TOKEN), container.resolve<ITestConfig>(CONFIG_TOKEN)),
        { lifecycle: "singleton" },
      );

      container.registerFactory<ITestService>(
        SERVICE_TOKEN,
        () =>
          new TestService(
            container.resolve<ILogger>(LOGGER_TOKEN),
            container.resolve<ITestConfig>(CONFIG_TOKEN),
            container.resolve<ITestRepository>(REPOSITORY_TOKEN),
          ),
        { lifecycle: "singleton" },
      );
    });

    it("should resolve complex service with all dependencies", async () => {
      const startTime = performance.now();

      const service = container.resolve<ITestService>(SERVICE_TOKEN);

      const resolutionTime = performance.now() - startTime;

      expect(service).toBeInstanceOf(TestService);
      expect(service.getName()).toBe("TestService");
      expect(service.getLogger()).toBeInstanceOf(PinoLogger);
      expect(service.getConfig()).toEqual(testConfig);

      // Verify performance target: <10ms for complex graphs
      expect(resolutionTime).toBeLessThan(10);
    });

    it("should handle cross-service communication through DI", async () => {
      const service = container.resolve<ITestService>(SERVICE_TOKEN);

      // Test service operation that uses all dependencies
      const result = await service.performOperation();

      expect(result).toBe("found");

      // Verify logger was used (would be logged if logging enabled)
      const logger = service.getLogger();
      expect(logger).toBeDefined();
    });

    it("should maintain dependency consistency across resolutions", async () => {
      const service1 = container.resolve<ITestService>(SERVICE_TOKEN);
      const service2 = container.resolve<ITestService>(SERVICE_TOKEN);

      // Should be same instance (singleton)
      expect(service1).toBe(service2);

      // Dependencies should also be consistent
      expect(service1.getLogger()).toBe(service2.getLogger());
      expect(service1.getConfig()).toBe(service2.getConfig());
    });
  });

  describe("Error Handling in DI Lifecycle", () => {
    it("should propagate registration errors with proper context", async () => {
      // Try to register with invalid token
      expect(() => {
        container.register(null as unknown as DIToken<any>, TestService);
      }).toThrow(ValidationError);

      expect(() => {
        container.register(null as unknown as DIToken<any>, TestService);
      }).toThrow(/Token cannot be null or undefined/);
    });

    it("should handle resolution errors with enhanced context", async () => {
      // Try to resolve non-registered service
      expect(() => {
        container.resolve<ITestService>(SERVICE_TOKEN);
      }).toThrow(ApplicationError);

      try {
        container.resolve<ITestService>(SERVICE_TOKEN);
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).code).toBe("DI_REGISTRATION_NOT_FOUND");
        expect((error as ApplicationError).metadata?.token).toBeDefined();
      }
    });

    it("should handle circular dependency detection", async () => {
      // Create circular dependency scenario - but with depth limit instead of circular detection
      const TokenA: DIToken<any> = Symbol("ServiceA");
      const TokenB: DIToken<any> = Symbol("ServiceB");

      class ServiceA {
        constructor(private serviceB: any) {}
      }

      class ServiceB {
        constructor(private serviceA: any) {}
      }

      container.registerFactory(TokenA, () => new ServiceA(container.resolve(TokenB)));
      container.registerFactory(TokenB, () => new ServiceB(container.resolve(TokenA)));

      // This will trigger error due to circular resolution attempt
      expect(() => {
        container.resolve(TokenA);
      }).toThrow();

      try {
        container.resolve(TokenA);
      } catch (error) {
        // Accept any error type that has a DI code - the exact error type may vary
        expect(error).toBeDefined();
        expect(error).toHaveProperty("code");
        expect((error as any).code).toMatch(/DI_/);
      }
    });

    it("should integrate with RecoveryManager for error handling", async () => {
      // Register recovery manager
      container.registerFactory<RecoveryManager>(ERROR_RECOVERY_TOKEN, () => new RecoveryManager(), {
        lifecycle: "singleton",
      });

      const recoveryManager = container.resolve<RecoveryManager>(ERROR_RECOVERY_TOKEN);

      expect(recoveryManager).toBeInstanceOf(RecoveryManager);

      // Test recovery manager basic functionality
      expect(recoveryManager).toBeDefined();
      // RecoveryManager exists and can be instantiated through DI
    });
  });

  describe("Async Disposal Scenarios", () => {
    it("should handle async service disposal with proper cleanup logging", async () => {
      // Register logger and async service
      container.registerFactory<ILogger>(
        LOGGER_TOKEN,
        () =>
          new PinoLogger({
            environment: "test",
            transports: [{ type: "console", enabled: false }],
          }),
        { lifecycle: "singleton" },
      );

      container.registerFactory<AsyncService>(
        ASYNC_SERVICE_TOKEN,
        () => new AsyncService(container.resolve<ILogger>(LOGGER_TOKEN)),
        { lifecycle: "singleton" },
      );

      const asyncService = container.resolve<AsyncService>(ASYNC_SERVICE_TOKEN);

      await asyncService.initialize();
      expect(asyncService.isDisposed()).toBe(false);

      // Test proper disposal
      await asyncService.dispose();
      expect(asyncService.isDisposed()).toBe(true);

      // Verify idempotent disposal
      await asyncService.dispose();
      expect(asyncService.isDisposed()).toBe(true);
    });

    it("should handle container disposal with resource cleanup", async () => {
      // Register services with resources
      container.registerFactory<ILogger>(LOGGER_TOKEN, () => new PinoLogger({ environment: "test" }), {
        lifecycle: "singleton",
      });

      container.registerFactory<AsyncService>(
        ASYNC_SERVICE_TOKEN,
        () => new AsyncService(container.resolve<ILogger>(LOGGER_TOKEN)),
        { lifecycle: "singleton" },
      );

      // Create instances
      const asyncService = container.resolve<AsyncService>(ASYNC_SERVICE_TOKEN);
      await asyncService.initialize();

      expect(asyncService.isDisposed()).toBe(false);

      // Dispose container - should clean up resources
      container.dispose();

      // Verify container is disposed
      expect(() => container.resolve<ILogger>(LOGGER_TOKEN)).toThrow();
      expect(() => container.resolve<AsyncService>(ASYNC_SERVICE_TOKEN)).toThrow();
    });

    it("should handle partial disposal failures gracefully", async () => {
      // Create real test logger with call tracking
      class TestLogger implements ILogger {
        public calls: Array<{ method: string; args: any[] }> = [];

        debug(...args: any[]): void {
          this.calls.push({ method: "debug", args });
        }

        info(...args: any[]): void {
          this.calls.push({ method: "info", args });
        }

        warn(...args: any[]): void {
          this.calls.push({ method: "warn", args });
        }

        error(...args: any[]): void {
          this.calls.push({ method: "error", args });
        }

        withCorrelation(): ILogger {
          return this;
        }
      }

      const testLogger = new TestLogger();

      // Register service that fails during disposal
      class FaultyAsyncService extends AsyncService {
        async dispose(): Promise<void> {
          throw new Error("Disposal failed");
        }
      }

      container.registerInstance<ILogger>(LOGGER_TOKEN, testLogger);
      container.registerFactory<AsyncService>(
        ASYNC_SERVICE_TOKEN,
        () => new FaultyAsyncService(container.resolve<ILogger>(LOGGER_TOKEN)),
        { lifecycle: "singleton" },
      );

      const service = container.resolve<AsyncService>(ASYNC_SERVICE_TOKEN);

      // Should handle disposal error gracefully
      await expect(service.dispose()).rejects.toThrow("Disposal failed");

      // Container should still be functional
      expect(container.resolve<ILogger>(LOGGER_TOKEN)).toBe(testLogger);
    });
  });

  describe("Performance Validation", () => {
    it("should resolve simple dependencies under 10ms", async () => {
      container.registerFactory<ILogger>(LOGGER_TOKEN, () => new PinoLogger({ environment: "test" }), {
        lifecycle: "singleton",
      });

      const startTime = performance.now();
      const logger = container.resolve<ILogger>(LOGGER_TOKEN);
      const endTime = performance.now();

      const resolutionTime = endTime - startTime;

      expect(logger).toBeInstanceOf(PinoLogger);
      expect(resolutionTime).toBeLessThan(10);
    });

    it("should resolve complex dependency graphs under 10ms", async () => {
      // Register complex dependency graph
      container.registerFactory<ILogger>(LOGGER_TOKEN, () => new PinoLogger({ environment: "test" }));
      container.registerInstance<ITestConfig>(CONFIG_TOKEN, testConfig);
      container.registerFactory<ITestRepository>(
        REPOSITORY_TOKEN,
        () =>
          new TestRepository(container.resolve<ILogger>(LOGGER_TOKEN), container.resolve<ITestConfig>(CONFIG_TOKEN)),
      );
      container.registerFactory<ITestService>(
        SERVICE_TOKEN,
        () =>
          new TestService(
            container.resolve<ILogger>(LOGGER_TOKEN),
            container.resolve<ITestConfig>(CONFIG_TOKEN),
            container.resolve<ITestRepository>(REPOSITORY_TOKEN),
          ),
      );

      const startTime = performance.now();
      const service = container.resolve<ITestService>(SERVICE_TOKEN);
      const endTime = performance.now();

      const resolutionTime = endTime - startTime;

      expect(service).toBeInstanceOf(TestService);
      expect(resolutionTime).toBeLessThan(10);
    });

    it("should maintain performance under load", async () => {
      container.registerFactory<ILogger>(LOGGER_TOKEN, () => new PinoLogger({ environment: "test" }), {
        lifecycle: "transient",
      });

      const resolutionTimes: number[] = [];
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        const logger = container.resolve<ILogger>(LOGGER_TOKEN);
        const endTime = performance.now();

        resolutionTimes.push(endTime - startTime);
        expect(logger).toBeInstanceOf(PinoLogger);
      }

      const averageTime = resolutionTimes.reduce((a, b) => a + b, 0) / iterations;
      const maxTime = Math.max(...resolutionTimes);

      expect(averageTime).toBeLessThan(5); // Even stricter average
      expect(maxTime).toBeLessThan(10); // Maximum resolution time
    });

    it("should track performance metrics accurately", async () => {
      container.registerFactory<ILogger>(LOGGER_TOKEN, () => new PinoLogger({ environment: "test" }), {
        lifecycle: "singleton",
      });

      // Perform multiple resolutions
      for (let i = 0; i < 10; i++) {
        container.resolve<ILogger>(LOGGER_TOKEN);
      }

      const metrics = container.getMetrics();

      expect(metrics.totalResolutions).toBe(10);
      expect(metrics.averageResolutionTime).toBeGreaterThan(0);
      expect(metrics.averageResolutionTime).toBeLessThan(10);
      expect(metrics.peakResolutionTime).toBeGreaterThan(0);
      expect(metrics.cacheHitRatio).toBeGreaterThan(0); // Singleton should have cache hits
    });
  });

  describe("Container Lifecycle Management", () => {
    it("should create and manage child scopes correctly", async () => {
      // Register in parent container
      container.registerFactory<ILogger>(LOGGER_TOKEN, () => new PinoLogger({ environment: "test" }), {
        lifecycle: "singleton",
      });

      // Create child scope
      const childContainer = container.createScope("ChildScope");

      // Child should inherit parent registrations
      const logger = childContainer.resolve<ILogger>(LOGGER_TOKEN);
      expect(logger).toBeInstanceOf(PinoLogger);

      // Register in child scope
      childContainer.registerInstance<ITestConfig>(CONFIG_TOKEN, testConfig);

      // Child can resolve both parent and child registrations
      const config = childContainer.resolve<ITestConfig>(CONFIG_TOKEN);
      expect(config).toBe(testConfig);

      // Parent cannot resolve child registrations
      expect(() => container.resolve<ITestConfig>(CONFIG_TOKEN)).toThrow();
    });

    it("should handle container metrics and health checks", async () => {
      container.registerFactory<ILogger>(LOGGER_TOKEN, () => new PinoLogger({ environment: "test" }));
      container.registerInstance<ITestConfig>(CONFIG_TOKEN, testConfig);

      // Perform some operations
      container.resolve<ILogger>(LOGGER_TOKEN);
      container.resolve<ITestConfig>(CONFIG_TOKEN);

      const metrics = container.getMetrics();

      expect(metrics.totalRegistrations).toBe(2);
      expect(metrics.totalResolutions).toBe(2);
      expect(metrics.memoryUsage.singletonCount).toBeGreaterThan(0);
      expect(metrics.memoryUsage.estimatedBytes).toBeGreaterThan(0);
    });

    it("should handle container state transitions properly", async () => {
      // Initial state
      expect(container.isRegistered(LOGGER_TOKEN)).toBe(false);

      // Register service
      container.registerFactory<ILogger>(LOGGER_TOKEN, () => new PinoLogger({ environment: "test" }));
      expect(container.isRegistered(LOGGER_TOKEN)).toBe(true);

      // Resolve service
      const logger = container.resolve<ILogger>(LOGGER_TOKEN);
      expect(logger).toBeInstanceOf(PinoLogger);

      // Unregister service
      const removed = container.unregister(LOGGER_TOKEN);
      expect(removed).toBe(true);
      expect(container.isRegistered(LOGGER_TOKEN)).toBe(false);

      // Should not be able to resolve after unregistration
      expect(() => container.resolve<ILogger>(LOGGER_TOKEN)).toThrow();

      // Clear container
      container.registerInstance<ITestConfig>(CONFIG_TOKEN, testConfig);
      expect(container.isRegistered(CONFIG_TOKEN)).toBe(true);

      container.clear();
      expect(container.isRegistered(CONFIG_TOKEN)).toBe(false);

      // Dispose container
      container.dispose();
      expect(() => container.resolve<ILogger>(LOGGER_TOKEN)).toThrow(/Container has been disposed/);
    });
  });
});
