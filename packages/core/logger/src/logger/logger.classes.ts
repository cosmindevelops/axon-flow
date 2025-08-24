/**
 * High-performance logger implementation classes
 */

// Removed problematic config import to fix lint errors
// import { config } from "@axon/config";
import type { CorrelationId } from "../correlation/core/core.types.js";
import { CorrelationManagerFactory } from "../correlation/core/core.classes.js";
import type { IEnhancedCorrelationManager } from "../correlation/core/core.types.js";
import type { Logger } from "pino";
import {
  executeWithCircuitBreaker,
  getCircuitBreaker,
  initializeCircuitBreaker,
} from "../circuit-breaker/circuit-breaker.classes.js";
import { createPooledLogEntry, logEntryPool, releaseLogEntry } from "../pool/pool.classes.js";
import { MultiTransportManager } from "../transport/transport.classes.js";
import type { ILogger, ILoggerConfig } from "./logger.types.js";
import type { IPerformanceMetrics } from "../types/index.js";
import type { IEnhancedPerformanceConfig } from "../performance/core/core.types.js";
import { EnhancedPerformanceTracker } from "../performance/core/core.classes.js";

// Dynamic pino import to handle CommonJS compatibility
let pinoModule: any = null;

const getPino = async () => {
  if (!pinoModule) {
    pinoModule = await import("pino");
    return pinoModule.default || pinoModule;
  }
  return pinoModule.default || pinoModule;
};

// Type-safe pino factory function
const createPinoLogger = async (config: Record<string, unknown>): Promise<Logger> => {
  const pino = await getPino();
  return pino(config);
};

// Type-safe access to pino static properties
const getPinoStatics = async () => {
  const pino = await getPino();
  return {
    stdSerializers: pino.stdSerializers,
    stdTimeFunctions: {
      isoTime: pino.stdTimeFunctions.isoTime,
      unixTime: pino.stdTimeFunctions.unixTime,
    },
  };
};

/**
 * High-performance Pino-based logger implementation
 */
export class HighPerformancePinoLogger implements ILogger {
  private logger: Logger | null = null;
  private correlationId?: CorrelationId;
  private readonly config: ILoggerConfig;
  private readonly transportManager?: MultiTransportManager;
  private readonly performanceTracker: EnhancedPerformanceTracker;
  private readonly correlationManager: IEnhancedCorrelationManager;
  private readonly loggerInitPromise: Promise<void>;

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

    // Initialize enhanced performance tracker with extended config
    const enhancedPerfConfig: IEnhancedPerformanceConfig = {
      ...this.config.performance,
      enableMemoryTracking: true,
      enableGCTracking: false, // Conservative default
      maxLatencyHistory: 100,
      maxGCEventHistory: 50,
      resourceMetricsInterval: 5000,
      enableMeasurementPooling: true,
      measurementPoolInitialSize: 20,
      measurementPoolMaxSize: 100,
      enableEnvironmentOptimization: true,
      enableAutoProfileSelection: false,
      enableParityValidation: false,
      parityValidationInterval: 0,
      enableWebWorkerSupport: false,
      enableBrowserFallbacks: true,
    };
    this.performanceTracker = new EnhancedPerformanceTracker(enhancedPerfConfig);

    // Initialize correlation manager
    const factory = new CorrelationManagerFactory();
    this.correlationManager = factory.create();

    // Create transport manager if transports are configured
    if (this.config.transports.length > 0) {
      // Wrap transport configs in IMultiTransportConfig structure
      const multiTransportConfig = {
        transports: this.config.transports.map((transport, index) => ({
          ...transport,
          name: transport.name || `transport-${index}`,
        })),
      };
      this.transportManager = new MultiTransportManager(multiTransportConfig);
    }

