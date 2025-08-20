/**
 * Logger types and interfaces
 */

import type { BaseConfig } from "@axon/config";
import type { CorrelationId } from "@axon/types";

/**
 * Logger configuration schema
 */
export interface ILoggerConfig extends BaseConfig {
  logLevel: "debug" | "info" | "warn" | "error";
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
}
