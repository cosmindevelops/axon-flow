/**
 * Zod validation schemas for status types
 *
 * Runtime validation schemas for status and state management.
 */

import { z } from "zod";
import type { Status } from "./index.js";

// Status enum schema
export const statusSchema = z.enum(["pending", "in-progress", "completed", "failed"]) satisfies z.ZodType<Status>;

// Extended status schemas for common use cases
export const extendedStatusSchema = z.union([statusSchema, z.enum(["cancelled", "paused", "queued", "retrying"])]);

// Status with metadata
export const statusWithMetadataSchema = z.object({
  status: statusSchema,
  timestamp: z.string(),
  message: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});

// Status transition schema
export const statusTransitionSchema = z.object({
  from: statusSchema,
  to: statusSchema,
  timestamp: z.string(),
  reason: z.string().optional(),
  triggeredBy: z.string().optional(),
});

// Type inference helpers
export type InferredStatus = z.infer<typeof statusSchema>;
export type InferredExtendedStatus = z.infer<typeof extendedStatusSchema>;
export type InferredStatusWithMetadata = z.infer<typeof statusWithMetadataSchema>;
