/**
 * Builder Utility Types
 * Type definitions for builder utility classes and interfaces
 */

import type { z } from "zod";

/**
 * Generic object pool interface
 */
export interface IObjectPool<T> {
  /**
   * Acquire an object from the pool
   */
  acquire(): T;

  /**
   * Return an object to the pool
   */
  release(obj: T): void;

  /**
   * Clear all objects from the pool
   */
  clear(): void;

  /**
   * Get pool statistics
   */
  getStats(): IPoolStats;
}

/**
 * Pool statistics interface
 */
export interface IPoolStats {
  readonly size: number;
  readonly inUse: number;
  readonly available: number;
  readonly totalCreated: number;
  readonly totalAcquired: number;
  readonly totalReleased: number;
}

/**
 * Object pool configuration options
 */
export interface IObjectPoolOptions<T> {
  /**
   * Factory function to create new objects
   */
  readonly factory: () => T;

  /**
   * Reset function to clean objects before reuse
   */
  readonly reset?: (obj: T) => void;

  /**
   * Maximum pool size
   * @default 10
   */
  readonly maxSize?: number;

  /**
   * Initial pool size
   * @default 0
   */
  readonly initialSize?: number;
}

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
 * Repository factory function type
 */
export type RepositoryFactory<T> = () => T;

/**
 * Cache key generator function type
 */
export type CacheKeyGenerator = (schema: z.ZodSchema, data: unknown) => string;

/**
 * Schema hash generator function type
 */
export type SchemaHashGenerator = (schema: z.ZodSchema) => string;
