/**
 * Zod schemas for recovery mechanism validation
 */

import { z } from "zod";
import { BackoffStrategy, RecoveryStrategy, RecoveryState } from "./recovery.types.js";
import { HANDLER_PRIORITY_SCHEMA } from "../chain/chain.schemas.js";

/**
 * Backoff strategy schema
 */
export const BACKOFF_STRATEGY_SCHEMA = z.nativeEnum(BackoffStrategy);

/**
 * Recovery strategy schema
 */
export const RECOVERY_STRATEGY_SCHEMA = z.nativeEnum(RecoveryStrategy);

/**
 * Recovery state schema
 */
export const RECOVERY_STATE_SCHEMA = z.nativeEnum(RecoveryState);

/**
 * Retry configuration schema
 */
export const RETRY_CONFIG_SCHEMA = z.object({
  maxAttempts: z.number().int().positive(),
  initialDelay: z.number().int().nonnegative(),
  maxDelay: z.number().int().positive().optional(),
  backoffStrategy: BACKOFF_STRATEGY_SCHEMA,
  backoffMultiplier: z.number().positive().optional(),
  jitter: z.number().min(0).max(1).optional(),
  customDelayFunction: z.any().optional(), // Custom delay function
  shouldRetry: z.any().optional(), // Should retry function
  attemptTimeout: z.number().int().positive().optional(),
  includeOriginalError: z.boolean().optional(),
});

/**
 * Enhanced circuit breaker configuration schema
 */
export const CIRCUIT_BREAKER_CONFIG_SCHEMA = z.object({
  failureThreshold: z.number().int().positive(),
  failureWindow: z.number().int().positive().optional(),
  resetTimeout: z.number().int().positive(),
  minimumRequests: z.number().int().positive().optional(),
  successThreshold: z.number().min(0).max(1).optional(),
  onOpen: z.any().optional(), // Circuit open callback
  onClose: z.any().optional(), // Circuit close callback
  onHalfOpen: z.any().optional(), // Circuit half-open callback
  openCircuitError: z.any().optional(), // Open circuit error factory
  monitoredErrorTypes: z.array(z.string()).optional(),
});

/**
 * Graceful degradation configuration schema
 */
