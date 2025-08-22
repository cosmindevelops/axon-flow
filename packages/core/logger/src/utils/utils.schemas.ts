/**
 * Zod validation schemas for utils domain
 * @module @axon/logger/utils/schemas
 */

import { z } from "zod";

/**
 * Performance configuration schema
 */
export const PERFORMANCE_CONFIG_SCHEMA = z.object({
  enabled: z.boolean(),
  sampleRate: z.number().min(0, "Sample rate must be >= 0").max(1, "Sample rate must be <= 1"),
  thresholdMs: z.number().positive(),
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
