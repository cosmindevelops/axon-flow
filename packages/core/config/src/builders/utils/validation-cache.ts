/**
 * Validation result caching for performance optimization
 * @module @axon/config/builders/utils/validation-cache
 */

import { ConfigurationError } from "@axon/errors";
import type { z } from "zod";

/**
 * Validation cache entry
 */
export interface IValidationCacheEntry {
  readonly result: unknown;
  readonly timestamp: number;
  readonly ttl: number;
  readonly schemaHash: string;
}

/**
 * Validation cache options
 */
export interface IValidationCacheOptions {
  /**
   * Maximum number of cached entries
   * @default 100
   */
  readonly maxSize?: number;

  /**
   * Default TTL for cache entries in milliseconds
   * @default 300000 (5 minutes)
   */
  readonly defaultTtl?: number;

  /**
   * Whether to enable the cache
   * @default true
   */
  readonly enabled?: boolean;
}

/**
 * Cache statistics
 */
export interface IValidationCacheStats {
  readonly size: number;
  readonly hits: number;
  readonly misses: number;
  readonly evictions: number;
  readonly hitRate: number;
}

/**
 * High-performance validation result cache
 */
export class ValidationCache {
  private readonly _cache = new Map<string, IValidationCacheEntry>();
  private readonly _maxSize: number;
  private readonly _defaultTtl: number;
  private readonly _enabled: boolean;

  // Statistics
  private _hits = 0;
  private _misses = 0;
  private _evictions = 0;

  constructor(options: IValidationCacheOptions = {}) {
    this._maxSize = options.maxSize ?? 100;
    this._defaultTtl = options.defaultTtl ?? 300000; // 5 minutes
    this._enabled = options.enabled ?? true;
  }

  /**
   * Get a cached validation result
   */
  get(key: string, schemaHash: string): unknown {
    if (!this._enabled) {
      return undefined;
    }

    const entry = this._cache.get(key);

    if (!entry) {
      this._misses++;
      return undefined;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now > entry.timestamp + entry.ttl) {
      this._cache.delete(key);
      this._misses++;
      return undefined;
    }

    // Check if schema has changed
    if (entry.schemaHash !== schemaHash) {
      this._cache.delete(key);
      this._misses++;
      return undefined;
    }

    this._hits++;
    return entry.result;
  }

  /**
   * Set a validation result in cache
   */
  set(key: string, value: unknown, schemaHash: string, ttl?: number): void {
    if (!this._enabled) {
      return;
    }

    // Evict oldest entries if at max capacity
    if (this._cache.size >= this._maxSize && !this._cache.has(key)) {
      this._evictOldest();
    }

    const entry: IValidationCacheEntry = {
      result: value,
      timestamp: Date.now(),
      ttl: ttl ?? this._defaultTtl,
      schemaHash,
    };

    this._cache.set(key, entry);
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this._cache.clear();
    this._hits = 0;
    this._misses = 0;
    this._evictions = 0;
  }

  /**
   * Remove expired entries from cache
   */
  cleanExpired(): number {
    if (!this._enabled) {
      return 0;
    }

    const now = Date.now();
    let removed = 0;

    const cacheEntries = Array.from(this._cache.entries());
    for (const [key, entry] of cacheEntries) {
      if (now > entry.timestamp + entry.ttl) {
        this._cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get cache statistics
   */
  getStats(): IValidationCacheStats {
    const total = this._hits + this._misses;
    const hitRate = total > 0 ? this._hits / total : 0;

    return {
      size: this._cache.size,
      hits: this._hits,
      misses: this._misses,
      evictions: this._evictions,
      hitRate,
    };
  }

  /**
   * Check if cache is enabled
   */
  get isEnabled(): boolean {
    return this._enabled;
  }

  /**
   * Evict the oldest entry from cache
   */
  private _evictOldest(): void {
    let oldestKey: string | undefined;
    let oldestTimestamp = Infinity;

    const cacheEntries = Array.from(this._cache.entries());
    for (const [key, entry] of cacheEntries) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this._cache.delete(oldestKey);
      this._evictions++;
    }
  }
}

/**
 * Schema hash generator for cache keys
 */
export function generateSchemaHash(schema: z.ZodType): string {
  try {
    // Create a simple hash based on schema shape
    const schemaString = JSON.stringify(schema.def);

    // Simple hash function (not cryptographically secure, but sufficient for caching)
    let hash = 0;
    for (let i = 0; i < schemaString.length; i++) {
      const char = schemaString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return hash.toString(36);
  } catch (_error) {
    // Fallback to timestamp-based hash if schema serialization fails
    return `fallback_${Date.now().toString()}_${Math.random().toString(36).slice(2)}`;
  }
}

/**
 * Generate cache key for configuration data
 */
export function generateConfigCacheKey(data: unknown): string {
  try {
    const dataString = JSON.stringify(data, null, 0);

    // Simple hash function for data
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `config_${hash.toString(36)}`;
  } catch (error) {
    throw new ConfigurationError("Failed to generate cache key for configuration data", {
      component: "ValidationCache",
      operation: "generateKey",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        dataType: typeof data,
      },
    });
  }
}

/**
 * Global validation cache instance
 */
export const globalValidationCache = new ValidationCache();
