/**
 * Enhanced domain-specific error factory implementations
 */

import { ErrorFactory } from "../../base/base-error.classes.js";
import {
  SystemError,
  ApplicationError,
  ValidationError,
  ConfigurationError,
  NetworkError,
  SecurityError,
  AuthenticationError,
  DatabaseError,
  FileSystemError,
  IntegrationError,
  TimeoutError,
  RateLimitError,
  NotFoundError,
  ConflictError,
  PermissionError,
} from "../../categories/categories.classes.js";
import type {
  IEnhancedErrorFactory,
  ISpecializedErrorFactory,
  IErrorFactoryBuilder,
  IDomainErrorBuilder,
  DomainKey,
  DomainErrorType,
  DomainErrorCreationOptions,
  IFactoryMetrics,
  IErrorFactoryConfig,
} from "./domain.types.js";
import type {
  ISystemError,
  IApplicationError,
  IValidationError,
  IConfigurationError,
  INetworkError,
  ISecurityError,
  IAuthenticationError,
  IDatabaseError,
  IFileSystemError,
  IIntegrationError,
  ITimeoutError,
  IRateLimitError,
  INotFoundError,
  IConflictError,
  IPermissionError,
} from "../../categories/categories.types.js";
import { ErrorSeverity, ErrorCategory } from "../../base/base-error.types.js";
import type { IEnhancedErrorContext, IBaseAxonError } from "../../base/base-error.types.js";

/**
 * Object pool for error instances to optimize memory allocation
 */
class ErrorPool<T extends IBaseAxonError> {
  private pool: T[] = [];
  private maxSize: number;
  private createFn: () => T;

  constructor(createFn: () => T, maxSize = 50) {
    this.createFn = createFn;
    this.maxSize = maxSize;
  }

  acquire(): T {
    return this.pool.pop() ?? this.createFn();
  }

  release(item: T): void {
    if (this.pool.length < this.maxSize) {
      // Reset the error instance for reuse
      this.resetError(item);
      this.pool.push(item);
    }
  }

  private resetError(error: T): void {
    // Reset properties to prepare for reuse
    (error as any).message = "";
    (error as any).code = "";
    (error as any).context = {};
  }
}

/**
 * Enhanced error factory with domain-specific methods and performance optimizations
 */
export class EnhancedErrorFactory extends ErrorFactory implements IEnhancedErrorFactory {
  private metrics: IFactoryMetrics;
  private config: Required<IErrorFactoryConfig>;
  private errorPools: Map<string, ErrorPool<any>>;
  private templateCache: Map<string, any>;

  constructor(config?: IErrorFactoryConfig) {
    const fullConfig: Required<IErrorFactoryConfig> = {
      defaultSeverity: ErrorSeverity.ERROR,
      defaultCategory: ErrorCategory.UNKNOWN,
      enableStackTrace: true,
      enableCorrelation: true,
      enableObjectPooling: true,
      enableTemplateCache: true,
      enableLazyEvaluation: true,
      maxPoolSize: 50,
      maxCacheSize: 100,
      trackMetrics: true,
      contextTransformer: (context) => context,
      codeGenerator: (domain, category, specific) =>
        `${domain.toUpperCase()}_${category.toUpperCase()}_${specific.toUpperCase()}`,
      ...config,
    };

    super(fullConfig.defaultSeverity, fullConfig.defaultCategory);

    this.config = fullConfig;
    this.errorPools = new Map();
    this.templateCache = new Map();
    this.metrics = {
      totalCreations: 0,
      creationsByDomain: {} as Record<DomainKey, number>,
      averageCreationTime: 0,
      builderUsageCount: 0,
      cacheHitRate: 0,
    };

    if (this.config.enableObjectPooling) {
      this.initializeErrorPools();
    }
  }

  private initializeErrorPools(): void {
    // Initialize pools for common error types
    this.errorPools.set("system", new ErrorPool(() => new SystemError("", ""), this.config.maxPoolSize));
    this.errorPools.set("application", new ErrorPool(() => new ApplicationError("", ""), this.config.maxPoolSize));
    this.errorPools.set("validation", new ErrorPool(() => new ValidationError("", ""), this.config.maxPoolSize));
    this.errorPools.set("configuration", new ErrorPool(() => new ConfigurationError("", ""), this.config.maxPoolSize));
    this.errorPools.set("network", new ErrorPool(() => new NetworkError("", ""), this.config.maxPoolSize));
    this.errorPools.set(
      "authentication",
      new ErrorPool(() => new AuthenticationError("", ""), this.config.maxPoolSize),
    );
  }