    // Configure Pino logger asynchronously
    this.loggerInitPromise = this.initializePinoLogger();
  }

  private async initializePinoLogger(): Promise<void> {
    this.logger = await this.createPinoLogger();
  }

  private async ensureLoggerInitialized(): Promise<Logger> {
    await this.loggerInitPromise;
    if (!this.logger) {
      throw new Error("Logger failed to initialize");
    }
    return this.logger;
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
    (newLogger as any).correlationId = correlationId;

    // Share the correlation manager to ensure consistent context
    (newLogger as any).correlationManager = this.correlationManager;

    // Share the logger initialization promise to use the same Pino instance
    (newLogger as any).loggerInitPromise = this.loggerInitPromise;
    (newLogger as any).logger = this.logger;

    return newLogger;
  }

  /**
   * Execute function with correlation context
   */
  withContext<T>(correlationId: CorrelationId, fn: () => T): T {
    return this.correlationManager.with(correlationId, fn);
  }

  /**
   * Execute async function with correlation context
   */
  async withContextAsync<T>(correlationId: CorrelationId, fn: () => Promise<T>): Promise<T> {
    return this.correlationManager.withAsync(correlationId, fn);
  }

  /**
   * Get current correlation ID from context
   */
  getCurrentCorrelationId(): CorrelationId | undefined {
    return this.correlationManager.current();
  }

  /**
   * Create new correlation ID
   */
  createCorrelationId(prefix?: string): CorrelationId {
    return this.correlationManager.create(prefix);
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

    // EnhancedPerformanceTracker returns enhanced metrics directly
    const enhancedMetrics = this.performanceTracker.getMetrics();

    // Convert to legacy IPerformanceMetrics format
    return {
      logsPerSecond: enhancedMetrics.logsPerSecond,
      averageLatencyMs: enhancedMetrics.averageLatencyMs,
      peakLatencyMs: enhancedMetrics.peakLatencyMs,
      totalLogs: enhancedMetrics.totalLogs,
      failedLogs: enhancedMetrics.failedLogs,
      circuitBreakerState,
      objectPoolUtilization,
    };
  }

  isHealthy(): boolean {
    const circuitBreaker = getCircuitBreaker();
    const circuitBreakerHealthy = !circuitBreaker || circuitBreaker.state !== "open";

    const transportsHealthy = !this.transportManager || this.transportManager.getHealthyTransports().length > 0;

    return circuitBreakerHealthy && transportsHealthy;
  }

  private logWithPerformanceTracking(level: string, message: string, meta: Record<string, unknown>): void {
    const measurement = this.performanceTracker.startOperation("log", {
      level,
      transportType: this.transportManager ? "custom" : "pino",
    });

    const logOperation = async (): Promise<void> => {
      try {
        if (this.transportManager) {
          // Use custom transports with object pooling
          await this.logToTransports(level, message, meta);
        } else {
          // Use standard Pino logging
          await this.logToPino(level, message, meta);
        }

        this.performanceTracker.recordSuccess();
      } catch (error) {
        this.performanceTracker.recordFailure();
        // Fall back to console.error to ensure critical errors aren't lost
        console.error("Logger failed:", error);
        console.error("Original message:", { level, message, meta });
      } finally {
        this.performanceTracker.finishOperation(measurement);
      }
    };

    // Execute async operation without blocking
    void logOperation();
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

  private async logToPino(level: string, message: string, meta: Record<string, unknown>): Promise<void> {
    const logger = await this.ensureLoggerInitialized();
    const enrichedMeta = this.addCorrelation(meta);

    switch (level) {
      case "debug":
        logger.debug(enrichedMeta, message);
        break;
      case "info":
        logger.info(enrichedMeta, message);
        break;
      case "warn":
        logger.warn(enrichedMeta, message);
        break;
      case "error":
        logger.error(enrichedMeta, message);
        break;
      default:
        logger.info(enrichedMeta, message);
    }
  }

  private async createPinoLogger(): Promise<Logger> {
    const pinoStatics = await getPinoStatics();
    const pinoConfig: Record<string, unknown> = {
      level: this.config.logLevel,
      formatters: {
        level: (label: string) => ({ level: label }),
      },
      serializers: pinoStatics.stdSerializers,
    };

    // Use ISO timestamp by default
    pinoConfig["timestamp"] = pinoStatics.stdTimeFunctions.isoTime;

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
    } else if (this.config.environment === "test") {
      // Test environment: Use default stream
      pinoConfig["level"] = this.config.logLevel;
      const pino = await getPino();
      return pino(pinoConfig, process.stdout);
    }

    return createPinoLogger(pinoConfig);
  }

  private addCorrelation(meta: Record<string, unknown>): Record<string, unknown> {
    // Always enable correlation IDs for enhanced tracking
    // Priority: manual correlation ID > automatic context detection
    let correlationId = this.correlationId;

    // If no manual correlation ID, try to get from correlation manager context
    if (!correlationId) {
      try {
        correlationId = this.correlationManager.current();
      } catch (error) {
        // Silently handle correlation manager errors to prevent logging failures
        console.warn("Failed to get correlation context:", error);
      }
    }

    if (!correlationId) {
      return meta;
    }

    return { ...meta, correlationId };
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
      ...configOptions,
    };

    super(legacyConfig);
  }
}
