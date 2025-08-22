/**
 * Base Repository Schemas
 * Zod validation schemas for repository types and configurations
 */

import { z } from "zod";

/**
 * Repository performance metrics schema
 */
export const REPOSITORY_PERFORMANCE_METRICS_SCHEMA = z.object({
  loadTime: z.number().min(0),
  cacheHits: z.number().min(0),
  cacheMisses: z.number().min(0),
  totalLoads: z.number().min(0),
  averageLoadTime: z.number().min(0),
  errorCount: z.number().min(0),
});

/**
 * Repository cache entry schema
 */
export const REPOSITORY_CACHE_ENTRY_SCHEMA = z.object({
  value: z.unknown(),
  timestamp: z.number().min(0),
  schemaHash: z.string(),
  accessCount: z.number().min(0),
  ttl: z.number().min(0),
});

/**
 * Repository cache options schema
 */
export const REPOSITORY_CACHE_OPTIONS_SCHEMA = z.object({
  maxSize: z.number().min(1).optional().default(100),
  ttl: z.number().min(0).optional().default(300000),
  enabled: z.boolean().optional().default(true),
});

/**
 * Repository load options schema
 */
export const REPOSITORY_LOAD_OPTIONS_SCHEMA = z.object({
  useCache: z.boolean().optional().default(true),
  validate: z.boolean().optional().default(true),
  timeout: z.number().min(0).optional().default(5000),
});

/**
 * Repository error context schema
 */
export const REPOSITORY_ERROR_CONTEXT_SCHEMA = z.object({
  repository: z.string().min(1),
  operation: z.string().min(1),
  source: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Repository state schema
 */
export const REPOSITORY_STATE_SCHEMA = z.object({
  initialized: z.boolean(),
  loading: z.boolean(),
  lastLoaded: z.date().optional(),
  errorCount: z.number().min(0),
  performanceMetrics: REPOSITORY_PERFORMANCE_METRICS_SCHEMA,
});
