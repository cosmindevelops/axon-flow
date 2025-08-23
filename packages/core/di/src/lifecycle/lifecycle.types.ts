/**
 * Lifecycle management types
 *
 * Defines interfaces and types for managing instance lifecycles in the DI container
 */

import type { DIToken, IResolutionContext } from "../container/container.types.js";
import type { IPoolConfig, PoolValidator, PoolCleanupHandler } from "../pool/pool.types.js";

/**
 * Lifecycle strategy enumeration
 */
export type LifecycleStrategy = "singleton" | "transient" | "scoped";

/**
 * Lifecycle management interface
 */
export interface ILifecycleManager<T = unknown> {
  /** Lifecycle strategy name */
  readonly strategy: LifecycleStrategy;

  /**
   * Get or create instance based on lifecycle strategy
   */
  getInstance(token: DIToken<T>, factory: () => T, context?: IResolutionContext): T;

  /**
   * Check if instance exists for token
   */
  hasInstance(token: DIToken<T>, context?: IResolutionContext): boolean;

  /**
   * Clear instance for token
   */
  clearInstance(token: DIToken<T>, context?: IResolutionContext): boolean;

  /**
   * Clear all instances managed by this lifecycle
   */
  clearAll(): void;

  /**
   * Get statistics about managed instances
   */
  getStats(): ILifecycleStats;

  /**
   * Dispose lifecycle manager and cleanup resources
   */
  dispose(): void;
}

/**
 * Lifecycle statistics
 */
export interface ILifecycleStats {
  /** Total number of instances created */
  totalInstancesCreated: number;

  /** Current number of cached instances */
  cachedInstancesCount: number;

  /** Cache hit ratio (for singleton/scoped) */
  cacheHitRatio: number;

  /** Memory usage estimation in bytes */
  estimatedMemoryUsage: number;

  /** Average instance creation time in milliseconds */
  averageCreationTime: number;

  /** Peak instance creation time in milliseconds */
  peakCreationTime: number;
}

/**
 * Singleton lifecycle configuration
 */
export interface ISingletonLifecycleConfig {
  /** Enable lazy initialization (create only when needed) */
  lazy?: boolean;

  /** Enable thread safety (for multi-threaded environments) */
  threadSafe?: boolean;

  /** Maximum instances to cache */
  maxInstances?: number;
}

/**
 * Scoped lifecycle configuration
 */
export interface IScopedLifecycleConfig {
  /** Scope isolation strategy */
  isolationStrategy?: "strict" | "inherited";

  /** Auto-dispose scoped instances when scope ends */
  autoDispose?: boolean;

  /** Maximum scoped instances per scope */
  maxInstancesPerScope?: number;
}

/**
 * Transient lifecycle configuration
 */
export interface ITransientLifecycleConfig {
  /** Track transient instances for metrics */
  trackInstances?: boolean;

  /** Enable instance pooling for performance */
  enablePooling?: boolean;

  /** Pool size for instance reuse */
  poolSize?: number;

  /** Advanced pool configuration - takes precedence over enablePooling/poolSize */
  poolConfig?: IPoolConfig;

  /** Custom pool validator */
  validator?: PoolValidator<unknown>;

  /** Custom cleanup handler */
  cleanupHandler?: PoolCleanupHandler<unknown>;
}

/**
 * Lifecycle factory interface for creating lifecycle managers
 */
export interface ILifecycleFactory {
  /**
   * Create singleton lifecycle manager
   */
  createSingleton<T>(config?: ISingletonLifecycleConfig): ILifecycleManager<T>;

  /**
   * Create transient lifecycle manager
   */
  createTransient<T>(config?: ITransientLifecycleConfig): ILifecycleManager<T>;

  /**
   * Create scoped lifecycle manager
   */
  createScoped<T>(config?: IScopedLifecycleConfig): ILifecycleManager<T>;

  /**
   * Get lifecycle manager for strategy
   */
  getLifecycleManager<T>(strategy: LifecycleStrategy, config?: unknown): ILifecycleManager<T>;
}

/**
 * Scope management interface for handling dependency scopes
 */
export interface IScopeManager {
  /** Unique scope identifier */
  readonly scopeId: string;

  /** Parent scope (for nested scopes) */
  readonly parent?: IScopeManager;

  /**
   * Get scoped instance for token
   */
  getInstance<T>(token: DIToken<T>): T | undefined;

  /**
   * Set scoped instance for token (sync version for backward compatibility)
   */
  setInstance<T>(token: DIToken<T>, instance: T): void;
  /**
   * Set scoped instance for token (async version with thread safety)
   */
  setInstance<T>(token: DIToken<T>, instance: T, options: { async: true }): Promise<void>;

  /**
   * Remove scoped instance for token (sync version for backward compatibility)
   */
  removeInstance<T>(token: DIToken<T>): boolean;
  /**
   * Remove scoped instance for token (async version with thread safety)
   */
  removeInstance<T>(token: DIToken<T>, options: { async: true }): Promise<boolean>;

  /**
   * Check if token has scoped instance
   */
  hasInstance<T>(token: DIToken<T>): boolean;

  /**
   * Create child scope (sync version for backward compatibility)
   */
  createChildScope(scopeId?: string): IScopeManager;
  /**
   * Create child scope (async version with thread safety)
   */
  createChildScope(scopeId?: string, options?: { async: true }): Promise<IScopeManager>;

  /**
   * Clear all instances in this scope (sync version for backward compatibility)
   */
  clear(): void;
  /**
   * Clear all instances in this scope (async version with thread safety)
   */
  clear(options: { async: true }): Promise<void>;

  /**
   * Dispose scope and cleanup resources (sync version for backward compatibility)
   */
  dispose(): void;
  /**
   * Dispose scope and cleanup resources (async version with thread safety)
   */
  dispose(options: { async: true }): Promise<void>;

  /**
   * Get scope statistics
   */
  getStats(): IScopeStats;
}

/**
 * Scope statistics
 */
export interface IScopeStats {
  /** Scope identifier */
  scopeId: string;

  /** Number of instances in scope */
  instanceCount: number;

  /** Scope creation time */
  createdAt: Date;

  /** Scope last access time */
  lastAccessedAt: Date;

  /** Child scopes count */
  childScopesCount: number;

  /** Memory usage estimation */
  estimatedMemoryUsage: number;
}

/**
 * Lifecycle performance metrics
 */
export interface ILifecyclePerformanceMetrics {
  /** Metrics by lifecycle strategy */
  byStrategy: Record<LifecycleStrategy, ILifecycleStats>;

  /** Overall performance metrics */
  overall: {
    /** Total instances across all lifecycles */
    totalInstances: number;

    /** Total memory usage across all lifecycles */
    totalMemoryUsage: number;

    /** Average creation time across all lifecycles */
    averageCreationTime: number;

    /** Cache efficiency percentage */
    cacheEfficiency: number;
  };
}