/**
 * Container implementation classes
 *
 * Core dependency injection container with registration, resolution, and lifecycle management
 */

import type {
  DIToken,
  IContainerConfig,
  IContainerMetrics,
  IContainerRegistration,
  IContainerRegistrationOptions,
  IDIContainer,
  IResolutionContext,
} from "./container.types.js";

import {
  DEFAULT_CONTAINER_CONFIG,
  createDefaultRegistrationOptions,
  validateContainerConfig,
} from "./container.schemas.js";

import type { IAbstractFactory, IFactory, IFactoryRegistrationOptions } from "../factory/factory.types.js";

import { FactoryRegistry, FactoryResolver } from "../factory/factory.classes.js";

// Import platform timing utilities
import { now } from "../platform/index.js";

// Import proper error classes from @axon/errors
import { ApplicationError, ConfigurationError, ValidationError } from "@axon/errors";

/**
 * Performance-optimized dependency injection container
 *
 * Features:
 * - Fast Map-based token lookup
 * - Circular dependency detection
 * - Lifecycle management (singleton, transient, scoped)
 * - Performance metrics tracking
 * - Hierarchical containers
 */
export class DIContainer implements IDIContainer {
  public readonly name: string;
  public readonly parent?: IDIContainer;

  private readonly config: IContainerConfig & { name: string };
  private readonly registrations = new Map<DIToken, IContainerRegistration>();
  private readonly singletonInstances = new Map<DIToken, unknown>();
  private readonly resolutionTimes: number[] = [];
  private readonly metrics = {
    totalRegistrations: 0,
    totalResolutions: 0,
    cacheHits: 0,
  };

  // Factory pattern support
  private readonly factoryRegistry = new FactoryRegistry();
  private readonly factoryResolver = new FactoryResolver();

  private disposed = false;

  constructor(config: IContainerConfig = {}, parent?: IDIContainer) {
    // Validate and merge configuration
    const validatedConfig = validateContainerConfig(config);
    const finalConfig = { ...DEFAULT_CONTAINER_CONFIG, ...validatedConfig };

    this.name = finalConfig.name || `Container_${Date.now()}`;
    // Type assertion for exactOptionalPropertyTypes compatibility
    this.config = { ...finalConfig, name: this.name } as IContainerConfig & { name: string };
    if (parent) {
      (this as any).parent = parent;
    }
  }

  /**
   * Register a service implementation
   */
  public register<T>(
    token: DIToken<T>,
    implementation: new (...args: unknown[]) => T,
    options?: IContainerRegistrationOptions,
  ): void {
    this.ensureNotDisposed();

    if (!token) {
      throw new ValidationError("Token cannot be null or undefined", "DI_INVALID_TOKEN", {
        correlationId: `register_${Date.now()}`,
        metadata: { containerName: this.name },
      });
    }

    if (!implementation || typeof implementation !== "function") {
      throw new ValidationError("Implementation must be a constructor function", "DI_INVALID_IMPLEMENTATION", {
        correlationId: `register_${Date.now()}`,
        metadata: { token: String(token), containerName: this.name },
      });
    }

    const registrationOptions = createDefaultRegistrationOptions(options?.lifecycle);
    const finalOptions = { ...registrationOptions, ...options };

    const registration: IContainerRegistration<T> = {
      token,
      implementation,
      options: finalOptions as Required<IContainerRegistrationOptions>,
      registeredAt: new Date(),
    };

    this.registrations.set(token, registration);
    this.metrics.totalRegistrations++;

    // Clear singleton cache if re-registering
    if (this.singletonInstances.has(token)) {
      this.singletonInstances.delete(token);
    }
  }

  /**
   * Register a factory function
   */
  public registerFactory<T>(
    token: DIToken<T>,
    factory: (...args: unknown[]) => T,
    options?: Omit<IContainerRegistrationOptions, "factory">,
  ): void {
    this.ensureNotDisposed();

    if (!factory || typeof factory !== "function") {
      throw new ValidationError("Factory must be a function", "DI_INVALID_FACTORY", {
        correlationId: `registerFactory_${Date.now()}`,
        metadata: { token: String(token), containerName: this.name },
      });
    }

    this.register(token, factory as unknown as new (...args: unknown[]) => T, { ...options, factory });
  }

