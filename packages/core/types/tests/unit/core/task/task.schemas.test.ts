/**
 * Test suite for task schema validations
 */

import { describe, it, expect } from "vitest";
import type {
  ITaskDefinition,
  ITaskExecution,
  IWorkflowDefinition,
  IRetryPolicy,
  TaskId,
  WorkflowId,
  TaskPriority,
} from "../../../../src/core/task/task.types.js";
import {
  taskDefinitionSchema,
  taskExecutionSchema,
  workflowDefinitionSchema,
  retryPolicySchema,
} from "../../../../src/core/task/task.schemas.js";

describe("Task Schema Validations", () => {
  describe("taskDefinitionSchema", () => {
    const validRetryPolicy: IRetryPolicy = {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitter: true,
    };

    const validTaskDefinition: ITaskDefinition = {
      id: "task-123" as TaskId,
      name: "Test Task",
      description: "A test task",
      agentId: "agent-123" as any,
      capability: "processData",
      parameters: { input: "test" },
      dependencies: [],
      timeout: 30000,
      priority: "normal" as TaskPriority,
      retryPolicy: validRetryPolicy,
      metadata: {},
    };

    it("should validate correct task definition structure", () => {
      const result = taskDefinitionSchema.safeParse(validTaskDefinition);
      expect(result.success).toBe(true);
    });

    it("should reject invalid task definition", () => {
      const result = taskDefinitionSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should validate required fields", () => {
      const incomplete = { id: "task-123", name: "Test" };
      const result = taskDefinitionSchema.safeParse(incomplete);
      expect(result.success).toBe(false);
    });

    it("should validate priority values", () => {
      const taskWithInvalidPriority = {
        ...validTaskDefinition,
        priority: "invalid-priority",
      };

      const result = taskDefinitionSchema.safeParse(taskWithInvalidPriority);
      expect(result.success).toBe(false);
    });
  });

  describe("taskExecutionSchema", () => {
    const validTaskExecution: ITaskExecution = {
      task: {
        id: "task-123" as TaskId,
        name: "Test Task",
        description: "A test task",
        agentId: "agent-123" as any,
        capability: "processData",
        parameters: { input: "test" },
        dependencies: [],
        timeout: 30000,
        priority: "normal" as TaskPriority,
        retryPolicy: {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          jitter: true,
        },
      },
      status: "executing",
      correlationId: "corr-123" as any,
      retryCount: 0,
    };

    it("should validate correct task execution structure", () => {
      const result = taskExecutionSchema.safeParse(validTaskExecution);
      expect(result.success).toBe(true);
    });

    it("should handle optional execution properties", () => {
      const executionWithOptionals: ITaskExecution = {
        ...validTaskExecution,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        result: { output: "processed" },
        error: {
          code: "PROCESSING_ERROR",
          message: "Failed to process data",
          retryable: true,
        },
        metrics: {
          duration: 5000,
          queueTime: 1000,
          cpuTime: 2500,
          memoryUsed: 1024000,
        },
      };

      const result = taskExecutionSchema.safeParse(executionWithOptionals);
      expect(result.success).toBe(true);
    });

    it("should validate status values", () => {
      const executionWithInvalidStatus = {
        ...validTaskExecution,
        status: "invalid-status",
      };

      const result = taskExecutionSchema.safeParse(executionWithInvalidStatus);
      expect(result.success).toBe(false);
    });
  });

  describe("workflowDefinitionSchema", () => {
    const validWorkflowDefinition: IWorkflowDefinition = {
      id: "workflow-123" as WorkflowId,
      name: "Test Workflow",
      version: "1.0.0",
      description: "A test workflow",
      tasks: [],
      timeout: 300000,
      useSaga: true,
    };

    it("should validate correct workflow definition structure", () => {
      const result = workflowDefinitionSchema.safeParse(validWorkflowDefinition);
      expect(result.success).toBe(true);
    });

    it("should handle workflow with tasks", () => {
      const workflowWithTasks: IWorkflowDefinition = {
        ...validWorkflowDefinition,
        tasks: [
          {
            id: "task-1" as TaskId,
            name: "First Task",
            description: "First task in workflow",
            agentId: "agent-123" as any,
            capability: "processData",
            parameters: {},
            dependencies: [],
            timeout: 30000,
            priority: "normal" as TaskPriority,
            retryPolicy: {
              maxAttempts: 3,
              initialDelay: 1000,
              maxDelay: 10000,
              backoffMultiplier: 2,
              jitter: true,
            },
          },
        ],
      };

      const result = workflowDefinitionSchema.safeParse(workflowWithTasks);
      expect(result.success).toBe(true);
    });

    it("should validate required workflow fields", () => {
      const incomplete = { id: "workflow-123" };
      const result = workflowDefinitionSchema.safeParse(incomplete);
      expect(result.success).toBe(false);
    });
  });

  describe("retryPolicySchema", () => {
    it("should validate retry policy structure", () => {
      const validRetryPolicy: IRetryPolicy = {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitter: true,
        retryableErrors: ["TEMPORARY_ERROR", "NETWORK_ERROR"],
      };

      const result = retryPolicySchema.safeParse(validRetryPolicy);
      expect(result.success).toBe(true);
    });

    it("should handle minimal retry policy", () => {
      const minimalRetryPolicy: IRetryPolicy = {
        maxAttempts: 1,
        initialDelay: 1000,
        maxDelay: 1000,
        backoffMultiplier: 1,
        jitter: false,
      };

      const result = retryPolicySchema.safeParse(minimalRetryPolicy);
      expect(result.success).toBe(true);
    });

    it("should validate positive delays", () => {
      const invalidRetryPolicy = {
        maxAttempts: 3,
        initialDelay: -1000, // Invalid negative delay
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitter: true,
      };

      const result = retryPolicySchema.safeParse(invalidRetryPolicy);
      expect(result.success).toBe(false);
    });

    it("should validate max attempts is positive", () => {
      const invalidRetryPolicy = {
        maxAttempts: 0, // Invalid zero attempts
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitter: true,
      };

      const result = retryPolicySchema.safeParse(invalidRetryPolicy);
      expect(result.success).toBe(false);
    });
  });
});
