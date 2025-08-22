/**
 * Builder Utility Schemas
 * Zod validation schemas for builder utility types and options
 */

import { z } from "zod";

/**
 * Pool statistics schema
 */
export const POOL_STATS_SCHEMA = z.object({
  size: z.number().min(0),
  inUse: z.number().min(0),
  available: z.number().min(0),
  totalCreated: z.number().min(0),
  totalAcquired: z.number().min(0),
  totalReleased: z.number().min(0),
});

/**
 * Object pool options schema
 */
export const OBJECT_POOL_OPTIONS_SCHEMA = z.object({
  factory: z.any(), // Function - can't validate further with Zod
  reset: z.any().optional(), // Function - can't validate further with Zod
  maxSize: z.number().min(1).optional().default(10),
  initialSize: z.number().min(0).optional().default(0),
});

/**
 * Validation cache entry schema
 */
export const VALIDATION_CACHE_ENTRY_SCHEMA = z.object({
  result: z.unknown(),
  timestamp: z.number().min(0),
  ttl: z.number().min(0),
  schemaHash: z.string().min(1),
});

/**
 * Validation cache options schema
 */
export const VALIDATION_CACHE_OPTIONS_SCHEMA = z.object({
  maxSize: z.number().min(1).optional().default(100),
  defaultTtl: z.number().min(0).optional().default(300000),
  enabled: z.boolean().optional().default(true),
});

/**
 * Validation cache statistics schema
 */
export const VALIDATION_CACHE_STATS_SCHEMA = z.object({
  size: z.number().min(0),
  hits: z.number().min(0),
  misses: z.number().min(0),
  evictions: z.number().min(0),
  hitRate: z.number().min(0).max(1),
});
