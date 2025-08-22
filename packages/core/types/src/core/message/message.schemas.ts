/**
 * Zod validation schemas for message types
 *
 * Runtime validation schemas for all message types in the Axon Flow messaging system.
 */

import { z } from "zod";
import type { MessageType } from "./message.types.js";

// Branded type schemas
export const messageIdSchema = z.string().brand<"MessageId">();

// Enum schemas
export const messageTypeSchema = z.enum([
  "command",
  "query",
  "event",
  "reply",
  "error",
]) satisfies z.ZodType<MessageType>;

// Message metadata schema - aligned with actual interface
export const messageMetadataSchema = z.object({
  source: z.string(),
  target: z.union([z.string(), z.array(z.string())]).optional(),
  version: z.string(),
  priority: z.number().optional(),
  expiresAt: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  retryCount: z.number().optional(),
  originalMessageId: z.string().optional(),
});

// Base message schema
export const messageSchema = z.object({
  id: messageIdSchema,
  correlationId: z.string(),
  type: messageTypeSchema,
  payload: z.unknown(),
  metadata: messageMetadataSchema,
  timestamp: z.string(),
});

// Command message schema
export const commandSchema = messageSchema.extend({
  type: z.literal("command"),
  commandName: z.string(),
  expectsReply: z.boolean(),
  timeout: z.number().optional(),
  targetAgentId: z.string().optional(),
});

// Query message schema
export const querySchema = messageSchema.extend({
  type: z.literal("query"),
  queryName: z.string(),
  resultType: z.string(),
  timeout: z.number().optional(),
  targetAgentId: z.string().optional(),
});

// Event message schema
export const eventSchema = messageSchema.extend({
  type: z.literal("event"),
  eventName: z.string(),
  aggregateId: z.string().optional(),
  aggregateType: z.string().optional(),
  eventVersion: z.number().optional(),
  sequenceNumber: z.number().optional(),
});

// Reply message schema
export const replySchema = messageSchema.extend({
  type: z.literal("reply"),
  requestId: messageIdSchema,
  success: z.boolean(),
  error: z.string().optional(),
  errorCode: z.string().optional(),
  errorDetails: z.record(z.unknown()).optional(),
});

// Error message schema
export const errorMessageSchema = messageSchema.extend({
  type: z.literal("error"),
  error: z.string(),
  errorCode: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  stack: z.string().optional(),
  context: z.record(z.unknown()).optional(),
  recoverable: z.boolean().optional(),
  retryable: z.boolean().optional(),
});

// Union type for any message
export const anyMessageSchema = z.discriminatedUnion("type", [
  commandSchema,
  querySchema,
  eventSchema,
  replySchema,
  errorMessageSchema,
]);

// Type inference helpers
export type InferredMessage = z.infer<typeof messageSchema>;
export type InferredCommand = z.infer<typeof commandSchema>;
export type InferredQuery = z.infer<typeof querySchema>;
export type InferredEvent = z.infer<typeof eventSchema>;
export type InferredReply = z.infer<typeof replySchema>;
export type InferredErrorMessage = z.infer<typeof errorMessageSchema>;
export type InferredAnyMessage = z.infer<typeof anyMessageSchema>;
