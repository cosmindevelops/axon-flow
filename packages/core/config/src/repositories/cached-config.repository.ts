/**
 * Cached configuration repository with performance optimizations
 */

import type { z } from "zod";
import { ConfigurationError } from "@axon/errors";
import type { IConfigRepository, IConfigChangeListener, IRepositoryMetadata } from "../types/index.js";
import { EnvironmentConfigRepository } from "./index.js";
import { detectPlatform } from "../utils/platform-detector.js";

/**
 * Performance metrics for configuration loading
 */
interface IPerformanceMetrics {
  loadTime: number;
  cacheHits: number;
  cacheMisses: number;
  totalLoads: number;
  averageLoadTime: number;
}

/**
 * Cache entry for validated configurations
 */
interface ICacheEntry<T> {
  value: T;
  timestamp: number;
  schemaHash: string;
  accessCount: number;
}

/**
 * Cached configuration repository with lazy loading and memoization
 */
export class CachedConfigRepository implements IConfigRepository {
  private readonly cache = new Map<string, ICacheEntry<unknown>>();
  private readonly schemaCache = new Map<string, z.ZodType>();
  private readonly performanceMetrics: IPerformanceMetrics = {
    loadTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    totalLoads: 0,
    averageLoadTime: 0,
  };
  private readonly maxCacheSize: number;
  private readonly cacheTTL: number;
  private readonly baseRepository: IConfigRepository;

  /**
   * Create a new cached configuration repository
   * @param baseRepository - The underlying repository to cache
   * @param maxCacheSize - Maximum number of cached entries (default: 100)
   * @param cacheTTL - Cache time-to-live in milliseconds (default: 5 minutes)
   */
  constructor(
    baseRepository?: IConfigRepository,
    maxCacheSize = 100,
    cacheTTL = 5 * 60 * 1000, // 5 minutes
  ) {
    this.baseRepository = baseRepository ?? new EnvironmentConfigRepository();
    this.maxCacheSize = maxCacheSize;
    this.cacheTTL = cacheTTL;
  }