  /**
   * Register an existing instance
   */
  public registerInstance<T>(token: DIToken<T>, instance: T): void {
    this.ensureNotDisposed();

    if (!token) {
      throw new ValidationError("Token cannot be null or undefined", "DI_INVALID_TOKEN", {
        correlationId: `registerInstance_${Date.now()}`,
        metadata: { containerName: this.name },
      });
    }

    // Store as singleton registration
    const registration: IContainerRegistration<T> = {
      token,
      implementation: (() => instance) as unknown as new (...args: unknown[]) => T,
      options: {
        lifecycle: "singleton",
        dependencies: [],
        metadata: {},
        factory: () => instance,
        pool: undefined,
      } as Required<IContainerRegistrationOptions>,
      instance,
      registeredAt: new Date(),
    };

    this.registrations.set(token, registration);
    this.singletonInstances.set(token, instance);
    this.metrics.totalRegistrations++;
  }

  /**
   * Register a factory pattern factory
   */
  public registerFactoryInstance<T>(
    token: DIToken<T>,
    factory: IFactory<T>,
    options?: IFactoryRegistrationOptions,
  ): void {
    this.ensureNotDisposed();

    if (!token) {
      throw new ValidationError("Token cannot be null or undefined", "DI_INVALID_TOKEN", {
        correlationId: `registerFactoryInstance_${Date.now()}`,
        metadata: { containerName: this.name },
      });
    }

    if (!factory) {
      throw new ValidationError("Factory cannot be null or undefined", "DI_INVALID_FACTORY", {
        correlationId: `registerFactoryInstance_${Date.now()}`,
        metadata: { token: String(token), containerName: this.name },
      });
    }

    // Register the factory with the factory registry
    this.factoryRegistry.register(token, factory, options);

    // Set up the factory resolver if not already done
    this.factoryResolver.setRegistry(this.factoryRegistry);

    this.metrics.totalRegistrations++;
  }

  /**
   * Register an abstract factory
   */
  public registerAbstractFactory(name: string, abstractFactory: IAbstractFactory): void {
    this.ensureNotDisposed();

    if (!name) {
      throw new ValidationError("Abstract factory name cannot be null or undefined", "DI_INVALID_FACTORY_NAME", {
        correlationId: `registerAbstractFactory_${Date.now()}`,
        metadata: { containerName: this.name },
      });
    }

    if (!abstractFactory) {
      throw new ValidationError("Abstract factory cannot be null or undefined", "DI_INVALID_FACTORY", {
        correlationId: `registerAbstractFactory_${Date.now()}`,
        metadata: { name, containerName: this.name },
      });
    }

    // Register the abstract factory with the factory registry
    this.factoryRegistry.registerAbstractFactory(name, abstractFactory);

    // Set up the factory resolver if not already done
    this.factoryResolver.setRegistry(this.factoryRegistry);

    this.metrics.totalRegistrations++;
  }

  /**
   * Resolve a dependency synchronously
   */
  public resolve<T>(token: DIToken<T>, context?: IResolutionContext): T {
    const startTime = now();

    try {
      const instance = this.internalResolve<T>(token, context);
      this.trackResolution(startTime);
      return instance;
    } catch (error) {
      this.trackResolution(startTime);
      throw error;
    }
  }

  /**
   * Resolve a dependency asynchronously (supports async factories)
   */
  public async resolveAsync<T>(token: DIToken<T>, context?: IResolutionContext): Promise<T> {
    const startTime = now();

    try {
      const instance = await this.internalResolveAsync<T>(token, context);
      this.trackResolution(startTime);
      return instance;
    } catch (error) {
      this.trackResolution(startTime);
      throw error;
    }
  }

  /**
   * Try to resolve a dependency synchronously (returns undefined if not found)
   */
  public tryResolve<T>(token: DIToken<T>, context?: IResolutionContext): T | undefined {
    try {
      return this.resolve<T>(token, context);
    } catch {
      return undefined;
    }
  }

