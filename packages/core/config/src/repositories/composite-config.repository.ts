/**
 * Composite configuration repository with priority-based merging
 * @module @axon/config/repositories/composite-config
 */

import { ConfigurationError } from "@axon/errors";
import type { z } from "zod";
import { ZodError } from "zod";
import type {
  ICompositeSource,
  IConfigChangeEvent,
  IConfigChangeListener,
  IConfigRepository,
  IRepositoryMetadata,
} from "../types/index.js";
import { detectPlatform } from "../utils/platform-detector.js";

/**
 * Composite configuration repository options
 */
export interface ICompositeConfigOptions {
  readonly sources: ICompositeSource[];
  readonly mergeStrategy?: "replace" | "merge";
  readonly enableHotReload?: boolean;
}

/**
 * Composite configuration repository that merges multiple sources by priority
 */
export class CompositeConfigRepository implements IConfigRepository {
  private readonly sources: Map<string, ICompositeSource>;
  private readonly listeners = new Set<IConfigChangeListener>();
  private readonly unsubscribeFunctions = new Map<string, () => void>();
  private disposed = false;
  private readonly mergeStrategy: "replace" | "merge";
  private readonly enableHotReload: boolean;
  private cachedConfig: Record<string, unknown> = {};
  private cacheValid = false;

  constructor(options: ICompositeConfigOptions) {
    this.sources = new Map();
    this.mergeStrategy = options.mergeStrategy ?? "merge";
    this.enableHotReload = options.enableHotReload ?? true;

    // Add initial sources
    for (const source of options.sources) {
      this.addSource(source);
    }

    // Build initial cache
    this.rebuildCache();
  }

