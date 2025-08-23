/**
 * Recovery decorators implementation - method-level recovery mechanism access
 */

import type {
  IRecoveryDecoratorMetadata,
  IMethodDecoratorConfig,
  IClassDecoratorConfig,
  IPropertyDecoratorConfig,
  IParameterDecoratorConfig,
  IDecoratorInterceptor,
  IDecoratorRegistry,
  IDecoratorUtils,
  IDecoratorConfigValidator,
  DecoratorTarget,
} from "./decorators.types.js";
import type {
  IRetryConfig,
  ICircuitBreakerConfig,
  ITimeoutConfig,
  IGracefulDegradationConfig,
  IOperationRecoveryConfig,
  IRecoveryContext,
  IRecoverableOperation,
  RecoveryStrategy,
} from "../recovery/recovery.types.js";
import { RecoveryState, BackoffStrategy } from "../recovery/recovery.types.js";
import type { IBaseAxonError } from "../base/base-error.types.js";
import { BaseAxonError, ErrorFactory } from "../base/base-error.classes.js";
import { ErrorCategory, ErrorSeverity } from "../base/base-error.types.js";
import {
  RetryHandler,
  CircuitBreakerHandler,
  TimeoutHandler,
  GracefulDegradationHandler,
  RecoveryManager,
} from "../recovery/recovery.classes.js";

/**
 * Performance utility for decorator overhead measurement
 */
class DecoratorPerformanceUtils {
  static now(): number {
    if (typeof performance !== "undefined" && performance.now) {
      return performance.now();
    }
    if (typeof process !== "undefined" && process.hrtime) {
      const hrTime = process.hrtime();
      return hrTime[0] * 1000 + hrTime[1] / 1000000;
    }
    return Date.now();
  }

