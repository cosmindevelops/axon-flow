import { z } from "zod";
import type {
  EvictionPolicy,
  IPoolConfig,
  IPoolStats,
  IPoolPerformanceMetrics,
  IPooledInstance,
  PoolHealth,
  ValidationStrategy,
} from "./pool.types.js";

/**
 * Schema for eviction policy validation
 */
export const evictionPolicySchema = z.enum(["LRU", "FIFO", "LIFO", "RANDOM"]) satisfies z.ZodType<EvictionPolicy>;

/**
 * Schema for validation strategy validation
 */
export const validationStrategySchema = z.enum([
  "ON_ACQUIRE",
  "ON_RELEASE",
  "PERIODIC",
  "DISABLED",
]) satisfies z.ZodType<ValidationStrategy>;

/**
 * Schema for pool health status validation
 */
export const poolHealthSchema = z.enum(["HEALTHY", "WARNING", "CRITICAL", "DISABLED"]) satisfies z.ZodType<PoolHealth>;

/**
 * Schema for pool configuration validation
 */
export const poolConfigSchema = z
  .object({
    minSize: z.number().int().min(0).max(1000),
    maxSize: z.number().int().min(1).max(10000),
    evictionPolicy: evictionPolicySchema,
    validationStrategy: validationStrategySchema,
    validationInterval: z.number().int().min(1000).max(300000),
    createTimeout: z.number().int().min(100).max(30000),
    acquireTimeout: z.number().int().min(100).max(10000),
    enableMetrics: z.boolean(),
    maxIdleTime: z.number().int().min(1000).max(3600000),
    enableWarmup: z.boolean(),
  })
  .refine((config) => config.minSize <= config.maxSize, {
    message: "minSize must be less than or equal to maxSize",
    path: ["minSize"],
  }) satisfies z.ZodType<IPoolConfig>;

/**
 * Schema for pool statistics validation
 */
export const poolStatsSchema = z.object({
  poolSize: z.number().int().min(0),
  activeInstances: z.number().int().min(0),
  totalAcquired: z.number().int().min(0),
  totalReleased: z.number().int().min(0),
  totalCreated: z.number().int().min(0),
  totalDestroyed: z.number().int().min(0),
  poolHits: z.number().int().min(0),
  poolMisses: z.number().int().min(0),
  hitRatio: z.number().min(0).max(1),
  averageAcquireTime: z.number().min(0),
  averageCreateTime: z.number().min(0),
  validationFailures: z.number().int().min(0),
  evictedInstances: z.number().int().min(0),
  health: poolHealthSchema,
  lastValidation: z.number().int().min(0),
  peakPoolSize: z.number().int().min(0),
  estimatedMemoryUsage: z.number().int().min(0),
}) satisfies z.ZodType<IPoolStats>;

/**
 * Schema for pool performance metrics validation
 */
export const poolPerformanceMetricsSchema = z.object({
  recentAcquireTimes: z.array(z.number().min(0)).max(100),
  recentCreateTimes: z.array(z.number().min(0)).max(100),
  lastReset: z.number().int().min(0),
  totalOperations: z.number().int().min(0),
  failedOperations: z.number().int().min(0),
}) satisfies z.ZodType<IPoolPerformanceMetrics>;

/**
 * Schema for pooled instance validation
 */
export const pooledInstanceSchema = z.object({
  instance: z.unknown(),
  createdAt: z.number().int().min(0),
  lastAcquired: z.number().int().min(0),
  lastReleased: z.number().int().min(0),
  acquireCount: z.number().int().min(0),
  inUse: z.boolean(),
  isValid: z.boolean(),
  id: z.string().min(1),
}) satisfies z.ZodType<IPooledInstance<unknown>>;

/**
 * Default pool configuration
 */
export const DEFAULT_POOL_CONFIG: IPoolConfig = {
  minSize: 5,
  maxSize: 50,
  evictionPolicy: "LRU",
  validationStrategy: "ON_ACQUIRE",
  validationInterval: 30000,
  createTimeout: 5000,
  acquireTimeout: 2000,
  enableMetrics: true,
  maxIdleTime: 300000,
  enableWarmup: false,
};

/**
 * High-performance pool configuration
 */
export const HIGH_PERFORMANCE_POOL_CONFIG: IPoolConfig = {
  minSize: 10,
  maxSize: 100,
  evictionPolicy: "LRU",
  validationStrategy: "PERIODIC",
  validationInterval: 60000,
  createTimeout: 3000,
  acquireTimeout: 1000,
  enableMetrics: true,
  maxIdleTime: 600000,
  enableWarmup: true,
};

/**
 * Memory-optimized pool configuration
 */
export const MEMORY_OPTIMIZED_POOL_CONFIG: IPoolConfig = {
  minSize: 2,
  maxSize: 20,
  evictionPolicy: "LRU",
  validationStrategy: "ON_RELEASE",
  validationInterval: 15000,
  createTimeout: 2000,
  acquireTimeout: 1500,
  enableMetrics: false,
  maxIdleTime: 120000,
  enableWarmup: false,
};

/**
 * Validates pool configuration
 */
export function validatePoolConfig(config: unknown): IPoolConfig {
  return poolConfigSchema.parse(config);
}

/**
 * Validates pool statistics
 */
export function validatePoolStats(stats: unknown): IPoolStats {
  return poolStatsSchema.parse(stats);
}

/**
 * Validates pool performance metrics
 */
export function validatePoolPerformanceMetrics(metrics: unknown): IPoolPerformanceMetrics {
  return poolPerformanceMetricsSchema.parse(metrics);
}

/**
 * Validates pooled instance
 */
export function validatePooledInstance<T>(instance: unknown): IPooledInstance<T> {
  return pooledInstanceSchema.parse(instance) as IPooledInstance<T>;
}

/**
 * Type guard for pool configuration
 */
export function isPoolConfig(config: unknown): config is IPoolConfig {
  return poolConfigSchema.safeParse(config).success;
}

/**
 * Type guard for pool statistics
 */
export function isPoolStats(stats: unknown): stats is IPoolStats {
  return poolStatsSchema.safeParse(stats).success;
}

/**
 * Type guard for pool performance metrics
 */
export function isPoolPerformanceMetrics(metrics: unknown): metrics is IPoolPerformanceMetrics {
  return poolPerformanceMetricsSchema.safeParse(metrics).success;
}

/**
 * Type guard for pooled instance
 */
export function isPooledInstance<T>(instance: unknown): instance is IPooledInstance<T> {
  return pooledInstanceSchema.safeParse(instance).success;
}
