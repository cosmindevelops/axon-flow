/**
 * Zod validation schemas for workflow and saga types
 *
 * Runtime validation schemas for workflow orchestration and saga pattern implementation.
 */

import { z } from "zod";
import { agentIdSchema } from "../agent/agent.schemas.js";
import { taskStatusSchema } from "../task/task.schemas.js";
import type { IsolationLevel, OrchestrationStrategy, SagaState } from "./workflow.types.js";

// Import WorkflowId from task.types

// Branded type schemas
export const workflowIdSchema = z.string().brand<"WorkflowId">();
export const sagaIdSchema = z.string().brand<"SagaId">();

// Enum schemas
export const sagaStateSchema = z.enum([
  "pending",
  "executing",
  "compensating",
  "completed",
  "failed",
  "compensated",
]) satisfies z.ZodType<SagaState>;

export const isolationLevelSchema = z.enum([
  "read-uncommitted",
  "read-committed",
  "repeatable-read",
  "serializable",
]) satisfies z.ZodType<IsolationLevel>;

export const orchestrationStrategySchema = z.enum([
  "sequential",
  "parallel",
  "conditional",
  "loop",
  "fork-join",
]) satisfies z.ZodType<OrchestrationStrategy>;

// Validation rule schema
export const validationRuleSchema = z.object({
  type: z.enum(["required", "range", "pattern", "custom"]),
  field: z.string().optional(),
  params: z.record(z.unknown()),
  errorMessage: z.string(),
});

// Transaction schema
export const transactionSchema = z.object({
  agentId: agentIdSchema,
  capability: z.string(),
  parameters: z.record(z.unknown()),
  resultType: z.string().optional(),
  validation: z.array(validationRuleSchema).optional(),
});

// Saga step schema
export const sagaStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  transaction: transactionSchema,
  compensation: transactionSchema,
  dependencies: z.array(z.string()),
  retryable: z.boolean(),
  timeout: z.number().positive(),
});

// Saga definition schema
export const sagaDefinitionSchema = z.object({
  id: sagaIdSchema,
  name: z.string(),
  version: z.string(),
  description: z.string(),
  steps: z.array(sagaStepSchema),
  timeout: z.number().positive(),
  isolationLevel: isolationLevelSchema,
  metadata: z.record(z.unknown()).optional(),
});

// Step metrics schema
export const stepMetricsSchema = z.object({
  transactionDuration: z.number().optional(),
  compensationDuration: z.number().optional(),
  retryCount: z.number(),
  totalDuration: z.number(),
});

// Step execution schema
export const stepExecutionSchema = z.object({
  step: sagaStepSchema,
  status: taskStatusSchema,
  transactionResult: z.unknown().optional(),
  compensationResult: z.unknown().optional(),
  metrics: stepMetricsSchema,
});

// Saga error schema
export const sagaErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  failedStep: z.string(),
  compensated: z.boolean(),
  context: z.record(z.unknown()).optional(),
});

// Saga execution schema
export const sagaExecutionSchema = z.object({
  saga: sagaDefinitionSchema,
  state: sagaStateSchema,
  correlationId: z.string(),
  stepExecutions: z.array(stepExecutionSchema),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  compensationStartedAt: z.string().optional(),
  result: z.unknown().optional(),
  error: sagaErrorSchema.optional(),
});

// Condition schema
export const conditionSchema = z.object({
  type: z.enum(["expression", "rule", "function"]),
  value: z.string(),
  params: z.record(z.unknown()).optional(),
});

// Loop config schema
export const loopConfigSchema = z.object({
  type: z.enum(["count", "condition", "collection"]),
  maxIterations: z.number().positive(),
  condition: conditionSchema.optional(),
  collection: z.string().optional(),
});

// Join config schema
export const joinConfigSchema = z.object({
  strategy: z.enum(["all", "any", "quorum"]),
  quorum: z.number().optional(),
  timeout: z.number().positive(),
});

// Workflow branch schema
export const workflowBranchSchema = z.lazy(() =>
  z.object({
    id: z.string(),
    condition: conditionSchema,
    tasks: z.array(z.any()), // Using z.any() to avoid circular dependency with task.schemas
  }),
);

// Advanced workflow schema
export const advancedWorkflowSchema = z.object({
  id: workflowIdSchema,
  name: z.string(),
  strategy: orchestrationStrategySchema,
  branches: z.array(workflowBranchSchema).optional(),
  loop: loopConfigSchema.optional(),
  join: joinConfigSchema.optional(),
});

// Type inference helpers
export type InferredSagaDefinition = z.infer<typeof sagaDefinitionSchema>;
export type InferredSagaExecution = z.infer<typeof sagaExecutionSchema>;
export type InferredAdvancedWorkflow = z.infer<typeof advancedWorkflowSchema>;
