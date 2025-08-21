/**
 * Object pooling utility for performance optimization
 * @module @axon/config/builders/utils/object-pool
 */

import { ConfigurationError } from "@axon/errors";

/**
 * Generic object pool interface
 */
export interface IObjectPool<T> {
  /**
   * Acquire an object from the pool
   */
  acquire(): T;

  /**
   * Return an object to the pool
   */
  release(obj: T): void;

  /**
   * Clear all objects from the pool
   */
  clear(): void;

  /**
   * Get pool statistics
   */
  getStats(): IPoolStats;
}

/**
 * Pool statistics interface
 */
export interface IPoolStats {
  readonly size: number;
  readonly inUse: number;
  readonly available: number;
  readonly totalCreated: number;
  readonly totalAcquired: number;
  readonly totalReleased: number;
}

/**
 * Object pool configuration options
 */
export interface IObjectPoolOptions<T> {
  /**
   * Factory function to create new objects
   */
  readonly factory: () => T;

  /**
   * Reset function to clean object state before reuse
   */
  readonly reset?: (obj: T) => void;

  /**
   * Validation function to check object health
   */
  readonly validate?: (obj: T) => boolean;

  /**
   * Maximum pool size (0 = unlimited)
   * @default 50
   */
  readonly maxSize?: number;

  /**
   * Initial pool size
   * @default 0
   */
  readonly initialSize?: number;

  /**
   * Whether to validate objects on acquire
   * @default false
   */
  readonly validateOnAcquire?: boolean;

  /**
   * Whether to validate objects on release
   * @default false
   */
  readonly validateOnRelease?: boolean;
}

/**
 * High-performance generic object pool implementation
 */
export class ObjectPool<T extends object> implements IObjectPool<T> {
  private readonly _factory: () => T;
  private readonly _reset: ((obj: T) => void) | undefined;
  private readonly _validate: ((obj: T) => boolean) | undefined;
  private readonly _maxSize: number;
  private readonly _validateOnAcquire: boolean;
  private readonly _validateOnRelease: boolean;

  private readonly _available: T[] = [];
  private readonly _inUse = new WeakSet<T>();

  // Statistics tracking
  private _totalCreated = 0;
  private _totalAcquired = 0;
  private _totalReleased = 0;

  constructor(options: IObjectPoolOptions<T>) {
    this._factory = options.factory;
    this._reset = options.reset;
    this._validate = options.validate;
    this._maxSize = options.maxSize ?? 50;
    this._validateOnAcquire = options.validateOnAcquire ?? false;
    this._validateOnRelease = options.validateOnRelease ?? false;

    // Pre-populate pool if initial size specified
    const initialSize = options.initialSize ?? 0;
    for (let i = 0; i < initialSize; i++) {
      const obj = this._createObject();
      this._available.push(obj);
    }
  }

  /**
   * Acquire an object from the pool
   */
  acquire(): T {
    let obj: T;

    // Try to get from available pool first
    const availableObj = this._available.pop();
    if (availableObj) {
      obj = availableObj;
    } else {
      // Create new object if pool is empty
      obj = this._createObject();
    }

    // Validate if required
    if (this._validateOnAcquire && this._validate && !this._validate(obj)) {
      // Object is invalid, create a new one
      obj = this._createObject();
    }

    // Reset object state if required
    if (this._reset) {
      try {
        this._reset(obj);
      } catch (error) {
        throw new ConfigurationError("Failed to reset pooled object", {
          component: "ObjectPool",
          operation: "acquire",
          metadata: {
            poolSize: this._available.length,
            inUse: this.getStats().inUse,
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }

    // Track as in use
    this._inUse.add(obj);
    this._totalAcquired++;

    return obj;
  }

  /**
   * Return an object to the pool
   */
  release(obj: T): void {
    // Check if object was actually acquired from this pool
    if (!this._inUse.has(obj)) {
      throw new ConfigurationError("Attempted to release object not acquired from this pool", {
        component: "ObjectPool",
        operation: "release",
        metadata: {
          poolSize: this._available.length,
          maxSize: this._maxSize,
        },
      });
    }

    // Remove from in-use tracking
    this._inUse.delete(obj);

    // Validate if required
    if (this._validateOnRelease && this._validate && !this._validate(obj)) {
      // Object is invalid, don't return to pool
      this._totalReleased++;
      return;
    }

    // Return to pool if not at max capacity
    if (this._maxSize === 0 || this._available.length < this._maxSize) {
      this._available.push(obj);
    }

    this._totalReleased++;
  }

  /**
   * Clear all objects from the pool
   */
  clear(): void {
    this._available.length = 0;
    // Note: We can't clear WeakSet, but objects will be garbage collected
  }

  /**
   * Get pool statistics
   */
  getStats(): IPoolStats {
    return {
      size: this._available.length,
      inUse: this._totalAcquired - this._totalReleased,
      available: this._available.length,
      totalCreated: this._totalCreated,
      totalAcquired: this._totalAcquired,
      totalReleased: this._totalReleased,
    };
  }

  /**
   * Create a new object and track statistics
   */
  private _createObject(): T {
    try {
      const obj = this._factory();
      this._totalCreated++;
      return obj;
    } catch (error) {
      throw new ConfigurationError("Failed to create object in pool", {
        component: "ObjectPool",
        operation: "create",
        metadata: {
          totalCreated: this._totalCreated,
          poolSize: this._available.length,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }
}

/**
 * Global repository pool registry
 */
const _repositoryPools = new Map<string, ObjectPool<object>>();

/**
 * Test environment state interface
 */
interface ITestState {
  isTestEnvironment: boolean;
  testSessionCounter: number;
}

/**
 * Test environment state
 */
const _testState: ITestState = {
  isTestEnvironment: false,
  testSessionCounter: 0,
};

/**
 * Set test environment state
 */
export function setTestEnvironment(enabled: boolean): void {
  _testState.isTestEnvironment = enabled;
  if (enabled) {
    _testState.testSessionCounter++;
    clearAllRepositoryPools();
  }
}

/**
 * Check if running in test environment
 */
export function isTestEnvironment(): boolean {
  return _testState.isTestEnvironment;
}

/**
 * Get or create a pool for a specific repository type
 */
export function getRepositoryPool<T extends object>(
  key: string,
  factory: () => T,
  options?: Partial<IObjectPoolOptions<T>>,
): ObjectPool<T> {
  // In test environment, create unique keys to prevent collisions
  const poolKey = _testState.isTestEnvironment
    ? `test_${_testState.testSessionCounter.toString()}_${Date.now().toString()}_${key}`
    : key;

  if (!_repositoryPools.has(poolKey)) {
    const poolOptions: IObjectPoolOptions<T> = {
      factory,
      maxSize: 10, // Conservative default for repositories
      validateOnAcquire: true,
      ...options,
    };

    _repositoryPools.set(poolKey, new ObjectPool(poolOptions) as unknown as ObjectPool<object>);
  }

  return _repositoryPools.get(poolKey) as unknown as ObjectPool<T>;
}

/**
 * Clear all repository pools
 */
export function clearAllRepositoryPools(): void {
  const poolValues = Array.from(_repositoryPools.values());
  for (const pool of poolValues) {
    pool.clear();
  }
  _repositoryPools.clear();
}

/**
 * Get statistics for all pools
 */
export function getAllRepositoryPoolStats(): Record<string, IPoolStats> {
  const stats: Record<string, IPoolStats> = {};
  const poolEntries = Array.from(_repositoryPools.entries());

  for (const [key, pool] of poolEntries) {
    stats[key] = pool.getStats();
  }

  return stats;
}
