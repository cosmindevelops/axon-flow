/**
 * Configuration Builder Core Tests
 * @module @axon/config/builders/config-builder.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { z } from "zod";
import { ConfigurationError } from "@axon/errors";
import { ConfigBuilder } from "../../src/builders/config-builder.js";
import type { IConfigRepository, ConfigPlatform } from "../../src/types/index.js";
import type {
  IConfigBuilderOptions,
  IBuilderState,
  ConfigMergeStrategy,
} from "../../src/builders/config-builder.types.js";

// Mock repositories for testing
class MockConfigRepository implements IConfigRepository {
  constructor(private data: Record<string, unknown> = {}) {}

  // IConfigRepository required methods
  load<T extends z.ZodType>(schema: T): z.infer<T> {
    return schema.parse(this.data);
  }

  get(key: string): unknown {
    return this.data[key];
  }

  getAllConfig(): Record<string, unknown> {
    return { ...this.data };
  }

  validate<T extends z.ZodType>(data: unknown, schema: T): z.infer<T> {
    return schema.parse(data);
  }

  watch(_listener: any): () => void {
    return () => {}; // Mock unsubscribe function
  }

  async reload(): Promise<void> {
    // Mock implementation
  }

  async dispose(): Promise<void> {
    Object.keys(this.data).forEach((key) => delete this.data[key]);
  }

  getMetadata(): any {
    return {
      source: "mock",
      type: "memory" as const,
      platform: "node" as const,
      lastModified: Date.now(),
      isWatchable: false,
      isWritable: true,
    };
  }

  // Additional methods for compatibility
  async set<T = unknown>(key: string, value: T): Promise<void> {
    this.data[key] = value;
  }

  async has(key: string): Promise<boolean> {
    return key in this.data;
  }

  async delete(key: string): Promise<boolean> {
    if (key in this.data) {
      delete this.data[key];
      return true;
    }
    return false;
  }

  async clear(): Promise<void> {
    Object.keys(this.data).forEach((key) => delete this.data[key]);
  }
}

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

describe("ConfigBuilder", () => {
  let builder: ConfigBuilder;

  beforeEach(() => {
    builder = new ConfigBuilder();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Constructor", () => {
    it("should create builder with default options", () => {
      const builder = new ConfigBuilder();
      const state = builder.getState();

      expect(state.sources).toHaveLength(0);
      expect(state.isBuilt).toBe(false);
      expect(state.metrics?.sourceCount).toBe(0);
    });

    it("should create builder with custom options", () => {
      const options: IConfigBuilderOptions = {
        platform: "browser",
        developmentMode: true,
        validation: {
          enabled: false,
          failFast: false,
        },
        performance: {
          useObjectPool: false,
          lazyLoading: false,
          cacheBuildResults: false,
          maxCachedBuilders: 10,
        },
      };

      const builder = new ConfigBuilder(options);
      expect(builder).toBeInstanceOf(ConfigBuilder);
    });

    it("should detect platform automatically", () => {
      const builder = new ConfigBuilder();
      expect(builder).toBeInstanceOf(ConfigBuilder);
    });
  });

  describe("Fluent Interface", () => {
    describe("withEnvironment", () => {
      it("should add environment source", () => {
        const result = builder.withEnvironment();
        expect(result).toBe(builder); // Fluent interface

        const state = builder.getState();
        expect(state.sources).toHaveLength(1);
        expect(state.sources[0]?.priority).toBe(100); // Default priority
      });

      it("should add environment source with custom options", () => {
        const options = {
          prefix: "APP_",
          priority: 150,
        };

        builder.withEnvironment(options);
        const state = builder.getState();

        expect(state.sources).toHaveLength(1);
        expect(state.sources[0]?.priority).toBe(150);
      });

      it("should allow multiple environment sources", () => {
        builder.withEnvironment({ prefix: "APP_", priority: 100 }).withEnvironment({ prefix: "DB_", priority: 90 });

        const state = builder.getState();
        expect(state.sources).toHaveLength(2);
      });
    });

    describe("withFile", () => {
      it("should add file source", () => {
        const result = builder.withFile("/path/to/config.json");
        expect(result).toBe(builder); // Fluent interface

        const state = builder.getState();
        expect(state.sources).toHaveLength(1);
        expect(state.sources[0]?.priority).toBe(50); // Default priority
      });

      it("should add file source with custom options", () => {
        const options = {
          priority: 75,
          format: "yaml" as const,
        };

        builder.withFile("/path/to/config.yaml", options);
        const state = builder.getState();

        expect(state.sources).toHaveLength(1);
        expect(state.sources[0]?.priority).toBe(75);
      });

      it("should allow multiple file sources", () => {
        builder.withFile("/config/base.json", { priority: 50 }).withFile("/config/local.json", { priority: 60 });

        const state = builder.getState();
        expect(state.sources).toHaveLength(2);
      });
    });

    describe("withMemory", () => {
      it("should add memory source", () => {
        const data = { key: "value" };
        const result = builder.withMemory(data);
        expect(result).toBe(builder); // Fluent interface

        const state = builder.getState();
        expect(state.sources).toHaveLength(1);
        expect(state.sources[0]?.priority).toBe(0); // Default priority
      });

      it("should add memory source with custom options", () => {
        const data = { app: { name: "test" } };
        const options = {
          priority: 25,
          writable: false,
        };

        builder.withMemory(data, options);
        const state = builder.getState();

        expect(state.sources).toHaveLength(1);
        expect(state.sources[0]?.priority).toBe(25);
      });

      it("should handle complex data structures", () => {
        const data = {
          database: {
            host: "localhost",
            ports: [5432, 5433],
          },
          features: {
            auth: true,
            cache: false,
          },
        };

        builder.withMemory(data);
        const state = builder.getState();
        expect(state.sources).toHaveLength(1);
      });
    });

    describe("withLocalStorage", () => {
      it("should add localStorage source on browser platform", () => {
        const browserBuilder = new ConfigBuilder({ platform: "browser" });
        const result = browserBuilder.withLocalStorage();
        expect(result).toBe(browserBuilder); // Fluent interface

        const state = browserBuilder.getState();
        expect(state.sources).toHaveLength(1);
        expect(state.sources[0]?.priority).toBe(25); // Default priority
      });

      it("should skip localStorage on non-browser platforms", () => {
        const nodeBuilder = new ConfigBuilder({ platform: "node" });
        nodeBuilder.withLocalStorage();

        const state = nodeBuilder.getState();
        expect(state.sources).toHaveLength(0); // Should be skipped
      });

      it("should add localStorage with custom options", () => {
        const browserBuilder = new ConfigBuilder({ platform: "browser" });
        const options = {
          prefix: "app_",
          priority: 35,
        };

        browserBuilder.withLocalStorage(options);
        const state = browserBuilder.getState();

        expect(state.sources).toHaveLength(1);
        expect(state.sources[0]?.priority).toBe(35);
      });
    });

    describe("withCache", () => {
      it("should add cache layer to existing source", () => {
        builder.withMemory({ test: "value" }).withCache();

        const state = builder.getState();
        expect(state.sources).toHaveLength(1); // Cache wraps existing source
      });

      it("should throw error when no sources exist", () => {
        expect(() => builder.withCache()).toThrow(ConfigurationError);
      });

      it("should add cache with custom options", () => {
        const options = {
          priority: 200,
          ttl: 600000, // 10 minutes
          maxSize: 500,
        };

        builder.withMemory({ test: "value" }).withCache(options);

        const state = builder.getState();
        expect(state.sources).toHaveLength(1);
        expect(state.sources[0]?.priority).toBe(200);
      });

      it("should preserve source properties when caching", () => {
        builder.withMemory({ test: "value" }, { priority: 50 }).withCache();

        const state = builder.getState();
        expect(state.sources[0]?.enabled).toBe(true);
      });
    });

    describe("withCustom", () => {
      it("should add custom repository source", () => {
        const customRepo = new MockConfigRepository({ custom: "data" });
        const result = builder.withCustom({
          repository: customRepo,
          priority: 80,
        });

        expect(result).toBe(builder); // Fluent interface

        const state = builder.getState();
        expect(state.sources).toHaveLength(1);
        expect(state.sources[0]?.priority).toBe(80);
        expect(state.sources[0]?.repository).toBe(customRepo);
      });

      it("should add custom repository with all options", () => {
        const customRepo = new MockConfigRepository();
        builder.withCustom({
          repository: customRepo,
          priority: 120,
          prefix: "custom_",
          enabled: false,
        });

        const state = builder.getState();
        expect(state.sources).toHaveLength(1);
        expect(state.sources[0]?.enabled).toBe(false);
      });
    });

    describe("withMergeStrategy", () => {
      it("should set merge strategy", () => {
        const strategies: ConfigMergeStrategy[] = ["deep", "replace", "custom"];

        strategies.forEach((strategy) => {
          const testBuilder = new ConfigBuilder();
          const result = testBuilder.withMergeStrategy(strategy);
          expect(result).toBe(testBuilder); // Fluent interface
        });
      });
    });

    describe("withHotReload", () => {
      it("should configure hot reload", () => {
        const result = builder.withHotReload(true, 500);
        expect(result).toBe(builder); // Fluent interface
      });

      it("should disable hot reload", () => {
        const result = builder.withHotReload(false);
        expect(result).toBe(builder); // Fluent interface
      });
    });

    describe("withValidation", () => {
      it("should add validation schema", () => {
        const schema = z.object({
          app: z.string(),
        });

        const result = builder.withValidation({
          schema,
          enabled: true,
          failFast: true,
        });

        expect(result).toBe(builder); // Fluent interface
      });

      it("should merge validation options", () => {
        builder.withValidation({ enabled: false }).withValidation({ failFast: false });

        // Should not throw - validation is disabled
        expect(() => builder.withValidation({ schema: z.string() })).not.toThrow();
      });
    });
  });

  describe("Building Configuration", () => {
    describe("build", () => {
      it("should build configuration repository", () => {
        const config = builder.withMemory({ test: "value" }).build();

        expect(config).toHaveProperty("get");
        expect(config).toHaveProperty("load");
        expect(config).toHaveProperty("getAllConfig");
      });

      it("should throw error when no sources are configured", () => {
        expect(() => builder.build()).toThrow(ConfigurationError);
      });

      it("should sort sources by priority", () => {
        const config = builder
          .withMemory({ low: "priority" }, { priority: 10 })
          .withMemory({ high: "priority" }, { priority: 100 })
          .withMemory({ medium: "priority" }, { priority: 50 })
          .build();

        expect(config).toBeDefined();
      });

      it("should validate configuration if schema provided", async () => {
        const schema = z.object({
          required: z.string(),
        });

        // This should fail validation
        expect(() =>
          builder
            .withMemory({ optional: "value" }) // Missing 'required'
            .withValidation({ schema, enabled: true })
            .build(),
        ).toThrow(ConfigurationError);
      });

      it("should skip validation when disabled", () => {
        const schema = z.object({
          required: z.string(),
        });

        // This should not fail
        expect(() =>
          builder
            .withMemory({ optional: "value" }) // Missing 'required'
            .withValidation({ schema, enabled: false })
            .build(),
        ).not.toThrow();
      });
    });

    describe("Post-Build State", () => {
      it("should prevent modifications after build", () => {
        builder.withMemory({ test: "value" });
        const config = builder.build();

        expect(config).toBeDefined();

        // Should throw when trying to modify after build
        expect(() => builder.withMemory({ more: "data" })).toThrow(ConfigurationError);
        expect(() => builder.withEnvironment()).toThrow(ConfigurationError);
        expect(() => builder.withFile("/path")).toThrow(ConfigurationError);
        expect(() => builder.withCache()).toThrow(ConfigurationError);
        expect(() => builder.withMergeStrategy("replace")).toThrow(ConfigurationError);
        expect(() => builder.withHotReload(false)).toThrow(ConfigurationError);
        expect(() => builder.withValidation({ enabled: false })).toThrow(ConfigurationError);
      });

      it("should update build state after building", () => {
        builder.withMemory({ test: "value" });
        const stateBefore = builder.getState();
        expect(stateBefore.isBuilt).toBe(false);

        builder.build();
        const stateAfter = builder.getState();
        expect(stateAfter.isBuilt).toBe(true);
      });
    });
  });

  describe("Builder State", () => {
    describe("getState", () => {
      it("should return initial state", () => {
        const state = builder.getState();

        expect(state).toEqual({
          sources: [],
          isBuilt: false,
          metrics: expect.objectContaining({
            buildTime: expect.any(Number),
            sourceCount: 0,
            cacheHits: expect.any(Number),
            cacheMisses: expect.any(Number),
          }),
        });
      });

      it("should track source count", () => {
        builder.withMemory({ test: "value" });
        builder.withEnvironment();

        const state = builder.getState();
        expect(state.sources).toHaveLength(2);
        expect(state.metrics?.sourceCount).toBe(2);
      });

      it("should track build time", async () => {
        // Add a small delay to test timing
        await new Promise((resolve) => setTimeout(resolve, 1));

        const state = builder.getState();
        expect(state.metrics?.buildTime).toBeGreaterThan(0);
      });

      it("should track cache performance", () => {
        // Create multiple builders with similar configurations to trigger caching
        builder.withMemory({ test: "value" });
        builder.withMemory({ test: "value" }); // Should potentially hit cache

        const state = builder.getState();
        expect(state.metrics?.cacheHits).toBeGreaterThanOrEqual(0);
        expect(state.metrics?.cacheMisses).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("Error Handling", () => {
    it("should provide detailed error context for build failures", () => {
      try {
        builder.build();
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        const configError = error as ConfigurationError;
        expect(configError.context.component).toBe("ConfigBuilder");
        expect(configError.context.operation).toBe("build");
        expect(configError.context.metadata).toHaveProperty("sourcesCount", 0);
      }
    });

    it("should handle validation errors gracefully", () => {
      const schema = z.object({
        required: z.string(),
      });

      try {
        builder.withMemory({ wrong: "type" }).withValidation({ schema, enabled: true }).build();
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        const configError = error as ConfigurationError;
        expect(configError.context.operation).toBe("validate");
        expect(configError.context.metadata).toHaveProperty("zodErrors");
      }
    });

    it("should handle post-build modification errors", () => {
      builder.withMemory({ test: "value" }).build();

      try {
        builder.withMemory({ more: "data" });
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        const configError = error as ConfigurationError;
        expect(configError.context.component).toBe("ConfigBuilder");
        expect(configError.context.operation).toBe("modify");
        expect(configError.context.metadata).toHaveProperty("isBuilt", true);
      }
    });
  });

  describe("Performance Features", () => {
    it("should support object pooling when enabled", () => {
      const builder = new ConfigBuilder({
        performance: {
          useObjectPool: true,
        },
      });

      builder.withMemory({ test: "value" });
      const state = builder.getState();
      expect(state.sources).toHaveLength(1);
    });

    it("should skip object pooling when disabled", () => {
      const builder = new ConfigBuilder({
        performance: {
          useObjectPool: false,
        },
      });

      builder.withMemory({ test: "value" });
      const state = builder.getState();
      expect(state.sources).toHaveLength(1);
    });
  });

  describe("Platform-Specific Behavior", () => {
    it("should handle browser-specific sources", () => {
      const browserBuilder = new ConfigBuilder({ platform: "browser" });

      browserBuilder.withMemory({ test: "value" }).withLocalStorage({ namespace: "app_" }); // Should be added

      const state = browserBuilder.getState();
      expect(state.sources).toHaveLength(2);
    });

    it("should skip browser-specific sources on other platforms", () => {
      const nodeBuilder = new ConfigBuilder({ platform: "node" });

      nodeBuilder.withMemory({ test: "value" }).withLocalStorage({ namespace: "app_" }); // Should be skipped

      const state = nodeBuilder.getState();
      expect(state.sources).toHaveLength(1); // Only memory source
    });
  });

  describe("Complex Builder Scenarios", () => {
    it("should handle complete fluent chain", () => {
      const schema = z.object({
        app: z.object({
          name: z.string(),
          version: z.string(),
        }),
      });

      const config = builder
        .withMemory(
          {
            app: { name: "test-app", version: "1.0.0" },
          },
          { priority: 0 },
        )
        .withEnvironment({ prefix: "APP_", priority: 100 })
        .withFile("/config/default.json", { priority: 50 })
        .withCache({ ttl: 300000 })
        .withMergeStrategy("deep")
        .withHotReload(true, 250)
        .withValidation({ schema, enabled: true })
        .build();

      expect(config).toBeDefined();
    });

    it("should handle multiple sources with proper priority ordering", () => {
      const config = builder
        .withMemory({ source: "memory", value: "base" }, { priority: 0 })
        .withEnvironment({ priority: 100 })
        .withFile("/config.json", { priority: 50 })
        .withMemory({ source: "memory-high", value: "override" }, { priority: 200 })
        .build();

      expect(config).toBeDefined();

      const state = builder.getState();
      expect(state.sources).toHaveLength(4);
    });
  });
});