  /**
   * Try to resolve a dependency asynchronously (returns undefined if not found)
   */
  public async tryResolveAsync<T>(token: DIToken<T>, context?: IResolutionContext): Promise<T | undefined> {
    try {
      return await this.resolveAsync<T>(token, context);
    } catch {
      return undefined;
    }
  }

  /**
   * Check if a token is registered
   */
  public isRegistered<T>(token: DIToken<T>): boolean {
    return this.registrations.has(token) || (this.parent?.isRegistered(token) ?? false);
  }

  /**
   * Unregister a service
   */
  public unregister<T>(token: DIToken<T>): boolean {
    const removed = this.registrations.delete(token);
    if (removed) {
      this.singletonInstances.delete(token);
      this.metrics.totalRegistrations = Math.max(0, this.metrics.totalRegistrations - 1);
    }
    return removed;
  }

  /**
   * Create a child scoped container
   */
  public createScope(name?: string): IDIContainer {
    this.ensureNotDisposed();
    return new DIContainer(
      {
        ...this.config,
        name: name || `${this.name}_Scope_${Date.now()}`,
      },
      this,
    );
  }

  /**
   * Clear all registrations and instances
   */
  public clear(): void {
    this.registrations.clear();
    this.singletonInstances.clear();
    this.metrics.totalRegistrations = 0;
    this.resolutionTimes.length = 0;
  }

  /**
   * Get container metrics
   */
  public getMetrics(): IContainerMetrics {
    const avgTime =
      this.resolutionTimes.length > 0
        ? this.resolutionTimes.reduce((a, b) => a + b, 0) / this.resolutionTimes.length
        : 0;

    const peakTime = this.resolutionTimes.length > 0 ? Math.max(...this.resolutionTimes) : 0;

    return {
      totalRegistrations: this.metrics.totalRegistrations,
      totalResolutions: this.metrics.totalResolutions,
      averageResolutionTime: avgTime,
      peakResolutionTime: peakTime,
      cacheHitRatio: this.metrics.totalResolutions > 0 ? this.metrics.cacheHits / this.metrics.totalResolutions : 0,
      memoryUsage: {
        singletonCount: this.singletonInstances.size,
        estimatedBytes: this.estimateMemoryUsage(),
      },
    };
  }

  /**
   * Dispose container and cleanup resources
   */
  public dispose(): void {
    if (this.disposed) return;

    this.clear();
    this.disposed = true;
  }

  /**
   * Internal resolution implementation (synchronous)
   */
  private internalResolve<T>(token: DIToken<T>, context?: IResolutionContext): T {
    const result = this.internalResolveCore<T>(token, context);

    // Ensure synchronous result
    if (result instanceof Promise) {
      throw new ApplicationError(
        "Async factories not supported in synchronous resolution - use resolveAsync() instead",
        "DI_ASYNC_FACTORY_NOT_SUPPORTED",
        {
          correlationId: `asyncFactory_${Date.now()}`,
          metadata: { 
            token: String(token), 
            containerName: this.name,
            hint: "Use container.resolveAsync() to support async factories and dependencies"
          },
        },
      );
    }

    return result;
  }

  /**
   * Internal resolution implementation (asynchronous)
   */
  private async internalResolveAsync<T>(token: DIToken<T>, context?: IResolutionContext): Promise<T> {
    const result = this.internalResolveCore<T>(token, context);

    // Handle both sync and async results
    if (result instanceof Promise) {
      return await result;
    }

    return result;
  }

