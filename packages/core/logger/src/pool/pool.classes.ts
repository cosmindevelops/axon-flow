/**
 * Object pool implementation for high-performance logging
 * Reduces GC pressure by reusing log entry objects
 */

import type { IObjectPool, ILogEntry, IObjectPoolConfig } from "../types/index.js";

// Temporary workaround for types package issues
type CorrelationId = string;

/**
 * Generic object pool implementation
 */
export class ObjectPool<T> implements IObjectPool<T> {
  private readonly pool: T[] = [];
  private readonly factory: () => T;
  private readonly reset: (item: T) => void;
  private readonly config: IObjectPoolConfig;

  constructor(factory: () => T, reset: (item: T) => void, config: IObjectPoolConfig) {
    this.factory = factory;
    this.reset = reset;
    this.config = config;

    // Pre-populate pool with initial objects
    for (let i = 0; i < config.initialSize; i++) {
      this.pool.push(this.factory());
    }
  }

  acquire(): T {
    const item = this.pool.pop();
    if (item !== undefined) {
      return item;
    }

    // Pool exhausted, create new object if under max size
    if (this.size() < this.config.maxSize) {
      return this.factory();
    }

    // Pool at max capacity, return new object (will be GC'd)
    return this.factory();
  }

  release(item: T): void {
    if (this.pool.length >= this.config.maxSize) {
      // Pool at capacity, let GC handle the object
      return;
    }

    this.reset(item);
    this.pool.push(item);
  }

  size(): number {
    return this.pool.length;
  }

  available(): number {
    return this.pool.length;
  }

  destroy(): void {
    this.pool.length = 0;
  }
}

/**
 * Log entry factory function
 */
function createLogEntry(): ILogEntry {
  return {
    level: "",
    message: "",
    timestamp: 0,
    correlationId: undefined,
    meta: {},
  };
}

/**
 * Log entry reset function for object pooling
 */
function resetLogEntry(entry: ILogEntry): void {
  entry.level = "";
  entry.message = "";
  entry.timestamp = 0;
  entry.correlationId = undefined;
  entry.meta = {};
}

/**
 * Singleton log entry pool for high-performance logging
 */
class LogEntryPool {
  private pool: ObjectPool<ILogEntry> | null = null;
  private config: IObjectPoolConfig | null = null;

  initialize(config: IObjectPoolConfig): void {
    if (this.pool) {
      this.pool.destroy();
    }

    this.config = config;
    this.pool = new ObjectPool(createLogEntry, resetLogEntry, config);
  }

  acquire(): ILogEntry {
    if (!this.pool) {
      // Fallback if pool not initialized
      return createLogEntry();
    }

    return this.pool.acquire();
  }

  release(entry: ILogEntry): void {
    if (!this.pool) {
      return;
    }

    this.pool.release(entry);
  }

  getMetrics() {
    if (!this.pool || !this.config) {
      return {
        available: 0,
        total: 0,
        utilization: 0,
        maxSize: 0,
      };
    }

    return {
      available: this.pool.available(),
      total: this.pool.size(),
      utilization: 1 - this.pool.available() / this.config.maxSize,
      maxSize: this.config.maxSize,
    };
  }

  destroy(): void {
    if (this.pool) {
      this.pool.destroy();
      this.pool = null;
      this.config = null;
    }
  }
}

/**
 * Global log entry pool instance
 */
export const logEntryPool = new LogEntryPool();

/**
 * Creates a log entry from pool with provided data
 */
export function createPooledLogEntry(
  level: string,
  message: string,
  correlationId?: CorrelationId,
  meta: Record<string, unknown> = {},
): ILogEntry {
  const entry = logEntryPool.acquire();

  entry.level = level;
  entry.message = message;
  entry.timestamp = Date.now();
  entry.correlationId = correlationId;
  entry.meta = { ...meta };

  return entry;
}

/**
 * Returns a log entry to the pool
 */
export function releaseLogEntry(entry: ILogEntry): void {
  logEntryPool.release(entry);
}
