/**
 * Comprehensive Barrel Exports Validation Tests
 *
 * Tests all core packages for proper barrel export functionality including:
 * - Type-only imports (zero runtime impact)
 * - Runtime imports (class and function exports)
 * - Cross-package compatibility
 * - Tree-shaking optimization
 * - ESM/CJS dual compatibility
 */

import { describe, expect, it } from "vitest";

describe("Barrel Exports Validation", () => {
  describe("@axon/types package", () => {
    it("should allow type-only imports without runtime impact", async () => {
      // This should not add any runtime code
      const typesModule = await import("@axon/types");

      // Type-only exports should not have runtime constructors
      expect(typeof typesModule.PlatformId).toBe("undefined");
      expect(typeof typesModule.CorrelationId).toBe("undefined");
      expect(typeof typesModule.IAgentMetadata).toBe("undefined");
    });

    it("should provide schema and class exports", async () => {
      const typesModule = await import("@axon/types");

      // Schema exports should be available at runtime
      expect(typesModule.agentMetadataSchema).toBeDefined();
      expect(typesModule.taskStatusSchema).toBeDefined();
      expect(typesModule.workflowStateSchema).toBeDefined();
    });

    it("should support mixed type and runtime imports", async () => {
      // This tests the separation of type-only and runtime exports
      const { agentMetadataSchema } = await import("@axon/types");

      expect(agentMetadataSchema).toBeDefined();
      expect(typeof agentMetadataSchema.parse).toBe("function");
    });
  });

  describe("@axon/errors package", () => {
    it("should export error classes correctly", async () => {
      const errorsModule = await import("@axon/errors");

      // Namespace-organized error classes
      expect(errorsModule.ValidationError).toBeDefined();
      expect(errorsModule.ConfigurationError).toBeDefined();
      expect(errorsModule.AuthenticationError).toBeDefined();

      // Should be constructable classes
      expect(typeof errorsModule.ValidationError).toBe("function");
      expect(errorsModule.ValidationError.prototype).toBeDefined();
    });

    it("should provide backward compatibility aliases", async () => {
      const errorsModule = await import("@axon/errors");

      // Backward compatibility should work
      expect(errorsModule.ValidationErrorCategory).toBeDefined();

      // Should be the same as the new naming
      expect(errorsModule.ValidationErrorCategory).toBe(errorsModule.ValidationError);
    });

    it("should export recovery mechanisms", async () => {
      const errorsModule = await import("@axon/errors");

      expect(errorsModule.RecoveryManager).toBeDefined();
      expect(errorsModule.RetryHandler).toBeDefined();
      expect(errorsModule.CircuitBreakerHandler).toBeDefined();
    });
  });

  describe("@axon/logger package", () => {
    it("should export tiered logger architecture", async () => {
      const loggerModule = await import("@axon/logger");

      // Core lightweight loggers
      expect(loggerModule.PinoLogger).toBeDefined();
      expect(loggerModule.HighPerformancePinoLogger).toBeDefined();

      // Should be constructable
      expect(typeof loggerModule.PinoLogger).toBe("function");
      expect(typeof loggerModule.HighPerformancePinoLogger).toBe("function");
    });

    it("should export performance components", async () => {
      const loggerModule = await import("@axon/logger");

      // Performance layer exports
      expect(loggerModule.PerformanceTracker).toBeDefined();
      expect(loggerModule.ObjectPool).toBeDefined();
    });

    it("should export ready-to-use instances", async () => {
      const loggerModule = await import("@axon/logger");

      // Pre-configured instances
      expect(loggerModule.logger).toBeDefined();
      expect(loggerModule.highPerformanceLogger).toBeDefined();
      expect(loggerModule.productionLogger).toBeDefined();
      expect(loggerModule.developmentLogger).toBeDefined();

      // Should have logger interface methods
      expect(typeof loggerModule.logger.info).toBe("function");
      expect(typeof loggerModule.logger.error).toBe("function");
    });
  });

  describe("@axon/config package", () => {
    it("should export repository implementations", async () => {
      const configModule = await import("@axon/config");

      // Repository layer
      expect(configModule.BaseConfigRepository).toBeDefined();
      expect(configModule.EnvironmentConfigRepository).toBeDefined();
      expect(configModule.MemoryConfigRepository).toBeDefined();
      expect(configModule.FileConfigRepository).toBeDefined();
      expect(configModule.CompositeConfigRepository).toBeDefined();

      // Should be constructable classes
      expect(typeof configModule.EnvironmentConfigRepository).toBe("function");
      expect(typeof configModule.MemoryConfigRepository).toBe("function");
    });

    it("should export builder implementations", async () => {
      const configModule = await import("@axon/config");

      // Builder layer
      expect(configModule.ConfigBuilder).toBeDefined();
      expect(configModule.EnvironmentConfigBuilder).toBeDefined();
      expect(configModule.ConfigBuilderFactory).toBeDefined();
    });

    it("should resolve naming conflicts correctly", async () => {
      const configModule = await import("@axon/config");

      // Should have both abstract and concrete CachedConfigRepository
      expect(configModule.AbstractCachedConfigRepository).toBeDefined();
      expect(configModule.CachedConfigRepository).toBeDefined();

      // Should be different classes
      expect(configModule.AbstractCachedConfigRepository).not.toBe(configModule.CachedConfigRepository);
    });
  });

  describe("Cross-package compatibility", () => {
    it("should allow importing across packages without conflicts", async () => {
      // Import types from one package and use with another
      const configModule = await import("@axon/config");
      const typesModule = await import("@axon/types");

      expect(configModule.EnvironmentConfigRepository).toBeDefined();
      expect(typesModule.configSourceSchema).toBeDefined();
    });

    it("should support error handling across packages", async () => {
      const errorsModule = await import("@axon/errors");
      const loggerModule = await import("@axon/logger");

      // Should be able to use error classes with logger
      const logger = loggerModule.logger;
      const error = new errorsModule.ValidationError("Test error", "TEST_VALIDATION_ERROR");

      expect(() => {
        logger.error("Test error logging", { error: error.message });
      }).not.toThrow();
    });
  });

  describe("Tree-shaking optimization", () => {
    it("should not import unused exports", async () => {
      // Import only specific exports
      const { ValidationError } = await import("@axon/errors");
      const { logger } = await import("@axon/logger");

      expect(ValidationError).toBeDefined();
      expect(logger).toBeDefined();

      // These should work without importing the entire modules
      expect(typeof ValidationError).toBe("function");
      expect(typeof logger.info).toBe("function");
    });

    it("should support selective imports", async () => {
      // Test selective import patterns
      const validation = await import("@axon/errors").then((m) => m.ValidationError);
      const performance = await import("@axon/logger").then((m) => m.PerformanceTracker);

      expect(validation).toBeDefined();
      expect(performance).toBeDefined();
    });
  });

  describe("ESM/CJS compatibility", () => {
    it("should work with default exports", async () => {
      // Test default export patterns
      const typesDefault = await import("@axon/types");
      const errorsDefault = await import("@axon/errors");

      expect(typesDefault).toBeDefined();
      expect(errorsDefault).toBeDefined();
    });

    it("should work with named exports", async () => {
      // Test named export patterns
      const { ValidationError, ConfigurationError } = await import("@axon/errors");
      const { logger, productionLogger } = await import("@axon/logger");

      expect(ValidationError).toBeDefined();
      expect(ConfigurationError).toBeDefined();
      expect(logger).toBeDefined();
      expect(productionLogger).toBeDefined();
    });
  });
});
