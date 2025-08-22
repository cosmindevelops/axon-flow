/**
 * Base Repository Types
 * Core type definitions for configuration repository implementations
 */

/**
 * Repository performance metrics
 */
export interface IRepositoryPerformanceMetrics {
  readonly loadTime: number;
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly totalLoads: number;
  readonly averageLoadTime: number;
  readonly errorCount: number;
}

/**
 * Cache entry for configuration values
 */
export interface IRepositoryCacheEntry<T = unknown> {
  readonly value: T;
  readonly timestamp: number;
  readonly schemaHash: string;
  readonly accessCount: number;
  readonly ttl: number;
}

/**
 * Repository cache options
 */
export interface IRepositoryCacheOptions {
  /**
   * Maximum cache size
   * @default 100
   */
  readonly maxSize?: number;

  /**
   * Cache TTL in milliseconds
   * @default 300000 (5 minutes)
   */
  readonly ttl?: number;

  /**
   * Whether caching is enabled
   * @default true
   */
  readonly enabled?: boolean;
}

/**
 * Repository loading options
 */
export interface IRepositoryLoadOptions {
  /**
   * Whether to use cached results
   * @default true
   */
  readonly useCache?: boolean;

  /**
   * Whether to validate against schema
   * @default true
   */
  readonly validate?: boolean;

  /**
   * Timeout for loading operations in milliseconds
   * @default 5000
   */
  readonly timeout?: number;
}

/**
 * Repository error context
 */
export interface IRepositoryErrorContext {
  readonly repository: string;
  readonly operation: string;
  readonly source?: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Repository state information
 */
export interface IRepositoryState {
  readonly initialized: boolean;
  readonly loading: boolean;
  readonly lastLoaded?: Date;
  readonly errorCount: number;
  readonly performanceMetrics: IRepositoryPerformanceMetrics;
}
