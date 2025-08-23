/**
 * Platform compatibility validation schemas
 *
 * Zod schemas for validating platform configurations and capabilities
 */

import { z } from "zod";
import type { PlatformType } from "./platform.types.js";

/**
 * Platform type validation schema
 */
export const platformTypeSchema = z.enum([
  "node",
  "browser",
  "worker",
  "deno",
  "bun",
  "unknown",
] as const) satisfies z.ZodType<PlatformType>;

/**
 * Node.js version information validation schema
 */
export const nodeVersionInfoSchema = z.object({
  major: z.number().int().nonnegative(),
  minor: z.number().int().nonnegative(),
  patch: z.number().int().nonnegative(),
  version: z.string().min(1),
  esModulesSupported: z.boolean(),
  weakRefSupported: z.boolean(),
  finalizationRegistrySupported: z.boolean(),
});

/**
 * Browser information validation schema
 */
export const browserInfoSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  userAgent: z.string(),
  classSupported: z.boolean(),
  weakMapSupported: z.boolean(),
  symbolSupported: z.boolean(),
  reflectSupported: z.boolean(),
  proxySupported: z.boolean(),
});

/**
 * Memory management capabilities validation schema
 */
export const memoryManagementCapabilitiesSchema = z.object({
  weakRef: z.boolean(),
  finalizationRegistry: z.boolean(),
  manualGC: z.boolean(),
});

/**
 * Platform capabilities validation schema
 */
export const platformCapabilitiesSchema = z.object({
  platform: platformTypeSchema,
  nodeInfo: nodeVersionInfoSchema.optional(),
  browserInfo: browserInfoSchema.optional(),
  decoratorSupport: z.boolean(),
  metadataSupport: z.boolean(),
  weakCollectionSupport: z.boolean(),
  symbolSupport: z.boolean(),
  classSupport: z.boolean(),
  asyncSupport: z.boolean(),
  performanceSupport: z.boolean(),
  memoryManagement: memoryManagementCapabilitiesSchema,
});

/**
 * Memory management configuration validation schema
 */
export const memoryManagementConfigSchema = z.object({
  useWeakReferences: z.boolean().optional(),
  enableCleanup: z.boolean().optional(),
  gcHintInterval: z.number().int().positive().optional(),
});

/**
 * Decorator configuration validation schema
 */
export const decoratorConfigSchema = z.object({
  useLegacySyntax: z.boolean().optional(),
  enableMetadataPolyfill: z.boolean().optional(),
});

/**
 * Platform configuration validation schema
 */
export const platformConfigSchema = z.object({
  platform: platformTypeSchema,
  enableMetadataFallback: z.boolean().optional(),
  enablePerformanceOptimization: z.boolean().optional(),
  memoryManagement: memoryManagementConfigSchema.optional(),
  decorators: decoratorConfigSchema.optional(),
});

/**
 * Feature detection results validation schema
 */
export const featureDetectionSchema = z.object({
  feature: z.string().min(1),
  supported: z.boolean(),
  method: z.enum(["typeof", "try-catch", "api-check", "user-agent"]),
  details: z.string().optional(),
  error: z.string().optional(),
});

/**
 * Platform validation results validation schema
 */
export const platformValidationSchema = z.object({
  platform: platformTypeSchema,
  compatibilityScore: z.number().min(0).max(1),
  features: z.array(featureDetectionSchema),
  criticalFailures: z.array(z.string()),
  warnings: z.array(z.string()),
  recommendedConfig: platformConfigSchema,
});

/**
 * Performance timing metrics validation schema
 */
export const performanceTimingSchema = z.object({
  average: z.number().nonnegative(),
  min: z.number().nonnegative(),
  max: z.number().nonnegative(),
  samples: z.number().int().nonnegative(),
});

/**
 * Performance throughput metrics validation schema
 */
export const performanceThroughputSchema = z.object({
  average: z.number().nonnegative(),
  throughput: z.number().nonnegative(),
});

/**
 * Performance memory metrics validation schema
 */
export const performanceMemorySchema = z.object({
  containerOverhead: z.number().int().nonnegative(),
  perRegistration: z.number().int().nonnegative(),
  perResolution: z.number().int().nonnegative(),
});

/**
 * Platform performance validation schema
 */
export const platformPerformanceSchema = z.object({
  platform: platformTypeSchema,
  containerCreation: performanceTimingSchema,
  registration: performanceThroughputSchema,
  resolution: performanceThroughputSchema.extend({
    cacheHitRatio: z.number().min(0).max(1),
  }),
  memory: performanceMemorySchema,
});

