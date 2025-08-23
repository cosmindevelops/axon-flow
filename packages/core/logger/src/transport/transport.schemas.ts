/**
 * Zod validation schemas for transport domain
 * @module @axon/logger/transport/schemas
 */

import { z } from "zod";
import {
  CIRCUIT_BREAKER_CONFIG_SCHEMA as CB_CONFIG_SCHEMA,
  CIRCUIT_BREAKER_METRICS_SCHEMA as CB_METRICS_SCHEMA,
} from "../circuit-breaker/circuit-breaker.schemas.js";

/**
 * Log level schema for routing
 */
export const LOG_LEVEL_SCHEMA = z.enum(["error", "warn", "info", "debug", "trace"]);

/**
 * Transport routing rule schema
 */
export const TRANSPORT_ROUTING_RULE_SCHEMA = z.object({
  levels: z.array(LOG_LEVEL_SCHEMA).optional(),
  sources: z.array(z.string()).optional(),
  exclude: z.boolean().optional(),
});

/**
 * File rotation strategy schema
 */
export const ROTATION_STRATEGY_SCHEMA = z.enum(["size", "daily", "hourly", "none"]);

/**
 * Routing configuration schema for advanced transport routing
 */
export const ROUTING_CONFIG_SCHEMA = z.object({
  levelRules: z.record(LOG_LEVEL_SCHEMA, z.array(z.string())).optional().describe("Level-based routing rules"),
  sourcePatterns: z
    .record(z.string(), z.array(z.string()))
    .optional()
    .describe("Source pattern matching (supports wildcards)"),
  customFilters: z
    .record(z.string(), z.any())
    .optional()
    .describe("Custom filter functions for advanced routing logic"),
  defaultTargets: z.array(z.string()).optional().describe("Default transport names when no rules match"),
  filterMode: z.enum(["and", "or"]).optional().describe("Whether to apply filters in sequence (AND) or parallel (OR)"),
});

/**
 * File rotation configuration schema
 */
export const FILE_ROTATION_CONFIG_SCHEMA = z.object({
  strategy: ROTATION_STRATEGY_SCHEMA,
  maxSize: z.number().positive().optional(),
  maxFiles: z.number().positive().optional(),
  dateFormat: z.string().optional(),
  compress: z.boolean().optional(),
});

/**
 * Transport metrics schema
 */
export const TRANSPORT_METRICS_SCHEMA = z.object({
  messagesWritten: z.number().nonnegative().describe("Number of messages successfully written"),
  messagesFailed: z.number().nonnegative().describe("Number of messages that failed to write"),
  bytesWritten: z.number().nonnegative().describe("Total bytes written"),
  lastWriteTime: z.date().optional().describe("Timestamp of last successful write"),
  lastErrorTime: z.date().optional().describe("Timestamp of last error"),
  averageWriteTime: z.number().nonnegative().describe("Average write time in milliseconds"),
  circuitBreakerMetrics: CB_METRICS_SCHEMA.optional().describe("Circuit breaker metrics if applicable"),
});

/**
 * Transport health status schema
 */
export const TRANSPORT_HEALTH_SCHEMA = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy", "unknown"]).describe("Overall health status"),
  lastCheck: z.date().describe("Timestamp of last health check"),
  details: z
    .object({
      canWrite: z.boolean().describe("Whether the transport can write logs"),
      canFlush: z.boolean().describe("Whether the transport can flush pending logs"),
      errorRate: z.number().min(0).max(100).describe("Error rate percentage (0-100)"),
      avgResponseTime: z.number().nonnegative().describe("Average response time in milliseconds"),
      consecutiveFailures: z.number().nonnegative().describe("Number of consecutive failures"),
    })
    .describe("Detailed health information"),
  error: z.string().optional().describe("Optional error message if unhealthy"),
  circuitBreakerOpen: z.boolean().optional().describe("Circuit breaker status if applicable"),
});

/**
 * Console transport options schema
 */
export const CONSOLE_TRANSPORT_OPTIONS_SCHEMA = z.object({
  prettyPrint: z.boolean().optional(),
  colorize: z.boolean().optional(),
  timestampFormat: z.string().optional(),
  includeMetadata: z.boolean().optional(),
});

