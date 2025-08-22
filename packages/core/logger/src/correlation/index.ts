// Runtime exports
export * from "./correlation.classes.js";
export * from "./serialization.js";

// Type-only exports
export type * from "./correlation.types.js";
export type * from "./correlation.schemas.js";

// Schema exports (runtime)
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
} from "./correlation.schemas.js";
