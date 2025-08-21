/**
 * Microservice-specific configuration schema
 */

import { z } from "zod";

/**
 * Health check configuration
 */
const HEALTH_CHECK_SCHEMA = z.object({
  enabled: z.boolean().default(true).describe("Enable health checks"),
  endpoint: z.string().default("/health").describe("Health check endpoint"),
  livenessEndpoint: z.string().default("/health/live").describe("Liveness probe endpoint"),
  readinessEndpoint: z.string().default("/health/ready").describe("Readiness probe endpoint"),
  interval: z.coerce.number().min(1000).default(30000).describe("Health check interval in milliseconds"),
  timeout: z.coerce.number().min(100).default(5000).describe("Health check timeout in milliseconds"),
  retries: z.coerce.number().int().min(0).default(3).describe("Health check retries"),
  startPeriod: z.coerce.number().min(0).default(60000).describe("Start period in milliseconds"),
  shutdownTimeout: z.coerce.number().min(0).default(10000).describe("Graceful shutdown timeout in milliseconds"),
  includeDetails: z.boolean().default(false).describe("Include detailed health info"),
  checks: z.object({
    database: z.boolean().default(true).describe("Check database connectivity"),
    redis: z.boolean().default(true).describe("Check Redis connectivity"),
    rabbitmq: z.boolean().default(true).describe("Check RabbitMQ connectivity"),
    disk: z.boolean().default(false).describe("Check disk space"),
    memory: z.boolean().default(false).describe("Check memory usage"),
    custom: z.array(z.string()).default([]).describe("Custom health checks"),
  }),
});

/**
 * Rate limiting configuration for service endpoints
 */
const SERVICE_RATE_LIMIT_SCHEMA = z.object({
  enabled: z.boolean().default(true).describe("Enable rate limiting"),
  defaultLimit: z.coerce.number().int().min(1).default(100).describe("Default requests per window"),
  defaultWindow: z.coerce.number().min(1000).default(60000).describe("Default window in milliseconds"),
  endpoints: z
    .array(
      z.object({
        path: z.string().describe("Endpoint path pattern"),
        method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "ALL"]).default("ALL"),
        limit: z.coerce.number().int().min(1).describe("Requests per window"),
        window: z.coerce.number().min(1000).describe("Window in milliseconds"),
        skipIf: z.any().optional(),
      }),
    )
    .default([])
    .describe("Endpoint-specific rate limits"),
  keyGenerator: z.any().optional(),
  skip: z.any().optional(),
});

/**
 * Timeout configuration for various operations
 */
const TIMEOUT_CONFIG_SCHEMA = z.object({
  request: z.coerce.number().min(0).default(30000).describe("Request timeout in milliseconds"),
  response: z.coerce.number().min(0).default(30000).describe("Response timeout in milliseconds"),
  idle: z.coerce.number().min(0).default(120000).describe("Idle connection timeout in milliseconds"),
  keepAlive: z.coerce.number().min(0).default(5000).describe("Keep-alive timeout in milliseconds"),
  socket: z.coerce.number().min(0).default(120000).describe("Socket timeout in milliseconds"),
  database: z.coerce.number().min(0).default(30000).describe("Database query timeout in milliseconds"),
  cache: z.coerce.number().min(0).default(5000).describe("Cache operation timeout in milliseconds"),
  message: z.coerce.number().min(0).default(60000).describe("Message processing timeout in milliseconds"),
  gracefulShutdown: z.coerce.number().min(0).default(30000).describe("Graceful shutdown timeout in milliseconds"),
});

/**
 * Circuit breaker configuration
 */
