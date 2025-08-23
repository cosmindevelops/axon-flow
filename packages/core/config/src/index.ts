/**
 * @axon/config - Enterprise Configuration Management System
 *
 * Type-safe hierarchical configuration system with Zod validation, environment
 * variable integration, and repository pattern for flexible configuration sources.
 * Supports 10,000+ config reads/second with intelligent caching and validation.
 *
 * ## Foundation Layer Usage (Type Safety)
 * ```typescript
 * import type { IConfigRepository, BaseConfig, ConfigMetadata } from '@axon/config';
 *
 * // Type-safe configuration interfaces
 * interface AppConfig extends BaseConfig {
 *   database: { url: string; maxConnections: number };
 *   redis: { host: string; port: number };
 * }
 * ```
 *
 * ## Repository Layer Usage (Data Access)
 * ```typescript
 * import { EnvironmentConfigRepository, CompositeConfigRepository } from '@axon/config';
 *
 * const envRepo = new EnvironmentConfigRepository();
 * const compositeRepo = new CompositeConfigRepository([envRepo]);
 * const config = await compositeRepo.get('database.url');
 * ```
 *
 * ## Builder Layer Usage (Configuration Construction)
 * ```typescript
 * import { ConfigBuilder, EnvironmentConfigBuilder } from '@axon/config';
 *
 * const config = new ConfigBuilder()
 *   .withEnvironment('production')
 *   .withValidation(appConfigSchema)
 *   .build();
 * ```
 *
 * ## Instance Layer Usage (Ready-to-Use)
 * ```typescript
 * import { configManager, defaultConfigBuilder } from '@axon/config';
 *
 * // Pre-configured instances for immediate use
 * const appConfig = await configManager.load();
 * ```
 *
 * @since 0.1.0
 * @version 0.1.0
 * @module @axon/config
 */

// ============================================================================
// TYPE-ONLY EXPORTS - Zero Runtime Impact
// ============================================================================

// Foundation types - Core configuration interfaces and base abstractions
export type * from "./types/index.js";

// ============================================================================
// FOUNDATION LAYER - Core Configuration Schemas
// ============================================================================

// Configuration validation schemas (runtime with type inference)
export * from "./schemas/index.js";

// ============================================================================
// REPOSITORY LAYER - Configuration Data Access
// ============================================================================

// Repository implementations and schemas (with conflict resolution)
export {
  // Base repository patterns
  BaseConfigRepository,
  AbstractCachedConfigRepository,

  // Environment repository
  EnvironmentConfigRepository,

  // Memory repositories
  MemoryConfigRepository,
  CachedConfigRepository,

  // Storage repositories
  FileConfigRepository,
  LocalStorageConfigRepository,

  // Composite repositories
  CompositeConfigRepository,
} from "./repositories/index.js";

// Repository type definitions (avoiding ICompositeSource conflict with types)
export type {
  IRepositoryPerformanceMetrics,
  IRepositoryState,
  IMemoryConfigRepository,
  ICachedConfigRepository,
  IEnvironmentConfigRepository,
  IFileConfigRepository,
  ILocalStorageConfigRepository,
  ICompositeConfigRepository,
} from "./repositories/index.js";

// ============================================================================
// BUILDER LAYER - Configuration Construction Utilities
// ============================================================================

// Base builder abstractions and utilities
export * from "./builders/base/index.js";

// Environment-aware configuration builder
export * from "./builders/environment/index.js";

// Factory pattern for configuration builders
export * from "./builders/factory/index.js";

// Builder utility functions and helpers
export * from "./builders/utils/index.js";

// ============================================================================
// UTILITY LAYER - Supporting Functions and Helpers
// ============================================================================

// Configuration utility functions and validation helpers
export * from "./utils/index.js";

// ============================================================================
// INSTANCE LAYER - Pre-configured Ready-to-Use Configuration
// ============================================================================

// Default configuration instances (tree-shakeable)
export * from "./instances/index.js";
