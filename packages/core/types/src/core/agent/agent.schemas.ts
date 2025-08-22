/**
 * Zod validation schemas for agent types
 *
 * Runtime validation schemas that correspond to the TypeScript agent types.
 * These schemas enable runtime type checking and validation for agent-related data.
 */

import { z } from "zod";
import type { AgentStatus } from "./agent.types.js";

// Branded type schemas
export const agentIdSchema = z.string().brand<"AgentId">();

// Enum schemas - aligned with TypeScript types
export const agentStatusSchema = z.enum([
  "active",
  "inactive",
  "registering",
  "error",
  "disconnected",
]) satisfies z.ZodType<AgentStatus>;

// Capability parameter schema
export const capabilityParameterSchema = z.object({
  name: z.string(),
  type: z.string(),
  required: z.boolean(),
  description: z.string(),
  defaultValue: z.unknown().optional(),
  validation: z.unknown().optional(),
});

// Capability return schema
export const capabilityReturnSchema = z.object({
  type: z.string(),
  description: z.string(),
  schema: z.unknown().optional(),
});

// Agent capability schema
export const agentCapabilitySchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  parameters: z.array(capabilityParameterSchema),
  returns: capabilityReturnSchema,
  tags: z.array(z.string()).optional(),
  timeout: z.number().optional(),
  retryable: z.boolean().optional(),
});

// Agent metrics schema
export const agentMetricsSchema = z.object({
  requestsPerSecond: z.number().optional(),
  errorRate: z.number().optional(),
  avgResponseTime: z.number().optional(),
  cpuUsage: z.number().optional(),
  memoryUsage: z.number().optional(),
  activeTasks: z.number().optional(),
  completedTasks: z.number().optional(),
  failedTasks: z.number().optional(),
  avgExecutionTime: z.number().optional(),
});

// Agent metadata schema
export const agentMetadataSchema = z.object({
  id: agentIdSchema,
  name: z.string(),
  version: z.string(),
  capabilities: z.array(agentCapabilitySchema),
  status: agentStatusSchema,
  registeredAt: z.string(),
  lastHeartbeat: z.string(),
  metadata: z.record(z.string(), z.unknown()),
});

// Agent registration schema
export const agentRegistrationSchema = z.object({
  name: z.string(),
  version: z.string(),
  capabilities: z.array(agentCapabilitySchema),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Agent health schema
export const agentHealthSchema = z.object({
  agentId: agentIdSchema,
  status: agentStatusSchema,
  lastHeartbeat: z.string(),
  metrics: agentMetricsSchema.optional(),
});

// Type inference helpers
export type InferredAgentMetadata = z.infer<typeof agentMetadataSchema>;
export type InferredAgentCapability = z.infer<typeof agentCapabilitySchema>;
export type InferredAgentRegistration = z.infer<typeof agentRegistrationSchema>;
export type InferredAgentHealth = z.infer<typeof agentHealthSchema>;
