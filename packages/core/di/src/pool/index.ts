/**
 * Pool module - Object pooling for performance optimization
 */

// Object Pool Types
export type {
  EvictionPolicy,
  ValidationStrategy,
  PoolHealth,
  IPoolConfig,
  IPoolStats,
  IPoolPerformanceMetrics,
  IPooledInstance,
  PoolValidator,
  PoolFactory as PoolFactoryFunction,
  PoolCleanupHandler,
  IObjectPool,
  IPoolFactory,
  IPoolManager,
  IEnhancedTransientLifecycleConfig,
} from "./pool.types.js";

// Object Pool Schemas and Validation
export {
  evictionPolicySchema,
  validationStrategySchema,
  poolHealthSchema,
  poolConfigSchema,
  poolStatsSchema,
  poolPerformanceMetricsSchema,
  pooledInstanceSchema,
  DEFAULT_POOL_CONFIG,
  HIGH_PERFORMANCE_POOL_CONFIG,
  MEMORY_OPTIMIZED_POOL_CONFIG,
  validatePoolConfig,
  validatePoolStats,
  validatePoolPerformanceMetrics,
  validatePooledInstance,
  isPoolConfig,
  isPoolStats,
  isPoolPerformanceMetrics,
  isPooledInstance,
} from "./pool.schemas.js";

// Object Pool Classes
export {
  PoolError,
  PoolTimeoutError,
  PoolCapacityError,
  ObjectPool,
  PoolFactory,
  PoolManager,
  defaultPoolFactory,
  defaultPoolManager,
} from "./pool.classes.js";
