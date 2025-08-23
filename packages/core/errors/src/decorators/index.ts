/**
 * Decorators barrel exports
 */

// Type exports
export type {
  DecoratorTarget,
  MethodSignature,
  AsyncMethodSignature,
  IRecoveryDecoratorMetadata,
  IMethodDecoratorConfig,
  IClassDecoratorConfig,
  IPropertyDecoratorConfig,
  IParameterDecoratorConfig,
  DecoratorFactory,
  MethodDecoratorFactory,
  ClassDecoratorFactory,
  PropertyDecoratorFactory,
  ParameterDecoratorFactory,
  IDecoratorExecutionContext,
  IDecoratorExecutionResult,
  IDecoratorInterceptor,
  IDecoratorRegistry,
  IDecoratorUtils,
  IDecoratorConfigValidator,
} from "./decorators.types.js";

// Schema exports
export {
  DECORATOR_TARGET_SCHEMA,
  RECOVERY_DECORATOR_METADATA_SCHEMA,
  METHOD_DECORATOR_CONFIG_SCHEMA,
  CLASS_DECORATOR_CONFIG_SCHEMA,
  PROPERTY_DECORATOR_CONFIG_SCHEMA,
  PARAMETER_DECORATOR_CONFIG_SCHEMA,
  DECORATOR_EXECUTION_CONTEXT_SCHEMA,
  DECORATOR_EXECUTION_RESULT_SCHEMA,
  DECORATOR_INTERCEPTOR_SCHEMA,
  DECORATOR_REGISTRY_CONFIG_SCHEMA,
  DECORATOR_UTILS_CONFIG_SCHEMA,
  DECORATOR_CONFIG_VALIDATOR_SCHEMA,
} from "./decorators.schemas.js";

// Class exports
export {
  RetryDecorator,
  CircuitBreakerDecorator,
  TimeoutDecorator,
  GracefulDegradationDecorator,
  RecoveryDecorator,
  DecoratorUtils,
  DecoratorRegistry,
  DecoratorConfigValidator,
  decoratorUtils,
  decoratorRegistry,
  decoratorConfigValidator,
} from "./decorators.classes.js";

// Decorator factory exports
export { Retry, CircuitBreaker, Timeout, GracefulDegradation, Recovery } from "./decorators.classes.js";
