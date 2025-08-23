/**
 * Factory implementation classes
 *
 * Provides concrete implementations for factory pattern integration within the DI container.
 * Features performance tracking, caching, and comprehensive provider pattern support.
 */

import type {
  IFactory,
  IFactoryMetadata,
  IFactoryPerformanceMetrics,
  IAbstractFactory,
  IFactoryRegistry,
  IFactoryRegistrationOptions,
  IFactoryRegistryMetrics,
  IFactoryResolver,
  IFactoryResolverMetrics,
  IFactoryConfig,
  IFactoryContext,
  IFactoryError,
  IFactoryCreationError,
  // IFactoryRegistrationError, // Removed - not currently used
  IProviderFactory,
  IAuthProviderConfig,
  IBillingProviderConfig,
  IStorageProviderConfig,
  ILLMProviderConfig,
} from "./factory.types.js";

import type { DIToken, IResolutionContext } from "../container/container.types.js";

// Import proper error classes from @axon/errors
import { ApplicationError } from "@axon/errors";

/**
 * Factory-specific error implementations using @axon/errors
 */
class FactoryError extends ApplicationError implements IFactoryError {
  public readonly factory?: IFactory<unknown>;
  public readonly factoryContext?: IFactoryContext;
  public readonly correlationId?: string;

  constructor(message: string, factory?: IFactory<unknown>, factoryContext?: IFactoryContext, correlationId?: string) {
    super(message, "FACTORY_ERROR", {
      correlationId: correlationId || `factory_${Date.now()}`,
      operation: "factory_operation",
      module: "DI_Factory",
      metadata: {
        factory: factory?.name,
        factoryContext: factoryContext
          ? {
              createdAt: factoryContext.createdAt,
              correlationId: factoryContext.correlationId,
            }
          : undefined,
      },
    });

    if (factory !== undefined) this.factory = factory;
    if (factoryContext !== undefined) this.factoryContext = factoryContext;
    if (correlationId !== undefined) this.correlationId = correlationId;
  }
}

class FactoryCreationError extends ApplicationError implements IFactoryCreationError {
  public readonly factoryArgs?: unknown[];
  public readonly attemptedAt: Date;

  constructor(
    message: string,
    factoryArgs?: unknown[],
    attemptedAt: Date = new Date(),
    factory?: IFactory<unknown>,
    factoryContext?: IFactoryContext,
  ) {
    super(message, "FACTORY_CREATION_ERROR", {
      correlationId: `factory_creation_${Date.now()}`,
      operation: "factory_create",
      module: "DI_Factory",
      metadata: {
        factory: factory?.name,
        factoryArgs: factoryArgs?.length || 0,
        attemptedAt,
        factoryContext: factoryContext
          ? {
              createdAt: factoryContext.createdAt,
              correlationId: factoryContext.correlationId,
            }
          : undefined,
      },
    });

    if (factoryArgs !== undefined) this.factoryArgs = factoryArgs;
    this.attemptedAt = attemptedAt;
  }
}

// Note: FactoryRegistrationError removed as it's not currently used in the implementation
// It can be re-added when needed for specific registration error handling

/**
 * Abstract base factory class with performance tracking and lifecycle management
 */
export abstract class AbstractFactory<T> implements IFactory<T> {
  public abstract readonly name: string;
  protected readonly createdAt = new Date();
  protected readonly metrics: IFactoryPerformanceMetrics = {
    totalCreated: 0,
    averageCreationTime: 0,
    peakCreationTime: 0,
    lastCreationTime: 0,
    successRate: 1,
    estimatedMemoryUsage: 0,
  };

  private totalCreationTime = 0;
  private failureCount = 0;

  /**
   * Abstract method for creating instances - must be implemented by subclasses
   */
  public abstract create(...args: unknown[]): T | Promise<T>;

  /**
   * Default implementation for checking if factory can create instances
   */
  public canCreate(..._args: unknown[]): boolean {
    return true;
  }

  /**
   * Get factory metadata including performance metrics
   */
  public getMetadata(): IFactoryMetadata {
    return {
      factoryType: this.constructor.name,
      createdAt: this.createdAt,
      performance: { ...this.metrics },
      metadata: {},
    };
  }

  /**
   * Dispose factory and cleanup resources - default implementation does nothing
   */
  public async dispose(): Promise<void> {
    // Override in subclasses if cleanup is needed
  }

