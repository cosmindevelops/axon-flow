/**
 * @axon/errors - Enhanced error handling utilities with context preservation
 *
 * Enhanced error classes following the project's error handling strategy
 * with correlation context, structured metadata, and graceful degradation.
 */

// Base error types and classes
export * from "./base/index.js";

// Chain of responsibility pattern
export * from "./chain/index.js";

// Error categories - export specific items to avoid conflicts
export {
  // Types
  type ISystemError,
  type IApplicationError,
  type IValidationError as IValidationErrorCategory,
  type IConfigurationError as IConfigurationErrorCategory,
  type INetworkError as INetworkErrorCategory,
  type ISecurityError,
  type IDatabaseError,
  type IFileSystemError,
  type IIntegrationError,
  type ITimeoutError,
  type IRateLimitError,
  type INotFoundError,
  type IConflictError,
  type IPermissionError,
  type IAuthenticationError,
  // Classes - use aliases for conflicting ones
  SystemError,
  ApplicationError,
  ValidationError as ValidationErrorCategory,
  ConfigurationError as ConfigurationErrorCategory,
  // Direct export without alias for backward compatibility
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
} from "./categories/index.js";

// Export enums as values
export {
  SecurityErrorReason,
  DatabaseOperation,
  FileOperation,
  ConflictType,
  AuthMethod,
  AuthFailureReason,
} from "./categories/categories.types.js";

// Serialization system
export * from "./serialization/index.js";

// Factory system - comprehensive type-safe error factories
export {
  // Enhanced factory classes (simple implementation)
  EnhancedErrorFactory,
  defaultEnhancedFactory,
  createEnhancedFactory,
  // Simple factory aliases
  SimpleErrorFactory,
  defaultSimpleFactory,
  createSimpleFactory,
} from "./factories/index.js";

// Export factory types with specific naming to avoid conflicts
export type {
  ISimpleErrorFactory,
  ISimpleFactoryOptions,
  ISystemErrorOptions,
  IApplicationErrorOptions,
  IValidationErrorOptions,
} from "./factories/index.js";

// Recovery mechanisms - export specific items to avoid conflicts with chain module
export {
  // Recovery-specific types
  type IGracefulDegradationConfig,
  type ITimeoutConfig,
  type IBulkheadConfig,
  type IRecoveryContext,
  type IRecoveryMetrics,
  type IRecoveryResult,
  type IRecoveryHandler,
  type IRecoverableOperation,
  type IOperationRecoveryConfig,
  type IRecoveryManager,
  type IRecoveryManagerConfig,
  type IRecoveryDecoratorConfig,
  // Recovery-specific enums
  BackoffStrategy,
  RecoveryStrategy,
  RecoveryState,
  // Recovery-specific schemas (use aliases for conflicting ones)
  BACKOFF_STRATEGY_SCHEMA,
  RECOVERY_STRATEGY_SCHEMA,
  RECOVERY_STATE_SCHEMA,
  RETRY_CONFIG_SCHEMA as RECOVERY_RETRY_CONFIG_SCHEMA,
  CIRCUIT_BREAKER_CONFIG_SCHEMA as RECOVERY_CIRCUIT_BREAKER_CONFIG_SCHEMA,
  GRACEFUL_DEGRADATION_CONFIG_SCHEMA,
  TIMEOUT_CONFIG_SCHEMA,
  BULKHEAD_CONFIG_SCHEMA,
  RECOVERY_CONTEXT_SCHEMA,
  RECOVERY_METRICS_SCHEMA,
  RECOVERY_RESULT_SCHEMA,
  OPERATION_RECOVERY_CONFIG_SCHEMA,
  RECOVERABLE_OPERATION_SCHEMA,
  RECOVERY_DECORATOR_CONFIG_SCHEMA,
  RECOVERY_HANDLER_CONFIG_SCHEMA,
  RECOVERY_MANAGER_CONFIG_SCHEMA,
  // Recovery classes
  RetryHandler,
  CircuitBreakerHandler,
  GracefulDegradationHandler,
  TimeoutHandler,
  RecoveryManager,
} from "./recovery/index.js";

// Recovery types with aliases for conflicting interfaces
export type {
  IRetryConfig as IRecoveryRetryConfig,
  ICircuitBreakerConfig as IRecoveryCircuitBreakerConfig,
} from "./recovery/index.js";

// Decorator utilities
export * from "./decorators/index.js";

// Legacy types for backward compatibility
export type * from "./types/index.js";
