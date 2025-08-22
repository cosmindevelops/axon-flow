/**
 * Zod validation schemas for circuit breaker domain
 * @module @axon/logger/circuit-breaker/schemas
 */

import { z } from "zod";

/**
 * Circuit breaker state schema
 */
export const CIRCUIT_BREAKER_STATE_SCHEMA = z.enum(["closed", "open", "half-open"]);

/**
 * Circuit breaker metrics schema
 */
export const CIRCUIT_BREAKER_METRICS_SCHEMA = z.object({
  failureCount: z.number().nonnegative(),
  successCount: z.number().nonnegative(),
  state: CIRCUIT_BREAKER_STATE_SCHEMA,
  nextRetryTime: z.number().optional(),
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
