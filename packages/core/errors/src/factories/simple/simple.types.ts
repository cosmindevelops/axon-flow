/**
 * Types for simple error factory implementation
 */

import type { ErrorSeverity, ErrorCategory } from "../../base/base-error.types.js";
import type { IEnhancedErrorContext } from "../../base/base-error.types.js";
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
} from "../../categories/categories.types.js";

/**
 * Interface for simple error factory
 */
export interface ISimpleErrorFactory {
  createSystemError(options: {
    message: string;
    code?: string;
    systemComponent?: string;
    resourceType?: string;
    resourceId?: string;
    context?: Partial<IEnhancedErrorContext>;
  }): ISystemError;

  createApplicationError(options: {
    message: string;
    code?: string;
    module?: string;
    operation?: string;
    businessRule?: string;
    context?: Partial<IEnhancedErrorContext>;
  }): IApplicationError;

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
  }): IValidationError;

  createConfigurationError(options: {
    message: string;
    code?: string;
    configKey?: string;
    configValue?: unknown;
    expectedType?: string;
    configSource?: string;
    context?: Partial<IEnhancedErrorContext>;
  }): IConfigurationError;

  createNetworkError(options: {
    message: string;
    code?: string;
    url?: string;
    method?: string;
    statusCode?: number;
    timeout?: number;
    retryCount?: number;
    context?: Partial<IEnhancedErrorContext>;
  }): INetworkError;

  createSecurityError(options: {
    message: string;
    code?: string;
    userId?: string;
    resource?: string;
    action?: string;
    context?: Partial<IEnhancedErrorContext>;
  }): ISecurityError;

  createAuthenticationError(options: {
    message: string;
    code?: string;
    userId?: string;
    attemptedAction?: string;
    authMethod?: string;
    failureReason?: string;
    context?: Partial<IEnhancedErrorContext>;
  }): IAuthenticationError;

  createDatabaseError(options: {
    message: string;
    code?: string;
    query?: string;
    table?: string;
    operation?: string;
    constraint?: string;
    affectedRows?: number;
    context?: Partial<IEnhancedErrorContext>;
  }): IDatabaseError;

  createFileSystemError(options: {
    message: string;
    code?: string;
    path?: string;
    operation?: string;
    permissions?: string;
    diskSpace?: number;
    context?: Partial<IEnhancedErrorContext>;
  }): IFileSystemError;

  createIntegrationError(options: {
    message: string;
    code?: string;
    service?: string;
    endpoint?: string;
    request?: unknown;
    response?: unknown;
    retryable?: boolean;
    context?: Partial<IEnhancedErrorContext>;
  }): IIntegrationError;

  createTimeoutError(options: {
    message: string;
    code?: string;
    operation?: string;
    timeout?: number;
    elapsed?: number;
    context?: Partial<IEnhancedErrorContext>;
  }): ITimeoutError;

  createRateLimitError(options: {
    message: string;
    code?: string;
    limit?: number;
    remaining?: number;
    resetAt?: Date;
    resource?: string;
    context?: Partial<IEnhancedErrorContext>;
  }): IRateLimitError;

  createNotFoundError(options: {
    message: string;
    code?: string;
    resourceType?: string;
    resourceId?: string;
    searchCriteria?: Record<string, unknown>;
    context?: Partial<IEnhancedErrorContext>;
  }): INotFoundError;

  createConflictError(options: {
    message: string;
    code?: string;
    conflictType?: ConflictType;
    existingValue?: unknown;
    attemptedValue?: unknown;
    resourceId?: string;
    context?: Partial<IEnhancedErrorContext>;
  }): IConflictError;

  createPermissionError(options: {
    message: string;
    code?: string;
    requiredPermission?: string;
    actualPermissions?: string[];
    resource?: string;
    action?: string;
    context?: Partial<IEnhancedErrorContext>;
  }): IPermissionError;
}

/**
 * Configuration options for simple error factory
 */
export interface ISimpleFactoryOptions {
  defaultSeverity?: ErrorSeverity;
  defaultCategory?: ErrorCategory;
}

/**
 * System error creation options
 */
export interface ISystemErrorOptions {
  message: string;
  code?: string;
  systemComponent?: string;
  resourceType?: string;
  resourceId?: string;
  context?: Partial<IEnhancedErrorContext>;
}

/**
 * Application error creation options
 */
export interface IApplicationErrorOptions {
  message: string;
  code?: string;
  module?: string;
  operation?: string;
  businessRule?: string;
  context?: Partial<IEnhancedErrorContext>;
}

/**
 * Validation error creation options
 */
export interface IValidationErrorOptions {
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
}
