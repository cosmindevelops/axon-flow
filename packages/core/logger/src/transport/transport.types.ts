/**
 * Transport types and interfaces
 */

import type { ICircuitBreakerConfig, ICircuitBreakerMetrics } from "../circuit-breaker/index.js";

/**
 * Log level for routing decisions
 */
export type LogLevel = "error" | "warn" | "info" | "debug" | "trace";

/**
 * Transport filter predicate function for advanced log filtering
 */
export type TransportFilter = (logEntry: Record<string, unknown>) => boolean;

/**
 * Transport routing rule based on log level and source
 */
export interface ITransportRoutingRule {
  levels?: LogLevel[];
  sources?: string[];
  exclude?: boolean;
}

/**
 * Comprehensive routing configuration with advanced filtering
 */
export interface IRoutingConfig {
  /** Level-based routing rules */
  levelRules?: Record<LogLevel, string[]>;
  /** Source pattern matching (supports wildcards) */
  sourcePatterns?: Record<string, string[]>;
  /** Custom filter functions for advanced routing logic */
  customFilters?: Record<string, TransportFilter>;
  /** Default transport names when no rules match */
  defaultTargets?: string[];
  /** Whether to apply filters in sequence (AND) or parallel (OR) */
  filterMode?: "and" | "or";
}

/**
 * File rotation strategy
 */
export type RotationStrategy = "size" | "daily" | "hourly" | "none";

/**
 * File rotation configuration
 */
export interface IFileRotationConfig {
  strategy: RotationStrategy;
  maxSize?: number; // bytes
  maxFiles?: number;
  dateFormat?: string; // for time-based rotation
  compress?: boolean;
}

/**
 * Transport metrics for monitoring
 */
export interface ITransportMetrics {
  messagesWritten: number;
  messagesFailed: number;
  bytesWritten: number;
  lastWriteTime?: Date;
  lastErrorTime?: Date;
  averageWriteTime: number;
  circuitBreakerMetrics?: ICircuitBreakerMetrics;
}

/**
 * Transport health status for monitoring and diagnostics
 */
export interface ITransportHealth {
  /** Overall health status */
  status: "healthy" | "degraded" | "unhealthy" | "unknown";
  /** Timestamp of last health check */
  lastCheck: Date;
  /** Detailed health information */
  details: {
    /** Whether the transport can write logs */
    canWrite: boolean;
    /** Whether the transport can flush pending logs */
    canFlush: boolean;
    /** Error rate percentage (0-100) */
    errorRate: number;
    /** Average response time in milliseconds */
    avgResponseTime: number;
    /** Number of consecutive failures */
    consecutiveFailures: number;
  };
  /** Optional error message if unhealthy */
  error?: string;
  /** Circuit breaker status if applicable */
  circuitBreakerOpen?: boolean;
}

/**
 * Enhanced transport provider interface with health checks and metrics
 */
export interface ITransportProvider {
  readonly type: string;
  write(logEntry: Record<string, unknown>): Promise<void>;
  close?(): Promise<void>;
  flush?(): Promise<void>;
  isHealthy(): boolean;
  getMetrics(): ITransportMetrics;
  getHealth(): ITransportHealth;
  reset?(): void;
}

/**
 * Console transport options with formatting
 */
export interface IConsoleTransportOptions {
  prettyPrint?: boolean;
  colorize?: boolean;
  timestampFormat?: string;
  includeMetadata?: boolean;
}

/**
 * Enhanced file transport options with rotation
 */
export interface IFileTransportOptions {
  readonly path: string;
  rotation?: IFileRotationConfig;
  bufferSize?: number;
  flushInterval?: number;
  encoding?: string;
  ensureDirectory?: boolean;
}

/**
 * Enhanced remote transport options with circuit breaker
 */
export interface IRemoteTransportOptions {
  url: string;
  headers?: Record<string, string>;
  batchSize?: number;
  flushInterval?: number;
  retryAttempts?: number;
  retryDelay?: number;
  circuitBreaker?: ICircuitBreakerConfig;
  timeout?: number;
  authToken?: string;
}

/**
 * Multi-transport routing configuration
 */
export interface IMultiTransportRoutingConfig {
  rules: Record<string, ITransportRoutingRule>;
  defaultTransports?: string[];
  fallbackBehavior: "continue" | "stop" | "fallback";
  failureThreshold?: number;
}

/**
 * Transport configuration union
 */
export type TransportOptions = IConsoleTransportOptions | IFileTransportOptions | IRemoteTransportOptions;

/**
 * Enhanced transport configuration with comprehensive routing and options
 */
export interface ITransportConfig {
  name: string;
  type: "console" | "file" | "remote";
  options?: TransportOptions;
  /** Simple routing rule (backward compatible) */
  routing?: ITransportRoutingRule;
  /** Advanced routing configuration */
  advancedRouting?: IRoutingConfig;
  /** File rotation settings (for file transports) */
  rotation?: IFileRotationConfig;
  /** Custom filter function for this transport */
  filter?: TransportFilter;
  /** Enable metrics tracking for this transport */
  enableMetrics?: boolean;
  /** Circuit breaker configuration for this transport */
  circuitBreaker?: ICircuitBreakerConfig;
  enabled?: boolean;
  priority?: number;
}

/**
 * Multi-transport manager configuration
 */
export interface IMultiTransportConfig {
  transports: ITransportConfig[];
  routing?: IMultiTransportRoutingConfig;
  globalCircuitBreaker?: ICircuitBreakerConfig;
  performanceMonitoring?: boolean;
  metricsInterval?: number;
}

/**
 * Alias for enhanced transport configuration (backward compatibility)
 */
export type IRotationConfig = IFileRotationConfig;
