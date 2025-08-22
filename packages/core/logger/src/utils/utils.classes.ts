/**
 * Performance monitoring utilities for high-performance logging
 */

import type { IPerformanceMetrics, IPerformanceConfig, CircuitBreakerState } from "../types/index.js";

/**
 * Performance tracker for monitoring logging operations
 */
export class PerformanceTracker {
  private startTime = Date.now();
  private totalLogs = 0;
  private failedLogs = 0;
  private latencies: number[] = [];
  private readonly config: IPerformanceConfig;
  private readonly maxLatencyHistory = 1000; // Keep last 1000 latency measurements

  constructor(config: IPerformanceConfig) {
    this.config = config;
  }

  /**
   * Start timing a logging operation
   */
  startOperation(): () => void {
    if (!this.config.enabled || Math.random() > this.config.sampleRate) {
      // No-op for disabled or unsampled operations
      return () => {
        // Intentionally empty for performance when monitoring is disabled
      };
    }

    const operationStart = performance.now();

    return () => {
      const latency = performance.now() - operationStart;
      this.recordLatency(latency);

      if (latency > this.config.thresholdMs) {
        console.warn(
          `Slow logging operation detected: ${latency.toFixed(2)}ms (threshold: ${this.config.thresholdMs.toString()}ms)`,
        );
      }
    };
  }

  /**
   * Record a successful log operation
   */
  recordSuccess(): void {
    this.totalLogs++;
  }

  /**
   * Record a failed log operation
   */
  recordFailure(): void {
    this.totalLogs++;
    this.failedLogs++;
  }

  /**
   * Record operation latency
   */
  private recordLatency(latency: number): void {
    this.latencies.push(latency);

    // Keep only recent latencies to prevent memory growth
    if (this.latencies.length > this.maxLatencyHistory) {
      this.latencies.shift();
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(circuitBreakerState: CircuitBreakerState, objectPoolUtilization: number): IPerformanceMetrics {
    const now = Date.now();
    const elapsedSeconds = (now - this.startTime) / 1000;

    const logsPerSecond = elapsedSeconds > 0 ? this.totalLogs / elapsedSeconds : 0;
    const averageLatencyMs =
      this.latencies.length > 0 ? this.latencies.reduce((sum, lat) => sum + lat, 0) / this.latencies.length : 0;
    const peakLatencyMs = this.latencies.length > 0 ? Math.max(...this.latencies) : 0;

    return {
      logsPerSecond,
      averageLatencyMs,
      peakLatencyMs,
      totalLogs: this.totalLogs,
      failedLogs: this.failedLogs,
      circuitBreakerState,
      objectPoolUtilization,
    };
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  reset(): void {
    this.startTime = Date.now();
    this.totalLogs = 0;
    this.failedLogs = 0;
    this.latencies.length = 0;
  }
}

/**
 * Lazy evaluation utility for expensive operations
 */
export class LazyValue<T> {
  private value: T | undefined = undefined;
  private computed = false;

  constructor(private readonly factory: () => T) {}

  get(): T {
    if (!this.computed) {
      this.value = this.factory();
      this.computed = true;
    }
    // Safe to assert here because we know value is computed
    if (this.value === undefined) {
      throw new Error("LazyValue factory returned undefined");
    }
    return this.value;
  }

  reset(): void {
    this.value = undefined;
    this.computed = false;
  }
}

/**
 * High-resolution timer for precise performance measurements
 */
export class HighResolutionTimer {
  private startTime: number;

  constructor() {
    this.startTime = performance.now();
  }

  /**
   * Get elapsed time in milliseconds with sub-millisecond precision
   */
  elapsed(): number {
    return performance.now() - this.startTime;
  }

  /**
   * Reset the timer
   */
  reset(): void {
    this.startTime = performance.now();
  }

  /**
   * Get elapsed time and reset in one operation
   */
  lap(): number {
    const elapsed = this.elapsed();
    this.reset();
    return elapsed;
  }
}

/**
 * Simple debounce utility for batching operations
 */
export function debounce<T extends unknown[]>(func: (...args: T) => void, waitMs: number): (...args: T) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: T) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, waitMs);
  };
}

/**
 * Throttle utility for rate limiting
 */
export function throttle<T extends unknown[]>(func: (...args: T) => void, limitMs: number): (...args: T) => void {
  let lastCallTime = 0;

  return (...args: T) => {
    const now = Date.now();
    if (now - lastCallTime >= limitMs) {
      lastCallTime = now;
      func(...args);
    }
  };
}

/**
 * Memory-efficient circular buffer for storing recent values
 */
export class CircularBuffer<T> {
  private buffer: T[];
  private head = 0;
  private tail = 0;
  private count = 0;

  constructor(private readonly capacity: number) {
    this.buffer = new Array<T>(capacity);
  }

  push(item: T): void {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;

    if (this.count < this.capacity) {
      this.count++;
    } else {
      this.head = (this.head + 1) % this.capacity;
    }
  }

  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.count; i++) {
      const index = (this.head + i) % this.capacity;
      const item = this.buffer[index];
      if (item !== undefined) {
        result.push(item);
      }
    }
    return result;
  }

  size(): number {
    return this.count;
  }

  clear(): void {
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }
}