/**
 * Platform error validation schema
 */
export const platformErrorSchema = z.object({
  name: z.string(),
  message: z.string(),
  stack: z.string().optional(),
  platform: platformTypeSchema,
  feature: z.string().optional(),
  workaround: z.string().optional(),
  critical: z.boolean(),
});

/**
 * Default memory management configuration
 */
export const DEFAULT_MEMORY_MANAGEMENT_CONFIG = memoryManagementConfigSchema.parse({
  useWeakReferences: true,
  enableCleanup: true,
  gcHintInterval: 60000, // 1 minute
});

/**
 * Default decorator configuration
 */
export const DEFAULT_DECORATOR_CONFIG = decoratorConfigSchema.parse({
  useLegacySyntax: false,
  enableMetadataPolyfill: true,
});

/**
 * Default platform configuration
 */
export const DEFAULT_PLATFORM_CONFIG = platformConfigSchema.parse({
  platform: "unknown" as const,
  enableMetadataFallback: true,
  enablePerformanceOptimization: true,
  memoryManagement: DEFAULT_MEMORY_MANAGEMENT_CONFIG,
  decorators: DEFAULT_DECORATOR_CONFIG,
});

// Type guards and validation helpers

/**
 * Type guard to check if a value is platform capabilities
 */
export function isPlatformCapabilities(value: unknown): value is z.infer<typeof platformCapabilitiesSchema> {
  return platformCapabilitiesSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is platform configuration
 */
export function isPlatformConfig(value: unknown): value is z.infer<typeof platformConfigSchema> {
  return platformConfigSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is platform validation
 */
export function isPlatformValidation(value: unknown): value is z.infer<typeof platformValidationSchema> {
  return platformValidationSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is platform performance
 */
export function isPlatformPerformance(value: unknown): value is z.infer<typeof platformPerformanceSchema> {
  return platformPerformanceSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is platform error
 */
export function isPlatformError(value: unknown): value is z.infer<typeof platformErrorSchema> {
  return platformErrorSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is node version info
 */
export function isNodeVersionInfo(value: unknown): value is z.infer<typeof nodeVersionInfoSchema> {
  return nodeVersionInfoSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is browser info
 */
export function isBrowserInfo(value: unknown): value is z.infer<typeof browserInfoSchema> {
  return browserInfoSchema.safeParse(value).success;
}

/**
 * Validate and normalize platform configuration
 */
export function validatePlatformConfig(config: unknown): z.infer<typeof platformConfigSchema> {
  const result = platformConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid platform configuration: ${result.error.message}`);
  }
  return { ...DEFAULT_PLATFORM_CONFIG, ...result.data };
}

/**
 * Validate platform capabilities
 */
export function validatePlatformCapabilities(capabilities: unknown): z.infer<typeof platformCapabilitiesSchema> {
  const result = platformCapabilitiesSchema.safeParse(capabilities);
  if (!result.success) {
    throw new Error(`Invalid platform capabilities: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Validate platform type
 */
export function validatePlatformType(platform: unknown): PlatformType {
  const result = platformTypeSchema.safeParse(platform);
  if (!result.success) {
    throw new Error(`Invalid platform type: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Validate feature detection results
 */
export function validateFeatureDetection(detection: unknown): z.infer<typeof featureDetectionSchema> {
  const result = featureDetectionSchema.safeParse(detection);
  if (!result.success) {
    throw new Error(`Invalid feature detection: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Validate platform validation results
 */
export function validatePlatformValidation(validation: unknown): z.infer<typeof platformValidationSchema> {
  const result = platformValidationSchema.safeParse(validation);
  if (!result.success) {
    throw new Error(`Invalid platform validation: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Validate platform performance metrics
 */
export function validatePlatformPerformance(performance: unknown): z.infer<typeof platformPerformanceSchema> {
  const result = platformPerformanceSchema.safeParse(performance);
  if (!result.success) {
    throw new Error(`Invalid platform performance: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Validate node version information
 */
export function validateNodeVersionInfo(info: unknown): z.infer<typeof nodeVersionInfoSchema> {
  const result = nodeVersionInfoSchema.safeParse(info);
  if (!result.success) {
    throw new Error(`Invalid node version info: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Validate browser information
 */
export function validateBrowserInfo(info: unknown): z.infer<typeof browserInfoSchema> {
  const result = browserInfoSchema.safeParse(info);
  if (!result.success) {
    throw new Error(`Invalid browser info: ${result.error.message}`);
  }
  return result.data;
}
