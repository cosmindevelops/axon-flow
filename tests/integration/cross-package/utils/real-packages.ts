/**
 * Cross-Package Integration Test - Real Package Integration Utilities
 *
 * Real implementations using actual @axon package source files for authentic integration testing.
 * All mock systems have been eliminated in favor of production package interfaces.
 *
 * NOTE: Using direct source imports since packages aren't built yet.
 */

// ============================================================================
// REAL PACKAGE SOURCE IMPORTS - Direct Source File Integration
// ============================================================================

// Configuration package - Direct source imports
import type {
  IConfigRepository,
  IWritableConfigRepository,
  ConfigSourceType,
} from "../../../../packages/core/config/src/types/index.js";
import { MemoryConfigRepository } from "../../../../packages/core/config/src/repositories/memory/memory.classes.js";

// Logger package - Direct source imports
import type { ILogger, ILoggerConfig } from "../../../../packages/core/logger/src/logger/logger.types.js";
import type { ILogEntry } from "../../../../packages/core/logger/src/types/index.js";
import { PinoLogger } from "../../../../packages/core/logger/src/logger/logger.classes.js";

// Error package - Direct source imports
import {
  SystemError,
  ApplicationError,
  ValidationError,
  NetworkError,
} from "../../../../packages/core/errors/src/categories/categories.classes.js";
import { EnhancedErrorFactory } from "../../../../packages/core/errors/src/factories/simple/simple.classes.js";

// DI package - Direct source imports
import type { IDIContainer, IContainerConfig } from "../../../../packages/core/di/src/container/container.types.js";
import { DIContainer } from "../../../../packages/core/di/src/container/container.classes.js";

// Types package - Direct source imports
import type { Environment, Status } from "../../../../packages/core/types/src/index.js";

// ============================================================================
// REAL PACKAGE INTERFACES - Direct @axon Package Integration
// ============================================================================

// All wrapper interfaces eliminated - using real @axon package interfaces directly

// All wrapper classes eliminated - using real @axon package instances directly

// ============================================================================
// REAL PACKAGE FACTORY - Production Package Instantiation
// ============================================================================

/**
 * Real package factory for creating actual @axon package instances
 * Replaces all mock implementations with production-ready components
 */
export class RealPackageFactory {
  private repositories = new Map<string, IConfigRepository>();
  private loggers = new Map<string, ILogger>();
  private errorFactories = new Map<string, EnhancedErrorFactory>();
  private diContainers = new Map<string, IDIContainer>();

  /**
   * Create and register a real config repository
   */
  createConfigRepository(name: string, initialData?: Record<string, unknown>): IWritableConfigRepository {
    const repository = new MemoryConfigRepository(initialData || {});
    this.repositories.set(`config-${name}`, repository);
    return repository;
  }

  /**
   * Create and register a real logger instance
   */
  createLogger(name: string, config?: Partial<ILoggerConfig>): ILogger {
    const loggerConfig: Partial<ILoggerConfig> = {
      logLevel: "error", // Reduce logging noise in performance tests
      environment: "test",
      port: 3000,
      transports: [{ type: "console", enabled: false, name: `${name}-console` }], // Disable console for memory optimization
      performance: {
        enabled: false, // Disable performance tracking to reduce memory overhead
        sampleRate: 0.1, // Minimal sampling for performance tests
        thresholdMs: 100,
      },
      circuitBreaker: {
        enabled: false,
        failureThreshold: 5,
        resetTimeoutMs: 10000,
        monitorTimeWindowMs: 60000,
      },
      objectPool: {
        enabled: true, // Enable object pooling for memory efficiency
        initialSize: 5, // Reduce initial pool size
        maxSize: 20, // Reduce maximum pool size
        growthFactor: 1.2, // Slower growth for memory conservation
      },
      enableCorrelationIds: false, // Disable correlation IDs for memory optimization
      timestampFormat: "iso",
      ...config,
    };

    const logger = new PinoLogger(loggerConfig);

    this.loggers.set(`logger-${name}`, logger);
    return logger;
  }

  /**
   * Create and register a real error factory
   */
  createErrorFactory(name: string): EnhancedErrorFactory {
    const factory = new EnhancedErrorFactory();
    this.errorFactories.set(`error-${name}`, factory);
    return factory;
  }

  /**
   * Create and register a real DI container
   */
  createDIContainer(name: string, config?: Partial<IContainerConfig>): IDIContainer {
    const containerConfig: IContainerConfig = {
      name,
      strictMode: false,
      enableMetrics: true,
      defaultLifecycle: "singleton",
      maxResolutionDepth: 10,
      enableCache: true,
      autoDispose: true,
      ...config,
    };

    const container = new DIContainer(containerConfig);
    this.diContainers.set(`di-${name}`, container);
    return container;
  }