  /**
   * Core resolution logic shared between sync and async paths
   */
  private internalResolveCore<T>(token: DIToken<T>, context?: IResolutionContext): T | Promise<T> {
    this.ensureNotDisposed();

    // Create or extend resolution context
    const resolutionContext = context || this.createResolutionContext();

    // Check for circular dependencies
    if (resolutionContext.resolutionPath.includes(token)) {
      throw new ConfigurationError("Circular dependency detected", "DI_CIRCULAR_DEPENDENCY", {
        correlationId: `circularDependency_${Date.now()}`,
        metadata: {
          dependencyPath: [...resolutionContext.resolutionPath, token].map(String),
          containerName: this.name,
        },
      });
    }

    // Check resolution depth
    const maxDepth = this.config.maxResolutionDepth ?? 20; // Use default if undefined
    if (resolutionContext.depth >= maxDepth) {
      throw new ConfigurationError("Maximum resolution depth exceeded", "DI_MAX_DEPTH_EXCEEDED", {
        correlationId: `maxDepth_${Date.now()}`,
        metadata: {
          maxDepth,
          currentDepth: resolutionContext.depth,
          containerName: this.name,
        },
      });
    }

    // Try to find registration
    const registration = this.registrations.get(token);

    // Check parent container if not found
    if (!registration && this.parent) {
      return this.parent.resolve<T>(token, resolutionContext);
    }

    if (!registration) {
      // Try factory resolution before giving up
      if (this.factoryResolver.canResolve(token)) {
        try {
          const result = this.factoryResolver.resolve(token, resolutionContext);
          // Handle both sync and async factory results
          if (result instanceof Promise) {
            // For now, we'll throw an error for async factories in sync resolution
            // This could be enhanced to support async resolution in the future
            // Return the promise as-is for async resolution
            return result;
          }
          return result;
        } catch (_error) {
          // Re-throw DI-specific errors (like async factory not supported)
          if (_error instanceof ApplicationError && _error.code?.startsWith("DI_")) {
            throw _error;
          }
          // Factory resolution failed with non-DI error, continue to normal error handling
        }
      }

      if (this.config.strictMode) {
        throw new ApplicationError("Registration not found", "DI_REGISTRATION_NOT_FOUND", {
          correlationId: `notFound_${Date.now()}`,
          metadata: {
            token: String(token),
            availableTokens: Array.from(this.registrations.keys()).map(String),
            containerName: this.name,
          },
        });
      }
      return undefined as T;
    }

    // Handle singleton lifecycle
    if (registration.options.lifecycle === "singleton") {
      const cached = this.singletonInstances.get(token) as T;
      if (cached !== undefined) {
        this.metrics.cacheHits++;
        return cached;
      }
    }

    // Update resolution context
    const newContext: IResolutionContext = {
      ...resolutionContext,
      resolutionPath: [...resolutionContext.resolutionPath, token],
      depth: resolutionContext.depth + 1,
    };

    // Create instance
    const instance = this.createInstanceCore<T>(registration as IContainerRegistration<T>, newContext);

    // Handle async instance creation
    if (instance instanceof Promise) {
      return instance.then((resolvedInstance) => {
        // Cache singleton instances after async resolution
        if (registration.options.lifecycle === "singleton") {
          this.singletonInstances.set(token, resolvedInstance);
        }
        return resolvedInstance;
      });
    }

    // Cache singleton instances for sync resolution
    if (registration.options.lifecycle === "singleton") {
      this.singletonInstances.set(token, instance);
    }

    return instance;
  }

