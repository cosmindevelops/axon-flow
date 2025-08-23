/**
 * Factory pattern validation schemas
 *
 * Zod schemas for validating factory configurations, metadata, and registration options.
 */

import { z } from "zod";
import type { ContainerLifecycle } from "../container/container.types.js";

/**
 * Schema for container lifecycle values
 */
export const containerLifecycleSchema = z.enum([
  "singleton",
  "transient",
  "scoped",
] as const) satisfies z.ZodType<ContainerLifecycle>;

/**
 * Schema for factory performance metrics
 */
export const factoryPerformanceMetricsSchema = z.object({
  totalCreated: z.number().int().nonnegative(),
  averageCreationTime: z.number().nonnegative(),
  peakCreationTime: z.number().nonnegative(),
  lastCreationTime: z.number().nonnegative(),
  successRate: z.number().min(0).max(1),
  estimatedMemoryUsage: z.number().int().nonnegative(),
});

/**
 * Schema for factory metadata
 */
export const factoryMetadataSchema = z.object({
  factoryType: z.string().min(1),
  createdAt: z.date(),
  performance: factoryPerformanceMetricsSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Schema for factory registration options
 */
export const factoryRegistrationOptionsSchema = z.object({
  lifecycle: containerLifecycleSchema.optional(),
  enableMetrics: z.boolean().optional(),
  priority: z.number().int().optional(),
  tags: z.array(z.string()).readonly().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  enableCaching: z.boolean().optional(),
  maxCacheSize: z.number().int().positive().optional(),
});

/**
 * Schema for factory registry metrics
 */
export const factoryRegistryMetricsSchema = z.object({
  totalFactories: z.number().int().nonnegative(),
  totalAbstractFactories: z.number().int().nonnegative(),
  totalInstancesCreated: z.number().int().nonnegative(),
  averageFactoryCreationTime: z.number().nonnegative(),
  cacheHitRatio: z.number().min(0).max(1),
  factoryMemoryUsage: z.number().int().nonnegative(),
});

/**
 * Schema for factory resolver metrics
 */
export const factoryResolverMetricsSchema = z.object({
  totalResolutions: z.number().int().nonnegative(),
  successfulResolutions: z.number().int().nonnegative(),
  averageResolutionTime: z.number().nonnegative(),
  factoryHitRatio: z.number().min(0).max(1),
});

/**
 * Schema for factory configuration
 */
export const factoryConfigSchema = z.object({
  enableCaching: z.boolean().optional(),
  defaultCacheSize: z.number().int().positive().optional(),
  enableMetrics: z.boolean().optional(),
  maxCreationTime: z.number().int().positive().optional(),
  autoDispose: z.boolean().optional(),
  resolutionTimeout: z.number().int().positive().optional(),
});

/**
 * Schema for factory context
 */
export const factoryContextSchema = z.object({
  resolutionContext: z.unknown().optional(), // IResolutionContext is complex, so we'll use unknown
  config: factoryConfigSchema,
  createdAt: z.date(),
  correlationId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Provider Configuration Schemas

/**
 * Schema for auth provider configuration
 */
export const authProviderConfigSchema = z.object({
  provider: z.string().min(1),
  config: z.record(z.string(), z.unknown()),
  enableCaching: z.boolean().optional(),
  timeout: z.number().int().positive().optional(),
});

/**
 * Schema for billing provider configuration
 */
export const billingProviderConfigSchema = z.object({
  provider: z.string().min(1),
  config: z.record(z.string(), z.unknown()),
  enableWebhooks: z.boolean().optional(),
  webhookUrl: z.string().url().optional(),
});

/**
 * Schema for storage provider configuration
 */
export const storageProviderConfigSchema = z.object({
  provider: z.string().min(1),
  config: z.record(z.string(), z.unknown()),
  defaultBucket: z.string().optional(),
  enableEncryption: z.boolean().optional(),
});

/**
 * Schema for rate limiting configuration
 */
export const rateLimitingConfigSchema = z.object({
  requestsPerMinute: z.number().int().positive(),
  tokensPerMinute: z.number().int().positive(),
});

/**
 * Schema for LLM provider configuration
 */
export const llmProviderConfigSchema = z.object({
  provider: z.string().min(1),
  config: z.record(z.string(), z.unknown()),
  defaultModel: z.string().optional(),
  enableStreaming: z.boolean().optional(),
  rateLimiting: rateLimitingConfigSchema.optional(),
});

// Type guards for factory types

/**
 * Type guard to check if a value is factory metadata
 */
export function isFactoryMetadata(value: unknown): value is z.infer<typeof factoryMetadataSchema> {
  return factoryMetadataSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is factory registration options
 */
export function isFactoryRegistrationOptions(
  value: unknown,
): value is z.infer<typeof factoryRegistrationOptionsSchema> {
  return factoryRegistrationOptionsSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is factory config
 */
export function isFactoryConfig(value: unknown): value is z.infer<typeof factoryConfigSchema> {
  return factoryConfigSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is auth provider config
 */
export function isAuthProviderConfig(value: unknown): value is z.infer<typeof authProviderConfigSchema> {
  return authProviderConfigSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is billing provider config
 */
export function isBillingProviderConfig(value: unknown): value is z.infer<typeof billingProviderConfigSchema> {
  return billingProviderConfigSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is storage provider config
 */
export function isStorageProviderConfig(value: unknown): value is z.infer<typeof storageProviderConfigSchema> {
  return storageProviderConfigSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is LLM provider config
 */
export function isLLMProviderConfig(value: unknown): value is z.infer<typeof llmProviderConfigSchema> {
  return llmProviderConfigSchema.safeParse(value).success;
}

// Default values and validation helpers

/**
 * Default factory registration options
 */
export const DEFAULT_FACTORY_REGISTRATION_OPTIONS = factoryRegistrationOptionsSchema.parse({
  lifecycle: "transient" as const,
  enableMetrics: true,
  priority: 0,
  tags: [],
  metadata: {},
  enableCaching: false,
  maxCacheSize: 100,
});

/**
 * Default factory configuration
 */
export const DEFAULT_FACTORY_CONFIG = factoryConfigSchema.parse({
  enableCaching: false,
  defaultCacheSize: 100,
  enableMetrics: true,
  maxCreationTime: 5000,
  autoDispose: true,
  resolutionTimeout: 10000,
});

/**
 * Validate and normalize factory registration options
 */
export function validateFactoryRegistrationOptions(options: unknown): z.infer<typeof factoryRegistrationOptionsSchema> {
  const result = factoryRegistrationOptionsSchema.safeParse(options);
  if (!result.success) {
    throw new Error(`Invalid factory registration options: ${result.error.message}`);
  }
  return { ...DEFAULT_FACTORY_REGISTRATION_OPTIONS, ...result.data };
}

/**
 * Validate and normalize factory configuration
 */
export function validateFactoryConfig(config: unknown): z.infer<typeof factoryConfigSchema> {
  const result = factoryConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid factory configuration: ${result.error.message}`);
  }
  return { ...DEFAULT_FACTORY_CONFIG, ...result.data };
}

/**
 * Validate auth provider configuration
 */
export function validateAuthProviderConfig(config: unknown): z.infer<typeof authProviderConfigSchema> {
  const result = authProviderConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid auth provider configuration: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Validate billing provider configuration
 */
export function validateBillingProviderConfig(config: unknown): z.infer<typeof billingProviderConfigSchema> {
  const result = billingProviderConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid billing provider configuration: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Validate storage provider configuration
 */
export function validateStorageProviderConfig(config: unknown): z.infer<typeof storageProviderConfigSchema> {
  const result = storageProviderConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid storage provider configuration: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Validate LLM provider configuration
 */
export function validateLLMProviderConfig(config: unknown): z.infer<typeof llmProviderConfigSchema> {
  const result = llmProviderConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid LLM provider configuration: ${result.error.message}`);
  }
  return result.data;
}
