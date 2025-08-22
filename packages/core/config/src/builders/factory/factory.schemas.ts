/**
 * Configuration Builder Factory Schemas
 * Zod validation schemas for factory pattern types
 */

import { z } from "zod";

/**
 * Environment schema
 */
export const ENVIRONMENT_SCHEMA = z.enum(["development", "production", "test"]);

/**
 * Factory options schema
 */
export const FACTORY_OPTIONS_SCHEMA = z.object({
  environment: ENVIRONMENT_SCHEMA.optional(),
  platform: z.enum(["node", "browser", "react-native"]).optional(),
  strictMode: z.boolean().optional().default(false),
  customDetection: z.function().optional(),
  validation: z
    .object({
      warnOnUnknownEnvironment: z.boolean().optional().default(true),
      requireExplicitProduction: z.boolean().optional().default(false),
    })
    .optional(),
});

/**
 * Test fixture schema
 */
export const TEST_FIXTURE_SCHEMA = z.object({
  name: z.string().min(1),
  config: z.record(z.unknown()),
  description: z.string().optional(),
});

/**
 * Builder registry entry schema
 */
export const BUILDER_REGISTRY_ENTRY_SCHEMA = z.object({
  environment: ENVIRONMENT_SCHEMA,
  builderClass: z.any(), // Constructor function - can't validate further
  priority: z.number().min(0).max(100),
});

/**
 * Factory create options schema
 */
export const FACTORY_CREATE_OPTIONS_SCHEMA = z.object({
  detectEnvironment: z.boolean().optional().default(true),
  throwOnMissing: z.boolean().optional().default(false),
  useCache: z.boolean().optional().default(true),
});

/**
 * Environment detection result schema
 */
export const ENVIRONMENT_DETECTION_RESULT_SCHEMA = z.object({
  environment: ENVIRONMENT_SCHEMA,
  confidence: z.number().min(0).max(1),
  source: z.enum(["explicit", "environment", "default", "custom"]),
  platform: z.enum(["node", "browser", "react-native"]),
});
