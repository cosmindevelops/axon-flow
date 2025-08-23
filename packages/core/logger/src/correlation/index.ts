// Export core subdomain - core correlation functionality
export * from "./core/index.js";

// Export serialization subdomain
export * from "./serialization/index.js";

// Schema exports (runtime) - now from core subdomain
export {
  correlationIdSchema,
  correlationIdPartsSchema,
  correlationContextSchema,
  correlationGeneratorConfigSchema,
  correlationManagerConfigSchema,
  correlationConfigSchema,
  correlationPlatformSchema,
  correlationPropagationStrategySchema,
  enhancedCorrelationManagerConfigSchema,
  correlationMiddlewareConfigSchema,
  httpCorrelationMiddlewareConfigSchema,
  messageQueueCorrelationMiddlewareConfigSchema,
  correlationMiddlewareChainConfigSchema,
  correlationManagerFactoryConfigSchema,
  correlationSystemConfigSchema,
} from "./core/core.schemas.js";
