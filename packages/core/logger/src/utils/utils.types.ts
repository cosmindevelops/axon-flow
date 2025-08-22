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
