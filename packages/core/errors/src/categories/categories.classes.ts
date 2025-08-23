/**
 * Error category class implementations
 */

import { BaseAxonError } from "../base/base-error.classes.js";
import type { IEnhancedErrorContext } from "../base/base-error.types.js";
import { ErrorCategory, ErrorSeverity } from "../base/base-error.types.js";
import type {
  ConflictType,
  DatabaseOperation,
  FileOperation,
  IApplicationError,
  IAuthenticationError,
  IConfigurationError,
  IConflictError,
  IDatabaseError,
  IFileSystemError,
  IIntegrationError,
  INetworkError,
  INotFoundError,
  IPermissionError,
  IRateLimitError,
  ISecurityError,
  ISystemError,
  ITimeoutError,
  IValidationError,
  SecurityErrorReason,
} from "./categories.types.js";
import { AuthFailureReason, AuthMethod } from "./categories.types.js";

/**
 * System error for infrastructure and platform issues
 */
export class SystemError extends BaseAxonError implements ISystemError {
  public readonly systemComponent?: string;
  public readonly resourceType?: string;
  public readonly resourceId?: string;

  constructor(
    message: string,
    code = "SYSTEM_ERROR",
    options: Partial<
      IEnhancedErrorContext & {
        systemComponent?: string;
        resourceType?: string;
        resourceId?: string;
      }
    > = {},
  ) {
    super(message, code, {
      ...options,
      severity: options.severity ?? ErrorSeverity.CRITICAL,
      category: ErrorCategory.SYSTEM,
    });

    if (options.systemComponent !== undefined) this.systemComponent = options.systemComponent;
    if (options.resourceType !== undefined) this.resourceType = options.resourceType;
    if (options.resourceId !== undefined) this.resourceId = options.resourceId;
  }
}

/**
 * Application error for business logic issues
 */
export class ApplicationError extends BaseAxonError implements IApplicationError {
  public readonly module?: string;
  public readonly operation?: string;
  public readonly businessRule?: string;

  constructor(
    message: string,
    code = "APPLICATION_ERROR",
    options: Partial<
      IEnhancedErrorContext & {
        module?: string;
        operation?: string;
        businessRule?: string;
      }
    > = {},
  ) {
    super(message, code, {
      ...options,
      severity: options.severity ?? ErrorSeverity.ERROR,
      category: ErrorCategory.APPLICATION,
    });

    if (options.module !== undefined) this.module = options.module;
    if (options.operation !== undefined) this.operation = options.operation;
    if (options.businessRule !== undefined) this.businessRule = options.businessRule;
  }
}

/**
 * Validation error for input and schema validation
 */
export class ValidationError extends BaseAxonError implements IValidationError {
  public readonly field?: string;
  public readonly value?: unknown;
  public readonly constraint?: string;
  public readonly validationErrors?: Array<{
    field: string;
    message: string;
    constraint: string;
  }>;

  constructor(
    message: string,
    code = "VALIDATION_ERROR",
    options: Partial<
      IEnhancedErrorContext & {
        field?: string;
        value?: unknown;
        constraint?: string;
        validationErrors?: Array<{
          field: string;
          message: string;
          constraint: string;
        }>;
      }
    > = {},
  ) {
    super(message, code, {
      ...options,
      severity: options.severity ?? ErrorSeverity.WARNING,
      category: ErrorCategory.VALIDATION,
    });

    if (options.field !== undefined) this.field = options.field;
    if (options.value !== undefined) this.value = options.value;
    if (options.constraint !== undefined) this.constraint = options.constraint;
    if (options.validationErrors !== undefined) this.validationErrors = options.validationErrors;
  }

  /**
   * Create validation error from Zod error
   */
  static fromZodError(zodError: any, code = "ZOD_VALIDATION_ERROR"): ValidationError {
    const validationErrors =
      zodError.errors?.map((err: any) => ({
        field: err.path.join("."),
        message: err.message,
        constraint: err.code,
      })) ?? [];

    return new ValidationError(`Validation failed: ${zodError.errors?.length ?? 0} error(s)`, code, {
      validationErrors,
      metadata: {
        zodError: zodError.format?.(),
      },
    });
  }
}

/**
 * Configuration error for config issues
 */
export class ConfigurationError extends BaseAxonError implements IConfigurationError {
  public readonly configKey?: string;
  public readonly configValue?: unknown;
  public readonly expectedType?: string;
  public readonly configSource?: string;

