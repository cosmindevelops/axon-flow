/**
 * Base Configuration Builder Schemas
 * Zod validation schemas for builder pattern types
 */

import { z } from "zod";

/**
 * Config merge strategy schema
 */
export const CONFIG_MERGE_STRATEGY_SCHEMA = z.enum(["shallow", "deep", "replace", "custom"]);

/**
 * Configuration builder options schema
 */
export const CONFIG_BUILDER_OPTIONS_SCHEMA = z.object({
  platform: z.enum(["node", "browser", "react-native"]).optional(),
  enableValidationCache: z.boolean().optional().default(true),
  enableObjectPooling: z.boolean().optional().default(true),
});

/**
 * Builder validation options schema
 */
export const BUILDER_VALIDATION_OPTIONS_SCHEMA = z.object({
  strict: z.boolean().optional().default(true),
  allowUnknownKeys: z.boolean().optional().default(false),
  errorOnInvalidSchema: z.boolean().optional().default(true),
});

/**
 * Environment builder options schema
 */
export const ENVIRONMENT_BUILDER_OPTIONS_SCHEMA = z.object({
  prefix: z.string().optional(),
  transformKeys: z.boolean().optional().default(true),
  parseValues: z.boolean().optional().default(true),
  priority: z.number().min(0).max(1000).optional().default(100),
});

/**
 * File builder options schema
 */
export const FILE_BUILDER_OPTIONS_SCHEMA = z.object({
  format: z.string().optional(),
  watch: z.boolean().optional().default(false),
  priority: z.number().min(0).max(1000).optional().default(200),
});

/**
 * Memory builder options schema
 */
export const MEMORY_BUILDER_OPTIONS_SCHEMA = z.object({
  writable: z.boolean().optional().default(false),
  priority: z.number().min(0).max(1000).optional().default(50),
});

/**
 * LocalStorage builder options schema
 */
export const LOCALSTORAGE_BUILDER_OPTIONS_SCHEMA = z.object({
  keyPrefix: z.string().optional().default("axon-config"),
  priority: z.number().min(0).max(1000).optional().default(75),
});

/**
 * Cache builder options schema
 */
export const CACHE_BUILDER_OPTIONS_SCHEMA = z.object({
  ttl: z.number().positive().optional().default(300000),
  maxSize: z.number().positive().optional().default(1000),
});

/**
 * Custom builder options schema
 */
export const CUSTOM_BUILDER_OPTIONS_SCHEMA = z.object({
  priority: z.number().min(0).max(1000).optional().default(150),
  prefix: z.string().optional(),
});

/**
 * Builder state schema
 */
export const BUILDER_STATE_SCHEMA = z.object({
  sources: z.array(
    z.object({
      repository: z.any(), // IConfigRepository - can't validate interface
      priority: z.number().min(0).max(1000),
      prefix: z.string().optional(),
      enabled: z.boolean(),
    }),
  ),
  mergeStrategy: CONFIG_MERGE_STRATEGY_SCHEMA,
  platform: z.enum(["node", "browser", "react-native"]),
  validationOptions: BUILDER_VALIDATION_OPTIONS_SCHEMA,
});
