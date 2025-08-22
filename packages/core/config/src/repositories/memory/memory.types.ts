/**
 * Memory Configuration Repository Types
 * Type definitions for in-memory configuration management
 */

export interface IMemoryConfigRepository {
  readonly data: Record<string, unknown>;
  readonly readOnly?: boolean;
  readonly deepClone?: boolean;
}

export interface ICachedConfigRepository {
  readonly baseRepository: unknown;
  readonly cacheSize?: number;
  readonly cacheTTL?: number;
  readonly cacheKey?: string;
}

export interface IMemoryOptions {
  readonly data?: Record<string, unknown>;
  readonly readOnly?: boolean;
  readonly deepClone?: boolean;
  readonly validateData?: boolean;
}

export interface ICacheOptions {
  readonly cacheSize?: number;
  readonly cacheTTL?: number;
  readonly cacheKey?: string;
  readonly enableMetrics?: boolean;
}
