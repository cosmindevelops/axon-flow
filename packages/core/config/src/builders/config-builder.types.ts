/**
 * Configuration Builder Type Definitions
 * @module @axon/config/builders/types
 */

import type { z } from "zod";
import type { ICompositeConfigOptions } from "../repositories/composite-config.repository.js";
import type { IFileConfigOptions } from "../repositories/file-config.repository.js";
import type { ILocalStorageConfigOptions } from "../repositories/localstorage-config.repository.js";
import type { ConfigPlatform, ICompositeSource, IConfigRepository } from "../types/index.js";

/**
 * Environment variable configuration options for builder
 */
export interface IEnvironmentBuilderOptions {
  /**
   * Prefix to filter environment variables
   * @example "AXON_" to match AXON_DATABASE_URL
   */
  readonly prefix?: string;

  /**
   * Transform environment variable names to nested keys
   * @default true
   */
  readonly transformKeys?: boolean;

  /**
   * Parse boolean and numeric values automatically
   * @default true
   */
  readonly parseValues?: boolean;

  /**
   * Priority for this source in composite configuration
   * @default 100
   */
  readonly priority?: number;
}

/**
 * File configuration options for builder
 */
export interface IFileBuilderOptions extends Omit<IFileConfigOptions, "filePath"> {
  /**
   * Priority for this source in composite configuration
   * @default 50
   */
  readonly priority?: number;
}

/**
 * Memory configuration options for builder
 */
export interface IMemoryBuilderOptions {
  /**
   * Priority for this source in composite configuration
   * @default 0
   */
  readonly priority?: number;

  /**
   * Whether this memory source should be writable
   * @default true
   */
  readonly writable?: boolean;
}

/**
 * LocalStorage configuration options for builder
 */
export interface ILocalStorageBuilderOptions extends ILocalStorageConfigOptions {
  /**
   * Priority for this source in composite configuration
   * @default 25
   */
  readonly priority?: number;
}

/**
 * Caching configuration options for builder
 */
export interface ICacheBuilderOptions {
  /**
   * Priority for this source in composite configuration
   * Higher priority = loaded first
   * @default 200
   */
  readonly priority?: number;

  /**
   * TTL for cached values in milliseconds
   * @default 300000 (5 minutes)
   */
  readonly ttl?: number;

  /**
   * Maximum number of cached entries
   * @default 1000
   */
  readonly maxSize?: number;
}

/**
 * Custom repository configuration for builder
 */
export interface ICustomBuilderOptions {
  /**
   * The repository instance to add
   */
  readonly repository: IConfigRepository;

  /**
   * Priority for this source in composite configuration
   */
  readonly priority: number;

  /**
   * Optional prefix for configuration keys
   */
  readonly prefix?: string;

  /**
   * Whether this source is enabled
   * @default true
   */
  readonly enabled?: boolean;
}

/**
 * Validation options for builder
 */
export interface IBuilderValidationOptions {
  /**
   * Whether to validate configuration at build time
   * @default true
   */
  readonly enabled?: boolean;

  /**
   * Zod schema to validate against
   */
  readonly schema?: z.ZodType;

  /**
   * Whether to fail fast on validation errors
   * @default true
   */
  readonly failFast?: boolean;

  /**
   * Custom error message for validation failures
   */
  readonly errorMessage?: string;
}

/**
 * Performance optimization options for builder
 */
export interface IBuilderPerformanceOptions {
  /**
   * Whether to enable object pooling for repositories
   * @default true
   */
  readonly useObjectPool?: boolean;

  /**
   * Whether to enable lazy loading of sources
   * @default true
   */
  readonly lazyLoading?: boolean;

  /**
   * Whether to cache build results
   * @default true
   */
  readonly cacheBuildResults?: boolean;

  /**
   * Maximum number of cached builders
   * @default 50
   */
  readonly maxCachedBuilders?: number;
}

/**
 * Main configuration builder options
 */
export interface IConfigBuilderOptions extends Omit<ICompositeConfigOptions, "sources"> {
  /**
   * Platform-specific optimizations
   */
  readonly platform?: ConfigPlatform;

  /**
   * Validation configuration
   */
  readonly validation?: IBuilderValidationOptions;

  /**
   * Performance optimization settings
   */
  readonly performance?: IBuilderPerformanceOptions;

  /**
   * Development mode settings
   * @default false
   */
  readonly developmentMode?: boolean;
}

/**
 * Environment-specific builder configuration
 */
export interface IEnvironmentBuilderConfig {
  /**
   * Default sources for this environment
   */
  readonly defaultSources?: ICompositeSource[];

  /**
   * Performance settings optimized for environment
   */
  readonly performance?: IBuilderPerformanceOptions;

  /**
   * Validation settings for environment
   */
  readonly validation?: IBuilderValidationOptions;

  /**
   * Hot-reload configuration
   */
  readonly hotReload?: {
    readonly enabled: boolean;
    readonly debounceMs?: number;
  };
}

/**
 * Builder state for tracking configuration
 */
export interface IBuilderState {
  /**
   * Sources added to this builder
   */
  readonly sources: ICompositeSource[];

  /**
   * Whether the builder has been finalized
   */
  readonly isBuilt: boolean;

  /**
   * Performance metrics
   */
  readonly metrics?: {
    readonly buildTime: number;
    readonly sourceCount: number;
    readonly cacheHits: number;
    readonly cacheMisses: number;
  };
}

/**
 * Factory options for creating builders
 */
export interface IConfigBuilderFactoryOptions {
  /**
   * Environment to create builder for
   * @default process.env.NODE_ENV || 'development'
   */
  readonly environment?: string;

  /**
   * Custom builder configurations by environment
   */
  readonly environmentConfigs?: Record<string, IEnvironmentBuilderConfig>;

  /**
   * Global performance settings
   */
  readonly performance?: IBuilderPerformanceOptions;

  /**
   * Dependency injection container for custom repositories
   */
  readonly container?: Map<string, () => IConfigRepository>;
}

/**
 * Merge strategy types for configuration composition
 */
export type ConfigMergeStrategy = "deep" | "replace" | "custom";

/**
 * Builder method return type for fluent interface
 */
export interface IFluentConfigBuilder {
  /**
   * Add environment variable source
   */
  withEnvironment(options?: IEnvironmentBuilderOptions): this;

  /**
   * Add file-based configuration source
   */
  withFile(filePath: string, options?: IFileBuilderOptions): this;

  /**
   * Add in-memory configuration source
   */
  withMemory(data: Record<string, unknown>, options?: IMemoryBuilderOptions): this;

  /**
   * Add localStorage-based configuration source
   */
  withLocalStorage(options?: ILocalStorageBuilderOptions): this;

  /**
   * Add caching layer
   */
  withCache(options?: ICacheBuilderOptions): this;

  /**
   * Add custom repository source
   */
  withCustom(options: ICustomBuilderOptions): this;

  /**
   * Set merge strategy for configuration composition
   */
  withMergeStrategy(strategy: ConfigMergeStrategy): this;

  /**
   * Enable or disable hot-reload
   */
  withHotReload(enabled: boolean, debounceMs?: number): this;

  /**
   * Add validation schema
   */
  withValidation(options: IBuilderValidationOptions): this;

  /**
   * Build the composite configuration repository
   */
  build(): IConfigRepository;
}