  /**
   * Load configuration with caching and performance tracking
   */
  load<T extends z.ZodType>(schema: T): z.infer<T> {
    const startTime = performance.now();

    try {
      const schemaKey = this.getSchemaKey(schema);
      const cachedEntry = this.cache.get(schemaKey) as ICacheEntry<z.infer<T>> | undefined;

      // Check cache validity
      if (cachedEntry !== undefined && this.isCacheValid(cachedEntry)) {
        this.performanceMetrics.cacheHits++;
        cachedEntry.accessCount++;
        this.updatePerformanceMetrics(performance.now() - startTime);
         
        return cachedEntry.value;
      }

      // Cache miss - load from base repository
      this.performanceMetrics.cacheMisses++;

      const value = this.baseRepository.load(schema);

      // Update cache
      this.setCacheEntry(schemaKey, value, schema);
      this.updatePerformanceMetrics(performance.now() - startTime);

       
      return value;
    } catch (error) {
      this.updatePerformanceMetrics(performance.now() - startTime);
      throw new ConfigurationError("Failed to load configuration from cache", {
        component: "CachedConfigRepository",
        operation: "load",
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          performanceMetrics: this.getPerformanceMetrics(),
        },
      });
    }
  }

  /**
   * Get configuration value with caching
   */
  get(key: string): unknown {
    const cachedValue = this.cache.get(key);
    if (cachedValue !== undefined && this.isCacheValid(cachedValue)) {
      cachedValue.accessCount++;
      return cachedValue.value;
    }

    const value = this.baseRepository.get(key);
    if (value !== undefined) {
      this.setCacheEntry(key, value, null);
    }
    return value;
  }

  /**
   * Validate data against schema with caching
   */
  validate<T extends z.ZodType>(data: unknown, schema: T): z.infer<T> {
    const startTime = performance.now();

    try {
      // Generate cache key based on data and schema
      const cacheKey = this.getValidationCacheKey(data, schema);
      const cachedEntry = this.cache.get(cacheKey) as ICacheEntry<z.infer<T>> | undefined;

      if (cachedEntry !== undefined && this.isCacheValid(cachedEntry)) {
        this.performanceMetrics.cacheHits++;
        cachedEntry.accessCount++;
        this.updatePerformanceMetrics(performance.now() - startTime);
         
        return cachedEntry.value;
      }

      const validated = this.baseRepository.validate(data, schema);
      this.setCacheEntry(cacheKey, validated, schema);
      this.updatePerformanceMetrics(performance.now() - startTime);

       
      return validated;
    } catch (error) {
      this.updatePerformanceMetrics(performance.now() - startTime);
      throw error;
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    this.schemaCache.clear();
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): IPerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Preload schemas for faster access
   */
  preloadSchemas(schemas: Record<string, z.ZodType>): void {
    for (const [key, schema] of Object.entries(schemas)) {
      this.schemaCache.set(key, schema);
    }
  }

  /**
   * Warm up cache with initial configurations
   */
  warmupCache(configs: { key: string; schema: z.ZodType; value?: unknown }[]): void {
    for (const config of configs) {
      if (config.value !== undefined) {
        this.setCacheEntry(config.key, config.value, config.schema);
      } else {
        try {
          this.load(config.schema);
        } catch {
          // Ignore errors during warmup
        }
      }
    }
  }

  /**
   * Generate cache key for schema
   */
  private getSchemaKey(schema: z.ZodType): string {
    // Use schema's description or a hash of its structure
    const schemaString = JSON.stringify(schema.def);
    return `schema:${this.hashString(schemaString)}`;
  }

  /**
   * Generate cache key for validation
   */
  private getValidationCacheKey(data: unknown, schema: z.ZodType): string {
    const dataString = JSON.stringify(data);
    const schemaString = JSON.stringify(schema.def);
    return `validation:${this.hashString(dataString + schemaString)}`;
  }

  /**
   * Simple hash function for cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(entry: ICacheEntry<unknown>): boolean {
    const now = Date.now();
    return now - entry.timestamp < this.cacheTTL;
  }

  /**
   * Set cache entry with LRU eviction
   */
  private setCacheEntry(key: string, value: unknown, schema: z.ZodType | null): void {
    // Evict least recently used if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLRU();
    }

    const entry: ICacheEntry<unknown> = {
      value,
      timestamp: Date.now(),
      schemaHash: schema !== null ? this.getSchemaKey(schema) : "",
      accessCount: 0,
    };

    this.cache.set(key, entry);
  }

  /**
   * Evict least recently used cache entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruAccessCount = Infinity;
    let lruTimestamp = Infinity;

    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (
        entry.accessCount < lruAccessCount ||
        (entry.accessCount === lruAccessCount && entry.timestamp < lruTimestamp)
      ) {
        lruKey = key;
        lruAccessCount = entry.accessCount;
        lruTimestamp = entry.timestamp;
      }
    }

    if (lruKey !== null) {
      this.cache.delete(lruKey);
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(loadTime: number): void {
    this.performanceMetrics.totalLoads++;
    this.performanceMetrics.loadTime += loadTime;
    this.performanceMetrics.averageLoadTime = this.performanceMetrics.loadTime / this.performanceMetrics.totalLoads;
  }

  /**
   * Get cache statistics
   */
  getCacheStatistics(): {
    size: number;
    maxSize: number;
    hitRate: number;
    averageLoadTime: number;
    totalLoads: number;
  } {
    const totalRequests = this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses;
    const hitRate = totalRequests > 0 ? this.performanceMetrics.cacheHits / totalRequests : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate,
      averageLoadTime: this.performanceMetrics.averageLoadTime,
      totalLoads: this.performanceMetrics.totalLoads,
    };
  }

  /**
   * Watch for configuration changes (delegates to base repository)
   */
  watch(listener: IConfigChangeListener): () => void {
    return this.baseRepository.watch((event) => {
      // Clear cache on changes
      this.clearCache();
      void Promise.resolve(listener(event));
    });
  }

  /**
   * Reload configuration (delegates to base repository and clears cache)
   */
  async reload(): Promise<void> {
    await this.baseRepository.reload();
    this.clearCache();
  }

  /**
   * Dispose of resources (delegates to base repository and clears cache)
   */
  async dispose(): Promise<void> {
    await this.baseRepository.dispose();
    this.clearCache();
  }

  /**
   * Get repository metadata
   */
  getMetadata(): IRepositoryMetadata {
    const baseMetadata = this.baseRepository.getMetadata();
    return {
      source: `cached:${baseMetadata.source}`,
      type: "cached",
      platform: detectPlatform(),
      lastModified: baseMetadata.lastModified,
      isWatchable: baseMetadata.isWatchable,
      isWritable: baseMetadata.isWritable,
      version: {
        version: 1,
        timestamp: Date.now(),
        checksum: this.generateChecksum(JSON.stringify(this.getPerformanceMetrics())),
        metadata: {
          cacheStatistics: this.getCacheStatistics(),
          baseRepository: baseMetadata,
        },
      },
    };
  }

  /**
   * Generate simple checksum for metadata
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
