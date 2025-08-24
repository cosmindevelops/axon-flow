/**
 * Zod validation schemas for task and workflow types
 *
 * Runtime validation schemas for task definitions, executions, and workflow management.
 */

import { z } from "zod";
import { agentIdSchema } from "../agent/agent.schemas.js";
import type { TaskPriority, TaskStatus } from "./task.types.js";

// Branded type schemas
export const taskIdSchema = z.string().brand<"TaskId">();

// Enum schemas
export const taskStatusSchema = z.enum([
  "pending",
  "queued",
  "executing",
  "completed",
  "failed",
  "cancelled",
  "retrying",
  "compensating",
]) satisfies z.ZodType<TaskStatus>;

export const taskPrioritySchema = z.enum(["low", "normal", "high", "critical"]) satisfies z.ZodType<TaskPriority>;

// Task error schema
export const taskErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  stack: z.string().optional(),
  retryable: z.boolean(),
  context: z.record(z.string(), z.unknown()).optional(),
});

// Task metrics schema
export const taskMetricsSchema = z.object({
  duration: z.number(),
  queueTime: z.number(),
  cpuTime: z.number().optional(),
  memoryUsed: z.number().optional(),
});

// Retry policy schema
export const retryPolicySchema = z.object({
  maxAttempts: z.number().positive(),
  initialDelay: z.number().positive(),
  maxDelay: z.number().positive(),
  backoffMultiplier: z.number().positive(),
  jitter: z.boolean(),
  retryableErrors: z.array(z.string()).optional(),
});

// Task definition schema
export const taskDefinitionSchema = z.object({
  id: taskIdSchema,
  name: z.string(),
  description: z.string(),
  agentId: agentIdSchema,
  capability: z.string(),
  parameters: z.record(z.string(), z.unknown()),
  dependencies: z.array(taskIdSchema),
  timeout: z.number().positive(),
  priority: taskPrioritySchema,
  retryPolicy: retryPolicySchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Task result schema
export const taskResultSchema = z.object({
  executionId: z.string(),
  taskId: taskIdSchema,
  status: taskStatusSchema,
  result: z.unknown().optional(),
  error: z.string().optional(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  agentId: agentIdSchema,
});

// Task execution schema
export const taskExecutionSchema = z.object({
  task: taskDefinitionSchema,
  status: taskStatusSchema,
  correlationId: z.string(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  result: z.unknown().optional(),
  error: taskErrorSchema.optional(),
  retryCount: z.number().nonnegative(),
  metrics: taskMetricsSchema.optional(),
});

// Workflow definition schema
export const workflowDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  tasks: z.array(taskDefinitionSchema),
  timeout: z.number().positive(),
  useSaga: z.boolean(),
  compensationStrategy: z.enum(["sequential", "parallel", "custom"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Workflow result schema
export const workflowResultSchema = z.object({
  executionId: z.string(),
  workflowId: z.string(),
  status: taskStatusSchema,
  result: z.unknown().optional(),
  error: z.string().optional(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  taskResults: z.array(taskResultSchema),
});

// Workflow execution schema
export const workflowExecutionSchema = z.object({
  workflow: workflowDefinitionSchema,
  status: taskStatusSchema,
  correlationId: z.string(),
  taskExecutions: z.array(taskExecutionSchema),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  result: z.unknown().optional(),
  error: z.string().optional(),
});

// Type inference helpers
export type InferredTaskDefinition = z.infer<typeof taskDefinitionSchema>;
export type InferredTaskExecution = z.infer<typeof taskExecutionSchema>;
export type InferredWorkflowDefinition = z.infer<typeof workflowDefinitionSchema>;
export type InferredWorkflowExecution = z.infer<typeof workflowExecutionSchema>;
