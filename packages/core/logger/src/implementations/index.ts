/**
 * Logger implementation classes
 */

import { config } from "@axon/config";
import type { CorrelationId } from "@axon/types";
import type { Logger } from "pino";
import type { ILogger, ILoggerConfig } from "../types/index.js";

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-require-imports */
// Using require due to esModuleInterop issues with pino in this configuration
const pino = require("pino");

/**
 * Pino-based logger implementation
 */
export class PinoLogger implements ILogger {
  private readonly logger: Logger;
  private correlationId?: CorrelationId;

  constructor(configOptions: Partial<ILoggerConfig> = {}) {
    const storedConfig = config.get("logger");
    const loggerConfig = this.isLoggerConfig(storedConfig) ? storedConfig : configOptions;

    this.logger = pino({
      level: loggerConfig.logLevel ?? "info",
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label: string) => ({ level: label }),
      },
      serializers: pino.stdSerializers,
    }) as Logger;
  }

  debug(message: string, meta: Record<string, unknown> = {}): void {
    this.logger.debug(this.addCorrelation(meta), message);
  }

  info(message: string, meta: Record<string, unknown> = {}): void {
    this.logger.info(this.addCorrelation(meta), message);
  }

  warn(message: string, meta: Record<string, unknown> = {}): void {
    this.logger.warn(this.addCorrelation(meta), message);
  }

  error(message: string, meta: Record<string, unknown> = {}): void {
    this.logger.error(this.addCorrelation(meta), message);
  }

  withCorrelation(correlationId: CorrelationId): ILogger {
    const newLogger = new PinoLogger();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (newLogger as any).correlationId = correlationId;
    return newLogger;
  }

  private addCorrelation(meta: Record<string, unknown>): Record<string, unknown> {
    return this.correlationId !== undefined ? { ...meta, correlationId: this.correlationId } : meta;
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
