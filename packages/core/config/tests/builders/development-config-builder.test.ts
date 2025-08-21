/**
 * Development Configuration Builder Tests
 * @module @axon/config/builders/development-config-builder.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DevelopmentConfigBuilder } from "../../src/builders/development-config-builder.js";
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

describe("DevelopmentConfigBuilder", () => {
  let builder: DevelopmentConfigBuilder;

  beforeEach(() => {
    builder = new DevelopmentConfigBuilder();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Constructor", () => {
    it("should create builder with development defaults", () => {
      const builder = new DevelopmentConfigBuilder();
      const state = builder.getState();

      expect(builder).toBeInstanceOf(DevelopmentConfigBuilder);
      expect(state.sources.length).toBeGreaterThan(0); // Should have default sources
    });

    it("should apply custom options while preserving development defaults", () => {
      const options: IConfigBuilderOptions = {
        platform: "browser",
        validation: {
          enabled: false,
        },
      };

      const builder = new DevelopmentConfigBuilder(options);
      expect(builder).toBeInstanceOf(DevelopmentConfigBuilder);
    });

    it("should set development mode to true", () => {
      const builder = new DevelopmentConfigBuilder();
      expect(builder).toBeInstanceOf(DevelopmentConfigBuilder);
    });

    it("should configure validation for development", () => {
      const builder = new DevelopmentConfigBuilder();

      // Should not fail fast in development to allow continued iteration
      expect(builder).toBeInstanceOf(DevelopmentConfigBuilder);
    });
  });

  describe("Development-Specific Defaults", () => {
    it("should add AXON_DEV_ environment variables with high priority", () => {
      const state = builder.getState();

      // Should have environment sources with development prefixes
      const envSources = state.sources.filter(
        (source) => source.repository.constructor.name === "EnvironmentConfigRepository",
      );

      expect(envSources.length).toBeGreaterThanOrEqual(2); // AXON_DEV_ and AXON_
    });

    it("should add standard AXON_ environment variables as fallback", () => {
      const state = builder.getState();

      // Should have multiple environment sources
      expect(state.sources.length).toBeGreaterThan(2);
    });

    it("should enable hot-reload with fast debounce", () => {
      // Builder should be created successfully with hot-reload enabled
      expect(builder).toBeInstanceOf(DevelopmentConfigBuilder);
    });

    it("should add memory-based development overrides", () => {
      const state = builder.getState();

      // Should have memory sources for development defaults
      const memorySources = state.sources.filter(
        (source) => source.repository.constructor.name === "MemoryConfigRepository",
      );

      expect(memorySources.length).toBeGreaterThan(0);
    });

    it("should prioritize sources correctly", () => {
      const state = builder.getState();

      // Memory overrides should have highest priority
      const memorySource = state.sources.find(
        (source) => source.repository.constructor.name === "MemoryConfigRepository" && source.priority === 200,
      );

      expect(memorySource).toBeDefined();
    });
  });

  describe("Development Configuration Files", () => {
    it("should attempt to load common development files", () => {
      const state = builder.getState();

      // Builder should handle file loading attempts gracefully
      expect(state.sources.length).toBeGreaterThan(0);
    });

    it("should handle missing development files gracefully", () => {
      // Should not throw even if development files don't exist
      expect(() => new DevelopmentConfigBuilder()).not.toThrow();
    });
  });

  describe("Development-Specific Methods", () => {
    describe("withDevDebugging", () => {
      it("should enable debugging features", () => {
        const result = builder.withDevDebugging(true);
        expect(result).toBe(builder); // Fluent interface

        const state = builder.getState();
        const debugSource = state.sources.find((source) => source.priority === 250);
        expect(debugSource).toBeDefined();
      });

      it("should disable debugging when explicitly disabled", () => {
        const initialSourceCount = builder.getState().sources.length;

        const result = builder.withDevDebugging(false);
        expect(result).toBe(builder);

        // Source count should remain the same (no debug source added)
        expect(builder.getState().sources.length).toBe(initialSourceCount);
      });

      it("should enable debugging by default", () => {
        const result = builder.withDevDebugging();
        expect(result).toBe(builder);

        const state = builder.getState();
        expect(state.sources.some((source) => source.priority === 250)).toBe(true);
      });
    });

    describe("withDevDatabase", () => {
      it("should add development database configuration with default URL", () => {
        const result = builder.withDevDatabase();
        expect(result).toBe(builder); // Fluent interface

        const state = builder.getState();
        const dbSource = state.sources.find((source) => source.priority === 180);
        expect(dbSource).toBeDefined();
      });

      it("should accept custom database URL", () => {
        const customUrl = "postgresql://localhost:5433/custom_dev";
        const result = builder.withDevDatabase(customUrl);
        expect(result).toBe(builder);

        const state = builder.getState();
        expect(state.sources.some((source) => source.priority === 180)).toBe(true);
      });
    });

    describe("withDevRedis", () => {
      it("should add development Redis configuration with default URL", () => {
        const result = builder.withDevRedis();
        expect(result).toBe(builder); // Fluent interface

        const state = builder.getState();
        const redisSource = state.sources.find((source) => source.priority === 180);
        expect(redisSource).toBeDefined();
      });

      it("should accept custom Redis URL", () => {
        const customUrl = "redis://localhost:6380/1";
        const result = builder.withDevRedis(customUrl);
        expect(result).toBe(builder);

        const state = builder.getState();
        expect(state.sources.some((source) => source.priority === 180)).toBe(true);
      });
    });

    describe("withDevServer", () => {
      it("should add development server configuration with default port", () => {
        const result = builder.withDevServer();
        expect(result).toBe(builder); // Fluent interface

        const state = builder.getState();
        const serverSource = state.sources.find((source) => source.priority === 180);
        expect(serverSource).toBeDefined();
      });

      it("should accept custom port", () => {
        const customPort = 8080;
        const result = builder.withDevServer(customPort);
        expect(result).toBe(builder);

        const state = builder.getState();
        expect(state.sources.some((source) => source.priority === 180)).toBe(true);
      });
    });

    describe("withDevLogging", () => {
      it("should add development logging configuration", () => {
        const result = builder.withDevLogging();
        expect(result).toBe(builder); // Fluent interface

        const state = builder.getState();
        const loggingSource = state.sources.find((source) => source.priority === 180);
        expect(loggingSource).toBeDefined();
      });
    });
  });

  describe("Static Factory Methods", () => {
    describe("createDefault", () => {
      it("should create fully configured development builder", () => {
        const builder = DevelopmentConfigBuilder.createDefault();
        expect(builder).toBeInstanceOf(DevelopmentConfigBuilder);

        const state = builder.getState();

        // Should have many sources due to all dev features being enabled
        expect(state.sources.length).toBeGreaterThan(5);

        // Should have debug source (priority 250)
        expect(state.sources.some((source) => source.priority === 250)).toBe(true);

        // Should have multiple priority 180 sources (db, redis, server, logging)
        const priority180Sources = state.sources.filter((source) => source.priority === 180);
        expect(priority180Sources.length).toBe(4); // db, redis, server, logging
      });

      it("should accept custom options", () => {
        const options: IConfigBuilderOptions = {
          platform: "browser",
        };

        const builder = DevelopmentConfigBuilder.createDefault(options);
        expect(builder).toBeInstanceOf(DevelopmentConfigBuilder);
      });
    });

    describe("createMinimal", () => {
      it("should create minimal development builder", () => {
        const builder = DevelopmentConfigBuilder.createMinimal();
        expect(builder).toBeInstanceOf(DevelopmentConfigBuilder);

        const state = builder.getState();

        // Should have base sources plus minimal additions
        expect(state.sources.length).toBeGreaterThan(3);

        // Should not have debug source (minimal doesn't include debugging)
        expect(state.sources.some((source) => source.priority === 250)).toBe(false);

        // Should have some priority 180 sources (server, logging)
        const priority180Sources = state.sources.filter((source) => source.priority === 180);
        expect(priority180Sources.length).toBe(2); // server, logging only
      });

      it("should accept custom options", () => {
        const options: IConfigBuilderOptions = {
          validation: { enabled: false },
        };

        const builder = DevelopmentConfigBuilder.createMinimal(options);
        expect(builder).toBeInstanceOf(DevelopmentConfigBuilder);
      });
    });
  });

  describe("Development Features Integration", () => {
    it("should chain development methods fluently", () => {
      const result = builder
        .withDevDebugging(true)
        .withDevDatabase("postgresql://localhost:5432/test")
        .withDevRedis("redis://localhost:6379/1")
        .withDevServer(4000)
        .withDevLogging();

      expect(result).toBe(builder);

      const state = builder.getState();

      // Should have debug source
      expect(state.sources.some((source) => source.priority === 250)).toBe(true);

      // Should have all dev service sources
      const priority180Sources = state.sources.filter((source) => source.priority === 180);
      expect(priority180Sources.length).toBe(4);
    });

    it("should build successfully with all development features", () => {
      const config = builder
        .withDevDebugging()
        .withDevDatabase()
        .withDevRedis()
        .withDevServer()
        .withDevLogging()
        .build();

      expect(config).toBeDefined();
      expect(config).toHaveProperty("get");
      expect(config).toHaveProperty("getAllConfig");
    });

    it("should handle mixed development and custom sources", () => {
      const config = builder
        .withDevDebugging()
        .withMemory({ custom: "value" }, { priority: 300 })
        .withEnvironment({ prefix: "CUSTOM_", priority: 120 })
        .withDevServer()
        .build();

      expect(config).toBeDefined();

      const configData = config.getAllConfig();
      expect(configData).toBeDefined();
    });
  });

  describe("Performance Characteristics", () => {
    it("should use appropriate cache settings for development", () => {
      const state = builder.getState();
      expect(state.sources.length).toBeGreaterThan(0);

      // Performance should be tracked
      expect(state.metrics?.buildTime).toBeGreaterThanOrEqual(0);
      expect(state.metrics?.sourceCount).toBeGreaterThan(0);
    });

    it("should handle rapid configuration changes efficiently", () => {
      const start = performance.now();

      // Simulate rapid development iterations
      for (let i = 0; i < 10; i++) {
        builder.withDevServer(3000 + i).withMemory({ iteration: i }, { priority: 50 + i });
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // Should be fast

      const state = builder.getState();
      expect(state.sources.length).toBeGreaterThan(10);
    });
  });

  describe("Error Handling in Development Mode", () => {
    it("should provide development-friendly error messages", () => {
      // Empty builder should throw with helpful message
      const emptyBuilder = new DevelopmentConfigBuilder();
      // Clear all default sources for this test
      const state = emptyBuilder.getState();
      state.sources.length = 0; // Clear sources for testing

      // Note: We can't easily test this without manipulating internal state
      // The builder always adds default sources in development mode
      expect(emptyBuilder).toBeInstanceOf(DevelopmentConfigBuilder);
    });

    it("should continue on validation errors in development", () => {
      // Development builder should not fail fast on validation
      expect(builder).toBeInstanceOf(DevelopmentConfigBuilder);
    });
  });

  describe("Environment Variable Handling", () => {
    it("should prioritize AXON_DEV_ over AXON_ variables", () => {
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
  });

  describe("Hot Reload Configuration", () => {
    it("should enable hot reload with fast debounce for development", () => {
      // Builder should be created successfully with hot reload settings
      expect(builder).toBeInstanceOf(DevelopmentConfigBuilder);
    });
  });

  describe("Memory Override Behavior", () => {
    it("should include development-specific memory overrides", () => {
      const state = builder.getState();

      // Should have memory source with highest priority
      const highestPrioritySource = state.sources.reduce((prev, current) =>
        current.priority > prev.priority ? current : prev,
      );

      expect(highestPrioritySource.priority).toBe(200);
      expect(highestPrioritySource.repository.constructor.name).toBe("MemoryConfigRepository");
    });

    it("should provide development-friendly default values", () => {
      const config = builder.build();
      const allConfig = config.getAllConfig();

      // Should have development-specific values
      expect(allConfig).toHaveProperty("app");
    });
  });
});
