/**
 * Lifecycle management implementations
 *
 * Concrete implementations of lifecycle managers for singleton, transient, and scoped instances
 */

import { ApplicationError, SystemError } from "@axon/errors";
import type { DIToken, IResolutionContext } from "../container/container.types.js";
import type { ObjectPool } from "../pool/pool.classes.js";
import type {
  ILifecycleManager,
  IScopeManager,
  IScopeStats,
  IScopedLifecycleConfig,
  ITransientLifecycleConfig,
  ISingletonLifecycleConfig,
  ILifecycleFactory,
  ILifecycleStats,
  LifecycleStrategy,
} from "./lifecycle.types.js";

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

  // Thread-safe state management
  private readonly stateManager = new DisposalStateManager();
  private readonly operationLocks = new Map<string, Promise<void>>();
  private readonly disposalManager = new AsyncDisposalManager();

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

  /**
   * Acquire operation lock with atomic state checking
   * Prevents race conditions by ensuring state check and operation start are atomic
   */
  private async acquireOperationLock(operationId: string): Promise<() => void> {
    // Wait for any existing operation with the same ID
    const existingOperation = this.operationLocks.get(operationId);
    if (existingOperation) {
      await existingOperation;
    }

    // Atomically check state and acquire lock
    this.stateManager.ensureOperational(); // Throws if disposing/disposed

    // Create operation promise and tracking
    let resolveOperation: () => void;
    const operationPromise = new Promise<void>((resolve) => {
      resolveOperation = resolve;
    });

    this.operationLocks.set(operationId, operationPromise);

    // Return release function
    return () => {
      this.operationLocks.delete(operationId);
      resolveOperation();
    };
  }

  /**
   * Wait for all active operations to complete
   */
  private async waitForActiveOperations(): Promise<void> {
    const activeOperations = Array.from(this.operationLocks.values());
    if (activeOperations.length > 0) {
      await Promise.all(activeOperations);
    }
  }

  public getInstance<T>(token: DIToken<T>): T | undefined {
    // Use synchronous state check for read-only operation
    this.stateManager.ensureOperational();
    this.lastAccessedAt = new Date();
    return this.instances.get(token) as T;
  }

  public setInstance<T>(token: DIToken<T>, instance: T): void;
  public setInstance<T>(token: DIToken<T>, instance: T, options: { async: true }): Promise<void>;
  public setInstance<T>(token: DIToken<T>, instance: T, options?: { async: true }): void | Promise<void> {
    if (options?.async) {
      return this.setInstanceAsync(token, instance);
    }
    // Sync version - minimal state checking for backward compatibility
    this.stateManager.ensureOperational();
    this.lastAccessedAt = new Date();
    this.instances.set(token, instance);
  }

  private async setInstanceAsync<T>(token: DIToken<T>, instance: T): Promise<void> {
    const releaseOperation = await this.acquireOperationLock(`setInstance_${String(token)}`);

    try {
      this.lastAccessedAt = new Date();
      this.instances.set(token, instance);
    } finally {
      releaseOperation();
    }
  }

  public removeInstance<T>(token: DIToken<T>): boolean;
  public removeInstance<T>(token: DIToken<T>, options: { async: true }): Promise<boolean>;
  public removeInstance<T>(token: DIToken<T>, options?: { async: true }): boolean | Promise<boolean> {
    if (options?.async) {
      return this.removeInstanceAsync(token);
    }
    // Sync version - minimal state checking for backward compatibility
    this.stateManager.ensureOperational();
    this.lastAccessedAt = new Date();
    return this.instances.delete(token);
  }

  private async removeInstanceAsync<T>(token: DIToken<T>): Promise<boolean> {
    const releaseOperation = await this.acquireOperationLock(`removeInstance_${String(token)}`);

    try {
      this.lastAccessedAt = new Date();
      return this.instances.delete(token);
    } finally {
      releaseOperation();
    }
  }

  public hasInstance<T>(token: DIToken<T>): boolean {
    return this.instances.has(token);
  }

  public createChildScope(scopeId?: string): IScopeManager;
  public createChildScope(scopeId?: string, options?: { async: true }): Promise<IScopeManager>;
  public createChildScope(scopeId?: string, options?: { async: true }): IScopeManager | Promise<IScopeManager> {
    if (options?.async) {
      return this.createChildScopeAsync(scopeId);
    }
    // Sync version - minimal state checking for backward compatibility
    this.stateManager.ensureOperational();
    const childScope = new ScopeManager(scopeId, this);
    this.childScopes.add(childScope);
    return childScope;
  }

  private async createChildScopeAsync(scopeId?: string): Promise<IScopeManager> {
    const releaseOperation = await this.acquireOperationLock(`createChildScope_${scopeId || "auto"}`);

    try {
      const childScope = new ScopeManager(scopeId, this);
      this.childScopes.add(childScope);
      return childScope;
    } finally {
      releaseOperation();
    }
  }

  public clear(): void;
  public clear(options: { async: true }): Promise<void>;
  public clear(options?: { async: true }): void | Promise<void> {
    if (options?.async) {
      return this.clearAsync();
    }
    // Sync version - minimal state checking for backward compatibility
    this.stateManager.ensureOperational();
    this.instances.clear();
    // Sync disposal of child scopes
    const children = Array.from(this.childScopes);
    for (const child of children) {
      child.dispose();
    }
    this.childScopes.clear();
  }

  private async clearAsync(): Promise<void> {
    const releaseOperation = await this.acquireOperationLock("clear");

    try {
      // Clear instances
      this.instances.clear();

      // Dispose child scopes with proper coordination
      const childDisposalPromises = Array.from(this.childScopes).map(async (child) => {
        if (child instanceof ScopeManager) {
          await child.dispose({ async: true });
        } else {
          child.dispose();
        }
      });

      await Promise.all(childDisposalPromises);
      this.childScopes.clear();
    } finally {
      releaseOperation();
    }
  }

  public dispose(): void;
  public dispose(options: { async: true }): Promise<void>;
  public dispose(options?: { async: true }): void | Promise<void> {
    if (options?.async) {
      return this.disposeAsync();
    }
    // Sync version - for backward compatibility, but still check state
    if (this.stateManager.isDisposed()) {
      return;
    }

    try {
      // Force transition to disposing to prevent new operations
      this.stateManager.forceTransitionTo("disposing");

      // Sync clear without state checking (since we're already disposing)
      this.clearSync();

      // Remove from parent's child scopes
      if (this.parent instanceof ScopeManager) {
        this.parent.childScopes.delete(this);
      }

      // Mark as disposed
      this.stateManager.forceTransitionTo("disposed");
    } catch (error) {
      this.stateManager.forceTransitionTo("disposal_failed");
      throw error;
    }
  }

  /**
   * Internal sync clear method that bypasses state checking (used during disposal)
   */
  private clearSync(): void {
    this.instances.clear();
    // Sync disposal of child scopes without state checks
    const children = Array.from(this.childScopes);
    for (const child of children) {
      child.dispose();
    }
    this.childScopes.clear();
  }

  private async disposeAsync(): Promise<void> {
    // Try to transition to disposing state
    if (!this.stateManager.tryTransitionTo("disposing")) {
      // Already disposing or disposed
      await this.stateManager.waitForDisposal();
      return;
    }

    try {
      // Wait for all active operations to complete
      await this.waitForActiveOperations();

      // Perform async cleanup directly without operation locking (we're already disposing)
      await this.clearAsyncInternal();

      // Remove from parent's child scopes
      if (this.parent instanceof ScopeManager) {
        this.parent.childScopes.delete(this);
      }

      // Transition to disposed state
      this.stateManager.tryTransitionTo("disposed");

      // Dispose the disposal manager itself
      try {
        await this.disposalManager.dispose();
      } catch (error) {
        // Ignore disposal manager errors during scope cleanup
        console.warn(`Failed to dispose AsyncDisposalManager for scope ${this.scopeId}:`, error);
      }
    } catch (error) {
      // Log the actual error for debugging
      console.error(`Async disposal error for scope ${this.scopeId}:`, error);

      // Transition to disposal failed state
      this.stateManager.tryTransitionTo("disposal_failed");
      throw new ApplicationError(`Async disposal failed for scope ${this.scopeId}`, "SCOPE_DISPOSAL_FAILED", {
        correlationId: `scope_disposal_${Date.now()}`,
        metadata: {
          scopeId: this.scopeId,
          originalError: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      });
    }
  }

  /**
   * Internal async clear that bypasses operation locking (used during disposal)
   */
  private async clearAsyncInternal(): Promise<void> {
    // Clear instances
    this.instances.clear();

    // Dispose child scopes with proper coordination
    const childDisposalPromises = Array.from(this.childScopes).map(async (child) => {
      if (child instanceof ScopeManager) {
        await child.dispose({ async: true });
      } else {
        child.dispose();
      }
    });

    await Promise.all(childDisposalPromises);
    this.childScopes.clear();
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
 * Disposal state tracking
 */
export type DisposalState =
  | "active" // Normal operation
  | "disposing" // Disposal in progress
  | "disposed" // Fully disposed
  | "disposal_failed"; // Disposal encountered errors

/**
 * Async disposal configuration
 */
export interface IAsyncDisposalConfig {
  /**
   * Maximum time to wait for disposal operations to complete
   */
  disposalTimeout: number;

  /**
   * Maximum time to wait for async cleanup operations
   */
  cleanupTimeout: number;

  /**
   * Whether to force disposal after timeout
   */
  forceDisposalAfterTimeout: boolean;

  /**
   * Whether to collect disposal metrics
   */
  enableDisposalMetrics: boolean;

  /**
   * Maximum concurrent disposal operations
   */
  maxConcurrentDisposals: number;
}

/**
 * Disposal operation context
 */
export interface IDisposalContext {
  /**
   * Unique disposal operation ID
   */
  disposalId: string;

  /**
   * Parent disposal context (for hierarchical disposal)
   */
  parent?: IDisposalContext;

  /**
   * Start time of disposal operation
   */
  startTime: number;

  /**
   * Timeout for this disposal operation
   */
  timeout: number;

  /**
   * Whether disposal was forced due to timeout
   */
  forced: boolean;

  /**
   * Errors encountered during disposal
   */
  errors: Error[];

  /**
   * Signal to cancel disposal operation
   */
  abortSignal?: AbortSignal;
}

/**
 * Disposal metrics
 */
export interface IDisposalMetrics {
  totalDisposals: number;
  successfulDisposals: number;
  failedDisposals: number;
  forcedDisposals: number;
  averageDisposalTime: number;
  maxDisposalTime: number;
  concurrentDisposals: number;
}

/**
 * Thread-safe async disposal manager
 *
 * Handles proper cleanup sequencing, timeout management, and race condition prevention
 * for scope disposal operations in multi-threaded or concurrent environments.
 */
export class AsyncDisposalManager {
  private readonly config: IAsyncDisposalConfig;
  private readonly activeDisposals = new Map<string, IDisposalContext>();
  private readonly disposalMetrics: IDisposalMetrics;
  private readonly disposalLock = new Map<string, Promise<void>>();
  private disposed = false;

  constructor(config: Partial<IAsyncDisposalConfig> = {}) {
    this.config = {
      disposalTimeout: 30000, // 30 seconds default timeout
      cleanupTimeout: 10000, // 10 seconds cleanup timeout
      forceDisposalAfterTimeout: true, // Force disposal after timeout
      enableDisposalMetrics: true, // Enable metrics collection
      maxConcurrentDisposals: 10, // Max concurrent operations
      ...config,
    };

    this.disposalMetrics = {
      totalDisposals: 0,
      successfulDisposals: 0,
      failedDisposals: 0,
      forcedDisposals: 0,
      averageDisposalTime: 0,
      maxDisposalTime: 0,
      concurrentDisposals: 0,
    };
  }

  /**
   * Dispose a scope with proper async cleanup and race condition prevention
   */
  public async disposeScope(
    scopeId: string,
    cleanupFunctions: Array<() => Promise<void> | void>,
    parentContext?: IDisposalContext,
  ): Promise<void> {
    this.ensureNotDisposed();

    // Check if disposal is already in progress for this scope
    const existingDisposal = this.disposalLock.get(scopeId);
    if (existingDisposal) {
      return existingDisposal;
    }

    // Create disposal context
    const context: IDisposalContext = {
      disposalId: `disposal_${scopeId}_${Date.now()}`,
      ...(parentContext && { parent: parentContext }),
      startTime: performance.now(),
      timeout: this.config.disposalTimeout,
      forced: false,
      errors: [],
    };

    // Create disposal promise and track it
    const disposalPromise = this.executeDisposal(scopeId, cleanupFunctions, context);
    this.disposalLock.set(scopeId, disposalPromise);

    try {
      await disposalPromise;
    } finally {
      // Always remove the disposal lock when complete
      this.disposalLock.delete(scopeId);
    }
  }

  /**
   * Execute disposal with timeout and error handling
   */
  private async executeDisposal(
    scopeId: string,
    cleanupFunctions: Array<() => Promise<void> | void>,
    context: IDisposalContext,
  ): Promise<void> {
    // Check concurrent disposal limit
    if (this.activeDisposals.size >= this.config.maxConcurrentDisposals) {
      throw new SystemError(
        `Maximum concurrent disposals reached: ${this.config.maxConcurrentDisposals}`,
        "DISPOSAL_CONCURRENCY_LIMIT",
        {
          correlationId: context.disposalId,
          metadata: {
            maxConcurrent: this.config.maxConcurrentDisposals,
            currentActive: this.activeDisposals.size,
            scopeId,
          },
        },
      );
    }

    // Track active disposal
    this.activeDisposals.set(scopeId, context);

    if (this.config.enableDisposalMetrics) {
      this.disposalMetrics.totalDisposals++;
      this.disposalMetrics.concurrentDisposals = Math.max(
        this.disposalMetrics.concurrentDisposals,
        this.activeDisposals.size,
      );
    }

    try {
      // Execute cleanup with timeout
      await this.executeCleanupWithTimeout(cleanupFunctions, context);

      if (this.config.enableDisposalMetrics) {
        this.disposalMetrics.successfulDisposals++;
        this.updateDisposalTimes(context);
      }
    } catch (error) {
      context.errors.push(error instanceof Error ? error : new Error(String(error)));

      if (this.config.enableDisposalMetrics) {
        this.disposalMetrics.failedDisposals++;
      }

      // Decide whether to force disposal or re-throw
      if (this.config.forceDisposalAfterTimeout && this.isTimeoutError(error)) {
        context.forced = true;

        if (this.config.enableDisposalMetrics) {
          this.disposalMetrics.forcedDisposals++;
        }

        // Log forced disposal but don't throw
        console.warn(`Forced disposal for scope ${scopeId} due to timeout`, {
          disposalId: context.disposalId,
          errors: context.errors.map((e) => e.message),
        });
      } else {
        // Re-throw non-timeout errors or if force disposal is disabled
        throw new ApplicationError(`Disposal failed for scope ${scopeId}`, "DISPOSAL_FAILED", {
          correlationId: context.disposalId,
          metadata: {
            scopeId,
            errorCount: context.errors.length,
            disposalTime: performance.now() - context.startTime,
            forced: context.forced,
          },
        });
      }
    } finally {
      // Always clean up tracking
      this.activeDisposals.delete(scopeId);
    }
  }

  /**
   * Execute cleanup functions with proper timeout handling
   */
  private async executeCleanupWithTimeout(
    cleanupFunctions: Array<() => Promise<void> | void>,
    context: IDisposalContext,
  ): Promise<void> {
    const cleanupPromises = cleanupFunctions.map(async (cleanup, index) => {
      try {
        const result = cleanup();
        if (result instanceof Promise) {
          await result;
        }
      } catch (error) {
        const cleanupError = new ApplicationError(`Cleanup function ${index} failed`, "CLEANUP_FUNCTION_FAILED", {
          correlationId: context.disposalId,
          metadata: {
            cleanupIndex: index,
            originalError: error instanceof Error ? error.message : String(error),
          },
        });
        context.errors.push(cleanupError);
        throw cleanupError;
      }
    });

    // Execute all cleanup functions with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new ApplicationError("Disposal timeout exceeded", "DISPOSAL_TIMEOUT", {
            correlationId: context.disposalId,
            metadata: {
              timeout: context.timeout,
              elapsedTime: performance.now() - context.startTime,
            },
          }),
        );
      }, context.timeout);
    });

    try {
      await Promise.race([Promise.all(cleanupPromises), timeoutPromise]);
    } catch (error) {
      // If any cleanup failed, we still want to try the others
      // So we'll collect the errors and continue
      if (!this.isTimeoutError(error)) {
        // For non-timeout errors, try to wait for remaining cleanups with a shorter timeout
        try {
          await Promise.race([
            Promise.allSettled(cleanupPromises),
            new Promise((_, reject) => setTimeout(reject, this.config.cleanupTimeout)),
          ]);
        } catch {
          // Ignore cleanup timeout - we already have the main error
        }
      }
      throw error;
    }
  }

  /**
   * Check if error is a timeout error
   */
  private isTimeoutError(error: unknown): boolean {
    return error instanceof ApplicationError && (error as ApplicationError).code === "DISPOSAL_TIMEOUT";
  }

  /**
   * Update disposal timing metrics
   */
  private updateDisposalTimes(context: IDisposalContext): void {
    const disposalTime = performance.now() - context.startTime;

    // Update max disposal time
    this.disposalMetrics.maxDisposalTime = Math.max(this.disposalMetrics.maxDisposalTime, disposalTime);

    // Update average disposal time (rolling average)
    const totalSuccessful = this.disposalMetrics.successfulDisposals;
    const currentAverage = this.disposalMetrics.averageDisposalTime;
    this.disposalMetrics.averageDisposalTime =
      (currentAverage * (totalSuccessful - 1) + disposalTime) / totalSuccessful;
  }

  /**
   * Get current disposal metrics
   */
  public getMetrics(): IDisposalMetrics {
    return { ...this.disposalMetrics };
  }

  /**
   * Check if any disposals are currently active
   */
  public hasActiveDisposals(): boolean {
    return this.activeDisposals.size > 0;
  }

  /**
   * Get list of active disposal contexts
   */
  public getActiveDisposals(): IDisposalContext[] {
    return Array.from(this.activeDisposals.values());
  }

  /**
   * Wait for all active disposals to complete
   */
  public async waitForActiveDisposals(timeout = 60000): Promise<void> {
    const startTime = performance.now();

    while (this.hasActiveDisposals()) {
      if (performance.now() - startTime > timeout) {
        throw new ApplicationError("Timeout waiting for active disposals to complete", "WAIT_FOR_DISPOSALS_TIMEOUT", {
          correlationId: `wait_disposals_${Date.now()}`,
          metadata: {
            activeDisposals: this.activeDisposals.size,
            timeout,
          },
        });
      }

      // Wait a short time before checking again
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Dispose the disposal manager itself
   */
  public async dispose(): Promise<void> {
    if (this.disposed) return;

    try {
      // Wait for all active disposals to complete
      await this.waitForActiveDisposals(this.config.disposalTimeout);

      // Clear any remaining state
      this.activeDisposals.clear();
      this.disposalLock.clear();

      this.disposed = true;
    } catch (error) {
      throw new ApplicationError("Failed to dispose AsyncDisposalManager", "DISPOSAL_MANAGER_DISPOSAL_FAILED", {
        correlationId: `manager_disposal_${Date.now()}`,
        metadata: {
          activeDisposals: this.activeDisposals.size,
          pendingLocks: this.disposalLock.size,
          originalError: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  /**
   * Ensure the disposal manager is not disposed
   */
  private ensureNotDisposed(): void {
    if (this.disposed) {
      throw new ApplicationError("AsyncDisposalManager has been disposed", "DISPOSAL_MANAGER_DISPOSED", {
        correlationId: `disposed_check_${Date.now()}`,
      });
    }
  }
}

/**
 * Thread-safe state manager for disposal operations
 *
 * Provides atomic state transitions and prevents race conditions during disposal.
 */
export class DisposalStateManager {
  private state: DisposalState = "active";
  private readonly stateTransitions = new Map<DisposalState, Set<DisposalState>>();
  private statePromise?: Promise<void>;
  private stateResolve?: () => void;

  constructor() {
    // Define valid state transitions
    this.stateTransitions.set("active", new Set<DisposalState>(["disposing"]));
    this.stateTransitions.set("disposing", new Set<DisposalState>(["disposed", "disposal_failed"]));
    this.stateTransitions.set("disposed", new Set<DisposalState>([])); // Terminal state
    this.stateTransitions.set("disposal_failed", new Set<DisposalState>(["disposing"])); // Can retry
  }

  /**
   * Get current disposal state
   */
  public getState(): DisposalState {
    return this.state;
  }

  /**
   * Check if in specific state
   */
  public isState(state: DisposalState): boolean {
    return this.state === state;
  }

  /**
   * Check if disposed (either successfully or failed)
   */
  public isDisposed(): boolean {
    return this.state === "disposed" || this.state === "disposal_failed";
  }

  /**
   * Check if disposal is in progress
   */
  public isDisposing(): boolean {
    return this.state === "disposing";
  }

  /**
   * Atomically transition to new state if transition is valid
   */
  public tryTransitionTo(newState: DisposalState): boolean {
    const validTransitions = this.stateTransitions.get(this.state);
    if (!validTransitions || !validTransitions.has(newState)) {
      return false;
    }

    this.state = newState;

    // Resolve any waiters if transitioning to terminal states
    if (newState === "disposed" || newState === "disposal_failed") {
      if (this.stateResolve) {
        this.stateResolve();
        (this as any).stateResolve = undefined;
        (this as any).statePromise = undefined;
      }
    }

    return true;
  }

  /**
   * Force transition to new state (use with caution)
   */
  public forceTransitionTo(newState: DisposalState): void {
    this.state = newState;

    if (newState === "disposed" || newState === "disposal_failed") {
      if (this.stateResolve) {
        this.stateResolve();
        (this as any).stateResolve = undefined;
        (this as any).statePromise = undefined;
      }
    }
  }

  /**
   * Wait for disposal to complete (successfully or not)
   */
  public async waitForDisposal(): Promise<DisposalState> {
    if (this.isDisposed()) {
      return this.state;
    }

    if (!this.statePromise) {
      this.statePromise = new Promise<void>((resolve) => {
        this.stateResolve = resolve;
      });
    }

    await this.statePromise;
    return this.state;
  }

  /**
   * Ensure state allows operation (not disposed or disposing)
   */
  public ensureOperational(): void {
    if (this.isDisposed()) {
      throw new ApplicationError("Operation not allowed: scope is disposed", "SCOPE_DISPOSED", {
        correlationId: `state_check_${Date.now()}`,
        metadata: { currentState: this.state },
      });
    }

    if (this.isDisposing()) {
      throw new ApplicationError("Operation not allowed: scope disposal in progress", "SCOPE_DISPOSING", {
        correlationId: `state_check_${Date.now()}`,
        metadata: { currentState: this.state },
      });
    }
  }
}

/**
 * Default lifecycle factory instance
 */
export const defaultLifecycleFactory = new LifecycleFactory();