  private trackMetrics(domain: DomainKey, startTime: number): void {
    if (!this.config.trackMetrics) return;

    const endTime = performance.now();
    const duration = endTime - startTime;

    this.metrics.totalCreations++;
    this.metrics.creationsByDomain[domain] = (this.metrics.creationsByDomain[domain] || 0) + 1;

    // Update average creation time using running average
    const totalTime = this.metrics.averageCreationTime * (this.metrics.totalCreations - 1) + duration;
    this.metrics.averageCreationTime = totalTime / this.metrics.totalCreations;
  }

  private getFromPool<T extends IBaseAxonError>(domain: string): T | null {
    if (!this.config.enableObjectPooling) return null;

    const pool = this.errorPools.get(domain);
    return pool ? pool.acquire() : null;
  }

  private returnToPool(domain: string, error: IBaseAxonError): void {
    if (!this.config.enableObjectPooling) return;

    const pool = this.errorPools.get(domain);
    if (pool) {
      pool.release(error as any);
    }
  }

  /**
   * Generic domain error creation with type safety
   */
  createDomainError<T extends DomainKey>(domain: T, options: DomainErrorCreationOptions<T>): DomainErrorType<T> {
    const startTime = performance.now();

    try {
      // Try to get from pool first for performance
      const pooledError = this.getFromPool(domain);
      if (pooledError) {
        // Configure pooled error
        this.configureError(pooledError, options);
        return pooledError as DomainErrorType<T>;
      }

      // Create new error if not available in pool
      const error = this.createNewDomainError(domain, options);
      this.trackMetrics(domain, startTime);
      return error;
    } catch (_err) {
      // Fallback to base error creation if domain creation fails
      return this.create(
        options.message || "Unknown error",
        options.code || "UNKNOWN_ERROR",
        options,
      ) as DomainErrorType<T>;
    }
  }

  private createNewDomainError<T extends DomainKey>(
    domain: T,
    options: DomainErrorCreationOptions<T>,
  ): DomainErrorType<T> {
    const message = options.message || "Unknown error";
    const code = options.code || `${domain.toUpperCase()}_ERROR`;

    switch (domain) {
      case "system":
        return new SystemError(message, code, options) as unknown as DomainErrorType<T>;
      case "application":
        return new ApplicationError(message, code, options) as unknown as DomainErrorType<T>;
      case "validation":
        return new ValidationError(message, code, options) as unknown as DomainErrorType<T>;
      case "configuration":
        return new ConfigurationError(message, code, options) as unknown as DomainErrorType<T>;
      case "network":
        return new NetworkError(message, code, options) as unknown as DomainErrorType<T>;
      case "security":
        return new SecurityError(message, code, options) as unknown as DomainErrorType<T>;
      case "authentication":
        return new AuthenticationError(message, code, options) as unknown as DomainErrorType<T>;
      case "database":
        return new DatabaseError(message, code, options) as unknown as DomainErrorType<T>;
      case "filesystem":
        return new FileSystemError(message, code, options) as unknown as DomainErrorType<T>;
      case "integration":
        return new IntegrationError(message, code, options) as unknown as DomainErrorType<T>;
      case "timeout":
        return new TimeoutError(message, code, options) as unknown as DomainErrorType<T>;
      case "ratelimit":
        return new RateLimitError(message, code, options) as unknown as DomainErrorType<T>;
      case "notfound":
        return new NotFoundError(message, code, options) as unknown as DomainErrorType<T>;
      case "conflict":
        return new ConflictError(message, code, options) as unknown as DomainErrorType<T>;
      case "permission":
        return new PermissionError(message, code, options) as unknown as DomainErrorType<T>;
      default:
        throw new Error(`Unknown domain: ${domain}`);
    }
  }

  private configureError(error: IBaseAxonError, options: any): void {
    // Configure the pooled error with new options
    (error as any).message = options.message || "Unknown error";
    (error as any).code = options.code || "UNKNOWN_ERROR";
    (error as any).context = options;
  }

  /**
   * Domain-specific factory methods
   */
  createSystemError(options: DomainErrorCreationOptions<"system">): ISystemError {
    return this.createDomainError("system", options);
  }

