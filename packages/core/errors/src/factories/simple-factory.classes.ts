/**
 * Simplified enhanced error factory implementation
 * Focuses on domain-specific methods and basic performance optimizations
 */

import { ErrorFactory } from "../base/base-error.classes.js";
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
} from "../categories/categories.classes.js";
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
  ConflictType,
} from "../categories/categories.types.js";
import { ErrorSeverity, ErrorCategory } from "../base/base-error.types.js";
import type { IEnhancedErrorContext } from "../base/base-error.types.js";

/**
 * Enhanced error factory with domain-specific methods
 * Extends the base ErrorFactory with convenient domain-specific creation methods
 */
export class EnhancedErrorFactory extends ErrorFactory {
  /**
   * Create a system error
   */
  createSystemError(options: {
    message: string;
    code?: string;
    systemComponent?: string;
    resourceType?: string;
    resourceId?: string;
    context?: Partial<IEnhancedErrorContext>;
  }): ISystemError {
    const systemOptions: any = { ...options.context };
    if (options.systemComponent !== undefined) systemOptions.systemComponent = options.systemComponent;
    if (options.resourceType !== undefined) systemOptions.resourceType = options.resourceType;
    if (options.resourceId !== undefined) systemOptions.resourceId = options.resourceId;

    return new SystemError(options.message, options.code || "SYSTEM_ERROR", systemOptions);
  }

  /**
   * Create an application error
   */
  createApplicationError(options: {
    message: string;
    code?: string;
    module?: string;
    operation?: string;
    businessRule?: string;
    context?: Partial<IEnhancedErrorContext>;
  }): IApplicationError {
    const appOptions: any = { ...options.context };
    if (options.module !== undefined) appOptions.module = options.module;
    if (options.operation !== undefined) appOptions.operation = options.operation;
    if (options.businessRule !== undefined) appOptions.businessRule = options.businessRule;

    return new ApplicationError(options.message, options.code || "APPLICATION_ERROR", appOptions);
  }

