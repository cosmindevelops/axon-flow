/**
 * Environment Configuration Repository Schemas
 * Zod validation schemas for environment variable configuration management
 */

import { z } from "zod";

/**
 * Environment transform schema
 */
export const ENVIRONMENT_TRANSFORM_SCHEMA = z.object({
  camelCase: z.boolean().optional().default(true),
  parseNumbers: z.boolean().optional().default(true),
  parseArrays: z.boolean().optional().default(true),
  parseJSON: z.boolean().optional().default(false),
});

/**
 * Environment validation schema
 */
export const ENVIRONMENT_VALIDATION_SCHEMA = z.object({
  required: z.array(z.string()).optional(),
  optional: z.array(z.string()).optional(),
  whitelist: z.array(z.string()).optional(),
});

/**
 * Environment options schema
 */
export const ENVIRONMENT_OPTIONS_SCHEMA = z.object({
  prefix: z.string().optional(),
  transform: ENVIRONMENT_TRANSFORM_SCHEMA.optional(),
  validation: ENVIRONMENT_VALIDATION_SCHEMA.optional(),
  throwOnMissing: z.boolean().optional().default(false),
});