  static generateId(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `decorator-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

/**
 * Metadata storage for decorator instances and configurations
 */
class DecoratorMetadataStore {
  private static metadata = new WeakMap<object, Map<string | symbol, IRecoveryDecoratorMetadata>>();
  private static handlers = new Map<string, { handler: unknown; config: unknown }>();

  static setMetadata(target: object, propertyKey: string | symbol, metadata: IRecoveryDecoratorMetadata): void {
    let targetMetadata = this.metadata.get(target);
    if (!targetMetadata) {
      targetMetadata = new Map();
      this.metadata.set(target, targetMetadata);
    }
    targetMetadata.set(propertyKey, metadata);
  }

  static getMetadata(target: object, propertyKey: string | symbol): IRecoveryDecoratorMetadata | undefined {
    const targetMetadata = this.metadata.get(target);
    return targetMetadata?.get(propertyKey);
  }

  static setHandler(key: string, handler: unknown, config: unknown): void {
    this.handlers.set(key, { handler, config });
  }

  static getHandler(key: string): { handler: unknown; config: unknown } | undefined {
    return this.handlers.get(key);
  }

  static generateHandlerKey(strategy: RecoveryStrategy, config: unknown): string {
    return `${strategy}-${JSON.stringify(config)}`;
  }
}

/**
 * Base decorator implementation with common functionality
 */
abstract class BaseRecoveryDecorator {
  protected errorFactory: ErrorFactory;
  protected recoveryManager: RecoveryManager;

  constructor() {
    this.errorFactory = new ErrorFactory(ErrorSeverity.ERROR, ErrorCategory.APPLICATION);
    this.recoveryManager = new RecoveryManager();
  }

  protected createRecoveryContext(
    _target: unknown,
    propertyKey: string | symbol,
    args: unknown[],
    config?: IMethodDecoratorConfig,
  ): IRecoveryContext {
    const correlationId = DecoratorPerformanceUtils.generateId();

    const baseContext: IRecoveryContext = {
      correlationId,
      timestamp: new Date().toISOString(),
      severity: ErrorSeverity.ERROR,
      category: ErrorCategory.APPLICATION,
      operation: String(propertyKey),
      attemptNumber: 1,
      totalAttempts: 0,
      strategiesAttempted: [],
      recoveryState: RecoveryState.IDLE,
      recoveryStartedAt: new Date(),
    };

    if (config?.contextProvider) {
      const customContext = config.contextProvider(...args);
      return { ...baseContext, ...customContext };
    }

    return baseContext;
  }

  protected transformError(error: Error, transformer?: (error: Error) => IBaseAxonError): IBaseAxonError {
    if (transformer) {
      return transformer(error);
    }

    if (error instanceof BaseAxonError) {
      return error;
    }

    return this.errorFactory.createFromError(error);
  }

  protected createMetadata(
    name: string,
    target: DecoratorTarget,
    methodName: string | symbol,
    config: IOperationRecoveryConfig,
  ): IRecoveryDecoratorMetadata {
    return {
      name,
      target,
      methodName: String(methodName),
      config,
      createdAt: new Date(),
      appliedBy: "@axon/core/errors",
      version: "1.0.0",
    };
  }
}

/**
 * Retry decorator implementation
 */
export class RetryDecorator extends BaseRecoveryDecorator {
  static create(
    config: IRetryConfig & Partial<IMethodDecoratorConfig> = {
      maxAttempts: 3,
      initialDelay: 1000,
      backoffStrategy: BackoffStrategy.EXPONENTIAL,
    },
  ) {
    const decorator = new RetryDecorator();
    return decorator.createDecorator(config);
  }

  private createDecorator(config: IRetryConfig & Partial<IMethodDecoratorConfig>) {
    return (target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor => {
      const originalMethod = descriptor.value;
      if (typeof originalMethod !== "function") {
        throw this.errorFactory.create("@Retry can only be applied to methods", "INVALID_DECORATOR_TARGET");
      }

      const metadata = this.createMetadata("Retry", "method", propertyKey, { retry: config });
      DecoratorMetadataStore.setMetadata(target as object, propertyKey, metadata);

      const recoveryManager = this.recoveryManager;
      const transformError = this.transformError.bind(this);

      descriptor.value = async function (this: unknown, ...args: unknown[]): Promise<unknown> {
        const operation: IRecoverableOperation = {
          id: DecoratorPerformanceUtils.generateId(),
          name: originalMethod.name || "anonymous",
          operation: async () => originalMethod.apply(this, args),
          recoveryConfig: { retry: config },
          ...(config.methodTimeout && { timeout: config.methodTimeout }),
        };

        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          transformError(error as Error, config.errorTransformer);
          const handler = new RetryHandler(config);
          recoveryManager.registerHandler(handler);
          return await recoveryManager.executeWithRecovery(operation);
        }
      };

      if (config.preserveMetadata !== false) {
        Object.defineProperty(descriptor.value, "name", { value: originalMethod.name });
        Object.defineProperty(descriptor.value, "length", { value: originalMethod.length });
      }

      return descriptor;
    };
  }
}

/**
 * Circuit breaker decorator implementation
 */
export class CircuitBreakerDecorator extends BaseRecoveryDecorator {
  private static circuitStates = new Map<string, CircuitBreakerHandler>();

  static create(
    config: ICircuitBreakerConfig & Partial<IMethodDecoratorConfig> = {
      failureThreshold: 5,
      resetTimeout: 60000,
    },
  ) {
    const decorator = new CircuitBreakerDecorator();
    return decorator.createDecorator(config);
  }

  private createDecorator(config: ICircuitBreakerConfig & Partial<IMethodDecoratorConfig>) {
    return (target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor => {
      const originalMethod = descriptor.value;
      if (typeof originalMethod !== "function") {
        throw this.errorFactory.create("@CircuitBreaker can only be applied to methods", "INVALID_DECORATOR_TARGET");
      }

      const circuitKey = `${(target as { constructor: { name: string } }).constructor.name}.${String(propertyKey)}`;

      if (!CircuitBreakerDecorator.circuitStates.has(circuitKey)) {
        const handler = new CircuitBreakerHandler(config);
        this.recoveryManager.registerHandler(handler);
        CircuitBreakerDecorator.circuitStates.set(circuitKey, handler);
      }

      const circuitHandler = CircuitBreakerDecorator.circuitStates.get(circuitKey)!;

      const metadata = this.createMetadata("CircuitBreaker", "method", propertyKey, {
        circuitBreaker: config,
      });
      DecoratorMetadataStore.setMetadata(target as object, propertyKey, metadata);

      const errorFactory = this.errorFactory;
      const transformError = this.transformError.bind(this);

      descriptor.value = async function (this: unknown, ...args: unknown[]): Promise<unknown> {
        const canExecute = circuitHandler.canRecover(errorFactory.create("Circuit check", "CIRCUIT_CHECK"));

        if (!canExecute) {
          throw config.openCircuitError?.() || errorFactory.create("Circuit breaker is open", "CIRCUIT_BREAKER_OPEN");
        }

        try {
          const result = await originalMethod.apply(this, args);
          circuitHandler.recordSuccess();
          return result;
        } catch (error) {
          const axonError = transformError(error as Error, config.errorTransformer);
          await circuitHandler.recover(axonError);
          throw error;
        }
      };

      if (config.preserveMetadata !== false) {
        Object.defineProperty(descriptor.value, "name", { value: originalMethod.name });
        Object.defineProperty(descriptor.value, "length", { value: originalMethod.length });
      }

      return descriptor;
    };
  }
}

/**
 * Timeout decorator implementation
 */
export class TimeoutDecorator extends BaseRecoveryDecorator {
  static create(
    config: ITimeoutConfig & Partial<IMethodDecoratorConfig> = {
      timeout: 5000,
    } as ITimeoutConfig & Partial<IMethodDecoratorConfig>,
  ) {
    const decorator = new TimeoutDecorator();
    return decorator.createDecorator(config);
  }

  private createDecorator(config: ITimeoutConfig & Partial<IMethodDecoratorConfig>) {
    return (target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor => {
      const originalMethod = descriptor.value;
      if (typeof originalMethod !== "function") {
        throw this.errorFactory.create("@Timeout can only be applied to methods", "INVALID_DECORATOR_TARGET");
      }

      const metadata = this.createMetadata("Timeout", "method", propertyKey, { timeout: config });
      DecoratorMetadataStore.setMetadata(target as object, propertyKey, metadata);

      descriptor.value = async function (this: unknown, ...args: unknown[]): Promise<unknown> {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            const timeoutError =
              config.timeoutErrorFactory?.(config.timeout, originalMethod.name) ||
              new Error(`Operation timed out after ${config.timeout}ms`);
            reject(timeoutError);
          }, config.timeout);
        });

        const operationPromise = originalMethod.apply(this, args);
        return Promise.race([operationPromise, timeoutPromise]);
      };

      if (config.preserveMetadata !== false) {
        Object.defineProperty(descriptor.value, "name", { value: originalMethod.name });
        Object.defineProperty(descriptor.value, "length", { value: originalMethod.length });
      }

      return descriptor;
    };
  }
}

/**
 * Graceful degradation decorator implementation
 */
export class GracefulDegradationDecorator extends BaseRecoveryDecorator {
  static create(config: IGracefulDegradationConfig & Partial<IMethodDecoratorConfig> = {}) {
    const decorator = new GracefulDegradationDecorator();
    return decorator.createDecorator(config);
  }

  private createDecorator(config: IGracefulDegradationConfig & Partial<IMethodDecoratorConfig>) {
    return (target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor => {
      const originalMethod = descriptor.value;
      if (typeof originalMethod !== "function") {
        throw this.errorFactory.create(
          "@GracefulDegradation can only be applied to methods",
          "INVALID_DECORATOR_TARGET",
        );
      }

      const metadata = this.createMetadata("GracefulDegradation", "method", propertyKey, {
        gracefulDegradation: config,
      });
      DecoratorMetadataStore.setMetadata(target as object, propertyKey, metadata);

      const transformError = this.transformError.bind(this);
      const createRecoveryContext = this.createRecoveryContext.bind(this);

      descriptor.value = async function (this: unknown, ...args: unknown[]): Promise<unknown> {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          const axonError = transformError(error as Error, config.errorTransformer);

          if (config.fallbackFunction) {
            try {
              const recoveryContext = createRecoveryContext(this, originalMethod.name, args, config);
              return await config.fallbackFunction(axonError, recoveryContext);
            } catch {
              // Continue to other fallbacks
            }
          }

          if (config.fallbackChain) {
            for (const fallback of config.fallbackChain) {
              if (fallback.condition(axonError)) {
                try {
                  const recoveryContext = createRecoveryContext(this, originalMethod.name, args, config);
                  return await fallback.fallback(axonError, recoveryContext);
                } catch {
                  continue;
                }
              }
            }
          }

          if (config.defaultValue !== undefined) {
            return config.defaultValue;
          }

          throw error;
        }
      };

      if (config.preserveMetadata !== false) {
        Object.defineProperty(descriptor.value, "name", { value: originalMethod.name });
        Object.defineProperty(descriptor.value, "length", { value: originalMethod.length });
      }

      return descriptor;
    };
  }
}

/**
 * Composite recovery decorator combining multiple strategies
 */
export class RecoveryDecorator extends BaseRecoveryDecorator {
  static create(config: IOperationRecoveryConfig & Partial<IMethodDecoratorConfig> = {}) {
    const decorator = new RecoveryDecorator();
    return decorator.createDecorator(config);
  }

  private createDecorator(config: IOperationRecoveryConfig & Partial<IMethodDecoratorConfig>) {
    return (target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor => {
      const originalMethod = descriptor.value;
      if (typeof originalMethod !== "function") {
        throw this.errorFactory.create("@Recovery can only be applied to methods", "INVALID_DECORATOR_TARGET");
      }

      // Register all configured handlers
      if (config.retry) {
        this.recoveryManager.registerHandler(new RetryHandler(config.retry));
      }
      if (config.circuitBreaker) {
        this.recoveryManager.registerHandler(new CircuitBreakerHandler(config.circuitBreaker));
      }
      if (config.timeout) {
        this.recoveryManager.registerHandler(new TimeoutHandler(config.timeout));
      }
      if (config.gracefulDegradation) {
        this.recoveryManager.registerHandler(new GracefulDegradationHandler(config.gracefulDegradation));
      }

      const metadata = this.createMetadata("Recovery", "method", propertyKey, config);
      DecoratorMetadataStore.setMetadata(target as object, propertyKey, metadata);

      const recoveryManager = this.recoveryManager;

      descriptor.value = async function (this: unknown, ...args: unknown[]): Promise<unknown> {
        const operation: IRecoverableOperation = {
          id: DecoratorPerformanceUtils.generateId(),
          name: originalMethod.name || "anonymous",
          operation: async () => originalMethod.apply(this, args),
          recoveryConfig: config,
          ...(config.methodTimeout && { timeout: config.methodTimeout }),
          metadata: {
            target: (this as { constructor: { name: string } }).constructor.name,
            method: originalMethod.name,
            args: args.length,
          },
        };

        return await recoveryManager.executeWithRecovery(operation);
      };

      if (config.preserveMetadata !== false) {
        Object.defineProperty(descriptor.value, "name", { value: originalMethod.name });
        Object.defineProperty(descriptor.value, "length", { value: originalMethod.length });
      }

      return descriptor;
    };
  }
}

/**
 * Decorator utility functions and registry
 */
export class DecoratorUtils implements IDecoratorUtils {
  private errorFactory = new ErrorFactory(ErrorSeverity.ERROR, ErrorCategory.APPLICATION);

  extractMethodMetadata(
    target: unknown,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): Record<string, unknown> {
    return {
      name: String(propertyKey),
      length: descriptor.value?.length || 0,
      isAsync: this.isAsyncMethod(descriptor),
      constructor: (target as { constructor?: { name?: string } })?.constructor?.name || "unknown",
    };
  }

  createRecoveryContext(target: unknown, propertyKey: string | symbol, args: unknown[]): IRecoveryContext {
    return {
      correlationId: DecoratorPerformanceUtils.generateId(),
      timestamp: new Date().toISOString(),
      severity: ErrorSeverity.ERROR,
      category: ErrorCategory.APPLICATION,
      operation: String(propertyKey),
      attemptNumber: 1,
      totalAttempts: 0,
      strategiesAttempted: [],
      recoveryState: RecoveryState.IDLE,
      recoveryStartedAt: new Date(),
      metadata: {
        target: (target as { constructor?: { name?: string } })?.constructor?.name || "unknown",
        args: args.length,
      },
    };
  }

  transformError(error: Error, transformer?: (error: Error) => IBaseAxonError): IBaseAxonError {
    if (transformer) {
      return transformer(error);
    }

    if (error instanceof BaseAxonError) {
      return error;
    }

    return this.errorFactory.createFromError(error);
  }

  isAsyncMethod(descriptor: PropertyDescriptor): boolean {
    if (!descriptor.value || typeof descriptor.value !== "function") {
      return false;
    }

    const method = descriptor.value;
    return (
      method.constructor.name === "AsyncFunction" ||
      method[Symbol.toStringTag] === "AsyncFunction" ||
      method.toString().includes("async ") ||
      method.toString().includes("Promise")
    );
  }

  wrapAsAsync<T>(method: (...args: unknown[]) => T): (...args: unknown[]) => Promise<T> {
    return async (...args: unknown[]): Promise<T> => {
      return method(...args);
    };
  }
}

/**
 * Decorator registry for managing interceptors and metadata
 */
export class DecoratorRegistry implements IDecoratorRegistry {
  private interceptors: IDecoratorInterceptor[] = [];
  private metadata = new WeakMap<object, IRecoveryDecoratorMetadata>();

  registerInterceptor(interceptor: IDecoratorInterceptor): void {
    this.interceptors.push(interceptor);
    this.interceptors.sort((a, b) => a.priority - b.priority);
  }

  unregisterInterceptor(name: string): boolean {
    const index = this.interceptors.findIndex((i) => i.name === name);
    if (index >= 0) {
      this.interceptors.splice(index, 1);
      return true;
    }
    return false;
  }

  getInterceptors(): ReadonlyArray<IDecoratorInterceptor> {
    return Object.freeze([...this.interceptors]);
  }

  registerMetadata(target: unknown, metadata: IRecoveryDecoratorMetadata): void {
    this.metadata.set(target as object, metadata);
  }

  getMetadata(target: unknown): IRecoveryDecoratorMetadata | undefined {
    return this.metadata.get(target as object);
  }

  clearMetadata(): void {
    this.metadata = new WeakMap();
  }
}

/**
 * Configuration validator for decorator configurations
 */
export class DecoratorConfigValidator implements IDecoratorConfigValidator {
  private errors: string[] = [];

  validateMethodConfig(config: IMethodDecoratorConfig): boolean {
    this.errors = [];

    if (config.methodTimeout && config.methodTimeout <= 0) {
      this.errors.push("methodTimeout must be positive");
    }

    if (config.retry) {
      if (config.retry.maxAttempts <= 0) {
        this.errors.push("retry.maxAttempts must be positive");
      }
      if (config.retry.initialDelay <= 0) {
        this.errors.push("retry.initialDelay must be positive");
      }
    }

    if (config.circuitBreaker) {
      if (config.circuitBreaker.failureThreshold <= 0) {
        this.errors.push("circuitBreaker.failureThreshold must be positive");
      }
      if (config.circuitBreaker.resetTimeout <= 0) {
        this.errors.push("circuitBreaker.resetTimeout must be positive");
      }
    }

    return this.errors.length === 0;
  }

  validateClassConfig(config: IClassDecoratorConfig): boolean {
    this.errors = [];

    if (config.methodOverrides) {
      for (const [method, methodConfig] of Object.entries(config.methodOverrides)) {
        if (!this.validateMethodConfig(methodConfig)) {
          this.errors.push(`Invalid configuration for method ${method}`);
        }
      }
    }

    return this.errors.length === 0;
  }

  validatePropertyConfig(config: IPropertyDecoratorConfig): boolean {
    this.errors = [];

    if (config.cacheTTL && config.cacheTTL <= 0) {
      this.errors.push("cacheTTL must be positive");
    }

    return this.errors.length === 0;
  }

  validateParameterConfig(config: IParameterDecoratorConfig): boolean {
    this.errors = [];

    if (!config.validator && config.defaultValue === undefined) {
      this.errors.push("Either validator or defaultValue must be provided");
    }

    return this.errors.length === 0;
  }

  getValidationErrors(): string[] {
    return [...this.errors];
  }
}

// Export convenient decorator factory functions (camelCase for ESLint)
export const retry = RetryDecorator.create;
export const circuitBreaker = CircuitBreakerDecorator.create;
export const timeout = TimeoutDecorator.create;
export const gracefulDegradation = GracefulDegradationDecorator.create;
export const recovery = RecoveryDecorator.create;

// Also export with capital letters for backwards compatibility
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Retry = RetryDecorator.create;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const CircuitBreaker = CircuitBreakerDecorator.create;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Timeout = TimeoutDecorator.create;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const GracefulDegradation = GracefulDegradationDecorator.create;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Recovery = RecoveryDecorator.create;

// Export utility classes
export const decoratorUtils = new DecoratorUtils();
export const decoratorRegistry = new DecoratorRegistry();
export const decoratorConfigValidator = new DecoratorConfigValidator();