  constructor(
    message: string,
    code = "CONFIGURATION_ERROR",
    options: Partial<
      IEnhancedErrorContext & {
        configKey?: string;
        configValue?: unknown;
        expectedType?: string;
        configSource?: string;
      }
    > = {},
  ) {
    super(message, code, {
      ...options,
      severity: options.severity ?? ErrorSeverity.ERROR,
      category: ErrorCategory.CONFIGURATION,
    });

    if (options.configKey !== undefined) this.configKey = options.configKey;
    if (options.configValue !== undefined) this.configValue = options.configValue;
    if (options.expectedType !== undefined) this.expectedType = options.expectedType;
    if (options.configSource !== undefined) this.configSource = options.configSource;
  }
}

/**
 * Network error for communication failures
 */
export class NetworkError extends BaseAxonError implements INetworkError {
  public readonly url?: string;
  public readonly method?: string;
  public readonly statusCode?: number;
  public readonly timeout?: number;
  public readonly retryCount?: number;

  constructor(
    message: string,
    code = "NETWORK_ERROR",
    options: Partial<
      IEnhancedErrorContext & {
        url?: string;
        method?: string;
        statusCode?: number;
        timeout?: number;
        retryCount?: number;
      }
    > = {},
  ) {
    super(message, code, {
      ...options,
      severity: options.severity ?? ErrorSeverity.ERROR,
      category: ErrorCategory.NETWORK,
    });

    if (options.url !== undefined) this.url = options.url;
    if (options.method !== undefined) this.method = options.method;
    if (options.statusCode !== undefined) this.statusCode = options.statusCode;
    if (options.timeout !== undefined) this.timeout = options.timeout;
    if (options.retryCount !== undefined) this.retryCount = options.retryCount;
  }
}

/**
 * Security error for authentication and authorization issues
 */
export class SecurityError extends BaseAxonError implements ISecurityError {
  public readonly userId?: string;
  public readonly resource?: string;
  public readonly action?: string;
  public readonly reason?: SecurityErrorReason;

  constructor(
    message: string,
    code = "SECURITY_ERROR",
    options: Partial<
      IEnhancedErrorContext & {
        userId?: string;
        resource?: string;
        action?: string;
        reason?: SecurityErrorReason;
      }
    > = {},
  ) {
    super(message, code, {
      ...options,
      severity: options.severity ?? ErrorSeverity.CRITICAL,
      category: ErrorCategory.SECURITY,
    });

    if (options.userId !== undefined) this.userId = options.userId;
    if (options.resource !== undefined) this.resource = options.resource;
    if (options.action !== undefined) this.action = options.action;
    if (options.reason !== undefined) this.reason = options.reason;
  }
}

/**
 * Authentication error for authentication-specific failures
 */
export class AuthenticationError extends BaseAxonError implements IAuthenticationError {
  public readonly userId?: string;
  public readonly attemptedAction?: string;
  public readonly authMethod?: AuthMethod;
  public readonly failureReason?: AuthFailureReason;

  constructor(
    message: string,
    code = "AUTHENTICATION_ERROR",
    options: Partial<
      IEnhancedErrorContext & {
        userId?: string;
        attemptedAction?: string;
        authMethod?: AuthMethod;
        failureReason?: AuthFailureReason;
      }
    > = {},
  ) {
    super(message, code, {
      ...options,
      severity: options.severity ?? ErrorSeverity.ERROR,
      category: ErrorCategory.SECURITY,
    });

    if (options.userId !== undefined) this.userId = options.userId;
    if (options.attemptedAction !== undefined) this.attemptedAction = options.attemptedAction;
    if (options.authMethod !== undefined) this.authMethod = options.authMethod;
    if (options.failureReason !== undefined) this.failureReason = options.failureReason;
  }

  /**
   * Create authentication error for invalid credentials
   */
  static invalidCredentials(userId?: string, authMethod?: AuthMethod): AuthenticationError {
    const options: Partial<
      IEnhancedErrorContext & {
        userId?: string;
        attemptedAction?: string;
        authMethod?: AuthMethod;
        failureReason?: AuthFailureReason;
      }
    > = {
      failureReason: AuthFailureReason.INVALID_CREDENTIALS,
      severity: ErrorSeverity.WARNING,
    };

    if (userId !== undefined) options.userId = userId;
    if (authMethod !== undefined) options.authMethod = authMethod;

    return new AuthenticationError("Invalid credentials provided", "AUTH_INVALID_CREDENTIALS", options);
  }

  /**
   * Create authentication error for expired tokens
   */
  static tokenExpired(userId?: string, tokenType = "access"): AuthenticationError {
    const options: Partial<
      IEnhancedErrorContext & {
        userId?: string;
        attemptedAction?: string;
        authMethod?: AuthMethod;
        failureReason?: AuthFailureReason;
      }
    > = {
      authMethod: AuthMethod.TOKEN,
      failureReason: AuthFailureReason.TOKEN_EXPIRED,
      severity: ErrorSeverity.WARNING,
      metadata: { tokenType },
    };

    if (userId !== undefined) options.userId = userId;

    return new AuthenticationError(`${tokenType} token has expired`, "AUTH_TOKEN_EXPIRED", options);
  }

