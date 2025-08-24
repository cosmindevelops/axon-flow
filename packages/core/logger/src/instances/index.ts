/**
 * Pre-configured Logger Instances
 *
 * This is a special-purpose folder that provides ready-to-use logger instances
 * for different environments and use cases. Unlike domain folders that follow the
 * 4-file pattern (*.types.ts, *.classes.ts, *.schemas.ts, index.ts), this folder
 * serves as a factory for pre-configured logger instances that consumers can use
 * immediately without complex setup.
 *
 * Purpose:
 * - Provides drop-in logger instances for common scenarios
 * - Eliminates need for consumers to configure logger settings
 * - Offers environment-specific optimizations out of the box
 * - Maintains backward compatibility with legacy PinoLogger usage
 */

import { PinoLogger, HighPerformancePinoLogger } from "../logger/index.js";
import type { ILoggerConfig } from "../logger/logger.types.js";

/**
 * Default logger instance (backward compatible)
 */
export const logger = new PinoLogger();

/**
 * High-performance logger instance with all features enabled
 */
const highPerformanceConfig: Partial<ILoggerConfig> = {
  performance: {
    enabled: true,
    sampleRate: 0.1, // Sample 10% of operations
    thresholdMs: 100,
  },
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    resetTimeoutMs: 30000,
    monitorTimeWindowMs: 60000,
  },
  objectPool: {
    enabled: true,
    initialSize: 100,
    maxSize: 1000,
    growthFactor: 1.5,
  },
  transports: [
    {
      type: "console",
      level: "debug",
      enabled: true,
    },
  ],
  enableCorrelationIds: true,
  timestampFormat: "iso",
};

export const highPerformanceLogger = new HighPerformancePinoLogger(highPerformanceConfig);

/**
 * Production-optimized logger instance
 */
export const productionLogger = new HighPerformancePinoLogger({
  environment: "production",
  logLevel: "info",
  performance: {
    enabled: true,
    sampleRate: 0.05, // Sample 5% in production
    thresholdMs: 200,
  },
  circuitBreaker: {
    enabled: true,
    failureThreshold: 10,
    resetTimeoutMs: 60000,
    monitorTimeWindowMs: 120000,
  },
  objectPool: {
    enabled: true,
    initialSize: 200,
    maxSize: 2000,
    growthFactor: 2.0,
  },
  transports: [
    {
      type: "console",
      level: "info",
      enabled: true,
    },
    {
      type: "file",
      level: "warn",
      destination: "./logs/app.log",
      enabled: true,
      options: {
        flushIntervalMs: 10000,
      },
    },
  ],
  enableCorrelationIds: true,
  timestampFormat: "iso",
  bufferSize: 2000,
  flushIntervalMs: 10000,
});

/**
 * Development-optimized logger instance
 */
export const developmentLogger = new HighPerformancePinoLogger({
  environment: "development",
  logLevel: "debug",
  performance: {
    enabled: true,
    sampleRate: 0.2, // Sample 20% in development
    thresholdMs: 50,
  },
  circuitBreaker: {
    enabled: false, // Disabled in development
    failureThreshold: 5,
    resetTimeoutMs: 30000,
    monitorTimeWindowMs: 60000,
  },
  objectPool: {
    enabled: true,
    initialSize: 50,
    maxSize: 500,
    growthFactor: 1.5,
  },
  transports: [
    {
      type: "console",
      level: "debug",
      enabled: true,
      options: {
        pretty: true,
      },
    },
  ],
  enableCorrelationIds: true,
  timestampFormat: "iso",
});
