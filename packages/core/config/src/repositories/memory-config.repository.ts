/**
 * In-memory configuration repository for testing and browser fallback
 * @module @axon/config/repositories/memory-config
 */

import type { z } from "zod";
import { ZodError } from "zod";
import { ConfigurationError } from "@axon/errors";
import type {
  IWritableConfigRepository,
  IConfigChangeListener,
  IConfigChangeEvent,
  IRepositoryMetadata,
} from "../types/index.js";
import { detectPlatform } from "../utils/platform-detector.js";

/**
 * In-memory configuration repository with full CRUD operations
 */
export class MemoryConfigRepository implements IWritableConfigRepository {
  private config: Record<string, unknown> = {};
  private readonly listeners = new Set<IConfigChangeListener>();
  private disposed = false;
  private version = 1;
  private readonly createdAt = Date.now();

  constructor(initialConfig: Record<string, unknown> = {}) {
    this.config = { ...initialConfig };
  }

  load<T extends z.ZodType>(schema: T): z.infer<T> {
    try {
       
      return schema.parse(this.config);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ConfigurationError("Configuration validation failed", {
          component: "MemoryConfigRepository",
          operation: "load",
          metadata: {
            errors: error.errors.map((err) => `${err.path.join(".")}: ${err.message}`),
          },
        });
      }
      throw new ConfigurationError("Configuration loading failed", {
        component: "MemoryConfigRepository",
        operation: "load",
        metadata: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  get(key: string): unknown {
    return this.getNestedValue(this.config, key);
  }

  validate<T extends z.ZodType>(data: unknown, schema: T): z.infer<T> {
    try {
       
      return schema.parse(data);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ConfigurationError("Schema validation failed", {
          component: "MemoryConfigRepository",
          operation: "validate",
          metadata: {
            errors: error.errors.map((err) => `${err.path.join(".")}: ${err.message}`),
          },
        });
      }
      throw new ConfigurationError("Validation failed", {
        component: "MemoryConfigRepository",
        operation: "validate",
        metadata: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  async set(key: string, value: unknown): Promise<void> {
    const oldValue = this.get(key);
    this.setNestedValue(this.config, key, value);
    this.version++;

    await this.emitChangeEvent("update", [key], {
      key,
      oldValue,
      newValue: value,
      version: this.version,
    });
  }

  async delete(key: string): Promise<void> {
    const oldValue = this.get(key);
    if (oldValue === undefined) return; // Key doesn't exist

    this.deleteNestedValue(this.config, key);
    this.version++;

    await this.emitChangeEvent("update", [key], {
      key,
      oldValue,
      newValue: undefined,
      version: this.version,
    });
  }

  async clear(): Promise<void> {
    const oldConfig = { ...this.config };
    this.config = {};
    this.version++;

    const affectedKeys = this.getAllKeys(oldConfig);
    await this.emitChangeEvent("update", affectedKeys, {
      operation: "clear",
      version: this.version,
    });
  }

  watch(listener: IConfigChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async reload(): Promise<void> {
    // Memory repository doesn't need to reload from external source
    await this.emitChangeEvent("reload", [], {
      version: this.version,
      timestamp: Date.now(),
    });
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;

    this.disposed = true;
    this.listeners.clear();
    this.config = {};

    // Add a minimal await to satisfy ESLint
    await Promise.resolve();
  }

  getMetadata(): IRepositoryMetadata {
    return {
      source: "memory",
      type: "memory",
      platform: detectPlatform(),
      lastModified: Date.now(),
      isWatchable: true,
      isWritable: true,
      version: {
        version: this.version,
        timestamp: this.createdAt,
        checksum: this.generateChecksum(JSON.stringify(this.config)),
      },
    };
  }

  /**
   * Get all configuration as a plain object (for testing/debugging)
   */
  getAll(): Record<string, unknown> {
    return { ...this.config };
  }

  /**
   * Replace entire configuration
   */
  async setAll(config: Record<string, unknown>): Promise<void> {
    const oldConfig = { ...this.config };
    this.config = { ...config };
    this.version++;

    const affectedKeys = [...this.getAllKeys(oldConfig), ...this.getAllKeys(this.config)].filter(
      (key, index, arr) => arr.indexOf(key) === index,
    ); // Remove duplicates

    await this.emitChangeEvent("update", affectedKeys, {
      operation: "setAll",
      version: this.version,
    });
  }

  /**
   * Get nested value from configuration object
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const keys = path.split(".");
    let current: unknown = obj;

    for (const key of keys) {
      if (typeof current !== "object" || current === null || !(key in current)) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[key];
    }

    return current;
  }

  /**
   * Set nested value in configuration object
   */
  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split(".");
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (key === undefined) continue;

      if (!(key in current) || typeof current[key] !== "object" || current[key] === null) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    const lastKey = keys[keys.length - 1];
    if (lastKey !== undefined) {
      current[lastKey] = value;
    }
  }

  /**
   * Delete nested value from configuration object
   */
  private deleteNestedValue(obj: Record<string, unknown>, path: string): void {
    const keys = path.split(".");
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (key === undefined || typeof current[key] !== "object" || current[key] === null) {
        return; // Path doesn't exist
      }
      current = current[key] as Record<string, unknown>;
    }

    const lastKey = keys[keys.length - 1];
    if (lastKey !== undefined && lastKey in current) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete current[lastKey];
    }
  }

  /**
   * Get all keys from configuration object recursively
   */
  private getAllKeys(obj: Record<string, unknown>, prefix = ""): string[] {
    const keys: string[] = [];

    for (const key in obj) {
      const fullKey = prefix !== "" ? `${prefix}.${key}` : key;
      keys.push(fullKey);

      const value = obj[key];
      if (typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).length > 0) {
        keys.push(...this.getAllKeys(value as Record<string, unknown>, fullKey));
      }
    }

    return keys;
  }

  /**
   * Emit configuration change event to all listeners
   */
  private async emitChangeEvent(
    changeType: IConfigChangeEvent["changeType"],
    affectedKeys: string[],
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const event: IConfigChangeEvent = {
      source: "memory",
      timestamp: Date.now(),
      changeType,
      affectedKeys,
      metadata,
    };

    const promises: Promise<void>[] = [];
    this.listeners.forEach((listener) => {
      promises.push(Promise.resolve(listener(event)));
    });

    await Promise.allSettled(promises);
  }

  /**
   * Generate simple checksum for configuration
   */
  private generateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }
}