  /**
   * Get a registered component by key
   */
  getComponent<T>(key: string): T | undefined {
    return (
      (this.repositories.get(key) as T) ||
      (this.loggers.get(key) as T) ||
      (this.errorFactories.get(key) as T) ||
      (this.diContainers.get(key) as T)
    );
  }

  /**
   * Get all registered components
   */
  getAllComponents(): Map<string, unknown> {
    const allComponents = new Map<string, unknown>();

    Array.from(this.repositories.entries()).forEach(([key, value]) => {
      allComponents.set(key, value);
    });
    Array.from(this.loggers.entries()).forEach(([key, value]) => {
      allComponents.set(key, value);
    });
    Array.from(this.errorFactories.entries()).forEach(([key, value]) => {
      allComponents.set(key, value);
    });
    Array.from(this.diContainers.entries()).forEach(([key, value]) => {
      allComponents.set(key, value);
    });

    return allComponents;
  }

  /**
   * Clear all registered components with optimized memory cleanup
   */
  async clearAll(): Promise<void> {
    // Optimize cleanup with better resource management and memory efficiency
    try {
      // Dispose of repositories with timeout protection
      const repositoryCleanup = Array.from(this.repositories.entries()).map(async ([key, repository]) => {
        try {
          if ("dispose" in repository && typeof repository.dispose === "function") {
            await Promise.race([
              repository.dispose(),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Repository dispose timeout")), 1000)),
            ]);
          }
        } catch (error) {
          console.warn(`Repository cleanup failed for ${key}:`, error);
        }
      });
      await Promise.all(repositoryCleanup);
      this.repositories.clear();

      // Flush loggers with timeout protection and memory optimization
      const loggerCleanup = Array.from(this.loggers.entries()).map(async ([key, logger]) => {
        try {
          if ("flush" in logger && typeof logger.flush === "function") {
            await Promise.race([
              logger.flush(),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Logger flush timeout")), 500)),
            ]);
          }
          // Explicitly nullify logger references for GC
          if ("destroy" in logger && typeof logger.destroy === "function") {
            await logger.destroy();
          }
        } catch (error) {
          console.warn(`Logger cleanup failed for ${key}:`, error);
        }
      });
      await Promise.all(loggerCleanup);
      this.loggers.clear();

      // Clear error factories immediately
      this.errorFactories.clear();

      // Clear DI containers with timeout protection
      const diCleanup = Array.from(this.diContainers.entries()).map(async ([key, container]) => {
        try {
          if ("dispose" in container && typeof container.dispose === "function") {
            await Promise.race([
              container.dispose(),
              new Promise((_, reject) => setTimeout(() => reject(new Error("DI container dispose timeout")), 1000)),
            ]);
          }
        } catch (error) {
          console.warn(`DI container cleanup failed for ${key}:`, error);
        }
      });
      await Promise.all(diCleanup);
      this.diContainers.clear();

      // Force garbage collection if available for memory optimization
      if (global.gc) {
        global.gc();
      }
    } catch (error) {
      console.error("Critical error during clearAll cleanup:", error);
      // Still clear the maps even if cleanup failed
      this.repositories.clear();
      this.loggers.clear();
      this.errorFactories.clear();
      this.diContainers.clear();
    }
  }

  /**
   * Remove a specific component
   */
  async removeComponent(key: string): Promise<boolean> {
    let found = false;

    if (this.repositories.has(key)) {
      const repo = this.repositories.get(key);
      if (repo && "dispose" in repo && typeof repo.dispose === "function") {
        await repo.dispose();
      }
      found = this.repositories.delete(key);
    }

    if (this.loggers.has(key)) {
      const logger = this.loggers.get(key);
      if (logger && "flush" in logger && typeof logger.flush === "function") {
        await logger.flush();
      }
      found = this.loggers.delete(key);
    }

    if (this.errorFactories.has(key)) {
      found = this.errorFactories.delete(key);
    }

    if (this.diContainers.has(key)) {
      const container = this.diContainers.get(key);
      if (container && "dispose" in container && typeof container.dispose === "function") {
        await container.dispose();
      }
      found = this.diContainers.delete(key);
    }

    return found;
  }
}

// ============================================================================
// INTEGRATION TEST SCENARIOS - Real Package Integration
// ============================================================================

/**
 * Integration test scenario using real @axon packages
 */
