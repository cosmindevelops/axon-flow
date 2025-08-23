/**
 * Lifecycle management implementations
 *
 * Concrete implementations of lifecycle managers for singleton, transient, and scoped instances
 */

import type {
  ILifecycleManager,
  ILifecycleStats,
  ILifecycleFactory,
  ISingletonLifecycleConfig,
  ITransientLifecycleConfig,
  IScopedLifecycleConfig,
  IScopeManager,
  IScopeStats,
  LifecycleStrategy,
} from "./lifecycle.types.js";

import type { DIToken, IResolutionContext } from "../container/container.types.js";
import type { ObjectPool } from "../pool/pool.classes.js";

// Import proper error classes from @axon/errors
import { ApplicationError, SystemError } from "@axon/errors";

/**
 * Base lifecycle manager with common functionality
 */
abstract class BaseLifecycleManager<T = unknown> implements ILifecycleManager<T> {
  public abstract readonly strategy: LifecycleStrategy;

  protected creationTimes: number[] = [];
  protected totalInstancesCreated = 0;
  protected disposed = false;

  public abstract getInstance(token: DIToken<T>, factory: () => T, _context?: IResolutionContext): T;
  public abstract hasInstance(token: DIToken<T>, _context?: IResolutionContext): boolean;
  public abstract clearInstance(token: DIToken<T>, _context?: IResolutionContext): boolean;
  public abstract clearAll(): void;

  public getStats(): ILifecycleStats {
    this.ensureNotDisposed();

    const avgTime =
      this.creationTimes.length > 0 ? this.creationTimes.reduce((a, b) => a + b, 0) / this.creationTimes.length : 0;

    const peakTime = this.creationTimes.length > 0 ? Math.max(...this.creationTimes) : 0;

    return {
      totalInstancesCreated: this.totalInstancesCreated,
      cachedInstancesCount: this.getCachedInstancesCount(),
      cacheHitRatio: this.getCacheHitRatio(),
      estimatedMemoryUsage: this.getEstimatedMemoryUsage(),
      averageCreationTime: avgTime,
      peakCreationTime: peakTime,
    };
  }

  public dispose(): void {
    if (this.disposed) return;

    this.clearAll();
    this.creationTimes.length = 0;
    this.disposed = true;
  }

  protected ensureNotDisposed(): void {
    if (this.disposed) {
      throw new ApplicationError(`${this.strategy} lifecycle manager has been disposed`, "LIFECYCLE_MANAGER_DISPOSED", {
        correlationId: `lifecycle_disposed_${Date.now()}`,
        metadata: { strategy: this.strategy },
      });
    }
  }

  protected trackCreation(startTime: number): void {
    const duration = performance.now() - startTime;
    this.creationTimes.push(duration);
    this.totalInstancesCreated++;

    // Keep only recent measurements for rolling average
    if (this.creationTimes.length > 1000) {
      this.creationTimes.splice(0, 500);
    }
  }

  protected abstract getCachedInstancesCount(): number;
  protected abstract getCacheHitRatio(): number;
  protected abstract getEstimatedMemoryUsage(): number;
}

/**
 * Singleton lifecycle manager - one instance per token
 */
export class SingletonLifecycleManager<T = unknown> extends BaseLifecycleManager<T> {
  public readonly strategy: LifecycleStrategy = "singleton";

  private readonly instances = new Map<DIToken<T>, T>();
  private readonly config: Required<ISingletonLifecycleConfig>;
  private cacheHits = 0;
  private cacheRequests = 0;

  constructor(config: ISingletonLifecycleConfig = {}) {
    super();
    this.config = {
      lazy: true,
      threadSafe: false,
      maxInstances: 1000,
      ...config,
    };
  }

  public getInstance(token: DIToken<T>, factory: () => T, _context?: IResolutionContext): T {
    this.ensureNotDisposed();
    this.cacheRequests++;

    // Check if instance already exists
    const existing = this.instances.get(token);
    if (existing !== undefined) {
      this.cacheHits++;
      return existing;
    }

    // Check instance limit
    if (this.instances.size >= this.config.maxInstances) {
      // Remove oldest instance (simple LRU)
      const firstKey = this.instances.keys().next().value;
      if (firstKey) {
        this.instances.delete(firstKey);
      }
    }

    // Create new instance
    const startTime = performance.now();
    try {
      const instance = factory();
      this.instances.set(token, instance);
      this.trackCreation(startTime);
      return instance;
    } catch (_error) {
      this.trackCreation(startTime);
      throw _error;
    }
  }

