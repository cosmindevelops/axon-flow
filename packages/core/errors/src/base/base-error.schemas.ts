/**
 * Zod schemas for base error validation
 */

import { z } from "zod";
import { ErrorCategory, ErrorSeverity } from "./base-error.types.js";

/**
 * Error severity schema
 */
export const ERROR_SEVERITY_SCHEMA = z.nativeEnum(ErrorSeverity);

/**
 * Error category schema
 */
export const ERROR_CATEGORY_SCHEMA = z.nativeEnum(ErrorCategory);

/**
 * Environment schema
 */
export const ERROR_ENVIRONMENT_SCHEMA = z.object({
  platform: z.enum(["node", "browser", "unknown"]),
  version: z.string().optional(),
  userAgent: z.string().optional(),
});

/**
 * Enhanced error context schema
 */
export const ENHANCED_ERROR_CONTEXT_SCHEMA = z.object({
  correlationId: z.string().optional(),
  timestamp: z.string(),
  severity: ERROR_SEVERITY_SCHEMA,
  category: ERROR_CATEGORY_SCHEMA,
  component: z.string().optional(),
  operation: z.string().optional(),
  stackTrace: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  environment: ERROR_ENVIRONMENT_SCHEMA.optional(),
});

/**
 * Error code structure schema
 */
export const ERROR_CODE_SCHEMA = z.object({
  domain: z.string().min(1).max(20),
  category: z.string().min(1).max(30),
  specific: z.string().min(1).max(50),
  numeric: z.number().int().positive().optional(),
});

/**
 * Serialized error schema (using z.lazy for recursion)
 */
export const SERIALIZED_ERROR_SCHEMA: z.ZodType<any> = z.lazy(() =>
  z.object({
    name: z.string(),
    message: z.string(),
    code: z.string(),
    severity: ERROR_SEVERITY_SCHEMA,
    category: ERROR_CATEGORY_SCHEMA,
    context: ENHANCED_ERROR_CONTEXT_SCHEMA,
    stack: z.string().optional(),
    cause: SERIALIZED_ERROR_SCHEMA.optional(),
    errors: z.array(SERIALIZED_ERROR_SCHEMA).optional(),
    timestamp: z.string(),
    version: z.string(),
  }),
);

/**
 * Error system configuration schema
 */
export const ERROR_SYSTEM_CONFIG_SCHEMA = z.object({
  enablePooling: z.boolean().optional(),
  poolSize: z.number().int().positive().optional(),
  enableStackTrace: z.boolean().optional(),
  maxStackDepth: z.number().int().positive().optional(),
  defaultSeverity: ERROR_SEVERITY_SCHEMA.optional(),
  defaultCategory: ERROR_CATEGORY_SCHEMA.optional(),
  enableCorrelation: z.boolean().optional(),
  enableLocalization: z.boolean().optional(),
  locale: z.string().optional(),
});

/**
 * Error metrics schema
 */
export const ERROR_METRICS_SCHEMA = z.object({
  totalErrors: z.number().int().nonnegative(),
  errorsBySeverity: z.record(ERROR_SEVERITY_SCHEMA, z.number().int().nonnegative()),
  errorsByCategory: z.record(ERROR_CATEGORY_SCHEMA, z.number().int().nonnegative()),
  averageCreationTime: z.number().nonnegative(),
  poolHitRate: z.number().min(0).max(1).optional(),
});

/**
 * Validation helpers
 */
export const validateErrorContext = (context: unknown) => {
  return ENHANCED_ERROR_CONTEXT_SCHEMA.safeParse(context);
};

export const validateSerializedError = (error: unknown) => {
  return SERIALIZED_ERROR_SCHEMA.safeParse(error);
};

export const validateErrorCode = (code: unknown) => {
  return ERROR_CODE_SCHEMA.safeParse(code);
};

export const validateErrorConfig = (config: unknown) => {
  return ERROR_SYSTEM_CONFIG_SCHEMA.safeParse(config);
};