/**
 * File transport options schema
 */
export const FILE_TRANSPORT_OPTIONS_SCHEMA = z.object({
  path: z.string().min(1),
  rotation: FILE_ROTATION_CONFIG_SCHEMA.optional(),
  bufferSize: z.number().positive().optional(),
  flushInterval: z.number().positive().optional(),
  encoding: z.string().optional(),
  ensureDirectory: z.boolean().optional(),
});

/**
 * Circuit breaker config schema (re-exported for backward compatibility)
 */
export const CIRCUIT_BREAKER_CONFIG_SCHEMA = CB_CONFIG_SCHEMA;

/**
 * Remote transport options schema
 */
export const REMOTE_TRANSPORT_OPTIONS_SCHEMA = z.object({
  url: z.string().min(1).describe("Remote endpoint URL"),
  headers: z.record(z.string(), z.string()).optional(),
  batchSize: z.number().positive().optional(),
  flushInterval: z.number().positive().optional(),
  retryAttempts: z.number().nonnegative().optional(),
  retryDelay: z.number().positive().optional(),
  circuitBreaker: CIRCUIT_BREAKER_CONFIG_SCHEMA.optional(),
  timeout: z.number().positive().optional(),
  authToken: z.string().optional(),
});

/**
 * Transport options union schema
 */
export const TRANSPORT_OPTIONS_SCHEMA = z.union([
  CONSOLE_TRANSPORT_OPTIONS_SCHEMA,
  FILE_TRANSPORT_OPTIONS_SCHEMA,
  REMOTE_TRANSPORT_OPTIONS_SCHEMA,
]);

/**
 * Transport type schema
 */
export const TRANSPORT_TYPE_SCHEMA = z.enum(["console", "file", "remote"]);

/**
 * Enhanced transport configuration schema
 */
export const TRANSPORT_CONFIG_SCHEMA = z.object({
  name: z.string().min(1).describe("Transport name identifier"),
  type: TRANSPORT_TYPE_SCHEMA.describe("Transport type"),
  options: TRANSPORT_OPTIONS_SCHEMA.optional().describe("Transport-specific options"),
  routing: TRANSPORT_ROUTING_RULE_SCHEMA.optional().describe("Simple routing rule (backward compatible)"),
  advancedRouting: ROUTING_CONFIG_SCHEMA.optional().describe("Advanced routing configuration"),
  rotation: FILE_ROTATION_CONFIG_SCHEMA.optional().describe("File rotation settings (for file transports)"),
  filter: z.any().optional().describe("Custom filter function for this transport"),
  enableMetrics: z.boolean().optional().describe("Enable metrics tracking for this transport"),
  circuitBreaker: CIRCUIT_BREAKER_CONFIG_SCHEMA.optional().describe("Circuit breaker configuration for this transport"),
  enabled: z.boolean().optional().describe("Whether transport is enabled"),
  priority: z.number().optional().describe("Transport priority for ordering"),
});

/**
 * Multi-transport routing configuration schema
 */
export const MULTI_TRANSPORT_ROUTING_CONFIG_SCHEMA = z.object({
  rules: z.record(z.string(), TRANSPORT_ROUTING_RULE_SCHEMA),
  defaultTransports: z.array(z.string()).optional(),
  fallbackBehavior: z.enum(["continue", "stop", "fallback"]),
  failureThreshold: z.number().positive().optional(),
});

/**
 * Multi-transport configuration schema
 */
export const MULTI_TRANSPORT_CONFIG_SCHEMA = z.object({
  transports: z.array(TRANSPORT_CONFIG_SCHEMA),
  routing: MULTI_TRANSPORT_ROUTING_CONFIG_SCHEMA.optional(),
  globalCircuitBreaker: CIRCUIT_BREAKER_CONFIG_SCHEMA.optional(),
  performanceMonitoring: z.boolean().optional(),
  metricsInterval: z.number().positive().optional(),
});

/**
 * Log entry for transport schema
 */
export const TRANSPORT_LOG_ENTRY_SCHEMA = z.object({
  level: LOG_LEVEL_SCHEMA,
  message: z.string(),
  timestamp: z.number(),
  correlationId: z.string().optional(),
  meta: z.record(z.string(), z.unknown()),
});