  createApplicationError(options: DomainErrorCreationOptions<"application">): IApplicationError {
    return this.createDomainError("application", options);
  }

  createValidationError(options: DomainErrorCreationOptions<"validation">): IValidationError {
    return this.createDomainError("validation", options);
  }

  createConfigurationError(options: DomainErrorCreationOptions<"configuration">): IConfigurationError {
    return this.createDomainError("configuration", options);
  }

  createNetworkError(options: DomainErrorCreationOptions<"network">): INetworkError {
    return this.createDomainError("network", options);
  }

  createSecurityError(options: DomainErrorCreationOptions<"security">): ISecurityError {
    return this.createDomainError("security", options);
  }

  createAuthenticationError(options: DomainErrorCreationOptions<"authentication">): IAuthenticationError {
    return this.createDomainError("authentication", options);
  }

  createDatabaseError(options: DomainErrorCreationOptions<"database">): IDatabaseError {
    return this.createDomainError("database", options);
  }

  createFileSystemError(options: DomainErrorCreationOptions<"filesystem">): IFileSystemError {
    return this.createDomainError("filesystem", options);
  }

  createIntegrationError(options: DomainErrorCreationOptions<"integration">): IIntegrationError {
    return this.createDomainError("integration", options);
  }

  createTimeoutError(options: DomainErrorCreationOptions<"timeout">): ITimeoutError {
    return this.createDomainError("timeout", options);
  }

  createRateLimitError(options: DomainErrorCreationOptions<"ratelimit">): IRateLimitError {
    return this.createDomainError("ratelimit", options);
  }

  createNotFoundError(options: DomainErrorCreationOptions<"notfound">): INotFoundError {
    return this.createDomainError("notfound", options);
  }

  createConflictError(options: DomainErrorCreationOptions<"conflict">): IConflictError {
    return this.createDomainError("conflict", options);
  }

  createPermissionError(options: DomainErrorCreationOptions<"permission">): IPermissionError {
    return this.createDomainError("permission", options);
  }

  /**
   * Fluent builder interface
   */
  builder(): IErrorFactoryBuilder {
    this.metrics.builderUsageCount++;
    return new ErrorFactoryBuilder(this);
  }

  /**
   * Get factory performance metrics
   */
  getMetrics(): IFactoryMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset factory metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalCreations: 0,
      creationsByDomain: {} as Record<DomainKey, number>,
      averageCreationTime: 0,
      builderUsageCount: 0,
      cacheHitRate: 0,
    };
  }

  /**
   * Specialized factory creation for specific domains
   */
  createSpecializedFactory<T extends DomainKey>(domain: T): ISpecializedErrorFactory<T> {
    return new SpecializedErrorFactory(domain, this);
  }
}

/**
 * Fluent builder for error creation
 */
class ErrorFactoryBuilder implements IErrorFactoryBuilder {
  constructor(private factory: EnhancedErrorFactory) {}

  domain<T extends DomainKey>(domain: T): IDomainErrorBuilder<T> {
    return new DomainErrorBuilder(domain, this.factory);
  }

  system(): IDomainErrorBuilder<"system"> {
    return this.domain("system");
  }

  application(): IDomainErrorBuilder<"application"> {
    return this.domain("application");
  }

  validation(): IDomainErrorBuilder<"validation"> {
    return this.domain("validation");
  }

  configuration(): IDomainErrorBuilder<"configuration"> {
    return this.domain("configuration");
  }

  network(): IDomainErrorBuilder<"network"> {
    return this.domain("network");
  }

  security(): IDomainErrorBuilder<"security"> {
    return this.domain("security");
  }

  authentication(): IDomainErrorBuilder<"authentication"> {
    return this.domain("authentication");
  }

  database(): IDomainErrorBuilder<"database"> {
    return this.domain("database");
  }

  filesystem(): IDomainErrorBuilder<"filesystem"> {
    return this.domain("filesystem");
  }

  integration(): IDomainErrorBuilder<"integration"> {
    return this.domain("integration");
  }

  timeout(): IDomainErrorBuilder<"timeout"> {
    return this.domain("timeout");
  }

  ratelimit(): IDomainErrorBuilder<"ratelimit"> {
    return this.domain("ratelimit");
  }

  notfound(): IDomainErrorBuilder<"notfound"> {
    return this.domain("notfound");
  }

  conflict(): IDomainErrorBuilder<"conflict"> {
    return this.domain("conflict");
  }

