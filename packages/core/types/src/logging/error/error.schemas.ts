/**
 * Zod validation schemas for error logging types
 *
 * Runtime validation schemas for enhanced error handling and logging.
 */

import { z } from "zod";
import type { ErrorCategory, ErrorSeverity } from "./error.types.js";

// Enum schemas
export const errorSeveritySchema = z.enum(["low", "medium", "high", "critical"]) satisfies z.ZodType<ErrorSeverity>;

export const errorCategorySchema = z.enum([
  "validation",
  "authentication",
  "authorization",
  "network",
  "database",
  "filesystem",
  "configuration",
  "business",
  "system",
  "unknown",
]) satisfies z.ZodType<ErrorCategory>;

// Error stack schema
export const errorStackSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number().optional(),
  function: z.string().optional(),
  source: z.string().optional(),
});

// Error metadata schema
export const errorMetadataSchema = z.object({
  timestamp: z.string(),
  hostname: z.string().optional(),
  pid: z.number().optional(),
  version: z.string().optional(),
  environment: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Error context schema
export const errorContextSchema = z.object({
  timestamp: z.string(),
  component: z.string(),
  operation: z.string().optional(),
  correlationId: z.string().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  requestId: z.string().optional(),
  input: z.unknown().optional(),
  metadata: errorMetadataSchema.optional(),
});

// Enhanced error schema
export const enhancedErrorSchema = z.object({
  name: z.string(),
  message: z.string(),
  code: z.string(),
  context: errorContextSchema,
  severity: errorSeveritySchema,
  category: errorCategorySchema,
  recoverable: z.boolean(),
  retryable: z.boolean(),
  stack: z.string().optional(),
  parsedStack: z.array(errorStackSchema).optional(),
  cause: z.unknown().optional(),
  details: z.record(z.unknown()).optional(),
  suggestions: z.array(z.string()).optional(),
  documentation: z.string().optional(),
});

// Type inference helpers
export type InferredEnhancedError = z.infer<typeof enhancedErrorSchema>;
export type InferredErrorContext = z.infer<typeof errorContextSchema>;
export type InferredErrorStack = z.infer<typeof errorStackSchema>;