  /**
   * Protected method to track creation performance
   */
  protected trackCreation<TResult>(operation: () => TResult | Promise<TResult>): TResult | Promise<TResult> {
    const startTime = performance.now();

    const handleResult = (result: TResult): TResult => {
      const endTime = performance.now();
      const creationTime = endTime - startTime;

      this.updateMetrics(creationTime, true);
      return result;
    };

    const handleError = (error: unknown): never => {
      const endTime = performance.now();
      const creationTime = endTime - startTime;

      this.updateMetrics(creationTime, false);
      throw error;
    };

    try {
      const result = operation();

      if (result instanceof Promise) {
        return result.then(handleResult).catch(handleError);
      }

      return handleResult(result);
    } catch (error) {
      return handleError(error);
    }
  }

  private updateMetrics(creationTime: number, success: boolean): void {
    this.metrics.totalCreated++;
    this.totalCreationTime += creationTime;
    this.metrics.lastCreationTime = creationTime;

    if (creationTime > this.metrics.peakCreationTime) {
      this.metrics.peakCreationTime = creationTime;
    }

    this.metrics.averageCreationTime = this.totalCreationTime / this.metrics.totalCreated;

    if (!success) {
      this.failureCount++;
    }

    this.metrics.successRate = (this.metrics.totalCreated - this.failureCount) / this.metrics.totalCreated;

    // Rough memory estimation (can be overridden in subclasses)
    this.metrics.estimatedMemoryUsage = this.metrics.totalCreated * 1024; // 1KB per instance estimate
  }
}

/**
 * Simple factory implementation that wraps a creation function
 */
export class SimpleFactory<T> extends AbstractFactory<T> {
  public readonly name: string;

  constructor(
    name: string,
    private readonly factoryFunction: (...args: unknown[]) => T | Promise<T>,
  ) {
    super();
    this.name = name;
  }

  public override create(...args: unknown[]): T | Promise<T> {
    return this.trackCreation(() => this.factoryFunction(...args));
  }
}

/**
 * Cached factory that stores created instances
 */
export class CachedFactory<T> extends AbstractFactory<T> {
  public readonly name: string;
  private readonly cache = new Map<string, T>();
  private readonly maxCacheSize: number;

  constructor(
    name: string,
    private readonly innerFactory: IFactory<T>,
    maxCacheSize = 100,
  ) {
    super();
    this.name = `Cached(${name || innerFactory.name || "Unknown"})`;
    this.maxCacheSize = maxCacheSize;
  }

  public override create(...args: unknown[]): T | Promise<T> {
    const cacheKey = this.getCacheKey(args);

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    return this.trackCreation(() => {
      const result = this.innerFactory.create(...args);

      if (result instanceof Promise) {
        return result.then((resolvedResult) => {
          this.addToCache(cacheKey, resolvedResult);
          return resolvedResult;
        });
      }

      this.addToCache(cacheKey, result);
      return result;
    });
  }

  public override async dispose(): Promise<void> {
    this.cache.clear();
    if (this.innerFactory.dispose) {
      await this.innerFactory.dispose();
    }
  }

  private getCacheKey(args: unknown[]): string {
    return JSON.stringify(args);
  }

