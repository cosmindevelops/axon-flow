/**
 * Composite Configuration Repository Schemas
 * Zod validation schemas for composite repository patterns
 */

import { z } from "zod";

/**
 * Composite merge strategy schema
 */
export const COMPOSITE_MERGE_STRATEGY_SCHEMA = z.enum(["merge", "override", "append"]);

/**
 * Composite source schema
 */
export const COMPOSITE_SOURCE_SCHEMA = z.object({
  repository: z.unknown(),
  priority: z.number().min(0).max(100),
  enabled: z.boolean(),
  prefix: z.string().optional(),
});

/**
 * Composite options schema
 */
export const COMPOSITE_OPTIONS_SCHEMA = z.object({
  sources: z.array(COMPOSITE_SOURCE_SCHEMA).min(1),
  mergeStrategy: COMPOSITE_MERGE_STRATEGY_SCHEMA.optional().default("merge"),
  validateSources: z.boolean().optional().default(true),
});
