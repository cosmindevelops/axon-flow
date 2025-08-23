import type { DIToken } from "../container/container.types.js";
import type {
  EvictionPolicy as _EvictionPolicy,
  IObjectPool,
  IPoolConfig,
  IPoolFactory,
  IPoolManager,
  IPoolPerformanceMetrics,
  IPoolStats,
  IPooledInstance,
  PoolCleanupHandler,
  PoolFactory as PoolFactoryFunction,
  PoolHealth,
  PoolValidator,
  ValidationStrategy as _ValidationStrategy,
} from "./pool.types.js";
import { DEFAULT_POOL_CONFIG, validatePoolConfig } from "./pool.schemas.js";

// Import proper error classes from @axon/errors
import { ApplicationError, TimeoutError } from "@axon/errors";

/**
 * Pool-specific error for operation failures using @axon/errors
 */
export class PoolError extends ApplicationError {
  public readonly poolToken?: DIToken<unknown>;
  public override readonly operation?: string = "pool_operation";

  constructor(
    message: string,
    poolToken?: DIToken<unknown>,
    operation?: string,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, "POOL_ERROR", {
      correlationId: `pool_${Date.now()}`,
      operation: operation || "pool_operation",
      module: "DI_Pool",
      metadata: {
        poolToken: poolToken ? String(poolToken) : undefined,
        operation,
        ...context,
      },
    });

    if (poolToken !== undefined) this.poolToken = poolToken;
    if (operation !== undefined) this.operation = operation;

    if (cause) {
      this.withCause(cause);
    }
  }
}

/**
 * Error for pool timeout operations using @axon/errors
 */
export class PoolTimeoutError extends TimeoutError {
  public readonly poolToken?: DIToken<unknown>;

  constructor(message: string, poolToken?: DIToken<unknown>, timeoutValue?: number) {
    super(message, "POOL_TIMEOUT", {
      correlationId: `pool_timeout_${Date.now()}`,
      operation: "pool_timeout",
      ...(timeoutValue !== undefined && { timeout: timeoutValue }),
      metadata: {
        ...(poolToken && { poolToken: String(poolToken) }),
      },
    });

    if (poolToken !== undefined) this.poolToken = poolToken;
  }
}

/**
 * Error for pool capacity exceeded using @axon/errors
 */
export class PoolCapacityError extends ApplicationError {
  public readonly poolToken?: DIToken<unknown>;
  public readonly currentSize?: number;
  public readonly maxSize?: number;

  constructor(message: string, poolToken?: DIToken<unknown>, currentSize?: number, maxSize?: number) {
    super(message, "POOL_CAPACITY_EXCEEDED", {
      correlationId: `pool_capacity_${Date.now()}`,
      operation: "pool_capacity_check",
      module: "DI_Pool",
      metadata: {
        poolToken: poolToken ? String(poolToken) : undefined,
        currentSize,
        maxSize,
      },
    });

    if (poolToken !== undefined) this.poolToken = poolToken;
    if (currentSize !== undefined) this.currentSize = currentSize;
    if (maxSize !== undefined) this.maxSize = maxSize;
  }
}

/**
 * High-performance object pool implementation
 */
export class ObjectPool<T> implements IObjectPool<T> {
  private readonly instances = new Map<string, IPooledInstance<T>>();
  private readonly availableInstances: string[] = [];
  private readonly performanceMetrics: IPoolPerformanceMetrics;
  public readonly stats: IPoolStats;
  private validationTimer?: NodeJS.Timeout | undefined;
  private isDestroyed = false;
  private instanceCounter = 0;

