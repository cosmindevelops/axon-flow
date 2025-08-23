import { z } from "zod";
import { CorrelationPlatform, CorrelationPropagationStrategy } from "./correlation.types.js";

/**
 * UUID v4 validation schema
 */
const uuidV4Schema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, "Must be a valid UUID v4");

/**
 * CorrelationId validation schema
 */
export const correlationIdSchema = z.string().refine(
  (id) => {
    if (!id) return false;

    const parts = id.split("-");
    if (parts.length < 5) return false;

    // Extract UUID part (last 5 segments)
    const uuidPart = parts.slice(-5).join("-");
    return uuidV4Schema.safeParse(uuidPart).success;
  },
  {
    message: "Must be a valid correlation ID with UUID v4 format",
  },
);

/**
 * Correlation ID parts validation schema
 */
export const correlationIdPartsSchema = z.object({
  prefix: z.string().optional(),
  uuid: uuidV4Schema,
  timestamp: z.number().int().positive().optional(),
});

/**
 * Correlation context validation schema
 */
export const correlationContextSchema = z.object({
  id: correlationIdSchema,
  createdAt: z.date(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Correlation ID generator configuration schema
 */
export const correlationGeneratorConfigSchema = z.object({
  maxEntropyCache: z.number().int().positive().default(10000),
  enableCollisionDetection: z.boolean().default(true),
});

/**
 * Correlation manager configuration schema
 */
export const correlationManagerConfigSchema = z.object({
  maxContextStackSize: z.number().int().positive().default(100),
  enableContextTracking: z.boolean().default(true),
  defaultPrefix: z.string().min(1).optional(),
});

/**
 * Full correlation configuration schema
 */
export const correlationConfigSchema = z.object({
  generator: correlationGeneratorConfigSchema.optional(),
  manager: correlationManagerConfigSchema.optional(),
});

/**
 * Platform enum validation schema
 */
export const correlationPlatformSchema = z.nativeEnum(CorrelationPlatform);

/**
 * Propagation strategy enum validation schema
 */
export const correlationPropagationStrategySchema = z.nativeEnum(CorrelationPropagationStrategy);

/**
 * Enhanced correlation manager configuration schema
 */
export const enhancedCorrelationManagerConfigSchema = z.object({
  maxStackSize: z.number().int().positive().default(100),
  enableAutoCleanup: z.boolean().default(true),
  contextTimeoutMs: z.number().int().positive().default(300000),
  generator: z.any().optional(), // ICorrelationIdGenerator - can't validate interface
  platformOptions: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Correlation middleware configuration schema
 */
export const correlationMiddlewareConfigSchema = z.object({
  name: z.string().optional(),
  enabled: z.boolean().default(true),
  options: z.record(z.string(), z.unknown()).optional(),
});

/**
 * HTTP correlation middleware configuration schema
 */
export const httpCorrelationMiddlewareConfigSchema = correlationMiddlewareConfigSchema.extend({
  name: z.string().default("HttpCorrelationMiddleware"),
  extractHeaders: z.array(z.string()).default(["user-agent", "x-forwarded-for"]),
  includeRequestPath: z.boolean().default(true),
});

/**
 * Message queue correlation middleware configuration schema
 */
export const messageQueueCorrelationMiddlewareConfigSchema = correlationMiddlewareConfigSchema.extend({
  name: z.string().default("MessageQueueCorrelationMiddleware"),
  extractQueueMetadata: z.boolean().default(true),
  includeMessageId: z.boolean().default(true),
});

/**
 * Correlation middleware chain configuration schema
 */
export const correlationMiddlewareChainConfigSchema = z.object({
  middlewares: z.array(correlationMiddlewareConfigSchema).default([]),
  enableErrorHandling: z.boolean().default(true),
  maxProcessingTimeMs: z.number().int().positive().default(5000),
});

/**
 * Correlation factory configuration schema
 */
export const correlationManagerFactoryConfigSchema = z.object({
  defaultPlatform: correlationPlatformSchema.optional(),
  platformConfigs: z.record(correlationPlatformSchema, enhancedCorrelationManagerConfigSchema).optional(),
  fallbackStrategy: correlationPropagationStrategySchema.default(CorrelationPropagationStrategy.MANUAL_CONTEXT_STACK),
});

/**
 * Complete correlation system configuration schema
 */
export const correlationSystemConfigSchema = z.object({
  enabled: z.boolean().default(true),
  manager: enhancedCorrelationManagerConfigSchema.optional(),
  factory: correlationManagerFactoryConfigSchema.optional(),
  middleware: correlationMiddlewareChainConfigSchema.optional(),
  generator: correlationGeneratorConfigSchema.optional(),
});

// Type exports for configuration
export type CorrelationGeneratorConfig = z.infer<typeof correlationGeneratorConfigSchema>;
export type CorrelationManagerConfig = z.infer<typeof correlationManagerConfigSchema>;
export type CorrelationConfig = z.infer<typeof correlationConfigSchema>;
export type EnhancedCorrelationManagerConfig = z.infer<typeof enhancedCorrelationManagerConfigSchema>;
export type CorrelationMiddlewareConfig = z.infer<typeof correlationMiddlewareConfigSchema>;
export type HttpCorrelationMiddlewareConfig = z.infer<typeof httpCorrelationMiddlewareConfigSchema>;
export type MessageQueueCorrelationMiddlewareConfig = z.infer<typeof messageQueueCorrelationMiddlewareConfigSchema>;
export type CorrelationMiddlewareChainConfig = z.infer<typeof correlationMiddlewareChainConfigSchema>;
export type CorrelationManagerFactoryConfig = z.infer<typeof correlationManagerFactoryConfigSchema>;
export type CorrelationSystemConfig = z.infer<typeof correlationSystemConfigSchema>;
