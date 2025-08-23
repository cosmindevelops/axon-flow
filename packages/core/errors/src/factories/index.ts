/**
 * Domain factory exports - comprehensive type-safe error factory system
 */

// Export all domain factory types
export type * from "./domain-factory.types.js";

// Export all domain factory schemas
export * from "./domain-factory.schemas.js";

// Re-export commonly used types for convenience
export type {
  DomainKey,
  DomainErrorType,
  DomainContextType,
  IEnhancedErrorFactory,
  ISpecializedErrorFactory,
  IErrorFactoryBuilder,
  IDomainErrorBuilder,
  IErrorCreationOptions,
  DomainErrorCreationOptions,
  IErrorFactoryConfig,
  IErrorFactoryRegistry,
  IFactoryMetrics,
  ErrorTypeGuard,
  IAuthenticationError,
} from "./domain-factory.types.js";

// Re-export commonly used schemas for convenience
export {
  domainKeySchema,
  baseErrorCreationOptionsSchema,
  errorFactoryConfigSchema,
  factoryMetricsSchema,
  validateDomainKey,
  validateErrorCreationOptions,
  validateFactoryConfig,
} from "./domain-factory.schemas.js";

// Export factory classes and functions
export { EnhancedErrorFactory, defaultEnhancedFactory, createEnhancedFactory } from "./simple-factory.classes.js";
