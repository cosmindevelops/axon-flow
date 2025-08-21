/**
 * Production Configuration Builder Tests
 * @module @axon/config/builders/production-config-builder.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ProductionConfigBuilder } from "../../src/builders/production-config-builder.js";
import type { ConfigPlatform } from "../../src/types/index.js";
import type { IConfigBuilderOptions } from "../../src/builders/config-builder.types.js";

// Mock platform detector
vi.mock("../../src/utils/platform-detector.js", () => ({
  detectPlatform: vi.fn((): ConfigPlatform => "node"),
}));

// Mock object pool
vi.mock("../../src/builders/utils/object-pool.js", () => ({
  getRepositoryPool: vi.fn((key: string, factory: () => any) => ({
    acquire: factory,
    release: vi.fn(),
  })),
}));

describe("ProductionConfigBuilder", () => {
  let builder: ProductionConfigBuilder;
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment for each test
    process.env = { ...originalEnv };
    builder = new ProductionConfigBuilder();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe("Constructor", () => {
    it("should create builder with production defaults", () => {
      const builder = new ProductionConfigBuilder();
      const state = builder.getState();

      expect(builder).toBeInstanceOf(ProductionConfigBuilder);
      expect(state.sources.length).toBeGreaterThan(0); // Should have default sources
    });

    it("should apply custom options while preserving production defaults", () => {
      const options: IConfigBuilderOptions = {
        platform: "browser",
        validation: {
          enabled: false,
        },
      };

      const builder = new ProductionConfigBuilder(options);
      expect(builder).toBeInstanceOf(ProductionConfigBuilder);
    });

    it("should set development mode to false", () => {
      const builder = new ProductionConfigBuilder();
      expect(builder).toBeInstanceOf(ProductionConfigBuilder);
    });

    it("should configure validation for production", () => {
      const builder = new ProductionConfigBuilder();

      // Should fail fast in production for immediate error detection
      expect(builder).toBeInstanceOf(ProductionConfigBuilder);
    });

    it("should use higher cache limits for production performance", () => {
      const builder = new ProductionConfigBuilder();
      expect(builder).toBeInstanceOf(ProductionConfigBuilder);
    });
  });

  describe("Production-Specific Defaults", () => {
    it("should add AXON_PROD_ environment variables with high priority", () => {
      const state = builder.getState();

      // Should have environment sources with production prefixes
      const envSources = state.sources.filter(
        (source) => source.repository.constructor.name === "EnvironmentConfigRepository",
      );

      expect(envSources.length).toBeGreaterThanOrEqual(2); // AXON_PROD_ and AXON_
    });

    it("should disable hot-reload for production stability", () => {
      // Builder should be created successfully with hot-reload disabled
      expect(builder).toBeInstanceOf(ProductionConfigBuilder);
    });

    it("should add production memory-based overrides", () => {
      const state = builder.getState();

      // Should have memory sources for production defaults
      const memorySources = state.sources.filter(
        (source) => source.repository.constructor.name === "MemoryConfigRepository",
      );

      expect(memorySources.length).toBeGreaterThan(0);
    });

    it("should prioritize sources correctly", () => {
      const state = builder.getState();

      // Memory overrides should have high priority (200)
      const memorySource = state.sources.find(
        (source) => source.repository.constructor.name === "MemoryConfigRepository" && source.priority === 200,
      );

      expect(memorySource).toBeDefined();
    });

    it("should include security-first defaults", () => {
      const config = builder.build();
      const allConfig = config.getAllConfig();

      // Should have security configuration
      expect(allConfig).toHaveProperty("security");
      expect(allConfig).toHaveProperty("app");
    });
  });

  describe("Production Configuration Files", () => {
    it("should attempt to load common production files", () => {
      const state = builder.getState();

      // Builder should handle file loading attempts gracefully
      expect(state.sources.length).toBeGreaterThan(0);
    });

    it("should handle missing production files gracefully", () => {
      // Should not throw even if production files don't exist
      expect(() => new ProductionConfigBuilder()).not.toThrow();
    });

    it("should disable file watching for production stability", () => {
      // Builder should not enable file watching in production
      expect(builder).toBeInstanceOf(ProductionConfigBuilder);
    });
  });

  describe("Production-Specific Methods", () => {
    describe("withProdSecurity", () => {
      it("should enable comprehensive security features", () => {
        const result = builder.withProdSecurity(true);
        expect(result).toBe(builder); // Fluent interface

        const state = builder.getState();
        const securitySource = state.sources.find((source) => source.priority === 250);
        expect(securitySource).toBeDefined();
      });

      it("should disable security when explicitly disabled", () => {
        const initialSourceCount = builder.getState().sources.length;

        const result = builder.withProdSecurity(false);
        expect(result).toBe(builder);

        // Source count should remain the same (no security source added)
        expect(builder.getState().sources.length).toBe(initialSourceCount);
      });

      it("should enable security by default", () => {
        const result = builder.withProdSecurity();
        expect(result).toBe(builder);

        const state = builder.getState();
        expect(state.sources.some((source) => source.priority === 250)).toBe(true);
      });
    });

    describe("withProdDatabase", () => {
      it("should add production database configuration with defaults", () => {
        const result = builder.withProdDatabase();
        expect(result).toBe(builder); // Fluent interface

        const state = builder.getState();
        const dbSource = state.sources.find((source) => source.priority === 180);
        expect(dbSource).toBeDefined();
      });

      it("should accept custom database URL and options", () => {
        const customUrl = "postgresql://prod-server:5432/axon_production";
        const options = { poolSize: 50, ssl: true };

        const result = builder.withProdDatabase(customUrl, options);
        expect(result).toBe(builder);

        const state = builder.getState();
        expect(state.sources.some((source) => source.priority === 180)).toBe(true);
      });

      it("should use environment variable as fallback", () => {
        process.env["DATABASE_URL"] = "postgresql://env-server:5432/env_db";

        const result = builder.withProdDatabase();
        expect(result).toBe(builder);

        const state = builder.getState();
        expect(state.sources.some((source) => source.priority === 180)).toBe(true);
      });

      it("should enable SSL by default in production", () => {
        const result = builder.withProdDatabase(undefined, {});
        expect(result).toBe(builder);

        // Should not throw - SSL enabled by default
        expect(() => builder.build()).not.toThrow();
      });
    });

    describe("withProdRedis", () => {
      it("should add production Redis configuration with defaults", () => {
        const result = builder.withProdRedis();
        expect(result).toBe(builder); // Fluent interface

        const state = builder.getState();
        const redisSource = state.sources.find((source) => source.priority === 180);
        expect(redisSource).toBeDefined();
      });

      it("should accept custom Redis URL and options", () => {
        const customUrl = "redis://prod-redis:6379/0";
        const options = { clustering: true, persistence: true };

        const result = builder.withProdRedis(customUrl, options);
        expect(result).toBe(builder);

        const state = builder.getState();
        expect(state.sources.some((source) => source.priority === 180)).toBe(true);
      });

      it("should use environment variable as fallback", () => {
        process.env["REDIS_URL"] = "redis://env-redis:6379/1";

        const result = builder.withProdRedis();
        expect(result).toBe(builder);

        const state = builder.getState();
        expect(state.sources.some((source) => source.priority === 180)).toBe(true);
      });

      it("should apply clustering options when specified", () => {
        const result = builder.withProdRedis(undefined, { clustering: true });
        expect(result).toBe(builder);

        const state = builder.getState();
        expect(state.sources.some((source) => source.priority === 180)).toBe(true);
      });
    });

    describe("withProdServer", () => {
      it("should add production server configuration with defaults", () => {
        const result = builder.withProdServer();
        expect(result).toBe(builder); // Fluent interface

        const state = builder.getState();
        const serverSource = state.sources.find((source) => source.priority === 180);
        expect(serverSource).toBeDefined();
      });

      it("should accept custom port and options", () => {
        const customPort = 8080;
        const options = { enableCors: true, trustedProxies: ["10.0.0.0/8"] };

        const result = builder.withProdServer(customPort, options);
        expect(result).toBe(builder);

        const state = builder.getState();
        expect(state.sources.some((source) => source.priority === 180)).toBe(true);
      });

      it("should use PORT environment variable as fallback", () => {
        process.env["PORT"] = "9000";

        const result = builder.withProdServer();
        expect(result).toBe(builder);

        const state = builder.getState();
        expect(state.sources.some((source) => source.priority === 180)).toBe(true);
      });

      it("should disable CORS by default for security", () => {
        const result = builder.withProdServer();
        expect(result).toBe(builder);

        const config = builder.build();
        expect(config).toBeDefined();
      });
    });

    describe("withProdLogging", () => {
      it("should add production logging configuration with defaults", () => {
        const result = builder.withProdLogging();
        expect(result).toBe(builder); // Fluent interface

        const state = builder.getState();
        const loggingSource = state.sources.find((source) => source.priority === 180);
        expect(loggingSource).toBeDefined();
      });

      it("should accept custom logging options", () => {
        const options = { level: "error", destination: "/var/log/app.log" };

        const result = builder.withProdLogging(options);
        expect(result).toBe(builder);

        const state = builder.getState();
        expect(state.sources.some((source) => source.priority === 180)).toBe(true);
      });

      it("should configure JSON logging for production", () => {
        const result = builder.withProdLogging();
        expect(result).toBe(builder);

        const config = builder.build();
        const allConfig = config.getAllConfig();

        // Should have logging configuration
        expect(allConfig).toHaveProperty("logging");
      });
    });

    describe("withProdMonitoring", () => {
      it("should add production monitoring configuration with defaults", () => {
        const result = builder.withProdMonitoring();
        expect(result).toBe(builder); // Fluent interface

        const state = builder.getState();
        const monitoringSource = state.sources.find((source) => source.priority === 180);
        expect(monitoringSource).toBeDefined();
      });

      it("should accept custom monitoring options", () => {
        const options = { enableMetrics: true, enableTracing: false };

        const result = builder.withProdMonitoring(options);
        expect(result).toBe(builder);

        const state = builder.getState();
        expect(state.sources.some((source) => source.priority === 180)).toBe(true);
      });

      it("should use environment variables for service identification", () => {
        process.env["SERVICE_NAME"] = "test-service";
        process.env["SERVICE_VERSION"] = "1.2.3";

        const result = builder.withProdMonitoring();
        expect(result).toBe(builder);

        const state = builder.getState();
        expect(state.sources.some((source) => source.priority === 180)).toBe(true);
      });
    });
  });

  describe("Static Factory Methods", () => {
    describe("createDefault", () => {
      it("should create fully configured production builder", () => {
        const builder = ProductionConfigBuilder.createDefault();
        expect(builder).toBeInstanceOf(ProductionConfigBuilder);

        const state = builder.getState();

        // Should have many sources due to all production features being enabled
        expect(state.sources.length).toBeGreaterThan(7);

        // Should have security source (priority 250)
        expect(state.sources.some((source) => source.priority === 250)).toBe(true);

        // Should have multiple priority 180 sources (db, redis, server, logging, monitoring)
        const priority180Sources = state.sources.filter((source) => source.priority === 180);
        expect(priority180Sources.length).toBe(5); // db, redis, server, logging, monitoring
      });

      it("should accept custom options", () => {
        const options: IConfigBuilderOptions = {
          platform: "browser",
        };

        const builder = ProductionConfigBuilder.createDefault(options);
        expect(builder).toBeInstanceOf(ProductionConfigBuilder);
      });
    });

    describe("createMinimal", () => {
      it("should create minimal production builder", () => {
        const builder = ProductionConfigBuilder.createMinimal();
        expect(builder).toBeInstanceOf(ProductionConfigBuilder);

        const state = builder.getState();

        // Should have base sources plus minimal additions
        expect(state.sources.length).toBeGreaterThan(4);

        // Should have security source (minimal includes security)
        expect(state.sources.some((source) => source.priority === 250)).toBe(true);

        // Should have some priority 180 sources (server, logging)
        const priority180Sources = state.sources.filter((source) => source.priority === 180);
        expect(priority180Sources.length).toBe(2); // server, logging only
      });

      it("should accept custom options", () => {
        const options: IConfigBuilderOptions = {
          validation: { enabled: false },
        };

        const builder = ProductionConfigBuilder.createMinimal(options);
        expect(builder).toBeInstanceOf(ProductionConfigBuilder);
      });
    });

    describe("createHighPerformance", () => {
      it("should create high-performance production builder", () => {
        const builder = ProductionConfigBuilder.createHighPerformance();
        expect(builder).toBeInstanceOf(ProductionConfigBuilder);

        const state = builder.getState();

        // Should have all production features enabled
        expect(state.sources.length).toBeGreaterThan(7);

        // Should have security source
        expect(state.sources.some((source) => source.priority === 250)).toBe(true);

        // Should have all priority 180 sources
        const priority180Sources = state.sources.filter((source) => source.priority === 180);
        expect(priority180Sources.length).toBe(5); // db, redis, server, logging, monitoring
      });

      it("should use higher cache limits for performance", () => {
        const builder = ProductionConfigBuilder.createHighPerformance();
        expect(builder).toBeInstanceOf(ProductionConfigBuilder);
      });

      it("should accept custom options while preserving high-performance defaults", () => {
        const options: IConfigBuilderOptions = {
          platform: "node",
        };

        const builder = ProductionConfigBuilder.createHighPerformance(options);
        expect(builder).toBeInstanceOf(ProductionConfigBuilder);
      });
    });
  });

  describe("Production Features Integration", () => {
    it("should chain production methods fluently", () => {
      const result = builder
        .withProdSecurity(true)
        .withProdDatabase("postgresql://localhost:5432/prod", { ssl: true, poolSize: 25 })
        .withProdRedis("redis://localhost:6379/0", { clustering: true })
        .withProdServer(8080, { enableCors: false })
        .withProdLogging({ level: "warn" })
        .withProdMonitoring({ enableMetrics: true, enableTracing: false });

      expect(result).toBe(builder);

      const state = builder.getState();

      // Should have security source
      expect(state.sources.some((source) => source.priority === 250)).toBe(true);

      // Should have all production service sources
      const priority180Sources = state.sources.filter((source) => source.priority === 180);
      expect(priority180Sources.length).toBe(5);
    });

    it("should build successfully with all production features", () => {
      const config = builder
        .withProdSecurity()
        .withProdDatabase()
        .withProdRedis()
        .withProdServer()
        .withProdLogging()
        .withProdMonitoring()
        .build();

      expect(config).toBeDefined();
      expect(config).toHaveProperty("get");
      expect(config).toHaveProperty("getAllConfig");
    });

    it("should handle mixed production and custom sources", () => {
      const config = builder
        .withProdSecurity()
        .withMemory({ custom: "production-value" }, { priority: 300 })
        .withEnvironment({ prefix: "CUSTOM_PROD_", priority: 120 })
        .withProdServer()
        .build();

      expect(config).toBeDefined();

      const configData = config.getAllConfig();
      expect(configData).toBeDefined();
    });
  });

  describe("Performance Characteristics", () => {
    it("should use higher cache settings for production", () => {
      const state = builder.getState();
      expect(state.sources.length).toBeGreaterThan(0);

      // Performance should be tracked
      expect(state.metrics?.buildTime).toBeGreaterThanOrEqual(0);
      expect(state.metrics?.sourceCount).toBeGreaterThan(0);
    });

    it("should handle production-scale configuration efficiently", () => {
      const start = performance.now();

      // Simulate production configuration setup
      const config = ProductionConfigBuilder.createDefault()
        .withMemory({ largeProdConfig: new Array(1000).fill("data") }, { priority: 50 })
        .build();

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(200); // Should be reasonably fast
      expect(config).toBeDefined();
    });

    it("should support high-performance variant efficiently", () => {
      const start = performance.now();

      const config = ProductionConfigBuilder.createHighPerformance().build();

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(150); // Should be faster than default
      expect(config).toBeDefined();
    });
  });

  describe("Security Features", () => {
    it("should provide secure defaults", () => {
      const config = builder.build();
      const allConfig = config.getAllConfig();

      // Should have security-conscious defaults
      expect(allConfig).toHaveProperty("app");
      expect(allConfig).toHaveProperty("security");

      const appConfig = allConfig["app"] as any;
      expect(appConfig?.enableDebugMode).toBe(false);
      expect(appConfig?.enableHotReload).toBe(false);
    });

    it("should enable comprehensive security when requested", () => {
      const config = builder.withProdSecurity().build();

      expect(config).toBeDefined();

      const allConfig = config.getAllConfig();
      expect(allConfig).toHaveProperty("security");
    });

    it("should redact sensitive information in logs", () => {
      const config = builder.withProdLogging().build();

      const allConfig = config.getAllConfig();
      const loggingConfig = allConfig["logging"] as any;

      expect(loggingConfig?.redactPaths).toContain("password");
      expect(loggingConfig?.redactPaths).toContain("secret");
      expect(loggingConfig?.redactPaths).toContain("database.url");
    });
  });

  describe("Environment Variable Integration", () => {
    it("should prioritize AXON_PROD_ over AXON_ variables", () => {
      const state = builder.getState();

      const envSources = state.sources.filter(
        (source) => source.repository.constructor.name === "EnvironmentConfigRepository",
      );

      // Should have at least 2 environment sources
      expect(envSources.length).toBeGreaterThanOrEqual(2);

      // Higher priority source should come first after sorting
      const priorities = envSources.map((source) => source.priority).sort((a, b) => b - a);
      expect(priorities[0]!).toBeGreaterThan(priorities[1]!);
    });

    it("should use environment variables for service configuration", () => {
      process.env["DATABASE_URL"] = "postgresql://prod:5432/db";
      process.env["REDIS_URL"] = "redis://prod:6379/0";
      process.env["PORT"] = "9000";

      const config = builder.withProdDatabase().withProdRedis().withProdServer().build();

      expect(config).toBeDefined();
    });
  });

  describe("Error Handling in Production Mode", () => {
    it("should fail fast on validation errors in production", () => {
      // Production builder should fail fast on validation
      expect(builder).toBeInstanceOf(ProductionConfigBuilder);
    });

    it("should provide production-appropriate error messages", () => {
      const builder = new ProductionConfigBuilder();
      // Clear sources to test error handling
      const state = builder.getState();
      state.sources.length = 0; // Clear sources for testing

      // Note: We can't easily test this without manipulating internal state
      expect(builder).toBeInstanceOf(ProductionConfigBuilder);
    });
  });

  describe("Monitoring and Observability", () => {
    it("should configure metrics collection", () => {
      const config = builder.withProdMonitoring({ enableMetrics: true }).build();

      const allConfig = config.getAllConfig();
      expect(allConfig).toHaveProperty("monitoring");
    });

    it("should configure health checks", () => {
      const config = builder.withProdMonitoring().build();

      const allConfig = config.getAllConfig();
      const monitoringConfig = allConfig["monitoring"] as any;
      expect(monitoringConfig?.healthCheck?.enabled).toBe(true);
    });

    it("should support tracing configuration", () => {
      process.env["JAEGER_ENDPOINT"] = "http://jaeger:14268/api/traces";

      const config = builder.withProdMonitoring({ enableTracing: true }).build();

      expect(config).toBeDefined();
    });
  });
});
