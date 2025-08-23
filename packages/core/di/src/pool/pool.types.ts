import type { DIToken } from "../container/container.types.js";

/**
 * Eviction policies for managing pool overflow
 */
export type EvictionPolicy = "LRU" | "FIFO" | "LIFO" | "RANDOM";

/**
 * Pool validation strategies
 */
export type ValidationStrategy = "ON_ACQUIRE" | "ON_RELEASE" | "PERIODIC" | "DISABLED";

/**
 * Pool health status
 */
export type PoolHealth = "HEALTHY" | "WARNING" | "CRITICAL" | "DISABLED";

/**
 * Configuration for object pool behavior
 */
export interface IPoolConfig {
  /** Minimum number of instances to maintain in pool */
  minSize: number;

  /** Maximum number of instances allowed in pool */
  maxSize: number;

  /** Policy for evicting instances when pool is full */
  evictionPolicy: EvictionPolicy;

  /** Strategy for validating instances */
  validationStrategy: ValidationStrategy;

  /** Interval for periodic validation in milliseconds */
  validationInterval: number;

  /** Timeout for instance creation in milliseconds */
  createTimeout: number;

  /** Timeout for instance acquisition in milliseconds */
  acquireTimeout: number;

  /** Enable comprehensive metrics collection */
  enableMetrics: boolean;

  /** Maximum idle time before instance eviction in milliseconds */
  maxIdleTime: number;

  /** Enable automatic pool warming */
  enableWarmup: boolean;
}

/**
 * Statistics and performance metrics for object pool
 */
export interface IPoolStats {
  /** Current number of instances in pool */
  poolSize: number;

  /** Number of instances currently in use */
  activeInstances: number;

  /** Total instances acquired since pool creation */
  totalAcquired: number;

  /** Total instances released since pool creation */
  totalReleased: number;

  /** Total instances created since pool creation */
  totalCreated: number;

  /** Total instances destroyed since pool creation */
  totalDestroyed: number;

  /** Number of successful pool hits */
  poolHits: number;

  /** Number of pool misses (had to create new instances) */
  poolMisses: number;

  /** Current cache hit ratio (0-1) */
  hitRatio: number;

  /** Average acquisition time in milliseconds */
  averageAcquireTime: number;

  /** Average creation time in milliseconds */
  averageCreateTime: number;

  /** Number of validation failures */
  validationFailures: number;

  /** Number of instances evicted */
  evictedInstances: number;

  /** Current pool health status */
  health: PoolHealth;

  /** Last validation timestamp */
  lastValidation: number;

  /** Peak pool size reached */
  peakPoolSize: number;

  /** Memory usage estimation in bytes */
  estimatedMemoryUsage: number;
}

/**
 * Performance metrics specific to pool operations
 */
export interface IPoolPerformanceMetrics {
  /** Recent acquire times for moving average */
  recentAcquireTimes: number[];

  /** Recent create times for moving average */
  recentCreateTimes: number[];

  /** Timestamp of last metrics reset */
  lastReset: number;

  /** Total operation count since last reset */
  totalOperations: number;

  /** Failed operations count */
  failedOperations: number;
}

/**
 * Instance wrapper for pool management
 */
export interface IPooledInstance<T> {
  /** The actual instance */
  instance: T;

  /** Timestamp when instance was created */
  createdAt: number;

  /** Timestamp when instance was last acquired */
  lastAcquired: number;

  /** Timestamp when instance was last released */
  lastReleased: number;

  /** Number of times this instance has been acquired */
  acquireCount: number;

  /** Whether instance is currently in use */
  inUse: boolean;

  /** Instance validation state */
  isValid: boolean;

  /** Unique identifier for this pooled instance */
  id: string;
}

/**
 * Validation function for pool instances
 */
export type PoolValidator<T> = (instance: T) => boolean | Promise<boolean>;

/**
 * Factory function for creating new instances
 */
export type PoolFactory<T> = () => T | Promise<T>;

/**
 * Cleanup function for destroying instances
 */
export type PoolCleanupHandler<T> = (instance: T) => void | Promise<void>;

/**
 * Main object pool interface
 */
export interface IObjectPool<T> {
  /** Pool configuration */
  readonly config: IPoolConfig;

  /** Current pool statistics */
  readonly stats: IPoolStats;

  /** Pool token for identification */
  readonly token: DIToken<T>;

  /**
   * Acquire an instance from the pool
   */
  acquire(): Promise<T>;

  /**
   * Release an instance back to the pool
   */
  release(instance: T): Promise<void>;

  /**
   * Drain all instances from the pool
   */
  drain(): Promise<void>;

  /**
   * Warm up the pool by pre-creating instances
   */
  warmup(): Promise<void>;

  /**
   * Alias for warmup method (camelCase naming convention)
   */
  warmUp(): Promise<void>;

  /**
   * Validate all instances in the pool
   */
  validate(): Promise<void>;

  /**
   * Get current pool statistics
   */
  getStats(): IPoolStats;

  /**
   * Reset pool statistics
   */
  resetStats(): void;

  /**
   * Check if pool is healthy
   */
  isHealthy(): boolean;

  /**
   * Resize the pool
   */
  resize(newMinSize: number, newMaxSize: number): Promise<void>;

  /**
   * Destroy the pool and cleanup all resources
   */
  destroy(): Promise<void>;
}

/**
 * Factory for creating object pools
 */
export interface IPoolFactory {
  /**
   * Create a new object pool
   */
  createPool<T>(
    token: DIToken<T>,
    factory: PoolFactory<T>,
    config: IPoolConfig,
    validator?: PoolValidator<T>,
    cleanupHandler?: PoolCleanupHandler<T>,
  ): IObjectPool<T>;

  /**
   * Create pool with default configuration
   */
  createDefaultPool<T>(token: DIToken<T>, factory: PoolFactory<T>): IObjectPool<T>;

  /**
   * Get default pool configuration
   */
  getDefaultConfig(): IPoolConfig;
}

/**
 * Pool manager for handling multiple pools
 */
export interface IPoolManager {
  /**
   * Register a new pool
   */
  registerPool<T>(pool: IObjectPool<T>): void;

  /**
   * Get pool by token
   */
  getPool<T>(token: DIToken<T>): IObjectPool<T> | undefined;

  /**
   * Remove pool by token
   */
  removePool<T>(token: DIToken<T>): Promise<boolean>;

  /**
   * Get all registered pools
   */
  getAllPools(): IObjectPool<unknown>[];

  /**
   * Get aggregated statistics for all pools
   */
  getAggregatedStats(): IPoolStats;

  /**
   * Validate all pools
   */
  validateAllPools(): Promise<void>;

  /**
   * Drain all pools
   */
  drainAllPools(): Promise<void>;

  /**
   * Destroy all pools and cleanup resources
   */
  destroyAllPools(): Promise<void>;
}

/**
 * Enhanced transient lifecycle configuration with advanced pooling
 */
export interface IEnhancedTransientLifecycleConfig {
  /** Track transient instances for metrics */
  trackInstances?: boolean;

  /** Enable advanced pooling with full configuration */
  poolConfig?: IPoolConfig;

  /** Custom pool validator */
  validator?: PoolValidator<unknown>;

  /** Custom cleanup handler */
  cleanupHandler?: PoolCleanupHandler<unknown>;
}
