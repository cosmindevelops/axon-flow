/**
 * Base error type definitions and interfaces
 */

import type { CorrelationId } from "@axon/types";

/**
 * Error severity levels for categorization and handling
 */
export enum ErrorSeverity {
  CRITICAL = "critical", // System-breaking errors requiring immediate action
  ERROR = "error", // Standard errors affecting functionality
  WARNING = "warning", // Degraded but functional states
  INFO = "info", // Informational errors for debugging
}

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  SYSTEM = "system", // Infrastructure and platform errors
  APPLICATION = "application", // Business logic errors
  VALIDATION = "validation", // Input/schema validation errors
  CONFIGURATION = "configuration", // Configuration issues
  NETWORK = "network", // Communication failures
  SECURITY = "security", // Auth/authorization failures
  UNKNOWN = "unknown", // Uncategorized errors
}

/**
 * Enhanced error context with comprehensive metadata
 */
export interface IEnhancedErrorContext {
  correlationId?: CorrelationId;
  timestamp: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  component?: string;
  operation?: string;
  stackTrace?: string;
  metadata?: Record<string, unknown>;
  environment?: {
    platform: "node" | "browser" | "unknown";
    version?: string;
    userAgent?: string;
  };
}

/**
 * Error code structure for standardized error identification
 */
export interface IErrorCode {
  domain: string; // e.g., "AUTH", "API", "DB"
  category: string; // e.g., "VALIDATION", "NETWORK"
  specific: string; // e.g., "TOKEN_EXPIRED", "CONNECTION_TIMEOUT"
  numeric?: number; // Optional numeric code for legacy systems
}

/**
 * Serializable error format for network transmission
 */
export interface ISerializedError {
  name: string;
  message: string;
  code: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  context: IEnhancedErrorContext;
  stack?: string;
  cause?: ISerializedError;
  errors?: ISerializedError[]; // For aggregate errors
  timestamp: string;
  version: string; // Serialization format version
}

/**
 * Error handler interface for chain of responsibility pattern
 */
export interface IErrorHandler {
  next?: IErrorHandler;
  setNext(handler: IErrorHandler): IErrorHandler;
  handle(error: IBaseAxonError): void;
}

/**
 * Base error interface with all required capabilities
 */
export interface IBaseAxonError extends Error {
  readonly code: string;
  readonly severity: ErrorSeverity;
  readonly category: ErrorCategory;
  readonly context: IEnhancedErrorContext;
  readonly createdAt: Date;
  readonly cause?: Error | IBaseAxonError;

  // Methods
  toJSON(): ISerializedError;
  toString(): string;
  withContext(context: Partial<IEnhancedErrorContext>): IBaseAxonError;
  withCause(cause: Error | IBaseAxonError): IBaseAxonError;
  getFullStack(): string;
}

/**
 * Chainable error interface for accumulating context
 */
export interface IChainableError extends IBaseAxonError {
  chain(handler: IErrorHandler): IChainableError;
  process(): void;
}

/**
 * Aggregate error interface for multiple errors
 */
export interface IAggregateError extends IBaseAxonError {
  readonly errors: ReadonlyArray<Error | IBaseAxonError>;
  addError(error: Error | IBaseAxonError): void;
  hasErrors(): boolean;
  getErrorCount(): number;
}

/**
 * Error factory interface for creating errors
 */
export interface IErrorFactory {
  create(message: string, code: string, options?: Partial<IEnhancedErrorContext>): IBaseAxonError;

  createFromError(error: Error, code?: string, options?: Partial<IEnhancedErrorContext>): IBaseAxonError;

  createAggregate(message: string, errors: Array<Error | IBaseAxonError>): IAggregateError;
}

/**
 * Enhanced error factory interface with domain-specific methods and type inference
 */
export interface IEnhancedErrorFactory extends IErrorFactory {
  // System domain factory methods
  createSystemError(options: {
    message: string;
    code?: string;
    systemComponent?: string;
    resourceType?: string;
    resourceId?: string;
    context?: Partial<IEnhancedErrorContext>;
  }): IBaseAxonError;

  // Application domain factory methods
  createApplicationError(options: {
    message: string;
    code?: string;
    module?: string;
    operation?: string;
    businessRule?: string;
    context?: Partial<IEnhancedErrorContext>;
  }): IBaseAxonError;

  // Validation domain factory methods
  createValidationError(options: {
    message: string;
    code?: string;
    field?: string;
    value?: unknown;
    constraint?: string;
    validationErrors?: Array<{
      field: string;
      message: string;
      constraint: string;
    }>;
    context?: Partial<IEnhancedErrorContext>;
  }): IBaseAxonError;

  // Network domain factory methods
  createNetworkError(options: {
    message: string;
    code?: string;
    url?: string;
    method?: string;
    statusCode?: number;
    timeout?: number;
    retryCount?: number;
    context?: Partial<IEnhancedErrorContext>;
  }): IBaseAxonError;

  // Security domain factory methods
  createSecurityError(options: {
    message: string;
    code?: string;
    userId?: string;
    resource?: string;
    action?: string;
    reason?: string;
    context?: Partial<IEnhancedErrorContext>;
  }): IBaseAxonError;

  // Authentication domain factory methods
  createAuthenticationError(options: {
    message: string;
    code?: string;
    userId?: string;
    authenticationType?: "jwt" | "oauth" | "session" | "api-key";
    authenticationStep?: "login" | "token-validation" | "refresh" | "logout";
    clientId?: string;
    ipAddress?: string;
    context?: Partial<IEnhancedErrorContext>;
  }): IBaseAxonError;

