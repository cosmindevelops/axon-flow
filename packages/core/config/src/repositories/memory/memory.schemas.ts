/**
 * Memory Configuration Repository Schemas
 * Zod validation schemas for in-memory configuration management
 */

import { z } from "zod";

/**
 * Memory options schema
 */
export const MEMORY_OPTIONS_SCHEMA = z.object({
  data: z.record(z.unknown()).optional().default({}),
  readOnly: z.boolean().optional().default(false),
  deepClone: z.boolean().optional().default(true),
  validateData: z.boolean().optional().default(true),
});

/**
 * Cache options schema
 */
export const CACHE_OPTIONS_SCHEMA = z.object({
  cacheSize: z.number().min(1).max(10000).optional().default(100),
  cacheTTL: z.number().min(0).optional().default(300000), // 5 minutes
  cacheKey: z.string().optional(),
  enableMetrics: z.boolean().optional().default(true),
});

/**
 * Memory repository schema
 */
export const MEMORY_REPOSITORY_SCHEMA = z.object({
  data: z.record(z.unknown()),
  readOnly: z.boolean().optional(),
  deepClone: z.boolean().optional(),
});
