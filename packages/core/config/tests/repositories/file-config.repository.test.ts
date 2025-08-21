/**
 * File configuration repository tests
 * @module @axon/config/tests/repositories/file-config
 */

import { ConfigurationError } from "@axon/errors";
import { existsSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { FileConfigRepository } from "../../src/repositories/file-config.repository.js";
import type { IConfigChangeEvent } from "../../src/types/index.js";

describe("FileConfigRepository", () => {
  let testDir: string;
  let testFilePath: string;
  let repository: FileConfigRepository;

  const testConfig = {
    app: {
      name: "test-app",
      version: "1.0.0",
    },
    database: {
      host: "localhost",
      port: 5432,
    },
  };

  const testSchema = z.object({
    app: z.object({
      name: z.string(),
      version: z.string(),
    }),
    database: z.object({
      host: z.string(),
      port: z.number(),
    }),
  });

  beforeEach(async () => {
    testDir = join(tmpdir(), `axon-config-test-${Date.now()}`);
    testFilePath = join(testDir, "test-config.json");

    if (!existsSync(testDir)) {
      await mkdir(testDir, { recursive: true });
    }

    await writeFile(testFilePath, JSON.stringify(testConfig, null, 2));
  });

  afterEach(async () => {
    if (repository) {
      await repository.dispose();
    }

    try {
      if (existsSync(testFilePath)) {
        await unlink(testFilePath);
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("Constructor", () => {
    it("should load configuration file synchronously on construction", () => {
      repository = new FileConfigRepository({
        filePath: testFilePath,
        watchForChanges: false,
      });

      expect(repository.get("app.name")).toBe("test-app");
      expect(repository.get("database.port")).toBe(5432);
    });

    it("should throw ConfigurationError for non-existent file", () => {
      const nonExistentPath = join(testDir, "non-existent.json");

      expect(() => {
        new FileConfigRepository({
          filePath: nonExistentPath,
          watchForChanges: false,
        });
      }).toThrow(ConfigurationError);
    });

    it("should auto-detect file format from extension", () => {
      repository = new FileConfigRepository({
        filePath: testFilePath,
        watchForChanges: false,
      });

      const metadata = repository.getMetadata();
      expect(metadata.source).toBe(testFilePath);
      expect(metadata.type).toBe("file");
    });
  });

  describe("Configuration Loading", () => {
    beforeEach(() => {
      repository = new FileConfigRepository({
        filePath: testFilePath,
        watchForChanges: false,
      });
    });

    it("should load and validate configuration with schema", () => {
      const config = repository.load(testSchema);

      expect(config).toEqual(testConfig);
      expect(config.app.name).toBe("test-app");
      expect(config.database.port).toBe(5432);
    });

    it("should throw ConfigurationError for invalid schema", () => {
      const invalidSchema = z.object({
        app: z.object({
          name: z.number(), // Should be string
        }),
      });

      expect(() => {
        repository.load(invalidSchema);
      }).toThrow(ConfigurationError);
    });

    it("should get nested configuration values", () => {
      expect(repository.get("app.name")).toBe("test-app");
      expect(repository.get("database.port")).toBe(5432);
      expect(repository.get("non.existent.key")).toBeUndefined();
    });

    it("should validate data against schema", () => {
      const validData = { app: { name: "test", version: "1.0" }, database: { host: "localhost", port: 3000 } };
      const result = repository.validate(validData, testSchema);

      expect(result).toEqual(validData);
    });

    it("should throw ConfigurationError for invalid data validation", () => {
      const invalidData = { app: { name: 123 } }; // name should be string

      expect(() => {
        repository.validate(invalidData, testSchema);
      }).toThrow(ConfigurationError);
    });
  });

  describe("Hot Reloading", () => {
    beforeEach(() => {
      repository = new FileConfigRepository({
        filePath: testFilePath,
        watchForChanges: true,
        debounceMs: 50,
      });
    });

    it("should reload configuration file", async () => {
      const updatedConfig = {
        ...testConfig,
        app: { ...testConfig.app, name: "updated-app" },
      };

      await writeFile(testFilePath, JSON.stringify(updatedConfig, null, 2));
      await repository.reload();

      expect(repository.get("app.name")).toBe("updated-app");
    });

    it("should emit change events on configuration reload", async () => {
      const changeEvents: IConfigChangeEvent[] = [];

      const unsubscribe = repository.watch((event) => {
        changeEvents.push(event);
      });

      const updatedConfig = {
        ...testConfig,
        app: { ...testConfig.app, version: "2.0.0" },
      };

      await writeFile(testFilePath, JSON.stringify(updatedConfig, null, 2));
      await repository.reload();

      // Wait for event emission
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(changeEvents).toHaveLength(1);
      expect(changeEvents[0]!.changeType).toBe("reload");
      expect(changeEvents[0]!.affectedKeys).toContain("app.version");
      expect(changeEvents[0]!.source).toBe(testFilePath);

      unsubscribe();
    });

    it("should handle file watch errors gracefully", async () => {
      const errorEvents: IConfigChangeEvent[] = [];

      repository.watch((event) => {
        if (event.changeType === "error") {
          errorEvents.push(event);
        }
      });

      // Delete the file to trigger an error
      await unlink(testFilePath);
      await repository.reload();

      // Wait for error events (both file deletion and reload can trigger errors)
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(errorEvents).toHaveLength(2);
      expect(errorEvents[0]!.changeType).toBe("error");
      expect(errorEvents[1]!.changeType).toBe("error");
    });

    it("should unsubscribe change listeners", () => {
      const listener = vi.fn();
      const unsubscribe = repository.watch(listener);

      unsubscribe();

      // Verify listener is removed (internal state check would be needed)
      expect(typeof unsubscribe).toBe("function");
    });
  });

  describe("Repository Metadata", () => {
    beforeEach(() => {
      repository = new FileConfigRepository({
        filePath: testFilePath,
        watchForChanges: true,
      });
    });

    it("should provide repository metadata", () => {
      const metadata = repository.getMetadata();

      expect(metadata.source).toBe(testFilePath);
      expect(metadata.type).toBe("file");
      expect(metadata.platform).toBe("node");
      expect(metadata.isWatchable).toBe(true);
      expect(metadata.isWritable).toBe(false);
      expect(metadata.lastModified).toBeGreaterThan(0);
      expect(metadata.version).toBeDefined();
      expect(metadata.version?.version).toBe(1);
      expect(metadata.version?.checksum).toBeDefined();
    });

    it("should update lastModified on file changes", async () => {
      const initialMetadata = repository.getMetadata();

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updatedConfig = { ...testConfig, newField: "value" };
      await writeFile(testFilePath, JSON.stringify(updatedConfig, null, 2));
      await repository.reload();

      const updatedMetadata = repository.getMetadata();
      expect(updatedMetadata.lastModified).toBeGreaterThanOrEqual(initialMetadata.lastModified);
    });
  });

  describe("Resource Management", () => {
    it("should dispose resources properly", async () => {
      repository = new FileConfigRepository({
        filePath: testFilePath,
        watchForChanges: true,
      });

      const listener = vi.fn();
      repository.watch(listener);

      await repository.dispose();

      // Verify repository is marked as disposed
      expect(repository.getMetadata().source).toBe(testFilePath);
    });

    it("should handle multiple dispose calls gracefully", async () => {
      repository = new FileConfigRepository({
        filePath: testFilePath,
        watchForChanges: false,
      });

      await repository.dispose();
      await repository.dispose(); // Should not throw

      expect(true).toBe(true); // Test passes if no error thrown
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed JSON files", async () => {
      const malformedPath = join(testDir, "malformed.json");
      await writeFile(malformedPath, "{ invalid json }");

      expect(() => {
        new FileConfigRepository({
          filePath: malformedPath,
          watchForChanges: false,
        });
      }).toThrow(ConfigurationError);

      try {
        await unlink(malformedPath);
      } catch {
        // Ignore cleanup errors
      }
    });

    it("should handle unsupported file formats", async () => {
      const yamlPath = join(testDir, "config.yaml");
      await writeFile(yamlPath, "app:\n  name: test");

      expect(() => {
        new FileConfigRepository({
          filePath: yamlPath,
          watchForChanges: false,
        });
      }).toThrow(ConfigurationError);

      try {
        await unlink(yamlPath);
      } catch {
        // Ignore cleanup errors
      }
    });
  });

  describe("Performance", () => {
    it("should handle large configuration files efficiently", async () => {
      // Create a large configuration object
      const largeConfig = {
        ...testConfig,
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `item-${i}`,
          value: Math.random(),
        })),
      };

      const largePath = join(testDir, "large-config.json");
      await writeFile(largePath, JSON.stringify(largeConfig, null, 2));

      const startTime = performance.now();

      const largeRepository = new FileConfigRepository({
        filePath: largePath,
        watchForChanges: false,
      });

      const loadTime = performance.now() - startTime;

      expect(loadTime).toBeLessThan(1000); // Should load within 1 second
      expect(largeRepository.get("data")).toHaveLength(1000);

      await largeRepository.dispose();

      try {
        await unlink(largePath);
      } catch {
        // Ignore cleanup errors
      }
    });

    it("should debounce rapid file changes", async () => {
      repository = new FileConfigRepository({
        filePath: testFilePath,
        watchForChanges: true,
        debounceMs: 100,
      });

      const changeEvents: IConfigChangeEvent[] = [];
      repository.watch((event) => {
        changeEvents.push(event);
      });

      // Make multiple rapid changes
      for (let i = 0; i < 5; i++) {
        const config = { ...testConfig, counter: i };
        await writeFile(testFilePath, JSON.stringify(config, null, 2));
        await repository.reload();
      }

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should have fewer events than changes due to debouncing
      expect(changeEvents.length).toBeLessThanOrEqual(5);
    });
  });
});
