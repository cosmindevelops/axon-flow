/**
 * Zod validation schemas for logging entry types
 *
 * Runtime validation schemas for structured logging entries.
 */

import { z } from "zod";
import type { LogLevel } from "./entry.types.js";

// Enum schemas
export const logLevelSchema = z.enum([
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
]) satisfies z.ZodType<LogLevel>;

// Performance context schema
export const performanceContextSchema = z.object({
  duration: z.number().nonnegative(),
  startTime: z.string(),
  endTime: z.string(),
  memory: z
    .object({
      before: z.number(),
      after: z.number(),
      delta: z.number(),
    })
    .optional(),
  cpu: z
    .object({
      usage: z.number(),
      system: z.number(),
      user: z.number(),
    })
    .optional(),
});

// Log metadata schema
export const logMetadataSchema = z.object({
  timestamp: z.string(),
  hostname: z.string().optional(),
  pid: z.number().optional(),
  thread: z.string().optional(),
  version: z.string().optional(),
  environment: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Log context schema
export const logContextSchema = z.object({
  service: z.string(),
  component: z.string().optional(),
  correlationId: z.string().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  requestId: z.string().optional(),
  traceId: z.string().optional(),
  spanId: z.string().optional(),
  parentSpanId: z.string().optional(),
  performance: performanceContextSchema.optional(),
  custom: z.record(z.string(), z.unknown()).optional(),
});

// Log entry schema
export const logEntrySchema = z.object({
  timestamp: z.string(),
  level: logLevelSchema,
  message: z.string(),
  context: logContextSchema,
  error: z
    .object({
      name: z.string(),
      message: z.string(),
      stack: z.string().optional(),
      code: z.string().optional(),
      cause: z.unknown().optional(),
    })
    .optional(),
  metadata: logMetadataSchema.optional(),
  data: z.unknown().optional(),
});

// Type inference helpers
export type InferredLogEntry = z.infer<typeof logEntrySchema>;
export type InferredLogContext = z.infer<typeof logContextSchema>;
export type InferredPerformanceContext = z.infer<typeof performanceContextSchema>;
