/**
 * Performance Optimization Utilities for Configuration Builders
 * Includes object pooling, validation caching, and performance measurement
 * @module @axon/config/builders/utils/performance-utils
 */

// ConfigurationError import removed as it's not used in this file
import type { z } from "zod";
import type {
  IObjectPool,
  IObjectPoolOptions,
  IPoolStats,
  IValidationCacheEntry,
  IValidationCacheOptions,
  IValidationCacheStats,
} from "./utils.types.js";

// =============================================================================
// OBJECT POOLING UTILITIES
// =============================================================================

/**
 * Generic object pool implementation for performance optimization
 */
export class ObjectPool<T> implements IObjectPool<T> {
  private readonly pool: T[] = [];
  private readonly inUseSet = new Set<T>();
  private readonly options: Required<IObjectPoolOptions<T>>;
  private stats = {
    totalCreated: 0,
    totalAcquired: 0,
    totalReleased: 0,
  };

  constructor(options: IObjectPoolOptions<T>) {
    this.options = {
      factory: options.factory,
      reset: options.reset || (() => {}),
      maxSize: options.maxSize || 10,
      initialSize: options.initialSize || 0,
    };

    // Pre-populate pool with initial objects
    for (let i = 0; i < this.options.initialSize; i++) {
      this.pool.push(this.createObject());
    }
  }

  /**
   * Acquire an object from the pool
   */
  acquire(): T {
    let obj = this.pool.pop();

    if (!obj) {
      obj = this.createObject();
    }

    this.inUseSet.add(obj);
    this.stats.totalAcquired++;

    return obj;
  }

  /**
   * Release an object back to the pool
   */
  release(obj: T): void {
    if (!this.inUseSet.has(obj)) {
      return; // Object was not acquired from this pool
    }

    this.inUseSet.delete(obj);

    // Reset object state before returning to pool
    this.options.reset(obj);

    // Only return to pool if under max size
    if (this.pool.length < this.options.maxSize) {
      this.pool.push(obj);
    }

    this.stats.totalReleased++;
  }

  /**
   * Get pool statistics
   */
  getStats(): IPoolStats {
    return {
      size: this.pool.length + this.inUseSet.size,
      inUse: this.inUseSet.size,
      available: this.pool.length,
      totalCreated: this.stats.totalCreated,
      totalAcquired: this.stats.totalAcquired,
      totalReleased: this.stats.totalReleased,
    };
  }

  /**
   * Clear the pool
   */
  clear(): void {
    this.pool.length = 0;
    this.inUseSet.clear();
    this.stats = {
      totalCreated: 0,
      totalAcquired: 0,
      totalReleased: 0,
    };
  }

  /**
   * Create a new object using the factory
   */
  private createObject(): T {
    this.stats.totalCreated++;
    return this.options.factory();
  }
}

/**
 * Global repository pool for reusing configuration repository instances
 */
const repositoryPools = new Map<string, ObjectPool<unknown>>();

/**
 * Test environment flag for unique pool keys
 */
let _isTestEnvironment = false;

/**
 * Get or create a repository pool
 */
export function getRepositoryPool<T extends object>(key: string, factory: () => T): ObjectPool<T> {
  if (!repositoryPools.has(key)) {
    repositoryPools.set(
      key,
      new ObjectPool<T>({
        factory,
        maxSize: 20,
        initialSize: 2,
      }) as ObjectPool<unknown>,
    );
  }
  return repositoryPools.get(key) as ObjectPool<T>;
}

// =============================================================================
// VALIDATION CACHING UTILITIES
// =============================================================================

/**
 * High-performance validation result cache
 */
export class ValidationCache {
  private readonly cache = new Map<string, IValidationCacheEntry>();
  private readonly options: Required<IValidationCacheOptions>;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor(options: IValidationCacheOptions = {}) {
    this.options = {
      maxSize: options.maxSize ?? 100,
      defaultTtl: options.defaultTtl ?? 300000, // 5 minutes
      enabled: options.enabled ?? true,
    };
  }

  /**
   * Get a cached validation result
   */
  get(key: string, schemaHash?: string): unknown | undefined {
    if (!this.options.enabled) {
      return undefined;
    }

    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check schema hash if provided
    if (schemaHash && entry.schemaHash !== schemaHash) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // Check if entry has expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    this.stats.hits++;
    return entry.result;
  }

  /**
   * Set a validation result in cache
   */
  set(key: string, result: unknown, schemaHash?: string, ttl?: number): void {
    if (!this.options.enabled) {
      return;
    }

    // Evict entries if cache is full
    if (this.cache.size >= this.options.maxSize) {
      this.evictOldest();
    }

    const entry: IValidationCacheEntry = {
      result,
      timestamp: Date.now(),
      ttl: ttl ?? this.options.defaultTtl,
      schemaHash: schemaHash ?? "",
    };

    this.cache.set(key, entry);
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
    };
  }

  /**
   * Get cache statistics
   */
  getStats(): IValidationCacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * Evict the oldest cache entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
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
      this.stats.evictions++;
    }
  }
}

/**
 * Global validation cache instance
 */
export const globalValidationCache = new ValidationCache();

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate a cache key from configuration data
 */
export function generateConfigCacheKey(data: unknown): string {
  try {
    const dataString = JSON.stringify(data);
    return generateHash(dataString);
  } catch {
    return generateHash(String(data));
  }
}

/**
 * Generate a hash for a Zod schema
 */
export function generateSchemaHash(schema: z.ZodSchema): string {
  try {
    const schemaString = JSON.stringify(schema._def);
    return generateHash(schemaString);
  } catch {
    return generateHash(String(schema));
  }
}

/**
 * Generate a simple hash from a string
 */
function generateHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Set test environment mode for unique pool keys
 */
export function setTestEnvironment(testMode: boolean): void {
  _isTestEnvironment = testMode;
}

/**
 * Clear all repository pools (for testing)
 */
export function clearAllRepositoryPools(): void {
  const pools = Array.from(repositoryPools.values());
  for (const pool of pools) {
    pool.clear();
  }
  repositoryPools.clear();
}
