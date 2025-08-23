/**
 * Zod schemas for error serialization validation
 */

import { z } from "zod";
import { SerializationFormat } from "./serialization.types.js";

/**
 * Serialization format schema
 */
export const SERIALIZATION_FORMAT_SCHEMA = z.nativeEnum(SerializationFormat);

/**
 * Serialization options schema
 */
export const SERIALIZATION_OPTIONS_SCHEMA = z.object({
  format: SERIALIZATION_FORMAT_SCHEMA.optional(),
  includeStack: z.boolean().optional(),
  includeContext: z.boolean().optional(),
  includeCause: z.boolean().optional(),
  maxDepth: z.number().int().positive().optional(),
  compress: z.boolean().optional(),
  sanitize: z.boolean().optional(),
  prettify: z.boolean().optional(),
});

/**
 * Deserialization options schema
 */
export const DESERIALIZATION_OPTIONS_SCHEMA = z.object({
  validateSchema: z.boolean().optional(),
  restoreStack: z.boolean().optional(),
  restoreContext: z.boolean().optional(),
  maxDepth: z.number().int().positive().optional(),
});

/**
 * Compressed error schema
 */
export const COMPRESSED_ERROR_SCHEMA = z.object({
  format: z.literal("compressed"),
  algorithm: z.enum(["gzip", "deflate", "brotli"]),
  data: z.string(), // Base64 encoded
  originalSize: z.number().int().positive(),
  compressedSize: z.number().int().positive(),
});

/**
 * Compact error schema (recursive)
 */
export const COMPACT_ERROR_SCHEMA: z.ZodType<any> = z.lazy(() =>
  z.object({
    n: z.string(), // name
    m: z.string(), // message
    c: z.string(), // code
    s: z.string().length(1), // severity (first letter)
    t: z.string(), // timestamp (base36)
    k: z.string().optional(), // stack
    x: COMPACT_ERROR_SCHEMA.optional(), // cause
    e: z.array(COMPACT_ERROR_SCHEMA).optional(), // errors (aggregate)
  }),
);

/**
 * Environment compatibility schema
 */
export const ENVIRONMENT_COMPATIBILITY_SCHEMA = z.object({
  supportsBinary: z.boolean().optional(),
  supportsCompression: z.boolean().optional(),
  supportsStreaming: z.boolean().optional(),
  maxStringLength: z.number().int().positive().optional(),
  maxObjectDepth: z.number().int().positive().optional(),
});

/**
 * Serialization context schema
 */
export const SERIALIZATION_CONTEXT_SCHEMA = z.object({
  depth: z.number().int().nonnegative(),
  visitedObjects: z.any(), // WeakSet
  options: SERIALIZATION_OPTIONS_SCHEMA,
  compatibility: ENVIRONMENT_COMPATIBILITY_SCHEMA,
});

/**
 * Serialization statistics schema
 */
export const SERIALIZATION_STATS_SCHEMA = z.object({
  totalSerialized: z.number().int().nonnegative(),
  totalDeserialized: z.number().int().nonnegative(),
  averageSerializationTime: z.number().nonnegative(),
  averageDeserializationTime: z.number().nonnegative(),
  averageSize: z.number().nonnegative(),
  compressionRatio: z.number().min(0).max(1).optional(),
  errors: z.number().int().nonnegative(),
});

/**
 * Network error schema
 */
export const NETWORK_ERROR_SCHEMA = z.object({
  version: z.string(),
  timestamp: z.number().int().positive(), // Unix timestamp
  errors: z.array(
    z.object({
      code: z.string(),
      severity: z.number().int(), // Numeric for size
      message: z.string().optional(),
      context: z.record(z.string(), z.unknown()).optional(),
    }),
  ),
});