  // Builder pattern support
  builder(): IErrorFactoryBuilder;
}

/**
 * Domain-specific error factory interface for specialized error creation
 */
export interface IDomainErrorFactory<T extends string = string> {
  readonly domain: T;
  create(options: {
    message: string;
    code?: string;
    context?: Partial<IEnhancedErrorContext>;
    domainSpecific?: Record<string, unknown>;
  }): IBaseAxonError;
  createFromError(
    error: Error,
    options?: {
      code?: string;
      context?: Partial<IEnhancedErrorContext>;
      domainSpecific?: Record<string, unknown>;
    },
  ): IBaseAxonError;
  withDefaults(defaults: {
    severity?: ErrorSeverity;
    category?: ErrorCategory;
    context?: Partial<IEnhancedErrorContext>;
  }): IDomainErrorFactory<T>;
}

/**
 * Error factory builder interface for fluent error creation
 */
export interface IErrorFactoryBuilder {
  message(message: string): IErrorFactoryBuilder;
  code(code: string): IErrorFactoryBuilder;
  severity(severity: ErrorSeverity): IErrorFactoryBuilder;
  category(category: ErrorCategory): IErrorFactoryBuilder;
  cause(cause: Error | IBaseAxonError): IErrorFactoryBuilder;
  context(context: Partial<IEnhancedErrorContext>): IErrorFactoryBuilder;
  correlationId(id: string): IErrorFactoryBuilder;
  component(component: string): IErrorFactoryBuilder;
  operation(operation: string): IErrorFactoryBuilder;
  metadata(key: string, value: unknown): IErrorFactoryBuilder;
  addMetadata(metadata: Record<string, unknown>): IErrorFactoryBuilder;

  // Domain-specific builders
  systemError(): ISystemErrorBuilder;
  applicationError(): IApplicationErrorBuilder;
  validationError(): IValidationErrorBuilder;
  networkError(): INetworkErrorBuilder;
  securityError(): ISecurityErrorBuilder;
  authenticationError(): IAuthenticationErrorBuilder;

  // Terminal methods
  build(): IBaseAxonError;
  throw(): never;
}

/**
 * System error builder interface
 */
export interface ISystemErrorBuilder extends IErrorFactoryBuilder {
  systemComponent(component: string): ISystemErrorBuilder;
  resourceType(type: string): ISystemErrorBuilder;
  resourceId(id: string): ISystemErrorBuilder;
  build(): IBaseAxonError;
}

/**
 * Application error builder interface
 */
export interface IApplicationErrorBuilder extends IErrorFactoryBuilder {
  module(module: string): IApplicationErrorBuilder;
  operation(operation: string): IApplicationErrorBuilder;
  businessRule(rule: string): IApplicationErrorBuilder;
  build(): IBaseAxonError;
}

/**
 * Validation error builder interface
 */
export interface IValidationErrorBuilder extends IErrorFactoryBuilder {
  field(field: string): IValidationErrorBuilder;
  value(value: unknown): IValidationErrorBuilder;
  constraint(constraint: string): IValidationErrorBuilder;
  addValidationError(field: string, message: string, constraint: string): IValidationErrorBuilder;
  build(): IBaseAxonError;
}

/**
 * Network error builder interface
 */
export interface INetworkErrorBuilder extends IErrorFactoryBuilder {
  url(url: string): INetworkErrorBuilder;
  method(method: string): INetworkErrorBuilder;
  statusCode(code: number): INetworkErrorBuilder;
  timeout(timeout: number): INetworkErrorBuilder;
  retryCount(count: number): INetworkErrorBuilder;
  build(): IBaseAxonError;
}

/**
 * Security error builder interface
 */
export interface ISecurityErrorBuilder extends IErrorFactoryBuilder {
  userId(id: string): ISecurityErrorBuilder;
  resource(resource: string): ISecurityErrorBuilder;
  action(action: string): ISecurityErrorBuilder;
  reason(reason: string): ISecurityErrorBuilder;
  build(): IBaseAxonError;
}

/**
 * Authentication error builder interface
 */
export interface IAuthenticationErrorBuilder extends ISecurityErrorBuilder {
  authenticationType(type: "jwt" | "oauth" | "session" | "api-key"): IAuthenticationErrorBuilder;
  authenticationStep(step: "login" | "token-validation" | "refresh" | "logout"): IAuthenticationErrorBuilder;
  clientId(id: string): IAuthenticationErrorBuilder;
  ipAddress(ip: string): IAuthenticationErrorBuilder;
  build(): IBaseAxonError;
}

/**
 * Error pool interface for performance optimization
 */
export interface IErrorPool {
  acquire(): IBaseAxonError;
  release(error: IBaseAxonError): void;
  clear(): void;
  getSize(): number;
  getAvailable(): number;
}

/**
 * Configuration for error system
 */
export interface IErrorSystemConfig {
  enablePooling?: boolean;
  poolSize?: number;
  enableStackTrace?: boolean;
  maxStackDepth?: number;
  defaultSeverity?: ErrorSeverity;
  defaultCategory?: ErrorCategory;
  enableCorrelation?: boolean;
  enableLocalization?: boolean;
  locale?: string;
}

/**
 * Error metrics for monitoring
 */
export interface IErrorMetrics {
  totalErrors: number;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorsByCategory: Record<ErrorCategory, number>;
  averageCreationTime: number;
  poolHitRate?: number;
}