const CIRCUIT_BREAKER_SCHEMA = z.object({
  enabled: z.boolean().default(true).describe("Enable circuit breaker"),
  threshold: z.coerce.number().min(0).max(1).default(0.5).describe("Failure threshold (0-1)"),
  timeout: z.coerce.number().min(0).default(30000).describe("Timeout in milliseconds"),
  resetTimeout: z.coerce.number().min(0).default(30000).describe("Reset timeout in milliseconds"),
  rollingWindow: z.coerce.number().min(1000).default(10000).describe("Rolling window in milliseconds"),
  volumeThreshold: z.coerce.number().int().min(1).default(10).describe("Minimum requests in window"),
  sleepWindow: z.coerce.number().min(0).default(5000).describe("Sleep window in milliseconds"),
  errorThresholdPercentage: z.coerce.number().min(0).max(100).default(50).describe("Error threshold percentage"),
  requestVolumeThreshold: z.coerce.number().int().min(1).default(20).describe("Request volume threshold"),
  fallbackFunction: z.any().optional(),
});

/**
 * Retry configuration
 */
const RETRY_CONFIG_SCHEMA = z.object({
  enabled: z.boolean().default(true).describe("Enable retry mechanism"),
  maxAttempts: z.coerce.number().int().min(0).default(3).describe("Maximum retry attempts"),
  initialDelay: z.coerce.number().min(0).default(1000).describe("Initial delay in milliseconds"),
  maxDelay: z.coerce.number().min(0).default(30000).describe("Maximum delay in milliseconds"),
  factor: z.coerce.number().min(1).default(2).describe("Exponential backoff factor"),
  jitter: z.boolean().default(true).describe("Add jitter to retry delays"),
  retryableErrors: z.array(z.string()).default([]).describe("Retryable error codes"),
  nonRetryableErrors: z.array(z.string()).default([]).describe("Non-retryable error codes"),
});

/**
 * Metrics configuration
 */
const METRICS_CONFIG_SCHEMA = z.object({
  enabled: z.boolean().default(true).describe("Enable metrics collection"),
  endpoint: z.string().default("/metrics").describe("Metrics endpoint"),
  interval: z.coerce.number().min(1000).default(10000).describe("Collection interval in milliseconds"),
  defaultLabels: z.record(z.string(), z.string()).default({}).describe("Default metric labels"),
  includeSystemMetrics: z.boolean().default(true).describe("Include system metrics"),
  includeHttpMetrics: z.boolean().default(true).describe("Include HTTP metrics"),
  includeDatabaseMetrics: z.boolean().default(true).describe("Include database metrics"),
  includeQueueMetrics: z.boolean().default(true).describe("Include queue metrics"),
  customMetrics: z.array(z.string()).default([]).describe("Custom metric names"),
});

/**
 * Logging configuration for service
 */
const SERVICE_LOG_CONFIG_SCHEMA = z.object({
  level: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  pretty: z.boolean().default(false).describe("Pretty print logs"),
  redact: z.array(z.string()).default(["password", "token", "secret", "key"]).describe("Fields to redact"),
  includeCorrelationId: z.boolean().default(true).describe("Include correlation ID"),
  includeTimestamp: z.boolean().default(true).describe("Include timestamp"),
  includeHostname: z.boolean().default(true).describe("Include hostname"),
  includePid: z.boolean().default(true).describe("Include process ID"),
});

/**
 * Main service configuration schema
 */
export const SERVICE_CONFIG_SCHEMA = z.object({
  name: z.string().min(1).describe("Service name"),
  version: z.string().default("0.0.0").describe("Service version"),
  environment: z.enum(["development", "staging", "production"]).default("development"),
  instanceId: z.string().optional().describe("Service instance ID"),
  port: z.coerce.number().int().min(1).max(65535).default(3000).describe("Service port"),
  host: z.string().default("0.0.0.0").describe("Service host"),
  basePath: z.string().default("/").describe("API base path"),
  healthCheck: HEALTH_CHECK_SCHEMA,
  rateLimit: SERVICE_RATE_LIMIT_SCHEMA,
  timeouts: TIMEOUT_CONFIG_SCHEMA,
  circuitBreaker: CIRCUIT_BREAKER_SCHEMA,
  retry: RETRY_CONFIG_SCHEMA,
  metrics: METRICS_CONFIG_SCHEMA,
  logging: SERVICE_LOG_CONFIG_SCHEMA,
  cors: z.boolean().default(true).describe("Enable CORS (uses auth CORS config)"),
  compression: z.boolean().default(true).describe("Enable response compression"),
  trustProxy: z.boolean().or(z.string()).or(z.number()).default(false).describe("Trust proxy settings"),
  maxRequestSize: z.string().default("10mb").describe("Maximum request body size"),
  enableShutdownHooks: z.boolean().default(true).describe("Enable graceful shutdown hooks"),
  clusterMode: z.boolean().default(false).describe("Enable cluster mode"),
  workers: z.coerce.number().int().min(1).default(1).describe("Number of worker processes"),
});

