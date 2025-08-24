/**
 * Logger types and interfaces
 */

// Local type definitions to avoid dependency issues
interface IBaseConfig {
  environment: string;
  logLevel: string;
  port: number;
}
type CorrelationId = string;
// Import the consolidated interfaces from the main types file
import type {
  IPerformanceConfig,
  IPerformanceMetrics,
  ITransportConfig,
  ICircuitBreakerConfig,
  IObjectPoolConfig,
} from "../types/index.js";

/**
 * Logger configuration schema
 */
export interface ILoggerConfig extends IBaseConfig {
  logLevel: "debug" | "info" | "warn" | "error";
  transports: ITransportConfig[];
  performance: IPerformanceConfig;
  objectPool: IObjectPoolConfig;
  circuitBreaker: ICircuitBreakerConfig;
  bufferSize?: number;
  flushIntervalMs?: number;
  enableCorrelationIds: boolean;
  timestampFormat: "iso" | "unix" | "epoch";
  testStream?: NodeJS.WritableStream; // Custom stream for test output capture
}

/**
 * Enhanced logger interface with correlation support
 */
export interface ILogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  withCorrelation(correlationId: CorrelationId): ILogger;
  getMetrics?(): IPerformanceMetrics;
}

// Re-export the consolidated interfaces for backward compatibility
export type { IPerformanceConfig, IPerformanceMetrics, ITransportConfig, ICircuitBreakerConfig, IObjectPoolConfig };
