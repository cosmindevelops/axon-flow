/**
 * Test suite for task type definitions
 */

import { describe, it, expect } from "vitest";
import type {
  ITaskDefinition,
  ITaskExecution,
  IWorkflowDefinition,
  IRetryPolicy,
  ICompensationAction,
  TaskId,
  WorkflowId,
  TaskStatus,
  TaskPriority,
} from "../../../../src/core/task/task.types.js";

describe("Task Type Definitions", () => {
  describe("ITaskDefinition Interface", () => {
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

    it("should follow I-prefix naming convention", () => {
      const _typeCheck: ITaskDefinition = validTaskDefinition;
      expect(_typeCheck).toBeDefined();
    });

    it("should handle compensation actions", () => {
      const compensationAction: ICompensationAction = {
        agentId: "agent-456" as any,
        capability: "undoProcessData",
        parameters: { rollbackId: "123" },
        timeout: 15000,
      };

      const taskWithCompensation: ITaskDefinition = {
        ...validTaskDefinition,
        compensationAction,
      };

      expect(taskWithCompensation.compensationAction).toEqual(compensationAction);
    });

    it("should handle dependencies array", () => {
      const taskWithDependencies: ITaskDefinition = {
        ...validTaskDefinition,
        dependencies: ["task-1" as TaskId, "task-2" as TaskId],
      };

      expect(taskWithDependencies.dependencies).toHaveLength(2);
      expect(taskWithDependencies.dependencies[0]).toBe("task-1");
    });
  });

  describe("ITaskExecution Interface", () => {
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
      status: "executing" as TaskStatus,
      correlationId: "corr-123" as any,
      retryCount: 0,
    };

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

      expect(executionWithOptionals.result?.output).toBe("processed");
      expect(executionWithOptionals.error?.code).toBe("PROCESSING_ERROR");
      expect(executionWithOptionals.metrics?.duration).toBe(5000);
    });
  });

  describe("IWorkflowDefinition Interface", () => {
    const validWorkflowDefinition: IWorkflowDefinition = {
      id: "workflow-123" as WorkflowId,
      name: "Test Workflow",
      version: "1.0.0",
      description: "A test workflow",
      tasks: [],
      timeout: 300000,
      useSaga: true,
    };

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

      expect(workflowWithTasks.tasks).toHaveLength(1);
      expect(workflowWithTasks.tasks[0].name).toBe("First Task");
    });
  });

  describe("TaskStatus Type", () => {
    it("should accept all valid status values", () => {
      const validStatuses: TaskStatus[] = [
        "pending",
        "queued",
        "executing",
        "completed",
        "failed",
        "cancelled",
        "retrying",
        "compensating",
      ];

      validStatuses.forEach((status) => {
        const _statusCheck: TaskStatus = status;
        expect(_statusCheck).toBe(status);
      });
    });
  });

  describe("TaskPriority Type", () => {
    it("should accept all valid priority values", () => {
      const validPriorities: TaskPriority[] = ["low", "normal", "high", "critical"];

      validPriorities.forEach((priority) => {
        const _priorityCheck: TaskPriority = priority;
        expect(_priorityCheck).toBe(priority);
      });
    });
  });

  describe("Branded Types", () => {
    it("should handle TaskId branded type", () => {
      const id: TaskId = "task-123" as TaskId;
      expect(typeof id).toBe("string");
    });

    it("should handle WorkflowId branded type", () => {
      const id: WorkflowId = "workflow-123" as WorkflowId;
      expect(typeof id).toBe("string");
    });

    it("should maintain type brand for compile-time safety", () => {
      const taskId = "task-123" as TaskId;
      const workflowId = "workflow-123" as WorkflowId;

      expect(taskId).toBe("task-123");
      expect(workflowId).toBe("workflow-123");
    });
  });

  describe("IRetryPolicy Interface", () => {
    it("should handle optional retry policy properties", () => {
      const minimalRetryPolicy: IRetryPolicy = {
        maxAttempts: 1,
        initialDelay: 1000,
        maxDelay: 1000,
        backoffMultiplier: 1,
        jitter: false,
      };

      expect(minimalRetryPolicy.maxAttempts).toBe(1);
      expect(minimalRetryPolicy.jitter).toBe(false);
    });

    it("should handle retryable errors array", () => {
      const retryPolicyWithErrors: IRetryPolicy = {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitter: true,
        retryableErrors: ["TEMPORARY_ERROR", "NETWORK_ERROR"],
      };

      expect(retryPolicyWithErrors.retryableErrors).toHaveLength(2);
      expect(retryPolicyWithErrors.retryableErrors?.[0]).toBe("TEMPORARY_ERROR");
    });
  });
});
