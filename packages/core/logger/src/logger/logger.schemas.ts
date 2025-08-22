/**
 * Zod validation schemas for logger domain
 * @module @axon/logger/logger/schemas
 */

import { z } from "zod";

/**
 * Transport configuration schema
 */
export const TRANSPORT_CONFIG_SCHEMA = z.object({
  type: z.enum(["console", "file", "remote"]),
  enabled: z.boolean(),
  level: z.string().optional(),
  destination: z.string().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Performance configuration schema
 */
export const PERFORMANCE_CONFIG_SCHEMA = z.object({
  enabled: z.boolean(),
  sampleRate: z.number().min(0, "Sample rate must be >= 0").max(1, "Sample rate must be <= 1"),
  thresholdMs: z.number().positive(),
});

/**
 * Circuit breaker configuration schema
 */
export const CIRCUIT_BREAKER_CONFIG_SCHEMA = z.object({
  enabled: z.boolean(),
  failureThreshold: z.number().positive(),
  resetTimeoutMs: z.number().positive(),
  monitorTimeWindowMs: z.number().positive(),
});

/**
 * Object pool configuration schema
 */
export const OBJECT_POOL_CONFIG_SCHEMA = z.object({
  enabled: z.boolean(),
  initialSize: z.number().nonnegative(),
  maxSize: z.number().positive(),
  growthFactor: z.number().min(1, "Growth factor must be >= 1"),
});

/**
 * Logger configuration schema
 */
export const LOGGER_CONFIG_SCHEMA = z.object({
  transports: z.array(TRANSPORT_CONFIG_SCHEMA),
  performance: PERFORMANCE_CONFIG_SCHEMA,
  circuitBreaker: CIRCUIT_BREAKER_CONFIG_SCHEMA,
  objectPool: OBJECT_POOL_CONFIG_SCHEMA,
  bufferSize: z.number().positive().optional(),
  flushIntervalMs: z.number().positive().optional(),
  enableCorrelationIds: z.boolean(),
  timestampFormat: z.enum(["iso", "unix", "epoch"]),
});

/**
 * Log entry schema
 */
export const LOG_ENTRY_SCHEMA = z.object({
  level: z.string(),
  message: z.string(),
  timestamp: z.number(),
  correlationId: z.string().optional(),
  meta: z.record(z.string(), z.unknown()),
});

/**
 * Performance metrics schema
 */
export const PERFORMANCE_METRICS_SCHEMA = z.object({
  logsPerSecond: z.number().nonnegative(),
  averageLatencyMs: z.number().nonnegative(),
  peakLatencyMs: z.number().nonnegative(),
  totalLogs: z.number().nonnegative(),
  failedLogs: z.number().nonnegative(),
  circuitBreakerState: z.enum(["closed", "open", "half-open"]),
  objectPoolUtilization: z.number().min(0, "Pool utilization must be >= 0").max(100, "Pool utilization must be <= 100"),
});
