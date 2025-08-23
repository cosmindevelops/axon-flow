/**
 * Shared Logger Types and Interfaces
 *
 * This is a special-purpose folder that centralizes all type definitions used
 * across the logger package. Unlike domain folders that follow the 4-file pattern
 * (*.types.ts, *.classes.ts, *.schemas.ts, index.ts), this folder serves as a
 * single repository for shared interfaces, types, and contracts that multiple
 * domains depend on.
 *
 * Purpose:
 * - Provides central type definitions to avoid circular dependencies
 * - Defines contracts between different logger components
 * - Contains temporary type workarounds during refactoring
 * - Eliminates duplicate type definitions across domains
 *
 * Note: Some types here are temporary workarounds (like CorrelationId) that
 * will eventually be imported from @axon/types once import issues are resolved.
 */

// Temporary workaround for types package issues
type CorrelationId = string;

// Local base config interface to avoid dependency issues
interface IBaseConfig {
  environment?: string;
  logLevel?: string;
  port?: number;
}

/**
 * Transport types for different output destinations
 */
export type TransportType = "console" | "file" | "remote";

/**
 * Circuit breaker states
 */
export type CircuitBreakerState = "closed" | "open" | "half-open";

/**
 * Transport configuration options
 */
export interface ITransportConfig {
  name?: string;
  type: TransportType;
  enabled: boolean;
  level?: string;
  destination?: string;
  options?: Record<string, unknown>;
}

/**
 * Performance monitoring configuration
 */
export interface IPerformanceConfig {
  enabled: boolean;
  sampleRate: number; // 0-1, percentage of logs to monitor
  thresholdMs: number; // Latency threshold for warnings
}

/**
 * Circuit breaker configuration
 */
export interface ICircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  resetTimeoutMs: number;
  monitorTimeWindowMs: number;
}

/**
 * Object pool configuration
 */
export interface IObjectPoolConfig {
  enabled: boolean;
  initialSize: number;
  maxSize: number;
  growthFactor: number;
}

/**
 * Enhanced logger configuration with performance options
 */
export interface ILoggerConfig extends IBaseConfig {
  logLevel: string;
  environment: string;
  port: number;
  transports: ITransportConfig[];
  performance: IPerformanceConfig;
  circuitBreaker: ICircuitBreakerConfig;
  objectPool: IObjectPoolConfig;
  bufferSize?: number;
  flushIntervalMs?: number;
  enableCorrelationIds: boolean;
  timestampFormat: "iso" | "unix" | "epoch";
  testStream?: NodeJS.WritableStream; // Custom stream for test output capture
}

/**
 * Log entry object for pooling
 */
export interface ILogEntry {
  level: string;
  message: string;
  timestamp: number;
  correlationId: CorrelationId | undefined;
  meta: Record<string, unknown>;
}

/**
 * Performance metrics interface
 */
export interface IPerformanceMetrics {
  logsPerSecond: number;
  averageLatencyMs: number;
  peakLatencyMs: number;
  totalLogs: number;
  failedLogs: number;
  circuitBreakerState: CircuitBreakerState;
  objectPoolUtilization: number;
}

/**
 * Transport provider interface
 */
export interface ITransportProvider {
  readonly type: TransportType;
  write(entry: ILogEntry): Promise<void> | void;
  flush(): Promise<void>;
  close(): Promise<void>;
  isHealthy(): boolean;
}

/**
 * Enhanced logger interface with performance features
 */
export interface ILogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  withCorrelation(correlationId: CorrelationId): ILogger;
  flush(): Promise<void>;
  getMetrics(): IPerformanceMetrics;
  isHealthy(): boolean;
}

/**
 * Object pool interface
 */
export interface IObjectPool<T> {
  acquire(): T;
  release(item: T): void;
  size(): number;
  available(): number;
  destroy(): void;
}

/**
 * Circuit breaker interface
 */
export interface ICircuitBreaker {
  readonly state: CircuitBreakerState;
  execute<T>(operation: () => Promise<T>): Promise<T>;
  recordSuccess(): void;
  recordFailure(): void;
  getMetrics(): {
    failureCount: number;
    successCount: number;
    state: CircuitBreakerState;
    nextRetryTime: number | undefined;
  };
}