  permission(): IDomainErrorBuilder<"permission"> {
    return this.domain("permission");
  }
}

/**
 * Domain-specific error builder with fluent interface
 */
class DomainErrorBuilder<T extends DomainKey> implements IDomainErrorBuilder<T> {
  private options: Partial<DomainErrorCreationOptions<T>> = {};

  constructor(
    private domain: T,
    private factory: EnhancedErrorFactory,
  ) {}

  message(message: string): IDomainErrorBuilder<T> {
    this.options.message = message;
    return this;
  }

  code(code: string): IDomainErrorBuilder<T> {
    this.options.code = code;
    return this;
  }

  severity(severity: ErrorSeverity): IDomainErrorBuilder<T> {
    this.options.severity = severity;
    return this;
  }

  category(category: ErrorCategory): IDomainErrorBuilder<T> {
    this.options.category = category;
    return this;
  }

  cause(cause: Error | IBaseAxonError): IDomainErrorBuilder<T> {
    this.options.cause = cause;
    return this;
  }

  context(context: Partial<IEnhancedErrorContext>): IDomainErrorBuilder<T> {
    this.options.context = { ...this.options.context, ...context };
    return this;
  }

  domainContext(context: any): IDomainErrorBuilder<T> {
    this.options.domainContext = context;
    return this;
  }

  correlationId(id: string): IDomainErrorBuilder<T> {
    if (!this.options.context) this.options.context = {};
    this.options.context.correlationId = id;
    return this;
  }

  component(component: string): IDomainErrorBuilder<T> {
    if (!this.options.context) this.options.context = {};
    this.options.context.component = component;
    return this;
  }

  operation(operation: string): IDomainErrorBuilder<T> {
    if (!this.options.context) this.options.context = {};
    this.options.context.operation = operation;
    return this;
  }

  metadata(key: string, value: unknown): IDomainErrorBuilder<T> {
    if (!this.options.context) this.options.context = {};
    if (!this.options.context.metadata) {
      this.options.context.metadata = {};
    }
    this.options.context.metadata[key] = value;
    return this;
  }

  addMetadata(metadata: Record<string, unknown>): IDomainErrorBuilder<T> {
    if (!this.options.context) this.options.context = {};
    this.options.context.metadata = { ...this.options.context.metadata, ...metadata };
    return this;
  }

  build(): DomainErrorType<T> {
    const requiredOptions = this.options as DomainErrorCreationOptions<T>;
    return this.factory.createDomainError(this.domain, requiredOptions);
  }

  throw(): never {
    throw this.build();
  }
}

/**
 * Specialized factory for a specific domain
 */
class SpecializedErrorFactory<T extends DomainKey> implements ISpecializedErrorFactory<T> {
  private defaults: Partial<DomainErrorCreationOptions<T>> = {};

  constructor(
    public readonly domain: T,
    private factory: EnhancedErrorFactory,
  ) {}

  create(options: DomainErrorCreationOptions<T>): DomainErrorType<T> {
    const mergedOptions = { ...this.defaults, ...options } as DomainErrorCreationOptions<T>;
    return this.factory.createDomainError(this.domain, mergedOptions);
  }

  createFromError(error: Error, options?: Partial<DomainErrorCreationOptions<T>>): DomainErrorType<T> {
    const mergedOptions = {
      ...this.defaults,
      message: error.message,
      cause: error,
      ...options,
    } as DomainErrorCreationOptions<T>;
    return this.factory.createDomainError(this.domain, mergedOptions);
  }

  withDefaults(defaults: Partial<DomainErrorCreationOptions<T>>): ISpecializedErrorFactory<T> {
    const newFactory = new SpecializedErrorFactory(this.domain, this.factory);
    newFactory.defaults = { ...this.defaults, ...defaults };
    return newFactory;
  }
}

/**
 * Default enhanced error factory instance
 */
export const defaultEnhancedFactory = new EnhancedErrorFactory();

/**
 * Convenient factory creation functions
 */
export function createEnhancedFactory(config?: IErrorFactoryConfig): EnhancedErrorFactory {
  return new EnhancedErrorFactory(config);
}

export function createSpecializedFactory<T extends DomainKey>(
  domain: T,
  config?: IErrorFactoryConfig,
): ISpecializedErrorFactory<T> {
  const factory = new EnhancedErrorFactory(config);
  return factory.createSpecializedFactory(domain);
}
