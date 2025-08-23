/**
 * Decorator type definitions for recovery mechanisms
 */

import type { IBaseAxonError } from "../base/base-error.types.js";
import type { IOperationRecoveryConfig, IRecoveryContext, IRecoveryResult } from "../recovery/recovery.types.js";

/**
 * Decorator target types
 */
export type DecoratorTarget = "method" | "class" | "property" | "parameter" | "accessor";

/**
 * Method signature types for decoration
 */
export type MethodSignature<TArgs extends unknown[] = unknown[], TReturn = unknown> = (
  ...args: TArgs
) => TReturn | Promise<TReturn>;

/**
 * Async method signature types
 */
export type AsyncMethodSignature<TArgs extends unknown[] = unknown[], TReturn = unknown> = (
  ...args: TArgs
) => Promise<TReturn>;

/**
 * Recovery decorator metadata
 */
export interface IRecoveryDecoratorMetadata {
  /** Decorator name/identifier */
  name: string;
  /** Target type being decorated */
  target: DecoratorTarget;
  /** Original method name */
  methodName?: string;
  /** Recovery configuration */
  config: IOperationRecoveryConfig;
  /** Creation timestamp */
  createdAt: Date;
  /** Applied by (package/library name) */
  appliedBy?: string;
  /** Decorator version */
  version?: string;
}

/**
 * Method decorator configuration
 */
export interface IMethodDecoratorConfig extends IOperationRecoveryConfig {
  /** Whether to preserve original method metadata */
  preserveMetadata?: boolean;
  /** Custom error transformation function */
  errorTransformer?: (error: Error) => IBaseAxonError;
  /** Custom context provider */
  contextProvider?: (...args: unknown[]) => Partial<IRecoveryContext>;
  /** Method timeout (overrides recovery timeout) */
  methodTimeout?: number;
  /** Whether to wrap synchronous methods as async */
  forceAsync?: boolean;
  /** Custom method name for logging */
  loggerName?: string;
}

/**
 * Class decorator configuration
 */
export interface IClassDecoratorConfig {
  /** Default recovery configuration for all methods */
  defaultRecovery?: IOperationRecoveryConfig;
  /** Method-specific recovery configurations */
  methodOverrides?: Record<string, IMethodDecoratorConfig>;
  /** Methods to exclude from decoration */
  excludeMethods?: string[];
  /** Methods to include (if specified, only these are decorated) */
  includeMethods?: string[];
  /** Whether to preserve original class metadata */
  preserveMetadata?: boolean;
  /** Class-level error transformer */
  errorTransformer?: (error: Error, methodName: string) => IBaseAxonError;
  /** Class-level context provider */
  contextProvider?: (methodName: string, ...args: unknown[]) => Partial<IRecoveryContext>;
}

/**
 * Property decorator configuration for recoverable properties
 */
export interface IPropertyDecoratorConfig {
  /** Recovery configuration for property access */
  getterRecovery?: IOperationRecoveryConfig;
  /** Recovery configuration for property assignment */
  setterRecovery?: IOperationRecoveryConfig;
  /** Default value if recovery fails */
  defaultValue?: unknown;
  /** Whether to cache successful values */
  enableCaching?: boolean;
  /** Cache TTL in milliseconds */
  cacheTTL?: number;
  /** Custom error transformer */
  errorTransformer?: (error: Error, operation: "get" | "set") => IBaseAxonError;
}

/**
 * Parameter decorator configuration
 */
export interface IParameterDecoratorConfig {
  /** Parameter validation function */
  validator?: (value: unknown) => boolean | Promise<boolean>;
  /** Recovery configuration for validation failures */
  validationRecovery?: IOperationRecoveryConfig;
  /** Default value if validation fails */
  defaultValue?: unknown;
  /** Custom error transformer for validation failures */
  errorTransformer?: (error: Error, value: unknown) => IBaseAxonError;
}

/**
 * Decorator factory function signature
 */
export type DecoratorFactory<TConfig = unknown> = (
  config?: TConfig,
) => MethodDecorator | ClassDecorator | PropertyDecorator | ParameterDecorator;

/**
 * Method decorator factory signature
 */
export type MethodDecoratorFactory = (config?: IMethodDecoratorConfig) => MethodDecorator;