export const GRACEFUL_DEGRADATION_CONFIG_SCHEMA = z.object({
  fallbackFunction: z.any().optional(), // Fallback function
  fallbackChain: z
    .array(
      z.object({
        condition: z.any(), // Condition function
        fallback: z.any(), // Fallback function
        name: z.string().optional(),
      }),
    )
    .optional(),
  defaultValue: z.unknown().optional(),
  logFallbackUsage: z.boolean().optional(),
  degradationStrategies: z.record(z.string(), z.any()).optional(), // Degradation strategy functions
  fallbackTimeout: z.number().int().positive().optional(),
  qualityMetrics: z
    .object({
      accuracyThreshold: z.number().min(0).max(1).optional(),
      performanceThreshold: z.number().positive().optional(),
      reliabilityThreshold: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

/**
 * Timeout configuration schema
 */
export const TIMEOUT_CONFIG_SCHEMA = z.object({
  timeout: z.number().int().positive(),
  warningThreshold: z.number().min(0).max(1).optional(),
  gracePeriod: z.number().int().nonnegative().optional(),
  timeoutErrorFactory: z.any().optional(), // Timeout error factory
  onWarning: z.any().optional(), // Warning callback
  onTimeout: z.any().optional(), // Timeout callback
  allowGracefulCompletion: z.boolean().optional(),
});

/**
 * Bulkhead configuration schema
 */
export const BULKHEAD_CONFIG_SCHEMA = z.object({
  maxConcurrent: z.number().int().positive(),
  maxQueue: z.number().int().nonnegative().optional(),
  queueTimeout: z.number().int().positive().optional(),
  isolationKey: z.any().optional(), // Isolation key function
  exhaustionError: z.any().optional(), // Exhaustion error factory
  enableMetrics: z.boolean().optional(),
});

/**
 * Recovery context schema
 */
export const RECOVERY_CONTEXT_SCHEMA = z.object({
  correlationId: z.string().optional(),
  timestamp: z.string(),
  severity: z.any(), // ERROR_SEVERITY_SCHEMA from base
  category: z.any(), // ERROR_CATEGORY_SCHEMA from base
  component: z.string().optional(),
  operation: z.string().optional(),
  stackTrace: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  environment: z
    .object({
      platform: z.enum(["node", "browser", "unknown"]),
      version: z.string().optional(),
      userAgent: z.string().optional(),
    })
    .optional(),
  attemptNumber: z.number().int().positive(),
  totalAttempts: z.number().int().nonnegative(),
  strategiesAttempted: z.array(RECOVERY_STRATEGY_SCHEMA),
  recoveryState: RECOVERY_STATE_SCHEMA,
  recoveryStartedAt: z.date(),
  lastAttemptAt: z.date().optional(),
  recoveryCompletedAt: z.date().optional(),
  metrics: z.any().optional(), // IRecoveryMetrics - defined below
  recoveryData: z.record(z.string(), z.unknown()).optional(),
  originalContext: z.any().optional(), // IEnhancedErrorContext
});

/**
 * Recovery metrics schema
 */
export const RECOVERY_METRICS_SCHEMA = z.object({
  totalAttempts: z.number().int().nonnegative(),
  successfulAttempts: z.number().int().nonnegative(),
  failedAttempts: z.number().int().nonnegative(),
  attemptsByStrategy: z.record(RECOVERY_STRATEGY_SCHEMA, z.number().int().nonnegative()),
  successRateByStrategy: z.record(RECOVERY_STRATEGY_SCHEMA, z.number().min(0).max(1)),
  averageRecoveryTime: z.number().nonnegative(),
  totalRecoveryTime: z.number().nonnegative(),
  recoveryTimeByStrategy: z.record(RECOVERY_STRATEGY_SCHEMA, z.number().nonnegative()),
  circuitBreakerHistory: z
    .array(
      z.object({
        state: z.enum(["open", "closed", "half-open"]),
        timestamp: z.date(),
        triggerError: z.string().optional(),
      }),
    )
    .optional(),
  resourceUtilization: z
    .object({
      averageConcurrency: z.number().nonnegative(),
      peakConcurrency: z.number().int().nonnegative(),
      queueLength: z.number().int().nonnegative(),
      rejectedRequests: z.number().int().nonnegative(),
    })
    .optional(),
});

/**
 * Recovery result schema
 */
export const RECOVERY_RESULT_SCHEMA = z.object({
  success: z.boolean(),
  strategy: RECOVERY_STRATEGY_SCHEMA,
  attempts: z.number().int().nonnegative(),
  duration: z.number().nonnegative(),
  result: z.unknown().optional(),
  error: z.any().optional(), // IBaseAxonError
  context: RECOVERY_CONTEXT_SCHEMA,
  metrics: RECOVERY_METRICS_SCHEMA,
});

/**
 * Operation recovery configuration schema
 */
export const OPERATION_RECOVERY_CONFIG_SCHEMA = z.object({
  retry: RETRY_CONFIG_SCHEMA.optional(),
  circuitBreaker: CIRCUIT_BREAKER_CONFIG_SCHEMA.optional(),
  gracefulDegradation: GRACEFUL_DEGRADATION_CONFIG_SCHEMA.optional(),
  timeout: TIMEOUT_CONFIG_SCHEMA.optional(),
  bulkhead: BULKHEAD_CONFIG_SCHEMA.optional(),
  strategies: z.array(RECOVERY_STRATEGY_SCHEMA).optional(),
  global: z
    .object({
      maxTotalRecoveryTime: z.number().int().positive().optional(),
      stopOnFirstSuccess: z.boolean().optional(),
      enableMetrics: z.boolean().optional(),
    })
    .optional(),
});

/**
 * Recoverable operation schema
 */
export const RECOVERABLE_OPERATION_SCHEMA = z.object({
  id: z.string(),
  name: z.string(),
  operation: z.function(),
  recoveryConfig: OPERATION_RECOVERY_CONFIG_SCHEMA.optional(),
  timeout: z.number().int().positive().optional(),
  maxRecoveryTime: z.number().int().positive().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Recovery decorator configuration schema
 */
export const RECOVERY_DECORATOR_CONFIG_SCHEMA = z.object({
  recovery: OPERATION_RECOVERY_CONFIG_SCHEMA,
  preserveMetadata: z.boolean().optional(),
  errorTransformer: z.any().optional(), // Error transformer function
  contextProvider: z.any().optional(), // Context provider function
});

/**
 * Recovery handler configuration schema (base)
 */
export const RECOVERY_HANDLER_CONFIG_SCHEMA = z.object({
  name: z.string(),
  priority: HANDLER_PRIORITY_SCHEMA,
  strategy: RECOVERY_STRATEGY_SCHEMA,
  enabled: z.boolean().optional().default(true),
  timeout: z.number().int().positive().optional(),
  maxRetries: z.number().int().nonnegative().optional(),
});

/**
 * Recovery manager configuration schema
 */
export const RECOVERY_MANAGER_CONFIG_SCHEMA = z.object({
  handlers: z.array(z.any()).optional(), // IRecoveryHandler[]
  enableMetrics: z.boolean().optional().default(true),
  metricsRetentionPeriod: z.number().int().positive().optional(),
  defaultTimeout: z.number().int().positive().optional(),
  maxConcurrentRecoveries: z.number().int().positive().optional(),
  circuitBreakerDefaults: CIRCUIT_BREAKER_CONFIG_SCHEMA.partial().optional(),
  retryDefaults: RETRY_CONFIG_SCHEMA.partial().optional(),
});
