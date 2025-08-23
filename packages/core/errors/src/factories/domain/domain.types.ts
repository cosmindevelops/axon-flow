/**
 * Domain-specific error factory type definitions with advanced type inference
 */

import type {
  IBaseAxonError,
  IEnhancedErrorContext,
  IErrorFactory,
  ErrorSeverity,
  ErrorCategory,
} from "../../base/base-error.types.js";
import type {
  ISystemError,
  IApplicationError,
  IValidationError,
  IConfigurationError,
  INetworkError,
  ISecurityError,
  IDatabaseError,
  IFileSystemError,
  IIntegrationError,
  ITimeoutError,
  IRateLimitError,
  INotFoundError,
  IConflictError,
  IPermissionError,
  SecurityErrorReason,
  DatabaseOperation,
  FileOperation,
  ConflictType,
} from "../../categories/categories.types.js";

/**
 * Authentication-specific error interface
 */
export interface IAuthenticationError extends ISecurityError {
  readonly authenticationType?: "jwt" | "oauth" | "session" | "api-key";
  readonly authenticationStep?: "login" | "token-validation" | "refresh" | "logout";
  readonly clientId?: string;
  readonly ipAddress?: string;
}

/**
 * Domain error type mapping for type inference
 */
export interface IDomainErrorTypes {
  system: ISystemError;
  application: IApplicationError;
  validation: IValidationError;
  configuration: IConfigurationError;
  network: INetworkError;
  security: ISecurityError;
  authentication: IAuthenticationError;
  database: IDatabaseError;
  filesystem: IFileSystemError;
  integration: IIntegrationError;
  timeout: ITimeoutError;
  ratelimit: IRateLimitError;
  notfound: INotFoundError;
  conflict: IConflictError;
  permission: IPermissionError;
}

/**
 * Extract domain keys from the domain error types
 */
export type DomainKey = keyof IDomainErrorTypes;

/**
 * Extract error interface type for a given domain
 */
export type DomainErrorType<T extends DomainKey> = IDomainErrorTypes[T];

/**
 * Template literal type for dynamic error code generation
 */
export type ErrorCode<
  TDomain extends string,
  TCategory extends string,
  TSpecific extends string,
> = `${Uppercase<TDomain>}_${Uppercase<TCategory>}_${Uppercase<TSpecific>}`;

/**
 * Predefined error code patterns for common domains
 */
export type SystemErrorCode = ErrorCode<"SYSTEM", string, string>;
export type AuthErrorCode = ErrorCode<"AUTH", string, string>;
export type ValidationErrorCode = ErrorCode<"VALIDATION", string, string>;
export type NetworkErrorCode = ErrorCode<"NETWORK", string, string>;
export type DatabaseErrorCode = ErrorCode<"DATABASE", string, string>;

/**
 * Generic error creation options with type safety
 */
export interface IErrorCreationOptions<T extends IBaseAxonError = IBaseAxonError> {
  message: string;
  code?: string;
  severity?: ErrorSeverity;
  category?: ErrorCategory;
  context?: Partial<IEnhancedErrorContext>;
  cause?: Error | IBaseAxonError;
  domainSpecific?: Partial<Omit<T, keyof IBaseAxonError>>;
}

/**
 * Domain-specific context type mapping
 */
export interface IDomainContextTypes {
  system: {
    systemComponent?: string;
    resourceType?: string;
    resourceId?: string;
  };
  application: {
    module?: string;
    operation?: string;
    businessRule?: string;
  };
  validation: {
    field?: string;
    value?: unknown;
    constraint?: string;
    validationErrors?: Array<{
      field: string;
      message: string;
      constraint: string;
    }>;
  };
  configuration: {
    configKey?: string;
    configValue?: unknown;
    expectedType?: string;
    configSource?: string;
  };
  network: {
    url?: string;
    method?: string;
    statusCode?: number;
    timeout?: number;
    retryCount?: number;
  };
  security: {
    userId?: string;
    resource?: string;
    action?: string;
    reason?: SecurityErrorReason;
  };
  authentication: {
    authenticationType?: "jwt" | "oauth" | "session" | "api-key";
    authenticationStep?: "login" | "token-validation" | "refresh" | "logout";
    clientId?: string;
    ipAddress?: string;
    userId?: string;
    resource?: string;
    action?: string;
    reason?: SecurityErrorReason;
  };
  database: {
    query?: string;
    table?: string;
    operation?: DatabaseOperation;
    constraint?: string;
    affectedRows?: number;
  };
  filesystem: {
    path?: string;
    operation?: FileOperation;
    permissions?: string;
    diskSpace?: number;
  };
  integration: {
    service?: string;
    endpoint?: string;
    request?: unknown;
    response?: unknown;
    retryable?: boolean;
  };
  timeout: {
    operation?: string;
    timeout?: number;
    elapsed?: number;
  };
  ratelimit: {
    limit?: number;
    remaining?: number;
    resetAt?: Date;
    resource?: string;
  };
  notfound: {
    resourceType?: string;
    resourceId?: string;
    searchCriteria?: Record<string, unknown>;
  };
  conflict: {
    conflictType?: ConflictType;
    existingValue?: unknown;
    attemptedValue?: unknown;
    resourceId?: string;
  };
  permission: {
    requiredPermission?: string;
    actualPermissions?: string[];
    resource?: string;
    action?: string;
  };
}

