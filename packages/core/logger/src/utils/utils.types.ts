/**
 * Utility types for logger performance monitoring and helper functions
 */

/**
 * Configuration for lazy value evaluation
 */
export interface ILazyValueConfig<T> {
  factory: () => T;
  resetOnAccess?: boolean;
}

/**
 * Timer precision levels
 */
export type TimerPrecision = "millisecond" | "microsecond" | "nanosecond";

/**
 * Debounce function configuration
 */
export interface IDebounceConfig {
  waitMs: number;
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
}

/**
 * Throttle function configuration
 */
export interface IThrottleConfig {
  limitMs: number;
  leading?: boolean;
  trailing?: boolean;
}

/**
 * Circular buffer statistics
 */
export interface ICircularBufferStats {
  size: number;
  capacity: number;
  utilization: number;
  averageValue?: number;
  minValue?: number;
  maxValue?: number;
}

/**
 * Performance measurement options
 */
export interface IPerformanceMeasurementOptions {
  precision: TimerPrecision;
  enableStats: boolean;
  maxHistorySize: number;
}

/**
 * Timer state for high-resolution timing
 */
export interface ITimerState {
  startTime: number;
  elapsedTime?: number;
  isRunning: boolean;
}

/**
 * Generic factory function type
 */
export type Factory<T> = () => T;

/**
 * Debounced function type
 */
export type DebouncedFunction<T extends unknown[]> = {
  (...args: T): void;
  cancel(): void;
  flush(): void;
};

/**
 * Throttled function type
 */
export type ThrottledFunction<T extends unknown[]> = {
  (...args: T): void;
  cancel(): void;
  flush(): void;
};

/**
 * Platform types for cross-environment support
 */
export type Platform = "node" | "browser" | "deno" | "unknown";

/**
 * File rotation strategies
 */
export type RotationStrategy = "size" | "time" | "combined";

/**
 * Compression formats
 */
export type CompressionFormat = "gzip" | "deflate" | "brotli" | "none";

/**
 * Platform detection interface
 */
export interface IPlatformDetection {
  platform: Platform;
  isNode: boolean;
  isBrowser: boolean;
  isDeno: boolean;
  supportsFileSystem: boolean;
  supportsStreams: boolean;
  supportsCompression: boolean;
  supportsHighResTime: boolean;
}

/**
 * File rotation options
 */
export interface IFileRotationOptions {
  strategy: RotationStrategy;
  maxSize?: number; // Size in bytes
  maxAge?: number; // Age in milliseconds
  maxFiles?: number; // Maximum number of files to keep
  dateFormat?: string; // Date format for time-based rotation
  compress?: boolean; // Whether to compress rotated files
  compressionFormat?: CompressionFormat;
}

/**
 * Compression options
 */
export interface ICompressionOptions {
  format: CompressionFormat;
  level?: number; // Compression level (1-9)
  chunkSize?: number; // Chunk size for streaming compression
  memLevel?: number; // Memory level for gzip
}

/**
 * Stream options for cross-platform streams
 */
export interface IStreamOptions {
  encoding?: BufferEncoding;
  flags?: string;
  mode?: number;
  autoClose?: boolean;
  highWaterMark?: number;
  objectMode?: boolean;
}

/**
 * Storage options for cross-platform storage
 */
export interface IStorageOptions {
  basePath?: string;
  maxSize?: number; // Maximum storage size in bytes
  enableIndexedDB?: boolean; // Use IndexedDB in browser
  fallbackToLocalStorage?: boolean; // Fallback to localStorage
  compression?: boolean; // Enable compression for stored data
  encryption?: boolean; // Enable encryption for stored data
}
