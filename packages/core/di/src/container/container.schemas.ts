/**
 * Container validation schemas
 *
 * Zod schemas for validating container configurations and registrations
 */

import { z } from "zod";

/**
 * Container lifecycle validation schema
 */
export const CONTAINER_LIFECYCLE_SCHEMA = z.enum(["singleton", "transient", "scoped"]);

/**
 * DI token validation schema - simplified to avoid complex function validation
 */
export const DI_TOKEN_SCHEMA = z.union([
  z.string().min(1, "Token string cannot be empty").refine(
    (val) => val.trim().length > 0,
    { message: "Token string cannot be empty" }
  ),
  z.symbol(),
  z.any().refine((val) => typeof val === "function", "Must be a function"),
]);

/**
 * Container registration options validation schema
 */
export const CONTAINER_REGISTRATION_OPTIONS_SCHEMA = z.object({
  lifecycle: CONTAINER_LIFECYCLE_SCHEMA.optional(),
  factory: z
    .any()
    .refine((val) => typeof val === "function", "Must be a function")
    .optional(),
  dependencies: z.array(DI_TOKEN_SCHEMA).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Container configuration validation schema
 */
export const CONTAINER_CONFIG_SCHEMA = z.object({
  name: z.string().min(1, "Container name cannot be empty").optional(),
  strictMode: z.boolean().optional(),
  defaultLifecycle: CONTAINER_LIFECYCLE_SCHEMA.optional(),
  enableMetrics: z.boolean().optional(),
  maxResolutionDepth: z
    .number()
    .int()
    .positive("Resolution depth must be positive")
    .max(100, "Resolution depth too large")
    .optional(),
  enableCache: z.boolean().optional(),
  autoDispose: z.boolean().optional(),
});

/**
 * Resolution context validation schema (base without parent to avoid circular reference)
 */
const BASE_RESOLUTION_CONTEXT_SCHEMA = z.object({
  resolutionPath: z.array(DI_TOKEN_SCHEMA),
  depth: z.number().int().min(0, "Depth cannot be negative"),
  scopedInstances: z.map(DI_TOKEN_SCHEMA, z.unknown()).optional(),
  startTime: z.number().positive("Start time must be positive"),
});

/**
 * Full resolution context validation schema with lazy parent reference
 */
export const RESOLUTION_CONTEXT_SCHEMA: z.ZodType<any> = BASE_RESOLUTION_CONTEXT_SCHEMA.extend({
  parent: z.lazy((): z.ZodType<any> => RESOLUTION_CONTEXT_SCHEMA).optional(),
});

/**
 * Container metrics validation schema
 */
export const CONTAINER_METRICS_SCHEMA = z.object({
  totalRegistrations: z.number().int().min(0, "Total registrations cannot be negative"),
  totalResolutions: z.number().int().min(0, "Total resolutions cannot be negative"),
  averageResolutionTime: z.number().min(0, "Average resolution time cannot be negative"),
  peakResolutionTime: z.number().min(0, "Peak resolution time cannot be negative"),
  cacheHitRatio: z.number().min(0, "Cache hit ratio cannot be negative").max(1, "Cache hit ratio cannot exceed 1"),
  memoryUsage: z.object({
    singletonCount: z.number().int().min(0, "Singleton count cannot be negative"),
    estimatedBytes: z.number().int().min(0, "Estimated bytes cannot be negative"),
  }),
});

/**
 * Default container configuration
 */
export const DEFAULT_CONTAINER_CONFIG = Object.freeze({
  strictMode: true,
  defaultLifecycle: "transient" as const,
  enableMetrics: true,
  maxResolutionDepth: 20,
  enableCache: true,
  autoDispose: false,
} as const);

/**
 * Validate container configuration
 */
export function validateContainerConfig(config: unknown) {
  return CONTAINER_CONFIG_SCHEMA.parse(config);
}

/**
 * Validate registration options
 */
export function validateRegistrationOptions(options: unknown) {
  return CONTAINER_REGISTRATION_OPTIONS_SCHEMA.parse(options);
}

/**
 * Validate DI token
 */
export function validateDIToken(token: unknown) {
  return DI_TOKEN_SCHEMA.parse(token);
}

/**
 * Create default registration options
 */
export function createDefaultRegistrationOptions(lifecycle?: "singleton" | "transient" | "scoped") {
  return {
    lifecycle: lifecycle ?? DEFAULT_CONTAINER_CONFIG.defaultLifecycle,
    dependencies: [],
    metadata: {},
  };
}
