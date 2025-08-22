/**
 * High-performance logger implementation classes
 */

// Removed problematic config import to fix lint errors
// import { config } from "@axon/config";
// Temporary workaround for types package issues
type CorrelationId = string;
import pino, { type Logger } from "pino";
import {
  executeWithCircuitBreaker,
  getCircuitBreaker,
  initializeCircuitBreaker,
} from "../circuit-breaker/circuit-breaker.classes.js";
import { createPooledLogEntry, logEntryPool, releaseLogEntry } from "../pool/pool.classes.js";
import { MultiTransportManager } from "../transport/transport.classes.js";
import type { ILogger, ILoggerConfig, IPerformanceMetrics } from "../types/index.js";
import { PerformanceTracker } from "../utils/utils.classes.js";

// Type-safe pino factory function
const createPinoLogger = (config: Record<string, unknown>): Logger => {
  return pino(config);
};

// Type-safe access to pino static properties
const pinoStatics = {
  stdSerializers: pino.stdSerializers,
  stdTimeFunctions: {
    isoTime: pino.stdTimeFunctions.isoTime,
    unixTime: pino.stdTimeFunctions.unixTime,
  },
};

/**
 * High-performance Pino-based logger implementation
 */
export class HighPerformancePinoLogger implements ILogger {
  private readonly logger: Logger;
  private correlationId?: CorrelationId;
  private readonly config: ILoggerConfig;
  private readonly transportManager?: MultiTransportManager;
  private readonly performanceTracker: PerformanceTracker;

  constructor(configOptions: Partial<ILoggerConfig> = {}) {
    // Use default config as base (removed problematic config.get() call)
    const baseConfig = this.getDefaultConfig();
    this.config = { ...baseConfig, ...configOptions };

    // Initialize object pool
    if (this.config.objectPool.enabled) {
      logEntryPool.initialize(this.config.objectPool);
    }

    // Initialize circuit breaker
    if (this.config.circuitBreaker.enabled) {
      initializeCircuitBreaker(this.config.circuitBreaker);
    }

    // Initialize performance tracker
    this.performanceTracker = new PerformanceTracker(this.config.performance);

    // Create transport manager if transports are configured
    if (this.config.transports.length > 0) {
      this.transportManager = new MultiTransportManager(this.config.transports);
    }

    // Configure Pino logger
    this.logger = this.createPinoLogger();
  }

  debug(message: string, meta: Record<string, unknown> = {}): void {
    this.logWithPerformanceTracking("debug", message, meta);
  }

  info(message: string, meta: Record<string, unknown> = {}): void {
    this.logWithPerformanceTracking("info", message, meta);
  }

  warn(message: string, meta: Record<string, unknown> = {}): void {
    this.logWithPerformanceTracking("warn", message, meta);
  }

  error(message: string, meta: Record<string, unknown> = {}): void {
    this.logWithPerformanceTracking("error", message, meta);
  }

  withCorrelation(correlationId: CorrelationId): ILogger {
    const newLogger = new HighPerformancePinoLogger(this.config);
    newLogger.correlationId = correlationId;
    return newLogger;
  }

  async flush(): Promise<void> {
    if (this.transportManager) {
      await this.transportManager.flush();
    }
  }

  getMetrics(): IPerformanceMetrics {
    const circuitBreaker = getCircuitBreaker();
    const circuitBreakerState = circuitBreaker ? circuitBreaker.state : "closed";

    const poolMetrics = logEntryPool.getMetrics();
    const objectPoolUtilization = poolMetrics.utilization;

    return this.performanceTracker.getMetrics(circuitBreakerState, objectPoolUtilization);
  }

  isHealthy(): boolean {
    const circuitBreaker = getCircuitBreaker();
    const circuitBreakerHealthy = !circuitBreaker || circuitBreaker.state !== "open";

    const transportsHealthy = !this.transportManager || this.transportManager.getHealthyTransports().length > 0;

    return circuitBreakerHealthy && transportsHealthy;
  }

  private logWithPerformanceTracking(level: string, message: string, meta: Record<string, unknown>): void {
    const finishTiming = this.performanceTracker.startOperation();

    try {
      if (this.transportManager) {
        // Use custom transports with object pooling
        void this.logToTransports(level, message, meta);
      } else {
        // Use standard Pino logging
        this.logToPino(level, message, meta);
      }

      this.performanceTracker.recordSuccess();
    } catch (error) {
      this.performanceTracker.recordFailure();
      // Fall back to console.error to ensure critical errors aren't lost
      console.error("Logger failed:", error);
      console.error("Original message:", { level, message, meta });
    } finally {
      finishTiming();
    }
  }

