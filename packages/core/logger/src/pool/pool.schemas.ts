/**
 * Zod validation schemas for pool domain
 * @module @axon/logger/pool/schemas
 */

import { z } from "zod";

/**
 * Object pool configuration schema
 */
export const OBJECT_POOL_CONFIG_SCHEMA = z.object({
  enabled: z.boolean(),
  initialSize: z.number().nonnegative(),
  maxSize: z.number().positive(),
  growthFactor: z.number().min(1, "Growth factor must be >= 1"),
});

/**
 * Pool statistics schema
 */
export const POOL_STATS_SCHEMA = z.object({
  size: z.number().nonnegative(),
  available: z.number().nonnegative(),
  inUse: z.number().nonnegative(),
  created: z.number().nonnegative(),
  destroyed: z.number().nonnegative(),
});
