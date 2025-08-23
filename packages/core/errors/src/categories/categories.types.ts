/**
 * Error category type definitions
 */

import type { IBaseAxonError, IEnhancedErrorContext as _IEnhancedErrorContext } from "../base/base-error.types.js";

/**
 * System error interface for infrastructure issues
 */
export interface ISystemError extends IBaseAxonError {
  readonly systemComponent?: string;
  readonly resourceType?: string;
  readonly resourceId?: string;
}

/**
 * Application error interface for business logic issues
 */
export interface IApplicationError extends IBaseAxonError {
  readonly module?: string;
  readonly operation?: string;
  readonly businessRule?: string;
}

/**
 * Validation error interface with field details
 */
export interface IValidationError extends IBaseAxonError {
  readonly field?: string;
  readonly value?: unknown;
  readonly constraint?: string;
  readonly validationErrors?: Array<{
    field: string;
    message: string;
    constraint: string;
  }>;
}

/**
 * Configuration error interface
 */
export interface IConfigurationError extends IBaseAxonError {
  readonly configKey?: string;
  readonly configValue?: unknown;
  readonly expectedType?: string;
  readonly configSource?: string;
}

/**
 * Network error interface for communication failures
 */
export interface INetworkError extends IBaseAxonError {
  readonly url?: string;
  readonly method?: string;
  readonly statusCode?: number;
  readonly timeout?: number;
  readonly retryCount?: number;
}

/**
 * Security error interface for auth/authz issues
 */
export interface ISecurityError extends IBaseAxonError {
  readonly userId?: string;
  readonly resource?: string;
  readonly action?: string;
  readonly reason?: SecurityErrorReason;
}

/**
 * Security error reasons
 */
export enum SecurityErrorReason {
  AUTHENTICATION_FAILED = "authentication_failed",
  AUTHORIZATION_DENIED = "authorization_denied",
  TOKEN_EXPIRED = "token_expired",
  TOKEN_INVALID = "token_invalid",
  INSUFFICIENT_PRIVILEGES = "insufficient_privileges",
  ACCOUNT_LOCKED = "account_locked",
  SESSION_EXPIRED = "session_expired",
  RATE_LIMITED = "rate_limited",
}

/**
 * Database error interface
 */
export interface IDatabaseError extends IBaseAxonError {
  readonly query?: string;
  readonly table?: string;
  readonly operation?: DatabaseOperation;
  readonly constraint?: string;
  readonly affectedRows?: number;
}

/**
 * Database operations
 */
export enum DatabaseOperation {
  SELECT = "select",
  INSERT = "insert",
  UPDATE = "update",
  DELETE = "delete",
  TRANSACTION = "transaction",
  MIGRATION = "migration",
}

/**
 * File system error interface
 */
export interface IFileSystemError extends IBaseAxonError {
  readonly path?: string;
  readonly operation?: FileOperation;
  readonly permissions?: string;
  readonly diskSpace?: number;
}

/**
 * File operations
 */
export enum FileOperation {
  READ = "read",
  WRITE = "write",
  DELETE = "delete",
  CREATE = "create",
  MOVE = "move",
  COPY = "copy",
  CHMOD = "chmod",
}

/**
 * Integration error interface for third-party services
 */
export interface IIntegrationError extends IBaseAxonError {
  readonly service?: string;
  readonly endpoint?: string;
  readonly request?: unknown;
  readonly response?: unknown;
  readonly retryable?: boolean;
}

/**
 * Timeout error interface
 */
export interface ITimeoutError extends IBaseAxonError {
  readonly operation?: string;
  readonly timeout?: number;
  readonly elapsed?: number;
}

/**
 * Rate limit error interface
 */
export interface IRateLimitError extends IBaseAxonError {
  readonly limit?: number;
  readonly remaining?: number;
  readonly resetAt?: Date;
  readonly resource?: string;
}

/**
 * Not found error interface
 */
export interface INotFoundError extends IBaseAxonError {
  readonly resourceType?: string;
  readonly resourceId?: string;
  readonly searchCriteria?: Record<string, unknown>;
}

/**
 * Conflict error interface
 */
export interface IConflictError extends IBaseAxonError {
  readonly conflictType?: ConflictType;
  readonly existingValue?: unknown;
  readonly attemptedValue?: unknown;
  readonly resourceId?: string;
}

/**
 * Conflict types
 */
export enum ConflictType {
  DUPLICATE = "duplicate",
  VERSION_MISMATCH = "version_mismatch",
  CONCURRENT_UPDATE = "concurrent_update",
  CONSTRAINT_VIOLATION = "constraint_violation",
}

/**
 * Permission error interface
 */
export interface IPermissionError extends IBaseAxonError {
  readonly requiredPermission?: string;
  readonly actualPermissions?: string[];
  readonly resource?: string;
  readonly action?: string;
}

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
 * Authentication error interface for authentication-specific failures
 */
export interface IAuthenticationError extends IBaseAxonError {
  readonly userId?: string;
  readonly attemptedAction?: string;
  readonly authMethod?: AuthMethod;
  readonly failureReason?: AuthFailureReason;
}

/**
 * Authentication methods
 */
export enum AuthMethod {
  PASSWORD = "password",
  TOKEN = "token",
  BIOMETRIC = "biometric",
  TWO_FACTOR = "two_factor",
  OAUTH = "oauth",
  API_KEY = "api_key",
  CERTIFICATE = "certificate",
}

/**
 * Authentication failure reasons
 */
export enum AuthFailureReason {
  INVALID_CREDENTIALS = "invalid_credentials",
  ACCOUNT_DISABLED = "account_disabled",
  ACCOUNT_LOCKED = "account_locked",
  PASSWORD_EXPIRED = "password_expired",
  TOKEN_EXPIRED = "token_expired",
  TOKEN_INVALID = "token_invalid",
  MFA_REQUIRED = "mfa_required",
  MFA_FAILED = "mfa_failed",
  RATE_LIMITED = "rate_limited",
}
