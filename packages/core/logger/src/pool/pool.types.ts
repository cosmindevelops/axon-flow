/**
 * Object pool types and interfaces
 */

/**
 * Object pool interface for generic object pooling
 */
export interface IObjectPool<T> {
  acquire(): T;
  release(obj: T): void;
  size(): number;
  available(): number;
  clear(): void;
}

/**
 * Pool configuration options
 */
export interface IPoolOptions {
  maxSize: number;
  initialSize: number;
  growthFactor: number;
  factory: () => unknown;
  reset?: (obj: unknown) => void;
}

/**
 * Log entry structure for pooling
 */
export interface ILogEntry {
  level: string;
  message: string;
  timestamp?: string;
  correlationId?: string;
  [key: string]: unknown;
}
