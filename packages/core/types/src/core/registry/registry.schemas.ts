/**
 * Zod validation schemas for registry types
 *
 * Runtime validation schemas for agent registry operations and management.
 */

import { z } from "zod";
import { agentCapabilitySchema, agentIdSchema, agentStatusSchema } from "../agent/agent.schemas.js";
import type { IAgentQuery, IAgentQueryOptions, RegistryEventType } from "./registry.types.js";

// Registry event type schema
export const registryEventTypeSchema = z.enum([
  "agent_registered",
  "agent_updated",
  "agent_removed",
  "agent_health_changed",
  "capability_added",
  "capability_removed",
]) satisfies z.ZodType<RegistryEventType>;

// Agent query options schema
export const agentQueryOptionsSchema: z.ZodType<IAgentQueryOptions> = z.object({
  limit: z.number().positive().optional(),
  offset: z.number().nonnegative().optional(),
  sortBy: z.enum(["name", "registeredAt", "lastHeartbeat", "status"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  includeOffline: z.boolean().optional(),
});

// Agent query schema
export const agentQuerySchema: z.ZodType<IAgentQuery> = z.object({
  name: z.string().optional(),
  version: z.string().optional(),
  status: agentStatusSchema.optional(),
  capabilities: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
  options: agentQueryOptionsSchema.optional(),
});

// Agent update schema
export const agentUpdateSchema = z.object({
  capabilities: z.array(agentCapabilitySchema).optional(),
  metadata: z.record(z.unknown()).optional(),
  status: z.string().optional(),
  updatedAt: z.string(),
});

// Registry stats schema
export const registryStatsSchema = z.object({
  totalAgents: z.number(),
  healthyAgents: z.number(),
  unhealthyAgents: z.number(),
  totalCapabilities: z.number(),
  uptime: z.number(),
  lastUpdate: z.string(),
});

// Registry event schema
export const registryEventSchema = z.object({
  type: registryEventTypeSchema,
  agentId: agentIdSchema,
  timestamp: z.string(),
  data: z.record(z.unknown()),
});

// Type inference helpers
export type InferredAgentQuery = z.infer<typeof agentQuerySchema>;
export type InferredAgentUpdate = z.infer<typeof agentUpdateSchema>;
export type InferredRegistryStats = z.infer<typeof registryStatsSchema>;
export type InferredRegistryEvent = z.infer<typeof registryEventSchema>;