  private addToCache(key: string, value: T): void {
    if (this.cache.size >= this.maxCacheSize) {
      // Simple LRU: remove first (oldest) entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }
}

/**
 * Abstract factory registry for managing multiple factories
 */
export class FactoryRegistry implements IFactoryRegistry {
  private readonly factories = new Map<DIToken, { factory: IFactory<unknown>; options: IFactoryRegistrationOptions }>();
  private readonly abstractFactories = new Map<string, IAbstractFactory>();
  private readonly metrics: IFactoryRegistryMetrics = {
    totalFactories: 0,
    totalAbstractFactories: 0,
    totalInstancesCreated: 0,
    averageFactoryCreationTime: 0,
    cacheHitRatio: 0,
    factoryMemoryUsage: 0,
  };

  public register<T>(token: DIToken<T>, factory: IFactory<T>, options: IFactoryRegistrationOptions = {}): void {
    const registrationOptions: IFactoryRegistrationOptions = {
      lifecycle: "transient",
      enableMetrics: true,
      priority: 0,
      tags: [],
      metadata: {},
      enableCaching: false,
      maxCacheSize: 100,
      ...options,
    };

    let finalFactory: IFactory<T> = factory;

    // Wrap with caching if enabled
    if (registrationOptions.enableCaching) {
      finalFactory = new CachedFactory(factory.name, factory, registrationOptions.maxCacheSize);
    }

    this.factories.set(token, {
      factory: finalFactory as IFactory<unknown>,
      options: registrationOptions,
    });

    this.metrics.totalFactories++;
  }

  public registerAbstractFactory(name: string, abstractFactory: IAbstractFactory): void {
    this.abstractFactories.set(name, abstractFactory);
    this.metrics.totalAbstractFactories++;
  }

  public get<T>(token: DIToken<T>): IFactory<T> | undefined {
    const registration = this.factories.get(token);
    return registration?.factory as IFactory<T> | undefined;
  }

  public getAbstractFactory(name: string): IAbstractFactory | undefined {
    return this.abstractFactories.get(name);
  }

  public has<T>(token: DIToken<T>): boolean {
    return this.factories.has(token);
  }

  public unregister<T>(token: DIToken<T>): boolean {
    const registration = this.factories.get(token);
    if (registration) {
      this.factories.delete(token);
      this.metrics.totalFactories--;

      // Cleanup factory if it has dispose method
      if (registration.factory.dispose) {
        const disposeResult = registration.factory.dispose();
        if (disposeResult instanceof Promise) {
          disposeResult.catch(console.error);
        }
      }

      return true;
    }
    return false;
  }

  public unregisterAbstractFactory(name: string): boolean {
    const abstractFactory = this.abstractFactories.get(name);
    if (abstractFactory) {
      this.abstractFactories.delete(name);
      this.metrics.totalAbstractFactories--;

      // Cleanup abstract factory if it has dispose method
      if (abstractFactory.dispose) {
        const disposeResult = abstractFactory.dispose();
        if (disposeResult instanceof Promise) {
          disposeResult.catch(console.error);
        }
      }

      return true;
    }
    return false;
  }

  public getTokens(): readonly DIToken[] {
    return Array.from(this.factories.keys());
  }

  public getAbstractFactoryNames(): readonly string[] {
    return Array.from(this.abstractFactories.keys());
  }

  public clear(): void {
    // Dispose all factories
    for (const registration of Array.from(this.factories.values())) {
      if (registration.factory.dispose) {
        const disposeResult = registration.factory.dispose();
        if (disposeResult instanceof Promise) {
          disposeResult.catch(console.error);
        }
      }
    }

    // Dispose all abstract factories
    for (const abstractFactory of Array.from(this.abstractFactories.values())) {
      if (abstractFactory.dispose) {
        const disposeResult = abstractFactory.dispose();
        if (disposeResult instanceof Promise) {
          disposeResult.catch(console.error);
        }
      }
    }

    this.factories.clear();
    this.abstractFactories.clear();

    this.metrics.totalFactories = 0;
    this.metrics.totalAbstractFactories = 0;
  }

  public getMetrics(): IFactoryRegistryMetrics {
    return { ...this.metrics };
  }
}

/**
 * Factory resolver that integrates with the DI container
 */
export class FactoryResolver implements IFactoryResolver {
  private registry?: IFactoryRegistry;
  private readonly metrics: IFactoryResolverMetrics = {
    totalResolutions: 0,
    successfulResolutions: 0,
    averageResolutionTime: 0,
    factoryHitRatio: 0,
  };

  private totalResolutionTime = 0;
  private factoryHits = 0;

  public setRegistry(registry: IFactoryRegistry): void {
    this.registry = registry;
  }

  public resolve<T>(token: DIToken<T>, _context?: IResolutionContext): T | Promise<T> {
    const startTime = performance.now();

    if (!this.registry) {
      throw new FactoryError("Factory registry not set");
    }

    const factory = this.registry.get(token);
    if (!factory) {
      throw new FactoryError(`No factory registered for token: ${String(token)}`);
    }

    this.factoryHits++;

    try {
      const result = factory.create();
      const endTime = performance.now();

      this.updateMetrics(endTime - startTime, true);
      return result;
    } catch (_error) {
      const endTime = performance.now();
      this.updateMetrics(endTime - startTime, false);

      throw new FactoryCreationError(`Factory creation failed for token: ${String(token)}`, [], new Date(), factory);
    }
  }

  public tryResolve<T>(token: DIToken<T>, context?: IResolutionContext): T | Promise<T> | undefined {
    try {
      return this.resolve(token, context);
    } catch (_error) {
      return undefined;
    }
  }

  public canResolve<T>(token: DIToken<T>): boolean {
    return this.registry?.has(token) ?? false;
  }

  public getMetrics(): IFactoryResolverMetrics {
    return { ...this.metrics };
  }

  private updateMetrics(resolutionTime: number, success: boolean): void {
    this.metrics.totalResolutions++;
    this.totalResolutionTime += resolutionTime;

    if (success) {
      this.metrics.successfulResolutions++;
    }

    this.metrics.averageResolutionTime = this.totalResolutionTime / this.metrics.totalResolutions;
    this.metrics.factoryHitRatio = this.factoryHits / this.metrics.totalResolutions;
  }
}

/**
 * Universal provider factory implementation for Axon provider patterns
 */
export class UniversalProviderFactory implements IProviderFactory {
  public readonly name = "UniversalProviderFactory";

  private readonly authFactory: IFactory<any> | undefined;
  private readonly billingFactory: IFactory<any> | undefined;
  private readonly storageFactory: IFactory<any> | undefined;
  private readonly llmFactory: IFactory<any> | undefined;

  constructor(
    authFactory?: IFactory<any>,
    billingFactory?: IFactory<any>,
    storageFactory?: IFactory<any>,
    llmFactory?: IFactory<any>,
  ) {
    this.authFactory = authFactory;
    this.billingFactory = billingFactory;
    this.storageFactory = storageFactory;
    this.llmFactory = llmFactory;
  }

  public getFactory<T>(token: DIToken<T>): IFactory<T> | undefined {
    const tokenString = String(token).toLowerCase();

    if (tokenString.includes("auth") && this.authFactory) {
      return this.authFactory as IFactory<T>;
    }
    if (tokenString.includes("billing") && this.billingFactory) {
      return this.billingFactory as IFactory<T>;
    }
    if (tokenString.includes("storage") && this.storageFactory) {
      return this.storageFactory as IFactory<T>;
    }
    if (tokenString.includes("llm") && this.llmFactory) {
      return this.llmFactory as IFactory<T>;
    }

    return undefined;
  }

  public listFactories(): readonly DIToken[] {
    const factories: DIToken[] = [];

    if (this.authFactory) factories.push("IAuthProvider" as DIToken);
    if (this.billingFactory) factories.push("IBillingProvider" as DIToken);
    if (this.storageFactory) factories.push("IStorageProvider" as DIToken);
    if (this.llmFactory) factories.push("ILLMProvider" as DIToken);

    return factories;
  }

  public supports<T>(token: DIToken<T>): boolean {
    return this.getFactory(token) !== undefined;
  }

  public async dispose(): Promise<void> {
    const disposals = [];

    if (this.authFactory?.dispose) disposals.push(this.authFactory.dispose());
    if (this.billingFactory?.dispose) disposals.push(this.billingFactory.dispose());
    if (this.storageFactory?.dispose) disposals.push(this.storageFactory.dispose());
    if (this.llmFactory?.dispose) disposals.push(this.llmFactory.dispose());

    await Promise.all(disposals);
  }

  public createAuthProvider(config?: IAuthProviderConfig): any | Promise<any> {
    if (!this.authFactory) {
      throw new FactoryError("No auth provider factory configured");
    }
    return this.authFactory.create(config);
  }

  public createBillingProvider(config?: IBillingProviderConfig): any | Promise<any> {
    if (!this.billingFactory) {
      throw new FactoryError("No billing provider factory configured");
    }
    return this.billingFactory.create(config);
  }

  public createStorageProvider(config?: IStorageProviderConfig): any | Promise<any> {
    if (!this.storageFactory) {
      throw new FactoryError("No storage provider factory configured");
    }
    return this.storageFactory.create(config);
  }

  public createLLMProvider(config?: ILLMProviderConfig): any | Promise<any> {
    if (!this.llmFactory) {
      throw new FactoryError("No LLM provider factory configured");
    }
    return this.llmFactory.create(config);
  }
}

/**
 * Default factory configuration
 */
export const DEFAULT_FACTORY_CONFIG: Required<IFactoryConfig> = {
  enableCaching: false,
  defaultCacheSize: 100,
  enableMetrics: true,
  maxCreationTime: 5000, // 5 seconds
  autoDispose: true,
  resolutionTimeout: 10000, // 10 seconds
};

/**
 * Create a factory context for operations
 */
export function createFactoryContext(
  config: IFactoryConfig = DEFAULT_FACTORY_CONFIG,
  resolutionContext?: IResolutionContext,
  correlationId?: string,
  metadata?: Record<string, unknown>,
): IFactoryContext {
  const context: IFactoryContext = {
    config: { ...DEFAULT_FACTORY_CONFIG, ...config },
    createdAt: new Date(),
  };

  if (resolutionContext !== undefined) {
    context.resolutionContext = resolutionContext;
  }
  if (correlationId !== undefined) {
    context.correlationId = correlationId;
  }
  if (metadata !== undefined) {
    context.metadata = metadata;
  }

  return context;
}