/**
 * Extract domain context type for a given domain
 */
export type DomainContextType<T extends DomainKey> = IDomainContextTypes[T];

/**
 * Type-safe error creation options for specific domains
 */
export type DomainErrorCreationOptions<T extends DomainKey> = IErrorCreationOptions<DomainErrorType<T>> & {
  domainContext?: DomainContextType<T>;
};

/**
 * Enhanced error factory interface with domain-specific methods
 */
export interface IEnhancedErrorFactory extends IErrorFactory {
  // Core factory methods with type inference
  createDomainError<T extends DomainKey>(domain: T, options: DomainErrorCreationOptions<T>): DomainErrorType<T>;

  // Specialized domain factories with type safety
  createSystemError(options: DomainErrorCreationOptions<"system">): ISystemError;
  createApplicationError(options: DomainErrorCreationOptions<"application">): IApplicationError;
  createValidationError(options: DomainErrorCreationOptions<"validation">): IValidationError;
  createConfigurationError(options: DomainErrorCreationOptions<"configuration">): IConfigurationError;
  createNetworkError(options: DomainErrorCreationOptions<"network">): INetworkError;
  createSecurityError(options: DomainErrorCreationOptions<"security">): ISecurityError;
  createAuthenticationError(options: DomainErrorCreationOptions<"authentication">): IAuthenticationError;
  createDatabaseError(options: DomainErrorCreationOptions<"database">): IDatabaseError;
  createFileSystemError(options: DomainErrorCreationOptions<"filesystem">): IFileSystemError;
  createIntegrationError(options: DomainErrorCreationOptions<"integration">): IIntegrationError;
  createTimeoutError(options: DomainErrorCreationOptions<"timeout">): ITimeoutError;
  createRateLimitError(options: DomainErrorCreationOptions<"ratelimit">): IRateLimitError;
  createNotFoundError(options: DomainErrorCreationOptions<"notfound">): INotFoundError;
  createConflictError(options: DomainErrorCreationOptions<"conflict">): IConflictError;
  createPermissionError(options: DomainErrorCreationOptions<"permission">): IPermissionError;

  // Builder pattern support
  builder(): IErrorFactoryBuilder;
}

/**
 * Specialized error factory for specific domains
 */
export interface ISpecializedErrorFactory<T extends DomainKey> {
  readonly domain: T;
  create(options: DomainErrorCreationOptions<T>): DomainErrorType<T>;
  createFromError(error: Error, options?: Partial<DomainErrorCreationOptions<T>>): DomainErrorType<T>;
  withDefaults(defaults: Partial<DomainErrorCreationOptions<T>>): ISpecializedErrorFactory<T>;
}

/**
 * Factory builder interface for fluent error creation
 */
export interface IErrorFactoryBuilder {
  // Domain selection with type inference
  domain<T extends DomainKey>(domain: T): IDomainErrorBuilder<T>;

  // Direct methods for common cases
  system(): IDomainErrorBuilder<"system">;
  application(): IDomainErrorBuilder<"application">;
  validation(): IDomainErrorBuilder<"validation">;
  configuration(): IDomainErrorBuilder<"configuration">;
  network(): IDomainErrorBuilder<"network">;
  security(): IDomainErrorBuilder<"security">;
  authentication(): IDomainErrorBuilder<"authentication">;
  database(): IDomainErrorBuilder<"database">;
  filesystem(): IDomainErrorBuilder<"filesystem">;
  integration(): IDomainErrorBuilder<"integration">;
  timeout(): IDomainErrorBuilder<"timeout">;
  ratelimit(): IDomainErrorBuilder<"ratelimit">;
  notfound(): IDomainErrorBuilder<"notfound">;
  conflict(): IDomainErrorBuilder<"conflict">;
  permission(): IDomainErrorBuilder<"permission">;
}

/**
 * Domain-specific error builder interface with method chaining
 */
export interface IDomainErrorBuilder<T extends DomainKey> {
  // Core error properties
  message(message: string): IDomainErrorBuilder<T>;
  code(code: string): IDomainErrorBuilder<T>;
  severity(severity: ErrorSeverity): IDomainErrorBuilder<T>;
  category(category: ErrorCategory): IDomainErrorBuilder<T>;
  cause(cause: Error | IBaseAxonError): IDomainErrorBuilder<T>;