  constructor(
    public readonly token: DIToken<T>,
    private readonly factory: PoolFactoryFunction<T>,
    public readonly config: IPoolConfig,
    private readonly validator?: PoolValidator<T>,
    private readonly cleanupHandler?: PoolCleanupHandler<T>,
  ) {
    // Validate configuration
    validatePoolConfig(config);

    this.performanceMetrics = {
      recentAcquireTimes: [],
      recentCreateTimes: [],
      lastReset: Date.now(),
      totalOperations: 0,
      failedOperations: 0,
    };

    this.stats = {
      poolSize: 0,
      activeInstances: 0,
      totalAcquired: 0,
      totalReleased: 0,
      totalCreated: 0,
      totalDestroyed: 0,
      poolHits: 0,
      poolMisses: 0,
      hitRatio: 0,
      averageAcquireTime: 0,
      averageCreateTime: 0,
      validationFailures: 0,
      evictedInstances: 0,
      health: "HEALTHY",
      lastValidation: Date.now(),
      peakPoolSize: 0,
      estimatedMemoryUsage: 0,
    };

    // Setup periodic validation if configured
    if (config.validationStrategy === "PERIODIC" && config.validationInterval > 0) {
      this.validationTimer = setInterval(
        () =>
          this.validate().catch(() => {
            // Validation errors are logged internally
          }),
        config.validationInterval,
      );
    }

    // Warmup pool if enabled
    if (config.enableWarmup) {
      this.warmup().catch(() => {
        // Warmup errors are handled internally
      });
    }
  }

  public async acquire(): Promise<T> {
    if (this.isDestroyed) {
      throw new PoolError("Cannot acquire from destroyed pool", this.token, "acquire");
    }

    const startTime = performance.now();

    try {
      // Try to get from available instances first
      const availableId = this.getNextAvailable();
      if (availableId) {
        const pooledInstance = this.instances.get(availableId)!;

        // Validate if required
        if (this.config.validationStrategy === "ON_ACQUIRE" && !(await this.validateInstance(pooledInstance))) {
          await this.removeInstance(availableId);
          this.stats.validationFailures++;
          return this.acquire(); // Retry with different instance
        }

        // Mark as in use
        pooledInstance.inUse = true;
        pooledInstance.lastAcquired = Date.now();
        pooledInstance.acquireCount++;

        this.stats.activeInstances++;
        this.stats.totalAcquired++;
        this.stats.poolHits++;
        this.updateHitRatio();

        const acquireTime = performance.now() - startTime;
        this.recordAcquireTime(acquireTime);

        return pooledInstance.instance;
      }

      // No available instances, create new one
      this.stats.poolMisses++;
      const instance = await this.createNewInstance();

      const acquireTime = performance.now() - startTime;
      this.recordAcquireTime(acquireTime);

      return instance;
    } catch (_error) {
      this.performanceMetrics.failedOperations++;
      throw _error instanceof PoolError
        ? _error
        : new PoolError("Failed to acquire instance", this.token, "acquire", undefined, _error as Error);
    }
  }

  public async release(instance: T): Promise<void> {
    if (this.isDestroyed) {
      return;
    }

    // Find the pooled instance
    const pooledInstance = this.findPooledInstance(instance);
    if (!pooledInstance) {
      return;
    }

    try {
      // Validate if required
      if (this.config.validationStrategy === "ON_RELEASE" && !(await this.validateInstance(pooledInstance))) {
        await this.removeInstance(pooledInstance.id);
        this.stats.validationFailures++;
        return;
      }

      // Check if pool is at capacity
      if (this.availableInstances.length >= this.config.maxSize) {
        await this.removeInstance(pooledInstance.id);
        this.stats.evictedInstances++;
        return;
      }

      // Mark as available
      pooledInstance.inUse = false;
      pooledInstance.lastReleased = Date.now();
      pooledInstance.isValid = true;

      this.availableInstances.push(pooledInstance.id);
      this.stats.activeInstances--;
      this.stats.totalReleased++;
    } catch (_error) {
      this.performanceMetrics.failedOperations++;
    }
  }

  public async drain(): Promise<void> {
    const drainPromises: Promise<void>[] = [];

    for (const id of Array.from(this.instances.keys())) {
      drainPromises.push(this.removeInstance(id));
    }

    await Promise.allSettled(drainPromises);

    this.availableInstances.length = 0;
    this.stats.poolSize = 0;
    this.stats.activeInstances = 0;
  }

