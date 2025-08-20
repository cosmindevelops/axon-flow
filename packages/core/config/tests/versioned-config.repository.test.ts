/**
 * Versioned configuration repository interface compliance tests
 * @module @axon/config/tests/versioned-config
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { z } from "zod";
import { ConfigurationError } from "@axon/errors";
import { MemoryConfigRepository } from "../src/repositories/memory-config.repository.js";
import type { IVersionedConfigRepository, IConfigVersion } from "../src/types/index.js";

// Mock versioned repository implementation for testing interface compliance
class MockVersionedConfigRepository extends MemoryConfigRepository implements IVersionedConfigRepository {
  private versions: IConfigVersion[] = [];
  private currentVersion = 0;
  private configHistory: Record<string, unknown>[] = [];

  constructor(config: Record<string, unknown> = {}) {
    super(config);
    this.saveVersion(config);
  }

  getVersion(): IConfigVersion {
    const currentConfig = this.getAllConfig();
    return {
      version: this.currentVersion,
      timestamp: Date.now(),
      checksum: this.generateChecksum(JSON.stringify(currentConfig)),
      metadata: { configSize: JSON.stringify(currentConfig).length },
    };
  }

  getVersionHistory(): IConfigVersion[] {
    return [...this.versions];
  }

  async rollback(version?: number): Promise<void> {
    const targetVersion = version ?? this.currentVersion - 1;
    
    if (targetVersion < 0 || targetVersion >= this.configHistory.length) {
      throw new ConfigurationError("Invalid version for rollback", {
        component: "MockVersionedConfigRepository",
        operation: "rollback",
        metadata: { targetVersion, availableVersions: this.versions.length },
      });
    }

    const targetConfig = this.configHistory[targetVersion];
    await this.updateConfig(targetConfig);
    this.currentVersion = targetVersion;
  }

  async compareVersions(version1: number, version2: number): Promise<Record<string, { old: unknown; new: unknown }>> {
    if (version1 < 0 || version1 >= this.configHistory.length ||
        version2 < 0 || version2 >= this.configHistory.length) {
      throw new ConfigurationError("Invalid version numbers for comparison", {
        component: "MockVersionedConfigRepository",
        operation: "compareVersions",
        metadata: { version1, version2, availableVersions: this.versions.length },
      });
    }

    const config1 = this.configHistory[version1];
    const config2 = this.configHistory[version2];

    return this.compareObjects(config1, config2);
  }

  async updateConfig(newConfig: Record<string, unknown>): Promise<void> {
    // Use the clear method and then set values individually
    await this.clear();
    for (const [key, value] of Object.entries(newConfig)) {
      await this.set(key, value);
    }
    this.saveVersion(newConfig);
  }

  private saveVersion(config: Record<string, unknown>): void {
    this.configHistory.push({ ...config });
    this.currentVersion = this.configHistory.length - 1;
    
    const version: IConfigVersion = {
      version: this.currentVersion,
      timestamp: Date.now(),
      checksum: this.generateChecksum(JSON.stringify(config)),
      metadata: { configSize: JSON.stringify(config).length },
    };
    
    this.versions.push(version);
  }

  private generateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  private compareObjects(obj1: Record<string, unknown>, obj2: Record<string, unknown>): Record<string, { old: unknown; new: unknown }> {
    const differences: Record<string, { old: unknown; new: unknown }> = {};

    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

    for (const key of allKeys) {
      const val1 = obj1[key];
      const val2 = obj2[key];

      if (val1 !== val2) {
        differences[key] = { old: val1, new: val2 };
      }
    }

    return differences;
  }

  private getAllConfig(): Record<string, unknown> {
    // Build config from current state by accessing all known keys
    const config: Record<string, unknown> = {};
    
    // Get all keys from current version in history
    if (this.configHistory.length > 0) {
      const currentConfig = this.configHistory[this.currentVersion];
      for (const key of Object.keys(currentConfig)) {
        config[key] = this.get(key);
      }
    }
    
    return config;
  }
}

describe("IVersionedConfigRepository Interface Compliance", () => {
  let repository: MockVersionedConfigRepository;

  const initialConfig = {
    app: { name: "test-app", version: "1.0.0" },
    database: { host: "localhost", port: 5432 },
  };

  beforeEach(() => {
    repository = new MockVersionedConfigRepository(initialConfig);
  });

  afterEach(async () => {
    await repository.dispose();
  });

  describe("Version Management", () => {
    it("should track current version", () => {
      const version = repository.getVersion();
      
      expect(version.version).toBe(0);
      expect(version.timestamp).toBeGreaterThan(0);
      expect(version.checksum).toBeDefined();
      expect(version.metadata).toBeDefined();
    });

    it("should maintain version history", async () => {
      // Make some updates to create version history
      await repository.updateConfig({
        ...initialConfig,
        app: { ...initialConfig.app, version: "1.1.0" },
      });

      await repository.updateConfig({
        ...initialConfig,
        app: { ...initialConfig.app, version: "1.2.0" },
        cache: { ttl: 300 },
      });

      const history = repository.getVersionHistory();
      
      expect(history).toHaveLength(3); // Initial + 2 updates
      expect(history[0].version).toBe(0);
      expect(history[1].version).toBe(1);
      expect(history[2].version).toBe(2);
      
      // Versions should be chronologically ordered
      expect(history[1].timestamp).toBeGreaterThanOrEqual(history[0].timestamp);
      expect(history[2].timestamp).toBeGreaterThanOrEqual(history[1].timestamp);
    });

    it("should generate unique checksums for different configurations", async () => {
      const initialVersion = repository.getVersion();
      
      await repository.updateConfig({
        ...initialConfig,
        app: { ...initialConfig.app, name: "updated-app" },
      });

      const updatedVersion = repository.getVersion();
      
      expect(updatedVersion.checksum).not.toBe(initialVersion.checksum);
    });
  });

  describe("Rollback Functionality", () => {
    it("should rollback to previous version", async () => {
      // Update configuration
      await repository.updateConfig({
        ...initialConfig,
        app: { ...initialConfig.app, name: "updated-app" },
      });

      expect(repository.get("app.name")).toBe("updated-app");

      // Rollback to version 0
      await repository.rollback(0);

      expect(repository.get("app.name")).toBe("test-app");
      expect(repository.getVersion().version).toBe(0);
    });

    it("should rollback to previous version without specifying version number", async () => {
      // Create multiple versions
      await repository.updateConfig({
        ...initialConfig,
        app: { ...initialConfig.app, version: "1.1.0" },
      });

      await repository.updateConfig({
        ...initialConfig,
        app: { ...initialConfig.app, version: "1.2.0" },
      });

      expect(repository.get("app.version")).toBe("1.2.0");

      // Rollback to previous version (should go to version 1)
      await repository.rollback();

      expect(repository.get("app.version")).toBe("1.1.0");
    });

    it("should throw error for invalid rollback version", async () => {
      await expect(repository.rollback(-1)).rejects.toThrow(ConfigurationError);
      await expect(repository.rollback(999)).rejects.toThrow(ConfigurationError);
    });

    it("should maintain version history after rollback", async () => {
      // Create version history
      await repository.updateConfig({
        ...initialConfig,
        app: { ...initialConfig.app, version: "1.1.0" },
      });

      const historyBeforeRollback = repository.getVersionHistory();
      
      await repository.rollback(0);
      
      const historyAfterRollback = repository.getVersionHistory();
      
      // History should be preserved
      expect(historyAfterRollback).toHaveLength(historyBeforeRollback.length);
    });
  });

  describe("Version Comparison", () => {
    it("should compare configurations between versions", async () => {
      // Update configuration to create differences
      await repository.updateConfig({
        ...initialConfig,
        app: { ...initialConfig.app, name: "updated-app", version: "1.1.0" },
        newField: "new-value",
      });

      const differences = await repository.compareVersions(0, 1);

      expect(differences).toHaveProperty("app");
      expect(differences).toHaveProperty("newField");
      expect(differences.newField).toEqual({ old: undefined, new: "new-value" });
    });

    it("should handle identical versions comparison", async () => {
      const differences = await repository.compareVersions(0, 0);
      
      expect(Object.keys(differences)).toHaveLength(0);
    });

    it("should throw error for invalid version comparison", async () => {
      await expect(repository.compareVersions(-1, 0)).rejects.toThrow(ConfigurationError);
      await expect(repository.compareVersions(0, 999)).rejects.toThrow(ConfigurationError);
    });

    it("should detect complex configuration changes", async () => {
      await repository.updateConfig({
        app: { name: "different-app", environment: "production" },
        database: { host: "production-host", port: 3306, ssl: true },
        removedField: undefined,
      });

      const differences = await repository.compareVersions(0, 1);

      expect(differences).toHaveProperty("app");
      expect(differences).toHaveProperty("database");
      expect(differences.database.old).toEqual(initialConfig.database);
      expect(differences.database.new).toEqual({ host: "production-host", port: 3306, ssl: true });
    });
  });

  describe("Performance and Data Integrity", () => {
    it("should efficiently handle multiple version creations", async () => {
      const startTime = performance.now();

      // Create 100 versions
      for (let i = 0; i < 100; i++) {
        await repository.updateConfig({
          ...initialConfig,
          iteration: i,
          timestamp: Date.now(),
        });
      }

      const creationTime = performance.now() - startTime;
      const history = repository.getVersionHistory();

      expect(history).toHaveLength(101); // Initial + 100 updates
      expect(creationTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it("should maintain data integrity across version operations", async () => {
      const originalChecksum = repository.getVersion().checksum;

      // Create several versions
      await repository.updateConfig({ counter: 1 });
      await repository.updateConfig({ counter: 2 });
      await repository.updateConfig({ counter: 3 });

      // Rollback to original
      await repository.rollback(0);

      // Should have same checksum as original
      const rolledBackChecksum = repository.getVersion().checksum;
      expect(rolledBackChecksum).toBe(originalChecksum);
    });

    it("should handle large configuration objects efficiently", async () => {
      const largeConfig = {
        ...initialConfig,
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `item-${i}`,
          value: Math.random(),
        })),
      };

      const startTime = performance.now();
      
      await repository.updateConfig(largeConfig);
      const version = repository.getVersion();
      
      const operationTime = performance.now() - startTime;

      expect(operationTime).toBeLessThan(1000); // Should complete within 1 second
      expect(version.checksum).toBeDefined();
      expect(version.metadata?.configSize).toBeGreaterThan(10000);
    });
  });

  describe("Interface Compliance", () => {
    it("should implement all IVersionedConfigRepository methods", () => {
      // Check that all required methods exist
      expect(typeof repository.getVersion).toBe("function");
      expect(typeof repository.getVersionHistory).toBe("function");
      expect(typeof repository.rollback).toBe("function");
      expect(typeof repository.compareVersions).toBe("function");
    });

    it("should extend base IConfigRepository interface", () => {
      // Check that base repository methods are available
      expect(typeof repository.load).toBe("function");
      expect(typeof repository.get).toBe("function");
      expect(typeof repository.validate).toBe("function");
      expect(typeof repository.watch).toBe("function");
      expect(typeof repository.reload).toBe("function");
      expect(typeof repository.dispose).toBe("function");
      expect(typeof repository.getMetadata).toBe("function");
    });

    it("should maintain configuration functionality while versioning", () => {
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

      const config = repository.load(testSchema);
      
      expect(config.app.name).toBe("test-app");
      expect(config.database.port).toBe(5432);

      // Verify metadata includes versioning information
      const metadata = repository.getMetadata();
      expect(metadata.version).toBeDefined();
    });
  });

  describe("Error Recovery and Edge Cases", () => {
    it("should handle version operations after repository disposal", async () => {
      await repository.dispose();

      // Operations should still work or fail gracefully
      expect(() => repository.getVersion()).not.toThrow();
      expect(() => repository.getVersionHistory()).not.toThrow();
    });

    it("should handle concurrent version operations", async () => {
      const updatePromises = Array.from({ length: 10 }, (_, i) =>
        repository.updateConfig({ counter: i, timestamp: Date.now() + i })
      );

      await Promise.all(updatePromises);

      const history = repository.getVersionHistory();
      expect(history.length).toBeGreaterThan(1);
      
      // Should be able to rollback without issues
      await repository.rollback(0);
      expect(repository.get("app.name")).toBe("test-app");
    });

    it("should handle empty configuration versions", async () => {
      await repository.updateConfig({});

      const version = repository.getVersion();
      expect(version.checksum).toBeDefined();

      const differences = await repository.compareVersions(0, 1);
      expect(differences).toHaveProperty("app");
      expect(differences).toHaveProperty("database");
    });
  });
});