  /**
   * Create instance based on registration (core implementation)
   */
  private createInstanceCore<T>(registration: IContainerRegistration<T>, context: IResolutionContext): T | Promise<T> {
    const { implementation, options } = registration;

    try {
      // Use factory if provided
      if (options.factory) {
        const factoryResult = options.factory();
        // Handle both sync and async factory results
        return factoryResult as T | Promise<T>;
      }

      // Resolve dependencies - support both sync and async dependency resolution
      const resolveDependencies = async (): Promise<unknown[]> => {
        if (!options.dependencies || options.dependencies.length === 0) {
          return [];
        }

        const dependencyPromises = options.dependencies.map(async (dep) => {
          const depResult = this.internalResolveCore(dep, context);
          if (depResult instanceof Promise) {
            return await depResult;
          }
          return depResult;
        });

        return await Promise.all(dependencyPromises);
      };

      // Check if we need async resolution
      const hasAsyncDependencies = options.dependencies?.some((dep) => {
        try {
          const depResult = this.internalResolveCore(dep, context);
          return depResult instanceof Promise;
        } catch {
          return false;
        }
      }) ?? false;

      if (hasAsyncDependencies) {
        // Async path - resolve all dependencies asynchronously
        return resolveDependencies().then((dependencies) => {
          if (typeof implementation === "function") {
            return new (implementation as new (...args: unknown[]) => T)(...dependencies);
          }
          throw new ValidationError("Invalid implementation type", "DI_INVALID_IMPLEMENTATION", {
            correlationId: `invalidImpl_${Date.now()}`,
            metadata: {
              token: String(registration.token),
              implementationType: typeof implementation,
              containerName: this.name,
            },
          });
        });
      }

      // Sync path - resolve dependencies synchronously (original logic)
      const dependencies =
        options.dependencies?.map((dep) => {
          const depResult = this.internalResolveCore(dep, context);
          if (depResult instanceof Promise) {
            throw new ApplicationError(
              "Async dependency resolution not yet supported in instance creation",
              "DI_ASYNC_DEPENDENCY_NOT_SUPPORTED",
              {
                correlationId: `asyncDep_${Date.now()}`,
                metadata: {
                  parentToken: String(registration.token),
                  dependencyToken: String(dep),
                  containerName: this.name,
                },
              },
            );
          }
          return depResult;
        }) || [];

      // Create instance
      if (typeof implementation === "function") {
        const instance = new (implementation as new (...args: unknown[]) => T)(...dependencies);
        return instance;
      }

      throw new ValidationError("Invalid implementation type", "DI_INVALID_IMPLEMENTATION", {
        correlationId: `invalidImpl_${Date.now()}`,
        metadata: {
          token: String(registration.token),
          implementationType: typeof implementation,
          containerName: this.name,
        },
      });
    } catch (error: unknown) {
      // Re-throw DI-specific errors without wrapping them
      if (error instanceof ApplicationError && error.code?.startsWith("DI_")) {
        throw error;
      }

      if (error instanceof ConfigurationError && error.code?.startsWith("DI_")) {
        throw error;
      }

      if (error instanceof ValidationError && error.code?.startsWith("DI_")) {
        throw error;
      }

      // Only wrap non-DI errors as instance creation failures
      const creationError = new ApplicationError("Failed to create instance", "DI_INSTANCE_CREATION_FAILED", {
        correlationId: `createFailed_${Date.now()}`,
        metadata: {
          token: String(registration.token),
          originalError: error instanceof Error ? error.message : String(error),
          containerName: this.name,
        },
      });

      // Chain the cause if it's an Error
      if (error instanceof Error) {
        throw creationError.withCause(error);
      }
      throw creationError;
    }
  }

  /**
   * Create initial resolution context
   */
  private createResolutionContext(): IResolutionContext {
    return {
      resolutionPath: [],
      depth: 0,
      startTime: now(),
    };
  }

  /**
   * Track resolution performance
   */
  private trackResolution(startTime: number): void {
    if (this.config.enableMetrics) {
      const duration = now() - startTime;
      this.resolutionTimes.push(duration);
      this.metrics.totalResolutions++;

      // Keep only recent measurements for rolling average
      if (this.resolutionTimes.length > 1000) {
        this.resolutionTimes.splice(0, 500);
      }
    }
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    // Rough estimation:
    // - Each registration: ~200 bytes
    // - Each singleton: ~100 bytes (metadata only, not actual object size)
    return this.registrations.size * 200 + this.singletonInstances.size * 100;
  }

  /**
   * Ensure container is not disposed
   */
  private ensureNotDisposed(): void {
    if (this.disposed) {
      throw new ApplicationError("Container has been disposed", "DI_CONTAINER_DISPOSED", {
        correlationId: `disposed_${Date.now()}`,
        metadata: { containerName: this.name },
      });
    }
  }
}

/**
 * Create a new DI container with configuration
 */
export function createContainer(config?: IContainerConfig): IDIContainer {
  return new DIContainer(config);
}

/**
 * Global default container instance
 */
let defaultContainer: IDIContainer | undefined;

/**
 * Get or create the global default container
 */
export function getDefaultContainer(): IDIContainer {
  if (!defaultContainer) {
    defaultContainer = createContainer({ name: "DefaultContainer" });
  }
  return defaultContainer;
}

/**
 * Set the global default container
 */
export function setDefaultContainer(container: IDIContainer): void {
  defaultContainer = container;
}

/**
 * Reset the global default container
 */
export function resetDefaultContainer(): void {
  if (defaultContainer) {
    defaultContainer.dispose();
    defaultContainer = undefined;
  }
}