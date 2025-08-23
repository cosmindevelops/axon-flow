/**
 * Zod validation schemas for correlation context serialization
 */

import { z } from "zod";

/**
 * Serializable correlation context schema for validation
 */
export const SERIALIZABLE_CORRELATION_CONTEXT_SCHEMA = z.object({
  correlationId: z.string().uuid(),
  metadata: z.record(z.string(), z.any()).optional(),
  timestamp: z.string().datetime().optional(),
  version: z.string().default("1.0"),
});

/**
 * Serialization options schema
 */
export const SERIALIZATION_OPTIONS_SCHEMA = z
  .object({
    compress: z.boolean().optional(),
    maxUncompressedSize: z.number().positive().optional(),
    includeMetadata: z.boolean().optional(),
    // Note: metadataFilter is a function and is not validated by Zod
  })
  .passthrough();

/**
 * Schema for validating minimal serialized correlation context
 */
export const MINIMAL_CORRELATION_CONTEXT_SCHEMA = z.object({
  correlationId: z.string().uuid(),
  version: z.string().default("1.0"),
});
