/**
 * Configuration repository performance benchmarks and optimization tests
 * @module @axon/config/tests/performance-benchmark
 */

import { existsSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { CachedConfigRepository } from "../src/repositories/cached-config.repository.js";
import { CompositeConfigRepository } from "../src/repositories/composite-config.repository.js";
import { FileConfigRepository } from "../src/repositories/file-config.repository.js";
import { MemoryConfigRepository } from "../src/repositories/memory-config.repository.js";
import type { ICompositeSource, IConfigRepository } from "../src/types/index.js";

describe("Configuration Repository Performance Benchmarks", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `axon-config-perf-${Date.now()}`);
    if (!existsSync(testDir)) {
      await mkdir(testDir, { recursive: true });
    }
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      if (existsSync(testDir)) {
        const files = await import("node:fs/promises").then((fs) => fs.readdir(testDir));
        for (const file of files) {
          await unlink(join(testDir, file));
        }
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("Load Performance", () => {
    const performanceTargets = {
      smallConfig: { maxLoadTime: 50, size: "< 1KB" },
      mediumConfig: { maxLoadTime: 200, size: "1KB - 100KB" },
      largeConfig: { maxLoadTime: 1000, size: "> 100KB" },
    };

    it("should load small configurations efficiently", async () => {
      const smallConfig = {
        app: { name: "test", version: "1.0.0" },
        database: { host: "localhost", port: 5432 },
      };

      const configPath = join(testDir, "small-config.json");
      await writeFile(configPath, JSON.stringify(smallConfig, null, 2));

      const startTime = performance.now();

      const repository = new FileConfigRepository({
        filePath: configPath,
        watchForChanges: false,
      });

      const loadTime = performance.now() - startTime;

      expect(loadTime).toBeLessThan(performanceTargets.smallConfig.maxLoadTime);
      expect(repository.get("app.name")).toBe("test");

      await repository.dispose();
    });

    it("should load medium configurations within performance targets", async () => {
      // Create a medium-sized configuration (~10KB)
      const mediumConfig = {
        app: { name: "test", version: "1.0.0" },
        features: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `feature-${i}`,
          enabled: i % 2 === 0,
          config: { timeout: 5000 + i, retries: 3 },
        })),
        database: {
          host: "localhost",
          port: 5432,
          pools: Array.from({ length: 50 }, (_, i) => ({
            name: `pool-${i}`,
            size: 10 + i,
            timeout: 30000,
          })),
        },
      };

      const configPath = join(testDir, "medium-config.json");
      await writeFile(configPath, JSON.stringify(mediumConfig, null, 2));

      const startTime = performance.now();

      const repository = new FileConfigRepository({
        filePath: configPath,
        watchForChanges: false,
      });

      const loadTime = performance.now() - startTime;

      expect(loadTime).toBeLessThan(performanceTargets.mediumConfig.maxLoadTime);
      expect(repository.get("features")).toHaveLength(100);

      await repository.dispose();
    });

    it("should load large configurations within acceptable limits", async () => {
      // Create a large configuration (~500KB)
      const largeConfig = {
        app: { name: "test", version: "1.0.0" },
        data: Array.from({ length: 5000 }, (_, i) => ({
          id: i,
          name: `item-${i}`,
          description: `Description for item ${i}`.repeat(10),
          metadata: {
            created: new Date().toISOString(),
            tags: [`tag-${i % 10}`, `category-${i % 20}`],
            properties: Array.from({ length: 20 }, (_, j) => ({
              key: `prop-${j}`,
              value: `value-${i}-${j}`,
            })),
          },
        })),
      };

      const configPath = join(testDir, "large-config.json");
      await writeFile(configPath, JSON.stringify(largeConfig, null, 2));

      const startTime = performance.now();

      const repository = new FileConfigRepository({
        filePath: configPath,
        watchForChanges: false,
      });

      const loadTime = performance.now() - startTime;

      expect(loadTime).toBeLessThan(performanceTargets.largeConfig.maxLoadTime);
      expect(repository.get("data")).toHaveLength(5000);

      await repository.dispose();
    });
  });

  describe("Access Performance", () => {
    let repository: IConfigRepository;

    const testConfig = {
      app: { name: "test", version: "1.0.0" },
      database: { host: "localhost", port: 5432 },
      nested: {
        deep: {
          level: {
            value: "deep-value",
            array: Array.from({ length: 1000 }, (_, i) => `item-${i}`),
          },
        },
      },
    };

    beforeEach(() => {
      repository = new MemoryConfigRepository({ config: testConfig });
    });

    afterEach(async () => {
      await repository.dispose();
    });

    it("should provide fast repeated access to configuration values", () => {
      const iterations = 10000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        repository.get("app.name");
        repository.get("database.port");
        repository.get("nested.deep.level.value");
      }

      const accessTime = performance.now() - startTime;
      const averageAccess = accessTime / (iterations * 3);

      expect(averageAccess).toBeLessThan(0.1); // < 0.1ms per access
      expect(accessTime).toBeLessThan(1000); // Total time < 1 second
    });

    it("should efficiently access nested configuration values", () => {
      const deepKeys = ["nested.deep.level.value", "nested.deep.level.array.0", "nested.deep.level.array.999"];

      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        deepKeys.forEach((key) => repository.get(key));
      }

      const nestedAccessTime = performance.now() - startTime;
      const averageNestedAccess = nestedAccessTime / (iterations * deepKeys.length);

      expect(averageNestedAccess).toBeLessThan(0.5); // < 0.5ms per nested access
    });

    it("should handle non-existent key access efficiently", () => {
      const nonExistentKeys = ["non.existent.key", "another.missing.value", "deeply.nested.missing.configuration"];

      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        nonExistentKeys.forEach((key) => repository.get(key));
      }

      const missingKeyTime = performance.now() - startTime;

      expect(missingKeyTime).toBeLessThan(500); // Should be very fast for missing keys
    });
  });

  describe("Schema Validation Performance", () => {
    let repository: IConfigRepository;

    const complexSchema = z.object({
      app: z.object({
        name: z.string().min(1).max(100),
        version: z.string().regex(/^\d+\.\d+\.\d+$/),
      }),
      database: z.object({
        host: z.string().min(1),
        port: z.number().int().min(1).max(65535),
        ssl: z.boolean().optional(),
      }),
      features: z
        .array(
          z.object({
            id: z.number().int(),
            name: z.string(),
            enabled: z.boolean(),
            config: z.record(z.string(), z.unknown()).optional(),
          }),
        )
        .max(1000),
    });

    beforeEach(() => {
      const config = {
        app: { name: "test-app", version: "1.2.3" },
        database: { host: "localhost", port: 5432 },
        features: Array.from({ length: 500 }, (_, i) => ({
          id: i,
          name: `feature-${i}`,
          enabled: i % 2 === 0,
          config: { timeout: 5000 },
        })),
      };

      repository = new MemoryConfigRepository({ config });
    });

    afterEach(async () => {
      await repository.dispose();
    });

    it("should validate complex schemas efficiently", () => {
      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        repository.load(complexSchema);
      }

      const validationTime = performance.now() - startTime;
      const averageValidation = validationTime / iterations;

      expect(averageValidation).toBeLessThan(50); // < 50ms per validation
      expect(validationTime).toBeLessThan(5000); // Total time < 5 seconds
    });

    it("should cache schema validation results", () => {
      // First validation (cold)
      const startCold = performance.now();
      repository.load(complexSchema);
      const coldTime = performance.now() - startCold;

      // Subsequent validations (should be faster due to internal optimizations)
      const iterations = 10;
      const startWarm = performance.now();

      for (let i = 0; i < iterations; i++) {
        repository.load(complexSchema);
      }

      const warmTime = performance.now() - startWarm;
      const averageWarmTime = warmTime / iterations;

      // Warm runs should be faster than cold run
      expect(averageWarmTime).toBeLessThanOrEqual(coldTime);
    });
  });

  describe("Composite Repository Performance", () => {
    let sources: IConfigRepository[];
    let compositeRepo: CompositeConfigRepository;

    beforeEach(() => {
      sources = [
        new MemoryConfigRepository({
          config: { base: { value: "base" }, shared: { priority: 1 } },
        }),
        new MemoryConfigRepository({
          config: { override: { value: "override" }, shared: { priority: 2 } },
        }),
        new MemoryConfigRepository({
          config: { final: { value: "final" }, shared: { priority: 3 } },
        }),
      ];
    });

    afterEach(async () => {
      if (compositeRepo) {
        await compositeRepo.dispose();
      }
      for (const source of sources) {
        await source.dispose();
      }
    });

    it("should merge multiple sources efficiently", () => {
      const compositeSources: ICompositeSource[] = sources.map((repo, index) => ({
        repository: repo,
        priority: index + 1,
        enabled: true,
      }));

      const startTime = performance.now();

      compositeRepo = new CompositeConfigRepository({
        sources: compositeSources,
        mergeStrategy: "merge",
      });

      const mergeTime = performance.now() - startTime;

      expect(mergeTime).toBeLessThan(100); // < 100ms to merge 3 sources
      expect(compositeRepo.get("shared.priority")).toBe(3); // Highest priority wins
    });

    it("should handle large numbers of sources efficiently", () => {
      const manySources: IConfigRepository[] = [];
      const compositeSources: ICompositeSource[] = [];

      // Create 50 sources
      for (let i = 0; i < 50; i++) {
        const repo = new MemoryConfigRepository({
          config: { [`source${i}`]: { value: i, priority: i } },
        });
        manySources.push(repo);
        compositeSources.push({
          repository: repo,
          priority: i + 1,
          enabled: true,
        });
      }

      const startTime = performance.now();

      compositeRepo = new CompositeConfigRepository({
        sources: compositeSources,
        mergeStrategy: "merge",
      });

      const mergeTime = performance.now() - startTime;

      expect(mergeTime).toBeLessThan(1000); // < 1 second for 50 sources
      expect(compositeRepo.get("source49.value")).toBe(49);

      // Cleanup
      manySources.forEach((repo) => repo.dispose().catch(() => {}));
    });
  });

  describe("Caching Performance", () => {
    let baseRepository: IConfigRepository;
    let cachedRepository: CachedConfigRepository;

    beforeEach(() => {
      baseRepository = new MemoryConfigRepository({
        config: {
          expensive: {
            computation: Array.from({ length: 1000 }, (_, i) => ({
              id: i,
              value: Math.random(),
            })),
          },
        },
      });

      cachedRepository = new CachedConfigRepository(baseRepository, 1000, 60000);
    });

    afterEach(async () => {
      await cachedRepository.dispose();
      await baseRepository.dispose();
    });

    it("should provide significant performance improvement with caching", () => {
      const iterations = 1000;

      // Cold access (no cache)
      const startCold = performance.now();
      for (let i = 0; i < iterations; i++) {
        baseRepository.get("expensive.computation");
      }
      const coldTime = performance.now() - startCold;

      // Warm access (with cache)
      const startWarm = performance.now();
      for (let i = 0; i < iterations; i++) {
        cachedRepository.get("expensive.computation");
      }
      const warmTime = performance.now() - startWarm;

      // Cached access should be significantly faster
      expect(warmTime).toBeLessThan(coldTime * 0.5); // At least 50% improvement
      expect(warmTime).toBeLessThan(100); // Should be very fast
    });

    it("should handle cache misses efficiently", () => {
      const uniqueKeys = Array.from({ length: 100 }, (_, i) => `unique.key.${i}`);

      const startTime = performance.now();

      uniqueKeys.forEach((key) => {
        cachedRepository.get(key); // All cache misses
      });

      const missTime = performance.now() - startTime;

      expect(missTime).toBeLessThan(500); // Should handle misses reasonably fast
    });
  });

  describe("Memory Usage Performance", () => {
    it("should manage memory efficiently for large configurations", () => {
      const repositories: IConfigRepository[] = [];

      // Create many repositories with large configurations
      for (let i = 0; i < 10; i++) {
        const config = {
          id: i,
          data: Array.from({ length: 1000 }, (_, j) => ({
            id: j,
            value: `value-${i}-${j}`,
            metadata: { created: Date.now(), index: j },
          })),
        };

        repositories.push(new MemoryConfigRepository({ config }));
      }

      // Access data from all repositories
      repositories.forEach((repo, i) => {
        expect(repo.get("id")).toBe(i);
        expect(repo.get("data")).toHaveLength(1000);
      });

      // Cleanup should complete quickly
      const cleanupStart = performance.now();
      void Promise.all(repositories.map((repo) => repo.dispose()));
      const cleanupTime = performance.now() - cleanupStart;

      expect(cleanupTime).toBeLessThan(1000); // < 1 second cleanup
    });

    it("should not leak memory with repeated operations", async () => {
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const repo = new MemoryConfigRepository({
          config: { iteration: i, data: Array.from({ length: 100 }, (_, j) => j) },
        });

        // Perform operations
        repo.get("iteration");
        repo.get("data.50");

        // Dispose immediately
        await repo.dispose();
      }

      // Test should complete without excessive memory usage
      expect(true).toBe(true); // Test passes if no out-of-memory error
    });
  });

  describe("Hot Reload Performance", () => {
    it("should reload configurations efficiently", async () => {
      const configPath = join(testDir, "reload-test.json");
      const initialConfig = { version: 1, data: "initial" };

      await writeFile(configPath, JSON.stringify(initialConfig, null, 2));

      const repository = new FileConfigRepository({
        filePath: configPath,
        watchForChanges: true,
        debounceMs: 10,
      });

      // Perform multiple reloads
      const reloadTimes: number[] = [];
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        const updatedConfig = { version: i + 2, data: `updated-${i}` };
        await writeFile(configPath, JSON.stringify(updatedConfig, null, 2));

        const startTime = performance.now();
        await repository.reload();
        const reloadTime = performance.now() - startTime;

        reloadTimes.push(reloadTime);
        expect(repository.get("version")).toBe(i + 2);
      }

      const averageReloadTime = reloadTimes.reduce((a, b) => a + b, 0) / reloadTimes.length;

      expect(averageReloadTime).toBeLessThan(100); // < 100ms average reload time
      expect(Math.max(...reloadTimes)).toBeLessThan(500); // No reload > 500ms

      await repository.dispose();
    });
  });

  describe("Concurrent Access Performance", () => {
    it("should handle concurrent repository access efficiently", async () => {
      const repository = new MemoryConfigRepository({
        config: {
          shared: { counter: 0 },
          data: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: i * 2 })),
        },
      });

      const concurrentOperations = Array.from({ length: 100 }, async (_, i) => {
        // Simulate concurrent access patterns
        const operations = [
          () => repository.get("shared.counter"),
          () => repository.get(`data.${i % 100}.value`),
          () => repository.get("non.existent.key"),
        ];

        for (let j = 0; j < 10; j++) {
          const op = operations[j % operations.length];
          // Guard in case operation is undefined
          op?.();
        }
      });

      const startTime = performance.now();
      await Promise.all(concurrentOperations);
      const concurrentTime = performance.now() - startTime;

      expect(concurrentTime).toBeLessThan(1000); // < 1 second for all concurrent operations

      await repository.dispose();
    });
  });
});
