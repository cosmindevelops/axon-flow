/**
 * Error category exports
 */

// Types
export type * from "./categories.types.js";

// Classes
export * from "./categories.classes.js";

// Schemas
export * from "./categories.schemas.js";

// Re-export commonly used category types
export type {
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
  SecurityErrorReason,
  DatabaseOperation,
  FileOperation,
  ConflictType,
} from "./categories.types.js";
