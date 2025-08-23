/**
 * Base error classes and core error handling
 */

// Types
export type * from "./base-error.types.js";

// Classes
export * from "./base-error.classes.js";

// Schemas
export * from "./base-error.schemas.js";

// Re-export commonly used base types
export type {
  ErrorSeverity,
  ErrorCategory,
  IEnhancedErrorContext,
  IErrorCode,
  ISerializedError,
  IErrorHandler,
  IBaseAxonError,
  IChainableError,
  IAggregateError,
  IErrorFactory,
  IEnhancedErrorFactory,
  IDomainErrorFactory,
  IErrorFactoryBuilder,
  ISystemErrorBuilder,
  IApplicationErrorBuilder,
  IValidationErrorBuilder,
  INetworkErrorBuilder,
  ISecurityErrorBuilder,
  IAuthenticationErrorBuilder,
  IErrorPool,
  IErrorSystemConfig,
  IErrorMetrics,
} from "./base-error.types.js";
