/**
 * Decorator validation schemas
 *
 * Zod schemas for validating decorator configurations and metadata
 */

import { z } from "zod";
import type { ContainerLifecycle } from "../container/container.types.js";

/**
 * Container lifecycle validation schema
 */
export const decoratorContainerLifecycleSchema = z.enum([
  "singleton",
  "transient",
  "scoped",
] as const) satisfies z.ZodType<ContainerLifecycle>;

/**
 * Decorator DI token validation schema - simplified to avoid complex function validation
 */
export const decoratorDITokenSchema = z.union([
  z.string().min(1, "Token string cannot be empty"),
  z.symbol(),
  z.any().refine((val) => typeof val === "function", "Must be a function"),
]);

/**
 * Injectable decorator options validation schema
 */
export const injectableOptionsSchema = z.object({
  lifecycle: decoratorContainerLifecycleSchema.optional(),
  token: decoratorDITokenSchema.optional(),
  factory: z
    .any()
    .refine((val) => typeof val === "function", "Must be a function")
    .optional(),
  dependencies: z.array(decoratorDITokenSchema).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Inject decorator options validation schema
 */
export const injectOptionsSchema = z.object({
  token: decoratorDITokenSchema.optional(),
  optional: z.boolean().optional(),
  defaultValue: z.unknown().optional(),
});

/**
 * Property inject options validation schema
 */
export const propertyInjectOptionsSchema = injectOptionsSchema.extend({
  lazy: z.boolean().optional(),
});

/**
 * Parameter injection metadata validation schema
 */
export const parameterInjectMetadataSchema = z.object({
  parameterIndex: z.number().int().nonnegative(),
  token: decoratorDITokenSchema.optional(),
  parameterType: z.unknown().optional(),
  optional: z.boolean(),
  defaultValue: z.unknown().optional(),
});

/**
 * Property injection metadata validation schema
 */
export const propertyInjectMetadataSchema = z.object({
  propertyKey: z.union([z.string(), z.symbol()]),
  token: decoratorDITokenSchema.optional(),
  propertyType: z.unknown().optional(),
  optional: z.boolean(),
  defaultValue: z.unknown().optional(),
  lazy: z.boolean(),
});

/**
 * Injectable class metadata validation schema
 */
export const injectableMetadataSchema = z.object({
  options: injectableOptionsSchema,
  parameterMetadata: z.array(parameterInjectMetadataSchema),
  propertyMetadata: z.array(propertyInjectMetadataSchema),
  parameterTypes: z.array(z.unknown()).optional(),
  target: z.any().refine((val) => typeof val === "function", "Must be a constructor function"),
});

/**
 * Factory decorator options validation schema
 */
export const factoryOptionsSchema = z.object({
  factory: z.any().refine((val) => typeof val === "function", "Must be a function"),
  dependencies: z.array(decoratorDITokenSchema).optional(),
  lifecycle: decoratorContainerLifecycleSchema.optional(),
});

/**
 * Scope decorator options validation schema
 */
export const scopeOptionsSchema = z.object({
  scopeId: z.string().optional(),
  isolation: z.enum(["strict", "inherited"]).optional(),
});

/**
 * Metadata statistics validation schema
 */
export const metadataStatsSchema = z.object({
  injectableClasses: z.number().int().nonnegative(),
  parameterInjections: z.number().int().nonnegative(),
  propertyInjections: z.number().int().nonnegative(),
  hasDesignTypeSupport: z.boolean(),
  platform: z.enum(["node", "browser", "unknown"]),
});

/**
 * Decorator resolution context validation schema
 */
export const decoratorResolutionContextSchema = z.object({
  target: z.any().refine((val) => typeof val === "function", "Must be a constructor function"),
  container: z.unknown().optional(),
  metadata: injectableMetadataSchema,
  resolveOptional: z.boolean(),
});

/**
 * Decorator configuration validation schema
 */
export const decoratorValidationConfigSchema = z.object({
  autoRegister: z.boolean().optional(),
  defaultLifecycle: decoratorContainerLifecycleSchema.optional(),
  strictMode: z.boolean().optional(),
  enablePropertyInjection: z.boolean().optional(),
  enableLazyInjection: z.boolean().optional(),
  warnMissingDesignTypes: z.boolean().optional(),
});

/**
 * Default decorator configuration
 */
export const DEFAULT_DECORATOR_SCHEMA_CONFIG = decoratorValidationConfigSchema.parse({
  autoRegister: false,
  defaultLifecycle: "transient" as const,
  strictMode: true,
  enablePropertyInjection: true,
  enableLazyInjection: true,
  warnMissingDesignTypes: true,
});

/**
 * Default injectable options
 */
export const DEFAULT_INJECTABLE_OPTIONS = injectableOptionsSchema.parse({
  lifecycle: "transient" as const,
  dependencies: [],
  metadata: {},
});

// Type guards and validation helpers

/**
 * Type guard to check if a value is injectable options
 */
export function isInjectableOptions(value: unknown): value is z.infer<typeof injectableOptionsSchema> {
  return injectableOptionsSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is inject options
 */
export function isInjectOptions(value: unknown): value is z.infer<typeof injectOptionsSchema> {
  return injectOptionsSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is property inject options
 */
export function isPropertyInjectOptions(value: unknown): value is z.infer<typeof propertyInjectOptionsSchema> {
  return propertyInjectOptionsSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is injectable metadata
 */
export function isInjectableMetadata(value: unknown): value is z.infer<typeof injectableMetadataSchema> {
  return injectableMetadataSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is decorator configuration
 */
export function isDecoratorConfig(value: unknown): value is z.infer<typeof decoratorValidationConfigSchema> {
  return decoratorValidationConfigSchema.safeParse(value).success;
}

/**
 * Validate and normalize injectable options
 */
export function validateInjectableOptions(options: unknown): z.infer<typeof injectableOptionsSchema> {
  const result = injectableOptionsSchema.safeParse(options);
  if (!result.success) {
    throw new Error(`Invalid injectable options: ${result.error.message}`);
  }
  return { ...DEFAULT_INJECTABLE_OPTIONS, ...result.data };
}

/**
 * Validate and normalize inject options
 */
export function validateInjectOptions(options: unknown): z.infer<typeof injectOptionsSchema> {
  const result = injectOptionsSchema.safeParse(options);
  if (!result.success) {
    throw new Error(`Invalid inject options: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Validate and normalize property inject options
 */
export function validatePropertyInjectOptions(options: unknown): z.infer<typeof propertyInjectOptionsSchema> {
  const result = propertyInjectOptionsSchema.safeParse(options);
  if (!result.success) {
    throw new Error(`Invalid property inject options: ${result.error.message}`);
  }
  return { lazy: false, ...result.data };
}

/**
 * Validate and normalize decorator configuration
 */
export function validateDecoratorConfig(config: unknown): z.infer<typeof decoratorValidationConfigSchema> {
  const result = decoratorValidationConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid decorator configuration: ${result.error.message}`);
  }
  return { ...DEFAULT_DECORATOR_SCHEMA_CONFIG, ...result.data };
}

/**
 * Validate DI token
 */
export function validateDecoratorDIToken(token: unknown) {
  return decoratorDITokenSchema.parse(token);
}

/**
 * Validate parameter injection metadata
 */
export function validateParameterInjectMetadata(metadata: unknown): z.infer<typeof parameterInjectMetadataSchema> {
  const result = parameterInjectMetadataSchema.safeParse(metadata);
  if (!result.success) {
    throw new Error(`Invalid parameter injection metadata: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Validate property injection metadata
 */
export function validatePropertyInjectMetadata(metadata: unknown): z.infer<typeof propertyInjectMetadataSchema> {
  const result = propertyInjectMetadataSchema.safeParse(metadata);
  if (!result.success) {
    throw new Error(`Invalid property injection metadata: ${result.error.message}`);
  }
  return result.data;
}
