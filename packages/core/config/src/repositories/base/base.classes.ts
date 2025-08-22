/**
 * Base Repository Classes
 * Abstract base classes and common repository functionality
 */

import { ConfigurationError } from "@axon/errors";
import type { z } from "zod";
import type { IConfigChangeListener, IConfigRepository, IRepositoryMetadata } from "../../types/index.js";
import type { IRepositoryPerformanceMetrics, IRepositoryState } from "./base.types.js";

/**
 * Abstract base repository with common functionality
 */
export abstract class BaseConfigRepository implements IConfigRepository {
  protected readonly state: IRepositoryState;
  protected readonly listeners = new Set<IConfigChangeListener>();

  constructor(protected readonly name: string) {
    this.state = {
      initialized: false,
      loading: false,
      errorCount: 0,
      performanceMetrics: {
        loadTime: 0,
        cacheHits: 0,
        cacheMisses: 0,
        totalLoads: 0,
        averageLoadTime: 0,
        errorCount: 0,
      },
    };
  }

  /**
   * Load configuration data
   */
  abstract load<T extends z.ZodType>(schema: T): z.infer<T>;

  /**
   * Get configuration value by key
   */
  abstract get(key: string): unknown;

  /**
   * Get all configuration as object
   */
  abstract getAllConfig(): Record<string, unknown>;

  /**
   * Validate data against schema
   */
  abstract validate<T extends z.ZodType>(data: unknown, schema: T): z.infer<T>;

  /**
   * Watch for configuration changes
   */
  abstract watch(listener: IConfigChangeListener): () => void;

  /**
   * Reload configuration
   */
  abstract reload(): Promise<void>;

  /**
   * Dispose repository resources
   */
  abstract dispose(): Promise<void>;

  /**
   * Get repository metadata
   */
  getMetadata(): IRepositoryMetadata {
    return {
      source: this.name,
      type: "memory" as const,
      platform: "node" as const,
      lastModified: Date.now(),
      isWatchable: false,
      isWritable: false,
    };
  }

  /**
   * Add configuration change listener
   */
  addChangeListener(listener: IConfigChangeListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove configuration change listener
   */
  removeChangeListener(listener: IConfigChangeListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Get current repository state
   */
  getState(): IRepositoryState {
    return { ...this.state };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): IRepositoryPerformanceMetrics {
    return { ...this.state.performanceMetrics };
  }

  /**
   * Notify all listeners of configuration changes
   */
  protected notifyListeners(event: import("../../types/index.js").IConfigChangeEvent): void {
    const listeners = Array.from(this.listeners);
    for (const listener of listeners) {
      try {
        void Promise.resolve(listener(event));
      } catch (error) {
        console.warn(`Configuration change listener failed:`, error);
      }
    }
  }

  /**
   * Track performance metrics for an operation
   */
  protected async trackPerformance<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await fn();
      const loadTime = Date.now() - startTime;

      this.updateMetrics(loadTime, false);
      return result;
    } catch (error) {
      const loadTime = Date.now() - startTime;
      this.updateMetrics(loadTime, true);
      throw error;
    }
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(loadTime: number, isError: boolean): void {
    const metrics = this.state.performanceMetrics as any;

    metrics.totalLoads++;
    metrics.loadTime += loadTime;
    metrics.averageLoadTime = metrics.loadTime / metrics.totalLoads;

    if (isError) {
      metrics.errorCount++;
      (this.state as any).errorCount++;
    }
  }

  /**
   * Handle repository errors with context
   */
  protected handleError(operation: string, error: unknown, context?: Record<string, unknown>): never {
    const errorMessage = error instanceof Error ? error.message : String(error);

    throw new ConfigurationError(`Repository ${this.name} ${operation} failed: ${errorMessage}`, {
      component: this.name,
      operation,
      metadata: context ?? {},
    });
  }
}

/**
 * Abstract cached repository base class
 */
export abstract class CachedConfigRepository extends BaseConfigRepository {
  protected readonly cache = new Map<string, any>();
  protected readonly maxCacheSize: number;
  protected readonly cacheTTL: number;

  constructor(name: string, maxCacheSize = 100, cacheTTL = 300000) {
    super(name);
    this.maxCacheSize = maxCacheSize;
    this.cacheTTL = cacheTTL;
  }

  /**
   * Get value from cache
   */
  protected getCached(key: string): unknown | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      (this.state.performanceMetrics as any).cacheMisses++;
      return undefined;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      (this.state.performanceMetrics as any).cacheMisses++;
      return undefined;
    }

    (this.state.performanceMetrics as any).cacheHits++;
    entry.accessCount++;
    return entry.value;
  }

  /**
   * Set value in cache
   */
  protected setCached(key: string, value: unknown, schemaHash?: string): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      schemaHash: schemaHash || "",
      accessCount: 1,
    });
  }

  /**
   * Clear the cache
   */
  protected clearCache(): void {
    this.cache.clear();
  }

  /**
   * Evict the oldest cache entry
   */
  private evictOldest(): void {
    let oldestKey: string | undefined;
    let oldestTimestamp = Infinity;

    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      const entry = this.cache.get(key);
      if (entry && entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}
