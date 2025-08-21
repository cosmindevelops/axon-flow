/**
 * LocalStorage-based configuration repository for browser environments
 * @module @axon/config/repositories/localstorage-config
 */

import { ConfigurationError } from "@axon/errors";
import type { z } from "zod";
import { ZodError } from "zod";
import type {
  IConfigChangeEvent,
  IConfigChangeListener,
  IPlatformConfigRepository,
  IRepositoryMetadata,
  IWritableConfigRepository,
} from "../types/index.js";

// Browser environment type declarations for cross-platform compatibility
declare const window:
  | {
      addEventListener: (type: string, listener: (event: Event) => void) => void;
      removeEventListener: (type: string, listener: (event: Event) => void) => void;
    }
  | undefined;

declare const localStorage:
  | {
      getItem: (key: string) => string | null;
      setItem: (key: string, value: string) => void;
      removeItem: (key: string) => void;
    }
  | undefined;

// StorageEvent interface for cross-tab synchronization
interface IStorageEvent extends Event {
  readonly key: string | null;
  readonly oldValue: string | null;
  readonly newValue: string | null;
}

// Type guard for StorageEvent
function isStorageEvent(event: Event): event is IStorageEvent {
  return "key" in event && "oldValue" in event && "newValue" in event;
}

/**
 * LocalStorage configuration repository options
 */
export interface ILocalStorageConfigOptions {
  readonly storageKey?: string;
  readonly namespace?: string;
  readonly watchForChanges?: boolean;
}

/**
 * Browser localStorage-based configuration repository
 */
export class LocalStorageConfigRepository implements IPlatformConfigRepository, IWritableConfigRepository {
  private readonly storageKey: string;
  private readonly watchForChanges: boolean;
  private readonly listeners = new Set<IConfigChangeListener>();
  private disposed = false;
  private version = 1;
  private storageEventListener: ((event: Event) => void) | null = null;

  readonly platform = "browser" as const;
  readonly isSupported: boolean;

  constructor(options: ILocalStorageConfigOptions = {}) {
    this.storageKey =
      options.storageKey ??
      `axon-config${options.namespace !== undefined && options.namespace !== "" ? `-${options.namespace}` : ""}`;
    this.watchForChanges = options.watchForChanges ?? true;
    this.isSupported = this.checkLocalStorageSupport();

    if (this.isSupported && this.watchForChanges) {
      this.setupStorageWatcher();
    }
  }