  private async logToTransports(level: string, message: string, meta: Record<string, unknown>): Promise<void> {
    if (!this.transportManager) {
      return;
    }

    const operation = async () => {
      const entry = createPooledLogEntry(level, message, this.correlationId, this.addCorrelation(meta));

      try {
        if (this.transportManager) {
          await this.transportManager.write(entry);
        }
      } finally {
        if (this.config.objectPool.enabled) {
          releaseLogEntry(entry);
        }
      }
    };

    if (this.config.circuitBreaker.enabled) {
      await executeWithCircuitBreaker(operation);
    } else {
      await operation();
    }
  }

  private logToPino(level: string, message: string, meta: Record<string, unknown>): void {
    const enrichedMeta = this.addCorrelation(meta);

    switch (level) {
      case "debug":
        this.logger.debug(enrichedMeta, message);
        break;
      case "info":
        this.logger.info(enrichedMeta, message);
        break;
      case "warn":
        this.logger.warn(enrichedMeta, message);
        break;
      case "error":
        this.logger.error(enrichedMeta, message);
        break;
      default:
        this.logger.info(enrichedMeta, message);
    }
  }

  private createPinoLogger(): Logger {
    const pinoConfig: Record<string, unknown> = {
      level: this.config.logLevel,
      formatters: {
        level: (label: string) => ({ level: label }),
      },
      serializers: pinoStatics.stdSerializers,
    };

    // Configure timestamp format
    switch (this.config.timestampFormat) {
      case "iso":
        pinoConfig["timestamp"] = pinoStatics.stdTimeFunctions.isoTime;
        break;
      case "unix":
        pinoConfig["timestamp"] = pinoStatics.stdTimeFunctions.unixTime;
        break;
      case "epoch":
        pinoConfig["timestamp"] = () => `,"timestamp":${Date.now().toString()}`;
        break;
      default:
        pinoConfig["timestamp"] = pinoStatics.stdTimeFunctions.isoTime;
    }

    // Environment-specific optimizations
    if (this.config.environment === "production") {
      // Production optimizations
      pinoConfig["redact"] = ["password", "token", "secret", "key"];
      pinoConfig["level"] = this.config.logLevel;
    } else if (this.config.environment === "development") {
      // Development optimizations
      pinoConfig["transport"] = {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      };
    }

    return createPinoLogger(pinoConfig);
  }

  private addCorrelation(meta: Record<string, unknown>): Record<string, unknown> {
    if (!this.config.enableCorrelationIds || this.correlationId === undefined) {
      return meta;
    }
    return { ...meta, correlationId: this.correlationId };
  }

  private getDefaultConfig(): ILoggerConfig {
    return {
      environment: "development",
      logLevel: "info",
      port: 3000,
      transports: [
        {
          type: "console",
          enabled: true,
          level: "debug",
        },
      ],
      performance: {
        enabled: true,
        sampleRate: 0.1,
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
      bufferSize: 1000,
      flushIntervalMs: 5000,
      enableCorrelationIds: true,
      timestampFormat: "iso",
    };
  }

  /**
   * Type guard to check if the stored config is a valid ILoggerConfig
   */
  private isLoggerConfig(value: unknown): value is ILoggerConfig {
    return (
      value !== null &&
      typeof value === "object" &&
      "logLevel" in value &&
      typeof (value as { logLevel: unknown }).logLevel === "string" &&
      ["debug", "info", "warn", "error"].includes((value as { logLevel: string }).logLevel)
    );
  }
}

/**
 * Legacy Pino logger for backward compatibility
 */
export class PinoLogger extends HighPerformancePinoLogger {
  constructor(configOptions: Partial<ILoggerConfig> = {}) {
    // Use simplified config for backward compatibility
    const legacyConfig = {
      transports: [{ type: "console" as const, enabled: true }],
      performance: { enabled: false, sampleRate: 0, thresholdMs: 1000 },
      circuitBreaker: { enabled: false, failureThreshold: 10, resetTimeoutMs: 60000, monitorTimeWindowMs: 120000 },
      objectPool: { enabled: false, initialSize: 0, maxSize: 0, growthFactor: 1 },
      enableCorrelationIds: true,
      timestampFormat: "iso" as const,
      ...configOptions,
    };

    super(legacyConfig);
  }
}