  public async warmup(): Promise<void> {
    if (this.config.minSize <= 0) return;

    const warmupPromises: Promise<void>[] = [];

    for (let i = 0; i < this.config.minSize; i++) {
      warmupPromises.push(this.preCreateInstance());
    }

    await Promise.allSettled(warmupPromises);
  }

  public async validate(): Promise<void> {
    if (this.isDestroyed) return;

    const validationPromises: Promise<void>[] = [];

    for (const [id, pooledInstance] of Array.from(this.instances.entries())) {
      if (!pooledInstance.inUse) {
        validationPromises.push(this.validateAndCleanup(id, pooledInstance));
      }
    }

    await Promise.allSettled(validationPromises);

    this.stats.lastValidation = Date.now();
    this.updateHealthStatus();
  }

  public getStats(): IPoolStats {
    return { ...this.stats };
  }

  public resetStats(): void {
    this.stats.totalAcquired = 0;
    this.stats.totalReleased = 0;
    this.stats.totalCreated = 0;
    this.stats.totalDestroyed = 0;
    this.stats.poolHits = 0;
    this.stats.poolMisses = 0;
    this.stats.validationFailures = 0;
    this.stats.evictedInstances = 0;
    this.stats.hitRatio = 0;
    this.stats.averageAcquireTime = 0;
    this.stats.averageCreateTime = 0;

    this.performanceMetrics.recentAcquireTimes.length = 0;
    this.performanceMetrics.recentCreateTimes.length = 0;
    this.performanceMetrics.lastReset = Date.now();
    this.performanceMetrics.totalOperations = 0;
    this.performanceMetrics.failedOperations = 0;
  }

  public isHealthy(): boolean {
    return this.stats.health === "HEALTHY";
  }

  public async resize(newMinSize: number, newMaxSize: number): Promise<void> {
    if (newMinSize > newMaxSize) {
      throw new PoolError("Min size cannot be greater than max size", this.token, "resize");
    }

    // Update configuration
    (this.config as any).minSize = newMinSize;
    (this.config as any).maxSize = newMaxSize;

    // If we need to shrink
    if (this.instances.size > newMaxSize) {
      const excessCount = this.instances.size - newMaxSize;
      await this.evictInstances(excessCount);
    }

    // If we need to grow
    if (this.availableInstances.length < newMinSize) {
      const neededCount = newMinSize - this.availableInstances.length;
      const createPromises: Promise<void>[] = [];

      for (let i = 0; i < neededCount; i++) {
        createPromises.push(this.preCreateInstance());
      }

      await Promise.allSettled(createPromises);
    }
  }

  public async destroy(): Promise<void> {
    if (this.isDestroyed) return;

    this.isDestroyed = true;

    // Clear validation timer
    if (this.validationTimer) {
      clearInterval(this.validationTimer);
      this.validationTimer = undefined;
    }

    // Drain all instances
    await this.drain();
  }

  private async createNewInstance(): Promise<T> {
    const createStart = performance.now();

    try {
      const instance = await Promise.race([
        this.factory(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new PoolTimeoutError("Instance creation timeout", this.token, this.config.createTimeout)),
            this.config.createTimeout,
          ),
        ),
      ]);

      const pooledInstance: IPooledInstance<T> = {
        instance,
        createdAt: Date.now(),
        lastAcquired: Date.now(),
        lastReleased: 0,
        acquireCount: 1,
        inUse: true,
        isValid: true,
        id: this.generateInstanceId(),
      };

      this.instances.set(pooledInstance.id, pooledInstance);
      this.stats.poolSize = this.instances.size;
      this.stats.activeInstances++;
      this.stats.totalCreated++;
      this.stats.totalAcquired++;

      if (this.stats.poolSize > this.stats.peakPoolSize) {
        this.stats.peakPoolSize = this.stats.poolSize;
      }

      const createTime = performance.now() - createStart;
      this.recordCreateTime(createTime);