/**
 * Class decorator factory signature
 */
export type ClassDecoratorFactory = (config?: IClassDecoratorConfig) => ClassDecorator;

/**
 * Property decorator factory signature
 */
export type PropertyDecoratorFactory = (config?: IPropertyDecoratorConfig) => PropertyDecorator;

/**
 * Parameter decorator factory signature
 */
export type ParameterDecoratorFactory = (config?: IParameterDecoratorConfig) => ParameterDecorator;

/**
 * Decorator execution context
 */
export interface IDecoratorExecutionContext {
  /** Target object instance */
  target: unknown;
  /** Method/property name */
  propertyKey?: string | symbol;
  /** Method descriptor */
  descriptor?: PropertyDescriptor;
  /** Method arguments */
  args?: unknown[];
  /** Recovery metadata */
  metadata: IRecoveryDecoratorMetadata;
  /** Recovery context */
  recoveryContext?: IRecoveryContext;
}

/**
 * Decorator execution result
 */
export interface IDecoratorExecutionResult<T = unknown> {
  /** Execution success */
  success: boolean;
  /** Result value */
  value?: T;
  /** Execution error */
  error?: IBaseAxonError;
  /** Recovery result if recovery was attempted */
  recoveryResult?: IRecoveryResult;
  /** Execution duration in milliseconds */
  duration: number;
  /** Whether result came from recovery */
  fromRecovery: boolean;
}

/**
 * Decorator interceptor interface
 */
export interface IDecoratorInterceptor {
  /** Interceptor name */
  name: string;
  /** Interceptor priority (lower = higher priority) */
  priority: number;
  /** Before method execution */
  before?(context: IDecoratorExecutionContext): Promise<void> | void;
  /** After method execution */
  after?(context: IDecoratorExecutionContext, result: IDecoratorExecutionResult): Promise<void> | void;
  /** On error during execution */
  onError?(context: IDecoratorExecutionContext, error: IBaseAxonError): Promise<void> | void;
  /** On recovery attempt */
  onRecovery?(context: IDecoratorExecutionContext, recoveryResult: IRecoveryResult): Promise<void> | void;
}

/**
 * Decorator registry interface
 */
export interface IDecoratorRegistry {
  /** Register a decorator interceptor */
  registerInterceptor(interceptor: IDecoratorInterceptor): void;
  /** Unregister a decorator interceptor */
  unregisterInterceptor(name: string): boolean;
  /** Get all registered interceptors */
  getInterceptors(): ReadonlyArray<IDecoratorInterceptor>;
  /** Register decorator metadata */
  registerMetadata(target: unknown, metadata: IRecoveryDecoratorMetadata): void;
  /** Get decorator metadata for target */
  getMetadata(target: unknown): IRecoveryDecoratorMetadata | undefined;
  /** Clear all metadata */
  clearMetadata(): void;
}

/**
 * Decorator utilities interface
 */
export interface IDecoratorUtils {
  /** Extract method metadata */
  extractMethodMetadata(
    target: unknown,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): Record<string, unknown>;
  /** Create recovery context from method call */
  createRecoveryContext(target: unknown, propertyKey: string | symbol, args: unknown[]): IRecoveryContext;
  /** Transform error using configured transformer */
  transformError(error: Error, transformer?: (error: Error) => IBaseAxonError): IBaseAxonError;
  /** Check if method is async */
  isAsyncMethod(descriptor: PropertyDescriptor): boolean;
  /** Wrap synchronous method as async */
  wrapAsAsync<T>(method: (...args: unknown[]) => T): (...args: unknown[]) => Promise<T>;
}

/**
 * Decorator configuration validator interface
 */
export interface IDecoratorConfigValidator {
  /** Validate method decorator configuration */
  validateMethodConfig(config: IMethodDecoratorConfig): boolean;
  /** Validate class decorator configuration */
  validateClassConfig(config: IClassDecoratorConfig): boolean;
  /** Validate property decorator configuration */
  validatePropertyConfig(config: IPropertyDecoratorConfig): boolean;
  /** Validate parameter decorator configuration */
  validateParameterConfig(config: IParameterDecoratorConfig): boolean;
  /** Get validation errors */
  getValidationErrors(): string[];
}
