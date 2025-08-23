/**
 * Container type definitions
 *
 * Defines core interfaces and types for the dependency injection container
 */

// Import proper error types from @axon/errors
import type { IBaseAxonError } from "@axon/errors";
import type { IPoolConfig } from "../pool/pool.types.js";
import type { IFactory, IFactoryRegistrationOptions, IAbstractFactory } from "../factory/factory.types.js";

/**
 * Dependency injection token - can be string, symbol, or constructor function
 */
export type DIToken<T = unknown> = string | symbol | (new (...args: never[]) => T);

/**
 * Container lifecycle options
 */
export type ContainerLifecycle = "singleton" | "transient" | "scoped";

/**
 * Registration options for container entries
 */
export interface IContainerRegistrationOptions {
  /** Instance lifecycle management strategy */
  lifecycle?: ContainerLifecycle;

  /** Custom factory function for instance creation */
  factory?: (...args: unknown[]) => unknown;

  /** Dependencies to inject into constructor */
  dependencies?: DIToken[];

  /** Metadata for registration */
  metadata?: Record<string, unknown>;

  /** Pool configuration for transient lifecycle with pooling */
  pool?: IPoolConfig | undefined;
}

/**
 * Container registration entry
 */
export interface IContainerRegistration<T = unknown> {
  /** Registration token */
  token: DIToken<T>;

  /** Implementation constructor or factory */
  implementation: new (...args: unknown[]) => T | ((...args: unknown[]) => T);

  /** Registration options */
  options: Required<IContainerRegistrationOptions>;

  /** Cached instance (for singletons) */
  instance?: T;

  /** Registration timestamp */
  registeredAt: Date;
}

/**
 * Resolution context for tracking dependency resolution path
 */
export interface IResolutionContext {
  /** Current resolution path (for circular dependency detection) */
  resolutionPath: DIToken[];

  /** Resolution depth */
  depth: number;

  /** Scoped instances for current resolution */
  scopedInstances?: Map<DIToken, unknown>;

  /** Resolution start timestamp */
  startTime: number;

  /** Parent context (for nested scopes) */
  parent?: IResolutionContext;
}

/**
 * Container statistics and metrics
 */
export interface IContainerMetrics {
  /** Total registrations */
  totalRegistrations: number;

  /** Total resolutions performed */
  totalResolutions: number;

  /** Average resolution time in milliseconds */
  averageResolutionTime: number;

  /** Peak resolution time in milliseconds */
  peakResolutionTime: number;

  /** Cache hit ratio */
  cacheHitRatio: number;

  /** Memory usage statistics */
  memoryUsage: {
    /** Singleton instances count */
    singletonCount: number;

    /** Estimated memory usage in bytes */
    estimatedBytes: number;
  };
}

/**
 * Main dependency injection container interface
 */
export interface IDIContainer {
  /** Container name for identification */
  readonly name: string;

  /** Parent container (for hierarchical containers) */
  readonly parent?: IDIContainer;

  /**
   * Register a service implementation
   */
  register<T>(
    token: DIToken<T>,
    implementation: new (...args: unknown[]) => T,
    options?: IContainerRegistrationOptions,
  ): void;

  /**
   * Register a factory function
   */
  registerFactory<T>(
    token: DIToken<T>,
    factory: (...args: unknown[]) => T,
    options?: Omit<IContainerRegistrationOptions, "factory">,
  ): void;

  /**
   * Register an existing instance
   */
  registerInstance<T>(token: DIToken<T>, instance: T): void;

  /**
   * Register a factory pattern factory
   */
  registerFactoryInstance<T>(token: DIToken<T>, factory: IFactory<T>, options?: IFactoryRegistrationOptions): void;

  /**
   * Register an abstract factory
   */
  registerAbstractFactory(name: string, abstractFactory: IAbstractFactory): void;

  /**
   * Resolve a dependency
   */
  resolve<T>(token: DIToken<T>, context?: IResolutionContext): T;

  /**
   * Try to resolve a dependency (returns undefined if not found)
   */
  tryResolve<T>(token: DIToken<T>, context?: IResolutionContext): T | undefined;

  /**
   * Check if a token is registered
   */
  isRegistered<T>(token: DIToken<T>): boolean;

  /**
   * Unregister a service
   */
  unregister<T>(token: DIToken<T>): boolean;

  /**
   * Create a child scoped container
   */
  createScope(name?: string): IDIContainer;

  /**
   * Clear all registrations and instances
   */
  clear(): void;

  /**
   * Get container metrics
   */
  getMetrics(): IContainerMetrics;

  /**
   * Dispose container and cleanup resources
   */
  dispose(): void;
}

/**
 * Container error types
 */
export interface IDIContainerError extends IBaseAxonError {
  /** Token that caused the error */
  token?: DIToken;

  /** Resolution context when error occurred */
  resolutionContext?: IResolutionContext;
}

/**
 * Circular dependency error
 */
export interface ICircularDependencyError extends IDIContainerError {
  /** Circular dependency path */
  dependencyPath: DIToken[];
}

/**
 * Registration not found error
 */
export interface IRegistrationNotFoundError extends IDIContainerError {
  /** Available registrations */
  availableTokens: DIToken[];
}

/**
 * Container configuration options
 */
export interface IContainerConfig {
  /** Container name */
  name?: string;

  /** Enable strict mode (throw on missing registrations) */
  strictMode?: boolean;

  /** Default lifecycle for registrations */
  defaultLifecycle?: ContainerLifecycle;

  /** Enable performance tracking */
  enableMetrics?: boolean;

  /** Maximum resolution depth (prevents infinite recursion) */
  maxResolutionDepth?: number;

  /** Enable resolution caching */
  enableCache?: boolean;

  /** Auto-dispose on container disposal */
  autoDispose?: boolean;
}