  public hasInstance(token: DIToken<T>): boolean {
    return this.instances.has(token);
  }

  public clearInstance(token: DIToken<T>): boolean {
    return this.instances.delete(token);
  }

  public clearAll(): void {
    this.instances.clear();
    this.cacheHits = 0;
    this.cacheRequests = 0;
  }

  protected getCachedInstancesCount(): number {
    return this.instances.size;
  }

  protected getCacheHitRatio(): number {
    return this.cacheRequests > 0 ? this.cacheHits / this.cacheRequests : 0;
  }

  protected getEstimatedMemoryUsage(): number {
    // Rough estimation: each cached instance ~200 bytes overhead
    return this.instances.size * 200;
  }
}

/**
 * Transient lifecycle manager - new instance every time
 */
export class TransientLifecycleManager<T = unknown> extends BaseLifecycleManager<T> {
  public readonly strategy: LifecycleStrategy = "transient";

  private readonly config: ITransientLifecycleConfig;
  private readonly instancePool: T[] = [];
  private objectPool?: ObjectPool<T>;
  private poolHits = 0;
  private poolRequests = 0;

  constructor(config: ITransientLifecycleConfig = {}) {
    super();
    this.config = {
      trackInstances: false,
      enablePooling: false,
      poolSize: 10,
      ...config,
    };
  }

  public getInstance(token: DIToken<T>, factory: () => T, _context?: IResolutionContext): T {
    this.ensureNotDisposed();

    // Use advanced object pool if configured
    if (this.config.poolConfig) {
      if (!this.objectPool) {
        this.initializeObjectPool(token, factory);
      }
      // Object pool acquire is async, but we need sync behavior for DI container
      // This is a limitation - advanced pooling requires async getInstance method
      throw new SystemError(
        "Advanced object pooling requires async getInstance method. Use simple pooling for synchronous DI container.",
        "LIFECYCLE_ASYNC_POOL_NOT_SUPPORTED",
        {
          correlationId: `async_pool_${Date.now()}`,
          metadata: { token: String(token) },
        },
      );
    }

    // Use simple pooling if enabled
    if (this.config.enablePooling) {
      this.poolRequests++;
      if (this.instancePool.length > 0) {
        const pooledInstance = this.instancePool.pop();
        if (pooledInstance) {
          this.poolHits++;
          return pooledInstance;
        }
      }
    }

    // Create new instance
    const startTime = performance.now();
    try {
      const instance = factory();
      this.trackCreation(startTime);
      return instance;
    } catch (_error) {
      this.trackCreation(startTime);
      throw _error;
    }
  }

  public hasInstance(): boolean {
    // Transient instances are not cached
    return false;
  }

  public clearInstance(): boolean {
    // Transient instances are not cached
    return false;
  }

  public clearAll(): void {
    if (this.objectPool) {
      this.objectPool.drain();
    } else {
      this.instancePool.length = 0;
    }
    this.poolHits = 0;
    this.poolRequests = 0;
  }

  /**
   * Return instance to pool for reuse
   */
  public returnToPool(instance: T): void {
    if (this.objectPool) {
      this.objectPool.release(instance);
    } else if (this.config.enablePooling && this.instancePool.length < (this.config.poolSize || 10)) {
      this.instancePool.push(instance);
    }
  }

  /**
   * Get pool statistics if using advanced pooling
   */
  public getPoolStats() {
    return this.objectPool?.getStats();
  }

  protected getCachedInstancesCount(): number {
    if (this.objectPool) {
      return this.objectPool.getStats().poolSize;
    }
    return this.instancePool.length;
  }

  protected getCacheHitRatio(): number {
    if (this.objectPool) {
      return this.objectPool.getStats().hitRatio;
    }
    // Simple pooling hit ratio based on actual hits vs requests
    return this.config.enablePooling && this.poolRequests > 0 ? this.poolHits / this.poolRequests : 0;
  }

