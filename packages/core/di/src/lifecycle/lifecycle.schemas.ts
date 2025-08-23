/**
 * Lifecycle management validation schemas
 *
 * Zod schemas for validating lifecycle configurations and statistics
 */

import { z } from "zod";
import type { LifecycleStrategy } from "./lifecycle.types.js";

/**
 * Lifecycle strategy validation schema
 */
export const lifecycleStrategySchema = z.enum([
  "singleton",
  "transient",
  "scoped",
] as const) satisfies z.ZodType<LifecycleStrategy>;

/**
 * DI token validation schema - simplified to avoid complex function validation
 */
export const lifecycleDITokenSchema = z.union([
  z.string().min(1, "Token string cannot be empty"),
  z.symbol(),
  z.any().refine((val) => typeof val === "function", "Must be a function"),
]);

/**
 * Lifecycle statistics validation schema
 */
export const lifecycleStatsSchema = z.object({
  totalInstancesCreated: z.number().int().nonnegative(),
  cachedInstancesCount: z.number().int().nonnegative(),
  cacheHitRatio: z.number().min(0).max(1),
  estimatedMemoryUsage: z.number().int().nonnegative(),
  averageCreationTime: z.number().nonnegative(),
  peakCreationTime: z.number().nonnegative(),
});

/**
 * Singleton lifecycle configuration validation schema
 */
export const singletonLifecycleConfigSchema = z.object({
  lazy: z.boolean().optional(),
  threadSafe: z.boolean().optional(),
  maxInstances: z.number().int().positive().optional(),
});

/**
 * Scoped lifecycle configuration validation schema
 */
export const scopedLifecycleConfigSchema = z.object({
  isolationStrategy: z.enum(["strict", "inherited"]).optional(),
  autoDispose: z.boolean().optional(),
  maxInstancesPerScope: z.number().int().positive().optional(),
});

/**
 * Transient lifecycle configuration validation schema
 */
export const transientLifecycleConfigSchema = z.object({
  trackInstances: z.boolean().optional(),
  enablePooling: z.boolean().optional(),
  poolSize: z.number().int().positive().optional(),
  poolConfig: z.unknown().optional(), // IPoolConfig is complex, use unknown
  validator: z
    .any()
    .refine((val) => typeof val === "function", "Must be a function")
    .optional(),
  cleanupHandler: z
    .any()
    .refine((val) => typeof val === "function", "Must be a function")
    .optional(),
});

/**
 * Scope statistics validation schema
 */
export const scopeStatsSchema = z.object({
  scopeId: z.string(),
  instanceCount: z.number().int().nonnegative(),
  createdAt: z.date(),
  lastAccessedAt: z.date(),
  childScopesCount: z.number().int().nonnegative(),
  estimatedMemoryUsage: z.number().int().nonnegative(),
});

/**
 * Lifecycle performance metrics validation schema
 */
export const lifecyclePerformanceMetricsSchema = z.object({
  byStrategy: z.record(lifecycleStrategySchema, lifecycleStatsSchema),
  overall: z.object({
    totalInstances: z.number().int().nonnegative(),
    totalMemoryUsage: z.number().int().nonnegative(),
    averageCreationTime: z.number().nonnegative(),
    cacheEfficiency: z.number().min(0).max(1),
  }),
});

/**
 * Default singleton lifecycle configuration
 */
export const DEFAULT_SINGLETON_CONFIG = singletonLifecycleConfigSchema.parse({
  lazy: true,
  threadSafe: false,
  maxInstances: 1000,
});

/**
 * Default scoped lifecycle configuration
 */
export const DEFAULT_SCOPED_CONFIG = scopedLifecycleConfigSchema.parse({
  isolationStrategy: "strict" as const,
  autoDispose: true,
  maxInstancesPerScope: 100,
});

/**
 * Default transient lifecycle configuration
 */
export const DEFAULT_TRANSIENT_CONFIG = transientLifecycleConfigSchema.parse({
  trackInstances: false,
  enablePooling: false,
  poolSize: 10,
});

// Type guards and validation helpers

/**
 * Type guard to check if a value is lifecycle statistics
 */
export function isLifecycleStats(value: unknown): value is z.infer<typeof lifecycleStatsSchema> {
  return lifecycleStatsSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is singleton lifecycle config
 */
export function isSingletonLifecycleConfig(value: unknown): value is z.infer<typeof singletonLifecycleConfigSchema> {
  return singletonLifecycleConfigSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is scoped lifecycle config
 */
export function isScopedLifecycleConfig(value: unknown): value is z.infer<typeof scopedLifecycleConfigSchema> {
  return scopedLifecycleConfigSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is transient lifecycle config
 */
export function isTransientLifecycleConfig(value: unknown): value is z.infer<typeof transientLifecycleConfigSchema> {
  return transientLifecycleConfigSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is scope statistics
 */
export function isScopeStats(value: unknown): value is z.infer<typeof scopeStatsSchema> {
  return scopeStatsSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is lifecycle performance metrics
 */
export function isLifecyclePerformanceMetrics(
  value: unknown,
): value is z.infer<typeof lifecyclePerformanceMetricsSchema> {
  return lifecyclePerformanceMetricsSchema.safeParse(value).success;
}

/**
 * Validate and normalize singleton lifecycle configuration
 */
export function validateSingletonLifecycleConfig(config: unknown): z.infer<typeof singletonLifecycleConfigSchema> {
  const result = singletonLifecycleConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid singleton lifecycle configuration: ${result.error.message}`);
  }
  return { ...DEFAULT_SINGLETON_CONFIG, ...result.data };
}

/**
 * Validate and normalize scoped lifecycle configuration
 */
export function validateScopedLifecycleConfig(config: unknown): z.infer<typeof scopedLifecycleConfigSchema> {
  const result = scopedLifecycleConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid scoped lifecycle configuration: ${result.error.message}`);
  }
  return { ...DEFAULT_SCOPED_CONFIG, ...result.data };
}

/**
 * Validate and normalize transient lifecycle configuration
 */
export function validateTransientLifecycleConfig(config: unknown): z.infer<typeof transientLifecycleConfigSchema> {
  const result = transientLifecycleConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid transient lifecycle configuration: ${result.error.message}`);
  }
  return { ...DEFAULT_TRANSIENT_CONFIG, ...result.data };
}

/**
 * Validate lifecycle strategy
 */
export function validateLifecycleStrategy(strategy: unknown): LifecycleStrategy {
  const result = lifecycleStrategySchema.safeParse(strategy);
  if (!result.success) {
    throw new Error(`Invalid lifecycle strategy: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Validate lifecycle statistics
 */
export function validateLifecycleStats(stats: unknown): z.infer<typeof lifecycleStatsSchema> {
  const result = lifecycleStatsSchema.safeParse(stats);
  if (!result.success) {
    throw new Error(`Invalid lifecycle statistics: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Validate scope statistics
 */
export function validateScopeStats(stats: unknown): z.infer<typeof scopeStatsSchema> {
  const result = scopeStatsSchema.safeParse(stats);
  if (!result.success) {
    throw new Error(`Invalid scope statistics: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Validate lifecycle performance metrics
 */
export function validateLifecyclePerformanceMetrics(
  metrics: unknown,
): z.infer<typeof lifecyclePerformanceMetricsSchema> {
  const result = lifecyclePerformanceMetricsSchema.safeParse(metrics);
  if (!result.success) {
    throw new Error(`Invalid lifecycle performance metrics: ${result.error.message}`);
  }
  return result.data;
}