  /**
   * Create authentication error for account lockout
   */
  static accountLocked(userId: string, reason?: string): AuthenticationError {
    return new AuthenticationError("Account is locked", "AUTH_ACCOUNT_LOCKED", {
      userId,
      failureReason: AuthFailureReason.ACCOUNT_LOCKED,
      severity: ErrorSeverity.ERROR,
      metadata: { lockReason: reason },
    });
  }

  /**
   * Create authentication error for MFA failures
   */
  static mfaRequired(userId: string, authMethod?: AuthMethod): AuthenticationError {
    const options: Partial<
      IEnhancedErrorContext & {
        userId?: string;
        attemptedAction?: string;
        authMethod?: AuthMethod;
        failureReason?: AuthFailureReason;
      }
    > = {
      userId,
      failureReason: AuthFailureReason.MFA_REQUIRED,
      severity: ErrorSeverity.WARNING,
    };

    if (authMethod !== undefined) options.authMethod = authMethod;

    return new AuthenticationError("Multi-factor authentication required", "AUTH_MFA_REQUIRED", options);
  }

  /**
   * Create authentication error from OAuth provider failure
   */
  static oauthFailure(provider: string, error?: string): AuthenticationError {
    return new AuthenticationError(`OAuth authentication failed for ${provider}`, "AUTH_OAUTH_FAILED", {
      authMethod: AuthMethod.OAUTH,
      failureReason: AuthFailureReason.INVALID_CREDENTIALS,
      severity: ErrorSeverity.ERROR,
      metadata: { provider, oauthError: error },
    });
  }
}

/**
 * Database error for data layer issues
 */
export class DatabaseError extends BaseAxonError implements IDatabaseError {
  public readonly query?: string;
  public readonly table?: string;
  public readonly operation?: DatabaseOperation;
  public readonly constraint?: string;
  public readonly affectedRows?: number;

  constructor(
    message: string,
    code = "DATABASE_ERROR",
    options: Partial<
      IEnhancedErrorContext & {
        query?: string;
        table?: string;
        operation?: DatabaseOperation;
        constraint?: string;
        affectedRows?: number;
      }
    > = {},
  ) {
    super(message, code, {
      ...options,
      severity: options.severity ?? ErrorSeverity.ERROR,
      category: ErrorCategory.SYSTEM,
    });

    if (options.query !== undefined) this.query = options.query;
    if (options.table !== undefined) this.table = options.table;
    if (options.operation !== undefined) this.operation = options.operation;
    if (options.constraint !== undefined) this.constraint = options.constraint;
    if (options.affectedRows !== undefined) this.affectedRows = options.affectedRows;
  }
}

/**
 * File system error for I/O operations
 */
export class FileSystemError extends BaseAxonError implements IFileSystemError {
  public readonly path?: string;
  public readonly operation?: FileOperation;
  public readonly permissions?: string;
  public readonly diskSpace?: number;

  constructor(
    message: string,
    code = "FILESYSTEM_ERROR",
    options: Partial<
      IEnhancedErrorContext & {
        path?: string;
        operation?: FileOperation;
        permissions?: string;
        diskSpace?: number;
      }
    > = {},
  ) {
    super(message, code, {
      ...options,
      severity: options.severity ?? ErrorSeverity.ERROR,
      category: ErrorCategory.SYSTEM,
    });

    if (options.path !== undefined) this.path = options.path;
    if (options.operation !== undefined) this.operation = options.operation;
    if (options.permissions !== undefined) this.permissions = options.permissions;
    if (options.diskSpace !== undefined) this.diskSpace = options.diskSpace;
  }
}

/**
 * Integration error for third-party service failures
 */
export class IntegrationError extends BaseAxonError implements IIntegrationError {
  public readonly service?: string;
  public readonly endpoint?: string;
  public readonly request?: unknown;
  public readonly response?: unknown;
  public readonly retryable?: boolean;

  constructor(
    message: string,
    code = "INTEGRATION_ERROR",
    options: Partial<
      IEnhancedErrorContext & {
        service?: string;
        endpoint?: string;
        request?: unknown;
        response?: unknown;
        retryable?: boolean;
      }
    > = {},
  ) {
    super(message, code, {
      ...options,
      severity: options.severity ?? ErrorSeverity.ERROR,
      category: ErrorCategory.NETWORK,
    });

    if (options.service !== undefined) this.service = options.service;
    if (options.endpoint !== undefined) this.endpoint = options.endpoint;
    this.request = options.request;
    this.response = options.response;
    this.retryable = options.retryable ?? false;
  }
}

