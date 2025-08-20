/**
 * Performance monitoring type definitions
 *
 * These types support comprehensive performance tracking and
 * analysis across the platform.
 */

import type { Timestamp } from "../index.js";
import type { AgentId } from "../core/agent.types.js";

/**
 * Performance metric types
 */
export type MetricType = "counter" | "gauge" | "histogram" | "summary" | "timer";

/**
 * Performance metric
 */
export interface IPerformanceMetric {
  /** Metric name */
  readonly name: string;

  /** Metric type */
  readonly type: MetricType;

  /** Metric value */
  readonly value: number;

  /** Metric unit */
  readonly unit?: MetricUnit;

  /** Metric tags */
  readonly tags?: Record<string, string>;

  /** Timestamp */
  readonly timestamp: Timestamp;

  /** Associated agent */
  readonly agentId?: AgentId;
}

/**
 * Metric units
 */
export type MetricUnit =
  | "milliseconds"
  | "seconds"
  | "bytes"
  | "kilobytes"
  | "megabytes"
  | "gigabytes"
  | "count"
  | "percent"
  | "requests"
  | "operations";

/**
 * Performance span for distributed tracing
 */
export interface IPerformanceSpan {
  /** Span ID */
  readonly spanId: string;

  /** Parent span ID */
  readonly parentSpanId?: string;

  /** Trace ID */
  readonly traceId: string;

  /** Operation name */
  readonly operation: string;

  /** Service name */
  readonly service: string;

  /** Start time */
  readonly startTime: Timestamp;

  /** End time */
  readonly endTime?: Timestamp;

  /** Duration in milliseconds */
  readonly duration?: number;

  /** Span status */
  readonly status: SpanStatus;

  /** Span attributes */
  readonly attributes?: Record<string, unknown>;

  /** Span events */
  readonly events?: readonly ISpanEvent[];
}

/**
 * Span status
 */
export type SpanStatus = "unset" | "ok" | "error";

/**
 * Span event
 */
export interface ISpanEvent {
  /** Event name */
  readonly name: string;

  /** Event timestamp */
  readonly timestamp: Timestamp;

  /** Event attributes */
  readonly attributes?: Record<string, unknown>;
}

/**
 * Performance profile
 */
export interface IPerformanceProfile {
  /** Profile ID */
  readonly id: string;

  /** Profile name */
  readonly name: string;

  /** Start time */
  readonly startTime: Timestamp;

  /** End time */
  readonly endTime?: Timestamp;

  /** CPU profile */
  readonly cpu?: ICPUProfile;

  /** Memory profile */
  readonly memory?: IMemoryProfile;

  /** I/O profile */
  readonly io?: IIOProfile;

  /** Network profile */
  readonly network?: INetworkProfile;
}

/**
 * CPU profile
 */
export interface ICPUProfile {
  /** Samples */
  readonly samples: readonly ICPUSample[];

  /** Total CPU time */
  readonly totalTime: number;

  /** Average CPU usage */
  readonly avgUsage: number;

  /** Peak CPU usage */
  readonly peakUsage: number;
}

/**
 * CPU sample
 */
export interface ICPUSample {
  /** Sample timestamp */
  readonly timestamp: Timestamp;

  /** CPU usage percentage */
  readonly usage: number;

  /** User time */
  readonly userTime: number;

  /** System time */
  readonly systemTime: number;
}

/**
 * Memory profile
 */
export interface IMemoryProfile {
  /** Samples */
  readonly samples: readonly IMemorySample[];

  /** Average memory usage */
  readonly avgUsage: number;

  /** Peak memory usage */
  readonly peakUsage: number;

  /** Memory leaks detected */
  readonly leaks?: readonly IMemoryLeak[];
}

/**
 * Memory sample
 */
export interface IMemorySample {
  /** Sample timestamp */
  readonly timestamp: Timestamp;

  /** Heap used */
  readonly heapUsed: number;

  /** Heap total */
  readonly heapTotal: number;

  /** RSS */
  readonly rss: number;

  /** External memory */
  readonly external?: number;
}

/**
 * Memory leak detection
 */
export interface IMemoryLeak {
  /** Leak location */
  readonly location: string;

  /** Leak size in bytes */
  readonly size: number;

  /** Growth rate bytes/second */
  readonly growthRate: number;

  /** Detection confidence (0-1) */
  readonly confidence: number;
}

/**
 * I/O profile
 */
export interface IIOProfile {
  /** Read operations */
  readonly reads: number;

  /** Write operations */
  readonly writes: number;

  /** Bytes read */
  readonly bytesRead: number;

  /** Bytes written */
  readonly bytesWritten: number;

  /** Average read latency */
  readonly avgReadLatency: number;

  /** Average write latency */
  readonly avgWriteLatency: number;
}

/**
 * Network profile
 */
export interface INetworkProfile {
  /** Requests sent */
  readonly requestsSent: number;

  /** Requests received */
  readonly requestsReceived: number;

  /** Bytes sent */
  readonly bytesSent: number;

  /** Bytes received */
  readonly bytesReceived: number;

  /** Average latency */
  readonly avgLatency: number;

  /** Error rate */
  readonly errorRate: number;
}

/**
 * Performance benchmark
 */
export interface IPerformanceBenchmark {
  /** Benchmark name */
  readonly name: string;

  /** Benchmark description */
  readonly description: string;

  /** Iterations run */
  readonly iterations: number;

  /** Results */
  readonly results: IBenchmarkResults;

  /** Environment info */
  readonly environment: IBenchmarkEnvironment;

  /** Timestamp */
  readonly timestamp: Timestamp;
}

/**
 * Benchmark results
 */
export interface IBenchmarkResults {
  /** Average time per operation */
  readonly avgTime: number;

  /** Minimum time */
  readonly minTime: number;

  /** Maximum time */
  readonly maxTime: number;

  /** Median time */
  readonly medianTime: number;

  /** Standard deviation */
  readonly stdDev: number;

  /** Operations per second */
  readonly opsPerSecond: number;

  /** Percentiles */
  readonly percentiles: IPercentiles;
}

/**
 * Performance percentiles
 */
export interface IPercentiles {
  /** 50th percentile (median) */
  readonly p50: number;

  /** 75th percentile */
  readonly p75: number;

  /** 90th percentile */
  readonly p90: number;

  /** 95th percentile */
  readonly p95: number;

  /** 99th percentile */
  readonly p99: number;

  /** 99.9th percentile */
  readonly p999: number;
}

/**
 * Benchmark environment
 */
export interface IBenchmarkEnvironment {
  /** Node.js version */
  readonly nodeVersion: string;

  /** OS type */
  readonly os: string;

  /** OS version */
  readonly osVersion: string;

  /** CPU model */
  readonly cpu: string;

  /** CPU cores */
  readonly cores: number;

  /** Total memory */
  readonly memory: number;
}

/**
 * Performance budget
 */
export interface IPerformanceBudget {
  /** Budget name */
  readonly name: string;

  /** Metric to track */
  readonly metric: string;

  /** Maximum allowed value */
  readonly threshold: number;

  /** Warning threshold */
  readonly warningThreshold?: number;

  /** Measurement window */
  readonly window?: number;

  /** Action on violation */
  readonly action?: BudgetAction;
}

/**
 * Budget violation actions
 */
export type BudgetAction = "alert" | "block" | "log" | "none";