  load<T extends z.ZodType>(schema: T): z.infer<T> {
    if (!this.isSupported) {
      throw new ConfigurationError("LocalStorage is not supported in this environment", {
        component: "LocalStorageConfigRepository",
        operation: "load",
      });
    }

    try {
      const config = this.getStoredConfig();

      return schema.parse(config);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ConfigurationError("Configuration validation failed", {
          component: "LocalStorageConfigRepository",
          operation: "load",
          metadata: {
            storageKey: this.storageKey,
            errors: error.issues.map((err) => `${err.path.join(".")}: ${err.message}`),
          },
        });
      }
      throw new ConfigurationError("Configuration loading failed", {
        component: "LocalStorageConfigRepository",
        operation: "load",
        metadata: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  get(key: string): unknown {
    if (!this.isSupported) return undefined;

    const config = this.getStoredConfig();
    return this.getNestedValue(config, key);
  }

  getAllConfig(): Record<string, unknown> {
    if (!this.isSupported) return {};
    return this.getStoredConfig();
  }

  validate<T extends z.ZodType>(data: unknown, schema: T): z.infer<T> {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ConfigurationError("Schema validation failed", {
          component: "LocalStorageConfigRepository",
          operation: "validate",
          metadata: {
            errors: error.issues.map((err) => `${err.path.join(".")}: ${err.message}`),
          },
        });
      }
      throw new ConfigurationError("Validation failed", {
        component: "LocalStorageConfigRepository",
        operation: "validate",
        metadata: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  async set(key: string, value: unknown): Promise<void> {
    if (!this.isSupported) {
      throw new ConfigurationError("LocalStorage is not supported in this environment", {
        component: "LocalStorageConfigRepository",
        operation: "set",
      });
    }

    const config = this.getStoredConfig();
    const oldValue = this.getNestedValue(config, key);

    this.setNestedValue(config, key, value);
    this.storeConfig(config);
    this.version++;

    await this.emitChangeEvent("update", [key], {
      key,
      oldValue,
      newValue: value,
      version: this.version,
    });
  }

  async delete(key: string): Promise<void> {
    if (!this.isSupported) return;

    const config = this.getStoredConfig();
    const oldValue = this.getNestedValue(config, key);
    if (oldValue === undefined) return; // Key doesn't exist

    this.deleteNestedValue(config, key);
    this.storeConfig(config);
    this.version++;

    await this.emitChangeEvent("update", [key], {
      key,
      oldValue,
      newValue: undefined,
      version: this.version,
    });
  }

  async clear(): Promise<void> {
    if (!this.isSupported) return;

    const oldConfig = this.getStoredConfig();
    const affectedKeys = this.getAllKeys(oldConfig);

    if (localStorage) {
      localStorage.removeItem(this.storageKey);
    }
    this.version++;

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
    if (!this.isSupported) return;

    await this.emitChangeEvent("reload", [], {
      version: this.version,
      timestamp: Date.now(),
      storageKey: this.storageKey,
    });
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;

    this.disposed = true;
    this.listeners.clear();

    if (this.storageEventListener !== null && typeof window !== "undefined") {
      window.removeEventListener("storage", this.storageEventListener);
      this.storageEventListener = null;
    }

    // Add a minimal await to satisfy ESLint
    await Promise.resolve();
  }

  getMetadata(): IRepositoryMetadata {
    return {
      source: this.storageKey,
      type: "localStorage",
      platform: this.platform,
      lastModified: Date.now(),
      isWatchable: this.watchForChanges && this.isSupported,
      isWritable: this.isSupported,
      version: {
        version: this.version,
        timestamp: Date.now(),
        checksum: this.generateChecksum(JSON.stringify(this.getStoredConfig())),
      },
    };
  }

  /**
   * Get all stored configuration as a plain object
   */
  getAll(): Record<string, unknown> {
    if (!this.isSupported) return {};
    return this.getStoredConfig();
  }

  /**
   * Replace entire configuration in localStorage
   */
  async setAll(config: Record<string, unknown>): Promise<void> {
    if (!this.isSupported) {
      throw new ConfigurationError("LocalStorage is not supported in this environment", {
        component: "LocalStorageConfigRepository",
        operation: "setAll",
      });
    }

    const oldConfig = this.getStoredConfig();
    this.storeConfig(config);
    this.version++;

    const affectedKeys = [...this.getAllKeys(oldConfig), ...this.getAllKeys(config)].filter(
      (key, index, arr) => arr.indexOf(key) === index,
    ); // Remove duplicates

    await this.emitChangeEvent("update", affectedKeys, {
      operation: "setAll",
      version: this.version,
    });
  }

  /**
   * Check if localStorage is available and functional
   */
  private checkLocalStorageSupport(): boolean {
    try {
      if (typeof localStorage === "undefined") {
        return false;
      }

      // Test localStorage functionality
      const testKey = "__axon_config_test__";
      localStorage.setItem(testKey, "test");
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get configuration from localStorage
   */
  private getStoredConfig(): Record<string, unknown> {
    if (!this.isSupported) return {};

    try {
      const stored = localStorage?.getItem(this.storageKey);
      if (stored === null || stored === undefined) return {};

      return JSON.parse(stored) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  /**
   * Store configuration to localStorage
   */
  private storeConfig(config: Record<string, unknown>): void {
    if (!this.isSupported) return;

    try {
      if (localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify(config));
      }
    } catch (error) {
      throw new ConfigurationError("Failed to store configuration in localStorage", {
        component: "LocalStorageConfigRepository",
        operation: "storeConfig",
        metadata: {
          storageKey: this.storageKey,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  /**
   * Setup storage event listener for cross-tab synchronization
   */
  private setupStorageWatcher(): void {
    if (typeof window === "undefined" || !this.watchForChanges) return;

    this.storageEventListener = (event: Event) => {
      // Type guard for StorageEvent
      if (isStorageEvent(event) && event.key === this.storageKey && !this.disposed) {
        this.handleStorageChange(event);
      }
    };

    window.addEventListener("storage", this.storageEventListener);
  }

  /**
   * Handle storage change events from other tabs
   */
  private handleStorageChange(event: Event): void {
    // Type guard and safe property access
    if (isStorageEvent(event)) {
      this.emitChangeEvent("update", [], {
        changeSource: "external",
        oldValue: event.oldValue,
        newValue: event.newValue,
        timestamp: Date.now(),
      }).catch(() => {
        // Ignore errors in event handling
      });
    }
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
      source: this.storageKey,
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
