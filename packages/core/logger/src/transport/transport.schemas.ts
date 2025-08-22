/**
 * Zod validation schemas for transport domain
 * @module @axon/logger/transport/schemas
 */

import { z } from "zod";

/**
 * Transport type schema
 */
export const TRANSPORT_TYPE_SCHEMA = z.enum(["console", "file", "remote"]);

/**
 * Transport configuration schema
 */
export const TRANSPORT_CONFIG_SCHEMA = z.object({
  type: TRANSPORT_TYPE_SCHEMA,
  enabled: z.boolean(),
  level: z.string().optional(),
  destination: z.string().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Log entry for transport schema
 */
export const TRANSPORT_LOG_ENTRY_SCHEMA = z.object({
  level: z.string(),
  message: z.string(),
  timestamp: z.number(),
  correlationId: z.string().optional(),
  meta: z.record(z.string(), z.unknown()),
});