      return instance;
    } catch (_error) {
      const createTime = performance.now() - createStart;
      this.recordCreateTime(createTime);

      throw _error instanceof PoolError
        ? _error
        : new PoolError("Failed to create new instance", this.token, "create", undefined, _error as Error);
    }
  }

  private async preCreateInstance(): Promise<void> {
    if (this.instances.size >= this.config.maxSize) return;

    const createStart = performance.now();

    try {
      const instance = await this.factory();

      const pooledInstance: IPooledInstance<T> = {
        instance,
        createdAt: Date.now(),
        lastAcquired: 0,
        lastReleased: Date.now(),
        acquireCount: 0,
        inUse: false,
        isValid: true,
        id: this.generateInstanceId(),
      };

      this.instances.set(pooledInstance.id, pooledInstance);
      this.availableInstances.push(pooledInstance.id);
      this.stats.poolSize = this.instances.size;
      this.stats.totalCreated++;

      if (this.stats.poolSize > this.stats.peakPoolSize) {
        this.stats.peakPoolSize = this.stats.poolSize;
      }

      const createTime = performance.now() - createStart;
      this.recordCreateTime(createTime);
    } catch {
      // Pre-create failures are handled silently
    }
  }

  private getNextAvailable(): string | undefined {
    if (this.availableInstances.length === 0) return undefined;

    switch (this.config.evictionPolicy) {
      case "FIFO":
        return this.availableInstances.shift();
      case "LIFO":
        return this.availableInstances.pop();
      case "RANDOM": {
        const randomIndex = Math.floor(Math.random() * this.availableInstances.length);
        return this.availableInstances.splice(randomIndex, 1)[0];
      }
      case "LRU":
      default:
        // LRU: find least recently used
        return this.findLRUInstance();
    }
  }

  private findLRUInstance(): string | undefined {
    if (this.availableInstances.length === 0) return undefined;

    let oldestId = this.availableInstances[0]!; // Safe due to length check
    let oldestTime = this.instances.get(oldestId)?.lastReleased || 0;

    for (const id of this.availableInstances) {
      const instance = this.instances.get(id);
      if (instance && instance.lastReleased < oldestTime) {
        oldestTime = instance.lastReleased;
        oldestId = id;
      }
    }

    const index = this.availableInstances.indexOf(oldestId);
    if (index >= 0) {
      this.availableInstances.splice(index, 1);
    }

    return oldestId;
  }

  private findPooledInstance(instance: T): IPooledInstance<T> | undefined {
    for (const pooledInstance of Array.from(this.instances.values())) {
      if (pooledInstance.instance === instance) {
        return pooledInstance;
      }
    }
    return undefined;
  }

  private async validateInstance(pooledInstance: IPooledInstance<T>): Promise<boolean> {
    if (!this.validator) return true;

    try {
      return await this.validator(pooledInstance.instance);
    } catch {
      return false;
    }
  }

  private async validateAndCleanup(id: string, pooledInstance: IPooledInstance<T>): Promise<void> {
    const isValid = await this.validateInstance(pooledInstance);

    if (!isValid) {
      await this.removeInstance(id);
      this.stats.validationFailures++;
    } else {
      // Check for idle timeout
      const now = Date.now();
      const idleTime = now - Math.max(pooledInstance.lastAcquired, pooledInstance.lastReleased);

      if (idleTime > this.config.maxIdleTime) {
        await this.removeInstance(id);
        this.stats.evictedInstances++;
      }
    }
  }

  private async removeInstance(id: string): Promise<void> {
    const pooledInstance = this.instances.get(id);
    if (!pooledInstance) return;

    try {
      if (this.cleanupHandler) {
        await this.cleanupHandler(pooledInstance.instance);
      }
    } catch {
      // Cleanup errors are handled silently
    }

    this.instances.delete(id);

    const availableIndex = this.availableInstances.indexOf(id);
    if (availableIndex >= 0) {
      this.availableInstances.splice(availableIndex, 1);
    }

    if (pooledInstance.inUse) {
      this.stats.activeInstances--;
    }

    this.stats.poolSize = this.instances.size;
    this.stats.totalDestroyed++;
  }

  private async evictInstances(count: number): Promise<void> {
    const evictPromises: Promise<void>[] = [];

    // Evict available instances first
    while (evictPromises.length < count && this.availableInstances.length > 0) {
      const id = this.availableInstances[0]!; // Safe due to length check
      evictPromises.push(this.removeInstance(id));
    }

    await Promise.allSettled(evictPromises);
  }

  private generateInstanceId(): string {
    return `${String(this.token)}-${++this.instanceCounter}-${Date.now()}`;
  }

  private recordAcquireTime(time: number): void {
    if (!this.config.enableMetrics) return;

    this.performanceMetrics.recentAcquireTimes.push(time);
    if (this.performanceMetrics.recentAcquireTimes.length > 100) {
      this.performanceMetrics.recentAcquireTimes.shift();
    }

    this.performanceMetrics.totalOperations++;
    this.updateAverageAcquireTime();
  }

  private recordCreateTime(time: number): void {
    if (!this.config.enableMetrics) return;

    this.performanceMetrics.recentCreateTimes.push(time);
    if (this.performanceMetrics.recentCreateTimes.length > 100) {
      this.performanceMetrics.recentCreateTimes.shift();
    }

    this.updateAverageCreateTime();
  }

  private updateAverageAcquireTime(): void {
    const times = this.performanceMetrics.recentAcquireTimes;
    if (times.length === 0) return;

    this.stats.averageAcquireTime = times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  private updateAverageCreateTime(): void {
    const times = this.performanceMetrics.recentCreateTimes;
    if (times.length === 0) return;

    this.stats.averageCreateTime = times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  private updateHitRatio(): void {
    const total = this.stats.poolHits + this.stats.poolMisses;
    this.stats.hitRatio = total > 0 ? this.stats.poolHits / total : 0;
  }

  private updateHealthStatus(): void {
    const hitRatio = this.stats.hitRatio;
    const validationFailureRate = this.stats.validationFailures / Math.max(1, this.stats.totalAcquired);
    const avgAcquireTime = this.stats.averageAcquireTime;

    if (validationFailureRate > 0.1 || avgAcquireTime > 1000) {
      this.stats.health = "CRITICAL";
    } else if (validationFailureRate > 0.05 || hitRatio < 0.5 || avgAcquireTime > 500) {
      this.stats.health = "WARNING";
    } else {
      this.stats.health = "HEALTHY";
    }
  }
}

/**
 * Factory for creating object pools with proper configuration
 */
export class PoolFactory implements IPoolFactory {
  constructor(private readonly defaultConfig: IPoolConfig = DEFAULT_POOL_CONFIG) {}

  public createPool<T>(
    token: DIToken<T>,
    factory: PoolFactoryFunction<T>,
    config: IPoolConfig,
    validator?: PoolValidator<T>,
    cleanupHandler?: PoolCleanupHandler<T>,
  ): IObjectPool<T> {
    return new ObjectPool(token, factory, config, validator, cleanupHandler);
  }

  public createDefaultPool<T>(token: DIToken<T>, factory: PoolFactoryFunction<T>): IObjectPool<T> {
    return new ObjectPool(token, factory, this.defaultConfig);
  }

  public getDefaultConfig(): IPoolConfig {
    return { ...this.defaultConfig };
  }
}

/**
 * Manager for handling multiple object pools
 */
export class PoolManager implements IPoolManager {
  private readonly pools = new Map<DIToken<unknown>, IObjectPool<unknown>>();

  public registerPool<T>(pool: IObjectPool<T>): void {
    if (this.pools.has(pool.token)) {
      throw new PoolError(`Pool already registered for token: ${String(pool.token)}`, pool.token);
    }

    this.pools.set(pool.token, pool);
  }

  public getPool<T>(token: DIToken<T>): IObjectPool<T> | undefined {
    return this.pools.get(token) as IObjectPool<T> | undefined;
  }

  public async removePool<T>(token: DIToken<T>): Promise<boolean> {
    const pool = this.pools.get(token);
    if (!pool) return false;

    await pool.destroy();
    this.pools.delete(token);
    return true;
  }

  public getAllPools(): IObjectPool<unknown>[] {
    return Array.from(this.pools.values());
  }

  public getAggregatedStats(): IPoolStats {
    const allPools = this.getAllPools();
    if (allPools.length === 0) {
      return {
        poolSize: 0,
        activeInstances: 0,
        totalAcquired: 0,
        totalReleased: 0,
        totalCreated: 0,
        totalDestroyed: 0,
        poolHits: 0,
        poolMisses: 0,
        hitRatio: 0,
        averageAcquireTime: 0,
        averageCreateTime: 0,
        validationFailures: 0,
        evictedInstances: 0,
        health: "HEALTHY",
        lastValidation: Date.now(),
        peakPoolSize: 0,
        estimatedMemoryUsage: 0,
      };
    }

    const aggregated = allPools.reduce(
      (acc, pool) => {
        const stats = pool.getStats();
        return {
          poolSize: acc.poolSize + stats.poolSize,
          activeInstances: acc.activeInstances + stats.activeInstances,
          totalAcquired: acc.totalAcquired + stats.totalAcquired,
          totalReleased: acc.totalReleased + stats.totalReleased,
          totalCreated: acc.totalCreated + stats.totalCreated,
          totalDestroyed: acc.totalDestroyed + stats.totalDestroyed,
          poolHits: acc.poolHits + stats.poolHits,
          poolMisses: acc.poolMisses + stats.poolMisses,
          hitRatio: 0, // Will calculate after
          averageAcquireTime: acc.averageAcquireTime + stats.averageAcquireTime,
          averageCreateTime: acc.averageCreateTime + stats.averageCreateTime,
          validationFailures: acc.validationFailures + stats.validationFailures,
          evictedInstances: acc.evictedInstances + stats.evictedInstances,
          health: (acc.health === "CRITICAL" || stats.health === "CRITICAL"
            ? "CRITICAL"
            : acc.health === "WARNING" || stats.health === "WARNING"
              ? "WARNING"
              : "HEALTHY") as PoolHealth,
          lastValidation: Math.min(acc.lastValidation, stats.lastValidation),
          peakPoolSize: acc.peakPoolSize + stats.peakPoolSize,
          estimatedMemoryUsage: acc.estimatedMemoryUsage + stats.estimatedMemoryUsage,
        };
      },
      {
        poolSize: 0,
        activeInstances: 0,
        totalAcquired: 0,
        totalReleased: 0,
        totalCreated: 0,
        totalDestroyed: 0,
        poolHits: 0,
        poolMisses: 0,
        hitRatio: 0,
        averageAcquireTime: 0,
        averageCreateTime: 0,
        validationFailures: 0,
        evictedInstances: 0,
        health: "HEALTHY" as PoolHealth,
        lastValidation: Date.now(),
        peakPoolSize: 0,
        estimatedMemoryUsage: 0,
      },
    );

    // Calculate averages
    const poolCount = allPools.length;
    aggregated.hitRatio =
      aggregated.poolHits + aggregated.poolMisses > 0
        ? aggregated.poolHits / (aggregated.poolHits + aggregated.poolMisses)
        : 0;
    aggregated.averageAcquireTime /= poolCount;
    aggregated.averageCreateTime /= poolCount;

    return aggregated;
  }

  public async validateAllPools(): Promise<void> {
    const validationPromises = this.getAllPools().map((pool) =>
      pool.validate().catch(() => {
        // Validation errors are handled by individual pools
      }),
    );

    await Promise.allSettled(validationPromises);
  }

  public async drainAllPools(): Promise<void> {
    const drainPromises = this.getAllPools().map((pool) =>
      pool.drain().catch(() => {
        // Drain errors are handled by individual pools
      }),
    );

    await Promise.allSettled(drainPromises);
  }

  public async destroyAllPools(): Promise<void> {
    const destroyPromises = Array.from(this.pools.entries()).map(([_token, pool]) =>
      pool.destroy().catch(() => {
        // Destroy errors are handled by individual pools
      }),
    );

    await Promise.allSettled(destroyPromises);
    this.pools.clear();
  }
}

/**
 * Default pool factory instance
 */
export const defaultPoolFactory = new PoolFactory();

/**
 * Default pool manager instance
 */
export const defaultPoolManager = new PoolManager();