export interface IRealIntegrationTestScenario {
  /** Scenario name */
  name: string;
  /** Description of what this scenario tests */
  description: string;
  /** Required real packages */
  requiredPackages: Array<{
    type: "config" | "logger" | "error" | "di";
    name: string;
    config?: Record<string, unknown>;
  }>;
  /** Setup function with real packages */
  setup: (factory: RealPackageFactory) => Promise<void> | void;
  /** Test execution function */
  execute: (factory: RealPackageFactory) => Promise<void> | void;
  /** Validation function */
  validate: (factory: RealPackageFactory) => Promise<void> | void;
  /** Cleanup function */
  cleanup?: (factory: RealPackageFactory) => Promise<void> | void;
}

/**
 * Run an integration test scenario with real @axon packages
 */
export async function runRealIntegrationTestScenario(scenario: IRealIntegrationTestScenario): Promise<{
  success: boolean;
  error?: Error;
  components: Map<string, unknown>;
}> {
  const factory = new RealPackageFactory();

  try {
    // Setup required packages
    for (const packageConfig of scenario.requiredPackages) {
      switch (packageConfig.type) {
        case "config":
          factory.createConfigRepository(packageConfig.name, packageConfig.config);
          break;
        case "logger":
          factory.createLogger(packageConfig.name, packageConfig.config as Partial<ILoggerConfig>);
          break;
        case "error":
          factory.createErrorFactory(packageConfig.name);
          break;
        case "di":
          factory.createDIContainer(packageConfig.name, packageConfig.config as Partial<IContainerConfig>);
          break;
      }
    }

    // Run scenario setup
    await scenario.setup(factory);

    // Execute scenario
    await scenario.execute(factory);

    // Validate results
    await scenario.validate(factory);

    return {
      success: true,
      components: factory.getAllComponents(),
    };
  } catch (error) {
    return {
      success: false,
      error: error as Error,
      components: factory.getAllComponents(),
    };
  } finally {
    // Run cleanup if provided
    if (scenario.cleanup) {
      try {
        await scenario.cleanup(factory);
      } catch (cleanupError) {
        console.warn(`Cleanup failed for scenario ${scenario.name}:`, cleanupError);
      }
    }

    // Clear all components
    await factory.clearAll();
  }
}

// ============================================================================
// UTILITY FUNCTIONS - Real Package Assertions
// ============================================================================

/**
 * Utility functions for asserting real package behavior
 */
export const realPackageAssertions = {
  /**
   * Assert that config repository contains expected values
   */
  async assertConfigValues(repository: IConfigRepository, expectedValues: Record<string, unknown>): Promise<void> {
    for (const [key, expectedValue] of Object.entries(expectedValues)) {
      const actualValue = repository.get(key);
      if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
        throw new Error(
          `Config value mismatch for key "${key}". Expected: ${JSON.stringify(expectedValue)}, Actual: ${JSON.stringify(actualValue)}`,
        );
      }
    }
  },

  /**
   * Assert that logger is healthy and functional
   */
  assertLoggerHealth(logger: ILogger): void {
    // Test logger functionality by attempting to log
    try {
      logger.info("Health check");
    } catch (error) {
      throw new Error(`Logger is not healthy: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Assert that DI container has expected registrations
   */
  assertDIRegistrations(container: IDIContainer, expectedTokens: string[]): void {
    for (const token of expectedTokens) {
      if (!container.isRegistered(token)) {
        throw new Error(`Expected DI registration not found: ${token}`);
      }
    }
  },

  /**
   * Assert that error factory creates proper error instances
   */
  assertErrorFactory(factory: EnhancedErrorFactory, errorType: string): void {
    const error = factory.createSystemError("test error", "TEST_ERROR");
    if (!(error instanceof SystemError)) {
      throw new Error(`Error factory did not create expected error type: ${errorType}`);
    }
  },
};

// ============================================================================
// EXPORTS - Real Package Integration Only
// ============================================================================

// Export real package factory and utilities
export { RealPackageFactory as default };

// Export real package interfaces (re-exported from source files)
export type {
  IConfigRepository,
  IWritableConfigRepository,
  ILogger,
  ILogEntry,
  ILoggerConfig,
  IDIContainer,
  IContainerConfig,
  Environment,
  Status,
};

// Export real package classes (re-exported from source files)
export {
  MemoryConfigRepository,
  PinoLogger,
  SystemError,
  ApplicationError,
  ValidationError,
  NetworkError,
  EnhancedErrorFactory,
  DIContainer,
};

// Default instances for convenience
export const realConfigRepository = new MemoryConfigRepository();
export const realErrorFactory = new EnhancedErrorFactory();