  // Context methods
  context(context: Partial<IEnhancedErrorContext>): IDomainErrorBuilder<T>;
  domainContext(context: DomainContextType<T>): IDomainErrorBuilder<T>;
  correlationId(id: string): IDomainErrorBuilder<T>;
  component(component: string): IDomainErrorBuilder<T>;
  operation(operation: string): IDomainErrorBuilder<T>;

  // Metadata methods
  metadata(key: string, value: unknown): IDomainErrorBuilder<T>;
  addMetadata(metadata: Record<string, unknown>): IDomainErrorBuilder<T>;

  // Terminal methods
  build(): DomainErrorType<T>;
  throw(): never;
}

/**
 * Conditional type for factory method selection based on domain
 */
export type FactoryMethod<T extends DomainKey> = T extends "system"
  ? "createSystemError"
  : T extends "application"
    ? "createApplicationError"
    : T extends "validation"
      ? "createValidationError"
      : T extends "configuration"
        ? "createConfigurationError"
        : T extends "network"
          ? "createNetworkError"
          : T extends "security"
            ? "createSecurityError"
            : T extends "authentication"
              ? "createAuthenticationError"
              : T extends "database"
                ? "createDatabaseError"
                : T extends "filesystem"
                  ? "createFileSystemError"
                  : T extends "integration"
                    ? "createIntegrationError"
                    : T extends "timeout"
                      ? "createTimeoutError"
                      : T extends "ratelimit"
                        ? "createRateLimitError"
                        : T extends "notfound"
                          ? "createNotFoundError"
                          : T extends "conflict"
                            ? "createConflictError"
                            : T extends "permission"
                              ? "createPermissionError"
                              : never;

/**
 * Type guard utility types for error identification
 */
export type ErrorTypeGuard<T extends DomainKey> = (error: IBaseAxonError) => error is DomainErrorType<T>;

/**
 * Error type guard mapping for runtime type checking
 */
export interface IErrorTypeGuards {
  isSystemError: ErrorTypeGuard<"system">;
  isApplicationError: ErrorTypeGuard<"application">;
  isValidationError: ErrorTypeGuard<"validation">;
  isConfigurationError: ErrorTypeGuard<"configuration">;
  isNetworkError: ErrorTypeGuard<"network">;
  isSecurityError: ErrorTypeGuard<"security">;
  isAuthenticationError: ErrorTypeGuard<"authentication">;
  isDatabaseError: ErrorTypeGuard<"database">;
  isFileSystemError: ErrorTypeGuard<"filesystem">;
  isIntegrationError: ErrorTypeGuard<"integration">;
  isTimeoutError: ErrorTypeGuard<"timeout">;
  isRateLimitError: ErrorTypeGuard<"ratelimit">;
  isNotFoundError: ErrorTypeGuard<"notfound">;
  isConflictError: ErrorTypeGuard<"conflict">;
  isPermissionError: ErrorTypeGuard<"permission">;
}

/**
 * Utility type for context transformation
 */
export type TransformContext<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K] extends Date ? string : T[K] extends Record<string, unknown> ? TransformContext<T[K]> : T[K];
};

/**
 * Factory configuration interface
 */
export interface IErrorFactoryConfig {
  defaultSeverity?: ErrorSeverity;
  defaultCategory?: ErrorCategory;
  enableStackTrace?: boolean;
  enableCorrelation?: boolean;
  enableObjectPooling?: boolean;
  enableTemplateCache?: boolean;
  enableLazyEvaluation?: boolean;
  maxPoolSize?: number;
  maxCacheSize?: number;
  trackMetrics?: boolean;
  contextTransformer?: (context: Record<string, unknown>) => Record<string, unknown>;
  codeGenerator?: (domain: string, category: string, specific: string) => string;
}

/**
 * Factory registry interface for managing multiple factories
 */
export interface IErrorFactoryRegistry {
  register<T extends DomainKey>(domain: T, factory: ISpecializedErrorFactory<T>): void;
  get<T extends DomainKey>(domain: T): ISpecializedErrorFactory<T> | undefined;
  has(domain: DomainKey): boolean;
  getDomains(): DomainKey[];
  createError<T extends DomainKey>(domain: T, options: DomainErrorCreationOptions<T>): DomainErrorType<T>;
}

/**
 * Factory performance metrics interface
 */
export interface IFactoryMetrics {
  totalCreations: number;
  creationsByDomain: Record<DomainKey, number>;
  averageCreationTime: number;
  builderUsageCount: number;
  cacheHitRate?: number;
}
