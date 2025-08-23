/**
 * Factory module - Factory pattern integration
 *
 * Provides comprehensive factory pattern support for the DI container with:
 * - Simple and abstract factory implementations
 * - Performance tracking and caching
 * - Provider pattern integration
 * - Zod validation schemas
 */

// Export types
export type * from "./factory.types.js";

// Export classes
export {
  AbstractFactory,
  SimpleFactory,
  CachedFactory,
  FactoryRegistry,
  FactoryResolver,
  UniversalProviderFactory,
  DEFAULT_FACTORY_CONFIG,
  createFactoryContext,
} from "./factory.classes.js";

// Export schemas and validation
export {
  containerLifecycleSchema,
  factoryPerformanceMetricsSchema,
  factoryMetadataSchema,
  factoryRegistrationOptionsSchema,
  factoryRegistryMetricsSchema,
  factoryResolverMetricsSchema,
  factoryConfigSchema,
  factoryContextSchema,
  authProviderConfigSchema,
  billingProviderConfigSchema,
  storageProviderConfigSchema,
  rateLimitingConfigSchema,
  llmProviderConfigSchema,
  DEFAULT_FACTORY_REGISTRATION_OPTIONS,
  DEFAULT_FACTORY_CONFIG as DEFAULT_FACTORY_CONFIG_SCHEMA,
  isFactoryMetadata,
  isFactoryRegistrationOptions,
  isFactoryConfig,
  isAuthProviderConfig,
  isBillingProviderConfig,
  isStorageProviderConfig,
  isLLMProviderConfig,
  validateFactoryRegistrationOptions,
  validateFactoryConfig,
  validateAuthProviderConfig,
  validateBillingProviderConfig,
  validateStorageProviderConfig,
  validateLLMProviderConfig,
} from "./factory.schemas.js";