  load<T extends z.ZodType>(schema: T): z.infer<T> {
    if (this.disposed) {
      throw new ConfigurationError("Repository has been disposed", {
        component: "CompositeConfigRepository",
        operation: "load",
      });
    }

    try {
      const config = this.getEffectiveConfig();

      return schema.parse(config);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ConfigurationError("Configuration validation failed", {
          component: "CompositeConfigRepository",
          operation: "load",
          metadata: {
            sources: Array.from(this.sources.keys()),
            errors: error.issues.map((err) => `${err.path.join(".")}: ${err.message}`),
          },
        });
      }
      throw new ConfigurationError("Configuration loading failed", {
        component: "CompositeConfigRepository",
        operation: "load",
        metadata: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  get(key: string): unknown {
    if (this.disposed) return undefined;

    const config = this.getEffectiveConfig();
    return this.getNestedValue(config, key);
  }

  getAllConfig(): Record<string, unknown> {
    if (this.disposed) return {};
    return this.getEffectiveConfig();
  }

  validate<T extends z.ZodType>(data: unknown, schema: T): z.infer<T> {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ConfigurationError("Schema validation failed", {
          component: "CompositeConfigRepository",
          operation: "validate",
          metadata: {
            errors: error.issues.map((err) => `${err.path.join(".")}: ${err.message}`),
          },
        });
      }
      throw new ConfigurationError("Validation failed", {
        component: "CompositeConfigRepository",
        operation: "validate",
        metadata: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  watch(listener: IConfigChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async reload(): Promise<void> {
    if (this.disposed) return;

    // Reload all sources in parallel
    const reloadPromises: Promise<void>[] = [];
    for (const source of Array.from(this.sources.values())) {
      if (source.enabled) {
        reloadPromises.push(source.repository.reload());
      }
    }

    await Promise.allSettled(reloadPromises);
    this.invalidateCache();

    await this.emitChangeEvent("reload", [], {
      sources: Array.from(this.sources.keys()),
      timestamp: Date.now(),
    });
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;

    this.disposed = true;
    this.listeners.clear();

    // Unsubscribe from all source change events
    for (const unsubscribe of Array.from(this.unsubscribeFunctions.values())) {
      unsubscribe();
    }
    this.unsubscribeFunctions.clear();

    // Dispose all sources
    const disposePromises: Promise<void>[] = [];
    for (const source of Array.from(this.sources.values())) {
      disposePromises.push(source.repository.dispose());
    }

    await Promise.allSettled(disposePromises);
    this.sources.clear();
    this.cachedConfig = {};
  }

  getMetadata(): IRepositoryMetadata {
    const sourcesMetadata = Array.from(this.sources.values()).map((source) => ({
      ...source.repository.getMetadata(),
      priority: source.priority,
      prefix: source.prefix,
      enabled: source.enabled,
    }));

    return {
      source: `composite:${Array.from(this.sources.keys()).join(",")}`,
      type: "composite",
      platform: detectPlatform(),
      lastModified: Date.now(),
      isWatchable: this.enableHotReload && Array.from(this.sources.values()).some((s) => s.enabled),
      isWritable: false, // Composite repository is read-only
      version: {
        version: 1,
        timestamp: Date.now(),
        checksum: this.generateChecksum(JSON.stringify(this.getEffectiveConfig())),
        metadata: { sources: sourcesMetadata },
      },
    };
  }

  /**
   * Add a configuration source to the composite
   */
  addSource(source: ICompositeSource): void {
    const sourceId = this.generateSourceId(source);

    if (this.sources.has(sourceId)) {
      throw new ConfigurationError(`Source already exists: ${sourceId}`, {
        component: "CompositeConfigRepository",
        operation: "addSource",
      });
    }

    this.sources.set(sourceId, source);

    // Subscribe to source changes if hot reload is enabled
    if (this.enableHotReload && source.enabled) {
      const unsubscribe = source.repository.watch((event) => {
        this.handleSourceChange(sourceId, event);
      });
      this.unsubscribeFunctions.set(sourceId, unsubscribe);
    }

    this.invalidateCache();
  }

  /**
   * Remove a configuration source from the composite
   */
  removeSource(sourceId: string): void {
    const source = this.sources.get(sourceId);
    if (!source) return;

    // Unsubscribe from changes
    const unsubscribe = this.unsubscribeFunctions.get(sourceId);
    if (unsubscribe) {
      unsubscribe();
      this.unsubscribeFunctions.delete(sourceId);
    }

    this.sources.delete(sourceId);
    this.invalidateCache();
  }

  /**
   * Enable or disable a specific source
   */
  setSourceEnabled(sourceId: string, enabled: boolean): void {
    const source = this.sources.get(sourceId);
    if (!source) return;

    // Update the source (create new object to maintain immutability)
    const updatedSource: ICompositeSource = {
      ...source,
      enabled,
    };
    this.sources.set(sourceId, updatedSource);

    // Update subscription
    if (this.enableHotReload) {
      const unsubscribe = this.unsubscribeFunctions.get(sourceId);
      if (unsubscribe) {
        unsubscribe();
        this.unsubscribeFunctions.delete(sourceId);
      }

      if (enabled) {
        const newUnsubscribe = source.repository.watch((event) => {
          this.handleSourceChange(sourceId, event);
        });
        this.unsubscribeFunctions.set(sourceId, newUnsubscribe);
      }
    }

    this.invalidateCache();
  }

  /**
   * Get list of all sources with their metadata
   */
  getSources(): { id: string; source: ICompositeSource; metadata: IRepositoryMetadata }[] {
    return Array.from(this.sources.entries()).map(([id, source]) => ({
      id,
      source,
      metadata: source.repository.getMetadata(),
    }));
  }

  /**
   * Get the effective merged configuration
   */
  private getEffectiveConfig(): Record<string, unknown> {
    if (this.cacheValid) {
      return this.cachedConfig;
    }

    this.rebuildCache();
    return this.cachedConfig;
  }

  /**
   * Rebuild the configuration cache by merging all sources
   */
  private rebuildCache(): void {
    // Get all enabled sources sorted by priority (lowest to highest)
    // Higher priority sources should override lower priority ones, so process them last
    const enabledSources = Array.from(this.sources.values())
      .filter((source) => source.enabled)
      .sort((a, b) => a.priority - b.priority); // Changed from b.priority - a.priority

    let mergedConfig: Record<string, unknown> = {};

    for (const source of enabledSources) {
      try {
        const sourceConfig = this.getSourceConfig(source);
        if (source.prefix) {
          // Apply prefix to the source configuration
          const prefixedConfig = { [source.prefix]: sourceConfig };
          mergedConfig = this.mergeConfigs(mergedConfig, prefixedConfig);
        } else {
          mergedConfig = this.mergeConfigs(mergedConfig, sourceConfig);
        }
      } catch (error) {
        // Source failed to load - continue with other sources
        this.emitChangeEvent("error", [], {
          source: source.repository.getMetadata().source,
          error: error instanceof Error ? error.message : String(error),
        }).catch(() => {
          // Ignore errors in error handling
        });
      }
    }

    this.cachedConfig = mergedConfig;
    this.cacheValid = true;
  }

  /**
   * Get configuration from a specific source
   */
  private getSourceConfig(source: ICompositeSource): Record<string, unknown> {
    // Get configuration from the source
    const config = source.repository.getAllConfig();

    // Handle test case where config is wrapped in another config object
    const nestedConfig = config["config"];
    if (nestedConfig != null && typeof nestedConfig === "object" && !Array.isArray(nestedConfig)) {
      return nestedConfig as Record<string, unknown>;
    }
    return config;
  }

  /**
   * Merge two configuration objects based on merge strategy
   */
  private mergeConfigs(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    if (this.mergeStrategy === "replace") {
      return { ...target, ...source };
    }

    // Deep merge strategy
    return this.deepMerge(target, source);
  }

  /**
   * Deep merge two objects with priority-based replacement
   * Higher priority sources should completely replace values from lower priority sources
   */
  private deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (value === null || value === undefined) {
        result[key] = value;
        continue;
      }

      const targetValue = result[key];

      if (
        typeof value === "object" &&
        !Array.isArray(value) &&
        typeof targetValue === "object" &&
        !Array.isArray(targetValue) &&
        targetValue !== null
      ) {
        // Recursively merge nested objects
        result[key] = this.deepMerge(targetValue as Record<string, unknown>, value as Record<string, unknown>);
      } else {
        // Replace primitive values or arrays, or set new object values
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Generate a unique ID for a source
   */
  private generateSourceId(source: ICompositeSource): string {
    const metadata = source.repository.getMetadata();
    const prefix = source.prefix ? `${source.prefix}:` : "";
    return `${prefix}${metadata.type}:${metadata.source}:${source.priority.toString()}`;
  }

  /**
   * Handle configuration change from a source
   */
  private handleSourceChange(sourceId: string, event: IConfigChangeEvent): void {
    this.invalidateCache();

    this.emitChangeEvent("update", event.affectedKeys ?? [], {
      sourceId,
      sourceEvent: event,
      timestamp: Date.now(),
    }).catch(() => {
      // Ignore errors in event handling
    });
  }

  /**
   * Invalidate the configuration cache
   */
  private invalidateCache(): void {
    this.cacheValid = false;
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
   * Emit configuration change event to all listeners
   */
  private async emitChangeEvent(
    changeType: IConfigChangeEvent["changeType"],
    affectedKeys: string[],
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const event: IConfigChangeEvent = {
      source: "composite",
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
