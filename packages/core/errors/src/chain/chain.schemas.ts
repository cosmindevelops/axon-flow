/**
 * Zod schemas for chain of responsibility validation
 */

import { z } from "zod";
import { HandlerPriority, CircuitState, NotificationChannel } from "./chain.types.js";
import { ERROR_SEVERITY_SCHEMA } from "../base/base-error.schemas.js";

/**
 * Handler priority schema
 */
export const HANDLER_PRIORITY_SCHEMA = z.nativeEnum(HandlerPriority);

/**
 * Circuit state schema
 */
export const CIRCUIT_STATE_SCHEMA = z.nativeEnum(CircuitState);

/**
 * Notification channel schema
 */
export const NOTIFICATION_CHANNEL_SCHEMA = z.nativeEnum(NotificationChannel);

/**
 * Handler result schema
 */
export const HANDLER_RESULT_SCHEMA = z.object({
  handled: z.boolean(),
  continueChain: z.boolean(),
  modifiedError: z.any().optional(), // Would need circular reference for IBaseAxonError
});

/**
 * Context enrichment configuration schema
 */
export const CONTEXT_ENRICHMENT_CONFIG_SCHEMA = z.object({
  addCorrelationId: z.boolean().optional(),
  addTimestamp: z.boolean().optional(),
  addEnvironment: z.boolean().optional(),
  addComponent: z.string().optional(),
  addOperation: z.string().optional(),
  customMetadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Stack trace configuration schema
 */
export const STACK_TRACE_CONFIG_SCHEMA = z.object({
  maxDepth: z.number().int().positive().optional(),
  includeCause: z.boolean().optional(),
  cleanPaths: z.boolean().optional(),
  filterPatterns: z.array(z.any()).optional(), // RegExp instances can't be validated by Zod
});

/**
 * Sanitization configuration schema
 */
export const SANITIZATION_CONFIG_SCHEMA = z.object({
  sensitiveKeys: z.array(z.string()).optional(),
  redactValue: z.string().optional(),
  deepScan: z.boolean().optional(),
  preserveLength: z.boolean().optional(),
});

/**
 * Logging configuration schema
 */
export const LOGGING_CONFIG_SCHEMA = z.object({
  logLevel: z.enum(["error", "warn", "info", "debug"]).optional(),
  includeStack: z.boolean().optional(),
  includeContext: z.boolean().optional(),
  logger: z.any().optional(), // Logger interface
});

/**
 * Circuit breaker configuration schema
 */
export const CIRCUIT_BREAKER_CONFIG_SCHEMA = z.object({
  threshold: z.number().int().positive().optional(),
  timeout: z.number().int().positive().optional(),
  resetTimeout: z.number().int().positive().optional(),
  onOpen: z.any().optional(),
  onClose: z.any().optional(),
  onHalfOpen: z.any().optional(),
});

/**
 * Retry configuration schema
 */
export const RETRY_CONFIG_SCHEMA = z.object({
  maxAttempts: z.number().int().positive().optional(),
  delay: z.number().int().nonnegative().optional(),
  backoff: z.enum(["linear", "exponential"]).optional(),
  shouldRetry: z.any().optional(),
});

/**
 * Notification configuration schema
 */
export const NOTIFICATION_CONFIG_SCHEMA = z.object({
  channels: z.array(NOTIFICATION_CHANNEL_SCHEMA).optional(),
  severityThreshold: ERROR_SEVERITY_SCHEMA.optional(),
  throttle: z.number().int().positive().optional(),
  notifier: z.any().optional(), // Notifier interface
});

/**
 * Metrics configuration schema
 */
export const METRICS_CONFIG_SCHEMA = z.object({
  collector: z.any().optional(), // MetricsCollector interface
  includeStackTrace: z.boolean().optional(),
  sampleRate: z.number().min(0).max(1).optional(),
});

/**
 * Handler chain configuration schema
 */
export const HANDLER_CHAIN_CONFIG_SCHEMA = z.object({
  handlers: z.array(z.any()).optional(), // IEnhancedErrorHandler[]
  sortByPriority: z.boolean().optional(),
  stopOnFirstHandle: z.boolean().optional(),
  timeout: z.number().int().positive().optional(),
});

/**
 * Handler statistics schema
 */
export const HANDLER_STATS_SCHEMA = z.object({
  name: z.string(),
  processedCount: z.number().int().nonnegative(),
  errorCount: z.number().int().nonnegative(),
  averageProcessingTime: z.number().nonnegative(),
  lastProcessedAt: z.date().optional(),
  lastError: z.any().optional(), // Error
});