  protected getEstimatedMemoryUsage(): number {
    if (this.objectPool) {
      return this.objectPool.getStats().estimatedMemoryUsage;
    }
    return this.instancePool.length * 150; // Rough estimation for pooled instances
  }

  private initializeObjectPool(token: DIToken<T>, factory: () => T): void {
    if (!this.config.poolConfig) return;

    // Dynamic import for advanced object pool
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ObjectPool: objectPool } = require("../pool/pool.classes");
      this.objectPool = new objectPool(
        token,
        factory,
        this.config.poolConfig,
        this.config.validator as any,
        this.config.cleanupHandler as any,
      );
    } catch (_error) {
      throw new SystemError(
        "Advanced object pooling requires async getInstance method. Use simple pooling for synchronous DI container.",
        "LIFECYCLE_ASYNC_POOL_NOT_SUPPORTED",
        {
          correlationId: `async_pool_${Date.now()}`,
          metadata: { token: String(token) },
        },
      );
    }
  }

  public override dispose(): void {
    if (this.objectPool) {
      this.objectPool.destroy();
      delete (this as any).objectPool;
    }
    super.dispose();
  }
}

/**
 * Scope manager implementation for handling scoped instances
 */
export class ScopeManager implements IScopeManager {
  public readonly scopeId: string;
  public readonly parent?: IScopeManager;

  private readonly instances = new Map<DIToken, unknown>();
  private readonly childScopes = new Set<IScopeManager>();
  private readonly createdAt = new Date();
  private lastAccessedAt = new Date();
  private disposed = false;