/**
 * Timeout error for operation timeouts
 */
export class TimeoutError extends BaseAxonError implements ITimeoutError {
  public readonly operation?: string;
  public readonly timeout?: number;
  public readonly elapsed?: number;

  constructor(
    message: string,
    code = "TIMEOUT_ERROR",
    options: Partial<
      IEnhancedErrorContext & {
        operation?: string;
        timeout?: number;
        elapsed?: number;
      }
    > = {},
  ) {
    super(message, code, {
      ...options,
      severity: options.severity ?? ErrorSeverity.WARNING,
      category: ErrorCategory.NETWORK,
    });

    if (options.operation !== undefined) this.operation = options.operation;
    if (options.timeout !== undefined) this.timeout = options.timeout;
    if (options.elapsed !== undefined) this.elapsed = options.elapsed;
  }
}

/**
 * Rate limit error for throttling
 */
export class RateLimitError extends BaseAxonError implements IRateLimitError {
  public readonly limit?: number;
  public readonly remaining?: number;
  public readonly resetAt?: Date;
  public readonly resource?: string;

  constructor(
    message: string,
    code = "RATE_LIMIT_ERROR",
    options: Partial<
      IEnhancedErrorContext & {
        limit?: number;
        remaining?: number;
        resetAt?: Date;
        resource?: string;
      }
    > = {},
  ) {
    super(message, code, {
      ...options,
      severity: options.severity ?? ErrorSeverity.WARNING,
      category: ErrorCategory.NETWORK,
    });

    if (options.limit !== undefined) this.limit = options.limit;
    if (options.remaining !== undefined) this.remaining = options.remaining;
    if (options.resetAt !== undefined) this.resetAt = options.resetAt;
    if (options.resource !== undefined) this.resource = options.resource;
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends BaseAxonError implements INotFoundError {
  public readonly resourceType?: string;
  public readonly resourceId?: string;
  public readonly searchCriteria?: Record<string, unknown>;

  constructor(
    message: string,
    code = "NOT_FOUND_ERROR",
    options: Partial<
      IEnhancedErrorContext & {
        resourceType?: string;
        resourceId?: string;
        searchCriteria?: Record<string, unknown>;
      }
    > = {},
  ) {
    super(message, code, {
      ...options,
      severity: options.severity ?? ErrorSeverity.WARNING,
      category: ErrorCategory.APPLICATION,
    });

    if (options.resourceType !== undefined) this.resourceType = options.resourceType;
    if (options.resourceId !== undefined) this.resourceId = options.resourceId;
    if (options.searchCriteria !== undefined) this.searchCriteria = options.searchCriteria;
  }
}

/**
 * Conflict error for resource conflicts
 */
export class ConflictError extends BaseAxonError implements IConflictError {
  public readonly conflictType?: ConflictType;
  public readonly existingValue?: unknown;
  public readonly attemptedValue?: unknown;
  public readonly resourceId?: string;

  constructor(
    message: string,
    code = "CONFLICT_ERROR",
    options: Partial<
      IEnhancedErrorContext & {
        conflictType?: ConflictType;
        existingValue?: unknown;
        attemptedValue?: unknown;
        resourceId?: string;
      }
    > = {},
  ) {
    super(message, code, {
      ...options,
      severity: options.severity ?? ErrorSeverity.WARNING,
      category: ErrorCategory.APPLICATION,
    });

    if (options.conflictType !== undefined) this.conflictType = options.conflictType;
    if (options.existingValue !== undefined) this.existingValue = options.existingValue;
    if (options.attemptedValue !== undefined) this.attemptedValue = options.attemptedValue;
    if (options.resourceId !== undefined) this.resourceId = options.resourceId;
  }
}

/**
 * Permission error for authorization failures
 */
export class PermissionError extends BaseAxonError implements IPermissionError {
  public readonly requiredPermission?: string;
  public readonly actualPermissions?: string[];
  public readonly resource?: string;
  public readonly action?: string;

  constructor(
    message: string,
    code = "PERMISSION_ERROR",
    options: Partial<
      IEnhancedErrorContext & {
        requiredPermission?: string;
        actualPermissions?: string[];
        resource?: string;
        action?: string;
      }
    > = {},
  ) {
    super(message, code, {
      ...options,
      severity: options.severity ?? ErrorSeverity.ERROR,
      category: ErrorCategory.SECURITY,
    });

    if (options.requiredPermission !== undefined) this.requiredPermission = options.requiredPermission;
    if (options.actualPermissions !== undefined) this.actualPermissions = options.actualPermissions;
    if (options.resource !== undefined) this.resource = options.resource;
    if (options.action !== undefined) this.action = options.action;
  }
}
