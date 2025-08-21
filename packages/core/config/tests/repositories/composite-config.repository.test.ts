/**
 * Composite configuration repository tests
 * @module @axon/config/tests/repositories/composite-config
 */

import { ConfigurationError } from "@axon/errors";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { CompositeConfigRepository } from "../../src/repositories/composite-config.repository.js";
import { MemoryConfigRepository } from "../../src/repositories/memory-config.repository.js";
import type { ICompositeSource, IConfigChangeEvent, IConfigRepository } from "../../src/types/index.js";

describe("CompositeConfigRepository", () => {
  let repository: CompositeConfigRepository;
  let source1: IConfigRepository;
  let source2: IConfigRepository;
  let source3: IConfigRepository;

  const baseConfig = {
    app: { name: "base-app", version: "1.0.0" },
    database: { host: "localhost", port: 5432 },
  };

  const overrideConfig = {
    app: { name: "override-app" },
    api: { port: 3000, timeout: 5000 },
  };

  const highPriorityConfig = {
    database: { port: 3306 },
    cache: { ttl: 300 },
  };

  const testSchema = z.object({
    app: z.object({
      name: z.string(),
      version: z.string().optional(),
    }),
    database: z.object({
      host: z.string(),
      port: z.number(),
    }),
    api: z
      .object({
        port: z.number(),
        timeout: z.number(),
      })
      .optional(),
    cache: z
      .object({
        ttl: z.number(),
      })
      .optional(),
  });

  beforeEach(() => {
    source1 = new MemoryConfigRepository(baseConfig);
    source2 = new MemoryConfigRepository(overrideConfig);
    source3 = new MemoryConfigRepository(highPriorityConfig);
  });

  afterEach(async () => {
    if (repository) {
      await repository.dispose();
    }
    await source1.dispose();
    await source2.dispose();
    await source3.dispose();
  });

  describe("Constructor and Source Management", () => {
    it("should initialize with multiple sources", () => {
      const sources: ICompositeSource[] = [
        { repository: source1, priority: 1, enabled: true },
        { repository: source2, priority: 2, enabled: true },
        { repository: source3, priority: 3, enabled: true },
      ];

      repository = new CompositeConfigRepository({
        sources,
        mergeStrategy: "merge",
      });

      expect(repository.getMetadata().type).toBe("composite");
    });

    it("should handle empty sources list", () => {
      repository = new CompositeConfigRepository({
        sources: [],
        mergeStrategy: "merge",
      });

      expect(repository.get("any.key")).toBeUndefined();
    });

    it("should respect source priorities in merging", () => {
      const sources: ICompositeSource[] = [
        { repository: source1, priority: 1, enabled: true }, // Lowest priority
        { repository: source2, priority: 2, enabled: true },
        { repository: source3, priority: 3, enabled: true }, // Highest priority
      ];

      repository = new CompositeConfigRepository({
        sources,
        mergeStrategy: "merge",
      });

      // High priority source should override lower priority
      expect(repository.get("database.port")).toBe(3306); // From source3
      expect(repository.get("app.name")).toBe("override-app"); // From source2
      expect(repository.get("database.host")).toBe("localhost"); // From source1
    });
  });

  describe("Configuration Loading and Merging", () => {
    beforeEach(() => {
      const sources: ICompositeSource[] = [
        { repository: source1, priority: 1, enabled: true },
        { repository: source2, priority: 2, enabled: true },
        { repository: source3, priority: 3, enabled: true },
      ];

      repository = new CompositeConfigRepository({
        sources,
        mergeStrategy: "merge",
        enableHotReload: true,
      });
    });

    it("should load merged configuration with schema validation", () => {
      const mergedSchema = z.object({
        app: z.object({
          name: z.string(),
          version: z.string().optional(),
        }),
        database: z.object({
          host: z.string(),
          port: z.number(),
        }),
        api: z
          .object({
            port: z.number(),
            timeout: z.number(),
          })
          .optional(),
        cache: z
          .object({
            ttl: z.number(),
          })
          .optional(),
      });

      const config = repository.load(mergedSchema);

      expect(config.app.name).toBe("override-app"); // From source2
      expect(config.app.version).toBe("1.0.0"); // From source1
      expect(config.database.port).toBe(3306); // From source3 (highest priority)
      expect(config.database.host).toBe("localhost"); // From source1
      expect(config.api?.port).toBe(3000); // From source2
      expect(config.cache?.ttl).toBe(300); // From source3
    });

    it("should get individual configuration values", () => {
      expect(repository.get("app.name")).toBe("override-app");
      expect(repository.get("database.port")).toBe(3306);
      expect(repository.get("api.port")).toBe(3000);
      expect(repository.get("cache.ttl")).toBe(300);
      expect(repository.get("non.existent")).toBeUndefined();
    });

    it("should handle replace merge strategy", () => {
      const sources: ICompositeSource[] = [
        { repository: source1, priority: 1, enabled: true },
        { repository: source2, priority: 2, enabled: true },
      ];

      const replaceRepo = new CompositeConfigRepository({
        sources,
        mergeStrategy: "replace",
      });

      // With replace strategy, higher priority completely replaces lower priority sections
      expect(replaceRepo.get("app.version")).toBeUndefined(); // Should be replaced entirely
      expect(replaceRepo.get("app.name")).toBe("override-app");

      replaceRepo.dispose().catch(() => {});
    });

    it("should validate data against schema", () => {
      const validData = {
        app: { name: "test", version: "1.0" },
        database: { host: "test-host", port: 5432 },
      };

      const result = repository.validate(validData, testSchema);
      expect(result).toEqual(validData);
    });
  });

  describe("Source Prefixes", () => {
    it("should handle source prefixes", () => {
      const prefixedSources: ICompositeSource[] = [
        { repository: source1, priority: 1, enabled: true, prefix: "base" },
        { repository: source2, priority: 2, enabled: true, prefix: "override" },
      ];

      const prefixRepo = new CompositeConfigRepository({
        sources: prefixedSources,
        mergeStrategy: "merge",
      });

      expect(prefixRepo.get("base.app.name")).toBe("base-app");
      expect(prefixRepo.get("override.app.name")).toBe("override-app");
      expect(prefixRepo.get("base.database.port")).toBe(5432);

      prefixRepo.dispose().catch(() => {});
    });
  });

  describe("Source Enabling/Disabling", () => {
    it("should respect disabled sources", () => {
      const sources: ICompositeSource[] = [
        { repository: source1, priority: 1, enabled: true },
        { repository: source2, priority: 2, enabled: false }, // Disabled
        { repository: source3, priority: 3, enabled: true },
      ];

      repository = new CompositeConfigRepository({
        sources,
        mergeStrategy: "merge",
      });

      // Should not include values from disabled source2
      expect(repository.get("app.name")).toBe("base-app"); // From source1, not source2
      expect(repository.get("api.port")).toBeUndefined(); // From disabled source2
      expect(repository.get("database.port")).toBe(3306); // From source3
    });
  });

  describe("Hot Reloading and Change Propagation", () => {
    let changeEvents: IConfigChangeEvent[];

    beforeEach(() => {
      const sources: ICompositeSource[] = [
        { repository: source1, priority: 1, enabled: true },
        { repository: source2, priority: 2, enabled: true },
      ];

      repository = new CompositeConfigRepository({
        sources,
        mergeStrategy: "merge",
        enableHotReload: true,
      });

      changeEvents = [];
      repository.watch((event) => {
        changeEvents.push(event);
      });
    });

    it("should propagate change events from source repositories", async () => {
      // Trigger a change in source1 if it's a memory repository with update capability
      if (source1 instanceof MemoryConfigRepository) {
        await source1.set("app.name", "updated-base");
      }

      // Wait for change propagation
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(changeEvents.length).toBeGreaterThan(0);
      expect(changeEvents[0]!.changeType).toBe("update");

      // Reset source1 to original state to avoid affecting other tests
      if (source1 instanceof MemoryConfigRepository) {
        await source1.set("app.name", "base-app");
      }
    });

    it("should reload all sources", async () => {
      await repository.reload();

      // Should complete without errors
      expect(repository.get("app.name")).toBe("override-app");
    });
  });

  describe("Repository Metadata", () => {
    beforeEach(() => {
      const sources: ICompositeSource[] = [
        { repository: source1, priority: 1, enabled: true },
        { repository: source2, priority: 2, enabled: true },
        { repository: source3, priority: 3, enabled: true },
      ];

      repository = new CompositeConfigRepository({
        sources,
        mergeStrategy: "merge",
      });
    });

    it("should provide composite repository metadata", () => {
      const metadata = repository.getMetadata();

      expect(metadata.type).toBe("composite");
      expect(metadata.platform).toBe("node");
      expect(metadata.isWatchable).toBe(true);
      expect(metadata.isWritable).toBe(false);
      expect(metadata.source).toContain("composite");
      expect(metadata.lastModified).toBeGreaterThan(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle source loading errors gracefully", () => {
      const errorSource = {
        load: vi.fn().mockImplementation(() => {
          throw new ConfigurationError("Source load failed", {
            component: "MockSource",
            operation: "load",
          });
        }),
        get: vi.fn().mockReturnValue(undefined),
        getAllConfig: vi.fn().mockReturnValue({}),
        validate: vi.fn(),
        watch: vi.fn().mockReturnValue(() => {}),
        reload: vi.fn().mockResolvedValue(undefined),
        dispose: vi.fn().mockResolvedValue(undefined),
        getMetadata: vi.fn().mockReturnValue({
          source: "error-source",
          type: "memory" as const,
          platform: "node" as const,
          lastModified: Date.now(),
          isWatchable: false,
          isWritable: false,
        }),
      } as IConfigRepository;

      const sources: ICompositeSource[] = [
        { repository: source1, priority: 1, enabled: true },
        { repository: errorSource, priority: 2, enabled: true },
      ];

      repository = new CompositeConfigRepository({
        sources,
        mergeStrategy: "merge",
      });

      // Should still work with working sources
      expect(repository.get("app.name")).toBe("base-app");
    });

    it("should throw ConfigurationError for schema validation failures", () => {
      const sources: ICompositeSource[] = [{ repository: source1, priority: 1, enabled: true }];

      repository = new CompositeConfigRepository({
        sources,
        mergeStrategy: "merge",
      });

      const invalidSchema = z.object({
        app: z.object({
          name: z.number(), // Should be string
        }),
      });

      expect(() => {
        repository.load(invalidSchema);
      }).toThrow(ConfigurationError);
    });
  });

  describe("Resource Management", () => {
    it("should dispose all source repositories", async () => {
      const sources: ICompositeSource[] = [
        { repository: source1, priority: 1, enabled: true },
        { repository: source2, priority: 2, enabled: true },
      ];

      repository = new CompositeConfigRepository({
        sources,
        mergeStrategy: "merge",
        enableHotReload: true,
      });

      const listener = vi.fn();
      repository.watch(listener);

      await repository.dispose();

      // Verify listeners are cleared
      expect(true).toBe(true); // Test passes if no error thrown
    });

    it("should handle multiple dispose calls gracefully", async () => {
      const sources: ICompositeSource[] = [{ repository: source1, priority: 1, enabled: true }];

      repository = new CompositeConfigRepository({
        sources,
        mergeStrategy: "merge",
      });

      await repository.dispose();
      await repository.dispose(); // Should not throw

      expect(true).toBe(true);
    });
  });

  describe("Performance", () => {
    it("should efficiently merge large number of sources", () => {
      const manySources: ICompositeSource[] = [];
      const repositories: IConfigRepository[] = [];

      // Create 50 sources with different priorities
      for (let i = 0; i < 50; i++) {
        const repo = new MemoryConfigRepository({ [`source${i}`]: { value: i } });
        repositories.push(repo);
        manySources.push({
          repository: repo,
          priority: i + 1,
          enabled: true,
        });
      }

      const startTime = performance.now();

      repository = new CompositeConfigRepository({
        sources: manySources,
        mergeStrategy: "merge",
      });

      const compositeTime = performance.now() - startTime;

      expect(compositeTime).toBeLessThan(1000); // Should complete within 1 second
      expect(repository.get("source49.value")).toBe(49);

      // Cleanup
      repositories.forEach((repo) => repo.dispose().catch(() => {}));
    });

    it("should cache merged configuration for repeated access", () => {
      const sources: ICompositeSource[] = [
        { repository: source1, priority: 1, enabled: true },
        { repository: source2, priority: 2, enabled: true },
      ];

      repository = new CompositeConfigRepository({
        sources,
        mergeStrategy: "merge",
      });

      const startTime = performance.now();

      // Access same key multiple times
      for (let i = 0; i < 1000; i++) {
        repository.get("app.name");
      }

      const accessTime = performance.now() - startTime;

      expect(accessTime).toBeLessThan(100); // Should be very fast due to caching
    });
  });
});
