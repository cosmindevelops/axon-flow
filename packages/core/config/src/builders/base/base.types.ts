/**
 * Base Configuration Builder Types
 * Core type definitions for the builder pattern implementation
 */

import type { z } from "zod";
import type { ConfigPlatform, ICompositeSource, IConfigRepository } from "../../types/index.js";

/**
 * Configuration merge strategies for combining multiple sources
 */
export type ConfigMergeStrategy = "shallow" | "deep" | "replace" | "custom";

/**
 * Base configuration builder options
 */
export interface IConfigBuilderOptions {
  /**
   * Platform for this builder instance
   * @default "auto-detect"
   */
  readonly platform?: ConfigPlatform;

  /**
   * Enable validation caching for better performance
   * @default true
   */
  readonly enableValidationCache?: boolean;

  /**
   * Enable repository object pooling
   * @default true
   */
  readonly enableObjectPooling?: boolean;
}

/**
 * Builder internal state tracking
 */
export interface IBuilderState {
  readonly sources: ICompositeSource[];
  readonly mergeStrategy: ConfigMergeStrategy;
  readonly platform: ConfigPlatform;
  readonly validationOptions: IBuilderValidationOptions;
}

/**
 * Validation options for the builder
 */
export interface IBuilderValidationOptions {
  readonly strict?: boolean;
  readonly allowUnknownKeys?: boolean;
  readonly errorOnInvalidSchema?: boolean;
}

/**
 * Main fluent configuration builder interface
 */
export interface IFluentConfigBuilder {
  // Environment source methods
  fromEnvironment(options?: IEnvironmentBuilderOptions): IFluentConfigBuilder;

  // File source methods
  fromFile(filePath: string, options?: IFileBuilderOptions): IFluentConfigBuilder;

  // Memory source methods
  fromMemory(data: Record<string, unknown>, options?: IMemoryBuilderOptions): IFluentConfigBuilder;

  // LocalStorage source methods
  fromLocalStorage(options?: ILocalStorageBuilderOptions): IFluentConfigBuilder;

  // Caching methods
  withCache(options?: ICacheBuilderOptions): IFluentConfigBuilder;

  // Custom repository methods
  withCustomRepository(repository: IConfigRepository, options?: ICustomBuilderOptions): IFluentConfigBuilder;

  // Configuration methods
  withMergeStrategy(strategy: ConfigMergeStrategy): IFluentConfigBuilder;
  withValidation(options: IBuilderValidationOptions): IFluentConfigBuilder;

  // Build methods
  build<T extends z.ZodType>(schema: T): IConfigRepository;
  buildComposite(): IConfigRepository;
}

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
 * File-based configuration builder options
 */
export interface IFileBuilderOptions {
  /**
   * File format override (auto-detected if not specified)
   */
  readonly format?: string;

  /**
   * Watch for file changes
   * @default false
   */
  readonly watch?: boolean;

  /**
   * Priority for this source in composite configuration
   * @default 200
   */
  readonly priority?: number;
}

/**
 * Memory-based configuration builder options
 */
export interface IMemoryBuilderOptions {
  /**
   * Make the memory repository writable
   * @default false
   */
  readonly writable?: boolean;

  /**
   * Priority for this source in composite configuration
   * @default 50
   */
  readonly priority?: number;
}

/**
 * LocalStorage-based configuration builder options
 */
export interface ILocalStorageBuilderOptions {
  /**
   * Key prefix for localStorage keys
   * @default "axon-config"
   */
  readonly keyPrefix?: string;

  /**
   * Priority for this source in composite configuration
   * @default 75
   */
  readonly priority?: number;
}

/**
 * Cache configuration builder options
 */
export interface ICacheBuilderOptions {
  /**
   * Cache TTL in milliseconds
   * @default 300000 (5 minutes)
   */
  readonly ttl?: number;

  /**
   * Maximum cache size
   * @default 1000
   */
  readonly maxSize?: number;
}

/**
 * Custom repository builder options
 */
export interface ICustomBuilderOptions {
  /**
   * Priority for this source in composite configuration
   * @default 150
   */
  readonly priority?: number;

  /**
   * Custom prefix for keys from this repository
   */
  readonly prefix?: string;
}