  /**
   * Create a validation error with Zod integration support
   */
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
  }): IValidationError {
    const validationOptions: any = { ...options.context };
    if (options.field !== undefined) validationOptions.field = options.field;
    if (options.value !== undefined) validationOptions.value = options.value;
    if (options.constraint !== undefined) validationOptions.constraint = options.constraint;
    if (options.validationErrors !== undefined) validationOptions.validationErrors = options.validationErrors;

    return new ValidationError(options.message, options.code || "VALIDATION_ERROR", validationOptions);
  }

  /**
   * Create a configuration error
   */
  createConfigurationError(options: {
    message: string;
    code?: string;
    configKey?: string;
    configValue?: unknown;
    expectedType?: string;
    configSource?: string;
    context?: Partial<IEnhancedErrorContext>;
  }): IConfigurationError {
    const configOptions: any = { ...options.context };
    if (options.configKey !== undefined) configOptions.configKey = options.configKey;
    if (options.configValue !== undefined) configOptions.configValue = options.configValue;
    if (options.expectedType !== undefined) configOptions.expectedType = options.expectedType;
    if (options.configSource !== undefined) configOptions.configSource = options.configSource;

    return new ConfigurationError(options.message, options.code || "CONFIGURATION_ERROR", configOptions);
  }

  /**
   * Create a network error with retry metadata
   */
  createNetworkError(options: {
    message: string;
    code?: string;
    url?: string;
    method?: string;
    statusCode?: number;
    timeout?: number;
    retryCount?: number;
    context?: Partial<IEnhancedErrorContext>;
  }): INetworkError {
    const networkOptions: any = { ...options.context };
    if (options.url !== undefined) networkOptions.url = options.url;
    if (options.method !== undefined) networkOptions.method = options.method;
    if (options.statusCode !== undefined) networkOptions.statusCode = options.statusCode;
    if (options.timeout !== undefined) networkOptions.timeout = options.timeout;
    if (options.retryCount !== undefined) networkOptions.retryCount = options.retryCount;

    return new NetworkError(options.message, options.code || "NETWORK_ERROR", networkOptions);
  }

  /**
   * Create a security error
   */
  createSecurityError(options: {
    message: string;
    code?: string;
    userId?: string;
    resource?: string;
    action?: string;
    context?: Partial<IEnhancedErrorContext>;
  }): ISecurityError {
    const securityOptions: any = { ...options.context };
    if (options.userId !== undefined) securityOptions.userId = options.userId;
    if (options.resource !== undefined) securityOptions.resource = options.resource;
    if (options.action !== undefined) securityOptions.action = options.action;

    return new SecurityError(options.message, options.code || "SECURITY_ERROR", securityOptions);
  }

  /**
   * Create an authentication error with auth context
   */
  createAuthenticationError(options: {
    message: string;
    code?: string;
    userId?: string;
    attemptedAction?: string;
    authMethod?: string;
    failureReason?: string;
    context?: Partial<IEnhancedErrorContext>;
  }): IAuthenticationError {
    const authOptions: any = { ...options.context };
    if (options.userId !== undefined) authOptions.userId = options.userId;
    if (options.attemptedAction !== undefined) authOptions.attemptedAction = options.attemptedAction;
    if (options.authMethod !== undefined) authOptions.authMethod = options.authMethod;
    if (options.failureReason !== undefined) authOptions.failureReason = options.failureReason;

    return new AuthenticationError(options.message, options.code || "AUTHENTICATION_ERROR", authOptions);
  }

  /**
   * Create a database error
   */
  createDatabaseError(options: {
    message: string;
    code?: string;
    query?: string;
    table?: string;
    operation?: string;
    constraint?: string;
    affectedRows?: number;
    context?: Partial<IEnhancedErrorContext>;
  }): IDatabaseError {
    const dbOptions: any = { ...options.context };
    if (options.query !== undefined) dbOptions.query = options.query;
    if (options.table !== undefined) dbOptions.table = options.table;
    if (options.operation !== undefined) dbOptions.operation = options.operation;
    if (options.constraint !== undefined) dbOptions.constraint = options.constraint;
    if (options.affectedRows !== undefined) dbOptions.affectedRows = options.affectedRows;

    return new DatabaseError(options.message, options.code || "DATABASE_ERROR", dbOptions);
  }

  /**
   * Create a file system error
   */
  createFileSystemError(options: {
    message: string;
    code?: string;
    path?: string;
    operation?: string;
    permissions?: string;
    diskSpace?: number;
    context?: Partial<IEnhancedErrorContext>;
  }): IFileSystemError {
    const fsOptions: any = { ...options.context };
    if (options.path !== undefined) fsOptions.path = options.path;
    if (options.operation !== undefined) fsOptions.operation = options.operation;
    if (options.permissions !== undefined) fsOptions.permissions = options.permissions;
    if (options.diskSpace !== undefined) fsOptions.diskSpace = options.diskSpace;

    return new FileSystemError(options.message, options.code || "FILESYSTEM_ERROR", fsOptions);
  }

  /**
   * Create an integration error
   */
  createIntegrationError(options: {
    message: string;
    code?: string;
    service?: string;
    endpoint?: string;
    request?: unknown;
    response?: unknown;
    retryable?: boolean;
    context?: Partial<IEnhancedErrorContext>;
  }): IIntegrationError {
    const integrationOptions: any = { ...options.context };
    if (options.service !== undefined) integrationOptions.service = options.service;
    if (options.endpoint !== undefined) integrationOptions.endpoint = options.endpoint;
    if (options.request !== undefined) integrationOptions.request = options.request;
    if (options.response !== undefined) integrationOptions.response = options.response;
    if (options.retryable !== undefined) integrationOptions.retryable = options.retryable;

    return new IntegrationError(options.message, options.code || "INTEGRATION_ERROR", integrationOptions);
  }

  /**
   * Create a timeout error
   */
  createTimeoutError(options: {
    message: string;
    code?: string;
    operation?: string;
    timeout?: number;
    elapsed?: number;
    context?: Partial<IEnhancedErrorContext>;
  }): ITimeoutError {
    const timeoutOptions: any = { ...options.context };
    if (options.operation !== undefined) timeoutOptions.operation = options.operation;
    if (options.timeout !== undefined) timeoutOptions.timeout = options.timeout;
    if (options.elapsed !== undefined) timeoutOptions.elapsed = options.elapsed;

    return new TimeoutError(options.message, options.code || "TIMEOUT_ERROR", timeoutOptions);
  }

  /**
   * Create a rate limit error
   */
  createRateLimitError(options: {
    message: string;
    code?: string;
    limit?: number;
    remaining?: number;
    resetAt?: Date;
    resource?: string;
    context?: Partial<IEnhancedErrorContext>;
  }): IRateLimitError {
    const rateLimitOptions: Partial<
      IEnhancedErrorContext & {
        limit?: number;
        remaining?: number;
        resetAt?: Date;
        resource?: string;
      }
    > = { ...options.context };
    if (options.limit !== undefined) rateLimitOptions.limit = options.limit;
    if (options.remaining !== undefined) rateLimitOptions.remaining = options.remaining;
    if (options.resetAt !== undefined) rateLimitOptions.resetAt = options.resetAt;
    if (options.resource !== undefined) rateLimitOptions.resource = options.resource;

    return new RateLimitError(options.message, options.code || "RATE_LIMIT_ERROR", rateLimitOptions);
  }

  /**
   * Create a not found error
   */
  createNotFoundError(options: {
    message: string;
    code?: string;
    resourceType?: string;
    resourceId?: string;
    searchCriteria?: Record<string, unknown>;
    context?: Partial<IEnhancedErrorContext>;
  }): INotFoundError {
    const notFoundOptions: Partial<
      IEnhancedErrorContext & {
        resourceType?: string;
        resourceId?: string;
        searchCriteria?: Record<string, unknown>;
      }
    > = { ...options.context };
    if (options.resourceType !== undefined) notFoundOptions.resourceType = options.resourceType;
    if (options.resourceId !== undefined) notFoundOptions.resourceId = options.resourceId;
    if (options.searchCriteria !== undefined) notFoundOptions.searchCriteria = options.searchCriteria;

    return new NotFoundError(options.message, options.code || "NOT_FOUND_ERROR", notFoundOptions);
  }

  /**
   * Create a conflict error
   */
  createConflictError(options: {
    message: string;
    code?: string;
    conflictType?: ConflictType;
    existingValue?: unknown;
    attemptedValue?: unknown;
    resourceId?: string;
    context?: Partial<IEnhancedErrorContext>;
  }): IConflictError {
    const conflictOptions: Partial<
      IEnhancedErrorContext & {
        conflictType?: ConflictType;
        existingValue?: unknown;
        attemptedValue?: unknown;
        resourceId?: string;
      }
    > = { ...options.context };
    if (options.conflictType !== undefined) conflictOptions.conflictType = options.conflictType;
    if (options.existingValue !== undefined) conflictOptions.existingValue = options.existingValue;
    if (options.attemptedValue !== undefined) conflictOptions.attemptedValue = options.attemptedValue;
    if (options.resourceId !== undefined) conflictOptions.resourceId = options.resourceId;

    return new ConflictError(options.message, options.code || "CONFLICT_ERROR", conflictOptions);
  }

  /**
   * Create a permission error
   */
  createPermissionError(options: {
    message: string;
    code?: string;
    requiredPermission?: string;
    actualPermissions?: string[];
    resource?: string;
    action?: string;
    context?: Partial<IEnhancedErrorContext>;
  }): IPermissionError {
    const permissionOptions: Partial<
      IEnhancedErrorContext & {
        requiredPermission?: string;
        actualPermissions?: string[];
        resource?: string;
        action?: string;
      }
    > = { ...options.context };
    if (options.requiredPermission !== undefined) permissionOptions.requiredPermission = options.requiredPermission;
    if (options.actualPermissions !== undefined) permissionOptions.actualPermissions = options.actualPermissions;
    if (options.resource !== undefined) permissionOptions.resource = options.resource;
    if (options.action !== undefined) permissionOptions.action = options.action;

    return new PermissionError(options.message, options.code || "PERMISSION_ERROR", permissionOptions);
  }
}

/**
 * Default enhanced factory instance
 */
export const defaultEnhancedFactory = new EnhancedErrorFactory();

/**
 * Create a new enhanced factory instance
 */
export function createEnhancedFactory(
  defaultSeverity = ErrorSeverity.ERROR,
  defaultCategory = ErrorCategory.UNKNOWN,
): EnhancedErrorFactory {
  const factory = new EnhancedErrorFactory(defaultSeverity, defaultCategory);
  return factory;
}
