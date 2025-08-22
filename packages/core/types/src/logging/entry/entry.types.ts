/**
 * Logging entry type definitions
 *
 * These types define structured logging formats for the platform,
 * supporting correlation tracking and performance monitoring.
 */

import type { CorrelationId, Timestamp } from "../../core/index.js";
import type { AgentId } from "../../core/agent/agent.types.js";

/**
 * Log severity levels
 */
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

/**
 * Structured log entry
 *
 * Represents a single log event with full context and metadata.
 */
export interface ILogEntry {
  /** Log entry timestamp */
  readonly timestamp: Timestamp;

  /** Log severity level */
  readonly level: LogLevel;

  /** Log message */
  readonly message: string;

  /** Correlation ID for request tracing */
  readonly correlationId?: CorrelationId;

  /** Logging context */
  readonly context: ILogContext;

  /** Additional metadata */
  readonly metadata?: Record<string, unknown>;

  /** Performance trace information */
  readonly performanceTrace?: IPerformanceTrace;

  /** Error information if applicable */
  readonly error?: ILoggedError;
}

/**
 * Logging context information
 */
export interface ILogContext {
  /** Service or component name */
  readonly service: string;

  /** Module or class name */
  readonly module?: string;

  /** Function or method name */
  readonly function?: string;

  /** Agent ID if from an agent */
  readonly agentId?: AgentId;

  /** Environment */
  readonly environment?: string;

  /** Version */
  readonly version?: string;

  /** Request ID */
  readonly requestId?: string;

  /** User ID */
  readonly userId?: string;

  /** Session ID */
  readonly sessionId?: string;

  /** Additional context */
  readonly custom?: Record<string, unknown>;
}

/**
 * Performance trace information
 */
export interface IPerformanceTrace {
  /** Operation name */
  readonly operation: string;

  /** Start time */
  readonly startTime: Timestamp;

  /** End time */
  readonly endTime?: Timestamp;

  /** Duration in milliseconds */
  readonly duration?: number;

  /** Memory usage */
  readonly memory?: IMemoryUsage;

  /** CPU usage */
  readonly cpu?: ICPUUsage;

  /** Network metrics */
  readonly network?: INetworkMetrics;

  /** Database metrics */
  readonly database?: IDatabaseMetrics;

  /** Custom metrics */
  readonly custom?: Record<string, number>;
}

/**
 * Memory usage metrics
 */
export interface IMemoryUsage {
  /** Heap used in bytes */
  readonly heapUsed: number;

  /** Heap total in bytes */
  readonly heapTotal: number;

  /** RSS (Resident Set Size) in bytes */
  readonly rss: number;

  /** External memory in bytes */
  readonly external?: number;

  /** Array buffers in bytes */
  readonly arrayBuffers?: number;
}

/**
 * CPU usage metrics
 */
export interface ICPUUsage {
  /** User CPU time in microseconds */
  readonly user: number;

  /** System CPU time in microseconds */
  readonly system: number;

  /** CPU percentage */
  readonly percent?: number;
}

/**
 * Network metrics
 */
export interface INetworkMetrics {
  /** Request count */
  readonly requests: number;

  /** Bytes sent */
  readonly bytesSent: number;

  /** Bytes received */
  readonly bytesReceived: number;

  /** Average latency in milliseconds */
  readonly avgLatency?: number;

  /** Error count */
  readonly errors?: number;
}

/**
 * Database metrics
 */
export interface IDatabaseMetrics {
  /** Query count */
  readonly queries: number;

  /** Average query time in milliseconds */
  readonly avgQueryTime: number;

  /** Slow query count */
  readonly slowQueries?: number;

  /** Connection pool size */
  readonly connectionPoolSize?: number;

  /** Active connections */
  readonly activeConnections?: number;
}

/**
 * Logged error information
 */
export interface ILoggedError {
  /** Error name/type */
  readonly name: string;

  /** Error message */
  readonly message: string;

  /** Stack trace */
  readonly stack?: string;

  /** Error code */
  readonly code?: string;

  /** Whether error is operational (expected) */
  readonly operational?: boolean;

  /** Error metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Log aggregation summary
 */
export interface ILogAggregation {
  /** Time window start */
  readonly startTime: Timestamp;

  /** Time window end */
  readonly endTime: Timestamp;

  /** Total log count */
  readonly count: number;

  /** Count by level */
  readonly byLevel: Record<LogLevel, number>;

  /** Count by service */
  readonly byService?: Record<string, number>;

  /** Error rate */
  readonly errorRate?: number;

  /** Average response time */
  readonly avgResponseTime?: number;
}

/**
 * Log filter criteria
 */
export interface ILogFilter {
  /** Filter by level */
  readonly level?: LogLevel | readonly LogLevel[];

  /** Filter by time range */
  readonly timeRange?: ITimeRange;

  /** Filter by service */
  readonly service?: string | readonly string[];

  /** Filter by correlation ID */
  readonly correlationId?: CorrelationId;

  /** Filter by search text */
  readonly search?: string;

  /** Filter by metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Time range for filtering
 */
export interface ITimeRange {
  /** Start time */
  readonly start: Timestamp;

  /** End time */
  readonly end: Timestamp;
}

/**
 * Log sink configuration
 */
export interface ILogSink {
  /** Sink type */
  readonly type: LogSinkType;

  /** Sink name */
  readonly name: string;

  /** Whether sink is enabled */
  readonly enabled: boolean;

  /** Minimum level to log */
  readonly minLevel?: LogLevel;

  /** Sink-specific configuration */
  readonly config?: Record<string, unknown>;
}

/**
 * Log sink types
 */
export type LogSinkType = "console" | "file" | "database" | "remote" | "custom";

/**
 * Log formatter configuration
 */
export interface ILogFormatter {
  /** Formatter type */
  readonly type: FormatterType;

  /** Whether to include timestamp */
  readonly includeTimestamp?: boolean;

  /** Whether to include context */
  readonly includeContext?: boolean;

  /** Whether to include metadata */
  readonly includeMetadata?: boolean;

  /** Custom format template */
  readonly template?: string;
}

/**
 * Formatter types
 */
export type FormatterType = "json" | "text" | "pretty" | "compact" | "custom";
