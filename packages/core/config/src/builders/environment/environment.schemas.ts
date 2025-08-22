/**
 * Environment-Specific Builder Schemas
 * Zod validation schemas for environment-specific builder types
 */

import { z } from "zod";

/**
 * Test fixture schema
 */
export const TEST_TYPE_SCHEMA = z.enum(["unit", "integration", "e2e", "performance", "minimal"]);

/**
 * Environment builder configuration schema
 */
export const ENVIRONMENT_BUILDER_CONFIG_SCHEMA = z.object({
  developmentMode: z.boolean().optional(),
  enableWatching: z.boolean().optional(),
  enableHotReload: z.boolean().optional(),
  maxCachedBuilders: z.number().min(0).optional(),
  failFast: z.boolean().optional(),
});

/**
 * Development builder options schema
 */
export const DEVELOPMENT_BUILDER_OPTIONS_SCHEMA = ENVIRONMENT_BUILDER_CONFIG_SCHEMA.extend({
  developmentMode: z.literal(true),
  enableWatching: z.literal(true),
  enableHotReload: z.literal(true),
  failFast: z.literal(false),
});

/**
 * Production builder options schema
 */
export const PRODUCTION_BUILDER_OPTIONS_SCHEMA = ENVIRONMENT_BUILDER_CONFIG_SCHEMA.extend({
  developmentMode: z.literal(false),
  enableWatching: z.literal(false),
  enableHotReload: z.literal(false),
  failFast: z.literal(true),
});

/**
 * Test builder options schema
 */
export const TEST_BUILDER_OPTIONS_SCHEMA = ENVIRONMENT_BUILDER_CONFIG_SCHEMA.extend({
  developmentMode: z.literal(true),
  enableWatching: z.literal(false),
  enableHotReload: z.literal(false),
  failFast: z.literal(false),
  testFixture: TEST_TYPE_SCHEMA.optional(),
  isolated: z.boolean().optional(),
});