/**
 * Environment-specific service configurations
 */
export const ENVIRONMENT_SERVICE_SCHEMA = z.discriminatedUnion("environment", [
  z.object({
    environment: z.literal("development"),
    service: SERVICE_CONFIG_SCHEMA.extend({
      logging: SERVICE_LOG_CONFIG_SCHEMA.extend({
        level: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("debug"),
        pretty: z.boolean().default(true),
      }),
      healthCheck: HEALTH_CHECK_SCHEMA.extend({
        includeDetails: z.boolean().default(true),
      }),
      metrics: METRICS_CONFIG_SCHEMA.extend({
        enabled: z.boolean().default(false),
      }),
      circuitBreaker: CIRCUIT_BREAKER_SCHEMA.extend({
        enabled: z.boolean().default(false),
      }),
    }),
  }),
  z.object({
    environment: z.literal("staging"),
    service: SERVICE_CONFIG_SCHEMA.extend({
      logging: SERVICE_LOG_CONFIG_SCHEMA.extend({
        level: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
      }),
      healthCheck: HEALTH_CHECK_SCHEMA.extend({
        interval: z.coerce.number().default(20000),
      }),
      rateLimit: SERVICE_RATE_LIMIT_SCHEMA.extend({
        defaultLimit: z.coerce.number().default(50),
      }),
    }),
  }),
  z.object({
    environment: z.literal("production"),
    service: SERVICE_CONFIG_SCHEMA.extend({
      logging: SERVICE_LOG_CONFIG_SCHEMA.extend({
        level: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("warn"),
        pretty: z.boolean().default(false),
      }),
      healthCheck: HEALTH_CHECK_SCHEMA.extend({
        interval: z.coerce.number().default(10000),
        includeDetails: z.boolean().default(false),
      }),
      rateLimit: SERVICE_RATE_LIMIT_SCHEMA.extend({
        defaultLimit: z.coerce.number().default(30),
      }),
      circuitBreaker: CIRCUIT_BREAKER_SCHEMA.extend({
        threshold: z.coerce.number().default(0.3),
        errorThresholdPercentage: z.coerce.number().default(30),
      }),
      clusterMode: z.boolean().default(true),
      workers: z.coerce.number().default(0), // 0 = CPU count
    }),
  }),
]);

/**
 * Type exports for service configuration
 */
export type ServiceConfig = z.infer<typeof SERVICE_CONFIG_SCHEMA>;
export type HealthCheckConfig = z.infer<typeof HEALTH_CHECK_SCHEMA>;
export type ServiceRateLimitConfig = z.infer<typeof SERVICE_RATE_LIMIT_SCHEMA>;
export type TimeoutConfig = z.infer<typeof TIMEOUT_CONFIG_SCHEMA>;
export type CircuitBreakerConfig = z.infer<typeof CIRCUIT_BREAKER_SCHEMA>;
export type RetryConfig = z.infer<typeof RETRY_CONFIG_SCHEMA>;
export type MetricsConfig = z.infer<typeof METRICS_CONFIG_SCHEMA>;
export type ServiceLogConfig = z.infer<typeof SERVICE_LOG_CONFIG_SCHEMA>;
