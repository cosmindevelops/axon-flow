/**
 * Transport types and interfaces
 */

/**
 * Transport provider interface following Provider pattern
 */
export interface ITransportProvider {
  write(logEntry: Record<string, unknown>): Promise<void>;
  close?(): Promise<void>;
  flush?(): Promise<void>;
}

/**
 * Console transport options
 */
export interface IConsoleTransportOptions {
  prettyPrint?: boolean;
  colorize?: boolean;
}

/**
 * File transport options
 */
export interface IFileTransportOptions {
  readonly path: string;
  readonly maxSize?: number;
  readonly maxFiles?: number;
  readonly rotateDaily?: boolean;
}

/**
 * Remote transport options
 */
export interface IRemoteTransportOptions {
  url: string;
  headers?: Record<string, string>;
  batchSize?: number;
  flushInterval?: number;
  retryAttempts?: number;
  retryDelay?: number;
}