  constructor(scopeId?: string, parent?: IScopeManager) {
    this.scopeId = scopeId || `scope_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    if (parent) {
      (this as any).parent = parent;
      // Add this scope to parent's children
      if (parent instanceof ScopeManager) {
        parent.childScopes.add(this);
      }
    }
  }

  public getInstance<T>(token: DIToken<T>): T | undefined {
    this.ensureNotDisposed();
    this.lastAccessedAt = new Date();
    return this.instances.get(token) as T;
  }

  public setInstance<T>(token: DIToken<T>, instance: T): void {
    this.ensureNotDisposed();
    this.lastAccessedAt = new Date();
    this.instances.set(token, instance);
  }

  public removeInstance<T>(token: DIToken<T>): boolean {
    this.lastAccessedAt = new Date();
    return this.instances.delete(token);
  }

  public hasInstance<T>(token: DIToken<T>): boolean {
    return this.instances.has(token);
  }

  public createChildScope(scopeId?: string): IScopeManager {
    this.ensureNotDisposed();
    const childScope = new ScopeManager(scopeId, this);
    this.childScopes.add(childScope);
    return childScope;
  }

  public clear(): void {
    this.instances.clear();
    // Clear child scopes
    const children = Array.from(this.childScopes);
    for (const child of children) {
      child.dispose();
    }
    this.childScopes.clear();
  }

  public dispose(): void {
    if (this.disposed) return;

    this.clear();
    this.disposed = true;

    // Remove from parent's child scopes
    if (this.parent instanceof ScopeManager) {
      this.parent.childScopes.delete(this);
    }
  }

  public getStats(): IScopeStats {
    return {
      scopeId: this.scopeId,
      instanceCount: this.instances.size,
      createdAt: this.createdAt,
      lastAccessedAt: this.lastAccessedAt,
      childScopesCount: this.childScopes.size,
      estimatedMemoryUsage: this.instances.size * 100, // Rough estimation
    };
  }

  private ensureNotDisposed(): void {
    if (this.disposed) {
      throw new ApplicationError(`Scope ${this.scopeId} has been disposed`, "SCOPE_DISPOSED", {
        correlationId: `scope_disposed_${Date.now()}`,
        metadata: { scopeId: this.scopeId },
      });
    }
  }
}

/**
 * Scoped lifecycle manager - one instance per scope
 */
export class ScopedLifecycleManager<T = unknown> extends BaseLifecycleManager<T> {
  public readonly strategy: LifecycleStrategy = "scoped";

  private readonly config: Required<IScopedLifecycleConfig>;
  private cacheHits = 0;
  private cacheRequests = 0;

  constructor(config: IScopedLifecycleConfig = {}) {
    super();
    this.config = {
      isolationStrategy: "strict",
      autoDispose: true,
      maxInstancesPerScope: 100,
      ...config,
    };
  }

  public getInstance(token: DIToken<T>, factory: () => T, _context?: IResolutionContext): T {
    this.ensureNotDisposed();
    this.cacheRequests++;

    // Get scope from context
    const scopedInstances = _context?.scopedInstances;
    if (!scopedInstances) {
      throw new SystemError(
        "Scoped lifecycle requires resolution context with scopedInstances",
        "LIFECYCLE_MISSING_SCOPE_CONTEXT",
        {
          correlationId: `scope_context_${Date.now()}`,
          metadata: { strategy: this.strategy },
        },
      );
    }

    // Check if instance already exists in scope
    const existing = scopedInstances.get(token) as T;
    if (existing !== undefined) {
      this.cacheHits++;
      return existing;
    }

    // Check scope instance limit
    if (scopedInstances.size >= this.config.maxInstancesPerScope) {
      throw new SystemError(
        `Scope instance limit reached: ${this.config.maxInstancesPerScope}`,
        "LIFECYCLE_SCOPE_LIMIT_EXCEEDED",
        {
          correlationId: `scope_limit_${Date.now()}`,
          metadata: {
            strategy: this.strategy,
            maxInstances: this.config.maxInstancesPerScope,
            currentSize: scopedInstances.size,
          },
        },
      );
    }

    // Create new instance
    const startTime = performance.now();
    try {
      const instance = factory();
      scopedInstances.set(token, instance);
      this.trackCreation(startTime);
      return instance;
    } catch (_error) {
      this.trackCreation(startTime);
      throw _error;
    }
  }

  public hasInstance(token: DIToken<T>, _context?: IResolutionContext): boolean {
    const scopedInstances = _context?.scopedInstances;
    return scopedInstances?.has(token) ?? false;
  }

  public clearInstance(token: DIToken<T>, _context?: IResolutionContext): boolean {
    const scopedInstances = _context?.scopedInstances;
    return scopedInstances?.delete(token) ?? false;
  }

  public clearAll(): void {
    this.cacheHits = 0;
    this.cacheRequests = 0;
  }

  protected getCachedInstancesCount(): number {
    // Cannot determine without context
    return 0;
  }

  protected getCacheHitRatio(): number {
    return this.cacheRequests > 0 ? this.cacheHits / this.cacheRequests : 0;
  }

  protected getEstimatedMemoryUsage(): number {
    // Cannot determine without context
    return 0;
  }
}

/**
 * Lifecycle factory for creating lifecycle managers
 */
export class LifecycleFactory implements ILifecycleFactory {
  public createSingleton<T>(config?: ISingletonLifecycleConfig): ILifecycleManager<T> {
    return new SingletonLifecycleManager<T>(config);
  }

  public createTransient<T>(config?: ITransientLifecycleConfig): ILifecycleManager<T> {
    return new TransientLifecycleManager<T>(config);
  }

  public createScoped<T>(config?: IScopedLifecycleConfig): ILifecycleManager<T> {
    return new ScopedLifecycleManager<T>(config);
  }

  public getLifecycleManager<T>(strategy: LifecycleStrategy, config?: unknown): ILifecycleManager<T> {
    switch (strategy) {
      case "singleton":
        return this.createSingleton<T>(config as ISingletonLifecycleConfig);
      case "transient":
        return this.createTransient<T>(config as ITransientLifecycleConfig);
      case "scoped":
        return this.createScoped<T>(config as IScopedLifecycleConfig);
      default:
        throw new SystemError(`Unknown lifecycle strategy: ${strategy}`, "LIFECYCLE_UNKNOWN_STRATEGY", {
          correlationId: `unknown_strategy_${Date.now()}`,
          metadata: { strategy },
        });
    }
  }
}

/**
 * Default lifecycle factory instance
 */
export const defaultLifecycleFactory = new LifecycleFactory();
