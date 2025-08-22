/**
 * Storage Configuration Repository Schemas
 * Zod validation schemas for file and storage-based configuration management
 */

import { z } from "zod";

/**
 * File options schema
 */
export const FILE_OPTIONS_SCHEMA = z.object({
  filePath: z.string().min(1),
  watchForChanges: z.boolean().optional().default(false),
  encoding: z.string().optional().default("utf8"),
  debounceMs: z.number().min(0).optional().default(100),
  createIfNotExists: z.boolean().optional().default(false),
});

/**
 * Storage options schema
 */
export const STORAGE_OPTIONS_SCHEMA = z.object({
  storageKey: z.string().min(1),
  namespace: z.string().optional(),
  serializeFunction: z.any().optional(), // Function - can't validate further with Zod
  deserializeFunction: z.any().optional(), // Function - can't validate further with Zod
  fallbackData: z.record(z.string(), z.unknown()).optional().default({}),
});

/**
 * File repository schema
 */
export const FILE_REPOSITORY_SCHEMA = z.object({
  filePath: z.string().min(1),
  watchForChanges: z.boolean().optional(),
  encoding: z.string().optional(),
  debounceMs: z.number().min(0).optional(),
});
