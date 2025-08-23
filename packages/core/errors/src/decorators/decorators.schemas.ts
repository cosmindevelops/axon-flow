/**
 * Zod schemas for decorator validation
 */

import { z } from "zod";
import { OPERATION_RECOVERY_CONFIG_SCHEMA } from "../recovery/recovery.schemas.js";

/**
 * Decorator target schema
 */
export const DECORATOR_TARGET_SCHEMA = z.enum(["method", "class", "property", "parameter", "accessor"]);

/**
 * Recovery decorator metadata schema
 */
export const RECOVERY_DECORATOR_METADATA_SCHEMA = z.object({
  name: z.string(),
  target: DECORATOR_TARGET_SCHEMA,
  methodName: z.string().optional(),
  config: OPERATION_RECOVERY_CONFIG_SCHEMA,
  createdAt: z.date(),
  appliedBy: z.string().optional(),
  version: z.string().optional(),
});

/**
 * Method decorator configuration schema
 */
export const METHOD_DECORATOR_CONFIG_SCHEMA = OPERATION_RECOVERY_CONFIG_SCHEMA.extend({
  preserveMetadata: z.boolean().optional(),
  errorTransformer: z.any().optional(), // Error transformer function
  contextProvider: z.any().optional(), // Context provider function
  methodTimeout: z.number().int().positive().optional(),
  forceAsync: z.boolean().optional(),
  loggerName: z.string().optional(),
});

/**
 * Class decorator configuration schema
 */
export const CLASS_DECORATOR_CONFIG_SCHEMA = z.object({
  defaultRecovery: OPERATION_RECOVERY_CONFIG_SCHEMA.optional(),
  methodOverrides: z.record(z.string(), METHOD_DECORATOR_CONFIG_SCHEMA).optional(),
  excludeMethods: z.array(z.string()).optional(),
  includeMethods: z.array(z.string()).optional(),
  preserveMetadata: z.boolean().optional(),
  errorTransformer: z.any().optional(), // Error transformer function
  contextProvider: z.any().optional(), // Context provider function
});

/**
 * Property decorator configuration schema
 */
export const PROPERTY_DECORATOR_CONFIG_SCHEMA = z.object({
  getterRecovery: OPERATION_RECOVERY_CONFIG_SCHEMA.optional(),
  setterRecovery: OPERATION_RECOVERY_CONFIG_SCHEMA.optional(),
  defaultValue: z.unknown().optional(),
  enableCaching: z.boolean().optional(),
  cacheTTL: z.number().int().positive().optional(),
  errorTransformer: z.any().optional(), // Error transformer function
});

/**
 * Parameter decorator configuration schema
 */
export const PARAMETER_DECORATOR_CONFIG_SCHEMA = z.object({
  validator: z.any().optional(), // Validator function
  validationRecovery: OPERATION_RECOVERY_CONFIG_SCHEMA.optional(),
  defaultValue: z.unknown().optional(),
  errorTransformer: z.any().optional(), // Error transformer function
});

/**
 * Decorator execution context schema
 */
export const DECORATOR_EXECUTION_CONTEXT_SCHEMA = z.object({
  target: z.unknown(),
  propertyKey: z.union([z.string(), z.symbol()]).optional(),
  descriptor: z.any().optional(), // PropertyDescriptor
  args: z.array(z.unknown()).optional(),
  metadata: RECOVERY_DECORATOR_METADATA_SCHEMA,
  recoveryContext: z.any().optional(), // IRecoveryContext from recovery module
});

/**
 * Decorator execution result schema
 */
export const DECORATOR_EXECUTION_RESULT_SCHEMA = z.object({
  success: z.boolean(),
  value: z.unknown().optional(),
  error: z.any().optional(), // IBaseAxonError
  recoveryResult: z.any().optional(), // IRecoveryResult from recovery module
  duration: z.number().nonnegative(),
  fromRecovery: z.boolean(),
});

/**
 * Decorator interceptor schema
 */
export const DECORATOR_INTERCEPTOR_SCHEMA = z.object({
  name: z.string(),
  priority: z.number().int(),
  before: z.any().optional(), // Before interceptor function
  after: z.any().optional(), // After interceptor function
  onError: z.any().optional(), // Error interceptor function
  onRecovery: z.any().optional(), // Recovery interceptor function
});

/**
 * Decorator registry configuration schema
 */
export const DECORATOR_REGISTRY_CONFIG_SCHEMA = z.object({
  maxInterceptors: z.number().int().positive().optional().default(100),
  enableMetadataCollection: z.boolean().optional().default(true),
  metadataRetentionPeriod: z.number().int().positive().optional(),
  enableInterceptorChaining: z.boolean().optional().default(true),
  defaultInterceptorPriority: z.number().int().optional().default(1000),
});

/**
 * Decorator utilities configuration schema
 */
export const DECORATOR_UTILS_CONFIG_SCHEMA = z.object({
  enableMetadataExtraction: z.boolean().optional().default(true),
  enableAsyncWrapping: z.boolean().optional().default(true),
  preserveStackTraces: z.boolean().optional().default(true),
  enableContextInjection: z.boolean().optional().default(true),
  defaultTimeout: z.number().int().positive().optional(),
});

/**
 * Decorator config validator configuration schema
 */
export const DECORATOR_CONFIG_VALIDATOR_SCHEMA = z.object({
  enableStrictValidation: z.boolean().optional().default(false),
  allowUnknownProperties: z.boolean().optional().default(true),
  enableSchemaCoercion: z.boolean().optional().default(true),
  maxValidationErrors: z.number().int().positive().optional().default(10),
  enableDetailedErrors: z.boolean().optional().default(true),
});
